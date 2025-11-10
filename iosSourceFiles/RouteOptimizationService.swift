//
//  RouteOptimizationService.swift
//  TreeShop
//
//  Multi-stop route optimization for daily job scheduling
//

import Foundation
import MapKit
import CoreLocation

/// Service for optimizing multi-stop routes
@MainActor
class RouteOptimizationService: ObservableObject {

    // MARK: - Types

    /// A stop on a multi-stop route
    struct RouteStop: Identifiable, Codable {
        let id: UUID
        let projectId: UUID
        let coordinate: CLLocationCoordinate2D
        let name: String
        let address: String
        var order: Int

        enum CodingKeys: String, CodingKey {
            case id, projectId, name, address, order
            case latitude, longitude
        }

        init(id: UUID = UUID(), projectId: UUID, coordinate: CLLocationCoordinate2D, name: String, address: String, order: Int = 0) {
            self.id = id
            self.projectId = projectId
            self.coordinate = coordinate
            self.name = name
            self.address = address
            self.order = order
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            id = try container.decode(UUID.self, forKey: .id)
            projectId = try container.decode(UUID.self, forKey: .projectId)
            name = try container.decode(String.self, forKey: .name)
            address = try container.decode(String.self, forKey: .address)
            order = try container.decode(Int.self, forKey: .order)

            let lat = try container.decode(Double.self, forKey: .latitude)
            let lng = try container.decode(Double.self, forKey: .longitude)
            coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(id, forKey: .id)
            try container.encode(projectId, forKey: .projectId)
            try container.encode(name, forKey: .name)
            try container.encode(address, forKey: .address)
            try container.encode(order, forKey: .order)
            try container.encode(coordinate.latitude, forKey: .latitude)
            try container.encode(coordinate.longitude, forKey: .longitude)
        }
    }

    /// Optimized route result
    struct OptimizedRoute {
        let stops: [RouteStop]
        let totalDistance: Double // miles
        let totalDuration: Double // hours
        let legs: [RouteLeg]
        let polylines: [MKPolyline]
    }

    /// Individual leg of a route
    struct RouteLeg {
        let from: RouteStop
        let to: RouteStop
        let distance: Double // miles
        let duration: Double // hours
        let polyline: MKPolyline
    }

    /// Saved route template
    struct RouteTemplate: Identifiable, Codable {
        let id: UUID
        var name: String
        var stops: [RouteStop]
        let createdAt: Date
        var lastUsed: Date?

        init(id: UUID = UUID(), name: String, stops: [RouteStop], createdAt: Date = Date(), lastUsed: Date? = nil) {
            self.id = id
            self.name = name
            self.stops = stops
            self.createdAt = createdAt
            self.lastUsed = lastUsed
        }
    }

    // MARK: - Route Optimization

