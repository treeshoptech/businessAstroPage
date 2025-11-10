//
//  PricingFormulas.swift
//  TreeShop
//
//  Complete pricing formula engine based on CLAUDE.md specification
//

import Foundation

struct PricingFormulas {

    // MARK: - Forestry Mulching Calculations

    struct MulchingParams {
        let acres: Double
        let dbhPackage: Int // 4, 6, or 8 inches
        let productionRate: Double // PpH - Points per Hour (default 1.5 for standard equipment)
        let difficultyMultiplier: Double // Optional adjustment (default 1.0)
    }

    struct MulchingResult {
        let baseTreeShopScore: Double
        let adjustedTreeShopScore: Double
        let productionHours: Double
    }

    static func calculateMulchingWork(_ params: MulchingParams) -> MulchingResult {
        // TreeShop Score = Acres × DBH Package
        let baseTreeShopScore = Double(params.dbhPackage) * params.acres
        let adjustedTreeShopScore = baseTreeShopScore * params.difficultyMultiplier

        // Time = TreeShop Score ÷ PpH (Points per Hour)
        // Guard against division by zero
        let productionHours = params.productionRate > 0
            ? adjustedTreeShopScore / params.productionRate
            : 0.0

        return MulchingResult(
            baseTreeShopScore: baseTreeShopScore,
            adjustedTreeShopScore: adjustedTreeShopScore,
            productionHours: productionHours
        )
    }

    // MARK: - Stump Grinding Calculations

    struct StumpParams {
        let diameter: Double // inches
        let heightAbove: Double // feet
        let depthBelow: Double // feet
        let hasLargeRootFlare: Bool // +20%
        let isHardwood: Bool // +15%
        let isRotten: Bool // -15%
    }

    struct StumpResult {
        let baseScore: Double
        let modifiedScore: Double
        let modifiers: Double
    }

    struct StumpGrindingResult {
        let totalStumpScore: Double
        let stumpBreakdown: [StumpResult]
        let productionHours: Double
    }

    static func calculateStumpGrinding(stumps: [StumpParams], productionRate: Double = 400) -> StumpGrindingResult {
        let breakdown = stumps.map { stump -> StumpResult in
            let baseScore = pow(stump.diameter, 2) * (stump.heightAbove + stump.depthBelow)

            var modifier = 1.0
            if stump.hasLargeRootFlare { modifier *= 1.2 }
            if stump.isHardwood { modifier *= 1.15 }
            if stump.isRotten { modifier *= 0.85 }

            let modifiedScore = baseScore * modifier

            return StumpResult(baseScore: baseScore, modifiedScore: modifiedScore, modifiers: modifier)
        }

        let totalScore = breakdown.reduce(0) { $0 + $1.modifiedScore }

        // Guard against division by zero
        let hours = productionRate > 0
            ? totalScore / productionRate
            : 0.0

        return StumpGrindingResult(
            totalStumpScore: totalScore,
            stumpBreakdown: breakdown,
            productionHours: hours
        )
    }

    // MARK: - Land Clearing Calculations (ClearingScore System)

    enum ClearingDensity: String, CaseIterable {
        case light = "Light"
        case average = "Average"
        case heavy = "Heavy"

        var description: String {
            switch self {
            case .light: return "Sparse vegetation, mostly brush"
            case .average: return "Typical residential density"
            case .heavy: return "Dense overgrowth, extensive work"
            }
        }

        var multiplier: Double {
            switch self {
            case .light: return 0.7
            case .average: return 1.0
            case .heavy: return 1.3
            }
        }
    }

    struct ClearingScoreParams {
        let acres: Double
        let density: ClearingDensity
        let afissMultiplier: Double // Combined AFISS factors (default 1.0)
    }

    struct ClearingScoreResult {
        let baseClearingScore: Double
        let adjustedClearingScore: Double
        let excavatorHours: Double
        let grubbingHours: Double
        let totalWorkHours: Double
        let excavatorDays: Int
        let grubbingDays: Int
        let totalDays: Int
    }

