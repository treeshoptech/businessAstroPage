import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log a new event
export const logEvent = mutation({
  args: {
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
    userId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    workOrderId: v.optional(v.id("workOrders")),
    customerId: v.optional(v.id("customers")),
    equipmentId: v.optional(v.id("equipment")),
    data: v.optional(v.any()),
    source: v.string(), // "web_app", "mobile_app", "api", "system"
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    financialSnapshot: v.optional(v.object({
      amount: v.number(),
      currency: v.string(),
      category: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Get events for an organization within a date range
export const getByDateRange = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, startDate, endDate, eventType }) => {
    let eventsQuery = ctx.db
      .query("events")
      .withIndex("by_org_timestamp", (q) =>
        q.eq("organizationId", organizationId)
      );

    const events = await eventsQuery.collect();

    // Filter by date range and optional event type
    return events.filter((event) => {
      const withinRange = event.timestamp >= startDate && event.timestamp <= endDate;
      const matchesType = !eventType || event.eventType === eventType;
      return withinRange && matchesType;
    });
  },
});

// Get events by project
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("events")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();
  },
});

// Get events by user
export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit }) => {
    const query = ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    if (limit) {
      return await query.take(limit);
    }

    return await query.collect();
  },
});

// Get recent events (activity feed)
export const getRecent = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, limit = 50 }) => {
    return await ctx.db
      .query("events")
      .withIndex("by_org_timestamp", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(limit);
  },
});

// Get event counts by type (for dashboard widgets)
export const getCountsByType = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { organizationId, startDate, endDate }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_org_timestamp", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter by date range
    const filteredEvents = events.filter(
      (e) => e.timestamp >= startDate && e.timestamp <= endDate
    );

    // Count by event type
    const counts: Record<string, number> = {};
    filteredEvents.forEach((event) => {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    });

    return counts;
  },
});

// Get financial events (revenue/cost tracking)
export const getFinancialEvents = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { organizationId, startDate, endDate }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_org_timestamp", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter by date range and presence of financial snapshot
    return events.filter((event) => {
      const withinRange = event.timestamp >= startDate && event.timestamp <= endDate;
      const hasFinancial = event.financialSnapshot !== undefined;
      return withinRange && hasFinancial;
    });
  },
});

// Calculate total revenue from events
export const getTotalRevenue = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { organizationId, startDate, endDate }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_org_timestamp", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter for invoice_paid events with financial snapshots
    const revenueEvents = events.filter((event) => {
      const withinRange = event.timestamp >= startDate && event.timestamp <= endDate;
      const isPaid = event.eventType === "invoice_paid";
      const hasFinancial = event.financialSnapshot !== undefined;
      return withinRange && isPaid && hasFinancial;
    });

    // Sum the amounts
    return revenueEvents.reduce((total, event) => {
      return total + (event.financialSnapshot?.amount || 0);
    }, 0);
  },
});
