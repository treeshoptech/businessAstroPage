//
//  RegridService.swift
//  TreeShop
//
//  Regrid API integration for official county parcel data
//  Handles address search, parcel fetching, and GeoJSON parsing
//

import Foundation
import CoreLocation
import MapKit

// MARK: - Error Types

enum RegridError: LocalizedError {
    case noAPIKey
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case noData
    case decodingError(Error)
    case notFound
    case rateLimitExceeded
    case unauthorized
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .noAPIKey:
            return "Regrid API key not configured"
        case .invalidURL:
            return "Invalid API endpoint URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from Regrid API"
        case .noData:
            return "No data received from Regrid API"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .notFound:
            return "Property not found in Regrid database"
        case .rateLimitExceeded:
            return "API rate limit exceeded. Please try again later."
        case .unauthorized:
            return "Invalid API key or unauthorized access"
        case .serverError(let code):
            return "Regrid server error (HTTP \(code))"
        }
    }
}

// MARK: - Response Models

struct RegridParcelResponse: Codable {
    let type: String?
    let features: [RegridParcelFeature]?
}

struct RegridParcelFeature: Codable {
    let type: String?
    let geometry: RegridGeometry?
    let properties: RegridProperties?
}

struct RegridGeometry: Codable {
    let type: String? // "Polygon", "MultiPolygon"
    let coordinates: [[[[Double]]]]? // GeoJSON polygon coordinates
}

struct RegridProperties: Codable {
    // Core identification
    let ll_uuid: String?
    let path: String?
    let headline: String?
    let fields: RegridFields?
}

struct RegridFields: Codable {
    // Address
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let county: String?

    // Parcel identification
    let apn: String?
    let ll_gisacre: Double?
    let ll_gissqft: Double?

    // Owner
    let owner: String?
    let owner2: String?
    let owner_type: String?
    let mail_address: String?
    let mail_city: String?
    let mail_state: String?
    let mail_zip: String?

    // Assessment
    let assessed_value: Double?
    let land_value: Double?
    let improvement_value: Double?
    let market_value: Double?
    let tax_amount: Double?
    let assessment_year: Int?

    // Zoning
    let zoning: String?
    let zoning_description: String?
    let land_use: String?
    let land_use_description: String?

    // Sale
    let sale_date: String?
    let sale_price: Double?
    let deed_type: String?

    // Building
    let year_built: Int?
    let building_sqft: Double?
    let stories: Int?
    let bedrooms: Int?
    let bathrooms: Double?

    // Utilities
    let water: String?
    let sewer: String?

    // Environmental
    let flood_zone: String?
    let elevation: Double?
}

// MARK: - Regrid Service

@MainActor
class RegridService: ObservableObject {
    // MARK: - Properties

    @Published var isLoading = false
    @Published var lastError: RegridError?

    private let baseURL = "https://app.regrid.com/api/v1"
    private var apiKey: String {
        // Get API key from RegridConfig
        RegridConfig.shared.apiKey
    }

    // MARK: - Singleton
    static let shared = RegridService()

    private init() {}

    // MARK: - Public API Methods

    /// Search for property by address
    func searchProperty(address: String) async throws -> PropertyBoundary {
        guard !apiKey.isEmpty else {
            throw RegridError.noAPIKey
        }

        isLoading = true
        defer { isLoading = false }

        // First geocode the address to get coordinates
        let coordinates = try await geocodeAddress(address)

        // Then fetch parcel data at those coordinates
        return try await fetchParcel(at: coordinates)
    }

    /// Fetch parcel data by coordinates
    func fetchParcel(at coordinate: CLLocationCoordinate2D) async throws -> PropertyBoundary {
        guard !apiKey.isEmpty else {
            throw RegridError.noAPIKey
        }

        isLoading = true
        defer { isLoading = false }

        // Build Regrid API request for parcel at coordinates
        let urlString = "\(baseURL)/parcels.geojson?token=\(apiKey)&lat=\(coordinate.latitude)&lon=\(coordinate.longitude)&limit=1"

        guard let url = URL(string: urlString) else {
            throw RegridError.invalidURL
        }

        // Make API request
        let (data, response) = try await URLSession.shared.data(from: url)

        // Check response status
        guard let httpResponse = response as? HTTPURLResponse else {
            throw RegridError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200:
            break // Success
        case 401:
            throw RegridError.unauthorized
        case 404:
            throw RegridError.notFound
        case 429:
            throw RegridError.rateLimitExceeded
        case 500...599:
            throw RegridError.serverError(httpResponse.statusCode)
        default:
            throw RegridError.invalidResponse
        }

        // Decode response
        let decoder = JSONDecoder()
        let parcelResponse: RegridParcelResponse
        do {
            parcelResponse = try decoder.decode(RegridParcelResponse.self, from: data)
        } catch {
            throw RegridError.decodingError(error)
        }

        // Extract first feature
        guard let feature = parcelResponse.features?.first else {
            throw RegridError.notFound
        }

        // Convert to PropertyBoundary
        let propertyBoundary = try mapToPropertyBoundary(feature: feature, searchCoordinate: coordinate)

        return propertyBoundary
    }

