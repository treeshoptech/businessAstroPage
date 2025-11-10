//
//  TimerPersistenceService.swift
//  TreeShop
//
//  Timer persistence and crash recovery for time tracking
//

import Foundation
import SwiftData

@MainActor
class TimerPersistenceService: ObservableObject {
    private let modelContext: ModelContext
    private var autoSaveTimer: Timer?

    @Published var hasActiveTimer: Bool = false

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Auto-save

    /// Start auto-save timer that saves every 30 seconds
    func startAutoSave() {
        stopAutoSave()

        autoSaveTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.autoSave()
            }
        }
    }

    /// Stop auto-save timer
    func stopAutoSave() {
        autoSaveTimer?.invalidate()
        autoSaveTimer = nil
    }

    /// Perform auto-save of context
    private func autoSave() async {
        do {
            try modelContext.save()
        } catch {
            print("TimerPersistenceService: Auto-save failed: \(error)")
        }
    }

    // MARK: - Timer Recovery

    /// Check for running timers on app launch
    func checkForRunningTimers() -> [TimeEntry] {
        let descriptor = FetchDescriptor<TimeEntry>(
            predicate: #Predicate<TimeEntry> { entry in
                entry.endTime == nil
            }
        )

        do {
            let runningTimers = try modelContext.fetch(descriptor)
            hasActiveTimer = !runningTimers.isEmpty
            return runningTimers
        } catch {
            print("TimerPersistenceService: Failed to check for running timers: \(error)")
            return []
        }
    }

    /// Stop all running timers (for cleanup or emergency)
    func stopAllRunningTimers() {
        let runningTimers = checkForRunningTimers()

        for timer in runningTimers {
            timer.stop()
        }

        do {
            try modelContext.save()
            hasActiveTimer = false
        } catch {
            print("TimerPersistenceService: Failed to stop all timers: \(error)")
        }
    }

    // MARK: - Timer Management

    /// Start a new timer (stops any existing timer first)
    func startTimer(
        project: Project,
        category: TimeCategory,
        description: String,
        lineItem: ProposalLineItem?,
        organization: Organization
    ) -> TimeEntry {
        // Stop any existing timer
        stopAllRunningTimers()

        // Create new time entry
        let timeEntry = TimeEntry(
            project: project,
            proposalLineItem: lineItem,
            employee: nil, // TODO: Set current employee when multi-user support added
            organization: organization,
            category: category,
            taskDescription: description
        )

        modelContext.insert(timeEntry)

        do {
            try modelContext.save()
            hasActiveTimer = true
        } catch {
            print("TimerPersistenceService: Failed to start timer: \(error)")
        }

        return timeEntry
    }

    /// Stop a running timer
    func stopTimer(_ timeEntry: TimeEntry) {
        timeEntry.stop()

        do {
            try modelContext.save()
            hasActiveTimer = checkForRunningTimers().isEmpty == false
        } catch {
            print("TimerPersistenceService: Failed to stop timer: \(error)")
        }
    }

    // MARK: - State Management

    /// Save context immediately (call on important state changes)
    func saveImmediately() {
        do {
            try modelContext.save()
        } catch {
            print("TimerPersistenceService: Immediate save failed: \(error)")
        }
    }

    /// Update active timer state
    func updateActiveTimerState() {
        hasActiveTimer = !checkForRunningTimers().isEmpty
    }

    // MARK: - Cleanup

    deinit {
        autoSaveTimer?.invalidate()
        autoSaveTimer = nil
    }
}

// MARK: - App Lifecycle Integration

extension TimerPersistenceService {
    /// Call this when app enters background
    func handleAppDidEnterBackground() {
        saveImmediately()
        stopAutoSave()
    }

    /// Call this when app becomes active
    func handleAppDidBecomeActive() {
        updateActiveTimerState()
        startAutoSave()

        // Log recovery info
        let runningTimers = checkForRunningTimers()
        if !runningTimers.isEmpty {
            print("TimerPersistenceService: Recovered \(runningTimers.count) running timer(s)")
            for timer in runningTimers {
                let elapsed = Date().timeIntervalSince(timer.startTime)
                print("  - Timer running for \(Int(elapsed/60)) minutes on \(timer.category.rawValue)")
            }
        }
    }

    /// Call this when app will terminate
    func handleAppWillTerminate() {
        saveImmediately()
        stopAutoSave()
    }
}
