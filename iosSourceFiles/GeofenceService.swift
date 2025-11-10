//
//  GeofenceService.swift
//  TreeShop
//
//  Manages geofences for job sites - auto clock-in/out when entering/leaving
//  Integrates with GPSTrackingService for location monitoring
//

import Foundation
import SwiftData
import CoreLocation
import UserNotifications

/// Geofence event types
enum GeofenceEvent {
    case entered(projectId: UUID, projectName: String)
    case exited(projectId: UUID, projectName: String)
}

@MainActor
class GeofenceService: ObservableObject {
    // MARK: - Published Properties

    @Published var activeGeofences: [UUID: GeofenceConfig] = [:]
    @Published var lastEvent: GeofenceEvent?

    // MARK: - Private Properties

    private let gpsService: GPSTrackingService
    private let modelContext: ModelContext
    private var notificationObservers: [NSObjectProtocol] = []

    // MARK: - Configuration

    struct GeofenceConfig {
        let projectId: UUID
        let projectName: String
        let center: CLLocationCoordinate2D
        let radius: CLLocationDistance // meters
        let autoClockIn: Bool
        let autoClockOut: Bool
    }

    // Default geofence radius (100 meters = ~328 feet)
    nonisolated static let defaultRadius: CLLocationDistance = 100

    // Grace period before auto clock-out (5 minutes)
    nonisolated static let clockOutGracePeriod: TimeInterval = 300

    // MARK: - Initialization

    init(gpsService: GPSTrackingService, modelContext: ModelContext) {
        self.gpsService = gpsService
        self.modelContext = modelContext

        setupNotificationObservers()
    }

    deinit {
        notificationObservers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    // MARK: - Notification Setup

    private func setupNotificationObservers() {
        // Listen for geofence entry
        let entryObserver = NotificationCenter.default.addObserver(
            forName: .didEnterGeofence,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let identifier = notification.userInfo?["identifier"] as? String else { return }
            Task { @MainActor in
                await self?.handleGeofenceEntry(identifier: identifier)
            }
        }
        notificationObservers.append(entryObserver)

        // Listen for geofence exit
        let exitObserver = NotificationCenter.default.addObserver(
            forName: .didExitGeofence,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let identifier = notification.userInfo?["identifier"] as? String else { return }
            Task { @MainActor in
                await self?.handleGeofenceExit(identifier: identifier)
            }
        }
        notificationObservers.append(exitObserver)
    }

    // MARK: - Geofence Management

    /// Create geofence for a project
    func createGeofence(
        for project: Project,
        center: CLLocationCoordinate2D,
        radius: CLLocationDistance = GeofenceService.defaultRadius,
        autoClockIn: Bool = true,
        autoClockOut: Bool = true
    ) {
        let identifier = "project_\(project.id.uuidString)"

        let config = GeofenceConfig(
            projectId: project.id,
            projectName: project.projectName,
            center: center,
            radius: radius,
            autoClockIn: autoClockIn,
            autoClockOut: autoClockOut
        )

        activeGeofences[project.id] = config

        // Start monitoring with GPS service
        gpsService.startMonitoringGeofence(
            identifier: identifier,
            center: center,
            radius: radius
        )

        print("GeofenceService: Created geofence for project '\(project.projectName)' with radius \(radius)m")
    }

    /// Remove geofence for a project
    func removeGeofence(for projectId: UUID) {
        let identifier = "project_\(projectId.uuidString)"

        activeGeofences.removeValue(forKey: projectId)
        gpsService.stopMonitoringGeofence(identifier: identifier)

        print("GeofenceService: Removed geofence for project \(projectId)")
    }

    /// Remove all geofences
    func removeAllGeofences() {
        activeGeofences.keys.forEach { removeGeofence(for: $0) }
        print("GeofenceService: Removed all geofences")
    }

    /// Check if project has an active geofence
    func hasGeofence(for projectId: UUID) -> Bool {
        activeGeofences[projectId] != nil
    }

    // MARK: - Geofence Events

    private func handleGeofenceEntry(identifier: String) async {
        // Parse project ID from identifier
        guard let projectId = parseProjectId(from: identifier),
              let config = activeGeofences[projectId] else {
            return
        }

        print("GeofenceService: Entered geofence for project '\(config.projectName)'")

        lastEvent = .entered(projectId: projectId, projectName: config.projectName)

        // Auto clock-in if enabled
        if config.autoClockIn {
            await promptAutoClockIn(projectId: projectId, projectName: config.projectName)
        }

        // Send notification
        await sendNotification(
            title: "Arrived at Job Site",
            body: "You're at \(config.projectName). Tap to clock in.",
            projectId: projectId
        )
    }

    private func handleGeofenceExit(identifier: String) async {
        // Parse project ID from identifier
        guard let projectId = parseProjectId(from: identifier),
              let config = activeGeofences[projectId] else {
            return
        }

        print("GeofenceService: Exited geofence for project '\(config.projectName)'")

        lastEvent = .exited(projectId: projectId, projectName: config.projectName)

        // Check if timer is running for this project
        if await hasActiveTimer(for: projectId) {
            if config.autoClockOut {
                // Schedule auto clock-out after grace period
                Task {
                    try await Task.sleep(nanoseconds: UInt64(Self.clockOutGracePeriod * 1_000_000_000))

                    // Check again if still outside geofence
                    if !(await isInsideGeofence(projectId: projectId)) {
                        await promptAutoClockOut(projectId: projectId, projectName: config.projectName)
                    }
                }
            }

            // Send notification
            await sendNotification(
                title: "Left Job Site",
                body: "You left \(config.projectName). Timer is still running.",
                projectId: projectId
            )
        }
    }

    // MARK: - Auto Clock-In/Out

    private func promptAutoClockIn(projectId: UUID, projectName: String) async {
        await sendNotification(
            title: "Clock In?",
            body: "You're at \(projectName). Tap to start timer.",
            projectId: projectId,
            categoryIdentifier: "CLOCK_IN"
        )
    }

    private func promptAutoClockOut(projectId: UUID, projectName: String) async {
        await sendNotification(
            title: "Clock Out?",
            body: "You left \(projectName) 5 minutes ago. Timer still running.",
            projectId: projectId,
            categoryIdentifier: "CLOCK_OUT"
        )
    }

    // MARK: - Helper Methods

    private func parseProjectId(from identifier: String) -> UUID? {
        // identifier format: "project_UUID"
        let components = identifier.components(separatedBy: "_")
        guard components.count == 2,
              let uuid = UUID(uuidString: components[1]) else {
            return nil
        }
        return uuid
    }

    private func hasActiveTimer(for projectId: UUID) async -> Bool {
        let descriptor = FetchDescriptor<TimeEntry>(
            predicate: #Predicate<TimeEntry> { entry in
                entry.project?.id == projectId && entry.endTime == nil
            }
        )

        do {
            let activeEntries = try modelContext.fetch(descriptor)
            return !activeEntries.isEmpty
        } catch {
            print("GeofenceService: Error checking for active timer - \(error)")
            return false
        }
    }

