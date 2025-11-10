import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper: Generate unique loadout number
async function generateLoadoutNumber(ctx: any, organizationId: any): Promise<string> {
  const loadouts = await ctx.db
    .query("loadouts")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect();

  let maxNumber = 0;
  for (const loadout of loadouts) {
    if (loadout.loadoutNumber) {
      const match = loadout.loadoutNumber.match(/^LO-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  }

  return `LO-${String(maxNumber + 1).padStart(4, '0')}`;
}

// List all loadouts for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("loadouts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// Get a single loadout by ID
export const get = query({
  args: { id: v.id("loadouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get loadout with full equipment and employee details
export const getWithDetails = query({
  args: { id: v.id("loadouts") },
  handler: async (ctx, args) => {
    const loadout = await ctx.db.get(args.id);
    if (!loadout) return null;

    // Get equipment details
    const equipment = await Promise.all(
      loadout.equipmentIds.map((id) => ctx.db.get(id))
    );

    // Get employee details
    const employees = await Promise.all(
      loadout.employeeIds.map((id) => ctx.db.get(id))
    );

    return {
      ...loadout,
      equipment: equipment.filter(Boolean),
      employees: employees.filter(Boolean),
    };
  },
});

// Create a new loadout
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    serviceType: v.union(
      v.literal("forestry_mulching"),
      v.literal("stump_grinding"),
      v.literal("land_clearing"),
      v.literal("tree_removal"),
      v.literal("tree_trimming")
    ),
    equipmentIds: v.array(v.id("equipment")),
    employeeIds: v.array(v.id("employees")),
    productionRatePpH: v.number(),
    overheadCostPerHour: v.number(),
    billingRates: v.object({
      margin30: v.number(),
      margin40: v.number(),
      margin50: v.number(),
      margin60: v.number(),
      margin70: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const loadoutNumber = await generateLoadoutNumber(ctx, args.organizationId);
    const now = Date.now();

    return await ctx.db.insert("loadouts", {
      ...args,
      loadoutNumber,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a loadout - creates new version with new loadout number
export const update = mutation({
  args: {
    id: v.id("loadouts"),
    organizationId: v.id("organizations"),
    name: v.string(),
    serviceType: v.union(
      v.literal("forestry_mulching"),
      v.literal("stump_grinding"),
      v.literal("land_clearing"),
      v.literal("tree_removal"),
      v.literal("tree_trimming")
    ),
    equipmentIds: v.array(v.id("equipment")),
    employeeIds: v.array(v.id("employees")),
    productionRatePpH: v.number(),
    overheadCostPerHour: v.number(),
    billingRates: v.object({
      margin30: v.number(),
      margin40: v.number(),
      margin50: v.number(),
      margin60: v.number(),
      margin70: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { id, organizationId, ...updates } = args;

    // Generate new loadout number for the updated version
    const newLoadoutNumber = await generateLoadoutNumber(ctx, organizationId);

    await ctx.db.patch(id, {
      ...updates,
      loadoutNumber: newLoadoutNumber,
      updatedAt: Date.now(),
    });
  },
});

// Delete a loadout
export const remove = mutation({
  args: { id: v.id("loadouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
