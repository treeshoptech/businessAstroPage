//
//  PolygonDrawingService.swift
//  TreeShop
//
//  Service for drawing and managing map polygons
//

import Foundation
import MapKit
import CoreLocation

/// Service for polygon drawing and area calculation
@MainActor
class PolygonDrawingService: ObservableObject {

    // MARK: - Types

    /// A drawn polygon with metadata
    struct DrawnPolygon: Identifiable, Codable {
        let id: UUID
        var name: String
        var points: [CoordinatePoint]
        var area: Double // Square meters
        let createdAt: Date
        var updatedAt: Date

        var acreage: Double {
            area * 0.000247105 // Convert sq meters to acres
        }

        var polygon: MKPolygon {
            let coordinates = points.map { $0.coordinate }
            return MKPolygon(coordinates: coordinates, count: coordinates.count)
        }

        init(id: UUID = UUID(), name: String, points: [CoordinatePoint], createdAt: Date = Date(), updatedAt: Date = Date()) {
            self.id = id
            self.name = name
            self.points = points
            self.createdAt = createdAt
            self.updatedAt = updatedAt
            self.area = Self.calculateArea(points: points)
        }

        /// Calculate polygon area using Shoelace formula
        static func calculateArea(points: [CoordinatePoint]) -> Double {
            guard points.count >= 3 else { return 0 }

            let earthRadius: Double = 6371000 // meters

            // Convert to Cartesian coordinates
            var cartesianPoints: [(x: Double, y: Double, z: Double)] = []

            for point in points {
                let lat = point.latitude * .pi / 180
                let lon = point.longitude * .pi / 180

                let x = earthRadius * cos(lat) * cos(lon)
                let y = earthRadius * cos(lat) * sin(lon)
                let z = earthRadius * sin(lat)

                cartesianPoints.append((x, y, z))
            }

            // Calculate area using cross products
            var area: Double = 0

            for i in 0..<cartesianPoints.count {
                let p1 = cartesianPoints[i]
                let p2 = cartesianPoints[(i + 1) % cartesianPoints.count]

                area += p1.x * p2.y - p2.x * p1.y
            }

            return abs(area) / 2
        }
    }

    /// Codable coordinate point
    struct CoordinatePoint: Identifiable, Codable {
        let id: UUID
        let latitude: Double
        let longitude: Double

        var coordinate: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        }

        init(id: UUID = UUID(), latitude: Double, longitude: Double) {
            self.id = id
            self.latitude = latitude
            self.longitude = longitude
        }

        init(id: UUID = UUID(), coordinate: CLLocationCoordinate2D) {
            self.id = id
            self.latitude = coordinate.latitude
            self.longitude = coordinate.longitude
        }
    }

    // MARK: - Published Properties

    @Published var isDrawing: Bool = false
    @Published var currentPoints: [CoordinatePoint] = []
    @Published var savedPolygons: [DrawnPolygon] = []

    // MARK: - Drawing Actions

    /// Start a new polygon drawing
    func startDrawing() {
        isDrawing = true
        currentPoints.removeAll()
    }

    /// Add a point to the current polygon
    func addPoint(_ coordinate: CLLocationCoordinate2D) {
        guard isDrawing else { return }
        currentPoints.append(CoordinatePoint(coordinate: coordinate))
    }

    /// Remove the last point
    func undoLastPoint() {
        guard !currentPoints.isEmpty else { return }
        currentPoints.removeLast()
    }

    /// Complete the current polygon
    func finishDrawing(name: String) -> DrawnPolygon? {
        guard currentPoints.count >= 3 else { return nil }

        let polygon = DrawnPolygon(name: name, points: currentPoints)
        savedPolygons.append(polygon)
        savePolygons()

        isDrawing = false
        currentPoints.removeAll()

        return polygon
    }

    /// Cancel drawing
    func cancelDrawing() {
        isDrawing = false
        currentPoints.removeAll()
    }

    // MARK: - Polygon Management

    /// Save a polygon
    func savePolygon(_ polygon: DrawnPolygon) {
        if let index = savedPolygons.firstIndex(where: { $0.id == polygon.id }) {
            savedPolygons[index] = polygon
        } else {
            savedPolygons.append(polygon)
        }
        savePolygons()
    }

    /// Delete a polygon
    func deletePolygon(_ polygon: DrawnPolygon) {
        savedPolygons.removeAll { $0.id == polygon.id }
        savePolygons()
    }

    /// Check if a point is inside a polygon
    static func pointInPolygon(_ point: CLLocationCoordinate2D, polygon: DrawnPolygon) -> Bool {
        let polygonPoints = polygon.points.map { $0.coordinate }
        return pointInPolygon(point, polygonPoints: polygonPoints)
    }

    /// Ray casting algorithm for point-in-polygon test
    private static func pointInPolygon(_ point: CLLocationCoordinate2D, polygonPoints: [CLLocationCoordinate2D]) -> Bool {
        guard polygonPoints.count >= 3 else { return false }

        var inside = false
        var j = polygonPoints.count - 1

        for i in 0..<polygonPoints.count {
            let xi = polygonPoints[i].longitude
            let yi = polygonPoints[i].latitude
            let xj = polygonPoints[j].longitude
            let yj = polygonPoints[j].latitude

            let intersect = ((yi > point.latitude) != (yj > point.latitude)) &&
                           (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi)

            if intersect {
                inside.toggle()
            }

            j = i
        }

        return inside
    }

    /// Calculate perimeter of polygon in meters
    static func calculatePerimeter(points: [CoordinatePoint]) -> Double {
        guard points.count >= 2 else { return 0 }

        var perimeter: Double = 0

        for i in 0..<points.count {
            let p1 = points[i]
            let p2 = points[(i + 1) % points.count]

            let location1 = CLLocation(latitude: p1.latitude, longitude: p1.longitude)
            let location2 = CLLocation(latitude: p2.latitude, longitude: p2.longitude)

            perimeter += location1.distance(from: location2)
        }

        return perimeter
    }

    // MARK: - Persistence

    private let userDefaultsKey = "SavedMapPolygons"

    private func savePolygons() {
        do {
            let data = try JSONEncoder().encode(savedPolygons)
            UserDefaults.standard.set(data, forKey: userDefaultsKey)
        } catch {
            print("Failed to save polygons: \(error)")
        }
    }

    func loadPolygons() {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey) else {
            return
        }

        do {
            savedPolygons = try JSONDecoder().decode([DrawnPolygon].self, from: data)
        } catch {
            print("Failed to load polygons: \(error)")
        }
    }

    // MARK: - Helpers

    /// Format area in appropriate units
    static func formatArea(_ squareMeters: Double) -> String {
        let acres = squareMeters * 0.000247105

        if acres < 1 {
            return String(format: "%.0f sq ft", squareMeters * 10.7639)
        } else if acres < 100 {
            return String(format: "%.2f acres", acres)
        } else {
            return String(format: "%.1f acres", acres)
        }
    }

    /// Format perimeter in appropriate units
    static func formatPerimeter(_ meters: Double) -> String {
        let feet = meters * 3.28084

        if feet < 1000 {
            return String(format: "%.0f ft", feet)
        } else {
            let miles = meters / 1609.34
            return String(format: "%.2f mi", miles)
        }
    }
}
