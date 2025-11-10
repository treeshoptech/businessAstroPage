//
//  InvitationManager.swift
//  TreeShop
//
//  Simple invitation code system for multi-user organizations
//

import Foundation
import SwiftData

enum InvitationError: Error {
    case invalidCode
    case codeExpired
    case alreadyMember
    case noCurrentUser
}

@Observable
class InvitationManager {
    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    /// Generate a 6-digit invitation code for an organization
    /// Code expires after 24 hours
    func generateInvitationCode(for organization: Organization) -> String {
        let code = String(format: "%06d", Int.random(in: 100000...999999))
        organization.invitationCode = code
        organization.invitationCodeExpiry = Date().addingTimeInterval(86400) // 24 hours

        do {
            try modelContext.save()
            print("✅ Generated invitation code: \(code) for organization: \(organization.name)")
            print("   Expires: \(organization.invitationCodeExpiry!)")
        } catch {
            print("❌ Failed to save invitation code: \(error)")
        }

        return code
    }

    /// Accept an invitation code and link current user to organization
    func acceptInvitation(code: String, currentUser: User) throws -> Organization {
        // Validate code format
        guard code.count == 6, code.allSatisfy({ $0.isNumber }) else {
            throw InvitationError.invalidCode
        }

        // Find organization with matching code
        let descriptor = FetchDescriptor<Organization>(
            predicate: #Predicate { org in
                org.invitationCode == code
            }
        )

        guard let organization = try modelContext.fetch(descriptor).first else {
            print("❌ No organization found with code: \(code)")
            throw InvitationError.invalidCode
        }

        // Check if code is expired
        if let expiry = organization.invitationCodeExpiry, expiry < Date() {
            print("❌ Invitation code expired: \(code)")
            throw InvitationError.codeExpired
        }

        // Check if user is already a member
        if let existingOrg = currentUser.organization, existingOrg.id == organization.id {
            print("⚠️ User is already a member of: \(organization.name)")
            throw InvitationError.alreadyMember
        }

        // Link user to organization
        currentUser.organization = organization

        do {
            try modelContext.save()
            print("✅ User \(currentUser.name) joined organization: \(organization.name)")
            print("   Using code: \(code)")
        } catch {
            print("❌ Failed to link user to organization: \(error)")
            throw error
        }

        return organization
    }

    /// Invalidate invitation code (admin action)
    func invalidateInvitationCode(for organization: Organization) {
        organization.invitationCode = nil
        organization.invitationCodeExpiry = nil

        do {
            try modelContext.save()
            print("✅ Invalidated invitation code for: \(organization.name)")
        } catch {
            print("❌ Failed to invalidate invitation code: \(error)")
        }
    }

    /// Remove user from organization
    func removeUser(_ user: User, from organization: Organization) throws {
        guard user.organization?.id == organization.id else {
            print("⚠️ User is not a member of this organization")
            return
        }

        // Unlink user from organization
        user.organization = nil

        do {
            try modelContext.save()
            print("✅ Removed user \(user.name) from organization: \(organization.name)")
        } catch {
            print("❌ Failed to remove user from organization: \(error)")
            throw error
        }
    }

    /// Check if invitation code is still valid
    func isCodeValid(_ code: String) throws -> Bool {
        let descriptor = FetchDescriptor<Organization>(
            predicate: #Predicate { org in
                org.invitationCode == code
            }
        )

        guard let organization = try modelContext.fetch(descriptor).first else {
            return false
        }

        if let expiry = organization.invitationCodeExpiry {
            return expiry > Date()
        }

        return true
    }
}
