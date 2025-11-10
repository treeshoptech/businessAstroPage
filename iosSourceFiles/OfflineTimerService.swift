//
//  OfflineTimerService.swift
//  TreeShop
//
//  Offline time entry queue and synchronization service
//  Enables crew to clock in/out without internet, syncs when connection returns
//

import Foundation
import SwiftData
import Combine

/// Offline time entry action types
enum OfflineTimerAction: String, Codable {
    case clockIn = "clock_in"
    case clockOut = "clock_out"
    case addPhoto = "add_photo"
    case updateEntry = "update_entry"
    case deleteEntry = "delete_entry"
}

/// Queued offline action
struct QueuedTimerAction: Codable, Identifiable {
    let id: String
    let action: OfflineTimerAction
    let timeEntryId: UUID
    let timestamp: Date
    let data: String // JSON-encoded action data
    var syncAttempts: Int
    var lastSyncAttempt: Date?
    var syncError: String?

    init(
        id: String = UUID().uuidString,
        action: OfflineTimerAction,
        timeEntryId: UUID,
        timestamp: Date = Date(),
        data: String,
        syncAttempts: Int = 0,
        lastSyncAttempt: Date? = nil,
        syncError: String? = nil
    ) {
        self.id = id
        self.action = action
        self.timeEntryId = timeEntryId
        self.timestamp = timestamp
        self.data = data
        self.syncAttempts = syncAttempts
        self.lastSyncAttempt = lastSyncAttempt
        self.syncError = syncError
    }
}

/// Clock-in action data
struct ClockInData: Codable {
    let projectId: UUID
    let category: String // TimeCategory rawValue
    let taskDescription: String
    let proposalLineItemId: UUID?
    let latitude: Double?
    let longitude: Double?
    let accuracy: Double?
}

/// Clock-out action data
struct ClockOutData: Codable {
    let endTime: Date
    let latitude: Double?
    let longitude: Double?
    let accuracy: Double?
    let notes: String?
}

/// Photo action data
struct AddPhotoData: Codable {
    let photoId: String
    let caption: String?
}

@MainActor
class OfflineTimerService: ObservableObject {
    // MARK: - Published Properties

    @Published var isOnline = true
    @Published var queuedActionsCount = 0
    @Published var isSyncing = false
    @Published var lastSyncTime: Date?
    @Published var syncErrors: [String] = []

    // MARK: - Private Properties

    private let modelContext: ModelContext
    private let userDefaultsKey = "com.treeshop.offline_timer_queue"
    private let maxSyncAttempts = 3
    private let syncRetryDelay: TimeInterval = 30 // seconds

    private var networkMonitor: NetworkMonitor
    private var syncTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
        self.networkMonitor = NetworkMonitor.shared

        // Load queued actions count
        self.queuedActionsCount = loadQueue().count

