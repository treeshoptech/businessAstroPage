//
//  AdaptiveProductionRateService.swift
//  TreeShop
//
//  Self-learning production rate engine with statistical outlier trimming
//  Works with ProjectCompletionReport - automatically updates when projects complete
//

import Foundation
import SwiftData

struct AdaptiveProductionRateService {

    // MARK: - Configuration

    struct AdaptiveRateConfig {
        var lookbackDays: Int           // How far back to search for completed projects
        var minimumDataPoints: Int      // Minimum completed projects before going adaptive
        var outlierTrimPercent: Double  // Trim top/bottom percentage (0.10 = 10%)
        var confidenceThreshold: Double // If stdev > this% of mean, flag as low confidence

        static func from(organization: Organization) -> AdaptiveRateConfig {
            return AdaptiveRateConfig(
                lookbackDays: organization.adaptiveLookbackDays,
                minimumDataPoints: organization.adaptiveMinimumProjects,
                outlierTrimPercent: organization.adaptiveOutlierTrimPercent,
                confidenceThreshold: 0.15 // 15% standard threshold
            )
        }
    }

    // MARK: - Result Types

    enum ConfidenceLevel: String {
        case high = "High"               // < 10% stdev, 20+ data points
        case medium = "Medium"           // < 15% stdev, 10-19 data points
        case low = "Low"                 // > 15% stdev or 10-14 data points
        case insufficient = "Insufficient" // < minimum data points

        var emoji: String {
            switch self {
            case .high: return "🟢"
            case .medium: return "🟡"
            case .low: return "🔴"
            case .insufficient: return "⚪"
            }
        }

        var description: String {
            switch self {
            case .high: return "High confidence - consistent performance"
            case .medium: return "Medium confidence - reasonable data"
            case .low: return "Low confidence - variable performance"
            case .insufficient: return "Insufficient data - using default rate"
            }
        }
    }

    struct AdaptiveRateResult {
        var adaptiveRate: Double              // The calculated adaptive PpH
        var confidenceLevel: ConfidenceLevel  // High, Medium, Low, Insufficient
        var dataPoints: Int                   // How many projects used
        var rawDataPoints: Int                // Before trimming
        var standardDeviation: Double
        var coefficientOfVariation: Double    // stdev / mean
        var isUsingDefaults: Bool             // True if < minimumDataPoints
        var calculatedAt: Date

        var confidenceEmoji: String {
            confidenceLevel.emoji
        }

        var summary: String {
            if isUsingDefaults {
                return "Using default rate - need \(dataPoints) more projects"
            } else {
                return "\(String(format: "%.2f", adaptiveRate)) PpH \(confidenceEmoji) \(confidenceLevel.rawValue) (\(dataPoints) projects)"
            }
        }
    }

    // MARK: - Main Calculation Function

    /// Calculate adaptive production rate for a specific loadout from completion reports
    static func calculateAdaptiveRate(
        for loadout: Loadout,
        reports: [ProjectCompletionReport],
        config: AdaptiveRateConfig
    ) -> AdaptiveRateResult {

        // Step 1: Filter by lookback period
        let lookbackDate = Calendar.current.date(byAdding: .day, value: -config.lookbackDays, to: Date())!
        let recentReports = reports.filter { $0.completedDate >= lookbackDate }
        let recentPerformances = recentReports.flatMap { report -> [LoadoutPerformance] in
            report.loadoutPerformance.filter { $0.loadoutId == loadout.id && $0.serviceType == loadout.serviceType }
        }

        let rawCount = recentPerformances.count

        // Step 2: Check minimum threshold
        if rawCount < config.minimumDataPoints {
            return AdaptiveRateResult(
                adaptiveRate: loadout.productionRate,
                confidenceLevel: .insufficient,
                dataPoints: config.minimumDataPoints - rawCount,
                rawDataPoints: rawCount,
                standardDeviation: 0,
                coefficientOfVariation: 0,
                isUsingDefaults: true,
                calculatedAt: Date()
            )
        }

        // Step 3: Sort by actualPpH for trimming
        let sorted = recentPerformances.sorted { $0.actualPpH < $1.actualPpH }

        // Step 4: Trim outliers (remove top and bottom X%)
        let trimmedData = trimOutliers(from: sorted, trimPercent: config.outlierTrimPercent)

        // Step 5: Calculate mean (adaptive rate)
        let adaptiveRate = calculateMean(trimmedData.map { $0.actualPpH })

        // Step 6: Calculate standard deviation
        let stdev = calculateStandardDeviation(trimmedData.map { $0.actualPpH }, mean: adaptiveRate)

        // Step 7: Calculate coefficient of variation
        let coefficientOfVariation = adaptiveRate > 0 ? (stdev / adaptiveRate) : 0

        // Step 8: Determine confidence level
        let confidence = determineConfidence(
            dataPoints: trimmedData.count,
            coefficientOfVariation: coefficientOfVariation,
            threshold: config.confidenceThreshold
        )

        return AdaptiveRateResult(
            adaptiveRate: adaptiveRate,
            confidenceLevel: confidence,
            dataPoints: trimmedData.count,
            rawDataPoints: rawCount,
            standardDeviation: stdev,
            coefficientOfVariation: coefficientOfVariation,
            isUsingDefaults: false,
            calculatedAt: Date()
        )
    }

