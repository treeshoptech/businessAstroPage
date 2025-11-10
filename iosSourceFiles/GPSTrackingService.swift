//
//  GPSTrackingService.swift
//  TreeShop
//
//  GPS location tracking for time entry verification and job site monitoring
//  Supports foreground/background tracking, geofencing, and offline queueing
//

import Foundation
import CoreLocation
import Combine

/// Location tracking modes for battery optimization
enum LocationTrackingMode {
    case highAccuracy      // For clock-in/out verification (< 10m accuracy)
    case balanced          // For general tracking (< 50m accuracy)
    case significantChanges // For background monitoring (battery efficient)
    case off               // No tracking
}

/// Location authorization status with user-friendly descriptions
enum LocationAuthStatus {
    case authorized
    case denied
    case notDetermined
    case restricted

    var canTrack: Bool {
        self == .authorized
    }

    var userMessage: String {
        switch self {
        case .authorized:
            return "Location services enabled"
        case .denied:
            return "Location access denied. Enable in Settings > TreeShop > Location"
        case .notDetermined:
            return "Location permission not requested"
        case .restricted:
            return "Location services restricted by device policy"
        }
    }
}

/// Stored location for offline queueing
struct QueuedLocation: Codable {
    let latitude: Double
    let longitude: Double
    let accuracy: Double
    let timestamp: Date
    let context: String // "clock_in", "clock_out", "tracking", etc.
}