    /// Optimize route using nearest neighbor algorithm
    /// - Parameters:
    ///   - start: Starting coordinate (usually organization HQ)
    ///   - stops: Array of stops to optimize
    ///   - returnToStart: Whether route should return to starting point
    /// - Returns: Optimized route with legs and polylines
    static func optimizeRoute(
        from start: CLLocationCoordinate2D,
        stops: [RouteStop],
        returnToStart: Bool = false
    ) async throws -> OptimizedRoute {
        guard !stops.isEmpty else {
            return OptimizedRoute(stops: [], totalDistance: 0, totalDuration: 0, legs: [], polylines: [])
        }

        // Use nearest neighbor heuristic
        var optimizedStops: [RouteStop] = []
        var remaining = stops
        var currentLocation = start

        while !remaining.isEmpty {
            // Find nearest unvisited stop
            let nearest = remaining.min { stop1, stop2 in
                let dist1 = distance(from: currentLocation, to: stop1.coordinate)
                let dist2 = distance(from: currentLocation, to: stop2.coordinate)
                return dist1 < dist2
            }!

            optimizedStops.append(nearest)
            remaining.removeAll { $0.id == nearest.id }
            currentLocation = nearest.coordinate
        }

        // Update order property
        for (index, _) in optimizedStops.enumerated() {
            optimizedStops[index].order = index
        }

        // Calculate actual driving routes for each leg
        var legs: [RouteLeg] = []
        var polylines: [MKPolyline] = []
        var totalDistance: Double = 0
        var totalDuration: Double = 0

        // First leg: start → first stop
        if let firstStop = optimizedStops.first {
            do {
                let result = try await DirectionsService.calculateDirections(from: start, to: firstStop.coordinate)
                let leg = RouteLeg(
                    from: RouteStop(projectId: UUID(), coordinate: start, name: "Start", address: "HQ", order: -1),
                    to: firstStop,
                    distance: result.distanceMiles,
                    duration: result.driveTimeHours,
                    polyline: result.polyline
                )
                legs.append(leg)
                polylines.append(result.polyline)
                totalDistance += result.distanceMiles
                totalDuration += result.driveTimeHours
            } catch {
                print("Failed to calculate route leg: \(error)")
            }
        }

        // Middle legs: stop → stop
        for i in 0..<(optimizedStops.count - 1) {
            let from = optimizedStops[i]
            let to = optimizedStops[i + 1]

            do {
                let result = try await DirectionsService.calculateDirections(from: from.coordinate, to: to.coordinate)
                let leg = RouteLeg(
                    from: from,
                    to: to,
                    distance: result.distanceMiles,
                    duration: result.driveTimeHours,
                    polyline: result.polyline
                )
                legs.append(leg)
                polylines.append(result.polyline)
                totalDistance += result.distanceMiles
                totalDuration += result.driveTimeHours
            } catch {
                print("Failed to calculate route leg: \(error)")
            }
        }

        // Last leg: final stop → start (if returning)
        if returnToStart, let lastStop = optimizedStops.last {
            do {
                let result = try await DirectionsService.calculateDirections(from: lastStop.coordinate, to: start)
                let leg = RouteLeg(
                    from: lastStop,
                    to: RouteStop(projectId: UUID(), coordinate: start, name: "Return", address: "HQ", order: optimizedStops.count),
                    distance: result.distanceMiles,
                    duration: result.driveTimeHours,
                    polyline: result.polyline
                )
                legs.append(leg)
                polylines.append(result.polyline)
                totalDistance += result.distanceMiles
                totalDuration += result.driveTimeHours
            } catch {
                print("Failed to calculate return route: \(error)")
            }
        }

        return OptimizedRoute(
            stops: optimizedStops,
            totalDistance: totalDistance,
            totalDuration: totalDuration,
            legs: legs,
            polylines: polylines
        )
    }

    /// Calculate route for manually ordered stops
    /// - Parameters:
    ///   - start: Starting coordinate
    ///   - stops: Ordered array of stops
    ///   - returnToStart: Whether to return to start
    /// - Returns: Route with legs and polylines
    static func calculateRoute(
        from start: CLLocationCoordinate2D,
        stops: [RouteStop],
        returnToStart: Bool = false
    ) async throws -> OptimizedRoute {
        guard !stops.isEmpty else {
            return OptimizedRoute(stops: [], totalDistance: 0, totalDuration: 0, legs: [], polylines: [])
        }

        var legs: [RouteLeg] = []
        var polylines: [MKPolyline] = []
        var totalDistance: Double = 0
        var totalDuration: Double = 0

        // First leg
        if let firstStop = stops.first {
            let result = try await DirectionsService.calculateDirections(from: start, to: firstStop.coordinate)
            let leg = RouteLeg(
                from: RouteStop(projectId: UUID(), coordinate: start, name: "Start", address: "HQ", order: -1),
                to: firstStop,
                distance: result.distanceMiles,
                duration: result.driveTimeHours,
                polyline: result.polyline
            )
            legs.append(leg)
            polylines.append(result.polyline)
            totalDistance += result.distanceMiles
            totalDuration += result.driveTimeHours
        }

        // Middle legs
        for i in 0..<(stops.count - 1) {
            let from = stops[i]
            let to = stops[i + 1]

            let result = try await DirectionsService.calculateDirections(from: from.coordinate, to: to.coordinate)
            let leg = RouteLeg(
                from: from,
                to: to,
                distance: result.distanceMiles,
                duration: result.driveTimeHours,
                polyline: result.polyline
            )
            legs.append(leg)
            polylines.append(result.polyline)
            totalDistance += result.distanceMiles
            totalDuration += result.driveTimeHours
        }

        // Return leg
        if returnToStart, let lastStop = stops.last {
            let result = try await DirectionsService.calculateDirections(from: lastStop.coordinate, to: start)
            let leg = RouteLeg(
                from: lastStop,
                to: RouteStop(projectId: UUID(), coordinate: start, name: "Return", address: "HQ", order: stops.count),
                distance: result.distanceMiles,
                duration: result.driveTimeHours,
                polyline: result.polyline
            )
            legs.append(leg)
            polylines.append(result.polyline)
            totalDistance += result.distanceMiles
            totalDuration += result.driveTimeHours
        }

        return OptimizedRoute(
            stops: stops,
            totalDistance: totalDistance,
            totalDuration: totalDuration,
            legs: legs,
            polylines: polylines
        )
    }

