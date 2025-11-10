//
//  DirectionsService.swift
//  TreeShop
//
//  Real driving directions using Apple Maps MKDirections API
//

import Foundation
import MapKit
import CoreLocation

/// Service for calculating real driving directions between locations
class DirectionsService {

    // MARK: - Models

    /// Result of a directions calculation
    struct DirectionsResult {
        let route: MKRoute
        let distance: Double // meters
        let expectedTravelTime: TimeInterval // seconds
        let polyline: MKPolyline

        /// Distance in miles
        var distanceMiles: Double {
            distance * 0.000621371
        }

        /// Drive time in hours
        var driveTimeHours: Double {
            expectedTravelTime / 3600.0
        }

        /// Formatted distance string
        var formattedDistance: String {
            if distanceMiles < 1 {
                let feet = Int(distance * 3.28084)
                return "\(feet) ft"
            } else {
                return String(format: "%.1f mi", distanceMiles)
            }
        }

        /// Formatted drive time string
        var formattedDriveTime: String {
            let hours = Int(expectedTravelTime) / 3600
            let minutes = (Int(expectedTravelTime) % 3600) / 60

            if hours > 0 {
                return "\(hours)h \(minutes)m"
            } else {
                return "\(minutes) min"
            }
        }
    }

    /// Error types for directions requests
    enum DirectionsError: LocalizedError {
        case invalidCoordinates
        case noRoutesFound
        case requestFailed(Error)

        var errorDescription: String? {
            switch self {
            case .invalidCoordinates:
                return "Invalid coordinates provided"
            case .noRoutesFound:
                return "No routes found between locations"
            case .requestFailed(let error):
                return "Directions request failed: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Public Methods

    /// Calculate directions between two coordinates
    /// - Parameters:
    ///   - from: Starting coordinate
    ///   - to: Destination coordinate
    ///   - transportType: Type of transport (default: automobile)
    /// - Returns: DirectionsResult with route information
    static func calculateDirections(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D,
        transportType: MKDirectionsTransportType = .automobile
    ) async throws -> DirectionsResult {

        // Validate coordinates
        guard CLLocationCoordinate2DIsValid(from),
              CLLocationCoordinate2DIsValid(to) else {
            throw DirectionsError.invalidCoordinates
        }

        // Create placemarks
        let sourcePlacemark = MKPlacemark(coordinate: from)
        let destinationPlacemark = MKPlacemark(coordinate: to)

        // Create map items
        let sourceItem = MKMapItem(placemark: sourcePlacemark)
        let destinationItem = MKMapItem(placemark: destinationPlacemark)

        // Create directions request
        let request = MKDirections.Request()
        request.source = sourceItem
        request.destination = destinationItem
        request.transportType = transportType
        request.requestsAlternateRoutes = false // Get fastest route only

        // Execute request
        let directions = MKDirections(request: request)

        do {
            let response = try await directions.calculate()

            guard let route = response.routes.first else {
                throw DirectionsError.noRoutesFound
            }

            return DirectionsResult(
                route: route,
                distance: route.distance,
                expectedTravelTime: route.expectedTravelTime,
                polyline: route.polyline
            )
        } catch {
            throw DirectionsError.requestFailed(error)
        }
    }

    /// Calculate directions from organization HQ to a project
    /// - Parameters:
    ///   - organization: Organization (source location)
    ///   - project: Project (destination)
    /// - Returns: DirectionsResult or nil if coordinates missing
    static func calculateDirections(
        from organization: Organization,
        to project: Project
    ) async throws -> DirectionsResult? {

        guard let orgLat = organization.latitude,
              let orgLng = organization.longitude,
              let projLat = project.latitude,
              let projLng = project.longitude else {
            return nil
        }

        let from = CLLocationCoordinate2D(latitude: orgLat, longitude: orgLng)
        let to = CLLocationCoordinate2D(latitude: projLat, longitude: projLng)

        return try await calculateDirections(from: from, to: to)
    }

    /// Calculate directions between two projects
    /// - Parameters:
    ///   - fromProject: Starting project
    ///   - toProject: Destination project
    /// - Returns: DirectionsResult or nil if coordinates missing
    static func calculateDirections(
        from fromProject: Project,
        to toProject: Project
    ) async throws -> DirectionsResult? {

        guard let fromLat = fromProject.latitude,
              let fromLng = fromProject.longitude,
              let toLat = toProject.latitude,
              let toLng = toProject.longitude else {
            return nil
        }

        let from = CLLocationCoordinate2D(latitude: fromLat, longitude: fromLng)
        let to = CLLocationCoordinate2D(latitude: toLat, longitude: toLng)

        return try await calculateDirections(from: from, to: to)
    }

    /// Calculate one-way drive time in hours (for pricing calculations)
    /// - Parameters:
    ///   - from: Starting coordinate
    ///   - to: Destination coordinate
    /// - Returns: Drive time in hours, or nil if calculation fails
    static func calculateDriveTime(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D
    ) async -> Double? {

        do {
            let result = try await calculateDirections(from: from, to: to)
            return result.driveTimeHours
        } catch {
            print("Drive time calculation failed: \(error)")
            return nil
        }
    }

    /// Calculate round-trip drive time in hours
    /// - Parameters:
    ///   - from: Starting coordinate
    ///   - to: Destination coordinate
    /// - Returns: Round-trip drive time in hours, or nil if calculation fails
    static func calculateRoundTripDriveTime(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D
    ) async -> Double? {

        guard let oneWay = await calculateDriveTime(from: from, to: to) else {
            return nil
        }

        return oneWay * 2.0
    }

    /// Get multiple alternate routes between two points
    /// - Parameters:
    ///   - from: Starting coordinate
    ///   - to: Destination coordinate
    ///   - transportType: Type of transport
    /// - Returns: Array of DirectionsResult (up to 3 routes)
    static func calculateAlternateRoutes(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D,
        transportType: MKDirectionsTransportType = .automobile
    ) async throws -> [DirectionsResult] {

        guard CLLocationCoordinate2DIsValid(from),
              CLLocationCoordinate2DIsValid(to) else {
            throw DirectionsError.invalidCoordinates
        }

        let sourcePlacemark = MKPlacemark(coordinate: from)
        let destinationPlacemark = MKPlacemark(coordinate: to)

        let sourceItem = MKMapItem(placemark: sourcePlacemark)
        let destinationItem = MKMapItem(placemark: destinationPlacemark)

        let request = MKDirections.Request()
        request.source = sourceItem
        request.destination = destinationItem
        request.transportType = transportType
        request.requestsAlternateRoutes = true

        let directions = MKDirections(request: request)

        do {
            let response = try await directions.calculate()

            return response.routes.map { route in
                DirectionsResult(
                    route: route,
                    distance: route.distance,
                    expectedTravelTime: route.expectedTravelTime,
                    polyline: route.polyline
                )
            }
        } catch {
            throw DirectionsError.requestFailed(error)
        }
    }

    /// Calculate ETA (estimated time of arrival)
    /// - Parameters:
    ///   - from: Current location
    ///   - to: Destination
    /// - Returns: ETA date, or nil if calculation fails
    static func calculateETA(
        from: CLLocationCoordinate2D,
        to: CLLocationCoordinate2D
    ) async -> Date? {

        do {
            let result = try await calculateDirections(from: from, to: to)
            return Date().addingTimeInterval(result.expectedTravelTime)
        } catch {
            return nil
        }
    }
}
