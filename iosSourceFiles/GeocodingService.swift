//
//  GeocodingService.swift
//  TreeShop
//
//  Address search, autocomplete, and reverse geocoding using Apple Maps
//

import Foundation
import MapKit
import CoreLocation

/// Service for address search, autocomplete, and geocoding
class GeocodingService: NSObject, ObservableObject {

    // MARK: - Models

    /// Search result with location details
    struct SearchResult: Identifiable {
        let id = UUID()
        let mapItem: MKMapItem
        let coordinate: CLLocationCoordinate2D
        let title: String
        let subtitle: String
        let address: AddressComponents

        var fullAddress: String {
            var parts: [String] = []
            if !address.street.isEmpty { parts.append(address.street) }
            if !address.city.isEmpty { parts.append(address.city) }
            if !address.state.isEmpty { parts.append(address.state) }
            if !address.zip.isEmpty { parts.append(address.zip) }
            return parts.joined(separator: ", ")
        }
    }

    /// Structured address components
    struct AddressComponents {
        let street: String
        let city: String
        let state: String
        let zip: String
        let country: String

        init(from placemark: CLPlacemark) {
            // Street number + street name
            var streetComponents: [String] = []
            if let number = placemark.subThoroughfare {
                streetComponents.append(number)
            }
            if let street = placemark.thoroughfare {
                streetComponents.append(street)
            }
            self.street = streetComponents.joined(separator: " ")

            self.city = placemark.locality ?? ""
            self.state = placemark.administrativeArea ?? ""
            self.zip = placemark.postalCode ?? ""
            self.country = placemark.country ?? ""
        }

        init(street: String = "", city: String = "", state: String = "", zip: String = "", country: String = "") {
            self.street = street
            self.city = city
            self.state = state
            self.zip = zip
            self.country = country
        }
    }

    /// Autocomplete suggestion
    struct Suggestion: Identifiable {
        let id = UUID()
        let title: String
        let subtitle: String
        let completion: MKLocalSearchCompletion
    }

    // MARK: - Properties

    @Published var suggestions: [Suggestion] = []
    @Published var isSearching = false

    private let searchCompleter = MKLocalSearchCompleter()
    private var currentSearchTask: Task<Void, Never>?

    // MARK: - Initialization

    override init() {
        super.init()
        searchCompleter.delegate = self
        searchCompleter.resultTypes = .address
    }

    // MARK: - Address Search

    /// Search for addresses matching a query
    /// - Parameters:
    ///   - query: Search string (e.g., "123 Main St, Orlando, FL")
    ///   - region: Optional region to bias search results
    /// - Returns: Array of search results
    static func searchAddress(
        query: String,
        in region: MKCoordinateRegion? = nil
    ) async throws -> [SearchResult] {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.resultTypes = .address

        if let region = region {
            request.region = region
        }

        let search = MKLocalSearch(request: request)
        let response = try await search.start()

        return response.mapItems.compactMap { mapItem in
            guard let placemark = mapItem.placemark.location?.coordinate else { return nil }

            return SearchResult(
                mapItem: mapItem,
                coordinate: placemark,
                title: mapItem.name ?? "",
                subtitle: mapItem.placemark.title ?? "",
                address: AddressComponents(from: mapItem.placemark)
            )
        }
    }

    /// Search for a specific address and return the best match
    /// - Parameters:
    ///   - address: Full address string
    ///   - region: Optional region to bias search
    /// - Returns: Best matching result, or nil
    static func geocodeAddress(
        _ address: String,
        in region: MKCoordinateRegion? = nil
    ) async throws -> SearchResult? {
        let results = try await searchAddress(query: address, in: region)
        return results.first
    }

    // MARK: - Reverse Geocoding

    /// Convert coordinates to an address
    /// - Parameter coordinate: Location to reverse geocode
    /// - Returns: Address components
    static func reverseGeocode(
        coordinate: CLLocationCoordinate2D
    ) async throws -> AddressComponents {
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let geocoder = CLGeocoder()

        let placemarks = try await geocoder.reverseGeocodeLocation(location)

        guard let placemark = placemarks.first else {
            throw GeocodingError.noResults
        }

        return AddressComponents(from: placemark)
    }

    /// Get formatted address string from coordinates
    /// - Parameter coordinate: Location
    /// - Returns: Formatted address string
    static func getAddressString(
        from coordinate: CLLocationCoordinate2D
    ) async throws -> String {
        let components = try await reverseGeocode(coordinate: coordinate)

        var parts: [String] = []
        if !components.street.isEmpty { parts.append(components.street) }
        if !components.city.isEmpty { parts.append(components.city) }
        if !components.state.isEmpty { parts.append(components.state) }
        if !components.zip.isEmpty { parts.append(components.zip) }

        return parts.joined(separator: ", ")
    }