    // MARK: - Route Templates

    /// Save a route as a template
    static func saveTemplate(_ template: RouteTemplate) {
        var templates = loadTemplates()

        // Replace if exists, otherwise append
        if let index = templates.firstIndex(where: { $0.id == template.id }) {
            templates[index] = template
        } else {
            templates.append(template)
        }

        saveTemplates(templates)
    }

    /// Load all saved route templates
    static func loadTemplates() -> [RouteTemplate] {
        guard let data = UserDefaults.standard.data(forKey: "RouteTemplates") else {
            return []
        }

        do {
            let templates = try JSONDecoder().decode([RouteTemplate].self, from: data)
            return templates
        } catch {
            print("Failed to load route templates: \(error)")
            return []
        }
    }

    /// Delete a route template
    static func deleteTemplate(_ template: RouteTemplate) {
        var templates = loadTemplates()
        templates.removeAll { $0.id == template.id }
        saveTemplates(templates)
    }

    private static func saveTemplates(_ templates: [RouteTemplate]) {
        do {
            let data = try JSONEncoder().encode(templates)
            UserDefaults.standard.set(data, forKey: "RouteTemplates")
        } catch {
            print("Failed to save route templates: \(error)")
        }
    }

    // MARK: - Utilities

    /// Calculate distance between two coordinates (as the crow flies)
    private static func distance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
        let fromLocation = CLLocation(latitude: from.latitude, longitude: from.longitude)
        let toLocation = CLLocation(latitude: to.latitude, longitude: to.longitude)
        return fromLocation.distance(from: toLocation) / 1609.34 // Convert to miles
    }

    /// Export route to Apple Maps for navigation
    static func exportToAppleMaps(route: OptimizedRoute, startingFrom start: CLLocationCoordinate2D) {
        guard let firstStop = route.stops.first else { return }

        // Apple Maps only supports single destination, so we'll open the first stop
        let placemark = MKPlacemark(coordinate: firstStop.coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = firstStop.name

        let launchOptions = [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
        ]

        mapItem.openInMaps(launchOptions: launchOptions)
    }

    /// Export route to Google Maps for navigation
    static func exportToGoogleMaps(route: OptimizedRoute, startingFrom start: CLLocationCoordinate2D) {
        guard !route.stops.isEmpty else { return }

        // Build Google Maps URL with waypoints
        var urlString = "comgooglemaps://?saddr=\(start.latitude),\(start.longitude)"

        // Add destination (last stop)
        if let lastStop = route.stops.last {
            urlString += "&daddr=\(lastStop.coordinate.latitude),\(lastStop.coordinate.longitude)"
        }

        // Add waypoints (all stops except last)
        if route.stops.count > 1 {
            let waypoints = route.stops.dropLast().map { stop in
                "\(stop.coordinate.latitude),\(stop.coordinate.longitude)"
            }.joined(separator: "|")
            urlString += "&waypoints=\(waypoints)"
        }

        urlString += "&directionsmode=driving"

        if let url = URL(string: urlString), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        } else {
            // Fall back to web version
            let webURL = URL(string: "https://www.google.com/maps/dir/?api=1&origin=\(start.latitude),\(start.longitude)&destination=\(route.stops.last!.coordinate.latitude),\(route.stops.last!.coordinate.longitude)")!
            UIApplication.shared.open(webURL)
        }
    }
}
