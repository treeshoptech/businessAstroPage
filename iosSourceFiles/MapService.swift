//
//  MapService.swift
//  TreeShop
//
//  Map utilities for territory analysis, distance calculations, and visualization
//

import Foundation
import MapKit
import CoreLocation

@MainActor
class MapService: ObservableObject {

    // MARK: - Drive Time Isochrones

    /// Calculate drive time radius circles from organization HQ
    func calculateDriveTimeCircles(
        from origin: CLLocationCoordinate2D,
        radiusMinutes: [Double] = [30, 60, 120]
    ) -> [MKCircle] {
        // Approximate: 1 minute drive ≈ 0.5 miles at average speed
        // 30 min ≈ 15 miles, 60 min ≈ 30 miles, 120 min ≈ 60 miles
        let milesPerMinute = 0.5
        let metersPerMile = 1609.34

        return radiusMinutes.map { minutes in
            let radiusMiles = minutes * milesPerMinute
            let radiusMeters = radiusMiles * metersPerMile
            return MKCircle(center: origin, radius: radiusMeters)
        }
    }

    // MARK: - Distance Calculations

    /// Calculate straight-line distance between two coordinates (in miles)
    func straightLineDistance(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D
    ) -> Double {
        let fromLocation = CLLocation(latitude: from.latitude, longitude: from.longitude)
        let toLocation = CLLocation(latitude: to.latitude, longitude: to.longitude)
        let distanceMeters = fromLocation.distance(from: toLocation)
        return distanceMeters / 1609.34 // Convert to miles
    }

    /// Calculate real driving distance using Apple Maps (async)
    func drivingDistance(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D
    ) async -> Double? {
        do {
            let result = try await DirectionsService.calculateDirections(from: from, to: to)
            return result.distanceMiles
        } catch {
            print("Failed to calculate driving distance: \(error)")
            return nil
        }
    }

    /// Calculate real drive time using Apple Maps (async)
    func driveTime(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D
    ) async -> Double? {
        return await DirectionsService.calculateDriveTime(from: from, to: to)
    }

    /// Format distance for display
    func formatDistance(_ miles: Double) -> String {
        if miles < 1 {
            return String(format: "%.1f mi", miles)
        } else {
            return String(format: "%.0f mi", miles)
        }
    }

    // MARK: - Territory Analysis

    /// Calculate the center point of multiple coordinates (geographic centroid)
    func calculateCentroid(coordinates: [CLLocationCoordinate2D]) -> CLLocationCoordinate2D? {
        guard !coordinates.isEmpty else { return nil }

        let sumLat = coordinates.reduce(0.0) { $0 + $1.latitude }
        let sumLng = coordinates.reduce(0.0) { $0 + $1.longitude }

        return CLLocationCoordinate2D(
            latitude: sumLat / Double(coordinates.count),
            longitude: sumLng / Double(coordinates.count)
        )
    }

    /// Calculate bounding box for multiple coordinates
    func calculateBoundingBox(coordinates: [CLLocationCoordinate2D]) -> MKCoordinateRegion? {
        guard !coordinates.isEmpty else { return nil }

        var minLat = coordinates[0].latitude
        var maxLat = coordinates[0].latitude
        var minLng = coordinates[0].longitude
        var maxLng = coordinates[0].longitude

        for coord in coordinates {
            minLat = min(minLat, coord.latitude)
            maxLat = max(maxLat, coord.latitude)
            minLng = min(minLng, coord.longitude)
            maxLng = max(maxLng, coord.longitude)
        }

        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2
        )

        let span = MKCoordinateSpan(
            latitudeDelta: (maxLat - minLat) * 1.2, // 20% padding
            longitudeDelta: (maxLng - minLng) * 1.2
        )

