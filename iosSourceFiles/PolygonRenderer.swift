//
//  PolygonRenderer.swift
//  TreeShop
//
//  Polygon area calculation and coordinate management utilities
//

import Foundation
import CoreLocation
import MapKit

struct PolygonCoordinate: Codable {
    let latitude: Double
    let longitude: Double

    var clLocationCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

    init(from coordinate: CLLocationCoordinate2D) {
        self.latitude = coordinate.latitude
        self.longitude = coordinate.longitude
    }
}

class PolygonRenderer {

    // MARK: - JSON Serialization

    /// Convert array of CLLocationCoordinate2D to JSON string
    static func encodeCoordinates(_ coordinates: [CLLocationCoordinate2D]) -> String? {
        let polygonCoords = coordinates.map { PolygonCoordinate(from: $0) }
        guard let jsonData = try? JSONEncoder().encode(polygonCoords) else { return nil }
        return String(data: jsonData, encoding: .utf8)
    }

    /// Convert JSON string to array of CLLocationCoordinate2D
    static func decodeCoordinates(_ json: String) -> [CLLocationCoordinate2D]? {
        guard let jsonData = json.data(using: .utf8),
              let polygonCoords = try? JSONDecoder().decode([PolygonCoordinate].self, from: jsonData) else {
            return nil
        }
        return polygonCoords.map { $0.clLocationCoordinate }
    }

    // MARK: - Polygon Validation

    /// Check if polygon is valid (minimum 3 vertices, no self-intersection)
    static func isValidPolygon(_ coordinates: [CLLocationCoordinate2D]) -> Bool {
        // Need at least 3 points to form a polygon
        guard coordinates.count >= 3 else { return false }

        // Check for duplicate consecutive points
        for i in 0..<coordinates.count {
            let current = coordinates[i]
            let next = coordinates[(i + 1) % coordinates.count]

            if current.latitude == next.latitude && current.longitude == next.longitude {
                return false
            }
        }

        // For now, accept all non-degenerate polygons
        // Could add self-intersection check later if needed
        return true
    }

    // MARK: - Area Calculation

    /// Calculate polygon area in acres using Shoelace formula
    /// Reference: https://en.wikipedia.org/wiki/Shoelace_formula
    static func calculateArea(coordinates: [CLLocationCoordinate2D]) -> Double {
        guard isValidPolygon(coordinates) else { return 0 }

        // Convert lat/lon to meters using equirectangular projection
        // This is approximate but sufficient for small areas (< 100 acres)
        let avgLatitude = coordinates.reduce(0.0) { $0 + $1.latitude } / Double(coordinates.count)
        let metersPerDegreeLat = 111320.0  // meters per degree latitude (constant)
        let metersPerDegreeLon = 111320.0 * cos(avgLatitude * .pi / 180.0)  // varies by latitude

        // Convert coordinates to x,y in meters
        let origin = coordinates.first!
        var points: [(x: Double, y: Double)] = []

        for coord in coordinates {
            let x = (coord.longitude - origin.longitude) * metersPerDegreeLon
            let y = (coord.latitude - origin.latitude) * metersPerDegreeLat
            points.append((x: x, y: y))
        }

        // Shoelace formula
        var areaSquareMeters = 0.0
        let n = points.count

        for i in 0..<n {
            let j = (i + 1) % n
            areaSquareMeters += points[i].x * points[j].y
            areaSquareMeters -= points[j].x * points[i].y
        }

        areaSquareMeters = abs(areaSquareMeters) / 2.0

        // Convert square meters to acres
        let acres = areaSquareMeters * 0.000247105

        return acres
    }

    /// Format area for display
    static func formatArea(_ acres: Double) -> String {
        String(format: "%.2f", acres)
    }

    // MARK: - MapKit Integration

    /// Create MKPolygon from coordinates
    static func makeMapPolygon(_ coordinates: [CLLocationCoordinate2D]) -> MKPolygon {
        var coords = coordinates
        return MKPolygon(coordinates: &coords, count: coordinates.count)
    }

    /// Get polygon center point (centroid)
    static func getPolygonCenter(_ coordinates: [CLLocationCoordinate2D]) -> CLLocationCoordinate2D {
        guard !coordinates.isEmpty else {
            return CLLocationCoordinate2D(latitude: 0, longitude: 0)
        }

        let avgLat = coordinates.reduce(0.0) { $0 + $1.latitude } / Double(coordinates.count)
        let avgLon = coordinates.reduce(0.0) { $0 + $1.longitude } / Double(coordinates.count)

        return CLLocationCoordinate2D(latitude: avgLat, longitude: avgLon)
    }

    /// Get bounding region that contains all coordinates
    static func getBoundingRegion(_ coordinates: [CLLocationCoordinate2D], paddingFactor: Double = 1.2) -> MKCoordinateRegion {
        guard !coordinates.isEmpty else {
            return MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 29.0219, longitude: -80.9270),
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
        }

        var minLat = coordinates[0].latitude
        var maxLat = coordinates[0].latitude
        var minLon = coordinates[0].longitude
        var maxLon = coordinates[0].longitude

        for coord in coordinates {
            minLat = min(minLat, coord.latitude)
            maxLat = max(maxLat, coord.latitude)
            minLon = min(minLon, coord.longitude)
            maxLon = max(maxLon, coord.longitude)
        }

        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2.0,
            longitude: (minLon + maxLon) / 2.0
        )

        let latDelta = (maxLat - minLat) * paddingFactor
        let lonDelta = (maxLon - minLon) * paddingFactor

        let span = MKCoordinateSpan(
            latitudeDelta: max(latDelta, 0.001),  // Minimum span to prevent zooming too close
            longitudeDelta: max(lonDelta, 0.001)
        )

        return MKCoordinateRegion(center: center, span: span)
    }
}
