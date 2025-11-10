import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all project loadouts for an organization
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("projectLoadouts")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();
  },
});

// Get project loadout by project ID
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("projectLoadouts")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
  },
});

// Get project loadout by ID
export const getById = query({
  args: { id: v.id("projectLoadouts") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create project loadout from base loadout + additions
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    proposalId: v.optional(v.id("proposals")),
    lineItemId: v.optional(v.id("lineItems")),
    baseLoadoutId: v.id("loadouts"),
    
    // Snapshot of base loadout
    baseLoadoutName: v.string(),
    coreEquipment: v.array(v.any()),
    coreEmployees: v.array(v.any()),
    
    // Project-specific additions
    additionalEquipment: v.optional(v.array(v.any())),
    additionalEmployees: v.optional(v.array(v.any())),
    attachments: v.optional(v.array(v.any())),
    materials: v.optional(v.array(v.any())),
    
    // Costs
    baseCostPerHour: v.number(),
    totalEquipmentCost: v.number(),
    totalLaborCost: v.number(),
    totalAttachmentsCost: v.number(),
    totalMaterialsCost: v.number(),
    totalProjectCost: v.number(),
    estimatedProjectHours: v.number(),
    blendedHourlyRate: v.number(),
    
    // Billing
    billingRates: v.object({
      margin30: v.number(),
      margin40: v.number(),
      margin50: v.number(),
      margin60: v.number(),
      margin70: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectLoadouts", {
      ...args,
      additionalEquipment: args.additionalEquipment || [],
      additionalEmployees: args.additionalEmployees || [],
      attachments: args.attachments || [],
      materials: args.materials || [],
      createdAt: Date.now(),
    });
  },
});

// Add equipment to project loadout
export const addEquipment = mutation({
  args: {
    id: v.id("projectLoadouts"),
    equipment: v.object({
      equipmentId: v.id("equipment"),
      equipmentName: v.string(),
      source: v.union(v.literal("owned"), v.literal("rental")),
      reason: v.string(),
      costPerHour: v.optional(v.number()),
      rentalDuration: v.optional(v.string()),
      rentalProvider: v.optional(v.string()),
      rentalCostBreakdown: v.optional(v.object({
        rentalPeriodCost: v.number(),
        deliveryFee: v.number(),
        pickupFee: v.number(),
        fuelCost: v.number(),
        insuranceCost: v.number(),
        totalCost: v.number(),
        hourlyEquivalent: v.number(),
      })),
      hoursNeeded: v.number(),
      percentOfJob: v.number(),
      totalCost: v.number(),
    }),
  },
  handler: async (ctx, { id, equipment }) => {
    const loadout = await ctx.db.get(id);
    if (!loadout) throw new Error("Project loadout not found");

    const updatedEquipment = [...loadout.additionalEquipment, equipment];
    
    // Recalculate total equipment cost
    const totalEquipmentCost = 
      loadout.totalEquipmentCost + equipment.totalCost;
    
    // Recalculate total project cost
    const totalProjectCost = 
      totalEquipmentCost +
      loadout.totalLaborCost +
      loadout.totalAttachmentsCost +
      loadout.totalMaterialsCost;
    
    // Recalculate blended hourly rate
    const blendedHourlyRate = totalProjectCost / loadout.estimatedProjectHours;
    
    // Recalculate billing rates
    const billingRates = {
      margin30: blendedHourlyRate / 0.70,
      margin40: blendedHourlyRate / 0.60,
      margin50: blendedHourlyRate / 0.50,
      margin60: blendedHourlyRate / 0.40,
      margin70: blendedHourlyRate / 0.30,
    };

    await ctx.db.patch(id, {
      additionalEquipment: updatedEquipment,
      totalEquipmentCost,
      totalProjectCost,
      blendedHourlyRate,
      billingRates,
      updatedAt: Date.now(),
    });
  },
});

// Add employee to project loadout
export const addEmployee = mutation({
  args: {
    id: v.id("projectLoadouts"),
    employee: v.object({
      employeeId: v.id("employees"),
      employeeName: v.string(),
      reason: v.string(),
      costPerHour: v.number(),
      hoursNeeded: v.number(),
      percentOfJob: v.number(),
      totalCost: v.number(),
    }),
  },
  handler: async (ctx, { id, employee }) => {
    const loadout = await ctx.db.get(id);
    if (!loadout) throw new Error("Project loadout not found");

    const updatedEmployees = [...loadout.additionalEmployees, employee];
    
    // Recalculate total labor cost
    const totalLaborCost = loadout.totalLaborCost + employee.totalCost;
    
    // Recalculate total project cost
    const totalProjectCost = 
      loadout.totalEquipmentCost +
      totalLaborCost +
      loadout.totalAttachmentsCost +
      loadout.totalMaterialsCost;
    
    // Recalculate blended hourly rate
    const blendedHourlyRate = totalProjectCost / loadout.estimatedProjectHours;
    
    // Recalculate billing rates
    const billingRates = {
      margin30: blendedHourlyRate / 0.70,
      margin40: blendedHourlyRate / 0.60,
      margin50: blendedHourlyRate / 0.50,
      margin60: blendedHourlyRate / 0.40,
      margin70: blendedHourlyRate / 0.30,
    };

    await ctx.db.patch(id, {
      additionalEmployees: updatedEmployees,
      totalLaborCost,
      totalProjectCost,
      blendedHourlyRate,
      billingRates,
      updatedAt: Date.now(),
    });
  },
});

