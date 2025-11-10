//
//  PricingEngine.swift
//  TreeShop
//
//  Centralized pricing calculation engine for all service types
//  Used by calculators and proposal builder to create line items
//

import Foundation
import SwiftData

/// Result of a pricing calculation, ready to become a ProposalLineItem
struct PricingCalculationResult {
    let serviceType: ServiceType
    let description: String
    let treeShopScore: Double
    let productionHours: Double
    let transportHours: Double
    let bufferHours: Double
    let totalHours: Double
    let hourlyRate: Double
    let totalCost: Double
    let lineTotal: Double
    let loadoutId: UUID
    let loadoutName: String
    let loadoutMargin: Double
    let driveTimeOneWay: Double

    // Additional resources for scaling
    var additionalEquipmentIds: [UUID]?
    var additionalEmployeeIds: [UUID]?
    var additionalCostPerHour: Double?

    // Service-specific parameters
    var mulchingAcres: Double?
    var mulchingDBHPackage: Int?
    var stumpData: String?

    // Land clearing specific (new formula)
    var debrisTrucks: Int?
    var debrisHaulingCost: Double?
    var laborCost: Double?
    var clearingAcreage: Double?
    var clearingTreeSize: String?
    var clearingDensity: String?

    // Legacy land clearing (will be removed)
    var clearingProjectType: String?
    var clearingIntensity: String?

    // Polygon data (for all services that use area)
    var polygonCoordinatesJSON: String?
    var polygonArea: Double?
    var polygonColor: String?
}

/// Main pricing calculation engine
class PricingEngine {

    // MARK: - Loadout Scaling Helpers

    /// Calculate additional cost from extra equipment/employees
    static func calculateAdditionalCost(
        equipmentIds: Set<UUID>,
        employeeIds: Set<UUID>,
        allEquipment: [Equipment],
        allEmployees: [Employee]
    ) -> Double {
        let equipmentCost = allEquipment
            .filter { equipmentIds.contains($0.id) }
            .reduce(0) { $0 + $1.totalCostPerHour }

        let laborCost = allEmployees
            .filter { employeeIds.contains($0.id) }
            .reduce(0) { $0 + $1.trueCostPerHour }

        return equipmentCost + laborCost
    }

    /// Calculate scaled billing rate with additional resources
    static func calculateScaledBillingRate(
        baseLoadoutCost: Double,
        additionalCost: Double,
        margin: Double
    ) -> Double {
        let totalCost = baseLoadoutCost + additionalCost
        return PricingFormulas.calculateBillingRate(loadoutCost: totalCost, targetMargin: margin)
    }

    // MARK: - Forestry Mulching Calculations

    static func calculateMulching(
        acres: Double,
        dbhPackage: Int,
        loadout: Loadout,
        driveTimeMinutes: Double,
        additionalCostPerHour: Double = 0,
        additionalEquipmentIds: [UUID]? = nil,
        additionalEmployeeIds: [UUID]? = nil,
        afissMultiplier: Double = 1.0,
        polygonCoordinatesJSON: String? = nil,
        polygonArea: Double? = nil,
        polygonColor: String? = nil
    ) -> PricingCalculationResult {

        // TreeShop Score = Acres × DBH Package × AFISS Multiplier
        let baseScore = Double(dbhPackage) * acres
        let treeShopScore = baseScore * afissMultiplier

        // Production Hours = TreeShop Score ÷ PpH
        let productionHours = treeShopScore / loadout.productionRate

        // Transport Hours = (One-Way × 2) × 0.5
        let driveTimeHours = driveTimeMinutes / 60.0
        let transportHours = (driveTimeHours * 2.0) * 0.5

        // Buffer Hours = (Production + Transport) × 0.10
        let bufferHours = (productionHours + transportHours) * 0.10

        // Total Hours
        let totalHours = productionHours + transportHours + bufferHours

        // Cost and Price (with optional scaling)
        let scaledLoadoutCost = loadout.totalLoadoutCostPerHour + additionalCostPerHour
        let hourlyRate = additionalCostPerHour > 0
            ? calculateScaledBillingRate(
                baseLoadoutCost: loadout.totalLoadoutCostPerHour,
                additionalCost: additionalCostPerHour,
                margin: loadout.selectedMargin
            )
            : loadout.billingRate

        let totalCost = totalHours * scaledLoadoutCost
        let lineTotal = totalHours * hourlyRate

        var description = String(format: "%.1f acres forestry mulching (up to %d\" DBH)", acres, dbhPackage)
        if additionalCostPerHour > 0 {
            description += " - Scaled loadout"
        }

        return PricingCalculationResult(
            serviceType: .mulching,
            description: description,
            treeShopScore: treeShopScore,
            productionHours: productionHours,
            transportHours: transportHours,
            bufferHours: bufferHours,
            totalHours: totalHours,
            hourlyRate: hourlyRate,
            totalCost: totalCost,
            lineTotal: lineTotal,
            loadoutId: loadout.id,
            loadoutName: loadout.loadoutName,
            loadoutMargin: loadout.selectedMargin,
            driveTimeOneWay: driveTimeHours,
            additionalEquipmentIds: additionalEquipmentIds,
            additionalEmployeeIds: additionalEmployeeIds,
            additionalCostPerHour: additionalCostPerHour > 0 ? additionalCostPerHour : nil,
            mulchingAcres: acres,
            mulchingDBHPackage: dbhPackage,
            polygonCoordinatesJSON: polygonCoordinatesJSON,
            polygonArea: polygonArea,
            polygonColor: polygonColor
        )
    }