@MainActor
class GPSTrackingService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var currentLocation: CLLocation?
    @Published var authorizationStatus: LocationAuthStatus = .notDetermined
    @Published var currentAccuracy: CLLocationAccuracy = 0
    @Published var trackingMode: LocationTrackingMode = .off
    @Published var isTracking: Bool = false

    // MARK: - Private Properties

    private let locationManager: CLLocationManager
    private let offlineQueue: LocationOfflineQueue

    // MARK: - Initialization

    override init() {
        self.locationManager = CLLocationManager()
        self.offlineQueue = LocationOfflineQueue()
        super.init()

        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10 // Update every 10 meters
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true

        updateAuthorizationStatus()
    }

    // MARK: - Authorization

    /// Request location permission (starts with "When In Use", can upgrade to "Always")
    func requestAuthorization() {
        locationManager.requestWhenInUseAuthorization()
    }

    /// Request "Always" authorization for background geofencing
    func requestAlwaysAuthorization() {
        locationManager.requestAlwaysAuthorization()
    }

    private func updateAuthorizationStatus() {
        let status = locationManager.authorizationStatus

        switch status {
        case .authorizedAlways, .authorizedWhenInUse:
            authorizationStatus = .authorized
        case .denied:
            authorizationStatus = .denied
        case .notDetermined:
            authorizationStatus = .notDetermined
        case .restricted:
            authorizationStatus = .restricted
        @unknown default:
            authorizationStatus = .notDetermined
        }
    }

    // MARK: - Location Tracking

    /// Start tracking location with specified mode
    func startTracking(mode: LocationTrackingMode) {
        guard authorizationStatus.canTrack else {
            print("GPSTrackingService: Cannot start tracking - authorization required")
            return
        }

        trackingMode = mode

        switch mode {
        case .highAccuracy:
            locationManager.desiredAccuracy = kCLLocationAccuracyBest
            locationManager.distanceFilter = 5
            locationManager.startUpdatingLocation()

        case .balanced:
            locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
            locationManager.distanceFilter = 50
            locationManager.startUpdatingLocation()

        case .significantChanges:
            locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
            locationManager.startMonitoringSignificantLocationChanges()

        case .off:
            stopTracking()
            return
        }

        isTracking = true
        print("GPSTrackingService: Started tracking in \(mode) mode")
    }

    /// Stop all location tracking
    func stopTracking() {
        locationManager.stopUpdatingLocation()
        locationManager.stopMonitoringSignificantLocationChanges()
        isTracking = false
        trackingMode = .off
        print("GPSTrackingService: Stopped tracking")
    }

    // MARK: - Single Location Request

    /// Get current location (one-time request for clock-in/out)
    func getCurrentLocation() async throws -> CLLocation {
        guard authorizationStatus.canTrack else {
            throw LocationError.authorizationDenied
        }

        // Start high accuracy tracking temporarily
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.startUpdatingLocation()

        // Wait for accurate location (< 10m accuracy)
        return try await withTimeout(seconds: 10) {
            try await withCheckedThrowingContinuation { continuation in
                // Use delegate callback to resume continuation
                var resumed = false

                Task { @MainActor in
                    for _ in 0..<20 { // Check 20 times over ~10 seconds
                        if let location = self.currentLocation,
                           location.horizontalAccuracy <= 10,
                           location.timestamp.timeIntervalSinceNow > -5 {
                            if !resumed {
                                resumed = true
                                continuation.resume(returning: location)
                            }
                            return
                        }
                        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                    }

                    if !resumed {
                        resumed = true
                        continuation.resume(throwing: LocationError.accuracyTimeout)
                    }
                }
            }
        }
    }

    // MARK: - Offline Queue Management

    /// Queue location for offline storage (sync later)
    func queueLocation(_ location: CLLocation, context: String) {
        let queuedLocation = QueuedLocation(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            accuracy: location.horizontalAccuracy,
            timestamp: location.timestamp,
            context: context
        )

        offlineQueue.enqueue(queuedLocation)
    }

    /// Get all queued locations
    func getQueuedLocations() -> [QueuedLocation] {
        offlineQueue.getAll()
    }

    /// Clear queued locations (after successful sync)
    func clearQueue() {
        offlineQueue.clear()
    }

    // MARK: - Geofencing

    /// Start monitoring a geofence around coordinates
    func startMonitoringGeofence(
        identifier: String,
        center: CLLocationCoordinate2D,
        radius: CLLocationDistance
    ) {
        guard authorizationStatus.canTrack else {
            print("GPSTrackingService: Cannot monitor geofence - authorization required")
            return
        }

        let region = CLCircularRegion(
            center: center,
            radius: radius,
            identifier: identifier
        )
        region.notifyOnEntry = true
        region.notifyOnExit = true

        locationManager.startMonitoring(for: region)
        print("GPSTrackingService: Started monitoring geofence '\(identifier)' with radius \(radius)m")
    }

    /// Stop monitoring a specific geofence
    func stopMonitoringGeofence(identifier: String) {
        if let region = locationManager.monitoredRegions.first(where: { $0.identifier == identifier }) {
            locationManager.stopMonitoring(for: region)
            print("GPSTrackingService: Stopped monitoring geofence '\(identifier)'")
        }
    }

    /// Stop all geofence monitoring
    func stopAllGeofenceMonitoring() {
        for region in locationManager.monitoredRegions {
            locationManager.stopMonitoring(for: region)
        }
        print("GPSTrackingService: Stopped all geofence monitoring")
    }

    // MARK: - Location Utilities

    /// Calculate distance between two coordinates (in meters)
    func distance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> CLLocationDistance {
        let fromLocation = CLLocation(latitude: from.latitude, longitude: from.longitude)
        let toLocation = CLLocation(latitude: to.latitude, longitude: to.longitude)
        return fromLocation.distance(from: toLocation)
    }

    /// Check if location is within radius of center point
    func isWithin(
        location: CLLocationCoordinate2D,
        center: CLLocationCoordinate2D,
        radius: CLLocationDistance
    ) -> Bool {
        return distance(from: location, to: center) <= radius
    }

    /// Format location for display
    func formatCoordinate(_ coordinate: CLLocationCoordinate2D) -> String {
        return String(format: "%.6f, %.6f", coordinate.latitude, coordinate.longitude)
    }

    /// Format accuracy for display
    func formatAccuracy(_ accuracy: CLLocationAccuracy) -> String {
        if accuracy < 10 {
            return "Excellent (±\(Int(accuracy))m)"
        } else if accuracy < 50 {
            return "Good (±\(Int(accuracy))m)"
        } else if accuracy < 100 {
            return "Fair (±\(Int(accuracy))m)"
        } else {
            return "Poor (±\(Int(accuracy))m)"
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension GPSTrackingService: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            updateAuthorizationStatus()
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            guard let location = locations.last else { return }

            self.currentLocation = location
            self.currentAccuracy = location.horizontalAccuracy

            // Queue for offline sync if needed
            if !NetworkMonitor.shared.isConnected {
                queueLocation(location, context: "background_tracking")
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("GPSTrackingService: Location update failed - \(error.localizedDescription)")
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        print("GPSTrackingService: Entered geofence '\(region.identifier)'")

        // Post notification for geofence entry (GeofenceService will handle)
        Task { @MainActor in
            NotificationCenter.default.post(
                name: .didEnterGeofence,
                object: nil,
                userInfo: ["identifier": region.identifier]
            )
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        print("GPSTrackingService: Exited geofence '\(region.identifier)'")

        // Post notification for geofence exit
        Task { @MainActor in
            NotificationCenter.default.post(
                name: .didExitGeofence,
                object: nil,
                userInfo: ["identifier": region.identifier]
            )
        }
    }
}

// MARK: - Offline Queue

class LocationOfflineQueue {
    private let userDefaultsKey = "com.treeshop.location_queue"

    func enqueue(_ location: QueuedLocation) {
        var queue = getAll()
        queue.append(location)
        save(queue)
    }

    func getAll() -> [QueuedLocation] {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey),
              let locations = try? JSONDecoder().decode([QueuedLocation].self, from: data) else {
            return []
        }
        return locations
    }

    func clear() {
        UserDefaults.standard.removeObject(forKey: userDefaultsKey)
    }

    private func save(_ locations: [QueuedLocation]) {
        if let data = try? JSONEncoder().encode(locations) {
            UserDefaults.standard.set(data, forKey: userDefaultsKey)
        }
    }
}

// MARK: - Errors

enum LocationError: LocalizedError {
    case authorizationDenied
    case accuracyTimeout
    case unavailable

    var errorDescription: String? {
        switch self {
        case .authorizationDenied:
            return "Location access denied. Please enable location services in Settings."
        case .accuracyTimeout:
            return "Could not get accurate location. Try moving to an open area."
        case .unavailable:
            return "Location services unavailable."
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let didEnterGeofence = Notification.Name("didEnterGeofence")
    static let didExitGeofence = Notification.Name("didExitGeofence")
}

// MARK: - Network Monitor (Simple stub)

class NetworkMonitor {
    static let shared = NetworkMonitor()
    var isConnected: Bool = true // TODO: Implement actual network monitoring
}

// MARK: - Timeout Helper

func withTimeout<T>(seconds: TimeInterval, operation: @escaping () async throws -> T) async throws -> T {
    try await withThrowingTaskGroup(of: T.self) { group in
        group.addTask {
            try await operation()
        }

        group.addTask {
            try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            throw LocationError.accuracyTimeout
        }

        let result = try await group.next()!
        group.cancelAll()
        return result
    }
}
