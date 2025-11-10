import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all employees for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("employees")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// Get a single employee by ID
export const get = query({
  args: { id: v.id("employees") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new employee
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    position: v.union(
      v.literal("entry_ground_crew"),
      v.literal("experienced_climber"),
      v.literal("crew_leader"),
      v.literal("certified_arborist"),
      v.literal("specialized_operator")
    ),
    baseHourlyRate: v.number(),
    burdenMultiplier: v.number(),
    hireDate: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("employees", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Update an employee
export const update = mutation({
  args: {
    id: v.id("employees"),
    name: v.string(),
    position: v.union(
      v.literal("entry_ground_crew"),
      v.literal("experienced_climber"),
      v.literal("crew_leader"),
      v.literal("certified_arborist"),
      v.literal("specialized_operator")
    ),
    baseHourlyRate: v.number(),
    burdenMultiplier: v.number(),
    hireDate: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    // TreeShop coding fields (optional)
    treeShopCode: v.optional(v.string()),
    treeShopPrimaryTrack: v.optional(v.string()),
    treeShopTier: v.optional(v.number()),
    treeShopLeadership: v.optional(v.string()),
    treeShopEquipment: v.optional(v.number()),
    treeShopDriver: v.optional(v.number()),
    treeShopCredentials: v.optional(v.array(v.string())),
    treeShopCrossTraining: v.optional(v.array(v.string())),
    treeShopQualificationPayRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// Delete an employee
export const remove = mutation({
  args: { id: v.id("employees") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
