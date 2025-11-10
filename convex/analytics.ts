import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Calculate and store daily metric snapshot
export const generateDailySnapshot = mutation({
  args: {
    organizationId: v.id("organizations"),
    date: v.number(), // Start of day timestamp
  },
  handler: async (ctx, { organizationId, date }) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const periodStart = startOfDay.getTime();

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const periodEnd = endOfDay.getTime();

    // Get all events for this day
    const events = await ctx.db
      .query("events")
      .withIndex("by_org_timestamp", (q) => q.eq("organizationId", organizationId))
      .collect();

    const dayEvents = events.filter(
      (e) => e.timestamp >= periodStart && e.timestamp <= periodEnd
    );

    // Calculate proposal metrics
    const proposalsCreated = dayEvents.filter((e) => e.eventType === "proposal_created").length;
    const proposalsSent = dayEvents.filter((e) => e.eventType === "proposal_sent").length;
    const proposalsWon = dayEvents.filter((e) => e.eventType === "proposal_signed").length;
    const proposalsLost = dayEvents.filter((e) => e.eventType === "proposal_rejected").length;
    const closeRate = proposalsSent > 0 ? (proposalsWon / proposalsSent) * 100 : 0;

    // Calculate work order metrics
    const workOrdersCompleted = dayEvents.filter((e) => e.eventType === "work_order_completed").length;

    // Calculate invoice metrics
    const invoicesSent = dayEvents.filter((e) => e.eventType === "invoice_sent").length;
    const invoicesPaid = dayEvents.filter((e) => e.eventType === "invoice_paid").length;
    const invoicesOverdue = dayEvents.filter((e) => e.eventType === "invoice_overdue").length;

    // Calculate revenue from paid invoices
    const paidInvoiceEvents = dayEvents.filter(
      (e) => e.eventType === "invoice_paid" && e.financialSnapshot
    );
    const totalRevenue = paidInvoiceEvents.reduce(
      (sum, e) => sum + (e.financialSnapshot?.amount || 0),
      0
    );

    // Get all proposals for service type breakdown
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Calculate service type revenue (from signed proposals created today)
    const signedProposalsToday = dayEvents
      .filter((e) => e.eventType === "proposal_signed")
      .map((e) => e.proposalId)
      .filter((id): id is any => id !== undefined);

    const revenueByServiceType = {
      forestry_mulching: 0,
      stump_grinding: 0,
      land_clearing: 0,
      tree_removal: 0,
      tree_trimming: 0,
      property_assessment: 0,
    };

    const projectsByServiceType = {
      forestry_mulching: 0,
      stump_grinding: 0,
      land_clearing: 0,
      tree_removal: 0,
      tree_trimming: 0,
      property_assessment: 0,
    };

    // Get projects to determine service types
    for (const proposalId of signedProposalsToday) {
      const proposal = await ctx.db.get(proposalId);
      if (proposal) {
        const project = await ctx.db.get(proposal.projectId);
        if (project) {
          const serviceType = project.serviceType as keyof typeof revenueByServiceType;
          if (serviceType in revenueByServiceType) {
            revenueByServiceType[serviceType] += proposal.priceRangeHigh;
            projectsByServiceType[serviceType] += 1;
          }
        }
      }
    }

    // Calculate customer metrics
    const newCustomers = dayEvents.filter((e) => e.eventType === "customer_created").length;

    // Create snapshot
    const snapshot = await ctx.db.insert("metricSnapshots", {
      organizationId,
      period: "daily",
      periodStart,
      periodEnd,

      // Financial metrics
      totalRevenue,
      totalCosts: 0, // Will be calculated from actual cost tracking
      grossProfit: totalRevenue, // Simplified for now
      grossMargin: 100, // Simplified for now
      netProfit: totalRevenue, // Simplified for now
      netMargin: 100, // Simplified for now

      // Operational metrics
      proposalsCreated,
      proposalsSent,
      proposalsWon,
      proposalsLost,
      closeRate,
      averageProposalValue: proposalsWon > 0 ? totalRevenue / proposalsWon : 0,
      averageTimeToClose: 0, // Will be calculated from proposal timestamps

      workOrdersCompleted,
      totalProjectHours: 0, // Will be calculated from time entries
      averageProjectDuration: 0,

      invoicesSent,
      invoicesPaid,
      invoicesOverdue,
      averageDaysToPayment: 0, // Will be calculated from invoice timestamps

      // Service type breakdown
      revenueByServiceType,
      projectsByServiceType,

      // Asset performance
      equipmentUtilization: 0, // Will be calculated from time entries
      averageEquipmentCostPerHour: 0,
      laborUtilization: 0,
      averageLaborCostPerHour: 0,

      // Customer metrics
      newCustomers,
      repeatCustomers: 0, // Will be calculated from customer project history
      customerRetentionRate: 0,
      averageCustomerValue: 0,

      // Estimation accuracy
      averageCostVariance: 0,
      averageTimeVariance: 0,
      accuracyScore: 100, // Default perfect score

      createdAt: Date.now(),
    });

    return snapshot;
  },
});