    /// Fetch parcel data by APN (Assessor's Parcel Number)
    func fetchParcel(byAPN apn: String, state: String) async throws -> PropertyBoundary {
        guard !apiKey.isEmpty else {
            throw RegridError.noAPIKey
        }

        isLoading = true
        defer { isLoading = false }

        // Build Regrid API request for parcel by APN
        let encodedAPN = apn.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? apn
        let urlString = "\(baseURL)/parcels.geojson?token=\(apiKey)&state=\(state)&apn=\(encodedAPN)&limit=1"

        guard let url = URL(string: urlString) else {
            throw RegridError.invalidURL
        }

        // Make API request
        let (data, response) = try await URLSession.shared.data(from: url)

        // Check response status
        guard let httpResponse = response as? HTTPURLResponse else {
            throw RegridError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200:
            break
        case 401:
            throw RegridError.unauthorized
        case 404:
            throw RegridError.notFound
        case 429:
            throw RegridError.rateLimitExceeded
        case 500...599:
            throw RegridError.serverError(httpResponse.statusCode)
        default:
            throw RegridError.invalidResponse
        }

        // Decode response
        let decoder = JSONDecoder()
        let parcelResponse: RegridParcelResponse
        do {
            parcelResponse = try decoder.decode(RegridParcelResponse.self, from: data)
        } catch {
            throw RegridError.decodingError(error)
        }

        // Extract first feature
        guard let feature = parcelResponse.features?.first else {
            throw RegridError.notFound
        }

        // Convert to PropertyBoundary
        let propertyBoundary = try mapToPropertyBoundary(feature: feature, searchCoordinate: nil)

        return propertyBoundary
    }

    // MARK: - Private Helper Methods

    /// Geocode address to coordinates using Apple's MapKit
    private func geocodeAddress(_ address: String) async throws -> CLLocationCoordinate2D {
        let geocoder = CLGeocoder()

        do {
            let placemarks = try await geocoder.geocodeAddressString(address)
            guard let location = placemarks.first?.location else {
                throw RegridError.notFound
            }
            return location.coordinate
        } catch {
            throw RegridError.networkError(error)
        }
    }

