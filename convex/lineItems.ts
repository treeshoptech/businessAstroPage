import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all line items for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("lineItems")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();
  },
});

// Get line items by status
export const getByStatus = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(v.literal("active"), v.literal("draft"), v.literal("inactive")),
  },
  handler: async (ctx, { organizationId, status }) => {
    return await ctx.db
      .query("lineItems")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", status)
      )
      .collect();
  },
});

// Get line items by category
export const getByCategory = query({
  args: {
    organizationId: v.id("organizations"),
    category: v.union(
      v.literal("tree_work"),
      v.literal("land_work"),
      v.literal("specialty")
    ),
  },
  handler: async (ctx, { organizationId, category }) => {
    return await ctx.db
      .query("lineItems")
      .withIndex("by_category", (q) =>
        q.eq("organizationId", organizationId).eq("category", category)
      )
      .collect();
  },
});

// Get line item by ID
export const getById = query({
  args: { id: v.id("lineItems") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create new line item
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    serviceName: v.string(),
    serviceCode: v.string(),
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
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("inactive")
    )),
    icon: v.optional(v.string()),
    description: v.string(),
    formulaType: v.union(
      v.literal("acreage_dbh"),
      v.literal("stump_score"),
      v.literal("day_based"),
      v.literal("tree_removal"),
      v.literal("tree_trimming"),
      v.literal("custom")
    ),
    inputFields: v.array(v.any()),
    allowMultipleItems: v.boolean(),
    modifiers: v.optional(v.array(v.any())),
    defaultProductionRatePpH: v.number(),
    allowProductionRateOverride: v.boolean(),
    minimumHours: v.number(),
    minimumScore: v.optional(v.number()),
    minimumPrice: v.number(),
    transportRate: v.number(),
    includeTransport: v.boolean(),
    transportType: v.union(v.literal("one_way"), v.literal("round_trip")),
    bufferPercentage: v.number(),
    bufferAppliesTo: v.union(
      v.literal("production_only"),
      v.literal("production_transport"),
      v.literal("all")
    ),
    allowBufferOverride: v.boolean(),
    defaultMarginLow: v.number(),
    defaultMarginHigh: v.number(),
    availableMargins: v.array(v.any()),
    defaultLoadoutIds: v.array(v.id("loadouts")),
    allowCustomLoadout: v.boolean(),
    afissFactors: v.array(v.any()),
    lineItemTitleTemplate: v.string(),
    scopeOfWorkTemplate: v.string(),
    whatsIncluded: v.array(v.string()),
    whatsNotIncluded: v.array(v.string()),
    showHourBreakdown: v.boolean(),
    timelineDisplayFormat: v.string(),
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
    permitsRequired: v.array(v.string()),
    insuranceMinimum: v.optional(v.number()),
    additionalInsuredRequired: v.boolean(),
    documentationRequired: v.array(v.string()),
    warrantyText: v.optional(v.string()),
    customFields: v.optional(v.array(v.any())),
    conditionalLogic: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lineItems", {
      ...args,
      status: args.status || "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update line item
export const update = mutation({
  args: {
    id: v.id("lineItems"),
    serviceName: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("inactive")
    )),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    formulaType: v.optional(v.union(
      v.literal("acreage_dbh"),
      v.literal("stump_score"),
      v.literal("day_based"),
      v.literal("tree_removal"),
      v.literal("tree_trimming"),
      v.literal("custom")
    )),
    inputFields: v.optional(v.array(v.any())),
    allowMultipleItems: v.optional(v.boolean()),
    modifiers: v.optional(v.array(v.any())),
    defaultProductionRatePpH: v.optional(v.number()),
    allowProductionRateOverride: v.optional(v.boolean()),
    minimumHours: v.optional(v.number()),
    minimumScore: v.optional(v.number()),
    minimumPrice: v.optional(v.number()),
    transportRate: v.optional(v.number()),
    includeTransport: v.optional(v.boolean()),
    transportType: v.optional(v.union(v.literal("one_way"), v.literal("round_trip"))),
    bufferPercentage: v.optional(v.number()),
    bufferAppliesTo: v.optional(v.union(
      v.literal("production_only"),
      v.literal("production_transport"),
      v.literal("all")
    )),
    allowBufferOverride: v.optional(v.boolean()),
    defaultMarginLow: v.optional(v.number()),
    defaultMarginHigh: v.optional(v.number()),
    availableMargins: v.optional(v.array(v.any())),
    defaultLoadoutIds: v.optional(v.array(v.id("loadouts"))),
    allowCustomLoadout: v.optional(v.boolean()),
    afissFactors: v.optional(v.array(v.any())),
    lineItemTitleTemplate: v.optional(v.string()),
    scopeOfWorkTemplate: v.optional(v.string()),
    whatsIncluded: v.optional(v.array(v.string())),
    whatsNotIncluded: v.optional(v.array(v.string())),
    showHourBreakdown: v.optional(v.boolean()),
    timelineDisplayFormat: v.optional(v.string()),
    primaryUnit: v.optional(v.union(
      v.literal("acres"),
      v.literal("square_feet"),
      v.literal("linear_feet"),
      v.literal("each")
    )),
    secondaryUnit: v.optional(v.string()),
    enableAreaMeasurement: v.optional(v.boolean()),
    enableDistanceMeasurement: v.optional(v.boolean()),
    enableBoundaryDrawing: v.optional(v.boolean()),
    permitsRequired: v.optional(v.array(v.string())),
    insuranceMinimum: v.optional(v.number()),
    additionalInsuredRequired: v.optional(v.boolean()),
    documentationRequired: v.optional(v.array(v.string())),
    warrantyText: v.optional(v.string()),
    customFields: v.optional(v.array(v.any())),
    conditionalLogic: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete line item
export const remove = mutation({
  args: { id: v.id("lineItems") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Duplicate line item
export const duplicate = mutation({
  args: { id: v.id("lineItems") },
  handler: async (ctx, { id }) => {
    const original = await ctx.db.get(id);
    if (!original) throw new Error("Line item not found");

    const { _id, _creationTime, createdAt, lastUsed, ...data } = original;

    return await ctx.db.insert("lineItems", {
      ...data,
      serviceName: `${data.serviceName} (Copy)`,
      serviceCode: `${data.serviceCode}-COPY`,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update last used timestamp
export const markUsed = mutation({
  args: { id: v.id("lineItems") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      lastUsed: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
