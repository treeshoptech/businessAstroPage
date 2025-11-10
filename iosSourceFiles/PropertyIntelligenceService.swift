//
//  PropertyIntelligenceService.swift
//  TreeShop
//
//  Analyzes property data to generate actionable insights for tree service work
//  Provides natural language summaries, risk assessment, and recommendations
//

import Foundation
import CoreLocation

// MARK: - Intelligence Report Types

struct PropertyIntelligenceReport {
    let summary: String
    let riskLevel: RiskLevel
    let keyInsights: [PropertyInsight]
    let recommendations: [String]
    let warnings: [String]
    let opportunities: [String]
    let estimatedComplexity: Double // AFISS multiplier suggestion
    let confidenceScore: Double // 0.0 - 1.0 based on data quality
    let generatedAt: Date

    enum RiskLevel: String {
        case low = "Low Risk"
        case medium = "Medium Risk"
        case high = "High Risk"
        case veryHigh = "Very High Risk"

        var color: String {
            switch self {
            case .low: return "green"
            case .medium: return "yellow"
            case .high: return "orange"
            case .veryHigh: return "red"
            }
        }

        var icon: String {
            switch self {
            case .low: return "checkmark.shield.fill"
            case .medium: return "exclamationmark.shield.fill"
            case .high: return "exclamationmark.triangle.fill"
            case .veryHigh: return "xmark.shield.fill"
            }
        }
    }
}

struct PropertyInsight {
    let category: InsightCategory
    let title: String
    let description: String
    let impact: ImpactLevel
    let actionable: Bool

    enum InsightCategory: String {
        case access = "Access"
        case environmental = "Environmental"
        case legal = "Legal/Restrictions"
        case infrastructure = "Infrastructure"
        case safety = "Safety"
        case financial = "Financial"
        case operational = "Operational"
    }

    enum ImpactLevel: String {
        case positive = "Positive"
        case neutral = "Neutral"
        case concern = "Concern"
        case critical = "Critical"

        var color: String {
            switch self {
            case .positive: return "green"
            case .neutral: return "blue"
            case .concern: return "orange"
            case .critical: return "red"
            }
        }
    }
}

// MARK: - Property Intelligence Service

@MainActor
class PropertyIntelligenceService: ObservableObject {
    // MARK: - Singleton
    static let shared = PropertyIntelligenceService()

    // MARK: - Published Properties
    @Published var lastReport: PropertyIntelligenceReport?
    @Published var isAnalyzing = false

    private init() {}

    // MARK: - Public Analysis Methods

    /// Generate comprehensive intelligence report for property
    func analyzeProperty(_ property: PropertyBoundary) -> PropertyIntelligenceReport {
        isAnalyzing = true
        defer { isAnalyzing = false }

        // Collect all insights
        var insights: [PropertyInsight] = []
        var warnings: [String] = []
        var recommendations: [String] = []
        var opportunities: [String] = []

        // Access analysis
        insights.append(contentsOf: analyzeAccess(property))

        // Environmental analysis
        insights.append(contentsOf: analyzeEnvironmental(property))

        // Legal and restrictions
        insights.append(contentsOf: analyzeLegalRestrictions(property))

        // Infrastructure
        insights.append(contentsOf: analyzeInfrastructure(property))

        // Safety concerns
        insights.append(contentsOf: analyzeSafety(property))

        // Financial considerations
        insights.append(contentsOf: analyzeFinancial(property))

        // Easement analysis
        if let easements = property.easements, !easements.isEmpty {
            insights.append(contentsOf: analyzeEasements(easements))
        }

        // Extract warnings, recommendations, and opportunities from insights
        for insight in insights {
            switch insight.impact {
            case .critical:
                warnings.append("[\(insight.category.rawValue)] \(insight.title): \(insight.description)")
            case .concern:
                recommendations.append("\(insight.title) - \(insight.description)")
            case .positive:
                opportunities.append(insight.description)
            case .neutral:
                break
            }
        }

        // Calculate overall risk level
        let riskLevel = calculateRiskLevel(insights: insights, property: property)

        // Generate summary
        let summary = generateSummary(property: property, insights: insights, riskLevel: riskLevel)

        // Calculate estimated complexity (AFISS multiplier)
        let complexity = property.suggestedAFISSMultiplier

        // Confidence score from data quality
        let confidence = property.dataQualityScore

        let report = PropertyIntelligenceReport(
            summary: summary,
            riskLevel: riskLevel,
            keyInsights: insights,
            recommendations: recommendations,
            warnings: warnings,
            opportunities: opportunities,
            estimatedComplexity: complexity,
            confidenceScore: confidence,
            generatedAt: Date()
        )

        lastReport = report
        return report
    }