    // MARK: - Helper Functions

    /// Trim outliers from sorted array (remove top and bottom X%)
    private static func trimOutliers(from sorted: [LoadoutPerformance], trimPercent: Double) -> [LoadoutPerformance] {
        guard !sorted.isEmpty else { return [] }
        guard trimPercent > 0 && trimPercent < 0.5 else { return sorted }

        let trimCount = Int(Double(sorted.count) * trimPercent)

        // Don't trim if we'd lose too much data
        if sorted.count - (trimCount * 2) < 5 {
            return sorted
        }

        let startIndex = trimCount
        let endIndex = sorted.count - trimCount

        return Array(sorted[startIndex..<endIndex])
    }

    /// Calculate mean of values
    private static func calculateMean(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Double(values.count)
    }

    /// Calculate standard deviation
    private static func calculateStandardDeviation(_ values: [Double], mean: Double) -> Double {
        guard values.count > 1 else { return 0 }

        let variance = values.reduce(0) { sum, value in
            let diff = value - mean
            return sum + (diff * diff)
        } / Double(values.count - 1) // Use sample variance (n-1)

        return sqrt(variance)
    }

    /// Determine confidence level based on data quality
    private static func determineConfidence(
        dataPoints: Int,
        coefficientOfVariation: Double,
        threshold: Double
    ) -> ConfidenceLevel {

        // High confidence: lots of data + low variation
        if dataPoints >= 20 && coefficientOfVariation < 0.10 {
            return .high
        }

        // Medium confidence: decent data + acceptable variation
        if dataPoints >= 10 && coefficientOfVariation < threshold {
            return .medium
        }

        // Low confidence: minimum data or high variation
        return .low
    }

    // MARK: - Update Functions

    /// Update adaptive rates for all loadouts used in a project (called when project completes)
    static func updateLoadoutsFromReport(
        _ report: ProjectCompletionReport,
        modelContext: ModelContext,
        config: AdaptiveRateConfig
    ) throws {

        guard let organization = report.organization,
              organization.adaptiveRateEnabled else {
            return
        }

        // Get all unique loadout IDs from this report
        let loadoutIds = Set(report.loadoutPerformance.map { $0.loadoutId })

        // Fetch all loadouts
        let allLoadouts = try modelContext.fetch(FetchDescriptor<Loadout>())

        // Fetch all completion reports for this organization
        let allReports = try modelContext.fetch(
            FetchDescriptor<ProjectCompletionReport>(
                sortBy: [SortDescriptor(\.completedDate, order: .reverse)]
            )
        )
        let orgReports = allReports.filter { $0.organization?.id == organization.id }

        // Update each loadout that was used in this project
        for loadoutId in loadoutIds {
            guard let loadout = allLoadouts.first(where: { $0.id == loadoutId }) else { continue }

            let result = calculateAdaptiveRate(
                for: loadout,
                reports: orgReports,
                config: config
            )

            // Update loadout with new adaptive rate
            if !result.isUsingDefaults {
                loadout.adaptiveProductionRate = result.adaptiveRate
                loadout.adaptiveRateConfidence = result.confidenceLevel.rawValue
                loadout.adaptiveRateDataPoints = result.dataPoints
                loadout.lastAdaptiveCalculation = Date()
            }
        }

        try modelContext.save()
    }

    /// Update adaptive rates for all loadouts in an organization (manual refresh)
    static func updateAllLoadouts(
        in organization: Organization,
        modelContext: ModelContext
    ) async throws {

        guard organization.adaptiveRateEnabled else { return }

        let config = AdaptiveRateConfig.from(organization: organization)

        // Fetch all loadouts and filter manually
        let allLoadouts = try modelContext.fetch(FetchDescriptor<Loadout>())
        let loadouts = allLoadouts.filter { loadout in
            loadout.organization?.id == organization.id && loadout.isActive == true
        }

        // Fetch all completion reports and filter manually
        let allReports = try modelContext.fetch(
            FetchDescriptor<ProjectCompletionReport>(
                sortBy: [SortDescriptor(\.completedDate, order: .reverse)]
            )
        )
        let orgReports = allReports.filter { $0.organization?.id == organization.id }

        // Update each loadout
        for loadout in loadouts {
            let result = calculateAdaptiveRate(
                for: loadout,
                reports: orgReports,
                config: config
            )

            // Update loadout with new adaptive rate
            if !result.isUsingDefaults {
                loadout.adaptiveProductionRate = result.adaptiveRate
                loadout.adaptiveRateConfidence = result.confidenceLevel.rawValue
                loadout.adaptiveRateDataPoints = result.dataPoints
                loadout.lastAdaptiveCalculation = Date()
            }
        }

        try modelContext.save()
    }
}