        // Monitor network status
        setupNetworkMonitoring()
    }

    deinit {
        syncTimer?.invalidate()
        cancellables.removeAll()
    }

    // MARK: - Network Monitoring

    private func setupNetworkMonitoring() {
        // Check network status periodically
        syncTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.checkNetworkAndSync()
            }
        }

        // Initial check
        Task {
            await checkNetworkAndSync()
        }
    }

    private func checkNetworkAndSync() async {
        let wasOnline = isOnline
        isOnline = networkMonitor.isConnected

        // If just came online, trigger sync
        if !wasOnline && isOnline && queuedActionsCount > 0 {
            print("OfflineTimerService: Network restored, starting sync")
            await syncQueuedActions()
        }
    }

    // MARK: - Queue Management

    /// Load all queued actions from UserDefaults
    private func loadQueue() -> [QueuedTimerAction] {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey),
              let actions = try? JSONDecoder().decode([QueuedTimerAction].self, from: data) else {
            return []
        }
        return actions
    }

    /// Save queue to UserDefaults
    private func saveQueue(_ actions: [QueuedTimerAction]) {
        if let data = try? JSONEncoder().encode(actions) {
            UserDefaults.standard.set(data, forKey: userDefaultsKey)
            queuedActionsCount = actions.count
        }
    }

    /// Add action to queue
    private func enqueue(_ action: QueuedTimerAction) {
        var queue = loadQueue()
        queue.append(action)
        saveQueue(queue)
        print("OfflineTimerService: Queued \(action.action.rawValue) action (queue size: \(queue.count))")
    }

    /// Remove action from queue
    private func dequeue(id: String) {
        var queue = loadQueue()
        queue.removeAll { $0.id == id }
        saveQueue(queue)
    }

    /// Update action in queue
    private func updateQueuedAction(_ action: QueuedTimerAction) {
        var queue = loadQueue()
        if let index = queue.firstIndex(where: { $0.id == action.id }) {
            queue[index] = action
            saveQueue(queue)
        }
    }

    /// Clear entire queue
    func clearQueue() {
        saveQueue([])
        syncErrors.removeAll()
        print("OfflineTimerService: Queue cleared")
    }

    // MARK: - Offline Actions

    /// Queue a clock-in action
    func queueClockIn(
        timeEntry: TimeEntry,
        project: Project,
        lineItem: ProposalLineItem?,
        latitude: Double?,
        longitude: Double?,
        accuracy: Double?
    ) {
        let clockInData = ClockInData(
            projectId: project.id,
            category: timeEntry.category.rawValue,
            taskDescription: timeEntry.taskDescription,
            proposalLineItemId: lineItem?.id,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy
        )

        guard let dataJson = try? JSONEncoder().encode(clockInData),
              let dataString = String(data: dataJson, encoding: .utf8) else {
            print("OfflineTimerService: Failed to encode clock-in data")
            return
        }

        let action = QueuedTimerAction(
            action: .clockIn,
            timeEntryId: timeEntry.id,
            data: dataString
        )

        enqueue(action)
    }

    /// Queue a clock-out action
    func queueClockOut(
        timeEntry: TimeEntry,
        latitude: Double?,
        longitude: Double?,
        accuracy: Double?,
        notes: String?
    ) {
        let clockOutData = ClockOutData(
            endTime: Date(),
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            notes: notes
        )

        guard let dataJson = try? JSONEncoder().encode(clockOutData),
              let dataString = String(data: dataJson, encoding: .utf8) else {
            print("OfflineTimerService: Failed to encode clock-out data")
            return
        }

        let action = QueuedTimerAction(
            action: .clockOut,
            timeEntryId: timeEntry.id,
            data: dataString
        )

        enqueue(action)
    }

    /// Queue an add photo action
    func queueAddPhoto(timeEntryId: UUID, photoId: String, caption: String?) {
        let photoData = AddPhotoData(photoId: photoId, caption: caption)

        guard let dataJson = try? JSONEncoder().encode(photoData),
              let dataString = String(data: dataJson, encoding: .utf8) else {
            print("OfflineTimerService: Failed to encode photo data")
            return
        }

        let action = QueuedTimerAction(
            action: .addPhoto,
            timeEntryId: timeEntryId,
            data: dataString
        )

        enqueue(action)
    }

    // MARK: - Synchronization

    /// Sync all queued actions to server
    func syncQueuedActions() async {
        guard isOnline else {
            print("OfflineTimerService: Cannot sync - offline")
            return
        }

        guard !isSyncing else {
            print("OfflineTimerService: Sync already in progress")
            return
        }

        isSyncing = true
        syncErrors.removeAll()

        let queue = loadQueue()

        if queue.isEmpty {
            print("OfflineTimerService: No actions to sync")
            isSyncing = false
            return
        }

        print("OfflineTimerService: Starting sync of \(queue.count) actions")

        var successCount = 0
        var failureCount = 0

        for var action in queue {
            do {
                try await syncAction(action)
                dequeue(id: action.id)
                successCount += 1

            } catch {
                failureCount += 1

                // Update sync attempts
                action.syncAttempts += 1
                action.lastSyncAttempt = Date()
                action.syncError = error.localizedDescription

                // Remove if max attempts reached
                if action.syncAttempts >= maxSyncAttempts {
                    print("OfflineTimerService: Max sync attempts reached for action \(action.id), removing from queue")
                    dequeue(id: action.id)
                    syncErrors.append("Failed to sync \(action.action.rawValue): \(error.localizedDescription)")
                } else {
                    updateQueuedAction(action)
                }
            }
        }

        lastSyncTime = Date()
        isSyncing = false

        print("OfflineTimerService: Sync complete - \(successCount) succeeded, \(failureCount) failed")
    }

    /// Sync a single action
    private func syncAction(_ action: QueuedTimerAction) async throws {
        switch action.action {
        case .clockIn:
            try await syncClockIn(action)
        case .clockOut:
            try await syncClockOut(action)
        case .addPhoto:
            try await syncAddPhoto(action)
        case .updateEntry:
            try await syncUpdateEntry(action)
        case .deleteEntry:
            try await syncDeleteEntry(action)
        }
    }

    // MARK: - Action Sync Handlers

    private func syncClockIn(_ action: QueuedTimerAction) async throws {
        guard let data = action.data.data(using: .utf8),
              let clockInData = try? JSONDecoder().decode(ClockInData.self, from: data) else {
            throw OfflineTimerError.invalidActionData
        }

        // Find time entry in local storage
        let descriptor = FetchDescriptor<TimeEntry>(
            predicate: #Predicate<TimeEntry> { entry in
                entry.id == action.timeEntryId
            }
        )

        guard let timeEntry = try modelContext.fetch(descriptor).first else {
            throw OfflineTimerError.timeEntryNotFound
        }

        // Update GPS data if available
        if let lat = clockInData.latitude,
           let lon = clockInData.longitude,
           let acc = clockInData.accuracy {
            timeEntry.startLatitude = lat
            timeEntry.startLongitude = lon
            timeEntry.startAccuracy = acc
            timeEntry.gpsVerified = acc < 100
        }

        // TODO: Send to backend API when available
        // For now, just save to local SwiftData
        try modelContext.save()

        print("OfflineTimerService: Synced clock-in for time entry \(action.timeEntryId)")
    }

    private func syncClockOut(_ action: QueuedTimerAction) async throws {
        guard let data = action.data.data(using: .utf8),
              let clockOutData = try? JSONDecoder().decode(ClockOutData.self, from: data) else {
            throw OfflineTimerError.invalidActionData
        }

        // Find time entry in local storage
        let descriptor = FetchDescriptor<TimeEntry>(
            predicate: #Predicate<TimeEntry> { entry in
                entry.id == action.timeEntryId
            }
        )

        guard let timeEntry = try modelContext.fetch(descriptor).first else {
            throw OfflineTimerError.timeEntryNotFound
        }

        // Update end time and GPS
        timeEntry.endTime = clockOutData.endTime

        if let lat = clockOutData.latitude,
           let lon = clockOutData.longitude,
           let acc = clockOutData.accuracy {
            timeEntry.endLatitude = lat
            timeEntry.endLongitude = lon
            timeEntry.endAccuracy = acc
        }

        if let notes = clockOutData.notes {
            timeEntry.notes = notes
        }

        // TODO: Send to backend API when available
        try modelContext.save()

        print("OfflineTimerService: Synced clock-out for time entry \(action.timeEntryId)")
    }

    private func syncAddPhoto(_ action: QueuedTimerAction) async throws {
        guard let data = action.data.data(using: .utf8),
              let photoData = try? JSONDecoder().decode(AddPhotoData.self, from: data) else {
            throw OfflineTimerError.invalidActionData
        }

        // Find time entry in local storage
        let descriptor = FetchDescriptor<TimeEntry>(
            predicate: #Predicate<TimeEntry> { entry in
                entry.id == action.timeEntryId
            }
        )

        guard let timeEntry = try modelContext.fetch(descriptor).first else {
            throw OfflineTimerError.timeEntryNotFound
        }

        // Add photo ID to time entry
        timeEntry.addPhoto(id: photoData.photoId)

        // TODO: Upload photo to backend when available
        try modelContext.save()

        print("OfflineTimerService: Synced photo add for time entry \(action.timeEntryId)")
    }

    private func syncUpdateEntry(_ action: QueuedTimerAction) async throws {
        // TODO: Implement update sync when needed
        print("OfflineTimerService: Update entry sync not yet implemented")
    }

    private func syncDeleteEntry(_ action: QueuedTimerAction) async throws {
        // TODO: Implement delete sync when needed
        print("OfflineTimerService: Delete entry sync not yet implemented")
    }

    // MARK: - Utility

    /// Check if there are pending sync actions
    func hasPendingActions() -> Bool {
        return queuedActionsCount > 0
    }

    /// Get all queued actions for display
    func getQueuedActions() -> [QueuedTimerAction] {
        return loadQueue()
    }

    /// Force sync now (manual trigger)
    func forceSyncNow() async {
        await syncQueuedActions()
    }
}

// MARK: - Errors

enum OfflineTimerError: LocalizedError {
    case invalidActionData
    case timeEntryNotFound
    case syncFailed(String)
    case networkUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidActionData:
            return "Invalid action data in queue"
        case .timeEntryNotFound:
            return "Time entry not found for sync"
        case .syncFailed(let reason):
            return "Sync failed: \(reason)"
        case .networkUnavailable:
            return "Network connection unavailable"
        }
    }
}