// Add attachment to project loadout
export const addAttachment = mutation({
  args: {
    id: v.id("projectLoadouts"),
    attachment: v.object({
      name: v.string(),
      equipmentId: v.optional(v.id("equipment")),
      attachesToEquipmentId: v.optional(v.id("equipment")),
      source: v.union(v.literal("owned"), v.literal("rental")),
      costPerDay: v.optional(v.number()),
      costPerHour: v.optional(v.number()),
      flatCost: v.optional(v.number()),
      daysNeeded: v.optional(v.number()),
      hoursNeeded: v.optional(v.number()),
      totalCost: v.number(),
      reason: v.string(),
    }),
  },
  handler: async (ctx, { id, attachment }) => {
    const loadout = await ctx.db.get(id);
    if (!loadout) throw new Error("Project loadout not found");

    const updatedAttachments = [...loadout.attachments, attachment];
    
    // Recalculate total attachments cost
    const totalAttachmentsCost = loadout.totalAttachmentsCost + attachment.totalCost;
    
    // Recalculate total project cost
    const totalProjectCost = 
      loadout.totalEquipmentCost +
      loadout.totalLaborCost +
      totalAttachmentsCost +
      loadout.totalMaterialsCost;
    
    // Recalculate blended hourly rate
    const blendedHourlyRate = totalProjectCost / loadout.estimatedProjectHours;
    
    // Recalculate billing rates
    const billingRates = {
      margin30: blendedHourlyRate / 0.70,
      margin40: blendedHourlyRate / 0.60,
      margin50: blendedHourlyRate / 0.50,
      margin60: blendedHourlyRate / 0.40,
      margin70: blendedHourlyRate / 0.30,
    };

    await ctx.db.patch(id, {
      attachments: updatedAttachments,
      totalAttachmentsCost,
      totalProjectCost,
      blendedHourlyRate,
      billingRates,
      updatedAt: Date.now(),
    });
  },
});

// Add material to project loadout
export const addMaterial = mutation({
  args: {
    id: v.id("projectLoadouts"),
    material: v.object({
      name: v.string(),
      quantity: v.number(),
      unit: v.string(),
      unitCost: v.number(),
      totalCost: v.number(),
      reason: v.string(),
    }),
  },
  handler: async (ctx, { id, material }) => {
    const loadout = await ctx.db.get(id);
    if (!loadout) throw new Error("Project loadout not found");

    const updatedMaterials = [...loadout.materials, material];
    
    // Recalculate total materials cost
    const totalMaterialsCost = loadout.totalMaterialsCost + material.totalCost;
    
    // Recalculate total project cost
    const totalProjectCost = 
      loadout.totalEquipmentCost +
      loadout.totalLaborCost +
      loadout.totalAttachmentsCost +
      totalMaterialsCost;
    
    // Recalculate blended hourly rate
    const blendedHourlyRate = totalProjectCost / loadout.estimatedProjectHours;
    
    // Recalculate billing rates
    const billingRates = {
      margin30: blendedHourlyRate / 0.70,
      margin40: blendedHourlyRate / 0.60,
      margin50: blendedHourlyRate / 0.50,
      margin60: blendedHourlyRate / 0.40,
      margin70: blendedHourlyRate / 0.30,
    };

    await ctx.db.patch(id, {
      materials: updatedMaterials,
      totalMaterialsCost,
      totalProjectCost,
      blendedHourlyRate,
      billingRates,
      updatedAt: Date.now(),
    });
  },
});

// Remove equipment from project loadout
export const removeEquipment = mutation({
  args: {
    id: v.id("projectLoadouts"),
    equipmentIndex: v.number(),
  },
  handler: async (ctx, { id, equipmentIndex }) => {
    const loadout = await ctx.db.get(id);
    if (!loadout) throw new Error("Project loadout not found");

    const equipment = loadout.additionalEquipment[equipmentIndex];
    const updatedEquipment = loadout.additionalEquipment.filter((_, i) => i !== equipmentIndex);
    
    // Recalculate total equipment cost
    const totalEquipmentCost = loadout.totalEquipmentCost - equipment.totalCost;
    
    // Recalculate total project cost
    const totalProjectCost = 
      totalEquipmentCost +
      loadout.totalLaborCost +
      loadout.totalAttachmentsCost +
      loadout.totalMaterialsCost;
    
    // Recalculate blended hourly rate
    const blendedHourlyRate = totalProjectCost / loadout.estimatedProjectHours;
    
    // Recalculate billing rates
    const billingRates = {
      margin30: blendedHourlyRate / 0.70,
      margin40: blendedHourlyRate / 0.60,
      margin50: blendedHourlyRate / 0.50,
      margin60: blendedHourlyRate / 0.40,
      margin70: blendedHourlyRate / 0.30,
    };

    await ctx.db.patch(id, {
      additionalEquipment: updatedEquipment,
      totalEquipmentCost,
      totalProjectCost,
      blendedHourlyRate,
      billingRates,
      updatedAt: Date.now(),
    });
  },
});

