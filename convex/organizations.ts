import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new organization
export const create = mutation({
  args: {
    workosOrgId: v.string(),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("organizations", {
      ...args,
      status: "trial",
      createdAt: Date.now(),
    });
  },
});

// Get organization by WorkOS ID
export const getByWorkosId = query({
  args: { workosOrgId: v.string() },
  handler: async (ctx, { workosOrgId }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_workos_org", (q) => q.eq("workosOrgId", workosOrgId))
      .first();
  },
});

// Get organization by Convex ID
export const getById = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Update organization
export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("trial"), v.literal("suspended"))),

    // Global Pricing Settings
    defaultMarginLow: v.optional(v.number()),
    defaultMarginHigh: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    currency: v.optional(v.string()),

    // Global Production Settings
    globalBufferPercentage: v.optional(v.number()),
    defaultTransportRate: v.optional(v.number()),
    minimumJobHours: v.optional(v.number()),
    minimumJobPrice: v.optional(v.number()),

    // Terms & Conditions
    defaultTermsAndConditions: v.optional(v.string()),
    proposalValidityDays: v.optional(v.number()),

    // Proposal Display Settings
    showHourBreakdown: v.optional(v.boolean()),
    showAfissFactors: v.optional(v.boolean()),
    proposalHeaderText: v.optional(v.string()),
    proposalFooterText: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});
