//
//  CalendarService.swift
//  TreeShop
//
//  EventKit integration for scheduling estimates, work orders, and reminders
//

import Foundation
import EventKit
import CoreLocation

class CalendarService: ObservableObject {
    private let eventStore = EKEventStore()

    @Published var hasCalendarAccess = false
    @Published var hasRemindersAccess = false

    // MARK: - Permission Management

    /// Request calendar access
    func requestCalendarAccess() async -> Bool {
        do {
            let granted = try await eventStore.requestFullAccessToEvents()
            await MainActor.run {
                hasCalendarAccess = granted
            }
            return granted
        } catch {
            print("Calendar access error: \(error)")
            return false
        }
    }

    /// Request reminders access
    func requestRemindersAccess() async -> Bool {
        do {
            let granted = try await eventStore.requestFullAccessToReminders()
            await MainActor.run {
                hasRemindersAccess = granted
            }
            return granted
        } catch {
            print("Reminders access error: \(error)")
            return false
        }
    }

    /// Check if calendar access is already granted
    func checkCalendarAccess() -> Bool {
        let status = EKEventStore.authorizationStatus(for: .event)
        hasCalendarAccess = (status == .fullAccess)
        return hasCalendarAccess
    }

    /// Check if reminders access is already granted
    func checkRemindersAccess() -> Bool {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        hasRemindersAccess = (status == .fullAccess)
        return hasRemindersAccess
    }

    // MARK: - TreeShop Calendar Management

    /// Get or create the main TreeShop calendar
    func getOrCreateTreeShopCalendar(type: TreeShopCalendarType = .estimates) -> EKCalendar? {
        // Check if calendar already exists
        if let existingCalendar = findTreeShopCalendar(type: type) {
            return existingCalendar
        }

        // Create new calendar
        let calendar = EKCalendar(for: .event, eventStore: eventStore)
        calendar.title = type.title
        calendar.cgColor = type.color

        // Use default calendar source (iCloud if available, otherwise local)
        if let source = eventStore.defaultCalendarForNewEvents?.source {
            calendar.source = source
        } else if let source = eventStore.sources.first(where: { $0.sourceType == .local }) {
            calendar.source = source
        } else {
            return nil
        }

        do {
            try eventStore.saveCalendar(calendar, commit: true)
            return calendar
        } catch {
            print("Failed to create TreeShop calendar: \(error)")
            return nil
        }
    }

    /// Find existing TreeShop calendar
    private func findTreeShopCalendar(type: TreeShopCalendarType) -> EKCalendar? {
        let calendars = eventStore.calendars(for: .event)
        return calendars.first { $0.title == type.title }
    }

    // MARK: - Lead Estimate Event Management

    /// Create calendar event for lead estimate
    func createEstimateEvent(
        from lead: Lead,
        duration: TimeInterval = 3600 // Default 1 hour
    ) -> String? {
        guard checkCalendarAccess(),
              let estimateDate = lead.estimateScheduledDate,
              let calendar = getOrCreateTreeShopCalendar(type: .estimates) else {
            return nil
        }

        let event = EKEvent(eventStore: eventStore)
        event.calendar = calendar
        event.title = "Estimate: \(lead.customerName) - \(lead.serviceInterest.rawValue)"
        event.location = lead.fullPropertyAddress
        event.startDate = estimateDate
        event.endDate = estimateDate.addingTimeInterval(duration)

        // Add alarms (2 hours before + 30 minutes before)
        event.addAlarm(EKAlarm(relativeOffset: -7200))  // 2 hours
        event.addAlarm(EKAlarm(relativeOffset: -1800))  // 30 minutes

        // Add detailed notes
        var notes = "Customer: \(lead.customerName)\n"
        if let phone = lead.phone {
            notes += "Phone: \(phone)\n"
        }
        if let email = lead.email {
            notes += "Email: \(email)\n"
        }
        if let company = lead.companyName {
            notes += "Company: \(company)\n"
        }
        notes += "\nService: \(lead.serviceInterest.rawValue)\n"

        if let budget = lead.estimatedBudget {
            notes += "Budget: $\(String(format: "%.0f", budget))\n"
        }

        if let leadNotes = lead.initialNotes, !leadNotes.isEmpty {
            notes += "\nNotes:\n\(leadNotes)"
        }

        event.notes = notes

        // Add structured location data if available
        if let lat = lead.latitude, let lon = lead.longitude {
            let location = EKStructuredLocation(title: lead.propertyAddress)
            location.geoLocation = CLLocation(latitude: lat, longitude: lon)
            event.structuredLocation = location
        }

        // Save event
        do {
            try eventStore.save(event, span: .thisEvent)
            return event.eventIdentifier
        } catch {
            print("Failed to save estimate event: \(error)")
            return nil
        }
    }

