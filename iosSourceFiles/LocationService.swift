//
//  LocationService.swift
//  TreeShop
//
//  MapKit integration for address autocomplete and drive time calculations
//

import Foundation
import MapKit
import CoreLocation

@MainActor
class LocationService: NSObject, ObservableObject {
    @Published var searchResults: [MKLocalSearchCompletion] = []
    @Published var isSearching = false

    private let searchCompleter = MKLocalSearchCompleter()
    private var currentSearchTask: Task<Void, Never>?

    override init() {
        super.init()
        searchCompleter.delegate = self
        searchCompleter.resultTypes = .address
    }

    // MARK: - Address Search

    func searchAddress(_ query: String) {
        guard !query.isEmpty else {
            searchResults = []
            return
        }

        isSearching = true
        searchCompleter.queryFragment = query
    }

    func clearSearch() {
        searchResults = []
        searchCompleter.queryFragment = ""
        isSearching = false
    }

    // MARK: - Geocoding

    func geocodeAddress(_ addressString: String) async throws -> CLLocationCoordinate2D {
        let geocoder = CLGeocoder()
        let placemarks = try await geocoder.geocodeAddressString(addressString)

        guard let location = placemarks.first?.location else {
            throw LocationServiceError.geocodingFailed
        }

        return location.coordinate
    }

    func geocodeCompletion(_ completion: MKLocalSearchCompletion) async throws -> AddressResult {
        let searchRequest = MKLocalSearch.Request(completion: completion)
        let search = MKLocalSearch(request: searchRequest)
        let response = try await search.start()

        guard let mapItem = response.mapItems.first else {
            throw LocationServiceError.geocodingFailed
        }

        let placemark = mapItem.placemark

        return AddressResult(
            streetAddress: [placemark.subThoroughfare, placemark.thoroughfare]
                .compactMap { $0 }
                .joined(separator: " "),
            city: placemark.locality ?? "",
            state: placemark.administrativeArea ?? "",
            zipCode: placemark.postalCode ?? "",
            coordinate: placemark.coordinate
        )
    }

    // MARK: - Drive Time Calculation

    func calculateDriveTime(
        from origin: CLLocationCoordinate2D,
        to destination: CLLocationCoordinate2D
    ) async throws -> DriveTimeResult {
        let originPlacemark = MKPlacemark(coordinate: origin)
        let destinationPlacemark = MKPlacemark(coordinate: destination)

        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: originPlacemark)
        request.destination = MKMapItem(placemark: destinationPlacemark)
        request.transportType = .automobile

        let directions = MKDirections(request: request)
        let response = try await directions.calculate()

        guard let route = response.routes.first else {
            throw LocationServiceError.routeCalculationFailed
        }

        return DriveTimeResult(
            distanceMiles: route.distance / 1609.34, // meters to miles
            travelTimeHours: route.expectedTravelTime / 3600.0, // seconds to hours
            travelTimeMinutes: route.expectedTravelTime / 60.0 // seconds to minutes
        )
    }

    func calculateDriveTimeFromAddress(
        organizationAddress: String,
        toCoordinate destination: CLLocationCoordinate2D
    ) async throws -> DriveTimeResult {
        let origin = try await geocodeAddress(organizationAddress)
        return try await calculateDriveTime(from: origin, to: destination)
    }
}

// MARK: - MKLocalSearchCompleterDelegate

extension LocationService: MKLocalSearchCompleterDelegate {
    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        Task { @MainActor in
            searchResults = completer.results
            isSearching = false
        }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            print("Address search failed: \(error.localizedDescription)")
            isSearching = false
        }
    }
}

// MARK: - Models

struct AddressResult {
    let streetAddress: String
    let city: String
    let state: String
    let zipCode: String
    let coordinate: CLLocationCoordinate2D
}

struct DriveTimeResult {
    let distanceMiles: Double
    let travelTimeHours: Double
    let travelTimeMinutes: Double

    var formattedDistance: String {
        String(format: "%.1f mi", distanceMiles)
    }

    var formattedTime: String {
        if travelTimeMinutes < 60 {
            return String(format: "%.0f min", travelTimeMinutes)
        } else {
            let hours = Int(travelTimeHours)
            let minutes = Int(travelTimeMinutes) % 60
            return "\(hours)h \(minutes)m"
        }
    }
}

enum LocationServiceError: LocalizedError {
    case geocodingFailed
    case routeCalculationFailed

    var errorDescription: String? {
        switch self {
        case .geocodingFailed:
            return "Could not find location for the provided address"
        case .routeCalculationFailed:
            return "Could not calculate route to destination"
        }
    }
}
