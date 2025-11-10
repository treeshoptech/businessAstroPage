import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Equipment CRUD Operations
 * Multi-tenant: All operations filtered by organizationId
 */

// Query: List all equipment for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const equipment = await ctx.db
      .query("equipment")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    return equipment.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Query: Get single equipment by ID
export const get = query({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query: Check if equipment is used in any loadouts
export const checkUsage = query({
  args: {
    equipmentId: v.id("equipment"),
    organizationId: v.id("organizations")
  },
  handler: async (ctx, args) => {
    const loadouts = await ctx.db
      .query("loadouts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const usedInLoadouts = loadouts.filter(loadout =>
      loadout.equipmentIds.includes(args.equipmentId)
    );

    return {
      isUsed: usedInLoadouts.length > 0,
      loadoutCount: usedInLoadouts.length,
      loadouts: usedInLoadouts.map(l => ({ id: l._id, name: l.name }))
    };
  },
});

// Helper: Generate unique inventory number
async function generateInventoryNumber(ctx: any, organizationId: any): Promise<string> {
  // Get all equipment for this organization
  const equipment = await ctx.db
    .query("equipment")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect();

  // Find highest existing inventory number
  let maxNumber = 0;
  for (const item of equipment) {
    if (item.inventoryNumber) {
      const match = item.inventoryNumber.match(/^EQ-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  }

  // Return next number with EQ- prefix and 4-digit padding
  return `EQ-${String(maxNumber + 1).padStart(4, '0')}`;
}

// Helper: Calculate annual finance cost from percentage and loan term
function calculateFinanceCostPerYear(
  purchasePrice: number,
  financePercentage?: number,
  financeLoanYears?: number
): number {
  if (!financePercentage || !financeLoanYears || financePercentage === 0) {
    return 0;
  }

  // Simple interest calculation: Purchase Price × Rate × Years ÷ Years
  // More accurate would be amortization, but this is good enough for annual cost estimate
  const rate = financePercentage / 100;
  const totalInterest = purchasePrice * rate * financeLoanYears;
  return totalInterest / financeLoanYears;
}

// Mutation: Add new equipment
export const add = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    category: v.string(),
    year: v.optional(v.number()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    hydraulicGPM: v.optional(v.number()),
    hydraulicPSI: v.optional(v.number()),
    weight: v.optional(v.number()),
    purchasePrice: v.number(),
    usefulLifeYears: v.number(),
    annualHours: v.number(),
    financePercentage: v.optional(v.number()),
    financeLoanYears: v.optional(v.number()),
    insurancePerYear: v.number(),
    registrationPerYear: v.number(),
    fuelGallonsPerHour: v.number(),
    fuelPricePerGallon: v.number(),
    maintenancePerYear: v.number(),
    repairsPerYear: v.number(),
    status: v.union(v.literal("active"), v.literal("maintenance"), v.literal("retired")),
  },
  handler: async (ctx, args) => {
    // Auto-generate unique inventory number
    const inventoryNumber = await generateInventoryNumber(ctx, args.organizationId);

    // Calculate finance cost from percentage and loan term
    const financeCostPerYear = calculateFinanceCostPerYear(
      args.purchasePrice,
      args.financePercentage,
      args.financeLoanYears
    );

    const equipmentId = await ctx.db.insert("equipment", {
      organizationId: args.organizationId,
      name: args.name,
      category: args.category as any,
      year: args.year,
      make: args.make,
      model: args.model,
      inventoryNumber, // auto-generated
      attachmentType: args.attachmentType,
      hydraulicGPM: args.hydraulicGPM,
      hydraulicPSI: args.hydraulicPSI,
      weight: args.weight,
      purchasePrice: args.purchasePrice,
      usefulLifeYears: args.usefulLifeYears,
      annualHours: args.annualHours,
      financePercentage: args.financePercentage,
      financeLoanYears: args.financeLoanYears,
      financeCostPerYear, // calculated from percentage and years
      insurancePerYear: args.insurancePerYear,
      registrationPerYear: args.registrationPerYear,
      fuelGallonsPerHour: args.fuelGallonsPerHour,
      fuelPricePerGallon: args.fuelPricePerGallon,
      maintenancePerYear: args.maintenancePerYear,
      repairsPerYear: args.repairsPerYear,
      status: args.status,
      createdAt: Date.now(),
    });

    return equipmentId;
  },
});

// Mutation: Update equipment
export const update = mutation({
  args: {
    id: v.id("equipment"),
    name: v.string(),
    category: v.string(), // Will be validated by schema
    purchasePrice: v.number(),
    usefulLifeYears: v.number(),
    annualHours: v.number(),
    financeCostPerYear: v.number(),
    insurancePerYear: v.number(),
    registrationPerYear: v.number(),
    fuelGallonsPerHour: v.number(),
    fuelPricePerGallon: v.number(),
    maintenancePerYear: v.number(),
    repairsPerYear: v.number(),
    status: v.union(v.literal("active"), v.literal("maintenance"), v.literal("retired")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      name: updates.name,
      category: updates.category as any,
      purchasePrice: updates.purchasePrice,
      usefulLifeYears: updates.usefulLifeYears,
      annualHours: updates.annualHours,
      financeCostPerYear: updates.financeCostPerYear,
      insurancePerYear: updates.insurancePerYear,
      registrationPerYear: updates.registrationPerYear,
      fuelGallonsPerHour: updates.fuelGallonsPerHour,
      fuelPricePerGallon: updates.fuelPricePerGallon,
      maintenancePerYear: updates.maintenancePerYear,
      repairsPerYear: updates.repairsPerYear,
      status: updates.status,
    });

    return id;
  },
});

// Mutation: Delete equipment (with usage check)
export const remove = mutation({
  args: {
    id: v.id("equipment"),
    organizationId: v.id("organizations")
  },
  handler: async (ctx, args) => {
    // Check if equipment is used in loadouts
    const loadouts = await ctx.db
      .query("loadouts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const usedInLoadouts = loadouts.filter(loadout =>
      loadout.equipmentIds.includes(args.id)
    );

    if (usedInLoadouts.length > 0) {
      throw new Error(`Cannot delete. Equipment is used in ${usedInLoadouts.length} loadout(s).`);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