    // MARK: - Private Analysis Methods

    private func analyzeAccess(_ property: PropertyBoundary) -> [PropertyInsight] {
        var insights: [PropertyInsight] = []

        // Gate width
        if property.hasNarrowGate || property.gateWidth < 8 {
            insights.append(PropertyInsight(
                category: .access,
                title: "Narrow Gate Access",
                description: "Gate width \(String(format: "%.1f", property.gateWidth)) ft may limit equipment options. Consider compact machinery or hand work.",
                impact: .concern,
                actionable: true
            ))
        }

        // No equipment access
        if property.requiresHandCarry {
            insights.append(PropertyInsight(
                category: .access,
                title: "Hand-Carry Only Access",
                description: "No equipment access available. All work must be done with hand tools. Significant labor increase expected.",
                impact: .critical,
                actionable: true
            ))
        }

        // Soft ground
        if property.hasSoftGround {
            insights.append(PropertyInsight(
                category: .access,
                title: "Soft/Muddy Ground Conditions",
                description: "Ground conditions may limit heavy equipment. Consider ground protection or tracked machinery.",
                impact: .concern,
                actionable: true
            ))
        }

        // Road access
        if !property.hasPublicRoadAccess {
            insights.append(PropertyInsight(
                category: .access,
                title: "Limited Road Access",
                description: "Property lacks public road access. Verify legal access rights and coordinate with adjacent properties.",
                impact: .concern,
                actionable: true
            ))
        }

        // Driveway
        if property.hasDriveway {
            if property.drivewayWidth > 0 && property.drivewayWidth < 10 {
                insights.append(PropertyInsight(
                    category: .access,
                    title: "Narrow Driveway",
                    description: "Driveway width \(String(format: "%.1f", property.drivewayWidth)) ft. Equipment size may be restricted.",
                    impact: .neutral,
                    actionable: true
                ))
            }
        }

        // Slope
        if property.hasSteepSlopes || property.averageSlope > 15 {
            insights.append(PropertyInsight(
                category: .access,
                title: "Steep Terrain",
                description: "Slope \(String(format: "%.1f", property.averageSlope))% may require specialized equipment and safety measures.",
                impact: .concern,
                actionable: true
            ))
        }

        return insights
    }

    private func analyzeEnvironmental(_ property: PropertyBoundary) -> [PropertyInsight] {
        var insights: [PropertyInsight] = []

        // Flood zone
        if property.isInFloodplain {
            insights.append(PropertyInsight(
                category: .environmental,
                title: "Flood Zone: \(property.floodZone)",
                description: "Property is in FEMA flood zone. Avoid soil disturbance during wet conditions. Debris removal timing may be critical.",
                impact: .concern,
                actionable: true
            ))
        }

        // Wetlands
        if property.hasWetlands {
            let acreage = property.wetlandAcres > 0 ? String(format: "%.2f", property.wetlandAcres) : "Unknown"
            insights.append(PropertyInsight(
                category: .environmental,
                title: "Wetlands Present (\(acreage) acres)",
                description: "Wetlands require special permits for vegetation work. Consult Army Corps of Engineers before proceeding.",
                impact: .critical,
                actionable: true
            ))
        }

        // Protected species
        if property.hasProtectedSpecies {
            insights.append(PropertyInsight(
                category: .environmental,
                title: "Protected Species Habitat",
                description: "Species: \(property.protectedSpeciesList). Work timing restrictions may apply. Consult wildlife authorities.",
                impact: .critical,
                actionable: true
            ))
        }

        // Wildlife habitat
        if property.isInWildlifeHabitat {
            insights.append(PropertyInsight(
                category: .environmental,
                title: "Wildlife Habitat Area",
                description: "\(property.wildlifeHabitatType). Seasonal restrictions may apply for tree work.",
                impact: .concern,
                actionable: true
            ))
        }

        // Water proximity
        if property.hasStreamOrRiver {
            insights.append(PropertyInsight(
                category: .environmental,
                title: "Near Water Body: \(property.waterBodyName)",
                description: "Distance: \(String(format: "%.0f", property.distanceToWater)) ft. Erosion control and buffer zones required.",
                impact: .concern,
                actionable: true
            ))
        }

        // Vegetation density
        if property.vegetationDensity.lowercased() == "very dense" || property.vegetationDensity.lowercased() == "dense" {
            insights.append(PropertyInsight(
                category: .operational,
                title: "Dense Vegetation",
                description: "\(property.vegetationDensity) vegetation. Expect higher production hours and disposal volumes.",
                impact: .neutral,
                actionable: true
            ))
        }

        return insights
    }