        return MKCoordinateRegion(center: center, span: span)
    }

    // MARK: - Route Optimization (Simple Nearest-Neighbor TSP)

    /// Optimize route order for multiple stops (nearest-neighbor heuristic using straight-line distance)
    func optimizeRoute(
        from origin: CLLocationCoordinate2D,
        stops: [CLLocationCoordinate2D]
    ) -> [Int] {
        guard !stops.isEmpty else { return [] }

        var unvisited = Set(stops.indices)
        var route: [Int] = []
        var currentLocation = origin

        while !unvisited.isEmpty {
            // Find nearest unvisited stop
            var nearestIndex = unvisited.first!
            var nearestDistance = Double.infinity

            for index in unvisited {
                let distance = straightLineDistance(from: currentLocation, to: stops[index])
                if distance < nearestDistance {
                    nearestDistance = distance
                    nearestIndex = index
                }
            }

            route.append(nearestIndex)
            currentLocation = stops[nearestIndex]
            unvisited.remove(nearestIndex)
        }

        return route
    }

    /// Calculate total straight-line route distance
    func calculateRouteDistance(
        from origin: CLLocationCoordinate2D,
        stops: [CLLocationCoordinate2D],
        order: [Int]
    ) -> Double {
        guard !order.isEmpty else { return 0 }

        var totalDistance = 0.0
        var currentLocation = origin

        for index in order {
            let nextLocation = stops[index]
            totalDistance += straightLineDistance(from: currentLocation, to: nextLocation)
            currentLocation = nextLocation
        }

        // Add return to origin
        totalDistance += straightLineDistance(from: currentLocation, to: origin)

        return totalDistance
    }

    /// Calculate total real driving distance for a multi-stop route (async)
    func calculateDrivingRouteDistance(
        from origin: CLLocationCoordinate2D,
        stops: [CLLocationCoordinate2D],
        order: [Int]
    ) async -> Double? {
        guard !order.isEmpty else { return 0 }

        var totalDistance = 0.0
        var currentLocation = origin

        for index in order {
            let nextLocation = stops[index]
            if let distance = await drivingDistance(from: currentLocation, to: nextLocation) {
                totalDistance += distance
            } else {
                return nil // Failed to calculate a segment
            }
            currentLocation = nextLocation
        }

        // Add return to origin
        if let returnDistance = await drivingDistance(from: currentLocation, to: origin) {
            totalDistance += returnDistance
        } else {
            return nil
        }

        return totalDistance
    }

    /// Calculate total driving time for a multi-stop route (async)
    func calculateDrivingRouteTime(
        from origin: CLLocationCoordinate2D,
        stops: [CLLocationCoordinate2D],
        order: [Int]
    ) async -> Double? {
        guard !order.isEmpty else { return 0 }

        var totalTime = 0.0
        var currentLocation = origin

        for index in order {
            let nextLocation = stops[index]
            if let time = await driveTime(from: currentLocation, to: nextLocation) {
                totalTime += time
            } else {
                return nil // Failed to calculate a segment
            }
            currentLocation = nextLocation
        }

        // Add return to origin
        if let returnTime = await driveTime(from: currentLocation, to: origin) {
            totalTime += returnTime
        } else {
            return nil
        }

        return totalTime
    }

    // MARK: - Map Region Helpers

    /// Create region centered on coordinate with reasonable zoom
    func createRegion(
        center: CLLocationCoordinate2D,
        radiusMiles: Double = 10
    ) -> MKCoordinateRegion {
        // Rough approximation: 1 degree latitude ≈ 69 miles
        let latitudeDelta = (radiusMiles * 2) / 69.0
        let longitudeDelta = latitudeDelta * 1.3 // Adjust for longitude at mid-latitudes

        return MKCoordinateRegion(
            center: center,
            span: MKCoordinateSpan(
                latitudeDelta: latitudeDelta,
                longitudeDelta: longitudeDelta
            )
        )
    }

    /// Default region for New Smyrna Beach, FL
    static var defaultRegion: MKCoordinateRegion {
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 29.0219, longitude: -80.9270),
            span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        )
    }
}

// MARK: - Map Annotation Models

/// Base protocol for map annotations
protocol MapAnnotationItem: Identifiable {
    var coordinate: CLLocationCoordinate2D { get }
    var title: String { get }
    var subtitle: String? { get }
}

/// Project map annotation
struct ProjectAnnotation: MapAnnotationItem {
    let id: UUID
    let coordinate: CLLocationCoordinate2D
    let title: String
    let subtitle: String?
    let status: ProjectStatus
    let serviceType: ServiceType
    let value: Double

    var statusColor: String {
        switch status {
        case .quoted: return "blue"
        case .approved: return "green"
        case .inProgress: return "orange"
        case .completed: return "purple"
        case .cancelled: return "gray"
        }
    }
}

/// Customer map annotation
struct CustomerAnnotation: MapAnnotationItem {
    let id: UUID
    let coordinate: CLLocationCoordinate2D
    let title: String
    let subtitle: String?
    let projectCount: Int
    let totalValue: Double

    var valueTier: String {
        if totalValue >= 50000 {
            return "gold"
        } else if totalValue >= 20000 {
            return "green"
        } else if totalValue >= 5000 {
            return "blue"
        } else {
            return "gray"
        }
    }
}