    static func calculateClearingScore(_ params: ClearingScoreParams) -> ClearingScoreResult {
        // STEP 1: Calculate ClearingScore
        // Base = Acres (1 acre = 1 ClearingScore point)
        let baseScore = params.acres

        // Apply density and AFISS multipliers
        let adjustedScore = baseScore * params.density.multiplier * params.afissMultiplier

        // STEP 2: Calculate Work Hours
        // Excavator: 16 hours per ClearingScore point (2 days × 8 hrs)
        // Grubbing: 8 hours per ClearingScore point (1 day × 8 hrs)
        let excavatorHours = adjustedScore * 16.0
        let grubbingHours = adjustedScore * 8.0
        let totalWorkHours = excavatorHours + grubbingHours

        // STEP 3: Convert to Days for Display (scheduling)
        let excavatorDays = Int(ceil(excavatorHours / 8.0))
        let grubbingDays = Int(ceil(grubbingHours / 8.0))
        let totalDays = Int(ceil(totalWorkHours / 8.0))

        return ClearingScoreResult(
            baseClearingScore: baseScore,
            adjustedClearingScore: adjustedScore,
            excavatorHours: excavatorHours,
            grubbingHours: grubbingHours,
            totalWorkHours: totalWorkHours,
            excavatorDays: excavatorDays,
            grubbingDays: grubbingDays,
            totalDays: totalDays
        )
    }

    // Two-Phase Land Clearing Pricing
    struct ClearingPricingParams {
        let clearingScore: ClearingScoreResult
        let excavatorLoadoutCostPerHour: Double
        let excavatorRentalCostPerHour: Double // e.g., $1500/day ÷ 8 hrs = $187.50/hr
        let grubbingLoadoutCostPerHour: Double
        let truckLoads: Int // Debris removal (default: acres × 2.5)
        let costPerTruckLoad: Double // Default: $700
        let excavatorMargin: Double // 0.50 = 50%
        let grubbingMargin: Double // 0.50 = 50%
        let debrisMargin: Double // 0.50 = 50%
    }

    struct ClearingPricingResult {
        // Excavator Phase
        let excavatorEquipmentCost: Double
        let excavatorRentalCost: Double
        let excavatorTotalCost: Double
        let excavatorPrice: Double

        // Grubbing Phase
        let grubbingCost: Double
        let grubbingPrice: Double

        // Debris Removal
        let debrisCost: Double
        let debrisPrice: Double

        // Totals
        let totalCost: Double
        let totalPrice: Double
        let totalProfit: Double
        let profitMargin: Double
    }

    static func calculateClearingPricing(_ params: ClearingPricingParams) -> ClearingPricingResult {
        // Excavator Phase Costs
        let excavatorEquipmentCost = params.clearingScore.excavatorHours * params.excavatorLoadoutCostPerHour
        let excavatorRentalCost = params.clearingScore.excavatorHours * params.excavatorRentalCostPerHour
        let excavatorTotalCost = excavatorEquipmentCost + excavatorRentalCost

        // Grubbing Phase Costs
        let grubbingCost = params.clearingScore.grubbingHours * params.grubbingLoadoutCostPerHour

        // Debris Removal Costs
        let debrisCost = Double(params.truckLoads) * params.costPerTruckLoad

        // Total Costs
        let totalCost = excavatorTotalCost + grubbingCost + debrisCost

        // Calculate Prices (using margin formula: Price = Cost ÷ (1 - Margin))
        // Guard against division by zero (margin must be < 1.0)
        let excavatorPrice = params.excavatorMargin < 1.0
            ? excavatorTotalCost / (1 - params.excavatorMargin)
            : excavatorTotalCost
        let grubbingPrice = params.grubbingMargin < 1.0
            ? grubbingCost / (1 - params.grubbingMargin)
            : grubbingCost
        let debrisPrice = params.debrisMargin < 1.0
            ? debrisCost / (1 - params.debrisMargin)
            : debrisCost

        // Total Price and Profit
        let totalPrice = excavatorPrice + grubbingPrice + debrisPrice
        let totalProfit = totalPrice - totalCost

        // Guard against division by zero
        let profitMargin = totalPrice > 0
            ? totalProfit / totalPrice
            : 0.0

        return ClearingPricingResult(
            excavatorEquipmentCost: excavatorEquipmentCost,
            excavatorRentalCost: excavatorRentalCost,
            excavatorTotalCost: excavatorTotalCost,
            excavatorPrice: excavatorPrice,
            grubbingCost: grubbingCost,
            grubbingPrice: grubbingPrice,
            debrisCost: debrisCost,
            debrisPrice: debrisPrice,
            totalCost: totalCost,
            totalPrice: totalPrice,
            totalProfit: totalProfit,
            profitMargin: profitMargin
        )
    }