    /// Update existing estimate event
    func updateEstimateEvent(
        eventIdentifier: String,
        lead: Lead,
        duration: TimeInterval = 3600
    ) -> Bool {
        guard checkCalendarAccess(),
              let event = eventStore.event(withIdentifier: eventIdentifier) else {
            return false
        }

        // Update event details
        event.title = "Estimate: \(lead.customerName) - \(lead.serviceInterest.rawValue)"
        event.location = lead.fullPropertyAddress

        if let estimateDate = lead.estimateScheduledDate {
            event.startDate = estimateDate
            event.endDate = estimateDate.addingTimeInterval(duration)
        }

        // Update notes
        var notes = "Customer: \(lead.customerName)\n"
        if let phone = lead.phone {
            notes += "Phone: \(phone)\n"
        }
        if let email = lead.email {
            notes += "Email: \(email)\n"
        }
        if let company = lead.companyName {
            notes += "Company: \(company)\n"
        }
        notes += "\nService: \(lead.serviceInterest.rawValue)\n"

        if let budget = lead.estimatedBudget {
            notes += "Budget: $\(String(format: "%.0f", budget))\n"
        }

        if let leadNotes = lead.initialNotes, !leadNotes.isEmpty {
            notes += "\nNotes:\n\(leadNotes)"
        }

        event.notes = notes

        // Update location if available
        if let lat = lead.latitude, let lon = lead.longitude {
            let location = EKStructuredLocation(title: lead.propertyAddress)
            location.geoLocation = CLLocation(latitude: lat, longitude: lon)
            event.structuredLocation = location
        }

        do {
            try eventStore.save(event, span: .thisEvent)
            return true
        } catch {
            print("Failed to update estimate event: \(error)")
            return false
        }
    }

    /// Delete estimate event
    func deleteEstimateEvent(eventIdentifier: String) -> Bool {
        guard checkCalendarAccess(),
              let event = eventStore.event(withIdentifier: eventIdentifier) else {
            return false
        }

        do {
            try eventStore.remove(event, span: .thisEvent)
            return true
        } catch {
            print("Failed to delete estimate event: \(error)")
            return false
        }
    }

    // MARK: - Work Order Event Management

    /// Create intelligent multi-day work order events using WorkScheduleCalculator
    func createWorkOrderEvents(
        from proposal: Proposal,
        organization: Organization,
        startDate: Date? = nil
    ) -> [String] {
        // Validate inputs
        guard let validationResult = validateWorkOrderInputs(proposal: proposal) else {
            return []
        }

        // Calculate schedule
        let schedule: WorkSchedule = calculateWorkSchedule(
            lineItems: validationResult.lineItems,
            organization: organization,
            startDate: startDate
        )

        // Get loadout names once
        let loadoutNames: String = validationResult.lineItems
            .compactMap { $0.loadoutName }
            .joined(separator: ", ")

        // Create events for each work day
        var eventIdentifiers: [String] = []

        for workDay in schedule.workDays {
            if let eventId = createSingleWorkOrderEvent(
                workDay: workDay,
                schedule: schedule,
                customer: validationResult.customer,
                lineItems: validationResult.lineItems,
                loadoutNames: loadoutNames,
                calendar: validationResult.calendar
            ) {
                eventIdentifiers.append(eventId)
            }
        }

        return eventIdentifiers
    }

    // MARK: - Work Order Helper Functions

    /// Validation result for work order inputs
    private struct WorkOrderValidation {
        let calendar: EKCalendar
        let customer: Customer
        let lineItems: [ProposalLineItem]
    }