    // MARK: - Autocomplete

    /// Update autocomplete suggestions based on query
    /// - Parameter query: Partial address string
    func updateSuggestions(for query: String) {
        // Cancel previous search
        currentSearchTask?.cancel()

        guard !query.isEmpty else {
            suggestions = []
            return
        }

        isSearching = true
        searchCompleter.queryFragment = query
    }

    /// Clear autocomplete suggestions
    func clearSuggestions() {
        suggestions = []
        searchCompleter.queryFragment = ""
        isSearching = false
    }

    /// Convert a suggestion to a full search result
    /// - Parameter suggestion: Autocomplete suggestion
    /// - Returns: Full search result with coordinates
    func resolveSelection(_ suggestion: Suggestion) async throws -> SearchResult? {
        let searchRequest = MKLocalSearch.Request(completion: suggestion.completion)
        let search = MKLocalSearch(request: searchRequest)
        let response = try await search.start()

        guard let mapItem = response.mapItems.first,
              let coordinate = mapItem.placemark.location?.coordinate else {
            return nil
        }

        return SearchResult(
            mapItem: mapItem,
            coordinate: coordinate,
            title: mapItem.name ?? suggestion.title,
            subtitle: mapItem.placemark.title ?? suggestion.subtitle,
            address: AddressComponents(from: mapItem.placemark)
        )
    }

    // MARK: - Nearby Search

    /// Search for nearby points of interest
    /// - Parameters:
    ///   - query: Search term (e.g., "hardware store", "dump site")
    ///   - coordinate: Center point for search
    ///   - radiusMiles: Search radius in miles (default: 25)
    /// - Returns: Array of search results
    static func searchNearby(
        query: String,
        near coordinate: CLLocationCoordinate2D,
        radiusMiles: Double = 25
    ) async throws -> [SearchResult] {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query

        // Create region for search
        let radiusMeters = radiusMiles * 1609.34
        let region = MKCoordinateRegion(
            center: coordinate,
            latitudinalMeters: radiusMeters * 2,
            longitudinalMeters: radiusMeters * 2
        )
        request.region = region

        let search = MKLocalSearch(request: request)
        let response = try await search.start()

        return response.mapItems.compactMap { mapItem in
            guard let placemark = mapItem.placemark.location?.coordinate else { return nil }

            return SearchResult(
                mapItem: mapItem,
                coordinate: placemark,
                title: mapItem.name ?? "",
                subtitle: mapItem.placemark.title ?? "",
                address: AddressComponents(from: mapItem.placemark)
            )
        }
    }

    // MARK: - Validation

    /// Validate that an address has valid coordinates
    /// - Parameter address: Address string to validate
    /// - Returns: True if address can be geocoded
    static func validateAddress(_ address: String) async -> Bool {
        do {
            let result = try await geocodeAddress(address)
            return result != nil
        } catch {
            return false
        }
    }

    /// Check if coordinates are within a reasonable distance of an address
    /// - Parameters:
    ///   - coordinate: GPS coordinate to check
    ///   - address: Address string
    ///   - maxDistanceMiles: Maximum acceptable distance (default: 0.5 miles)
    /// - Returns: True if coordinate matches address within tolerance
    static func verifyCoordinate(
        _ coordinate: CLLocationCoordinate2D,
        matchesAddress address: String,
        maxDistanceMiles: Double = 0.5
    ) async -> Bool {
        do {
            guard let result = try await geocodeAddress(address) else { return false }

            let location1 = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
            let location2 = CLLocation(latitude: result.coordinate.latitude, longitude: result.coordinate.longitude)

            let distanceMeters = location1.distance(from: location2)
            let distanceMiles = distanceMeters / 1609.34

            return distanceMiles <= maxDistanceMiles
        } catch {
            return false
        }
    }
}

// MARK: - MKLocalSearchCompleterDelegate

extension GeocodingService: MKLocalSearchCompleterDelegate {
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        DispatchQueue.main.async { [weak self] in
            self?.suggestions = completer.results.map { completion in
                Suggestion(
                    title: completion.title,
                    subtitle: completion.subtitle,
                    completion: completion
                )
            }
            self?.isSearching = false
        }
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            print("Autocomplete error: \(error.localizedDescription)")
            self?.suggestions = []
            self?.isSearching = false
        }
    }
}

// MARK: - Errors

enum GeocodingError: LocalizedError {
    case noResults
    case invalidAddress
    case searchFailed(Error)

    var errorDescription: String? {
        switch self {
        case .noResults:
            return "No results found for that address"
        case .invalidAddress:
            return "Invalid address format"
        case .searchFailed(let error):
            return "Search failed: \(error.localizedDescription)"
        }
    }
}
