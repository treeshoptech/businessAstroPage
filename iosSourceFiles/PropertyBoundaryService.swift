//
//  PropertyBoundaryService.swift
//  TreeShop
//
//  Main orchestration service for property boundary features
//  Coordinates Regrid API, validation, intelligence, and site plan generation
//

import Foundation
import SwiftData
import CoreLocation
import PDFKit

// MARK: - Service State

enum PropertyBoundaryServiceState {
    case idle
    case searching
    case loading
    case analyzing
    case validating
    case exporting
    case complete
    case error(Error)

    var isWorking: Bool {
        switch self {
        case .searching, .loading, .analyzing, .validating, .exporting:
            return true
        default:
            return false
        }
    }

    var statusMessage: String {
        switch self {
        case .idle:
            return "Ready"
        case .searching:
            return "Searching for property..."
        case .loading:
            return "Loading property data..."
        case .analyzing:
            return "Analyzing property..."
        case .validating:
            return "Validating boundaries..."
        case .exporting:
            return "Generating site plan..."
        case .complete:
            return "Complete"
        case .error(let error):
            return "Error: \(error.localizedDescription)"
        }
    }
}

// MARK: - Property Boundary Service

@MainActor
class PropertyBoundaryService: ObservableObject {
    // MARK: - Singleton
    static let shared = PropertyBoundaryService()

    // MARK: - Dependencies
    private let regridService = RegridService.shared
    private let validator = BoundaryValidator.shared
    private let intelligence = PropertyIntelligenceService.shared
    private let sitePlanExporter = SitePlanExporter.shared
    private let config = RegridConfig.shared

    // MARK: - Published Properties
    @Published var state: PropertyBoundaryServiceState = .idle
    @Published var currentProperty: PropertyBoundary?
    @Published var currentIntelligence: PropertyIntelligenceReport?
    @Published var validationResult: BoundaryValidationResult?

    // Progress tracking
    @Published var progress: Double = 0.0
    @Published var progressMessage: String = ""

    private init() {}

    // MARK: - Public API Methods

    /// Search and load property boundary by address
    func loadPropertyBoundary(
        address: String,
        for customer: Customer,
        in context: ModelContext
    ) async throws -> PropertyBoundary {
        // Check if feature is enabled and within limits
        let (allowed, reason) = config.canPerformLookup()
        guard allowed else {
            throw PropertyBoundaryServiceError.notAuthorized(reason ?? "Unknown reason")
        }

        state = .searching
        progress = 0.1
        progressMessage = "Searching for property..."

        do {
            // Search Regrid
            let propertyBoundary = try await regridService.searchProperty(address: address)

            state = .analyzing
            progress = 0.5
            progressMessage = "Analyzing property data..."

            // Calculate complexity scores
            propertyBoundary.calculateComplexityScores()
            propertyBoundary.detectAFISSFactors()
            propertyBoundary.validateDataQuality()

            // Generate intelligence report
            let intelligenceReport = intelligence.analyzeProperty(propertyBoundary)
            currentIntelligence = intelligenceReport

            state = .complete
            progress = 1.0
            progressMessage = "Property loaded successfully"

            // Track usage
            config.trackLookup()

            // Save to customer
            customer.propertyBoundary = propertyBoundary
            context.insert(propertyBoundary)

            try context.save()

            currentProperty = propertyBoundary

            return propertyBoundary

        } catch let error as RegridError {
            state = .error(error)
            throw error
        } catch {
            state = .error(error)
            throw PropertyBoundaryServiceError.loadFailed(error)
        }
    }

    /// Load property boundary by coordinates
    func loadPropertyBoundary(
        coordinate: CLLocationCoordinate2D,
        for customer: Customer,
        in context: ModelContext
    ) async throws -> PropertyBoundary {
        // Check authorization
        let (allowed, reason) = config.canPerformLookup()
        guard allowed else {
            throw PropertyBoundaryServiceError.notAuthorized(reason ?? "Unknown reason")
        }

        state = .loading
        progress = 0.1
        progressMessage = "Loading property data..."

        do {
            // Fetch from Regrid
            let propertyBoundary = try await regridService.fetchParcel(at: coordinate)

            state = .analyzing
            progress = 0.5
            progressMessage = "Analyzing property..."

            // Process
            propertyBoundary.calculateComplexityScores()
            propertyBoundary.detectAFISSFactors()
            propertyBoundary.validateDataQuality()

            let intelligenceReport = intelligence.analyzeProperty(propertyBoundary)
            currentIntelligence = intelligenceReport

            state = .complete
            progress = 1.0
            progressMessage = "Complete"

            config.trackLookup()

            // Save
            customer.propertyBoundary = propertyBoundary
            context.insert(propertyBoundary)
            try context.save()

            currentProperty = propertyBoundary

            return propertyBoundary

        } catch {
            state = .error(error)
            throw PropertyBoundaryServiceError.loadFailed(error)
        }
    }