    // MARK: - Stump Grinding Calculations

    struct StumpConfig: Codable {
        var diameter: Double
        var heightAbove: Double
        var depthBelow: Double
        var isHardwood: Bool
        var hasRootFlare: Bool
        var isRotten: Bool
        var hasRocks: Bool
        var tightSpace: Bool

        var stumpScore: Double {
            var baseScore = diameter * diameter * (heightAbove + depthBelow)

            // Apply modifiers
            if isHardwood { baseScore *= 1.15 }
            if hasRootFlare { baseScore *= 1.2 }
            if isRotten { baseScore *= 0.85 }
            if hasRocks { baseScore *= 1.1 }
            if tightSpace { baseScore *= 1.15 }

            return baseScore
        }
    }

    static func calculateStumpGrinding(
        stumps: [StumpConfig],
        loadout: Loadout,
        driveTimeMinutes: Double,
        additionalCostPerHour: Double = 0,
        additionalEquipmentIds: [UUID]? = nil,
        additionalEmployeeIds: [UUID]? = nil
    ) -> PricingCalculationResult {

        // Total StumpScore
        let totalStumpScore = stumps.reduce(0) { $0 + $1.stumpScore }

        // Production Hours = StumpScore ÷ pts/hr
        var productionHours = totalStumpScore / loadout.productionRate

        // Enforce 2-hour minimum
        productionHours = max(productionHours, 2.0)

        // Transport Hours = (One-Way × 2) × 0.3 (smaller trailer)
        let driveTimeHours = driveTimeMinutes / 60.0
        let transportHours = (driveTimeHours * 2.0) * 0.3

        // Buffer Hours = (Production + Transport) × 0.10
        let bufferHours = (productionHours + transportHours) * 0.10

        // Total Hours
        let totalHours = productionHours + transportHours + bufferHours

        // Cost and Price (with optional scaling)
        let scaledLoadoutCost = loadout.totalLoadoutCostPerHour + additionalCostPerHour
        let hourlyRate = additionalCostPerHour > 0
            ? calculateScaledBillingRate(
                baseLoadoutCost: loadout.totalLoadoutCostPerHour,
                additionalCost: additionalCostPerHour,
                margin: loadout.selectedMargin
            )
            : loadout.billingRate

        let totalCost = totalHours * scaledLoadoutCost
        let lineTotal = totalHours * hourlyRate

        var description = "\(stumps.count) stump\(stumps.count == 1 ? "" : "s") ground below grade"
        if additionalCostPerHour > 0 {
            description += " - Scaled loadout"
        }

        // Encode stump data as JSON
        let encoder = JSONEncoder()
        let stumpData = try? encoder.encode(stumps)
        let stumpDataString = stumpData.map { String(data: $0, encoding: .utf8) }?.flatMap { $0 }

        return PricingCalculationResult(
            serviceType: .stumpGrinding,
            description: description,
            treeShopScore: totalStumpScore,
            productionHours: productionHours,
            transportHours: transportHours,
            bufferHours: bufferHours,
            totalHours: totalHours,
            hourlyRate: hourlyRate,
            totalCost: totalCost,
            lineTotal: lineTotal,
            loadoutId: loadout.id,
            loadoutName: loadout.loadoutName,
            loadoutMargin: loadout.selectedMargin,
            driveTimeOneWay: driveTimeHours,
            additionalEquipmentIds: additionalEquipmentIds,
            additionalEmployeeIds: additionalEmployeeIds,
            additionalCostPerHour: additionalCostPerHour > 0 ? additionalCostPerHour : nil,
            stumpData: stumpDataString
        )
    }

