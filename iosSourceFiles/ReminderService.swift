//
//  ReminderService.swift
//  TreeShop
//
//  Smart notification reminders for time tracking
//  Uses patterns and context to suggest clock-in/out at optimal times
//

import Foundation
import UserNotifications
import SwiftData
import CoreLocation

/// Types of reminder notifications
enum ReminderType: String {
    case morningClockIn = "morning_clock_in"
    case forgotToClockOut = "forgot_clock_out"
    case longRunningTimer = "long_running"
    case endOfDayReview = "end_of_day"
    case breakReminder = "break_reminder"
    case geofenceClockIn = "geofence_clock_in"
    case geofenceClockOut = "geofence_clock_out"
}

/// Reminder configuration
struct ReminderConfig {
    var morningReminderEnabled: Bool = true
    var morningReminderTime: Date = {
        var components = DateComponents()
        components.hour = 7
        components.minute = 30
        return Calendar.current.date(from: components) ?? Date()
    }()

    var forgotClockOutEnabled: Bool = true
    var forgotClockOutDelay: TimeInterval = 3600 // 1 hour after usual clock-out time

    var longRunningTimerEnabled: Bool = true
    var longRunningThreshold: TimeInterval = 14400 // 4 hours

    var endOfDayReviewEnabled: Bool = true
    var endOfDayReviewTime: Date = {
        var components = DateComponents()
        components.hour = 17
        components.minute = 0
        return Calendar.current.date(from: components) ?? Date()
    }()

    var breakReminderEnabled: Bool = true
    var breakReminderInterval: TimeInterval = 7200 // 2 hours

    var geofenceRemindersEnabled: Bool = true
}

@MainActor
class ReminderService: ObservableObject {
    // MARK: - Published Properties

    @Published var config = ReminderConfig()
    @Published var reminderPermissionGranted = false

    // MARK: - Private Properties

    private let modelContext: ModelContext
    private let notificationCenter = UNUserNotificationCenter.current()

    // MARK: - Initialization

    init(modelContext: ModelContext) {
        self.modelContext = modelContext

        Task {
            await checkNotificationPermission()
            await setupNotificationCategories()
        }
    }

    // MARK: - Permission Management

    /// Request notification permission if not already granted
    func requestPermission() async -> Bool {
        do {
            let granted = try await notificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
            reminderPermissionGranted = granted

            if granted {
                print("ReminderService: Notification permission granted")
                await scheduleAllReminders()
            } else {
                print("ReminderService: Notification permission denied")
            }

            return granted

        } catch {
            print("ReminderService: Failed to request permission - \(error)")
            return false
        }
    }

    /// Check current notification permission status
    private func checkNotificationPermission() async {
        let settings = await notificationCenter.notificationSettings()
        reminderPermissionGranted = settings.authorizationStatus == .authorized
    }

    // MARK: - Notification Categories

    private func setupNotificationCategories() async {
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

        let viewTimerAction = UNNotificationAction(
            identifier: "VIEW_TIMER_ACTION",
            title: "View Timer",
            options: [.foreground]
        )

        let snoozeAction = UNNotificationAction(
            identifier: "SNOOZE_ACTION",
            title: "Remind Me Later",
            options: []
        )

        // Reminder categories
        let clockInCategory = UNNotificationCategory(
            identifier: ReminderType.morningClockIn.rawValue,
            actions: [clockInAction, snoozeAction],
            intentIdentifiers: []
        )

        let clockOutCategory = UNNotificationCategory(
            identifier: ReminderType.forgotToClockOut.rawValue,
            actions: [clockOutAction, viewTimerAction],
            intentIdentifiers: []
        )

        let longRunningCategory = UNNotificationCategory(
            identifier: ReminderType.longRunningTimer.rawValue,
            actions: [clockOutAction, viewTimerAction, snoozeAction],
            intentIdentifiers: []
        )

        let endOfDayCategory = UNNotificationCategory(
            identifier: ReminderType.endOfDayReview.rawValue,
            actions: [viewTimerAction],
            intentIdentifiers: []
        )

        let breakCategory = UNNotificationCategory(
            identifier: ReminderType.breakReminder.rawValue,
            actions: [snoozeAction],
            intentIdentifiers: []
        )

        notificationCenter.setNotificationCategories([
            clockInCategory,
            clockOutCategory,
            longRunningCategory,
            endOfDayCategory,
            breakCategory
        ])
    }