    /// Reload/refresh existing property boundary data
    func refreshPropertyBoundary(
        _ property: PropertyBoundary,
        in context: ModelContext
    ) async throws {
        // Check authorization
        let (allowed, reason) = config.canPerformLookup()
        guard allowed else {
            throw PropertyBoundaryServiceError.notAuthorized(reason ?? "Unknown reason")
        }

        state = .loading
        progress = 0.1

        do {
            // Fetch updated data
            let coordinate = CLLocationCoordinate2D(
                latitude: property.latitude,
                longitude: property.longitude
            )

            let updatedProperty = try await regridService.fetchParcel(at: coordinate)

            // Copy updated data to existing property object
            copyPropertyData(from: updatedProperty, to: property)

            state = .analyzing
            progress = 0.5

            // Reanalyze
            property.calculateComplexityScores()
            property.detectAFISSFactors()
            property.validateDataQuality()

            let intelligenceReport = intelligence.analyzeProperty(property)
            currentIntelligence = intelligenceReport

            state = .complete
            progress = 1.0

            config.trackLookup()

            try context.save()

        } catch {
            state = .error(error)
            throw PropertyBoundaryServiceError.refreshFailed(error)
        }
    }

    /// Validate work area against property boundary
    func validateWorkArea(
        workArea: [CLLocationCoordinate2D],
        property: PropertyBoundary
    ) -> BoundaryValidationResult {
        state = .validating
        progress = 0.5

        let result = validator.validateWorkArea(workArea: workArea, propertyBoundary: property)
        validationResult = result

        state = .complete
        progress = 1.0

        return result
    }

    /// Generate property intelligence report
    func generateIntelligenceReport(
        for property: PropertyBoundary
    ) -> PropertyIntelligenceReport {
        state = .analyzing
        progress = 0.5

        let report = intelligence.analyzeProperty(property)
        currentIntelligence = report

        state = .complete
        progress = 1.0

        return report
    }

    /// Generate site plan PDF
    func generateSitePlan(
        property: PropertyBoundary,
        workAreas: [WorkArea] = [],
        config: SitePlanConfig? = nil
    ) async throws -> PDFDocument {
        state = .exporting
        progress = 0.3
        progressMessage = "Generating site plan..."

        do {
            var planConfig = config ?? SitePlanConfig.standard
            planConfig = SitePlanConfig(
                propertyBoundary: property,
                workAreas: workAreas,
                showPropertyLines: planConfig.showPropertyLines,
                showEasements: planConfig.showEasements,
                showMeasurements: planConfig.showMeasurements,
                showNorthArrow: planConfig.showNorthArrow,
                showScale: planConfig.showScale,
                showLegend: planConfig.showLegend,
                includeIntelligence: planConfig.includeIntelligence,
                mapType: planConfig.mapType,
                paperSize: planConfig.paperSize
            )

            progress = 0.7

            let pdf = try await sitePlanExporter.generateSitePlan(config: planConfig)

            state = .complete
            progress = 1.0
            progressMessage = "Site plan generated"

            return pdf

        } catch {
            state = .error(error)
            throw PropertyBoundaryServiceError.exportFailed(error)
        }
    }

