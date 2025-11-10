//
//  NavigationHelper.swift
//  TreeShop
//
//  Helper for launching turn-by-turn navigation in Apple Maps
//

import Foundation
import MapKit
import CoreLocation
import SwiftData

/// Helper for launching navigation to job sites
class NavigationHelper {

    // MARK: - Navigation Launch Options

    /// Launch Apple Maps with turn-by-turn directions to a coordinate
    /// - Parameters:
    ///   - destination: Destination coordinate
    ///   - name: Name to display for destination (e.g., customer name)
    ///   - transportMode: Type of transport (default: driving)
    static func navigateTo(
        destination: CLLocationCoordinate2D,
        name: String? = nil,
        transportMode: String = MKLaunchOptionsDirectionsModeDriving
    ) {
        let placemark = MKPlacemark(coordinate: destination)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = name

        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: transportMode
        ])
    }

    /// Launch Apple Maps with turn-by-turn directions to a project
    /// - Parameters:
    ///   - project: Project destination
    static func navigateToProject(_ project: Project) {
        guard let coordinate = project.mapCoordinate else {
            print("Cannot navigate: project has no coordinates")
            return
        }

        navigateTo(
            destination: coordinate,
            name: project.customerName
        )
    }

    /// Launch Apple Maps with turn-by-turn directions to a customer
    /// - Parameters:
    ///   - customer: Customer destination
    static func navigateToCustomer(_ customer: Customer) {
        guard let coordinate = customer.mapCoordinate else {
            print("Cannot navigate: customer has no coordinates")
            return
        }

        navigateTo(
            destination: coordinate,
            name: customer.name
        )
    }

    /// Launch Apple Maps with directions from organization HQ to project
    /// - Parameters:
    ///   - organization: Starting point (HQ)
    ///   - project: Destination
    static func navigateFrom(organization: Organization, to project: Project) {
        guard organization.hasValidCoordinates,
              let orgLat = organization.latitude,
              let orgLng = organization.longitude else {
            print("Cannot navigate: organization has no coordinates")
            return
        }

        guard let projectCoordinate = project.mapCoordinate else {
            print("Cannot navigate: project has no coordinates")
            return
        }

        let sourcePlacemark = MKPlacemark(
            coordinate: CLLocationCoordinate2D(latitude: orgLat, longitude: orgLng)
        )
        let sourceMapItem = MKMapItem(placemark: sourcePlacemark)
        sourceMapItem.name = organization.name

        let destPlacemark = MKPlacemark(coordinate: projectCoordinate)
        let destMapItem = MKMapItem(placemark: destPlacemark)
        destMapItem.name = project.customerName

        MKMapItem.openMaps(
            with: [sourceMapItem, destMapItem],
            launchOptions: [
                MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
            ]
        )
    }

    // MARK: - Multi-Stop Routes

    /// Launch Apple Maps with multiple stops (route planning)
    /// - Parameters:
    ///   - projects: Projects to visit in order
    ///   - startFromHQ: Whether to start from organization HQ
    ///   - organization: Organization (required if startFromHQ is true)
    static func navigateToMultipleProjects(
        _ projects: [Project],
        startFromHQ: Bool = true,
        organization: Organization? = nil
    ) {
        guard !projects.isEmpty else {
            print("Cannot navigate: no projects provided")
            return
        }

        var mapItems: [MKMapItem] = []

        // Add HQ as starting point if requested
        if startFromHQ,
           let org = organization,
           org.hasValidCoordinates,
           let lat = org.latitude,
           let lng = org.longitude {
            let hqPlacemark = MKPlacemark(
                coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
            )
            let hqItem = MKMapItem(placemark: hqPlacemark)
            hqItem.name = "\(org.name) HQ"
            mapItems.append(hqItem)
        }

        // Add all projects as waypoints
        for project in projects {
            guard let coordinate = project.mapCoordinate else { continue }

            let placemark = MKPlacemark(coordinate: coordinate)
            let mapItem = MKMapItem(placemark: placemark)
            mapItem.name = project.customerName
            mapItems.append(mapItem)
        }

        guard mapItems.count >= 2 else {
            print("Cannot navigate: need at least 2 valid locations")
            return
        }

        MKMapItem.openMaps(
            with: mapItems,
            launchOptions: [
                MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
            ]
        )
    }

    // MARK: - Quick Actions

    /// Open location in Apple Maps (no directions, just show on map)
    /// - Parameters:
    ///   - coordinate: Coordinate to display
    ///   - name: Name for the location
    static func showOnMap(coordinate: CLLocationCoordinate2D, name: String? = nil) {
        let placemark = MKPlacemark(coordinate: coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = name

        mapItem.openInMaps(launchOptions: [:])
    }

    /// Share location via system share sheet
    /// - Parameters:
    ///   - coordinate: Coordinate to share
    ///   - name: Name for the location
    /// - Returns: URL that can be shared (Apple Maps URL)
    static func shareLocation(coordinate: CLLocationCoordinate2D, name: String? = nil) -> URL? {
        // Create Apple Maps URL
        var components = URLComponents()
        components.scheme = "https"
        components.host = "maps.apple.com"
        components.queryItems = [
            URLQueryItem(name: "ll", value: "\(coordinate.latitude),\(coordinate.longitude)"),
            URLQueryItem(name: "q", value: name ?? "Location")
        ]

        return components.url
    }

    // MARK: - ETA and Distance Queries

    /// Get estimated time of arrival to a project (async)
    /// - Parameters:
    ///   - from: Starting coordinate
    ///   - project: Destination project
    /// - Returns: ETA date, or nil if calculation fails
    static func getETA(from: CLLocationCoordinate2D, to project: Project) async -> Date? {
        guard let destination = project.mapCoordinate else { return nil }
        return await DirectionsService.calculateETA(from: from, to: destination)
    }

    /// Check if a project is within a certain drive time from HQ
    /// - Parameters:
    ///   - project: Project to check
    ///   - organization: Organization HQ
    ///   - maxDriveTimeHours: Maximum acceptable drive time in hours
    /// - Returns: True if within range, false otherwise
    static func isWithinDriveTime(
        project: Project,
        from organization: Organization,
        maxDriveTimeHours: Double
    ) async -> Bool {
        guard organization.hasValidCoordinates,
              let orgLat = organization.latitude,
              let orgLng = organization.longitude,
              let projectCoord = project.mapCoordinate else {
            return false
        }

        let from = CLLocationCoordinate2D(latitude: orgLat, longitude: orgLng)

        if let driveTime = await DirectionsService.calculateDriveTime(from: from, to: projectCoord) {
            return driveTime <= maxDriveTimeHours
        }

        return false
    }
}
