import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new customer
export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customers", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Get customer by ID
export const getById = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Alias for getById (for consistency)
export const get = getById;

// Get all customers for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();
  },
});

// Search customers by name
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    searchText: v.string(),
  },
  handler: async (ctx, { organizationId, searchText }) => {
    return await ctx.db
      .query("customers")
      .withSearchIndex("search_name", (q) =>
        q.search("name", searchText).eq("organizationId", organizationId)
      )
      .collect();
  },
});

// Update customer
export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    propertyAddress: v.optional(v.string()),
    propertyCity: v.optional(v.string()),
    propertyState: v.optional(v.string()),
    propertyZip: v.optional(v.string()),
    propertyLatitude: v.optional(v.number()),
    propertyLongitude: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});

// Delete customer
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
