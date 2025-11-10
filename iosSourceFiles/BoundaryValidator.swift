//
//  BoundaryValidator.swift
//  TreeShop
//
//  Real-time validation of work areas against property boundaries
//  Ensures accurate scope definition and prevents boundary violations
//

import Foundation
import MapKit
import CoreLocation

// MARK: - Validation Result Types

enum BoundaryValidationState: String, Codable {
    case valid = "Valid"
    case warning = "Warning"
    case invalid = "Invalid"
    case unknown = "Unknown"
}

struct BoundaryValidationResult {
    let state: BoundaryValidationState
    let isWithinBoundary: Bool
    let coveragePercentage: Double // 0.0 - 1.0 (percentage of work area within property)
    let exceedsBy: Double // Square feet exceeding boundary (0 if within)
    let message: String
    let recommendations: [String]

    var colorIndicator: String {
        switch state {
        case .valid: return "green"
        case .warning: return "orange"
        case .invalid: return "red"
        case .unknown: return "gray"
        }
    }

    var iconName: String {
        switch state {
        case .valid: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .invalid: return "xmark.circle.fill"
        case .unknown: return "questionmark.circle.fill"
        }
    }
}

// MARK: - Geometry Helpers

struct GeometryHelper {
    /// Parse GeoJSON polygon string to array of coordinates
    static func parseGeoJSON(_ geoJSON: String) -> [[CLLocationCoordinate2D]]? {
        guard let data = geoJSON.data(using: .utf8) else { return nil }

        do {
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let coordinates = json["coordinates"] as? [[[[Double]]]] else {
                return nil
            }

            // GeoJSON uses [longitude, latitude] order
            let polygons = coordinates.compactMap { polygon -> [CLLocationCoordinate2D]? in
                let ring = polygon.first
                return ring?.compactMap { coord -> CLLocationCoordinate2D? in
                    guard coord.count >= 2 else { return nil }
                    return CLLocationCoordinate2D(latitude: coord[1], longitude: coord[0])
                }
            }

            return polygons
        } catch {
            print("Failed to parse GeoJSON: \(error)")
            return nil
        }
    }

    /// Calculate area of polygon in square meters
    static func calculateArea(polygon: [CLLocationCoordinate2D]) -> Double {
        guard polygon.count >= 3 else { return 0 }

        var area: Double = 0.0

        for i in 0..<polygon.count {
            let j = (i + 1) % polygon.count
            let coord1 = polygon[i]
            let coord2 = polygon[j]

            // Convert to radians
            let lat1 = coord1.latitude * .pi / 180
            let lon1 = coord1.longitude * .pi / 180
            let lat2 = coord2.latitude * .pi / 180
            let lon2 = coord2.longitude * .pi / 180

            // Spherical excess method
            area += (lon2 - lon1) * (2 + sin(lat1) + sin(lat2))
        }

        // Convert to square meters (Earth radius = 6378137 meters)
        area = abs(area * 6378137.0 * 6378137.0 / 2.0)

        return area
    }

    /// Convert square meters to square feet
    static func squareMetersToSquareFeet(_ sqm: Double) -> Double {
        sqm * 10.7639
    }

    /// Convert square meters to acres
    static func squareMetersToAcres(_ sqm: Double) -> Double {
        sqm * 0.000247105
    }

    /// Check if point is inside polygon
    static func isPointInPolygon(point: CLLocationCoordinate2D, polygon: [CLLocationCoordinate2D]) -> Bool {
        guard polygon.count >= 3 else { return false }

        var inside = false
        var j = polygon.count - 1

        for i in 0..<polygon.count {
            let xi = polygon[i].longitude
            let yi = polygon[i].latitude
            let xj = polygon[j].longitude
            let yj = polygon[j].latitude

            let intersect = ((yi > point.latitude) != (yj > point.latitude)) &&
                           (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi)

            if intersect {
                inside = !inside
            }

            j = i
        }

        return inside
    }

