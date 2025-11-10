import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Organization (multi-tenant root)
  organizations: defineTable({
    name: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    workosOrgId: v.string(), // WorkOS organization ID
    status: v.union(v.literal("active"), v.literal("trial"), v.literal("suspended")),
    createdAt: v.number(),

    // Global Pricing Settings
    defaultMarginLow: v.optional(v.number()), // Default: 30
    defaultMarginHigh: v.optional(v.number()), // Default: 50
    taxRate: v.optional(v.number()), // Default: 0 (percentage)
    currency: v.optional(v.string()), // Default: "USD"

    // Global Production Settings
    globalBufferPercentage: v.optional(v.number()), // Default: 10
    defaultTransportRate: v.optional(v.number()), // Default: 0.5 (50% of loadout rate)
    minimumJobHours: v.optional(v.number()), // Default: 2
    minimumJobPrice: v.optional(v.number()), // Default: 500

    // Terms & Conditions
    defaultTermsAndConditions: v.optional(v.string()),
    proposalValidityDays: v.optional(v.number()), // Default: 30

    // Proposal Display Settings
    showHourBreakdown: v.optional(v.boolean()), // Default: false (don't show hourly rates to customers)
    showAfissFactors: v.optional(v.boolean()), // Default: true (transparency)
    proposalHeaderText: v.optional(v.string()),
    proposalFooterText: v.optional(v.string()),
  })
    .index("by_workos_org", ["workosOrgId"])
    .index("by_status", ["status"]),

  // Users (also serves as employees)
  users: defineTable({
    organizationId: v.id("organizations"),
    workosUserId: v.string(), // WorkOS user ID
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("manager"),
      v.literal("estimator"),
      v.literal("crew_leader"),
      v.literal("crew_member")
    ),
    avatarUrl: v.optional(v.string()),
    // Employment fields
    position: v.optional(v.string()),
    baseHourlyRate: v.optional(v.number()),
    burdenMultiplier: v.optional(v.number()),
    hireDate: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_workos_user", ["workosUserId"])
    .index("by_email", ["email"]),

  // Equipment
  equipment: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    category: v.union(
      // Wood Processing
      v.literal("chipper"),
      v.literal("stump_grinder"),
      v.literal("forestry_mulcher"),

      // Heavy Equipment
      v.literal("excavator"),
      v.literal("skid_steer"),
      v.literal("track_loader"),
      v.literal("wheel_loader"),
      v.literal("tractor"),
      v.literal("mini_skid"),
      v.literal("backhoe"),
      v.literal("dozer"),

      // Aerial Access
      v.literal("bucket_truck"),
      v.literal("boom_truck"),
      v.literal("spider_lift"),

      // Trucks & Trailers
      v.literal("chip_truck"),
      v.literal("log_truck"),
      v.literal("crew_truck"),
      v.literal("grapple_truck"),
      v.literal("crane_truck"),
      v.literal("flatbed_truck"),
      v.literal("dump_truck"),
      v.literal("trailer"),

      // Cranes & Loaders
      v.literal("knuckleboom_crane"),
      v.literal("log_loader"),

      // Attachments (sub-category for all machine attachments)
      v.literal("attachment"),

      // Climbing & Rigging
      v.literal("winch"),
      v.literal("grcs"),
      v.literal("climbing_gear"),

      // Saws
      v.literal("chainsaw"),
      v.literal("pole_saw"),

      // PHC Equipment
      v.literal("spray_truck"),
      v.literal("sprayer"),
      v.literal("injection_system"),
      v.literal("air_spade"),

      // Support Equipment
      v.literal("forklift"),
      v.literal("skidder"),
      v.literal("generator"),
      v.literal("firewood_processor"),
      v.literal("tub_grinder"),
      v.literal("support")
    ),
    // Sub-category for attachments (grapple, bucket, mulcher head, etc.)
    attachmentType: v.optional(v.string()),
    // Compatible with what machine types
    compatibleWith: v.optional(v.array(v.string())),
    // Inventory/serial number
    inventoryNumber: v.optional(v.string()),
    // Year, make, model for better identification
    year: v.optional(v.number()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    // Hydraulic requirements (for attachments)
    hydraulicGPM: v.optional(v.number()),
    hydraulicPSI: v.optional(v.number()),
    weight: v.optional(v.number()),
    // Existing cost fields
    purchasePrice: v.number(),
    usefulLifeYears: v.number(),
    annualHours: v.number(),
    // Finance fields - calculate annual cost from percentage and loan length
    financePercentage: v.optional(v.number()), // e.g., 5.0 for 5%
    financeLoanYears: v.optional(v.number()), // e.g., 5 years
    financeCostPerYear: v.number(), // calculated from above or entered directly
    insurancePerYear: v.number(),
    registrationPerYear: v.number(),
    fuelGallonsPerHour: v.number(),
    fuelPricePerGallon: v.number(),
    maintenancePerYear: v.number(),
    repairsPerYear: v.number(),
    status: v.union(v.literal("active"), v.literal("maintenance"), v.literal("retired")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_category", ["organizationId", "category"])
    .index("by_status", ["organizationId", "status"])
    .index("by_attachment_type", ["organizationId", "attachmentType"]),

  // Employees
  employees: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    // Traditional position (basic system)
    position: v.union(
      v.literal("entry_ground_crew"),
      v.literal("experienced_climber"),
      v.literal("crew_leader"),
      v.literal("certified_arborist"),
      v.literal("specialized_operator")
    ),
    baseHourlyRate: v.number(),
    burdenMultiplier: v.number(), // 1.6 - 2.0
    hireDate: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    // TreeShop Employee Coding System (optional upgrade)
    treeShopCode: v.optional(v.string()), // Full code: TRS4+S+E3+D3+CRA+ISA / X-ESR3+E2
    treeShopPrimaryTrack: v.optional(v.string()), // ATC, TRS, FOR, LCL, MUL, STG, ESR, LSC, EQO, MNT, SAL, PMC, ADM, FIN, SAF, TEC
    treeShopTier: v.optional(v.number()), // 1-5
    treeShopLeadership: v.optional(v.string()), // L, S, M, D
    treeShopEquipment: v.optional(v.number()), // 1-4
    treeShopDriver: v.optional(v.number()), // 1-3
    treeShopCredentials: v.optional(v.array(v.string())), // CRA, ISA, OSHA
    treeShopCrossTraining: v.optional(v.array(v.string())), // X-ESR3+E2, X-ATC2
    treeShopQualificationPayRate: v.optional(v.number()), // Calculated pay rate based on qualifications
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_treeshop_track", ["organizationId", "treeShopPrimaryTrack"]),

  // Loadouts (Equipment + Employee configurations)
  loadouts: defineTable({
    organizationId: v.id("organizations"),
    loadoutNumber: v.optional(v.string()), // Auto-generated: LO-0001, LO-0002, etc.
    name: v.string(),
    serviceType: v.union(
      v.literal("forestry_mulching"),
      v.literal("stump_grinding"),
      v.literal("land_clearing"),
      v.literal("tree_removal"),
      v.literal("tree_trimming")
    ),
    isTemplate: v.boolean(), // true = reusable base loadout, false = project-specific

    // Core equipment (always included in this loadout)
    coreEquipment: v.array(v.object({
      equipmentId: v.id("equipment"),
      source: v.union(v.literal("owned"), v.literal("rental")),
      required: v.boolean(), // Can't remove from loadout
      costPerHour: v.number(),
    })),

    // Core employees (always included)
    coreEmployees: v.array(v.object({
      employeeId: v.id("employees"),
      required: v.boolean(),
      costPerHour: v.number(),
    })),

    // Legacy fields for backward compatibility
    equipmentIds: v.optional(v.array(v.id("equipment"))),
    employeeIds: v.optional(v.array(v.id("employees"))),

    productionRatePpH: v.number(), // Points per Hour
    overheadCostPerHour: v.number(),
    baseCostPerHour: v.number(), // Total of core equipment + employees + overhead
    billingRates: v.object({
      margin30: v.number(),
      margin40: v.number(),
      margin50: v.number(),
      margin60: v.number(),
      margin70: v.number(),
    }),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_service_type", ["organizationId", "serviceType"])
    .index("by_template", ["organizationId", "isTemplate"]),

  // Project Loadouts - Base loadout + project-specific additions
  projectLoadouts: defineTable({
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    proposalId: v.optional(v.id("proposals")),
    lineItemId: v.optional(v.id("lineItems")),

    // Link to base template
    baseLoadoutId: v.id("loadouts"),
    baseLoadoutName: v.string(),

    // Inherited from base (snapshot at time of creation)
    coreEquipment: v.array(v.object({
      equipmentId: v.id("equipment"),
      equipmentName: v.string(),
      source: v.string(),
      costPerHour: v.number(),
      fromBase: v.boolean(), // true = from base loadout
    })),

    coreEmployees: v.array(v.object({
      employeeId: v.id("employees"),
      employeeName: v.string(),
      costPerHour: v.number(),
      fromBase: v.boolean(),
    })),

    // PROJECT-SPECIFIC ADDITIONS
    additionalEquipment: v.array(v.object({
      equipmentId: v.id("equipment"),
      equipmentName: v.string(),
      source: v.union(v.literal("owned"), v.literal("rental")),
      reason: v.string(), // "Tight access areas require mini excavator"

      // For owned equipment
      costPerHour: v.optional(v.number()),

      // For rental equipment
      rentalDuration: v.optional(v.string()), // "2 days"
      rentalProvider: v.optional(v.string()), // "Sunbelt Rentals"
      rentalCostBreakdown: v.optional(v.object({
        rentalPeriodCost: v.number(),
        deliveryFee: v.number(),
        pickupFee: v.number(),
        fuelCost: v.number(),
        insuranceCost: v.number(),
        totalCost: v.number(),
        hourlyEquivalent: v.number(),
      })),

      // Usage
      hoursNeeded: v.number(), // Might not need it for full job duration
      percentOfJob: v.number(), // 0-100% (e.g., 30% of project time)
      totalCost: v.number(),
    })),

    additionalEmployees: v.array(v.object({
      employeeId: v.id("employees"),
      employeeName: v.string(),
      reason: v.string(), // "Extra hand for cleanup around structures"
      costPerHour: v.number(),
      hoursNeeded: v.number(),
      percentOfJob: v.number(),
      totalCost: v.number(),
    })),

    // Attachments/accessories
    attachments: v.array(v.object({
      name: v.string(), // "Grapple Attachment"
      equipmentId: v.optional(v.id("equipment")), // Links to equipment if tracked
      attachesToEquipmentId: v.optional(v.id("equipment")), // Which machine it attaches to
      source: v.union(v.literal("owned"), v.literal("rental")),
      costPerDay: v.optional(v.number()),
      costPerHour: v.optional(v.number()),
      flatCost: v.optional(v.number()),
      daysNeeded: v.optional(v.number()),
      hoursNeeded: v.optional(v.number()),
      totalCost: v.number(),
      reason: v.string(),
    })),

    // Consumables/materials
    materials: v.array(v.object({
      name: v.string(), // "Fuel surcharge", "Saw blades", "Hydraulic fluid"
      quantity: v.number(),
      unit: v.string(), // "gallons", "each", "lbs"
      unitCost: v.number(),
      totalCost: v.number(),
      reason: v.string(),
    })),

    // TOTAL COSTS (base + additions)
    baseCostPerHour: v.number(),
    totalEquipmentCost: v.number(),
    totalLaborCost: v.number(),
    totalAttachmentsCost: v.number(),
    totalMaterialsCost: v.number(),
    totalProjectCost: v.number(),

    // For jobs with variable duration
    estimatedProjectHours: v.number(),
    blendedHourlyRate: v.number(), // Total cost / hours

    // Billing
    billingRates: v.object({
      margin30: v.number(),
      margin40: v.number(),
      margin50: v.number(),
      margin60: v.number(),
      margin70: v.number(),
    }),

    // Actual usage tracking (populated after job completion)
    actualUsage: v.optional(v.object({
      coreEquipmentHours: v.array(v.object({
        equipmentId: v.id("equipment"),
        estimatedHours: v.number(),
        actualHours: v.number(),
      })),
      additionalEquipmentHours: v.array(v.object({
        equipmentId: v.id("equipment"),
        estimatedHours: v.number(),
        actualHours: v.number(),
        costVariance: v.number(),
      })),
      additionalEmployeeHours: v.array(v.object({
        employeeId: v.id("employees"),
        estimatedHours: v.number(),
        actualHours: v.number(),
        costVariance: v.number(),
      })),
      attachmentsUsed: v.array(v.object({
        name: v.string(),
        estimatedDuration: v.number(),
        actualDuration: v.number(),
      })),
      materialsUsed: v.array(v.object({
        name: v.string(),
        estimatedQuantity: v.number(),
        actualQuantity: v.number(),
        costVariance: v.number(),
      })),
    })),

    varianceAnalysis: v.optional(v.object({
      estimatedTotalCost: v.number(),
      actualTotalCost: v.number(),
      variance: v.number(), // Dollar amount
      variancePercent: v.number(),
      reason: v.optional(v.string()),
    })),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_project", ["projectId"])
    .index("by_proposal", ["proposalId"])
    .index("by_base_loadout", ["baseLoadoutId"]),

  // Customers
  customers: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    propertyAddress: v.string(),
    propertyCity: v.string(),
    propertyState: v.string(),
    propertyZip: v.string(),
    propertyLatitude: v.optional(v.number()),
    propertyLongitude: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["organizationId"],
    }),

  // Projects
  projects: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    serviceType: v.union(
      v.literal("forestry_mulching"),
      v.literal("stump_grinding"),
      v.literal("land_clearing"),
      v.literal("tree_removal"),
      v.literal("tree_trimming"),
      v.literal("property_assessment")
    ),
    status: v.union(
      v.literal("lead"),
      v.literal("proposal"),
      v.literal("work_order"),
      v.literal("invoice"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    treeShopScore: v.optional(v.number()),
    driveTimeMinutes: v.optional(v.number()),
    projectIntent: v.optional(v.string()),
    siteHazards: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_service_type", ["organizationId", "serviceType"]),

  // Proposals
  proposals: defineTable({
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    loadoutId: v.id("loadouts"),
    scopeOfWork: v.string(),
    inclusions: v.array(v.string()),
    exclusions: v.array(v.string()),
    afissFactors: v.array(
      v.object({
        category: v.string(),
        factor: v.string(),
        percentage: v.number(),
      })
    ),
    afissMultiplier: v.number(),
    adjustedTreeShopScore: v.number(),
    estimatedHours: v.number(),
    transportHours: v.number(),
    bufferHours: v.number(),
    totalHours: v.number(),
    priceRangeLow: v.number(),
    priceRangeHigh: v.number(),
    termsAndConditions: v.optional(v.string()),
    signatureDataUrl: v.optional(v.string()),
    signedName: v.optional(v.string()),
    signedDate: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_project", ["projectId"]),

  // Quotes (simplified financial record)
  quotes: defineTable({
    organizationId: v.id("organizations"),
    proposalId: v.id("proposals"),
    totalCost: v.number(),
    selectedMargin: v.number(),
    finalPrice: v.number(),
    profitAmount: v.number(),
    profitMarginPercent: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_proposal", ["proposalId"]),

  // Work Orders (Approved proposals ready for execution)
  workOrders: defineTable({
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    proposalId: v.id("proposals"),
    customerId: v.id("customers"),
    loadoutId: v.id("loadouts"),

    // Work details
    serviceType: v.string(),
    treeShopScore: v.number(),
    afissMultiplier: v.number(),
    adjustedTreeShopScore: v.number(),

    // Time estimates
    estimatedTotalHours: v.number(),
    estimatedPrimaryHours: v.number(), // For PpH calculation
    estimatedPpH: v.number(),

    // Actual tracking (updated from time entries)
    actualTotalHours: v.optional(v.number()),
    actualPrimaryHours: v.optional(v.number()),
    actualPpH: v.optional(v.number()),
    performanceVsEstimate: v.optional(v.number()), // Percentage

    // Scheduling
    scheduledStartDate: v.optional(v.number()),
    scheduledEndDate: v.optional(v.number()),
    actualStartDate: v.optional(v.number()),
    actualEndDate: v.optional(v.number()),

    // Crew assignment
    assignedEmployeeIds: v.array(v.id("users")),
    assignedEquipmentIds: v.array(v.id("equipment")),

    // Status
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("cancelled")
    ),

    // Documentation
    notes: v.optional(v.string()),
    beforePhotos: v.optional(v.array(v.string())),
    duringPhotos: v.optional(v.array(v.string())),
    afterPhotos: v.optional(v.array(v.string())),

    // Customer approval
    customerSignature: v.optional(v.string()),
    customerApprovalDate: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_scheduled_date", ["organizationId", "scheduledStartDate"]),

  // Tasks (Breakdown of work within a work order)
  tasks: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),

    // Task details
    taskName: v.string(),
    taskCategory: v.union(
      v.literal("Setup"),
      v.literal("Transport"),
      v.literal("Production"),
      v.literal("Cleanup"),
      v.literal("Customer Communication"),
      v.literal("Equipment Maintenance"),
      v.literal("Break Time")
    ),
    description: v.string(),

    // Billing & tracking
    isBillable: v.boolean(),
    isPrimaryTask: v.boolean(), // True for main production task (PpH measured here)

    // Estimates
    estimatedHours: v.number(),
    estimatedPercentOfTotal: v.number(),

    // For PpH calculation (primary tasks only)
    treeShopScoreAllocation: v.optional(v.number()), // Portion of total score for this task

    // Actuals (from time entries)
    actualHours: v.optional(v.number()),
    actualPpH: v.optional(v.number()),

    // Assignment
    assignedEmployeeIds: v.array(v.id("users")),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped")
    ),

    // Ordering
    sortOrder: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_status", ["workOrderId", "status"])
    .index("by_primary_task", ["isPrimaryTask", "status"])
    .index("by_sort_order", ["workOrderId", "sortOrder"]),

  // Time Entries (Clock in/out tracking per task)
  timeEntries: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskId: v.id("tasks"),
    employeeId: v.id("users"),

    // Time tracking
    clockIn: v.number(),
    clockOut: v.optional(v.number()),
    totalHours: v.optional(v.number()),

    // Break tracking
    breakMinutes: v.optional(v.number()),
    paidBreak: v.optional(v.boolean()),

    // Task details (denormalized for easy querying)
    taskName: v.string(),
    taskCategory: v.string(),
    isBillable: v.boolean(),
    isPrimaryTask: v.boolean(),

    // For PpH calculation
    treeShopScoreAtStart: v.optional(v.number()),
    treeShopScoreCompleted: v.optional(v.number()), // For partial completions
    pointsPerHour: v.optional(v.number()), // Calculated when clock out

    // Location verification
    gpsCoordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      accuracy: v.optional(v.number()),
    })),
    locationVerified: v.optional(v.boolean()),

    // Documentation
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    issuesEncountered: v.optional(v.array(v.string())),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("disputed")
    ),

    // Approval workflow
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_task", ["taskId"])
    .index("by_employee", ["employeeId"])
    .index("by_status", ["status"])
    .index("by_primary_task", ["isPrimaryTask", "status"])
    .index("by_date", ["organizationId", "clockIn"]),

  // Events - Immutable event log for analytics
  events: defineTable({
    organizationId: v.id("organizations"),
    eventType: v.union(
      // Proposal lifecycle
      v.literal("proposal_created"),
      v.literal("proposal_sent"),
      v.literal("proposal_viewed"),
      v.literal("proposal_signed"),
      v.literal("proposal_rejected"),
      v.literal("proposal_expired"),

      // Work order lifecycle
      v.literal("work_order_created"),
      v.literal("work_order_scheduled"),
      v.literal("work_order_started"),
      v.literal("work_order_paused"),
      v.literal("work_order_resumed"),
      v.literal("work_order_completed"),
      v.literal("work_order_approved"),

      // Time tracking
      v.literal("time_clock_in"),
      v.literal("time_clock_out"),
      v.literal("time_break_start"),
      v.literal("time_break_end"),

      // Invoice lifecycle
      v.literal("invoice_created"),
      v.literal("invoice_sent"),
      v.literal("invoice_viewed"),
      v.literal("invoice_paid"),
      v.literal("invoice_overdue"),

      // Equipment events
      v.literal("equipment_added"),
      v.literal("equipment_maintenance"),
      v.literal("equipment_repair"),
      v.literal("equipment_retired"),

      // Customer events
      v.literal("customer_created"),
      v.literal("customer_contacted"),
      v.literal("customer_review_received"),

      // System events
      v.literal("user_login"),
      v.literal("settings_changed"),
      v.literal("report_generated")
    ),
    timestamp: v.number(),
    userId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    workOrderId: v.optional(v.id("workOrders")),
    customerId: v.optional(v.id("customers")),
    equipmentId: v.optional(v.id("equipment")),

    // Flexible JSON data for event-specific information
    data: v.optional(v.any()),

    // Event metadata
    source: v.string(), // "web_app", "mobile_app", "api", "system"
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    // Financial snapshot (for revenue/cost events)
    financialSnapshot: v.optional(v.object({
      amount: v.number(),
      currency: v.string(),
      category: v.string(),
    })),
  })
    .index("by_org_timestamp", ["organizationId", "timestamp"])
    .index("by_type", ["eventType", "timestamp"])
    .index("by_project", ["projectId", "timestamp"])
    .index("by_user", ["userId", "timestamp"]),

  // Metric Snapshots - Pre-calculated daily/weekly/monthly rollups
  metricSnapshots: defineTable({
    organizationId: v.id("organizations"),

    // Time period
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    periodStart: v.number(), // Timestamp of period start
    periodEnd: v.number(), // Timestamp of period end

    // Financial Metrics
    totalRevenue: v.number(),
    totalCosts: v.number(),
    grossProfit: v.number(),
    grossMargin: v.number(), // Percentage
    netProfit: v.number(),
    netMargin: v.number(), // Percentage

    // Operational Metrics
    proposalsCreated: v.number(),
    proposalsSent: v.number(),
    proposalsWon: v.number(),
    proposalsLost: v.number(),
    closeRate: v.number(), // Percentage
    averageProposalValue: v.number(),
    averageTimeToClose: v.number(), // Hours

    workOrdersCompleted: v.number(),
    totalProjectHours: v.number(),
    averageProjectDuration: v.number(), // Hours

    invoicesSent: v.number(),
    invoicesPaid: v.number(),
    invoicesOverdue: v.number(),
    averageDaysToPayment: v.number(),

    // Service Type Breakdown
    revenueByServiceType: v.object({
      forestry_mulching: v.number(),
      stump_grinding: v.number(),
      land_clearing: v.number(),
      tree_removal: v.number(),
      tree_trimming: v.number(),
      property_assessment: v.number(),
    }),

    projectsByServiceType: v.object({
      forestry_mulching: v.number(),
      stump_grinding: v.number(),
      land_clearing: v.number(),
      tree_removal: v.number(),
      tree_trimming: v.number(),
      property_assessment: v.number(),
    }),

    // Asset Performance
    equipmentUtilization: v.number(), // Percentage
    averageEquipmentCostPerHour: v.number(),
    laborUtilization: v.number(), // Percentage
    averageLaborCostPerHour: v.number(),

    // Customer Metrics
    newCustomers: v.number(),
    repeatCustomers: v.number(),
    customerRetentionRate: v.number(), // Percentage
    averageCustomerValue: v.number(),

    // Estimation Accuracy
    averageCostVariance: v.number(), // Percentage (estimated vs actual)
    averageTimeVariance: v.number(), // Percentage (estimated vs actual)
    accuracyScore: v.number(), // 0-100

    // Generated timestamp
    createdAt: v.number(),
  })
    .index("by_org_period", ["organizationId", "period", "periodStart"])
    .index("by_period_start", ["organizationId", "periodStart"]),

  // Performance Records - Equipment and employee performance tracking
  performanceRecords: defineTable({
    organizationId: v.id("organizations"),

    // Record type and subject
    recordType: v.union(v.literal("equipment"), v.literal("employee"), v.literal("loadout")),
    equipmentId: v.optional(v.id("equipment")),
    employeeId: v.optional(v.id("employees")),
    loadoutId: v.optional(v.id("loadouts")),

    // Time period for this record
    periodStart: v.number(),
    periodEnd: v.number(),

    // Usage Metrics
    totalHours: v.number(),
    billableHours: v.number(),
    utilizationRate: v.number(), // Percentage

    // Financial Metrics
    totalRevenue: v.number(),
    totalCosts: v.number(),
    profit: v.number(),
    profitMargin: v.number(), // Percentage
    revenuePerHour: v.number(),

    // Productivity Metrics (for equipment/employee)
    projectsCompleted: v.number(),
    averageTreeShopScore: v.number(),
    totalTreeShopPoints: v.number(),
    averagePpH: v.number(), // Points per Hour

    // Efficiency Score
    efficiencyScore: v.number(), // 0-100, compared to org average
    performanceVsBenchmark: v.number(), // Percentage above/below benchmark

    // Quality Metrics
    customerSatisfactionScore: v.optional(v.number()), // 1-5 stars
    issuesReported: v.number(),

    // Cost Breakdown (equipment only)
    fuelCosts: v.optional(v.number()),
    maintenanceCosts: v.optional(v.number()),
    repairCosts: v.optional(v.number()),

    // Variance Tracking
    estimatedCosts: v.number(),
    actualCosts: v.number(),
    costVariance: v.number(), // Percentage
    estimatedHours: v.number(),
    actualHours: v.number(),
    timeVariance: v.number(), // Percentage

    // ROI Calculation
    totalInvestment: v.optional(v.number()), // For equipment: purchase + finance
    roi: v.optional(v.number()), // Return on investment percentage
    paybackPeriod: v.optional(v.number()), // Months to break even

    // Trends (comparison to previous period)
    revenueGrowth: v.number(), // Percentage change
    efficiencyGrowth: v.number(), // Percentage change
    utilizationGrowth: v.number(), // Percentage change

    // Generated timestamp
    createdAt: v.number(),
  })
    .index("by_org_type", ["organizationId", "recordType"])
    .index("by_equipment", ["equipmentId", "periodStart"])
    .index("by_employee", ["employeeId", "periodStart"])
    .index("by_loadout", ["loadoutId", "periodStart"])
    .index("by_period", ["organizationId", "periodStart"]),

  // Crew Availability (Track crew member availability for scheduling)
  crewAvailability: defineTable({
    organizationId: v.id("organizations"),
    employeeId: v.id("users"),

    // Date and time
    date: v.number(), // Timestamp for the day

    // Availability status
    status: v.union(
      v.literal("available"),
      v.literal("unavailable"),
      v.literal("partial")
    ),

    // For partial availability
    availableFrom: v.optional(v.number()), // Start time timestamp
    availableTo: v.optional(v.number()), // End time timestamp

    // Reason for unavailability
    reason: v.optional(v.union(
      v.literal("vacation"),
      v.literal("sick"),
      v.literal("personal"),
      v.literal("training"),
      v.literal("other")
    )),
    notes: v.optional(v.string()),

    // Scheduling
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.string()), // "weekly", "daily", etc.

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_employee", ["employeeId", "date"])
    .index("by_date", ["organizationId", "date"])
    .index("by_status", ["organizationId", "status", "date"]),

  // Equipment Availability (Track equipment availability for scheduling)
  equipmentAvailability: defineTable({
    organizationId: v.id("organizations"),
    equipmentId: v.id("equipment"),

    // Date and time
    date: v.number(), // Timestamp for the day

    // Availability status
    status: v.union(
      v.literal("available"),
      v.literal("scheduled"),
      v.literal("in_use"),
      v.literal("maintenance"),
      v.literal("repair"),
      v.literal("unavailable")
    ),

    // If scheduled or in use
    workOrderId: v.optional(v.id("workOrders")),

    // For maintenance/repair
    maintenanceType: v.optional(v.string()),
    expectedReturnDate: v.optional(v.number()),
    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_equipment", ["equipmentId", "date"])
    .index("by_date", ["organizationId", "date"])
    .index("by_status", ["organizationId", "status", "date"])
    .index("by_work_order", ["workOrderId"]),

  // Work Order Schedule (Enhanced scheduling for work orders)
  workOrderSchedule: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    projectId: v.id("projects"),

    // Timeline calculation
    estimatedTotalHours: v.number(),
    estimatedWorkDays: v.number(), // Auto-calculated from hours (8 hrs/day)
    bufferDays: v.number(), // Extra days for contingency
    totalScheduledDays: v.number(), // Work days + buffer

    // Scheduled dates
    scheduledStartDate: v.number(),
    scheduledEndDate: v.number(),

    // Task breakdown by day
    dailyTasks: v.array(v.object({
      dayNumber: v.number(), // Day 1, 2, 3
      date: v.number(),
      tasks: v.array(v.object({
        taskId: v.id("tasks"),
        taskName: v.string(),
        estimatedHours: v.number(),
        assignedEmployeeIds: v.array(v.id("users")),
      })),
      totalHoursForDay: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("rescheduled")
      ),
    })),

    // Crew assignment
    assignedCrewIds: v.array(v.id("users")),
    crewLeaderId: v.optional(v.id("users")),

    // Equipment assignment
    assignedEquipmentIds: v.array(v.id("equipment")),

    // Calendar integration
    googleCalendarEventId: v.optional(v.string()),
    googleCalendarSyncStatus: v.optional(v.union(
      v.literal("synced"),
      v.literal("pending"),
      v.literal("failed")
    )),
    lastSyncedAt: v.optional(v.number()),

    // Geographic data (for route optimization)
    propertyLatitude: v.number(),
    propertyLongitude: v.number(),
    driveTimeMinutes: v.number(),

    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("rescheduled")
    ),

    // Rescheduling history
    rescheduledFrom: v.optional(v.object({
      originalStartDate: v.number(),
      originalEndDate: v.number(),
      reason: v.string(),
      rescheduledAt: v.number(),
      rescheduledBy: v.id("users"),
    })),

    // Notifications
    notificationsSent: v.optional(v.array(v.object({
      type: v.string(), // "crew_assigned", "day_before_reminder"
      sentAt: v.number(),
      recipientIds: v.array(v.id("users")),
    }))),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_start_date", ["organizationId", "scheduledStartDate"])
    .index("by_date_range", ["organizationId", "scheduledStartDate", "scheduledEndDate"])
    .index("by_crew", ["organizationId", "assignedCrewIds"])
    .index("by_equipment", ["organizationId", "assignedEquipmentIds"]),

  // Schedule Conflicts (Track and manage scheduling conflicts)
  scheduleConflicts: defineTable({
    organizationId: v.id("organizations"),

    // Conflict type
    conflictType: v.union(
      v.literal("crew_double_booked"),
      v.literal("equipment_double_booked"),
      v.literal("crew_unavailable"),
      v.literal("equipment_unavailable"),
      v.literal("insufficient_crew"),
      v.literal("insufficient_equipment"),
      v.literal("date_overlap")
    ),

    // Related work orders
    workOrderId: v.id("workOrders"),
    conflictingWorkOrderId: v.optional(v.id("workOrders")),

    // Conflict details
    conflictDate: v.number(),
    resourceType: v.union(v.literal("crew"), v.literal("equipment")),
    resourceId: v.union(v.id("users"), v.id("equipment")),

    // Resolution
    status: v.union(
      v.literal("unresolved"),
      v.literal("resolved"),
      v.literal("ignored")
    ),
    resolution: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),

    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_date", ["organizationId", "conflictDate"]),

  // Line Items (Service Type Configuration Templates)
  lineItems: defineTable({
    organizationId: v.id("organizations"),

    // Basic Info
    serviceName: v.string(),
    serviceCode: v.string(), // Auto-generated: MULCH-001, STUMP-001
    serviceType: v.union(
      v.literal("forestry_mulching"),
      v.literal("stump_grinding"),
      v.literal("land_clearing"),
      v.literal("tree_removal"),
      v.literal("tree_trimming"),
      v.literal("property_assessment"),
      v.literal("custom")
    ),
    category: v.union(
      v.literal("tree_work"),
      v.literal("land_work"),
      v.literal("specialty")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("inactive")
    ),
    icon: v.optional(v.string()), // Icon name or emoji
    description: v.string(),

    // Formula Configuration
    formulaType: v.union(
      v.literal("acreage_dbh"), // Forestry Mulching: Acreage × DBH
      v.literal("stump_score"), // Stump Grinding: D² × (H+D)
      v.literal("day_based"), // Land Clearing: Day estimation
      v.literal("tree_removal"), // Tree Removal: H×C×2×D÷12
      v.literal("tree_trimming"), // Tree Trimming: Removal × Factor
      v.literal("custom")
    ),

    // Input Fields Configuration
    inputFields: v.array(v.object({
      fieldName: v.string(),
      fieldType: v.union(
        v.literal("number"),
        v.literal("text"),
        v.literal("select"),
        v.literal("slider"),
        v.literal("checkbox"),
        v.literal("multiselect")
      ),
      label: v.string(),
      required: v.boolean(),
      min: v.optional(v.number()),
      max: v.optional(v.number()),
      defaultValue: v.optional(v.union(v.string(), v.number())),
      options: v.optional(v.array(v.string())), // For select/multiselect
      helpText: v.optional(v.string()),
    })),

    // Multi-Item Support (stumps, trees, etc.)
    allowMultipleItems: v.boolean(),

    // Modifiers (per-item adjustments)
    modifiers: v.optional(v.array(v.object({
      name: v.string(),
      percentage: v.number(),
      appliesToField: v.optional(v.string()),
    }))),

    // Standard Task Breakdown Templates
    standardTasks: v.array(v.object({
      name: v.string(),
      category: v.union(
        v.literal("Setup"),
        v.literal("Transport"),
        v.literal("Production"),
        v.literal("Cleanup"),
        v.literal("Customer Communication"),
        v.literal("Equipment Maintenance"),
        v.literal("Break Time")
      ),
      isBillable: v.boolean(),
      isPrimaryTask: v.boolean(), // True for main production task where PpH is measured
      estimatedPercentOfTotal: v.number(), // 5, 10, 70, etc.
      description: v.string(),
    })),

    // Production Settings
    defaultProductionRatePpH: v.number(),
    allowProductionRateOverride: v.boolean(),

    minimumHours: v.number(),
    minimumScore: v.optional(v.number()),
    minimumPrice: v.number(),

    // Transport Settings
    transportRate: v.number(), // Percentage of loadout cost (0.30 = 30%, 0.50 = 50%)
    includeTransport: v.boolean(),
    transportType: v.union(v.literal("one_way"), v.literal("round_trip")),

    // Buffer Settings
    bufferPercentage: v.number(), // 0.10 = 10%
    bufferAppliesTo: v.union(
      v.literal("production_only"),
      v.literal("production_transport"),
      v.literal("all")
    ),
    allowBufferOverride: v.boolean(),

    // Pricing & Margins
    defaultMarginLow: v.number(), // 0.30 = 30%
    defaultMarginHigh: v.number(), // 0.50 = 50%

    availableMargins: v.array(v.object({
      percentage: v.number(),
      tierName: v.string(), // "Budget", "Standard", "Premium"
    })),

    // Default Loadouts
    defaultLoadoutIds: v.array(v.id("loadouts")),
    allowCustomLoadout: v.boolean(),

    // AFISS Factors (which factors apply to this service)
    afissFactors: v.array(v.object({
      category: v.string(), // "Access", "Facilities", "Irregularities", "Site", "Safety"
      name: v.string(),
      percentage: v.number(),
      active: v.boolean(),
      helpText: v.string(),
    })),

    // Proposal Display Settings
    lineItemTitleTemplate: v.string(), // "[Acreage] acres forestry mulching (up to [DBH]\" DBH)"
    scopeOfWorkTemplate: v.string(),

    whatsIncluded: v.array(v.string()),
    whatsNotIncluded: v.array(v.string()),

    showHourBreakdown: v.boolean(),
    timelineDisplayFormat: v.string(), // "[Hours] hours on-site over [Days] days"

    // Units & Measurements
    primaryUnit: v.union(
      v.literal("acres"),
      v.literal("square_feet"),
      v.literal("linear_feet"),
      v.literal("each")
    ),
    secondaryUnit: v.optional(v.string()),

    enableAreaMeasurement: v.boolean(),
    enableDistanceMeasurement: v.boolean(),
    enableBoundaryDrawing: v.boolean(),

    // Compliance & Documentation
    permitsRequired: v.array(v.string()),
    insuranceMinimum: v.optional(v.number()),
    additionalInsuredRequired: v.boolean(),

    documentationRequired: v.array(v.string()),
    warrantyText: v.optional(v.string()),

    // Custom Fields
    customFields: v.optional(v.array(v.object({
      fieldName: v.string(),
      fieldType: v.string(),
      options: v.optional(v.array(v.string())),
      required: v.boolean(),
      affectsPricing: v.boolean(),
    }))),

    // Advanced Settings
    conditionalLogic: v.optional(v.string()), // JSON string of rules
    webhookUrl: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_service_type", ["organizationId", "serviceType"])
    .index("by_category", ["organizationId", "category"]),
});
