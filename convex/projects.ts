import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new project (lead)
export const create = mutation({
  args: {
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
    projectIntent: v.optional(v.string()),
    siteHazards: v.optional(v.array(v.string())),
    driveTimeMinutes: v.optional(v.number()),
    treeShopScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      ...args,
      status: "lead",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get project by ID
export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get all projects for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();
  },
});

// Get projects by status
export const getByStatus = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("lead"),
      v.literal("proposal"),
      v.literal("work_order"),
      v.literal("invoice"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, { organizationId, status }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", status)
      )
      .order("desc")
      .collect();
  },
});

// Get projects by customer
export const getByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .order("desc")
      .collect();
  },
});

// Update project
export const update = mutation({
  args: {
    id: v.id("projects"),
    serviceType: v.optional(v.union(
      v.literal("forestry_mulching"),
      v.literal("stump_grinding"),
      v.literal("land_clearing"),
      v.literal("tree_removal"),
      v.literal("tree_trimming"),
      v.literal("property_assessment")
    )),
    status: v.optional(v.union(
      v.literal("lead"),
      v.literal("proposal"),
      v.literal("work_order"),
      v.literal("invoice"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    projectIntent: v.optional(v.string()),
    siteHazards: v.optional(v.array(v.string())),
    driveTimeMinutes: v.optional(v.number()),
    treeShopScore: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete project
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Move project to next stage
export const moveToNextStage = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const project = await ctx.db.get(id);
    if (!project) throw new Error("Project not found");

    const stageFlow: Record<string, string> = {
      lead: "proposal",
      proposal: "work_order",
      work_order: "invoice",
      invoice: "completed",
    };

    const nextStatus = stageFlow[project.status];
    if (!nextStatus) throw new Error("Cannot move to next stage");

    await ctx.db.patch(id, {
      status: nextStatus as any,
      updatedAt: Date.now(),
    });
  },
});
