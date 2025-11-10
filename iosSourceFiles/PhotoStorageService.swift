//
//  PhotoStorageService.swift
//  TreeShop
//
//  Photo storage and management for time entry documentation
//  Stores photos in app documents directory with unique IDs
//

import Foundation
import SwiftUI
import UIKit

/// Photo metadata for time entry documentation
struct TimeEntryPhoto: Codable, Identifiable {
    let id: String
    let timeEntryId: UUID
    let timestamp: Date
    let caption: String?
    let fileSize: Int64

    init(id: String = UUID().uuidString, timeEntryId: UUID, timestamp: Date = Date(), caption: String? = nil, fileSize: Int64 = 0) {
        self.id = id
        self.timeEntryId = timeEntryId
        self.timestamp = timestamp
        self.caption = caption
        self.fileSize = fileSize
    }
}

/// Errors that can occur during photo operations
enum PhotoStorageError: LocalizedError {
    case saveFailed(String)
    case loadFailed(String)
    case deleteFailed(String)
    case invalidImageData
    case storageUnavailable

    var errorDescription: String? {
        switch self {
        case .saveFailed(let reason):
            return "Failed to save photo: \(reason)"
        case .loadFailed(let reason):
            return "Failed to load photo: \(reason)"
        case .deleteFailed(let reason):
            return "Failed to delete photo: \(reason)"
        case .invalidImageData:
            return "Invalid image data"
        case .storageUnavailable:
            return "Photo storage is unavailable"
        }
    }
}

@MainActor
class PhotoStorageService: ObservableObject {
    // MARK: - Published Properties

    @Published var isSaving = false
    @Published var lastError: PhotoStorageError?

    // MARK: - Private Properties

    private let fileManager = FileManager.default
    private let photosDirectory = "TimeEntryPhotos"
    private let metadataFilename = "photo_metadata.json"

    // MARK: - Storage Directory

    /// Get or create the photos directory
    private func getPhotosDirectory() throws -> URL {
        guard let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
            throw PhotoStorageError.storageUnavailable
        }

        let photosDir = documentsDirectory.appendingPathComponent(photosDirectory)

        // Create directory if it doesn't exist
        if !fileManager.fileExists(atPath: photosDir.path) {
            try fileManager.createDirectory(at: photosDir, withIntermediateDirectories: true)
        }