    private func isInsideGeofence(projectId: UUID) async -> Bool {
        guard let config = activeGeofences[projectId],
              let currentLocation = gpsService.currentLocation else {
            return false
        }

        let distance = gpsService.distance(
            from: currentLocation.coordinate,
            to: config.center
        )

        return distance <= config.radius
    }

    // MARK: - Notifications

    private func sendNotification(
        title: String,
        body: String,
        projectId: UUID,
        categoryIdentifier: String? = nil
    ) async {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = ["projectId": projectId.uuidString]

        if let category = categoryIdentifier {
            content.categoryIdentifier = category
        }

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil // Deliver immediately
        )

        do {
            try await UNUserNotificationCenter.current().add(request)
        } catch {
            print("GeofenceService: Failed to send notification - \(error)")
        }
    }

    // MARK: - Distance Checking

    /// Check distance from current location to project
    func distanceToProject(projectId: UUID) -> CLLocationDistance? {
        guard let config = activeGeofences[projectId],
              let currentLocation = gpsService.currentLocation else {
            return nil
        }

        return gpsService.distance(
            from: currentLocation.coordinate,
            to: config.center
        )
    }

    /// Check if currently inside project geofence
    func isInsideProject(projectId: UUID) -> Bool {
        guard let config = activeGeofences[projectId],
              let currentLocation = gpsService.currentLocation else {
            return false
        }

        return gpsService.isWithin(
            location: currentLocation.coordinate,
            center: config.center,
            radius: config.radius
        )
    }

    /// Format distance for display
    func formatDistance(_ distance: CLLocationDistance) -> String {
        if distance < 1000 {
            return "\(Int(distance))m"
        } else {
            let miles = distance / 1609.34
            return String(format: "%.1f mi", miles)
        }
    }
}

// MARK: - Notification Categories

extension GeofenceService {
    /// Setup notification categories with actions
    static func setupNotificationCategories() async {
        let clockInAction = UNNotificationAction(
            identifier: "CLOCK_IN_ACTION",
            title: "Clock In",
            options: [.foreground]
        )

        let clockOutAction = UNNotificationAction(
            identifier: "CLOCK_OUT_ACTION",
            title: "Clock Out",
            options: [.foreground]
        )

        let clockInCategory = UNNotificationCategory(
            identifier: "CLOCK_IN",
            actions: [clockInAction],
            intentIdentifiers: []
        )

        let clockOutCategory = UNNotificationCategory(
            identifier: "CLOCK_OUT",
            actions: [clockOutAction],
            intentIdentifiers: []
        )

        let center = UNUserNotificationCenter.current()
        center.setNotificationCategories([clockInCategory, clockOutCategory])

        // Request notification permission
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            print("GeofenceService: Notification permission granted: \(granted)")
        } catch {
            print("GeofenceService: Failed to request notification permission - \(error)")
        }
    }
}
