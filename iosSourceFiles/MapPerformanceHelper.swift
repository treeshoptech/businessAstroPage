//
//  MapPerformanceHelper.swift
//  TreeShop
//
//  Performance optimization utilities for map views
//

import Foundation
import MapKit
import SwiftUI

/// Helper for optimizing map performance with large datasets
@MainActor
class MapPerformanceHelper: ObservableObject {

    // MARK: - Debouncing

    /// Debounce task to prevent excessive updates
    private var debounceTask: Task<Void, Never>?

    /// Debounce a region change to avoid excessive calculations
    /// - Parameters:
    ///   - delay: Delay in seconds (default: 0.3)
    ///   - action: Action to perform after delay
    func debounceRegionChange(delay: TimeInterval = 0.3, action: @escaping () async -> Void) {
        // Cancel previous task
        debounceTask?.cancel()

        // Create new debounced task
        debounceTask = Task {
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

            guard !Task.isCancelled else { return }

            await action()
        }
    }

    /// Cancel any pending debounced actions
    func cancelDebounce() {
        debounceTask?.cancel()
        debounceTask = nil
    }

    // MARK: - Visible Region Filtering

    /// Filter annotations to only those visible in the current region
    /// - Parameters:
    ///   - annotations: All available annotations
    ///   - region: Current visible map region
    ///   - buffer: Extra buffer percentage (0.2 = 20% padding)
    /// - Returns: Filtered annotations within visible region
    static func filterVisibleAnnotations<T: Identifiable>(
        _ annotations: [T],
        in region: MKCoordinateRegion,
        buffer: Double = 0.2,
        coordinateProvider: (T) -> CLLocationCoordinate2D
    ) -> [T] {
        let minLat = region.center.latitude - (region.span.latitudeDelta / 2) * (1 + buffer)
        let maxLat = region.center.latitude + (region.span.latitudeDelta / 2) * (1 + buffer)
        let minLng = region.center.longitude - (region.span.longitudeDelta / 2) * (1 + buffer)
        let maxLng = region.center.longitude + (region.span.longitudeDelta / 2) * (1 + buffer)

        return annotations.filter { annotation in
            let coord = coordinateProvider(annotation)
            return coord.latitude >= minLat &&
                   coord.latitude <= maxLat &&
                   coord.longitude >= minLng &&
                   coord.longitude <= maxLng
        }
    }

    // MARK: - Clustering Helpers

    /// Group nearby annotations into clusters for better performance
    /// - Parameters:
    ///   - annotations: Annotations to cluster
    ///   - clusterDistance: Distance threshold in meters for clustering
    ///   - coordinateProvider: Function to extract coordinate from annotation
    /// - Returns: Array of clusters
    static func clusterAnnotations<T: Identifiable>(
        _ annotations: [T],
        clusterDistance: Double = 100, // meters
        coordinateProvider: (T) -> CLLocationCoordinate2D
    ) -> [[T]] {
        var clusters: [[T]] = []
        var remaining = annotations

        while !remaining.isEmpty {
            let first = remaining.removeFirst()
            let firstCoord = coordinateProvider(first)
            var cluster = [first]

            // Find all annotations within cluster distance
            remaining = remaining.filter { annotation in
                let coord = coordinateProvider(annotation)
                let distance = CLLocation(latitude: firstCoord.latitude, longitude: firstCoord.longitude)
                    .distance(from: CLLocation(latitude: coord.latitude, longitude: coord.longitude))

                if distance <= clusterDistance {
                    cluster.append(annotation)
                    return false // Remove from remaining
                }
                return true // Keep in remaining
            }

            clusters.append(cluster)
        }

        return clusters
    }

    // MARK: - Map Snapshot Generation

    /// Generate a static map snapshot for use in list views (improves performance)
    /// - Parameters:
    ///   - coordinate: Center coordinate
    ///   - size: Image size
    ///   - span: Map span (zoom level)
    /// - Returns: Map snapshot image
    static func generateMapSnapshot(
        coordinate: CLLocationCoordinate2D,
        size: CGSize = CGSize(width: 300, height: 200),
        span: MKCoordinateSpan = MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    ) async -> UIImage? {
        let options = MKMapSnapshotter.Options()
        options.region = MKCoordinateRegion(center: coordinate, span: span)
        options.size = size
        options.scale = UIScreen.main.scale

        let snapshotter = MKMapSnapshotter(options: options)

        do {
            let snapshot = try await snapshotter.start()
            return snapshot.image
        } catch {
            print("Snapshot generation failed: \(error)")
            return nil
        }
    }

