//
//  WorkScheduleCalculator.swift
//  TreeShop
//
//  Intelligent work schedule calculation based on TreeShop Score, transport time,
//  and organization work day settings
//

import Foundation

/// Represents a single work day in the schedule
struct WorkDay {
    let dayNumber: Int
    let date: Date
    let startTime: Date
    let endTime: Date
    let transportToSiteHours: Double
    let workHours: Double
    let transportFromSiteHours: Double
    let totalHours: Double

    var durationMinutes: Int {
        Int(totalHours * 60)
    }

    var isFullDay: Bool {
        workHours >= 6.0 // Consider 6+ hours a "full day"
    }
}

/// Complete work schedule for a project
struct WorkSchedule {
    let totalWorkHours: Double
    let totalTransportHours: Double
    let totalBufferHours: Double
    let totalHours: Double
    let workDays: [WorkDay]

    var numberOfDays: Int {
        workDays.count
    }

    var startDate: Date {
        workDays.first?.date ?? Date()
    }

    var endDate: Date {
        workDays.last?.date ?? Date()
    }
}

class WorkScheduleCalculator {

    // MARK: - Main Calculation

    /// Calculate intelligent work schedule from proposal/project data
    static func calculateSchedule(
        productionHours: Double,
        driveTimeOneWay: Double, // In hours
        bufferPercentage: Double = 0.10,
        organization: Organization,
        requestedStartDate: Date? = nil
    ) -> WorkSchedule {

        // Calculate totals
        let transportHours = driveTimeOneWay * 2 // Round trip
        let totalWorkHours = productionHours
        let totalBufferHours = (productionHours + transportHours) * bufferPercentage
        let totalHours = totalWorkHours + transportHours + totalBufferHours

        // Get start date (skip weekends if configured)
        let startDate = requestedStartDate ?? nextWorkDay(from: Date(), organization: organization)

        // Calculate work days
        let workDays = calculateWorkDays(
            totalWorkHours: totalWorkHours,
            transportOneWay: driveTimeOneWay,
            startDate: startDate,
            organization: organization
        )

        return WorkSchedule(
            totalWorkHours: totalWorkHours,
            totalTransportHours: transportHours,
            totalBufferHours: totalBufferHours,
            totalHours: totalHours,
            workDays: workDays
        )
    }

    // MARK: - Work Day Calculation

    private static func calculateWorkDays(
        totalWorkHours: Double,
        transportOneWay: Double,
        startDate: Date,
        organization: Organization
    ) -> [WorkDay] {

        var workDays: [WorkDay] = []
        var remainingWorkHours = totalWorkHours
        var currentDate = startDate
        var dayNumber = 1

        let standardDay = organization.standardWorkDayHours
        let maxDay = organization.maxWorkDayHours
        let minDay = organization.minimumDayLength

        while remainingWorkHours > 0 {
            // Calculate available work time for this day
            let transportRoundTrip = transportOneWay * 2
            let maxWorkForDay = maxDay - transportRoundTrip
            let standardWorkForDay = standardDay - transportRoundTrip

            // Determine work hours for this day
            let workHoursThisDay: Double

            if remainingWorkHours <= standardWorkForDay {
                // Fits in standard day - use it all
                workHoursThisDay = remainingWorkHours
            } else if remainingWorkHours <= maxWorkForDay {
                // Fits in max day - push to max to avoid extra day
                workHoursThisDay = remainingWorkHours
            } else {
                // Multiple days needed
                let remainingAfterThisDay = remainingWorkHours - maxWorkForDay

                // Check if remaining is less than minDay
                if remainingAfterThisDay < minDay && remainingAfterThisDay > 0 {
                    // Split evenly between this day and next to avoid tiny last day
                    workHoursThisDay = remainingWorkHours / 2
                } else {
                    // Use max day
                    workHoursThisDay = maxWorkForDay
                }
            }

            // Build work day
            let workDay = createWorkDay(
                dayNumber: dayNumber,
                date: currentDate,
                workHours: workHoursThisDay,
                transportOneWay: transportOneWay,
                organization: organization
            )

            workDays.append(workDay)

            // Move to next day
            remainingWorkHours -= workHoursThisDay
            dayNumber += 1
            currentDate = nextWorkDay(from: currentDate, organization: organization)
        }

        return workDays
    }

    // MARK: - Work Day Creation