    private func analyzeLegalRestrictions(_ property: PropertyBoundary) -> [PropertyInsight] {
        var insights: [PropertyInsight] = []

        // HOA
        if property.hasHOA {
            insights.append(PropertyInsight(
                category: .legal,
                title: "HOA Property: \(property.hoaName)",
                description: "HOA approval required before work. Review CCRs for tree work restrictions. Budget \(property.hoaFeeFrequency) fee: \(PricingFormulas.formatCurrency(property.hoaFeeAmount)).",
                impact: .concern,
                actionable: true
            ))
        }

        // Historic property
        if property.isHistoricProperty {
            insights.append(PropertyInsight(
                category: .legal,
                title: "Historic Property: \(property.historicDesignation)",
                description: "Historic preservation approval required. Work restrictions likely. Extended permitting timeline expected.",
                impact: .critical,
                actionable: true
            ))
        }

        // Conservation easement
        if property.hasConservationEasement {
            insights.append(PropertyInsight(
                category: .legal,
                title: "Conservation Easement (\(String(format: "%.1f", property.conservationEasementAcres)) acres)",
                description: "\(property.conservationEasementType). Vegetation work heavily restricted. Easement holder approval required.",
                impact: .critical,
                actionable: true
            ))
        }

        // Tree ordinance
        if property.hasTreeOrdinance {
            insights.append(PropertyInsight(
                category: .legal,
                title: "Tree Ordinance in Effect",
                description: "\(property.treeOrdinanceDescription). Permit required for trees >\(String(format: "%.0f", property.protectedTreeDiameter))\" DBH.",
                impact: .concern,
                actionable: true
            ))
        }

        // Building restrictions
        if property.hasBuildingRestrictions {
            insights.append(PropertyInsight(
                category: .legal,
                title: "Building/Work Restrictions",
                description: property.buildingRestrictionsDescription,
                impact: .concern,
                actionable: true
            ))
        }

        // View protection
        if property.hasViewProtection {
            insights.append(PropertyInsight(
                category: .legal,
                title: "View Protection in Place",
                description: "Height restrictions may apply to tree work. Coordinate with neighbors to avoid view disputes.",
                impact: .neutral,
                actionable: true
            ))
        }

        return insights
    }