// Get metric snapshots by period
export const getSnapshots = query({
  args: {
    organizationId: v.id("organizations"),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { organizationId, period, startDate, endDate }) => {
    const snapshots = await ctx.db
      .query("metricSnapshots")
      .withIndex("by_org_period", (q) =>
        q.eq("organizationId", organizationId).eq("period", period)
      )
      .collect();

    return snapshots.filter(
      (s) => s.periodStart >= startDate && s.periodEnd <= endDate
    );
  },
});

// Get latest snapshot for period type
export const getLatestSnapshot = query({
  args: {
    organizationId: v.id("organizations"),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
  },
  handler: async (ctx, { organizationId, period }) => {
    const snapshots = await ctx.db
      .query("metricSnapshots")
      .withIndex("by_org_period", (q) =>
        q.eq("organizationId", organizationId).eq("period", period)
      )
      .order("desc")
      .take(1);

    return snapshots[0] || null;
  },
});

// Calculate KPIs for dashboard
export const calculateKPIs = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { organizationId, startDate, endDate }) => {
    // Get all events in date range
    const events = await ctx.db
      .query("events")
      .withIndex("by_org_timestamp", (q) => q.eq("organizationId", organizationId))
      .collect();

    const rangeEvents = events.filter(
      (e) => e.timestamp >= startDate && e.timestamp <= endDate
    );

    // Proposal metrics
    const proposalsCreated = rangeEvents.filter((e) => e.eventType === "proposal_created").length;
    const proposalsSent = rangeEvents.filter((e) => e.eventType === "proposal_sent").length;
    const proposalsWon = rangeEvents.filter((e) => e.eventType === "proposal_signed").length;
    const proposalsLost = rangeEvents.filter((e) => e.eventType === "proposal_rejected").length;
    const closeRate = proposalsSent > 0 ? (proposalsWon / proposalsSent) * 100 : 0;

    // Revenue from paid invoices
    const paidInvoices = rangeEvents.filter(
      (e) => e.eventType === "invoice_paid" && e.financialSnapshot
    );
    const totalRevenue = paidInvoices.reduce(
      (sum, e) => sum + (e.financialSnapshot?.amount || 0),
      0
    );

    // Work orders
    const workOrdersCompleted = rangeEvents.filter((e) => e.eventType === "work_order_completed").length;

    // Customer metrics
    const newCustomers = rangeEvents.filter((e) => e.eventType === "customer_created").length;

    return {
      totalRevenue,
      proposalsCreated,
      proposalsSent,
      proposalsWon,
      proposalsLost,
      closeRate,
      averageProposalValue: proposalsWon > 0 ? totalRevenue / proposalsWon : 0,
      workOrdersCompleted,
      newCustomers,
    };
  },
});