    /// Map Regrid API response to PropertyBoundary model
    private func mapToPropertyBoundary(
        feature: RegridParcelFeature,
        searchCoordinate: CLLocationCoordinate2D?
    ) throws -> PropertyBoundary {
        let boundary = PropertyBoundary()

        // Extract properties
        guard let properties = feature.properties,
              let fields = properties.fields else {
            throw RegridError.noData
        }

        // Core identification
        boundary.regridParcelID = properties.ll_uuid ?? ""
        boundary.fullAddress = properties.headline ?? ""

        // Address components
        boundary.streetAddress = fields.address ?? ""
        boundary.city = fields.city ?? ""
        boundary.state = fields.state ?? ""
        boundary.zipCode = fields.zip ?? ""
        boundary.county = fields.county ?? ""

        // Parcel identification
        boundary.apn = fields.apn ?? ""
        boundary.parcelID = fields.apn ?? ""

        // Size
        boundary.lotSizeAcres = fields.ll_gisacre ?? 0.0
        boundary.lotSizeSquareFeet = fields.ll_gissqft ?? 0.0
        boundary.boundaryArea = fields.ll_gissqft ?? 0.0

        // Geographic coordinates
        if let searchCoord = searchCoordinate {
            boundary.latitude = searchCoord.latitude
            boundary.longitude = searchCoord.longitude
        }

        // Parse geometry for boundary polygon
        if let geometry = feature.geometry {
            boundary.boundaryGeoJSON = try encodeGeoJSON(geometry: geometry)

            // Calculate centroid from polygon
            if let centroid = calculateCentroid(from: geometry) {
                boundary.centroidLatitude = centroid.latitude
                boundary.centroidLongitude = centroid.longitude

                // Use centroid as primary coordinates if not from search
                if searchCoordinate == nil {
                    boundary.latitude = centroid.latitude
                    boundary.longitude = centroid.longitude
                }
            }
        }

        // Assessment and value
        boundary.assessedValue = fields.assessed_value ?? 0.0
        boundary.landValue = fields.land_value ?? 0.0
        boundary.improvementValue = fields.improvement_value ?? 0.0
        boundary.marketValue = fields.market_value ?? 0.0
        boundary.taxAmount = fields.tax_amount ?? 0.0
        boundary.assessmentYear = fields.assessment_year ?? 0

        // Zoning
        boundary.zoningCode = fields.zoning ?? ""
        boundary.zoningDescription = fields.zoning_description ?? ""
        boundary.landUseCode = fields.land_use ?? ""
        boundary.landUseDescription = fields.land_use_description ?? ""

        // Owner
        boundary.ownerName = fields.owner ?? ""
        boundary.ownerName2 = fields.owner2 ?? ""
        boundary.ownerType = fields.owner_type ?? ""
        boundary.mailingAddress = fields.mail_address ?? ""
        boundary.mailingCity = fields.mail_city ?? ""
        boundary.mailingState = fields.mail_state ?? ""
        boundary.mailingZipCode = fields.mail_zip ?? ""

        // Determine absentee status
        let propertyAddress = "\(boundary.streetAddress), \(boundary.city), \(boundary.state)"
        let mailingAddress = "\(boundary.mailingAddress), \(boundary.mailingCity), \(boundary.mailingState)"
        boundary.isAbsenteeOwner = !mailingAddress.isEmpty && propertyAddress != mailingAddress

        // Sale
        if let saleDateString = fields.sale_date, !saleDateString.isEmpty {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            boundary.lastSaleDate = formatter.date(from: saleDateString)
        }
        boundary.lastSalePrice = fields.sale_price ?? 0.0
        boundary.deedType = fields.deed_type ?? ""

        // Building
        boundary.yearBuilt = fields.year_built ?? 0
        boundary.totalBuildingArea = fields.building_sqft ?? 0.0
        boundary.stories = fields.stories ?? 0
        boundary.bedrooms = fields.bedrooms ?? 0
        boundary.bathrooms = Int(fields.bathrooms ?? 0)

        // Utilities
        boundary.waterSource = fields.water ?? ""
        boundary.sewerType = fields.sewer ?? ""

        // Environmental
        boundary.floodZone = fields.flood_zone ?? ""
        boundary.isInFloodplain = !(fields.flood_zone ?? "").isEmpty && fields.flood_zone != "X"
        boundary.elevationFeet = fields.elevation ?? 0.0

        // Metadata
        boundary.dataSource = "Regrid"
        boundary.dataLoadDate = Date()
        boundary.regridAPIVersion = "v1"

        // Calculate data quality
        boundary.validateDataQuality()

        return boundary
    }

    /// Encode GeoJSON geometry to string
    private func encodeGeoJSON(geometry: RegridGeometry) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted

        do {
            let data = try encoder.encode(geometry)
            return String(data: data, encoding: .utf8) ?? ""
        } catch {
            throw RegridError.decodingError(error)
        }
    }

    /// Calculate centroid (center point) from polygon geometry
    private func calculateCentroid(from geometry: RegridGeometry) -> CLLocationCoordinate2D? {
        guard let coordinates = geometry.coordinates?.first?.first else {
            return nil
        }

        var sumLat: Double = 0
        var sumLon: Double = 0
        var count = 0

        for coord in coordinates {
            if coord.count >= 2 {
                sumLon += coord[0] // Longitude is first in GeoJSON
                sumLat += coord[1] // Latitude is second
                count += 1
            }
        }

        guard count > 0 else { return nil }

        return CLLocationCoordinate2D(
            latitude: sumLat / Double(count),
            longitude: sumLon / Double(count)
        )
    }

    // MARK: - Validation

    /// Check if API is configured and accessible
    func validateAPIAccess() async -> Bool {
        guard !apiKey.isEmpty else {
            lastError = .noAPIKey
            return false
        }

        // Try a simple test request
        let testCoordinate = CLLocationCoordinate2D(latitude: 29.0219, longitude: -80.9270) // New Smyrna Beach

        do {
            _ = try await fetchParcel(at: testCoordinate)
            lastError = nil
            return true
        } catch let error as RegridError {
            lastError = error
            return false
        } catch {
            lastError = .networkError(error)
            return false
        }
    }
}