    // MARK: - Land Clearing Calculations

    enum TreeSize: String, Codable, CaseIterable {
        case small = "Small (6-12\")"
        case medium = "Medium (14-18\")"
        case large = "Large (20-30\")"
    }

    enum LandClearingDensity: String, Codable, CaseIterable {
        case light = "Light"
        case moderate = "Moderate"
        case heavy = "Heavy"

        func multipliers(for treeSize: TreeSize) -> (time: Double, debrisPerAcre: Double) {
            switch (treeSize, self) {
            case (.small, .light):      return (0.7, 12.0)
            case (.small, .moderate):   return (0.8, 14.0)
            case (.small, .heavy):      return (0.9, 16.0)
            case (.medium, .light):     return (0.9, 15.0)
            case (.medium, .moderate):  return (1.0, 17.5)
            case (.medium, .heavy):     return (1.1, 20.0)
            case (.large, .light):      return (1.1, 20.0)
            case (.large, .moderate):   return (1.3, 23.0)
            case (.large, .heavy):      return (1.4, 25.0)
            }
        }
    }

    static func calculateLandClearing(
        acreage: Double,
        treeSize: TreeSize,
        density: LandClearingDensity,
        loadout: Loadout,
        driveTimeMinutes: Double,
        debrisHaulingCostPerTruck: Double = 700.0,
        additionalCostPerHour: Double = 0,
        additionalEquipmentIds: [UUID]? = nil,
        additionalEmployeeIds: [UUID]? = nil,
        polygonCoordinatesJSON: String? = nil,
        polygonArea: Double? = nil,
        polygonColor: String? = nil
    ) -> PricingCalculationResult {

        // Get multipliers from lookup table
        let multipliers = density.multipliers(for: treeSize)
        let timeMultiplier = multipliers.time
        let debrisPerAcre = multipliers.debrisPerAcre

        // Production Hours = Acreage × 40 hrs/acre × Time Multiplier
        let baseHoursPerAcre = 40.0
        let productionHours = acreage * baseHoursPerAcre * timeMultiplier

        // Debris Hauling Calculation
        let totalDebrisTrucks = acreage * debrisPerAcre
        let debrisHaulingCost = totalDebrisTrucks * debrisHaulingCostPerTruck

        // Transport Hours = (One-Way × 2) × 0.5
        let driveTimeHours = driveTimeMinutes / 60.0
        let transportHours = (driveTimeHours * 2.0) * 0.5

        // Buffer Hours = (Production + Transport) × 0.10
        let bufferHours = (productionHours + transportHours) * 0.10

        // Total Hours
        let totalHours = productionHours + transportHours + bufferHours

        // Cost Calculation (with optional scaling for additional equipment/employees)
        let scaledLoadoutCost = loadout.totalLoadoutCostPerHour + additionalCostPerHour
        let hourlyRate = additionalCostPerHour > 0
            ? calculateScaledBillingRate(
                baseLoadoutCost: loadout.totalLoadoutCostPerHour,
                additionalCost: additionalCostPerHour,
                margin: loadout.selectedMargin
            )
            : loadout.billingRate

        // Labor Cost + Debris Cost
        let laborCost = totalHours * scaledLoadoutCost
        let totalCost = laborCost + debrisHaulingCost

        // Line Total (apply loadout's margin rate to total cost including debris)
        let lineTotal = totalCost / (1.0 - loadout.selectedMargin)

        var description = String(format: "Land clearing & grubbing: %.2f acres, %@ trees, %@ density. Includes debris removal (~%d truck loads).", acreage, treeSize.rawValue, density.rawValue, Int(ceil(totalDebrisTrucks)))
        if additionalCostPerHour > 0 {
            description += " - Scaled loadout"
        }

        return PricingCalculationResult(
            serviceType: .clearing,
            description: description,
            treeShopScore: productionHours, // Store production hours as score
            productionHours: productionHours,
            transportHours: transportHours,
            bufferHours: bufferHours,
            totalHours: totalHours,
            hourlyRate: hourlyRate,
            totalCost: totalCost,
            lineTotal: lineTotal,
            loadoutId: loadout.id,
            loadoutName: loadout.loadoutName,
            loadoutMargin: loadout.selectedMargin,
            driveTimeOneWay: driveTimeHours,
            additionalEquipmentIds: additionalEquipmentIds,
            additionalEmployeeIds: additionalEmployeeIds,
            additionalCostPerHour: additionalCostPerHour > 0 ? additionalCostPerHour : nil,
            debrisTrucks: Int(ceil(totalDebrisTrucks)),
            debrisHaulingCost: debrisHaulingCost,
            laborCost: laborCost,
            clearingAcreage: acreage,
            clearingTreeSize: treeSize.rawValue,
            clearingDensity: density.rawValue,
            polygonCoordinatesJSON: polygonCoordinatesJSON,
            polygonArea: polygonArea,
            polygonColor: polygonColor
        )
    }

