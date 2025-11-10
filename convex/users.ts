import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new user
export const create = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    organizationId: v.id("organizations"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("manager"),
      v.literal("estimator"),
      v.literal("crew_leader"),
      v.literal("crew_member")
    ),
    avatarUrl: v.optional(v.string()),
    position: v.optional(v.string()),
    baseHourlyRate: v.optional(v.number()),
    burdenMultiplier: v.optional(v.number()),
    hireDate: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      ...args,
      status: args.status || "active",
      createdAt: Date.now(),
    });
  },
});

// Get user by WorkOS ID
export const getByWorkosId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

// Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

// Get user by Convex ID
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get all users for an organization
export const getByOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

// Update user
export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("manager"),
        v.literal("estimator"),
        v.literal("crew_leader"),
        v.literal("crew_member")
      )
    ),
    avatarUrl: v.optional(v.string()),
    position: v.optional(v.string()),
    baseHourlyRate: v.optional(v.number()),
    burdenMultiplier: v.optional(v.number()),
    hireDate: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});