    /// Calculate percentage of work area polygon within property boundary
    static func calculateCoverage(workArea: [CLLocationCoordinate2D], propertyBoundary: [CLLocationCoordinate2D]) -> Double {
        guard workArea.count >= 3, propertyBoundary.count >= 3 else { return 0.0 }

        // Simple approximation: sample points within work area and check how many are in property
        let sampleCount = 100
        var pointsInside = 0

        // Get bounding box of work area
        let minLat = workArea.map { $0.latitude }.min() ?? 0
        let maxLat = workArea.map { $0.latitude }.max() ?? 0
        let minLon = workArea.map { $0.longitude }.min() ?? 0
        let maxLon = workArea.map { $0.longitude }.max() ?? 0

        // Sample grid points
        for _ in 0..<sampleCount {
            let lat = minLat + Double.random(in: 0...1) * (maxLat - minLat)
            let lon = minLon + Double.random(in: 0...1) * (maxLon - minLon)
            let testPoint = CLLocationCoordinate2D(latitude: lat, longitude: lon)

            // Check if point is in both work area and property boundary
            if isPointInPolygon(point: testPoint, polygon: workArea) {
                if isPointInPolygon(point: testPoint, polygon: propertyBoundary) {
                    pointsInside += 1
                }
            }
        }

        return Double(pointsInside) / Double(sampleCount)
    }
}

// MARK: - Boundary Validator Service

@MainActor
class BoundaryValidator: ObservableObject {
    // MARK: - Singleton
    static let shared = BoundaryValidator()

    // MARK: - Published Properties
    @Published var lastValidationResult: BoundaryValidationResult?
    @Published var isValidating = false

    // MARK: - Validation Thresholds
    private let warningThreshold: Double = 0.95 // Warn if work area uses >95% of property
    private let minCoverageThreshold: Double = 0.90 // Warn if <90% of work area is within property

    private init() {}

    // MARK: - Public Validation Methods