// Generate performance record for equipment
export const generateEquipmentPerformance = mutation({
  args: {
    organizationId: v.id("organizations"),
    equipmentId: v.id("equipment"),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, { organizationId, equipmentId, periodStart, periodEnd }) => {
    // Get all time entries for this equipment in the period
    const allTimeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_date", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter time entries for this equipment and period
    const timeEntries = allTimeEntries.filter((entry) => {
      return entry.clockIn >= periodStart && entry.clockIn <= periodEnd;
    });

    // Calculate hours
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const billableHours = timeEntries.filter((e) => e.isBillable).reduce(
      (sum, entry) => sum + (entry.totalHours || 0),
      0
    );

    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    // Calculate productivity
    const projectsCompleted = new Set(
      timeEntries.filter((e) => e.isPrimaryTask).map((e) => e.workOrderId)
    ).size;

    const totalPoints = timeEntries.reduce(
      (sum, entry) => sum + (entry.treeShopScoreCompleted || 0),
      0
    );

    const averagePpH = billableHours > 0 ? totalPoints / billableHours : 0;

    // Get equipment for cost calculation
    const equipment = await ctx.db.get(equipmentId);
    if (!equipment) throw new Error("Equipment not found");

    const totalCosts = totalHours * equipment.purchasePrice; // Simplified cost calc

    // Create performance record
    return await ctx.db.insert("performanceRecords", {
      organizationId,
      recordType: "equipment",
      equipmentId,
      periodStart,
      periodEnd,

      // Usage metrics
      totalHours,
      billableHours,
      utilizationRate,

      // Financial metrics
      totalRevenue: 0, // Will be calculated from linked work orders
      totalCosts,
      profit: -totalCosts,
      profitMargin: 0,
      revenuePerHour: 0,

      // Productivity metrics
      projectsCompleted,
      averageTreeShopScore: projectsCompleted > 0 ? totalPoints / projectsCompleted : 0,
      totalTreeShopPoints: totalPoints,
      averagePpH,

      // Efficiency score
      efficiencyScore: 0, // Will be calculated vs benchmark
      performanceVsBenchmark: 0,

      // Quality metrics
      issuesReported: 0,

      // Cost breakdown
      fuelCosts: 0,
      maintenanceCosts: 0,
      repairCosts: 0,

      // Variance tracking
      estimatedCosts: 0,
      actualCosts: totalCosts,
      costVariance: 0,
      estimatedHours: 0,
      actualHours: totalHours,
      timeVariance: 0,

      // Trends
      revenueGrowth: 0,
      efficiencyGrowth: 0,
      utilizationGrowth: 0,

      createdAt: Date.now(),
    });
  },
});

// Get performance records
export const getPerformanceRecords = query({
  args: {
    organizationId: v.id("organizations"),
    recordType: v.union(v.literal("equipment"), v.literal("employee"), v.literal("loadout")),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { organizationId, recordType, startDate, endDate }) => {
    const records = await ctx.db
      .query("performanceRecords")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("recordType", recordType)
      )
      .collect();

    return records.filter(
      (r) => r.periodStart >= startDate && r.periodEnd <= endDate
    );
  },
});

// Get top performers (equipment or employees)
export const getTopPerformers = query({
  args: {
    organizationId: v.id("organizations"),
    recordType: v.union(v.literal("equipment"), v.literal("employee"), v.literal("loadout")),
    metric: v.union(
      v.literal("revenue"),
      v.literal("profit"),
      v.literal("efficiency"),
      v.literal("utilization")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, recordType, metric, limit = 10 }) => {
    const records = await ctx.db
      .query("performanceRecords")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("recordType", recordType)
      )
      .collect();

    // Sort by selected metric
    const sorted = records.sort((a, b) => {
      switch (metric) {
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "profit":
          return b.profit - a.profit;
        case "efficiency":
          return b.efficiencyScore - a.efficiencyScore;
        case "utilization":
          return b.utilizationRate - a.utilizationRate;
        default:
          return 0;
      }
    });

    return sorted.slice(0, limit);
  },
});
