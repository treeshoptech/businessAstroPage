//
//  SitePlanExporter.swift
//  TreeShop
//
//  Generates professional site plan PDFs with property boundaries and work areas
//  Integrates with proposals for customer-facing documentation
//

import Foundation
import MapKit
import UIKit
import PDFKit

// MARK: - Site Plan Configuration

struct SitePlanConfig {
    let propertyBoundary: PropertyBoundary
    let workAreas: [WorkArea]
    let showPropertyLines: Bool
    let showEasements: Bool
    let showMeasurements: Bool
    let showNorthArrow: Bool
    let showScale: Bool
    let showLegend: Bool
    let includeIntelligence: Bool
    let mapType: MKMapType
    let paperSize: PaperSize

    enum PaperSize {
        case letter // 8.5" x 11"
        case legal  // 8.5" x 14"
        case tabloid // 11" x 17"

        var size: CGSize {
            switch self {
            case .letter:
                return CGSize(width: 612, height: 792) // points at 72 DPI
            case .legal:
                return CGSize(width: 612, height: 1008)
            case .tabloid:
                return CGSize(width: 792, height: 1224)
            }
        }
    }

    static let standard = SitePlanConfig(
        propertyBoundary: PropertyBoundary(),
        workAreas: [],
        showPropertyLines: true,
        showEasements: true,
        showMeasurements: true,
        showNorthArrow: true,
        showScale: true,
        showLegend: true,
        includeIntelligence: true,
        mapType: .hybrid,
        paperSize: .letter
    )
}

struct WorkArea {
    let id: UUID
    let name: String
    let polygon: [CLLocationCoordinate2D]
    let serviceType: ServiceType
    let notes: String?
    let color: UIColor

    var area: Double {
        GeometryHelper.calculateArea(polygon: polygon)
    }

    var areaSquareFeet: Double {
        GeometryHelper.squareMetersToSquareFeet(area)
    }

    var areaAcres: Double {
        GeometryHelper.squareMetersToAcres(area)
    }

    var formattedArea: String {
        if areaAcres >= 1.0 {
            return String(format: "%.2f acres", areaAcres)
        } else {
            return String(format: "%,.0f sq ft", areaSquareFeet)
        }
    }
}

// MARK: - Site Plan Exporter

@MainActor
class SitePlanExporter: ObservableObject {
    // MARK: - Singleton
    static let shared = SitePlanExporter()

    // MARK: - Published Properties
    @Published var isExporting = false
    @Published var lastError: Error?

    private init() {}

    // MARK: - Public Export Methods

    /// Generate site plan PDF
    func generateSitePlan(config: SitePlanConfig) async throws -> PDFDocument {
        isExporting = true
        defer { isExporting = false }

        // Create PDF document
        let pdfMetadata = [
            kCGPDFContextTitle: "Site Plan - \(config.propertyBoundary.fullAddress)",
            kCGPDFContextAuthor: "TreeShop",
            kCGPDFContextCreator: "TreeShop iOS",
            kCGPDFContextSubject: "Property Boundary and Work Area Map"
        ]

        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetadata as [String: Any]

        let pageRect = CGRect(origin: .zero, size: config.paperSize.size)
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)

        let data = renderer.pdfData { context in
            // Start page
            context.beginPage()

            // Render content
            renderSitePlan(in: context.cgContext, rect: pageRect, config: config)
        }

        // Convert to PDFDocument
        guard let pdfDocument = PDFDocument(data: data) else {
            throw SitePlanError.pdfGenerationFailed
        }