    /// Validate all required inputs for work order event creation
    private func validateWorkOrderInputs(proposal: Proposal) -> WorkOrderValidation? {
        guard checkCalendarAccess() else { return nil }
        guard let calendar = getOrCreateTreeShopCalendar(type: .workOrders) else { return nil }
        guard let customer = proposal.customer else { return nil }
        guard let lineItems = proposal.lineItems, !lineItems.isEmpty else { return nil }

        return WorkOrderValidation(
            calendar: calendar,
            customer: customer,
            lineItems: lineItems
        )
    }

    /// Calculate work schedule from line items
    private func calculateWorkSchedule(
        lineItems: [ProposalLineItem],
        organization: Organization,
        startDate: Date?
    ) -> WorkSchedule {
        let totalProductionHours: Double = lineItems.reduce(0) { $0 + $1.productionHours }
        let avgDriveTime: Double = lineItems.first?.driveTimeOneWay ?? 0

        return WorkScheduleCalculator.calculateSchedule(
            productionHours: totalProductionHours,
            driveTimeOneWay: avgDriveTime,
            bufferPercentage: 0.10,
            organization: organization,
            requestedStartDate: startDate
        )
    }

    /// Build event title based on day count
    private func buildEventTitle(
        workDay: WorkDay,
        schedule: WorkSchedule,
        customer: Customer,
        lineItems: [ProposalLineItem]
    ) -> String {
        if schedule.numberOfDays == 1 {
            let serviceType: String = lineItems.first?.serviceType.rawValue ?? "Service"
            return "Work Order: \(customer.name) - \(serviceType)"
        } else {
            return "Work Order (Day \(workDay.dayNumber)/\(schedule.numberOfDays)): \(customer.name)"
        }
    }

    /// Build detailed event notes
    private func buildEventNotes(
        workDay: WorkDay,
        schedule: WorkSchedule,
        customer: Customer,
        lineItems: [ProposalLineItem],
        loadoutNames: String
    ) -> String {
        var notes: String = ""

        // Customer info
        notes += "Customer: \(customer.name)\n"
        if let phone = customer.phone {
            notes += "Phone: \(phone)\n"
        }
        notes += "\n"

        // Schedule summary (only on Day 1)
        if workDay.dayNumber == 1 {
            notes += "PROJECT SCHEDULE:\n"
            notes += "\(schedule.numberOfDays) day\(schedule.numberOfDays == 1 ? "" : "s") total\n"
            notes += "Total work: \(WorkScheduleCalculator.formatHours(schedule.totalWorkHours))\n"
            let avgTransport: Double = schedule.totalTransportHours / Double(schedule.numberOfDays)
            notes += "Transport per day: \(WorkScheduleCalculator.formatHours(avgTransport))\n\n"
        }

        // Today's schedule
        notes += "TODAY'S SCHEDULE:\n"
        notes += "• Depart: \(formatTime(workDay.startTime))\n"

        let arriveTime: Date = workDay.startTime.addingTimeInterval(workDay.transportToSiteHours * 3600)
        notes += "• Arrive on-site: \(formatTime(arriveTime))\n"
        notes += "• Work hours: \(WorkScheduleCalculator.formatHours(workDay.workHours))\n"

        let finishTime: Date = workDay.endTime.addingTimeInterval(-workDay.transportFromSiteHours * 3600)
        notes += "• Finish work: \(formatTime(finishTime))\n"
        notes += "• Return home: \(formatTime(workDay.endTime))\n\n"

        // Services list
        notes += "SERVICES:\n"
        for (index, item) in lineItems.enumerated() {
            notes += "\(index + 1). \(item.serviceType.rawValue) - \(item.lineDescription)\n"
        }
        notes += "\n"

        // Equipment
        if !loadoutNames.isEmpty {
            notes += "EQUIPMENT: \(loadoutNames)\n\n"
        }

        // GPS coordinates
        if let lat = customer.latitude, let lon = customer.longitude {
            notes += "GPS: \(lat), \(lon)\n"
        }

        return notes
    }