    /// Validate work area polygon against property boundary
    func validateWorkArea(
        workArea: [CLLocationCoordinate2D],
        propertyBoundary: PropertyBoundary
    ) -> BoundaryValidationResult {
        isValidating = true
        defer { isValidating = false }

        // Check if property has boundary data
        guard propertyBoundary.hasBoundaryData else {
            let result = BoundaryValidationResult(
                state: .unknown,
                isWithinBoundary: false,
                coveragePercentage: 0.0,
                exceedsBy: 0.0,
                message: "No property boundary data available",
                recommendations: ["Load property boundary data from Regrid to enable validation"]
            )
            lastValidationResult = result
            return result
        }

        // Parse property boundary GeoJSON
        guard let boundaryPolygons = GeometryHelper.parseGeoJSON(propertyBoundary.boundaryGeoJSON),
              let boundaryPolygon = boundaryPolygons.first else {
            let result = BoundaryValidationResult(
                state: .unknown,
                isWithinBoundary: false,
                coveragePercentage: 0.0,
                exceedsBy: 0.0,
                message: "Failed to parse property boundary",
                recommendations: ["Property boundary data may be corrupted", "Try reloading boundary data"]
            )
            lastValidationResult = result
            return result
        }

        // Validate work area has at least 3 points
        guard workArea.count >= 3 else {
            let result = BoundaryValidationResult(
                state: .unknown,
                isWithinBoundary: false,
                coveragePercentage: 0.0,
                exceedsBy: 0.0,
                message: "Work area must have at least 3 points",
                recommendations: ["Draw a complete polygon around the work area"]
            )
            lastValidationResult = result
            return result
        }

        // Calculate coverage (what percentage of work area is within property)
        let coverage = GeometryHelper.calculateCoverage(
            workArea: workArea,
            propertyBoundary: boundaryPolygon
        )

        // Calculate areas
        let workAreaSqM = GeometryHelper.calculateArea(polygon: workArea)
        let workAreaSqFt = GeometryHelper.squareMetersToSquareFeet(workAreaSqM)
        let workAreaAcres = GeometryHelper.squareMetersToAcres(workAreaSqM)

        let propertySqM = GeometryHelper.calculateArea(polygon: boundaryPolygon)
        let propertySqFt = GeometryHelper.squareMetersToSquareFeet(propertySqM)

        // Calculate how much exceeds boundary
        let exceedsSqM = workAreaSqM * (1.0 - coverage)
        let exceedsSqFt = GeometryHelper.squareMetersToSquareFeet(exceedsSqM)

        // Determine validation state
        var state: BoundaryValidationState
        var message: String
        var recommendations: [String] = []
        var isWithinBoundary: Bool

        if coverage >= 1.0 {
            // Perfect - entirely within boundary
            state = .valid
            isWithinBoundary = true
            message = String(format: "Work area (\(String(format: "%.2f", workAreaAcres)) acres) is entirely within property boundary")

            // Check if using most of property
            if workAreaSqFt / propertySqFt > warningThreshold {
                recommendations.append("Work area covers most of the property. Verify with customer.")
            }

        } else if coverage >= minCoverageThreshold {
            // Mostly within - acceptable with warning
            state = .warning
            isWithinBoundary = true
            let percentage = Int(coverage * 100)
            message = "\(percentage)% of work area is within property. \(String(format: "%.0f", exceedsSqFt)) sq ft may be outside boundary."

            recommendations.append("Review boundary with customer")
            recommendations.append("Consider adjusting work area to stay within property lines")
            if exceedsSqFt < 500 {
                recommendations.append("Small overage - likely measurement tolerance")
            }

        } else {
            // Significantly exceeds boundary - invalid
            state = .invalid
            isWithinBoundary = false
            let percentage = Int((1.0 - coverage) * 100)
            message = "\(percentage)% of work area exceeds property boundary! (\(String(format: "%.0f", exceedsSqFt)) sq ft outside)"

            recommendations.append("⚠️ Work area significantly exceeds property boundary")
            recommendations.append("Adjust work area to stay within property lines")
            recommendations.append("Verify property boundary with customer")
            recommendations.append("Check for easements or access rights on adjacent property")
        }

        let result = BoundaryValidationResult(
            state: state,
            isWithinBoundary: isWithinBoundary,
            coveragePercentage: coverage,
            exceedsBy: exceedsSqFt,
            message: message,
            recommendations: recommendations
        )

        lastValidationResult = result
        return result
    }

    /// Quick validation - just check if center point is within boundary
    func quickValidate(
        centerPoint: CLLocationCoordinate2D,
        propertyBoundary: PropertyBoundary
    ) -> Bool {
        guard propertyBoundary.hasBoundaryData,
              let boundaryPolygons = GeometryHelper.parseGeoJSON(propertyBoundary.boundaryGeoJSON),
              let boundaryPolygon = boundaryPolygons.first else {
            return false
        }

        return GeometryHelper.isPointInPolygon(point: centerPoint, polygon: boundaryPolygon)
    }

    /// Validate MKPolygon against property boundary
    func validateMKPolygon(
        polygon: MKPolygon,
        propertyBoundary: PropertyBoundary
    ) -> BoundaryValidationResult {
        // Convert MKPolygon to array of CLLocationCoordinate2D
        let points = polygon.points()
        var coordinates: [CLLocationCoordinate2D] = []

        for i in 0..<polygon.pointCount {
            let mapPoint = points[i]
            let coordinate = MKMapPoint(x: mapPoint.x, y: mapPoint.y).coordinate
            coordinates.append(coordinate)
        }

        return validateWorkArea(workArea: coordinates, propertyBoundary: propertyBoundary)
    }

    /// Clear last validation result
    func clearValidation() {
        lastValidationResult = nil
    }
}
