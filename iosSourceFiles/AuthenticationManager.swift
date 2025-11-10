//
//  AuthenticationManager.swift
//  TreeShop
//
//  Handles Sign in with Apple authentication
//

import Foundation
import AuthenticationServices
import SwiftData

@Observable
class AuthenticationManager: NSObject {
    var currentUser: User?
    var isAuthenticated: Bool = false
    var authenticationError: String?

    private var modelContext: ModelContext?

    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        checkExistingSession()
    }

    // Check if user is already signed in
    private func checkExistingSession() {
        guard let appleUserID = UserDefaults.standard.string(forKey: "appleUserID"),
              let modelContext = modelContext else {
            return
        }

        // Run database query asynchronously to avoid blocking main thread
        Task { @MainActor in
            let descriptor = FetchDescriptor<User>(
                predicate: #Predicate { user in
                    user.appleUserID == appleUserID
                }
            )

            if let user = try? modelContext.fetch(descriptor).first {
                self.currentUser = user
                self.isAuthenticated = true
            }
        }
    }

    // Handle Sign in with Apple authorization
    func handleSignInWithApple(_ authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let modelContext = modelContext else {
            authenticationError = "Invalid authorization"
            return
        }

        let appleUserID = appleIDCredential.user
        let email = appleIDCredential.email ?? ""
        let fullName = appleIDCredential.fullName
        let firstName = fullName?.givenName ?? ""
        let lastName = fullName?.familyName ?? ""
        let name = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)

        // Run authentication asynchronously to avoid blocking main thread
        Task { @MainActor in
            let descriptor = FetchDescriptor<User>(
                predicate: #Predicate { user in
                    user.appleUserID == appleUserID
                }
            )

            if let existingUser = try? modelContext.fetch(descriptor).first {
                // User exists, sign in
                self.currentUser = existingUser
                self.isAuthenticated = true
                UserDefaults.standard.set(appleUserID, forKey: "appleUserID")
            } else {
                // New user - create account WITHOUT organization
                // User will be prompted to create their business organization properly
                let displayName = name.isEmpty ? "TreeShop User" : name
                let userEmail = email.isEmpty ? "user@treeshop.app" : email

                // Create user WITHOUT an organization
                // They'll create their business organization in the onboarding flow
                let newUser = User(
                    email: userEmail,
                    name: displayName,
                    role: .owner,
                    appleUserID: appleUserID,
                    organization: nil  // No auto-created organization
                )

                modelContext.insert(newUser)

                do {
                    try modelContext.save()
                    self.currentUser = newUser
                    self.isAuthenticated = true
                    UserDefaults.standard.set(appleUserID, forKey: "appleUserID")
                } catch {
                    self.authenticationError = "Failed to create account: \(error.localizedDescription)"
                }
            }
        }
    }

    // Sign out
    func signOut() {
        UserDefaults.standard.removeObject(forKey: "appleUserID")
        self.currentUser = nil
        self.isAuthenticated = false
    }
}

// ASAuthorizationControllerDelegate conformance
extension AuthenticationManager: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        handleSignInWithApple(authorization)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        authenticationError = error.localizedDescription
    }
}