    private func analyzeInfrastructure(_ property: PropertyBoundary) -> [PropertyInsight] {
        var insights: [PropertyInsight] = []

        // Power lines
        if property.hasPowerLines {
            let proximity = property.powerLineProximity
            let impact: PropertyInsight.ImpactLevel = proximity.lowercased() == "touching" ? .critical : .concern

            insights.append(PropertyInsight(
                category: .infrastructure,
                title: "Power Lines: \(proximity)",
                description: "Electrical hazard. Utility notification required. Licensed arborist may be mandatory. Significant safety protocols needed.",
                impact: impact,
                actionable: true
            ))
        }

        // High voltage
        if property.hasHighVoltageLines {
            insights.append(PropertyInsight(
                category: .safety,
                title: "⚠️ HIGH VOLTAGE LINES",
                description: "Extreme hazard. Utility company coordination mandatory. Specialized training required. Consider subcontracting to utility-certified crews.",
                impact: .critical,
                actionable: true
            ))
        }

        // Underground utilities
        if property.hasUndergroundUtilities {
            if !property.undergroundUtilitiesMarked {
                insights.append(PropertyInsight(
                    category: .infrastructure,
                    title: "Underground Utilities (Not Marked)",
                    description: "Call 811 before digging. Locate all utilities. Budget extra time for marking and hand-digging near lines.",
                    impact: .concern,
                    actionable: true
                ))
            }
        }

        // Proximity to buildings
        if property.proximityToBuildings > 0 && property.proximityToBuildings < 50 {
            insights.append(PropertyInsight(
                category: .infrastructure,
                title: "Near Structure (\(String(format: "%.0f", property.proximityToBuildings)) ft)",
                description: "Close proximity to building. Ground protection required. Increased rigging complexity. Damage risk management critical.",
                impact: .concern,
                actionable: true
            ))
        }

        // Pool or spa
        if property.hasPoolOrSpa {
            insights.append(PropertyInsight(
                category: .infrastructure,
                title: "Pool/Spa on Property",
                description: "High-value target. Extra care required. Protection barriers recommended. Debris management critical.",
                impact: .concern,
                actionable: true
            ))
        }

        return insights
    }

    private func analyzeSafety(_ property: PropertyBoundary) -> [PropertyInsight] {
        var insights: [PropertyInsight] = []

        // Confined space
        if property.isConfinedSpace {
            insights.append(PropertyInsight(
                category: .safety,
                title: "Confined Space Work",
                description: "OSHA confined space protocols required. Specialized training and equipment mandatory. Safety monitoring essential.",
                impact: .critical,
                actionable: true
            ))
        }

        // Emergency hazard
        if property.isEmergencyHazard {
            insights.append(PropertyInsight(
                category: .safety,
                title: "Emergency/Hazard Situation",
                description: "Immediate safety risk. Priority response needed. Premium pricing justified. Document hazard conditions thoroughly.",
                impact: .critical,
                actionable: true
            ))
        }

        // Near public road
        if property.nearPublicRoad && property.requiresTrafficControl {
            insights.append(PropertyInsight(
                category: .safety,
                title: "Traffic Control Required",
                description: "Work near public road. Traffic control plan needed. Permits likely required. Flaggers and signage mandatory.",
                impact: .concern,
                actionable: true
            ))
        }

        return insights
    }

    private func analyzeFinancial(_ property: PropertyBoundary) -> [PropertyInsight] {
        var insights: [PropertyInsight] = []

        // High property value
        if property.assessedValue > 500000 {
            let valueStr = PricingFormulas.formatCurrency(property.assessedValue)
            insights.append(PropertyInsight(
                category: .financial,
                title: "High-Value Property (\(valueStr))",
                description: "Premium property suggests customer can afford quality work. Opportunity for professional presentation and full-service pricing.",
                impact: .positive,
                actionable: false
            ))
        }

        // Absentee owner
        if property.isAbsenteeOwner {
            insights.append(PropertyInsight(
                category: .financial,
                title: "Absentee Owner",
                description: "Owner lives at: \(property.mailingCity), \(property.mailingState). May require extra communication and documentation. Site access coordination critical.",
                impact: .neutral,
                actionable: true
            ))
        }

        // Corporate/LLC owner
        if property.ownerType.lowercased().contains("corp") || property.ownerType.lowercased().contains("llc") {
            insights.append(PropertyInsight(
                category: .financial,
                title: "Commercial Owner: \(property.ownerType)",
                description: "Corporate entity may require W-9, COI, and formal contracts. Approval process may involve multiple parties. Payment terms negotiable.",
                impact: .neutral,
                actionable: true
            ))
        }

        return insights
    }