    // MARK: - Tree Removal Calculations

    static func calculateTreeRemoval(
        trees: [Tree],
        loadout: Loadout,
        driveTimeMinutes: Double,
        additionalCostPerHour: Double = 0,
        additionalEquipmentIds: [UUID]? = nil,
        additionalEmployeeIds: [UUID]? = nil,
        afissMultiplier: Double = 1.0
    ) -> PricingCalculationResult {

        // Total TreeScore = Sum of all tree scores × AFISS Multiplier
        let baseTreeScore = trees.reduce(0) { $0 + $1.treeScore }
        let totalTreeScore = baseTreeScore * afissMultiplier

        // Production Hours = TreeScore ÷ PpH (default 250 pts/hr)
        let productionHours = totalTreeScore / loadout.productionRate

        // Transport Hours = (One-Way × 2) × 0.5
        let driveTimeHours = driveTimeMinutes / 60.0
        let transportHours = (driveTimeHours * 2.0) * 0.5

        // Buffer Hours = (Production + Transport) × 0.10
        let bufferHours = (productionHours + transportHours) * 0.10

        // Total Hours
        let totalHours = productionHours + transportHours + bufferHours

        // Cost and Price (with optional scaling)
        let scaledLoadoutCost = loadout.totalLoadoutCostPerHour + additionalCostPerHour
        let hourlyRate = additionalCostPerHour > 0
            ? calculateScaledBillingRate(
                baseLoadoutCost: loadout.totalLoadoutCostPerHour,
                additionalCost: additionalCostPerHour,
                margin: loadout.selectedMargin
            )
            : loadout.billingRate

        let totalCost = totalHours * scaledLoadoutCost
        let lineTotal = totalHours * hourlyRate

        var description = "\(trees.count) tree\(trees.count == 1 ? "" : "s") removal"
        if additionalCostPerHour > 0 {
            description += " - Scaled loadout"
        }

        // Encode tree IDs as JSON
        let treeIds = trees.map { $0.id }
        let encoder = JSONEncoder()
        let treeData = try? encoder.encode(treeIds)
        _ = treeData.map { String(data: $0, encoding: .utf8) ?? "" }

        return PricingCalculationResult(
            serviceType: .treeRemoval,
            description: description,
            treeShopScore: totalTreeScore,
            productionHours: productionHours,
            transportHours: transportHours,
            bufferHours: bufferHours,
            totalHours: totalHours,
            hourlyRate: hourlyRate,
            totalCost: totalCost,
            lineTotal: lineTotal,
            loadoutId: loadout.id,
            loadoutName: loadout.loadoutName,
            loadoutMargin: loadout.selectedMargin,
            driveTimeOneWay: driveTimeHours,
            additionalEquipmentIds: additionalEquipmentIds,
            additionalEmployeeIds: additionalEmployeeIds,
            additionalCostPerHour: additionalCostPerHour > 0 ? additionalCostPerHour : nil
        )
    }

    // MARK: - Tree Trimming Calculations