    /// Create a single work order event
    private func createSingleWorkOrderEvent(
        workDay: WorkDay,
        schedule: WorkSchedule,
        customer: Customer,
        lineItems: [ProposalLineItem],
        loadoutNames: String,
        calendar: EKCalendar
    ) -> String? {
        let event = EKEvent(eventStore: eventStore)
        event.calendar = calendar

        // Set title
        event.title = buildEventTitle(
            workDay: workDay,
            schedule: schedule,
            customer: customer,
            lineItems: lineItems
        )

        // Set location
        event.location = customer.fullAddress

        // Set times
        event.startDate = workDay.startTime
        event.endDate = workDay.endTime

        // Add alarms
        if workDay.dayNumber == 1 {
            event.addAlarm(EKAlarm(relativeOffset: -86400))  // 24 hours before
            event.addAlarm(EKAlarm(relativeOffset: -3600))   // 1 hour before
        } else {
            event.addAlarm(EKAlarm(relativeOffset: -3600))   // 1 hour before
        }

        // Set notes
        event.notes = buildEventNotes(
            workDay: workDay,
            schedule: schedule,
            customer: customer,
            lineItems: lineItems,
            loadoutNames: loadoutNames
        )

        // Set structured location
        if let lat = customer.latitude, let lon = customer.longitude {
            let location = EKStructuredLocation(title: customer.address)
            location.geoLocation = CLLocation(latitude: lat, longitude: lon)
            event.structuredLocation = location
        }

        // Save event
        do {
            try eventStore.save(event, span: .thisEvent)
            return event.eventIdentifier
        } catch {
            print("Failed to save work order event for day \(workDay.dayNumber): \(error)")
            return nil
        }
    }

    /// Format time for display (e.g., "7:00 AM")
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    // MARK: - Reminder Management

    /// Create follow-up reminder
    func createFollowUpReminder(from lead: Lead) -> String? {
        guard checkRemindersAccess(),
              let followUpDate = lead.followUpDate else {
            return nil
        }

        let reminder = EKReminder(eventStore: eventStore)
        reminder.title = "Follow up: \(lead.customerName)"
        reminder.calendar = getOrCreateTreeShopReminderList()

        // Set due date
        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: followUpDate)
        reminder.dueDateComponents = components

        // Set priority based on lead status
        switch lead.status {
        case .qualified, .proposalSent:
            reminder.priority = 5 // High priority
        case .contacted:
            reminder.priority = 3 // Medium
        default:
            reminder.priority = 1 // Low
        }

        // Add notes
        var notes = "Lead: \(lead.customerName)\n"
        notes += "Service: \(lead.serviceInterest.rawValue)\n"
        if let phone = lead.phone {
            notes += "Phone: \(phone)\n"
        }
        if let leadNotes = lead.initialNotes, !leadNotes.isEmpty {
            notes += "\nNotes: \(leadNotes)"
        }
        reminder.notes = notes

        do {
            try eventStore.save(reminder, commit: true)
            return reminder.calendarItemIdentifier
        } catch {
            print("Failed to save follow-up reminder: \(error)")
            return nil
        }
    }

    /// Get or create TreeShop reminder list
    private func getOrCreateTreeShopReminderList() -> EKCalendar? {
        let calendars = eventStore.calendars(for: .reminder)

        // Check if exists
        if let existing = calendars.first(where: { $0.title == "TreeShop Follow-ups" }) {
            return existing
        }

        // Create new
        let calendar = EKCalendar(for: .reminder, eventStore: eventStore)
        calendar.title = "TreeShop Follow-ups"

        if let source = eventStore.defaultCalendarForNewReminders()?.source {
            calendar.source = source
        } else if let source = eventStore.sources.first(where: { $0.sourceType == .local }) {
            calendar.source = source
        } else {
            return nil
        }

        do {
            try eventStore.saveCalendar(calendar, commit: true)
            return calendar
        } catch {
            print("Failed to create reminder list: \(error)")
            return nil
        }
    }
}

// MARK: - Calendar Types

enum TreeShopCalendarType {
    case estimates
    case workOrders
    case maintenance

    var title: String {
        switch self {
        case .estimates: return "TreeShop Estimates"
        case .workOrders: return "TreeShop Work Orders"
        case .maintenance: return "TreeShop Maintenance"
        }
    }

    var color: CGColor {
        switch self {
        case .estimates: return CGColor(red: 0.2, green: 0.6, blue: 1.0, alpha: 1.0) // Blue
        case .workOrders: return CGColor(red: 0.2, green: 0.8, blue: 0.4, alpha: 1.0) // Green
        case .maintenance: return CGColor(red: 1.0, green: 0.6, blue: 0.0, alpha: 1.0) // Orange
        }
    }
}
