import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Work Orders API
 *
 * Manage work orders (approved proposals ready for execution)
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all work orders for an organization
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Sort by created date (newest first)
    workOrders.sort((a, b) => b.createdAt - a.createdAt);

    return workOrders;
  },
});

/**
 * Get work orders by status
 */
export const getByStatus = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", args.status)
      )
      .collect();

    return workOrders;
  },
});

/**
 * Get single work order by ID
 */
export const get = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return null;

    // Get related data
    const project = await ctx.db.get(workOrder.projectId);
    const customer = await ctx.db.get(workOrder.customerId);
    const proposal = await ctx.db.get(workOrder.proposalId);

    return {
      workOrder,
      project,
      customer,
      proposal,
    };
  },
});

/**
 * Get work orders for a specific customer
 */
export const getByCustomer = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();

    const projectIds = projects.map((p) => p._id);

    const workOrders = [];
    for (const projectId of projectIds) {
      const wos = await ctx.db
        .query("workOrders")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect();
      workOrders.push(...wos);
    }

    return workOrders;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create work order from proposal
 */
export const createFromProposal = mutation({
  args: {
    organizationId: v.id("organizations"),
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");

    const project = await ctx.db.get(proposal.projectId);
    if (!project) throw new Error("Project not found");

    // Get customer from project
    const customer = await ctx.db.get(project.customerId);
    if (!customer) throw new Error("Customer not found");

    // Create work order
    const workOrderId = await ctx.db.insert("workOrders", {
      organizationId: args.organizationId,
      projectId: proposal.projectId,
      proposalId: args.proposalId,
      customerId: project.customerId,
      loadoutId: proposal.loadoutId,
      serviceType: project.serviceType,
      treeShopScore: project.treeShopScore || 0,
      afissMultiplier: proposal.afissMultiplier,
      adjustedTreeShopScore: proposal.adjustedTreeShopScore,
      estimatedTotalHours: proposal.totalHours,
      estimatedPrimaryHours: proposal.estimatedHours,
      estimatedPpH: 0, // Calculate from loadout
      assignedEmployeeIds: [],
      assignedEquipmentIds: [],
      status: "scheduled",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update project status
    await ctx.db.patch(proposal.projectId, {
      status: "work_order",
      updatedAt: Date.now(),
    });

    return workOrderId;
  },
});

/**
 * Update work order status
 */
export const updateStatus = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workOrderId, {
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return args.workOrderId;
  },
});

/**
 * Assign crew to work order
 */
export const assignCrew = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    employeeIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workOrderId, {
      assignedEmployeeIds: args.employeeIds,
      updatedAt: Date.now(),
    });

    return args.workOrderId;
  },
});

/**
 * Assign equipment to work order
 */
export const assignEquipment = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    equipmentIds: v.array(v.id("equipment")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workOrderId, {
      assignedEquipmentIds: args.equipmentIds,
      updatedAt: Date.now(),
    });

    return args.workOrderId;
  },
});

/**
 * Start work order
 */
export const start = mutation({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workOrderId, {
      status: "in_progress",
      actualStartDate: Date.now(),
      updatedAt: Date.now(),
    });

    return args.workOrderId;
  },
});

/**
 * Complete work order
 */
export const complete = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    actualTotalHours: v.number(),
    customerSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workOrderId, {
      status: "completed",
      actualEndDate: Date.now(),
      actualTotalHours: args.actualTotalHours,
      customerSignature: args.customerSignature,
      updatedAt: Date.now(),
    });

    // Update project status
    const workOrder = await ctx.db.get(args.workOrderId);
    if (workOrder) {
      await ctx.db.patch(workOrder.projectId, {
        status: "completed",
        updatedAt: Date.now(),
      });
    }

    return args.workOrderId;
  },
});

/**
 * Add photos to work order
 */
export const addPhotos = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    photoType: v.union(v.literal("before"), v.literal("during"), v.literal("after")),
    photoUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    const fieldName =
      args.photoType === "before"
        ? "beforePhotos"
        : args.photoType === "during"
        ? "duringPhotos"
        : "afterPhotos";

    const existingPhotos = workOrder[fieldName] || [];
    const updatedPhotos = [...existingPhotos, ...args.photoUrls];

    await ctx.db.patch(args.workOrderId, {
      [fieldName]: updatedPhotos,
      updatedAt: Date.now(),
    });

    return args.workOrderId;
  },
});