        return photosDir
    }

    // MARK: - Save Photo

    /// Save photo to disk and return metadata
    func savePhoto(_ image: UIImage, for timeEntryId: UUID, caption: String? = nil) async throws -> TimeEntryPhoto {
        isSaving = true
        defer { isSaving = false }

        do {
            // Get photos directory
            let photosDir = try getPhotosDirectory()

            // Generate unique filename
            let photoId = UUID().uuidString
            let filename = "\(photoId).jpg"
            let fileURL = photosDir.appendingPathComponent(filename)

            // Compress image to JPEG (quality 0.8 for good balance)
            guard let imageData = image.jpegData(compressionQuality: 0.8) else {
                throw PhotoStorageError.invalidImageData
            }

            // Write to disk
            try imageData.write(to: fileURL)

            // Create metadata
            let photo = TimeEntryPhoto(
                id: photoId,
                timeEntryId: timeEntryId,
                timestamp: Date(),
                caption: caption,
                fileSize: Int64(imageData.count)
            )

            // Save metadata
            try saveMetadata(photo)

            print("PhotoStorageService: Saved photo \(photoId) (\(imageData.count) bytes)")
            return photo

        } catch let error as PhotoStorageError {
            lastError = error
            throw error
        } catch {
            let storageError = PhotoStorageError.saveFailed(error.localizedDescription)
            lastError = storageError
            throw storageError
        }
    }

    // MARK: - Load Photo

    /// Load photo from disk by ID
    func loadPhoto(id: String) async throws -> UIImage {
        do {
            let photosDir = try getPhotosDirectory()
            let filename = "\(id).jpg"
            let fileURL = photosDir.appendingPathComponent(filename)

            // Check if file exists
            guard fileManager.fileExists(atPath: fileURL.path) else {
                throw PhotoStorageError.loadFailed("Photo file not found")
            }

            // Load image data
            let imageData = try Data(contentsOf: fileURL)

            // Create UIImage
            guard let image = UIImage(data: imageData) else {
                throw PhotoStorageError.invalidImageData
            }

            return image

        } catch let error as PhotoStorageError {
            lastError = error
            throw error
        } catch {
            let storageError = PhotoStorageError.loadFailed(error.localizedDescription)
            lastError = storageError
            throw storageError
        }
    }

    // MARK: - Delete Photo

    /// Delete photo from disk
    func deletePhoto(id: String) async throws {
        do {
            let photosDir = try getPhotosDirectory()
            let filename = "\(id).jpg"
            let fileURL = photosDir.appendingPathComponent(filename)

            // Delete file if it exists
            if fileManager.fileExists(atPath: fileURL.path) {
                try fileManager.removeItem(at: fileURL)
            }

            // Delete metadata
            try deleteMetadata(id: id)

            print("PhotoStorageService: Deleted photo \(id)")

        } catch let error as PhotoStorageError {
            lastError = error
            throw error
        } catch {
            let storageError = PhotoStorageError.deleteFailed(error.localizedDescription)
            lastError = storageError
            throw storageError
        }
    }

    // MARK: - Batch Operations

    /// Delete all photos for a time entry
    func deleteAllPhotos(for timeEntryId: UUID) async throws {
        let metadata = try loadAllMetadata()
        let photosToDelete = metadata.filter { $0.timeEntryId == timeEntryId }

        for photo in photosToDelete {
            try await deletePhoto(id: photo.id)
        }

        print("PhotoStorageService: Deleted \(photosToDelete.count) photos for time entry \(timeEntryId)")
    }

    /// Get total storage size for all photos
    func getTotalStorageSize() throws -> Int64 {
        let photosDir = try getPhotosDirectory()

        guard let enumerator = fileManager.enumerator(at: photosDir, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }

        var totalSize: Int64 = 0

        for case let fileURL as URL in enumerator {
            if let resourceValues = try? fileURL.resourceValues(forKeys: [.fileSizeKey]),
               let fileSize = resourceValues.fileSize {
                totalSize += Int64(fileSize)
            }
        }

        return totalSize
    }

    /// Format storage size for display
    func formatStorageSize(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }

    // MARK: - Metadata Management

    /// Load all photo metadata
    private func loadAllMetadata() throws -> [TimeEntryPhoto] {
        let photosDir = try getPhotosDirectory()
        let metadataURL = photosDir.appendingPathComponent(metadataFilename)

        // Return empty array if file doesn't exist
        guard fileManager.fileExists(atPath: metadataURL.path) else {
            return []
        }

        let data = try Data(contentsOf: metadataURL)
        let metadata = try JSONDecoder().decode([TimeEntryPhoto].self, from: data)
        return metadata
    }

    /// Save photo metadata
    private func saveMetadata(_ photo: TimeEntryPhoto) throws {
        var metadata = try loadAllMetadata()

        // Remove existing entry if updating
        metadata.removeAll { $0.id == photo.id }

        // Add new entry
        metadata.append(photo)

        // Save to disk
        let photosDir = try getPhotosDirectory()
        let metadataURL = photosDir.appendingPathComponent(metadataFilename)

        let data = try JSONEncoder().encode(metadata)
        try data.write(to: metadataURL)
    }

    /// Delete photo metadata
    private func deleteMetadata(id: String) throws {
        var metadata = try loadAllMetadata()
        metadata.removeAll { $0.id == id }

        let photosDir = try getPhotosDirectory()
        let metadataURL = photosDir.appendingPathComponent(metadataFilename)

        let data = try JSONEncoder().encode(metadata)
        try data.write(to: metadataURL)
    }

    // MARK: - Photo Management

    /// Get metadata for specific photo
    func getPhotoMetadata(id: String) throws -> TimeEntryPhoto? {
        let metadata = try loadAllMetadata()
        return metadata.first { $0.id == id }
    }

    /// Get all photos for a time entry
    func getPhotosForTimeEntry(id: UUID) throws -> [TimeEntryPhoto] {
        let metadata = try loadAllMetadata()
        return metadata.filter { $0.timeEntryId == id }
    }

    /// Update photo caption
    func updateCaption(photoId: String, caption: String) async throws {
        guard let photo = try getPhotoMetadata(id: photoId) else {
            throw PhotoStorageError.loadFailed("Photo metadata not found")
        }

        // Create updated photo with new caption (recreate since struct is immutable)
        let updatedPhoto = TimeEntryPhoto(
            id: photo.id,
            timeEntryId: photo.timeEntryId,
            timestamp: photo.timestamp,
            caption: caption,
            fileSize: photo.fileSize
        )

        try saveMetadata(updatedPhoto)
        print("PhotoStorageService: Updated caption for photo \(photoId)")
    }

    // MARK: - Cleanup

    /// Remove orphaned photos (photos without metadata)
    func cleanupOrphanedPhotos() async throws {
        let photosDir = try getPhotosDirectory()
        let metadata = try loadAllMetadata()
        let metadataIds = Set(metadata.map { $0.id })

        // Get all photo files
        let contents = try fileManager.contentsOfDirectory(at: photosDir, includingPropertiesForKeys: nil)
        let photoFiles = contents.filter { $0.pathExtension == "jpg" }

        var deletedCount = 0

        for fileURL in photoFiles {
            let filename = fileURL.deletingPathExtension().lastPathComponent

            // Delete if no metadata exists
            if !metadataIds.contains(filename) {
                try fileManager.removeItem(at: fileURL)
                deletedCount += 1
            }
        }

        if deletedCount > 0 {
            print("PhotoStorageService: Cleaned up \(deletedCount) orphaned photos")
        }
    }
}