        return pdfDocument
    }

    /// Generate site plan image (for preview or embedding)
    func generateSitePlanImage(config: SitePlanConfig, size: CGSize) async throws -> UIImage {
        isExporting = true
        defer { isExporting = false }

        let renderer = UIGraphicsImageRenderer(size: size)

        let image = renderer.image { context in
            renderSitePlan(in: context.cgContext, rect: CGRect(origin: .zero, size: size), config: config)
        }

        return image
    }

    // MARK: - Private Rendering Methods

    private func renderSitePlan(in context: CGContext, rect: CGRect, config: SitePlanConfig) {
        let margin: CGFloat = 36 // 0.5" margin
        let contentRect = rect.insetBy(dx: margin, dy: margin)

        // White background
        context.setFillColor(UIColor.white.cgColor)
        context.fill(rect)

        // Header section (top 80 points)
        let headerRect = CGRect(x: contentRect.minX, y: contentRect.minY, width: contentRect.width, height: 80)
        renderHeader(in: context, rect: headerRect, config: config)

        // Map section (main content area)
        let mapTop = headerRect.maxY + 20
        let mapHeight = contentRect.height - 80 - 20 - (config.showLegend ? 150 : 50) // Reserve space for legend
        let mapRect = CGRect(x: contentRect.minX, y: mapTop, width: contentRect.width, height: mapHeight)
        renderMap(in: context, rect: mapRect, config: config)

        // Legend section (bottom)
        if config.showLegend {
            let legendTop = mapRect.maxY + 20
            let legendRect = CGRect(x: contentRect.minX, y: legendTop, width: contentRect.width, height: 130)
            renderLegend(in: context, rect: legendRect, config: config)
        }

        // Footer
        let footerRect = CGRect(x: contentRect.minX, y: contentRect.maxY - 30, width: contentRect.width, height: 30)
        renderFooter(in: context, rect: footerRect)
    }

    private func renderHeader(in context: CGContext, rect: CGRect, config: SitePlanConfig) {
        let property = config.propertyBoundary

        // Title
        let titleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.boldSystemFont(ofSize: 18),
            .foregroundColor: UIColor.black
        ]
        let title = "SITE PLAN"
        let titleSize = title.size(withAttributes: titleAttributes)
        let titleRect = CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: titleSize.height)
        title.draw(in: titleRect, withAttributes: titleAttributes)

        // Property address
        let addressAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 14),
            .foregroundColor: UIColor.darkGray
        ]
        let address = property.fullAddress
        let addressRect = CGRect(x: rect.minX, y: titleRect.maxY + 8, width: rect.width, height: 20)
        address.draw(in: addressRect, withAttributes: addressAttributes)

        // Property details (two columns)
        let detailAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10),
            .foregroundColor: UIColor.black
        ]

        let leftColumn = rect.minX
        let rightColumn = rect.minX + rect.width / 2

        var yOffset = addressRect.maxY + 12

        // Left column
        let apnText = "APN: \(property.apn.isEmpty ? "N/A" : property.apn)"
        apnText.draw(at: CGPoint(x: leftColumn, y: yOffset), withAttributes: detailAttributes)

        let acreageText = "Property: \(property.formattedAcreage)"
        acreageText.draw(at: CGPoint(x: rightColumn, y: yOffset), withAttributes: detailAttributes)

        yOffset += 14

        // Second row
        let zoningText = "Zoning: \(property.zoningCode.isEmpty ? "N/A" : property.zoningCode)"
        zoningText.draw(at: CGPoint(x: leftColumn, y: yOffset), withAttributes: detailAttributes)

        let dateText = "Date: \(Date().formatted(date: .abbreviated, time: .omitted))"
        dateText.draw(at: CGPoint(x: rightColumn, y: yOffset), withAttributes: detailAttributes)

        // Border line
        context.setStrokeColor(UIColor.lightGray.cgColor)
        context.setLineWidth(1)
        context.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        context.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        context.strokePath()
    }

    private func renderMap(in context: CGContext, rect: CGRect, config: SitePlanConfig) {
        // Background
        context.setFillColor(UIColor(white: 0.95, alpha: 1).cgColor)
        context.fill(rect)

        // Border
        context.setStrokeColor(UIColor.black.cgColor)
        context.setLineWidth(2)
        context.stroke(rect)

        // Calculate map bounds to fit property boundary
        guard let boundaryPolygons = GeometryHelper.parseGeoJSON(config.propertyBoundary.boundaryGeoJSON),
              let boundaryPolygon = boundaryPolygons.first,
              !boundaryPolygon.isEmpty else {
            // No boundary data - draw placeholder
            let placeholderText = "Property boundary data not available"
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14),
                .foregroundColor: UIColor.gray
            ]
            let textSize = placeholderText.size(withAttributes: attributes)
            let textRect = CGRect(
                x: rect.midX - textSize.width / 2,
                y: rect.midY - textSize.height / 2,
                width: textSize.width,
                height: textSize.height
            )
            placeholderText.draw(in: textRect, withAttributes: attributes)
            return
        }

        // Calculate bounding box with padding
        let allPoints = boundaryPolygon + config.workAreas.flatMap { $0.polygon }
        let minLat = allPoints.map { $0.latitude }.min() ?? 0
        let maxLat = allPoints.map { $0.latitude }.max() ?? 0
        let minLon = allPoints.map { $0.longitude }.min() ?? 0
        let maxLon = allPoints.map { $0.longitude }.max() ?? 0

        let padding = 0.15 // 15% padding
        let latRange = maxLat - minLat
        let lonRange = maxLon - minLon
        let paddedMinLat = minLat - latRange * padding
        let paddedMaxLat = maxLat + latRange * padding
        let paddedMinLon = minLon - lonRange * padding
        let paddedMaxLon = maxLon + lonRange * padding

        // Create coordinate conversion closure
        let coordToPoint: (CLLocationCoordinate2D) -> CGPoint = { coord in
            let x = rect.minX + ((coord.longitude - paddedMinLon) / (paddedMaxLon - paddedMinLon)) * rect.width
            let y = rect.maxY - ((coord.latitude - paddedMinLat) / (paddedMaxLat - paddedMinLat)) * rect.height
            return CGPoint(x: x, y: y)
        }

        // Draw property boundary
        if config.showPropertyLines {
            context.setStrokeColor(UIColor.red.cgColor)
            context.setLineWidth(3)
            context.setLineDash(phase: 0, lengths: [])

            let path = CGMutablePath()
            let firstPoint = coordToPoint(boundaryPolygon[0])
            path.move(to: firstPoint)

            for i in 1..<boundaryPolygon.count {
                let point = coordToPoint(boundaryPolygon[i])
                path.addLine(to: point)
            }
            path.closeSubpath()

            context.addPath(path)
            context.strokePath()

            // Fill with semi-transparent color
            context.setFillColor(UIColor.red.withAlphaComponent(0.1).cgColor)
            context.addPath(path)
            context.fillPath()
        }

        // Draw work areas
        for workArea in config.workAreas {
            context.setStrokeColor(workArea.color.cgColor)
            context.setFillColor(workArea.color.withAlphaComponent(0.3).cgColor)
            context.setLineWidth(2)

            let path = CGMutablePath()
            if !workArea.polygon.isEmpty {
                let firstPoint = coordToPoint(workArea.polygon[0])
                path.move(to: firstPoint)

                for i in 1..<workArea.polygon.count {
                    let point = coordToPoint(workArea.polygon[i])
                    path.addLine(to: point)
                }
                path.closeSubpath()

                // Fill
                context.addPath(path)
                context.fillPath()

                // Stroke
                context.addPath(path)
                context.strokePath()

                // Label in center
                let centerLat = workArea.polygon.map { $0.latitude }.reduce(0, +) / Double(workArea.polygon.count)
                let centerLon = workArea.polygon.map { $0.longitude }.reduce(0, +) / Double(workArea.polygon.count)
                let centerPoint = coordToPoint(CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon))

                let labelAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.boldSystemFont(ofSize: 10),
                    .foregroundColor: UIColor.black
                ]
                let label = workArea.name
                let labelSize = label.size(withAttributes: labelAttributes)
                let labelRect = CGRect(
                    x: centerPoint.x - labelSize.width / 2,
                    y: centerPoint.y - labelSize.height / 2,
                    width: labelSize.width,
                    height: labelSize.height
                )
                label.draw(in: labelRect, withAttributes: labelAttributes)
            }
        }

        // Draw north arrow
        if config.showNorthArrow {
            let arrowSize: CGFloat = 40
            let arrowX = rect.maxX - arrowSize - 20
            let arrowY = rect.minY + 20

            // Arrow shaft
            context.setStrokeColor(UIColor.black.cgColor)
            context.setLineWidth(2)
            context.move(to: CGPoint(x: arrowX + arrowSize / 2, y: arrowY + arrowSize))
            context.addLine(to: CGPoint(x: arrowX + arrowSize / 2, y: arrowY + 10))
            context.strokePath()

            // Arrow head
            let arrowPath = CGMutablePath()
            arrowPath.move(to: CGPoint(x: arrowX + arrowSize / 2, y: arrowY))
            arrowPath.addLine(to: CGPoint(x: arrowX + arrowSize / 2 - 8, y: arrowY + 15))
            arrowPath.addLine(to: CGPoint(x: arrowX + arrowSize / 2 + 8, y: arrowY + 15))
            arrowPath.closeSubpath()

            context.setFillColor(UIColor.black.cgColor)
            context.addPath(arrowPath)
            context.fillPath()

            // "N" label
            let nAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 14),
                .foregroundColor: UIColor.black
            ]
            "N".draw(at: CGPoint(x: arrowX + arrowSize / 2 - 5, y: arrowY - 18), withAttributes: nAttributes)
        }

        // Draw scale
        if config.showScale {
            renderScale(in: context, rect: rect, mapBounds: (paddedMinLat, paddedMaxLat, paddedMinLon, paddedMaxLon))
        }
    }

    private func renderScale(in context: CGContext, rect: CGRect, mapBounds: (minLat: Double, maxLat: Double, minLon: Double, maxLon: Double)) {
        let scaleWidth: CGFloat = 100
        let scaleX = rect.minX + 20
        let scaleY = rect.maxY - 40

        // Calculate real-world distance for scale bar
        let leftCoord = CLLocationCoordinate2D(latitude: (mapBounds.minLat + mapBounds.maxLat) / 2, longitude: mapBounds.minLon)
        let rightCoord = CLLocationCoordinate2D(latitude: (mapBounds.minLat + mapBounds.maxLat) / 2, longitude: mapBounds.maxLon)

        let mapWidthMeters = CLLocation(latitude: leftCoord.latitude, longitude: leftCoord.longitude)
            .distance(from: CLLocation(latitude: rightCoord.latitude, longitude: rightCoord.longitude))

        let scaleMeters = (scaleWidth / rect.width) * mapWidthMeters
        let scaleFeet = scaleMeters * 3.28084

        // Round to nice number
        let niceScale: Double
        let scaleLabel: String
        if scaleFeet < 50 {
            niceScale = 25
            scaleLabel = "25 ft"
        } else if scaleFeet < 100 {
            niceScale = 50
            scaleLabel = "50 ft"
        } else if scaleFeet < 250 {
            niceScale = 100
            scaleLabel = "100 ft"
        } else {
            niceScale = 250
            scaleLabel = "250 ft"
        }

        let adjustedScaleWidth = scaleWidth * (niceScale / scaleFeet)

        // Draw scale bar
        context.setStrokeColor(UIColor.black.cgColor)
        context.setLineWidth(2)
        context.move(to: CGPoint(x: scaleX, y: scaleY))
        context.addLine(to: CGPoint(x: scaleX + adjustedScaleWidth, y: scaleY))
        context.strokePath()

        // End ticks
        context.move(to: CGPoint(x: scaleX, y: scaleY - 5))
        context.addLine(to: CGPoint(x: scaleX, y: scaleY + 5))
        context.move(to: CGPoint(x: scaleX + adjustedScaleWidth, y: scaleY - 5))
        context.addLine(to: CGPoint(x: scaleX + adjustedScaleWidth, y: scaleY + 5))
        context.strokePath()

        // Label
        let scaleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10),
            .foregroundColor: UIColor.black
        ]
        let labelSize = scaleLabel.size(withAttributes: scaleAttributes)
        scaleLabel.draw(at: CGPoint(x: scaleX + adjustedScaleWidth / 2 - labelSize.width / 2, y: scaleY + 8), withAttributes: scaleAttributes)
    }

    private func renderLegend(in context: CGContext, rect: CGRect, config: SitePlanConfig) {
        let titleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.boldSystemFont(ofSize: 12),
            .foregroundColor: UIColor.black
        ]
        "LEGEND".draw(at: CGPoint(x: rect.minX, y: rect.minY), withAttributes: titleAttributes)

        let itemAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10),
            .foregroundColor: UIColor.black
        ]

        var yOffset = rect.minY + 20

        // Property boundary
        context.setStrokeColor(UIColor.red.cgColor)
        context.setLineWidth(2)
        context.move(to: CGPoint(x: rect.minX, y: yOffset + 5))
        context.addLine(to: CGPoint(x: rect.minX + 30, y: yOffset + 5))
        context.strokePath()
        "Property Boundary".draw(at: CGPoint(x: rect.minX + 40, y: yOffset), withAttributes: itemAttributes)

        yOffset += 18

        // Work areas
        for workArea in config.workAreas {
            context.setFillColor(workArea.color.withAlphaComponent(0.3).cgColor)
            context.setStrokeColor(workArea.color.cgColor)
            context.setLineWidth(1)

            let squareRect = CGRect(x: rect.minX, y: yOffset, width: 12, height: 12)
            context.fill(squareRect)
            context.stroke(squareRect)

            let text = "\(workArea.name) (\(workArea.formattedArea))"
            text.draw(at: CGPoint(x: rect.minX + 20, y: yOffset), withAttributes: itemAttributes)

            yOffset += 18
        }

        // Intelligence summary (if enabled)
        if config.includeIntelligence {
            yOffset += 5

            let intelligenceAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.italicSystemFont(ofSize: 9),
                .foregroundColor: UIColor.darkGray
            ]

            let complexityText = "Estimated complexity: +\(Int((config.propertyBoundary.suggestedAFISSMultiplier - 1.0) * 100))%"
            complexityText.draw(at: CGPoint(x: rect.minX, y: yOffset), withAttributes: intelligenceAttributes)
        }
    }

    private func renderFooter(in context: CGContext, rect: CGRect) {
        let footerAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 8),
            .foregroundColor: UIColor.gray
        ]

        let footerText = "Generated by TreeShop • Property data from Regrid • For estimation purposes only • Field verification required"
        let textSize = footerText.size(withAttributes: footerAttributes)
        let textRect = CGRect(
            x: rect.minX + (rect.width - textSize.width) / 2,
            y: rect.minY,
            width: textSize.width,
            height: textSize.height
        )
        footerText.draw(in: textRect, withAttributes: footerAttributes)
    }
}

// MARK: - Errors

enum SitePlanError: LocalizedError {
    case pdfGenerationFailed
    case invalidBoundaryData
    case noWorkAreas

    var errorDescription: String? {
        switch self {
        case .pdfGenerationFailed:
            return "Failed to generate PDF document"
        case .invalidBoundaryData:
            return "Property boundary data is invalid or missing"
        case .noWorkAreas:
            return "No work areas defined for site plan"
        }
    }
}