    // Helper: Estimate truck loads from acreage
    static func estimateTruckLoads(acres: Double, loadsPerAcre: Double = 2.5) -> Int {
        return Int(ceil(acres * loadsPerAcre))
    }

    // MARK: - Tree Service Calculations

    struct TreeParams {
        let height: Double // feet
        let dbh: Double // Diameter at Breast Height in inches
        let canopyRadius: Double // feet
    }

    struct TreeRemovalResult {
        let treeScore: Double
        let description: String
    }

    /// Calculate TreeScore using exponential formula: H × (DBH÷12)² × CR²
    /// DBH is entered in inches but must be converted to feet for calculation
    static func calculateTreeScore(height: Double, dbh: Double, canopyRadius: Double) -> Double {
        let dbhInFeet = dbh / 12.0
        return height * (dbhInFeet * dbhInFeet) * (canopyRadius * canopyRadius)
    }

    /// Calculate TreeScore for a single tree
    static func calculateTreeRemoval(_ tree: TreeParams) -> TreeRemovalResult {
        let score = calculateTreeScore(height: tree.height, dbh: tree.dbh, canopyRadius: tree.canopyRadius)

        let desc = String(format: "%.0f' tall × %.1f\" DBH × %.0f' canopy = %.0f points",
                         tree.height, tree.dbh, tree.canopyRadius, score)

        return TreeRemovalResult(treeScore: score, description: desc)
    }

    /// Calculate total TreeScore for multiple trees
    static func calculateMultiTreeRemoval(trees: [TreeParams], productionRate: Double = 250) -> (totalScore: Double, productionHours: Double) {
        let totalScore = trees.reduce(0) { sum, tree in
            sum + calculateTreeScore(height: tree.height, dbh: tree.dbh, canopyRadius: tree.canopyRadius)
        }

        // Guard against division by zero
        let hours = productionRate > 0
            ? totalScore / productionRate
            : 0.0

        return (totalScore, hours)
    }

    struct TreeTrimmingResult {
        let trimScore: Double
        let fullTreeScore: Double
        let trimPercentage: Double
        let description: String
    }

    /// Calculate TrimScore for tree trimming jobs
    /// - Parameters:
    ///   - tree: Tree measurements
    ///   - trimPercentage: Percentage of canopy being removed (0.0 - 1.0)
    ///   - Returns: Trim score and description
    static func calculateTreeTrimming(tree: TreeParams, trimPercentage: Double) -> TreeTrimmingResult {
        let fullScore = calculateTreeScore(height: tree.height, dbh: tree.dbh, canopyRadius: tree.canopyRadius)
        let trimScore = fullScore * trimPercentage

        let desc = String(format: "%.0f' tall × %.1f\" DBH × %.0f' canopy × %.0f%% trim = %.0f points",
                         tree.height, tree.dbh, tree.canopyRadius, trimPercentage * 100, trimScore)

        return TreeTrimmingResult(
            trimScore: trimScore,
            fullTreeScore: fullScore,
            trimPercentage: trimPercentage,
            description: desc
        )
    }

    /// Calculate total trim work for multiple trees
    static func calculateMultiTreeTrimming(trees: [TreeParams], trimPercentage: Double, productionRate: Double = 250) -> (totalScore: Double, productionHours: Double) {
        let totalScore = trees.reduce(0) { sum, tree in
            let fullScore = calculateTreeScore(height: tree.height, dbh: tree.dbh, canopyRadius: tree.canopyRadius)
            return sum + (fullScore * trimPercentage)
        }

        // Guard against division by zero
        let hours = productionRate > 0
            ? totalScore / productionRate
            : 0.0

        return (totalScore, hours)
    }