    /// Generate map snapshot with annotation marker
    /// - Parameters:
    ///   - coordinate: Center coordinate
    ///   - size: Image size
    ///   - markerColor: Color for the marker pin
    /// - Returns: Map snapshot with marker
    static func generateMapSnapshotWithMarker(
        coordinate: CLLocationCoordinate2D,
        size: CGSize = CGSize(width: 300, height: 200),
        markerColor: UIColor = .systemRed
    ) async -> UIImage? {
        let options = MKMapSnapshotter.Options()
        options.region = MKCoordinateRegion(
            center: coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
        options.size = size
        options.scale = UIScreen.main.scale

        let snapshotter = MKMapSnapshotter(options: options)

        do {
            let snapshot = try await snapshotter.start()

            // Draw marker on snapshot
            UIGraphicsBeginImageContextWithOptions(size, true, snapshot.image.scale)

            snapshot.image.draw(at: .zero)

            // Draw pin at center
            let pinPoint = snapshot.point(for: coordinate)
            let pinSize: CGFloat = 40
            let pinRect = CGRect(
                x: pinPoint.x - pinSize / 2,
                y: pinPoint.y - pinSize,
                width: pinSize,
                height: pinSize
            )

            // Draw pin circle
            markerColor.setFill()
            UIBezierPath(ovalIn: pinRect.insetBy(dx: 5, dy: 5)).fill()

            let finalImage = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()

            return finalImage
        } catch {
            print("Snapshot generation failed: \(error)")
            return nil
        }
    }

    // MARK: - Throttling

    /// Throttle updates to prevent excessive re-renders
    private var lastThrottleTime: Date?
    private let throttleInterval: TimeInterval = 0.1 // 100ms

    /// Check if enough time has passed since last throttle
    func shouldThrottle() -> Bool {
        guard let lastTime = lastThrottleTime else {
            lastThrottleTime = Date()
            return false
        }

        let elapsed = Date().timeIntervalSince(lastTime)
        if elapsed >= throttleInterval {
            lastThrottleTime = Date()
            return false
        }

        return true // Should throttle
    }

    /// Reset throttle timer
    func resetThrottle() {
        lastThrottleTime = nil
    }

    // MARK: - Memory Management

    /// Cache for map snapshots
    private static var snapshotCache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 50 // Max 50 cached snapshots
        cache.totalCostLimit = 50 * 1024 * 1024 // 50 MB
        return cache
    }()

    /// Get cached snapshot or generate new one
    /// - Parameters:
    ///   - key: Cache key (usually coordinate string)
    ///   - coordinate: Location coordinate
    ///   - size: Snapshot size
    /// - Returns: Cached or newly generated snapshot
    static func getCachedSnapshot(
        key: String,
        coordinate: CLLocationCoordinate2D,
        size: CGSize = CGSize(width: 300, height: 200)
    ) async -> UIImage? {
        let cacheKey = NSString(string: key)

        // Check cache first
        if let cached = snapshotCache.object(forKey: cacheKey) {
            return cached
        }

        // Generate new snapshot
        if let snapshot = await generateMapSnapshot(coordinate: coordinate, size: size) {
            snapshotCache.setObject(snapshot, forKey: cacheKey)
            return snapshot
        }

        return nil
    }

    /// Clear snapshot cache
    static func clearSnapshotCache() {
        snapshotCache.removeAllObjects()
    }
}

// MARK: - SwiftUI Debounce Modifier

extension View {
    /// Debounce changes to a value before triggering action
    /// - Parameters:
    ///   - value: Value to watch
    ///   - delay: Debounce delay in seconds
    ///   - action: Action to perform after delay
    func debounce<T: Equatable>(
        _ value: T,
        delay: TimeInterval = 0.3,
        action: @escaping (T) -> Void
    ) -> some View {
        self.modifier(DebounceModifier(value: value, delay: delay, action: action))
    }
}

struct DebounceModifier<T: Equatable>: ViewModifier {
    let value: T
    let delay: TimeInterval
    let action: (T) -> Void

    @State private var debounceTask: Task<Void, Never>?

    func body(content: Content) -> some View {
        content
            .onChange(of: value) { oldValue, newValue in
                debounceTask?.cancel()

                debounceTask = Task {
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

                    guard !Task.isCancelled else { return }

                    await MainActor.run {
                        action(newValue)
                    }
                }
            }
    }
}
