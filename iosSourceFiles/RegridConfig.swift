//
//  RegridConfig.swift
//  TreeShop
//
//  Feature flag and configuration system for Regrid integration
//  Manages API keys, feature availability, and usage tracking
//

import Foundation
import SwiftUI

// MARK: - Regrid Feature Status

enum RegridFeatureStatus: String, Codable {
    case notConfigured = "Not Configured"
    case trial = "Trial Active"
    case active = "Active"
    case disabled = "Disabled"
    case suspended = "Suspended"
}

// MARK: - Regrid Config

@MainActor
class RegridConfig: ObservableObject {
    // MARK: - Singleton
    static let shared = RegridConfig()

    // MARK: - Published Properties

    @Published var isEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isEnabled, forKey: Keys.isEnabled)
        }
    }

    @Published var apiKey: String {
        didSet {
            UserDefaults.standard.set(apiKey, forKey: Keys.apiKey)
        }
    }

    @Published var featureStatus: RegridFeatureStatus {
        didSet {
            UserDefaults.standard.set(featureStatus.rawValue, forKey: Keys.featureStatus)
        }
    }

    @Published var usageCount: Int {
        didSet {
            UserDefaults.standard.set(usageCount, forKey: Keys.usageCount)
        }
    }

    @Published var monthlyUsageLimit: Int {
        didSet {
            UserDefaults.standard.set(monthlyUsageLimit, forKey: Keys.monthlyUsageLimit)
        }
    }

    @Published var lastResetDate: Date {
        didSet {
            UserDefaults.standard.set(lastResetDate, forKey: Keys.lastResetDate)
        }
    }

    @Published var trialExpirationDate: Date? {
        didSet {
            if let date = trialExpirationDate {
                UserDefaults.standard.set(date, forKey: Keys.trialExpirationDate)
            } else {
                UserDefaults.standard.removeObject(forKey: Keys.trialExpirationDate)
            }
        }
    }

    // MARK: - Private Storage Keys

    private enum Keys {
        static let isEnabled = "regrid.isEnabled"
        static let apiKey = "regrid.apiKey"
        static let featureStatus = "regrid.featureStatus"
        static let usageCount = "regrid.usageCount"
        static let monthlyUsageLimit = "regrid.monthlyUsageLimit"
        static let lastResetDate = "regrid.lastResetDate"
        static let trialExpirationDate = "regrid.trialExpirationDate"
        static let hasCompletedOnboarding = "regrid.hasCompletedOnboarding"
        static let autoAFISSEnabled = "regrid.autoAFISSEnabled"
        static let showCelebrations = "regrid.showCelebrations"
    }

    // MARK: - Additional Settings

    var hasCompletedOnboarding: Bool {
        get {
            UserDefaults.standard.bool(forKey: Keys.hasCompletedOnboarding)
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Keys.hasCompletedOnboarding)
        }
    }

    var autoAFISSEnabled: Bool {
        get {
            UserDefaults.standard.object(forKey: Keys.autoAFISSEnabled) as? Bool ?? true // Default ON
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Keys.autoAFISSEnabled)
        }
    }

    var showCelebrations: Bool {
        get {
            UserDefaults.standard.object(forKey: Keys.showCelebrations) as? Bool ?? true // Default ON
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Keys.showCelebrations)
        }
    }

    // MARK: - Computed Properties

    var isConfigured: Bool {
        !apiKey.isEmpty
    }

    var isActive: Bool {
        isEnabled && isConfigured && (featureStatus == .active || featureStatus == .trial)
    }

    var hasReachedLimit: Bool {
        guard monthlyUsageLimit > 0 else { return false }
        return usageCount >= monthlyUsageLimit
    }

    var remainingLookups: Int {
        guard monthlyUsageLimit > 0 else { return .max }
        return max(0, monthlyUsageLimit - usageCount)
    }

    var usagePercentage: Double {
        guard monthlyUsageLimit > 0 else { return 0.0 }
        return Double(usageCount) / Double(monthlyUsageLimit)
    }

    var isTrialActive: Bool {
        featureStatus == .trial && !isTrialExpired
    }

    var isTrialExpired: Bool {
        guard let expirationDate = trialExpirationDate else { return false }
        return Date() > expirationDate
    }

    var trialDaysRemaining: Int {
        guard let expirationDate = trialExpirationDate else { return 0 }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: expirationDate).day ?? 0
        return max(0, days)
    }

    // MARK: - Initialization

    private init() {
        // Load from UserDefaults
        self.isEnabled = UserDefaults.standard.object(forKey: Keys.isEnabled) as? Bool ?? false
        self.apiKey = UserDefaults.standard.string(forKey: Keys.apiKey) ?? ""
        self.usageCount = UserDefaults.standard.integer(forKey: Keys.usageCount)
        self.monthlyUsageLimit = UserDefaults.standard.object(forKey: Keys.monthlyUsageLimit) as? Int ?? 100 // Default 100/month
        self.lastResetDate = UserDefaults.standard.object(forKey: Keys.lastResetDate) as? Date ?? Date()

        if let statusString = UserDefaults.standard.string(forKey: Keys.featureStatus),
           let status = RegridFeatureStatus(rawValue: statusString) {
            self.featureStatus = status
        } else {
            self.featureStatus = .notConfigured
        }

        if let trialDate = UserDefaults.standard.object(forKey: Keys.trialExpirationDate) as? Date {
            self.trialExpirationDate = trialDate
        } else {
            self.trialExpirationDate = nil
        }

        // Check if we need to reset monthly usage
        checkAndResetMonthlyUsage()
    }

    // MARK: - Configuration Methods

    /// Configure Regrid with API key
    func configure(apiKey: String) {
        self.apiKey = apiKey
        self.isEnabled = true

        // If not already in trial or active, start trial
        if featureStatus == .notConfigured || featureStatus == .disabled {
            startTrial()
        }
    }

    /// Start trial period (30 days, 100 lookups)
    func startTrial() {
        featureStatus = .trial
        trialExpirationDate = Calendar.current.date(byAdding: .day, value: 30, to: Date())
        monthlyUsageLimit = 100
        usageCount = 0
        lastResetDate = Date()
        hasCompletedOnboarding = false
    }

    /// Activate full subscription (unlimited for TreeShop founding members)
    func activateSubscription() {
        featureStatus = .active
        trialExpirationDate = nil
        monthlyUsageLimit = 0 // 0 = unlimited
        usageCount = 0
        lastResetDate = Date()
    }

    /// Disable Regrid integration
    func disable() {
        isEnabled = false
        featureStatus = .disabled
    }

    /// Re-enable after being disabled
    func enable() {
        guard isConfigured else { return }
        isEnabled = true

        // Restore previous status or set to active
        if featureStatus == .disabled {
            if let expirationDate = trialExpirationDate, Date() < expirationDate {
                featureStatus = .trial
            } else {
                featureStatus = .active
            }
        }
    }

    // MARK: - Usage Tracking

    /// Increment usage counter
    func trackLookup() {
        usageCount += 1
        checkAndResetMonthlyUsage()
    }

    /// Check if monthly reset is needed
    private func checkAndResetMonthlyUsage() {
        let calendar = Calendar.current
        let now = Date()

        // Check if we've crossed into a new month
        if !calendar.isDate(now, equalTo: lastResetDate, toGranularity: .month) {
            resetMonthlyUsage()
        }

        // Check if trial has expired
        if isTrialActive && isTrialExpired {
            featureStatus = .suspended
            isEnabled = false
        }
    }

    /// Reset monthly usage counter
    func resetMonthlyUsage() {
        usageCount = 0
        lastResetDate = Date()
    }

    // MARK: - Validation

    /// Check if lookup is allowed (within limits)
    func canPerformLookup() -> (allowed: Bool, reason: String?) {
        guard isConfigured else {
            return (false, "Regrid API not configured")
        }

        guard isEnabled else {
            return (false, "Regrid integration is disabled")
        }

        guard featureStatus == .active || featureStatus == .trial else {
            return (false, "Regrid subscription not active")
        }

        if featureStatus == .trial && isTrialExpired {
            return (false, "Trial period has expired")
        }

        if hasReachedLimit {
            return (false, "Monthly lookup limit reached (\(monthlyUsageLimit) lookups)")
        }

        return (true, nil)
    }

    // MARK: - Status Display

    var statusMessage: String {
        switch featureStatus {
        case .notConfigured:
            return "Configure Regrid API to enable property boundary features"
        case .trial:
            if isTrialExpired {
                return "Trial expired. Upgrade to continue using Regrid features."
            } else {
                return "Trial active: \(trialDaysRemaining) days remaining, \(remainingLookups) lookups left"
            }
        case .active:
            if monthlyUsageLimit > 0 {
                return "Active: \(remainingLookups) lookups remaining this month"
            } else {
                return "Active: Unlimited lookups"
            }
        case .disabled:
            return "Regrid integration is currently disabled"
        case .suspended:
            return "Subscription suspended. Please renew to continue."
        }
    }

    var statusColor: Color {
        switch featureStatus {
        case .notConfigured:
            return .gray
        case .trial:
            return isTrialExpired ? .red : .orange
        case .active:
            if hasReachedLimit {
                return .red
            } else if usagePercentage > 0.8 {
                return .orange
            } else {
                return .green
            }
        case .disabled:
            return .gray
        case .suspended:
            return .red
        }
    }

    // MARK: - Reset & Debug

    /// Clear all configuration (for testing/debugging)
    func clearConfiguration() {
        apiKey = ""
        isEnabled = false
        featureStatus = .notConfigured
        usageCount = 0
        monthlyUsageLimit = 100
        lastResetDate = Date()
        trialExpirationDate = nil
        hasCompletedOnboarding = false
    }

    /// Debug information
    var debugInfo: String {
        """
        Regrid Configuration Debug Info:
        --------------------------------
        Enabled: \(isEnabled)
        Configured: \(isConfigured)
        Status: \(featureStatus.rawValue)
        API Key: \(apiKey.isEmpty ? "Not Set" : "Set (\(apiKey.prefix(8))...)")
        Usage: \(usageCount) / \(monthlyUsageLimit == 0 ? "Unlimited" : "\(monthlyUsageLimit)")
        Last Reset: \(lastResetDate.formatted(date: .abbreviated, time: .omitted))
        Trial Expiration: \(trialExpirationDate?.formatted(date: .abbreviated, time: .omitted) ?? "N/A")
        Auto-AFISS: \(autoAFISSEnabled ? "Enabled" : "Disabled")
        Celebrations: \(showCelebrations ? "Enabled" : "Disabled")
        Onboarding Complete: \(hasCompletedOnboarding)
        """
    }
}

// MARK: - SwiftUI Environment Key

@MainActor
struct RegridConfigKey: EnvironmentKey {
    static let defaultValue = RegridConfig.shared
}

extension EnvironmentValues {
    var regridConfig: RegridConfig {
        get { self[RegridConfigKey.self] }
        set { self[RegridConfigKey.self] = newValue }
    }
}