// Update actual usage after job completion
export const updateActualUsage = mutation({
  args: {
    id: v.id("projectLoadouts"),
    actualUsage: v.object({
      coreEquipmentHours: v.array(v.any()),
      additionalEquipmentHours: v.array(v.any()),
      additionalEmployeeHours: v.array(v.any()),
      attachmentsUsed: v.array(v.any()),
      materialsUsed: v.array(v.any()),
    }),
    actualTotalCost: v.number(),
    varianceReason: v.optional(v.string()),
  },
  handler: async (ctx, { id, actualUsage, actualTotalCost, varianceReason }) => {
    const loadout = await ctx.db.get(id);
    if (!loadout) throw new Error("Project loadout not found");

    const variance = actualTotalCost - loadout.totalProjectCost;
    const variancePercent = (variance / loadout.totalProjectCost) * 100;

    await ctx.db.patch(id, {
      actualUsage,
      varianceAnalysis: {
        estimatedTotalCost: loadout.totalProjectCost,
        actualTotalCost,
        variance,
        variancePercent,
        reason: varianceReason,
      },
      updatedAt: Date.now(),
    });
  },
});

// Get equipment addition recommendations based on AFISS factors
export const getRecommendations = query({
  args: {
    organizationId: v.id("organizations"),
    afissFactors: v.array(v.string()),
    serviceType: v.string(),
  },
  handler: async (ctx, { organizationId, afissFactors, serviceType }) => {
    const recommendations = [];

    // Narrow gate -> mini excavator
    if (afissFactors.includes("narrow_gate")) {
      recommendations.push({
        type: "equipment",
        name: "Mini Excavator",
        reason: "Narrow gate access requires smaller machinery",
        source: "rental",
        estimatedCost: 1050,
      });
    }

    // Buildings nearby -> extra crew
    if (afissFactors.includes("building_within_50ft")) {
      recommendations.push({
        type: "employee",
        name: "Extra Crew Member",
        reason: "Hand work required around structures",
        estimatedHours: 6,
        estimatedCost: 357,
      });
    }

    // Stumps present -> stump grinder
    if (afissFactors.includes("stumps_present")) {
      recommendations.push({
        type: "attachment",
        name: "Stump Grinder Attachment",
        reason: "Stumps need removal before main work",
        estimatedCost: 150,
      });
    }

    // Remote location -> fuel surcharge
    if (afissFactors.includes("remote_location")) {
      recommendations.push({
        type: "material",
        name: "Extra Fuel",
        reason: "Remote location requires additional fuel",
        quantity: 30,
        unit: "gallons",
        estimatedCost: 112.50,
      });
    }

    return recommendations;
  },
});

// Calculate cost summary for project loadout
export const calculateCostSummary = query({
  args: { id: v.id("projectLoadouts") },
  handler: async (ctx, { id }) => {
    const loadout = await ctx.db.get(id);
    if (!loadout) throw new Error("Project loadout not found");

    // Base loadout breakdown
    const baseCosts = {
      equipment: loadout.coreEquipment.reduce(
        (sum, eq) => sum + (eq.costPerHour * loadout.estimatedProjectHours), 
        0
      ),
      labor: loadout.coreEmployees.reduce(
        (sum, emp) => sum + (emp.costPerHour * loadout.estimatedProjectHours), 
        0
      ),
      subtotal: loadout.baseCostPerHour * loadout.estimatedProjectHours,
    };

    // Additions breakdown
    const additions = {
      equipment: loadout.totalEquipmentCost - baseCosts.equipment,
      labor: loadout.totalLaborCost - baseCosts.labor,
      attachments: loadout.totalAttachmentsCost,
      materials: loadout.totalMaterialsCost,
      subtotal: 
        (loadout.totalEquipmentCost - baseCosts.equipment) +
        (loadout.totalLaborCost - baseCosts.labor) +
        loadout.totalAttachmentsCost +
        loadout.totalMaterialsCost,
    };

    return {
      base: baseCosts,
      additions,
      totalCost: loadout.totalProjectCost,
      blendedHourlyRate: loadout.blendedHourlyRate,
      priceAtMargin50: loadout.billingRates.margin50 * loadout.estimatedProjectHours,
      profit: (loadout.billingRates.margin50 * loadout.estimatedProjectHours) - loadout.totalProjectCost,
    };
  },
});