    // MARK: - Smart Reminder Scheduling

    /// Schedule all enabled reminders
    func scheduleAllReminders() async {
        guard reminderPermissionGranted else {
            print("ReminderService: Cannot schedule - permission not granted")
            return
        }

        // Clear existing reminders
        notificationCenter.removeAllPendingNotificationRequests()

        // Schedule each type if enabled
        if config.morningReminderEnabled {
            await scheduleMorningReminder()
        }

        if config.endOfDayReviewEnabled {
            await scheduleEndOfDayReminder()
        }

        // Long-running and break reminders are scheduled dynamically
        print("ReminderService: All reminders scheduled")
    }

    /// Schedule morning clock-in reminder
    private func scheduleMorningReminder() async {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.hour, .minute], from: config.morningReminderTime)

        let content = UNMutableNotificationContent()
        content.title = "Ready to Start Your Day?"
        content.body = "Don't forget to clock in when you arrive at your first job site."
        content.sound = .default
        content.categoryIdentifier = ReminderType.morningClockIn.rawValue

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)

        let request = UNNotificationRequest(
            identifier: "morning_reminder",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
            print("ReminderService: Morning reminder scheduled for \(components.hour ?? 0):\(components.minute ?? 0)")
        } catch {
            print("ReminderService: Failed to schedule morning reminder - \(error)")
        }
    }

    /// Schedule end-of-day review reminder
    private func scheduleEndOfDayReminder() async {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.hour, .minute], from: config.endOfDayReviewTime)

        let content = UNMutableNotificationContent()
        content.title = "End of Day Review"
        content.body = "Review your time entries and make sure everything is accurate."
        content.sound = .default
        content.categoryIdentifier = ReminderType.endOfDayReview.rawValue

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)

        let request = UNNotificationRequest(
            identifier: "end_of_day_reminder",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
            print("ReminderService: End of day reminder scheduled for \(components.hour ?? 0):\(components.minute ?? 0)")
        } catch {
            print("ReminderService: Failed to schedule end of day reminder - \(error)")
        }
    }

    // MARK: - Dynamic Reminders

    /// Send reminder about forgot to clock out
    func sendForgotClockOutReminder(project: Project, entry: TimeEntry) async {
        guard config.forgotClockOutEnabled, reminderPermissionGranted else { return }

        let content = UNMutableNotificationContent()
        content.title = "Forgot to Clock Out?"
        content.body = "You've been clocked in to \(project.projectName) for \(entry.formattedDuration). Tap to clock out."
        content.sound = .default
        content.categoryIdentifier = ReminderType.forgotToClockOut.rawValue
        content.userInfo = [
            "projectId": project.id.uuidString,
            "timeEntryId": entry.id.uuidString
        ]

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: config.forgotClockOutDelay,
            repeats: false
        )

        let request = UNNotificationRequest(
            identifier: "forgot_clock_out_\(entry.id.uuidString)",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
            print("ReminderService: Forgot clock-out reminder scheduled for \(entry.id)")
        } catch {
            print("ReminderService: Failed to schedule forgot clock-out reminder - \(error)")
        }
    }

    /// Send reminder about long-running timer
    func sendLongRunningTimerReminder(project: Project, entry: TimeEntry) async {
        guard config.longRunningTimerEnabled, reminderPermissionGranted else { return }

        let duration = entry.totalMinutes / 60
        guard TimeInterval(entry.totalMinutes * 60) >= config.longRunningThreshold else { return }

        let content = UNMutableNotificationContent()
        content.title = "Long Timer Running"
        content.body = "You've been clocked in to \(project.projectName) for \(duration) hours. Everything okay?"
        content.sound = .default
        content.categoryIdentifier = ReminderType.longRunningTimer.rawValue
        content.userInfo = [
            "projectId": project.id.uuidString,
            "timeEntryId": entry.id.uuidString
        ]

        let request = UNNotificationRequest(
            identifier: "long_running_\(entry.id.uuidString)",
            content: content,
            trigger: nil // Immediate
        )

        do {
            try await notificationCenter.add(request)
            print("ReminderService: Long-running timer reminder sent for \(entry.id)")
        } catch {
            print("ReminderService: Failed to send long-running timer reminder - \(error)")
        }
    }

    /// Send break reminder
    func sendBreakReminder(project: Project) async {
        guard config.breakReminderEnabled, reminderPermissionGranted else { return }

        let content = UNMutableNotificationContent()
        content.title = "Time for a Break?"
        content.body = "You've been working for a while. Consider taking a break."
        content.sound = .default
        content.categoryIdentifier = ReminderType.breakReminder.rawValue
        content.userInfo = ["projectId": project.id.uuidString]

        let request = UNNotificationRequest(
            identifier: "break_reminder_\(project.id.uuidString)",
            content: content,
            trigger: nil // Immediate
        )

        do {
            try await notificationCenter.add(request)
            print("ReminderService: Break reminder sent for project \(project.id)")
        } catch {
            print("ReminderService: Failed to send break reminder - \(error)")
        }
    }

    // MARK: - Geofence Reminders

    /// Send geofence-based clock-in reminder
    func sendGeofenceClockInReminder(projectId: UUID, projectName: String) async {
        guard config.geofenceRemindersEnabled, reminderPermissionGranted else { return }

        let content = UNMutableNotificationContent()
        content.title = "Arrived at \(projectName)"
        content.body = "Tap to clock in and start tracking your time."
        content.sound = .default
        content.categoryIdentifier = ReminderType.geofenceClockIn.rawValue
        content.userInfo = ["projectId": projectId.uuidString]

        let request = UNNotificationRequest(
            identifier: "geofence_clock_in_\(projectId.uuidString)",
            content: content,
            trigger: nil // Immediate
        )

        do {
            try await notificationCenter.add(request)
            print("ReminderService: Geofence clock-in reminder sent for project \(projectId)")
        } catch {
            print("ReminderService: Failed to send geofence clock-in reminder - \(error)")
        }
    }

    /// Send geofence-based clock-out reminder
    func sendGeofenceClockOutReminder(projectId: UUID, projectName: String) async {
        guard config.geofenceRemindersEnabled, reminderPermissionGranted else { return }

        let content = UNMutableNotificationContent()
        content.title = "Left \(projectName)"
        content.body = "Don't forget to clock out. Your timer is still running."
        content.sound = .default
        content.categoryIdentifier = ReminderType.geofenceClockOut.rawValue
        content.userInfo = ["projectId": projectId.uuidString]

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: 300, // 5 minutes after leaving
            repeats: false
        )

        let request = UNNotificationRequest(
            identifier: "geofence_clock_out_\(projectId.uuidString)",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
            print("ReminderService: Geofence clock-out reminder scheduled for project \(projectId)")
        } catch {
            print("ReminderService: Failed to schedule geofence clock-out reminder - \(error)")
        }
    }

    // MARK: - Timer Monitoring

    /// Start monitoring a timer for long-running reminders
    func startMonitoringTimer(project: Project, entry: TimeEntry) {
        guard config.longRunningTimerEnabled else { return }

        // Schedule reminder for threshold time
        Task {
            try await Task.sleep(nanoseconds: UInt64(config.longRunningThreshold * 1_000_000_000))

            // Check if timer is still running
            if entry.isRunning {
                await sendLongRunningTimerReminder(project: project, entry: entry)
            }
        }
    }

    /// Start monitoring for break reminders
    func startMonitoringBreaks(project: Project) {
        guard config.breakReminderEnabled else { return }

        Task {
            try await Task.sleep(nanoseconds: UInt64(config.breakReminderInterval * 1_000_000_000))

            // Check if still working on project
            if project.activeTimeEntry?.isRunning == true {
                await sendBreakReminder(project: project)

                // Reschedule for next interval
                startMonitoringBreaks(project: project)
            }
        }
    }

    /// Cancel all reminders for a specific time entry
    func cancelTimeEntryReminders(for timeEntryId: UUID) {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [
            "forgot_clock_out_\(timeEntryId.uuidString)",
            "long_running_\(timeEntryId.uuidString)"
        ])
    }

    /// Cancel all reminders for a specific project
    func cancelProjectReminders(for projectId: UUID) {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [
            "break_reminder_\(projectId.uuidString)",
            "geofence_clock_in_\(projectId.uuidString)",
            "geofence_clock_out_\(projectId.uuidString)"
        ])
    }

    // MARK: - Reminder Statistics

    /// Get count of pending reminder notifications
    func getPendingRemindersCount() async -> Int {
        let requests = await notificationCenter.pendingNotificationRequests()
        return requests.count
    }

    /// Get list of all pending reminders
    func getPendingReminders() async -> [UNNotificationRequest] {
        return await notificationCenter.pendingNotificationRequests()
    }
}
