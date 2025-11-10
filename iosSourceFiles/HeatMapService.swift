//
//  HeatMapService.swift
//  TreeShop
//
//  Generate heat map overlays for project density and revenue visualization
//

import Foundation
import MapKit
import SwiftUI

/// Service for generating heat map overlays
@MainActor
class HeatMapService: ObservableObject {

    // MARK: - Types

    /// Heat map data point
    struct HeatPoint {
        let coordinate: CLLocationCoordinate2D
        let intensity: Double // 0.0 to 1.0
        let value: Double // Actual value (revenue, count, etc.)
    }

    /// Heat map configuration
    struct HeatMapConfig {
        var radius: Double = 100 // meters
        var opacity: Double = 0.6
        var gradient: [Color] = [.blue, .green, .yellow, .orange, .red]
        var minIntensity: Double = 0.1
        var maxIntensity: Double = 1.0
    }

    // MARK: - Heat Map Generation

    /// Generate heat map circles from project locations
    static func generateProjectDensityHeatMap(
        projects: [Project],
        config: HeatMapConfig = HeatMapConfig()
    ) -> [MapCircle] {
        guard !projects.isEmpty else { return [] }

        // Group projects by proximity
        let clusters = clusterProjects(projects, radius: config.radius)

        // Generate heat circles
        var heatCircles: [MapCircle] = []

        for cluster in clusters {
            let intensity = Double(cluster.count) / Double(projects.count)
            _ = min(max(intensity, config.minIntensity), config.maxIntensity)

            let circle = MapCircle(
                center: cluster.center,
                radius: CLLocationDistance(config.radius)
            )

            heatCircles.append(circle)
        }

        return heatCircles
    }

    /// Generate heat map from revenue data
    static func generateRevenueHeatMap(
        projects: [Project],
        config: HeatMapConfig = HeatMapConfig()
    ) -> [(circle: MapCircle, revenue: Double)] {
        guard !projects.isEmpty else { return [] }

        // Group by location and sum revenue
        let revenueGroups = groupProjectsByRevenue(projects, radius: config.radius)

        var heatData: [(circle: MapCircle, revenue: Double)] = []

        for group in revenueGroups {
            let circle = MapCircle(
                center: group.center,
                radius: CLLocationDistance(config.radius)
            )

            heatData.append((circle, group.totalRevenue))
        }

        return heatData
    }

    /// Get heat map color for intensity value
    static func colorForIntensity(_ intensity: Double, gradient: [Color]) -> Color {
        guard !gradient.isEmpty else { return .blue }
        guard intensity > 0 else { return gradient.first! }
        guard intensity < 1 else { return gradient.last! }

        let index = intensity * Double(gradient.count - 1)
        let lowerIndex = Int(floor(index))
        _ = min(lowerIndex + 1, gradient.count - 1)
        _ = index - Double(lowerIndex)

        // Simple color interpolation
        return gradient[lowerIndex]
    }

    // MARK: - Clustering

    private struct ProjectCluster {
        let center: CLLocationCoordinate2D
        let projects: [Project]

        var count: Int { projects.count }
    }

    private struct RevenueGroup {
        let center: CLLocationCoordinate2D
        let projects: [Project]

        var totalRevenue: Double {
            projects.compactMap { $0.quotes?.first?.highEstimate }.reduce(0, +)
        }
    }

    private static func clusterProjects(_ projects: [Project], radius: Double) -> [ProjectCluster] {
        var clusters: [ProjectCluster] = []
        var remaining = projects.filter { $0.hasValidCoordinates }

        while !remaining.isEmpty {
            let first = remaining.removeFirst()
            guard let firstCoord = first.mapCoordinate else { continue }

            var clusterProjects = [first]

            // Find all projects within radius
            remaining = remaining.filter { project in
                guard let coord = project.mapCoordinate else { return true }

                let loc1 = CLLocation(latitude: firstCoord.latitude, longitude: firstCoord.longitude)
                let loc2 = CLLocation(latitude: coord.latitude, longitude: coord.longitude)

                let distance = loc1.distance(from: loc2)

                if distance <= radius {
                    clusterProjects.append(project)
                    return false // Remove from remaining
                }
                return true // Keep in remaining
            }

            // Calculate cluster center (centroid)
            let avgLat = clusterProjects.compactMap { $0.latitude }.reduce(0, +) / Double(clusterProjects.count)
            let avgLng = clusterProjects.compactMap { $0.longitude }.reduce(0, +) / Double(clusterProjects.count)

            let center = CLLocationCoordinate2D(latitude: avgLat, longitude: avgLng)
            clusters.append(ProjectCluster(center: center, projects: clusterProjects))
        }

        return clusters
    }

    private static func groupProjectsByRevenue(_ projects: [Project], radius: Double) -> [RevenueGroup] {
        let clusters = clusterProjects(projects, radius: radius)

        return clusters.map { cluster in
            RevenueGroup(center: cluster.center, projects: cluster.projects)
        }
    }

    // MARK: - Grid-Based Heat Map (Alternative Approach)

    /// Generate grid-based heat map for smoother visualization
    static func generateGridHeatMap(
        projects: [Project],
        gridSize: Int = 20,
        config: HeatMapConfig = HeatMapConfig()
    ) -> [HeatPoint] {
        guard !projects.isEmpty else { return [] }

        // Calculate bounds
        let coordinates = projects.compactMap { $0.mapCoordinate }
        guard !coordinates.isEmpty else { return [] }

        let minLat = coordinates.map { $0.latitude }.min()!
        let maxLat = coordinates.map { $0.latitude }.max()!
        let minLng = coordinates.map { $0.longitude }.min()!
        let maxLng = coordinates.map { $0.longitude }.max()!

        let latStep = (maxLat - minLat) / Double(gridSize)
        let lngStep = (maxLng - minLng) / Double(gridSize)

        var heatPoints: [HeatPoint] = []

        // Generate grid
        for i in 0..<gridSize {
            for j in 0..<gridSize {
                let lat = minLat + (Double(i) + 0.5) * latStep
                let lng = minLng + (Double(j) + 0.5) * lngStep

                let gridCenter = CLLocationCoordinate2D(latitude: lat, longitude: lng)

                // Calculate intensity based on nearby projects
                let intensity = calculateIntensityAt(gridCenter, projects: projects, radius: config.radius)

                if intensity > config.minIntensity {
                    heatPoints.append(HeatPoint(
                        coordinate: gridCenter,
                        intensity: intensity,
                        value: intensity
                    ))
                }
            }
        }

        return heatPoints
    }

    private static func calculateIntensityAt(
        _ coordinate: CLLocationCoordinate2D,
        projects: [Project],
        radius: Double
    ) -> Double {
        let centerLocation = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)

        var totalIntensity: Double = 0

        for project in projects {
            guard let projectCoord = project.mapCoordinate else { continue }

            let projectLocation = CLLocation(latitude: projectCoord.latitude, longitude: projectCoord.longitude)
            let distance = centerLocation.distance(from: projectLocation)

            if distance <= radius {
                // Gaussian falloff
                let normalizedDistance = distance / radius
                let intensity = exp(-pow(normalizedDistance, 2) * 2)
                totalIntensity += intensity
            }
        }

        return min(totalIntensity / 5.0, 1.0) // Normalize
    }
}