    /// Get trim intensity factor from percentage
    /// Light (10-15%): 0.3, Medium (20-30%): 0.5, Heavy (40-50%): 0.8
    static func getTrimIntensityFactor(from percentage: Double) -> Double {
        switch percentage {
        case 0.10...0.15:
            return 0.3
        case 0.20...0.30:
            return 0.5
        case 0.40...0.50:
            return 0.8
        default:
            return percentage // Use actual percentage if not in standard range
        }
    }

    // MARK: - Complete Project Pricing

    struct ProjectPricingParams {
        let productionHours: Double
        let loadoutCostPerHour: Double
        let billingRatePerHour: Double
        let driveTimeOneWay: Double // hours
        let transportRate: Double // default 0.5 (50% for mulching), 0.3 for stumps
        let bufferPercent: Double // default 0.1 (10%)
    }

    struct ProjectPricingResult {
        let productionHours: Double
        let transportHours: Double
        let bufferHours: Double
        let totalHours: Double
        let totalCost: Double
        let totalPrice: Double
        let totalProfit: Double
        let profitMargin: Double
    }

    static func calculateProjectPricing(_ params: ProjectPricingParams) -> ProjectPricingResult {
        // Transport is round trip at reduced rate
        let transportHours = (params.driveTimeOneWay * 2.0) * params.transportRate

        // Buffer on production + transport
        let bufferHours = (params.productionHours + transportHours) * params.bufferPercent

        let totalHours = params.productionHours + transportHours + bufferHours

        let totalCost = totalHours * params.loadoutCostPerHour
        let totalPrice = totalHours * params.billingRatePerHour
        let totalProfit = totalPrice - totalCost

        // Guard against division by zero
        let profitMargin = totalPrice > 0
            ? totalProfit / totalPrice
            : 0.0

        return ProjectPricingResult(
            productionHours: params.productionHours,
            transportHours: transportHours,
            bufferHours: bufferHours,
            totalHours: totalHours,
            totalCost: totalCost,
            totalPrice: totalPrice,
            totalProfit: totalProfit,
            profitMargin: profitMargin
        )
    }

    // MARK: - Billing Rate Calculations

    static func calculateBillingRate(loadoutCost: Double, targetMargin: Double) -> Double {
        // Formula: Billing Rate = Cost ÷ (1 - Margin%)
        // Guard against division by zero (margin must be < 1.0)
        return targetMargin < 1.0
            ? loadoutCost / (1 - targetMargin)
            : loadoutCost
    }

    static func calculatePriceRange(
        totalHours: Double,
        loadoutCostPerHour: Double,
        lowMargin: Double = 0.30,
        highMargin: Double = 0.60
    ) -> (low: Double, high: Double) {
        let lowRate = calculateBillingRate(loadoutCost: loadoutCostPerHour, targetMargin: lowMargin)
        let highRate = calculateBillingRate(loadoutCost: loadoutCostPerHour, targetMargin: highMargin)

        return (
            low: totalHours * lowRate,
            high: totalHours * highRate
        )
    }

    // MARK: - Hydraulic Flow Production Rate Calculation

    /// Calculate mulching production rate from hydraulic flow (GPM)
    /// Formula: R = (Q/30)^1.58 where Q = GPM
    /// Based on TreeShop research: https://www.treeshop.app/articles/12
    /// Benchmarks: 30 GPM = 1.0 PpH, 34 GPM = 1.3 PpH, 40 GPM = 2.0 PpH
    static func calculateProductionRateFromGPM(gpm: Double) -> Double {
        return pow(gpm / 30.0, 1.58)
    }

    // MARK: - Utility Functions

    static func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: value)) ?? "$0.00"
    }

    static func formatHours(_ hours: Double) -> String {
        return String(format: "%.1f hrs", hours)
    }

    static func formatMiles(_ miles: Double) -> String {
        return String(format: "%.1f mi", miles)
    }

    static func formatPercentage(_ value: Double) -> String {
        return String(format: "%.1f%%", value * 100)
    }

    static func formatScore(_ score: Double) -> String {
        if score >= 1_000_000 {
            return String(format: "%.2fM", score / 1_000_000)
        } else if score >= 1_000 {
            return String(format: "%.1fK", score / 1_000)
        } else {
            return String(format: "%.0f", score)
        }
    }
}