    static func calculateTreeTrimming(
        trees: [Tree],
        trimPercentage: Double,
        loadout: Loadout,
        driveTimeMinutes: Double,
        additionalCostPerHour: Double = 0,
        additionalEquipmentIds: [UUID]? = nil,
        additionalEmployeeIds: [UUID]? = nil,
        afissMultiplier: Double = 1.0
    ) -> PricingCalculationResult {

        // Total TreeScore = Sum of all tree scores × Trim% × AFISS Multiplier
        let baseTreeScore = trees.reduce(0) { $0 + $1.treeScore }
        let trimScore = baseTreeScore * trimPercentage
        let totalTrimScore = trimScore * afissMultiplier

        // Production Hours = TrimScore ÷ PpH (default 300 pts/hr for trimming)
        let productionHours = totalTrimScore / loadout.productionRate

        // Transport Hours = (One-Way × 2) × 0.5
        let driveTimeHours = driveTimeMinutes / 60.0
        let transportHours = (driveTimeHours * 2.0) * 0.5

        // Buffer Hours = (Production + Transport) × 0.10
        let bufferHours = (productionHours + transportHours) * 0.10

        // Total Hours
        let totalHours = productionHours + transportHours + bufferHours

        // Cost and Price (with optional scaling)
        let scaledLoadoutCost = loadout.totalLoadoutCostPerHour + additionalCostPerHour
        let hourlyRate = additionalCostPerHour > 0
            ? calculateScaledBillingRate(
                baseLoadoutCost: loadout.totalLoadoutCostPerHour,
                additionalCost: additionalCostPerHour,
                margin: loadout.selectedMargin
            )
            : loadout.billingRate

        let totalCost = totalHours * scaledLoadoutCost
        let lineTotal = totalHours * hourlyRate

        let trimIntensity = trimPercentage < 0.15 ? "Light" : (trimPercentage < 0.30 ? "Medium" : "Heavy")
        var description = "\(trees.count) tree\(trees.count == 1 ? "" : "s") trimming (\(trimIntensity) - \(Int(trimPercentage * 100))%)"
        if additionalCostPerHour > 0 {
            description += " - Scaled loadout"
        }

        // Encode tree IDs as JSON
        let treeIds = trees.map { $0.id }
        let encoder = JSONEncoder()
        let treeData = try? encoder.encode(treeIds)
        _ = treeData.map { String(data: $0, encoding: .utf8) ?? "" }

        return PricingCalculationResult(
            serviceType: .treeTrimming,
            description: description,
            treeShopScore: totalTrimScore,
            productionHours: productionHours,
            transportHours: transportHours,
            bufferHours: bufferHours,
            totalHours: totalHours,
            hourlyRate: hourlyRate,
            totalCost: totalCost,
            lineTotal: lineTotal,
            loadoutId: loadout.id,
            loadoutName: loadout.loadoutName,
            loadoutMargin: loadout.selectedMargin,
            driveTimeOneWay: driveTimeHours,
            additionalEquipmentIds: additionalEquipmentIds,
            additionalEmployeeIds: additionalEmployeeIds,
            additionalCostPerHour: additionalCostPerHour > 0 ? additionalCostPerHour : nil
        )
    }

    // MARK: - Helper to Create ProposalLineItem from Result

    static func createLineItem(
        from result: PricingCalculationResult,
        lineNumber: Int,
        proposal: Proposal
    ) -> ProposalLineItem {
        return ProposalLineItem(
            lineNumber: lineNumber,
            serviceType: result.serviceType,
            lineDescription: result.description,
            mulchingAcres: result.mulchingAcres,
            mulchingDBHPackage: result.mulchingDBHPackage,
            stumpData: result.stumpData,
            clearingProjectType: result.clearingProjectType,
            clearingIntensity: result.clearingIntensity,
            loadoutId: result.loadoutId,
            loadoutName: result.loadoutName,
            loadoutMargin: result.loadoutMargin,
            driveTimeOneWay: result.driveTimeOneWay,
            productionHours: result.productionHours,
            transportHours: result.transportHours,
            bufferHours: result.bufferHours,
            totalHours: result.totalHours,
            hourlyRate: result.hourlyRate,
            totalCost: result.totalCost,
            lineTotal: result.lineTotal,
            proposal: proposal
        )
    }
}