    /// Get auto-detected AFISS factors for property
    func getAutoAFISSFactors(for property: PropertyBoundary) -> [(factor: String, multiplier: Double)] {
        property.detectAFISSFactors()

        return property.autoDetectedFactors.compactMap { factor -> (String, Double)? in
            // Parse percentage from factor string (e.g., "Narrow gate: +12%")
            let components = factor.components(separatedBy: ":")
            guard components.count >= 2 else { return nil }

            let factorName = components[0].trimmingCharacters(in: .whitespaces)
            let percentageString = components[1]
                .replacingOccurrences(of: "+", with: "")
                .replacingOccurrences(of: "%", with: "")
                .trimmingCharacters(in: .whitespaces)

            guard let percentage = Double(percentageString) else { return nil }

            return (factorName, 1.0 + (percentage / 100.0))
        }
    }

    /// Calculate combined AFISS multiplier from property + user selections
    func calculateCombinedAFISS(
        property: PropertyBoundary,
        additionalFactors: [(String, Double)] = []
    ) -> Double {
        var multiplier = property.suggestedAFISSMultiplier

        for (_, factorMultiplier) in additionalFactors {
            multiplier += (factorMultiplier - 1.0)
        }

        return multiplier
    }

    // MARK: - Helper Methods

    /// Copy property data from one PropertyBoundary to another
    private func copyPropertyData(from source: PropertyBoundary, to destination: PropertyBoundary) {
        // Core identification
        destination.fullAddress = source.fullAddress
        destination.streetAddress = source.streetAddress
        destination.city = source.city
        destination.state = source.state
        destination.zipCode = source.zipCode
        destination.county = source.county

        destination.apn = source.apn
        destination.parcelID = source.parcelID
        destination.legalDescription = source.legalDescription

        // Coordinates
        destination.latitude = source.latitude
        destination.longitude = source.longitude
        destination.centroidLatitude = source.centroidLatitude
        destination.centroidLongitude = source.centroidLongitude

        // Boundary
        destination.boundaryGeoJSON = source.boundaryGeoJSON
        destination.boundarySimplified = source.boundarySimplified
        destination.boundaryArea = source.boundaryArea
        destination.boundaryPerimeter = source.boundaryPerimeter

        // Size
        destination.lotSizeAcres = source.lotSizeAcres
        destination.lotSizeSquareFeet = source.lotSizeSquareFeet

        // Zoning
        destination.zoningCode = source.zoningCode
        destination.zoningDescription = source.zoningDescription
        destination.landUseCode = source.landUseCode
        destination.landUseDescription = source.landUseDescription

        // Assessment
        destination.assessedValue = source.assessedValue
        destination.landValue = source.landValue
        destination.improvementValue = source.improvementValue
        destination.marketValue = source.marketValue

        // Owner
        destination.ownerName = source.ownerName
        destination.ownerType = source.ownerType
        destination.isAbsenteeOwner = source.isAbsenteeOwner

        // Environmental
        destination.floodZone = source.floodZone
        destination.isInFloodplain = source.isInFloodplain
        destination.hasWetlands = source.hasWetlands

        // Update metadata
        destination.dataLoadDate = Date()
        destination.updateTimestamp()
    }

    /// Reset service state
    func reset() {
        state = .idle
        progress = 0.0
        progressMessage = ""
        currentProperty = nil
        currentIntelligence = nil
        validationResult = nil
    }

    /// Check if service is ready to use
    func checkServiceAvailability() -> (available: Bool, message: String) {
        if !config.isActive {
            return (false, "Regrid integration is not active. Configure API key in settings.")
        }

        let (allowed, reason) = config.canPerformLookup()
        if !allowed {
            return (false, reason ?? "Service unavailable")
        }

        return (true, "Service ready")
    }
}

// MARK: - Service Errors

enum PropertyBoundaryServiceError: LocalizedError {
    case notAuthorized(String)
    case loadFailed(Error)
    case refreshFailed(Error)
    case validationFailed(Error)
    case exportFailed(Error)
    case serviceUnavailable

    var errorDescription: String? {
        switch self {
        case .notAuthorized(let reason):
            return "Not authorized: \(reason)"
        case .loadFailed(let error):
            return "Failed to load property: \(error.localizedDescription)"
        case .refreshFailed(let error):
            return "Failed to refresh property: \(error.localizedDescription)"
        case .validationFailed(let error):
            return "Validation failed: \(error.localizedDescription)"
        case .exportFailed(let error):
            return "Failed to export site plan: \(error.localizedDescription)"
        case .serviceUnavailable:
            return "Property boundary service is currently unavailable"
        }
    }
}