    private func analyzeEasements(_ easements: [Easement]) -> [PropertyInsight] {
        var insights: [PropertyInsight] = []

        let treeWorkEasements = easements.filter { $0.affectsTreeWork }

        for easement in treeWorkEasements {
            var description = easement.treeWorkRestrictions

            if easement.requiresEasementHolderApproval {
                description += " Holder approval required (\(easement.holderName))."
            }

            if easement.requiresPermitForWork {
                description += " Permit required."
            }

            insights.append(PropertyInsight(
                category: .legal,
                title: "\(easement.easementType.rawValue) Easement",
                description: description,
                impact: easement.impactSeverity == "High Impact" ? .critical : .concern,
                actionable: true
            ))
        }

        return insights
    }

    // MARK: - Risk and Complexity Calculation

    private func calculateRiskLevel(insights: [PropertyInsight], property: PropertyBoundary) -> PropertyIntelligenceReport.RiskLevel {
        let criticalCount = insights.filter { $0.impact == .critical }.count
        let concernCount = insights.filter { $0.impact == .concern }.count

        // Check for immediate disqualifiers
        if criticalCount >= 3 {
            return .veryHigh
        }

        if property.hasHighVoltageLines || property.isEmergencyHazard {
            return .veryHigh
        }

        if criticalCount >= 1 || concernCount >= 5 {
            return .high
        }

        if concernCount >= 2 {
            return .medium
        }

        return .low
    }

    private func generateSummary(property: PropertyBoundary, insights: [PropertyInsight], riskLevel: PropertyIntelligenceReport.RiskLevel) -> String {
        var summary: [String] = []

        // Property basics
        let acreage = property.lotSizeAcres > 0 ? String(format: "%.2f", property.lotSizeAcres) : "Unknown"
        summary.append("\(acreage) acre \(property.propertyClass) property")

        if !property.zoningDescription.isEmpty {
            summary.append("zoned \(property.zoningDescription)")
        }

        // Risk characterization
        switch riskLevel {
        case .low:
            summary.append("with minimal complexity factors")
        case .medium:
            summary.append("with moderate complexity considerations")
        case .high:
            summary.append("with significant complexity challenges")
        case .veryHigh:
            summary.append("with CRITICAL safety and complexity concerns")
        }

        // Key challenges
        let criticalInsights = insights.filter { $0.impact == .critical }
        if !criticalInsights.isEmpty {
            let challenges = criticalInsights.prefix(2).map { $0.title }.joined(separator: " and ")
            summary.append("Key concerns: \(challenges)")
        }

        // AFISS
        let multiplier = property.suggestedAFISSMultiplier
        if multiplier > 1.0 {
            let percentage = Int((multiplier - 1.0) * 100)
            summary.append("Estimated +\(percentage)% complexity adjustment recommended")
        }

        return summary.joined(separator: ". ") + "."
    }

    // MARK: - Customer-Facing Report Generation

    /// Generate customer-friendly property report
    func generateCustomerReport(for property: PropertyBoundary) -> String {
        let report = analyzeProperty(property)

        var output: [String] = []

        output.append("PROPERTY INTELLIGENCE REPORT")
        output.append("Generated: \(report.generatedAt.formatted(date: .abbreviated, time: .shortened))")
        output.append("")
        output.append("PROPERTY SUMMARY")
        output.append(report.summary)
        output.append("")

        if !report.warnings.isEmpty {
            output.append("⚠️ IMPORTANT CONSIDERATIONS")
            for (index, warning) in report.warnings.enumerated() {
                output.append("\(index + 1). \(warning)")
            }
            output.append("")
        }

        if !report.opportunities.isEmpty {
            output.append("✓ OPPORTUNITIES")
            for opportunity in report.opportunities {
                output.append("• \(opportunity)")
            }
            output.append("")
        }

        if !report.recommendations.isEmpty {
            output.append("RECOMMENDATIONS")
            for (index, rec) in report.recommendations.enumerated() {
                output.append("\(index + 1). \(rec)")
            }
            output.append("")
        }

        output.append("CONFIDENCE: \(Int(report.confidenceScore * 100))% (based on data completeness)")
        output.append("")
        output.append("This report is generated from official county parcel data and is for informational purposes only. Field verification recommended.")

        return output.joined(separator: "\n")
    }
}