    private static func createWorkDay(
        dayNumber: Int,
        date: Date,
        workHours: Double,
        transportOneWay: Double,
        organization: Organization
    ) -> WorkDay {

        let calendar = Calendar.current

        // Get start time from organization settings
        let startTimeComponents = calendar.dateComponents([.hour, .minute], from: organization.workDayStartTime)
        let startTime = calendar.date(
            bySettingHour: startTimeComponents.hour ?? 7,
            minute: startTimeComponents.minute ?? 0,
            second: 0,
            of: date
        ) ?? date

        // Calculate timeline
        let totalHours = workHours + (transportOneWay * 2)

        let arriveAtSiteTime = startTime.addingTimeInterval(transportOneWay * 3600)
        let finishWorkTime = arriveAtSiteTime.addingTimeInterval(workHours * 3600)
        let returnHomeTime = finishWorkTime.addingTimeInterval(transportOneWay * 3600)

        return WorkDay(
            dayNumber: dayNumber,
            date: date,
            startTime: startTime,
            endTime: returnHomeTime,
            transportToSiteHours: transportOneWay,
            workHours: workHours,
            transportFromSiteHours: transportOneWay,
            totalHours: totalHours
        )
    }

    // MARK: - Date Helpers

    /// Get next available work day (skip weekends if configured)
    private static func nextWorkDay(from date: Date, organization: Organization) -> Date {
        let calendar = Calendar.current
        var nextDay = calendar.date(byAdding: .day, value: 1, to: date) ?? date

        // Skip weekends if not included in schedule
        if !organization.includeWeekendsInSchedule {
            while calendar.component(.weekday, from: nextDay) == 1 || // Sunday
                  calendar.component(.weekday, from: nextDay) == 7 {  // Saturday
                nextDay = calendar.date(byAdding: .day, value: 1, to: nextDay) ?? nextDay
            }
        }

        return nextDay
    }

    // MARK: - Formatting Helpers

    /// Format work schedule for display
    static func formatScheduleDescription(_ schedule: WorkSchedule) -> String {
        var description = ""

        description += "\(schedule.numberOfDays) day\(schedule.numberOfDays == 1 ? "" : "s") of work\n"
        description += "Total: \(formatHours(schedule.totalHours))\n\n"

        for day in schedule.workDays {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "EEEE, MMM d"
            let dayString = dateFormatter.string(from: day.date)

            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "h:mm a"
            let startString = timeFormatter.string(from: day.startTime)
            let endString = timeFormatter.string(from: day.endTime)

            description += "Day \(day.dayNumber): \(dayString)\n"
            description += "  \(startString) - \(endString) (\(formatHours(day.totalHours)))\n"
            description += "  • Drive to site: \(formatHours(day.transportToSiteHours))\n"
            description += "  • Work on-site: \(formatHours(day.workHours))\n"
            description += "  • Drive home: \(formatHours(day.transportFromSiteHours))\n"

            if day.dayNumber < schedule.numberOfDays {
                description += "\n"
            }
        }

        return description
    }

    /// Format hours as human-readable string
    static func formatHours(_ hours: Double) -> String {
        let totalMinutes = Int(hours * 60)
        let h = totalMinutes / 60
        let m = totalMinutes % 60

        if m == 0 {
            return "\(h) hr\(h == 1 ? "" : "s")"
        } else {
            return "\(h) hr\(h == 1 ? "" : "s") \(m) min"
        }
    }

    // MARK: - Calendar Event Creation Helper

    /// Create description for calendar event from work day
    static func createCalendarEventDescription(
        schedule: WorkSchedule,
        customerName: String,
        serviceType: String,
        loadoutName: String? = nil,
        afissFactors: [String] = [],
        equipmentNotes: String? = nil
    ) -> String {
        var notes = "Customer: \(customerName)\n"
        notes += "Service: \(serviceType)\n\n"

        notes += "Schedule:\n"
        notes += "\(schedule.numberOfDays) day\(schedule.numberOfDays == 1 ? "" : "s")\n"
        notes += "Total work: \(formatHours(schedule.totalWorkHours))\n"
        notes += "Transport: \(formatHours(schedule.totalTransportHours)) round trip each day\n\n"

        if let loadout = loadoutName {
            notes += "Equipment: \(loadout)\n\n"
        }

        if !afissFactors.isEmpty && afissFactors.count <= 5 {
            notes += "Site Factors:\n"
            for factor in afissFactors.prefix(5) {
                notes += "• \(factor)\n"
            }
            if afissFactors.count > 5 {
                notes += "• +\(afissFactors.count - 5) more\n"
            }
            notes += "\n"
        }

        if let equipment = equipmentNotes {
            notes += "Equipment Notes:\n\(equipment)\n"
        }

        return notes
    }
}
