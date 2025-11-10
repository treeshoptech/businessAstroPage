import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * TreeShop Scheduling System - Convex API Endpoints
 *
 * Comprehensive scheduling operations for work orders including:
 * - Timeline calculation (hours → days)
 * - Crew and equipment availability tracking
 * - Conflict detection
 * - Auto-scheduling algorithm
 * - Task breakdown by day
 * - Google Calendar integration (future)
 */

// ============================================================================
// TIMELINE CALCULATION
// ============================================================================

/**
 * Calculate work order timeline from estimated hours
 *
 * Formula:
 * - Work days = Estimated hours ÷ 8 hours/day
 * - Buffer days = Work days × 0.10 (10% buffer)
 * - Total days = Work days + Buffer days
 */
export const calculateTimeline = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    estimatedTotalHours: v.number(),
  },
  handler: async (ctx, args) => {
    const workDays = Math.ceil(args.estimatedTotalHours / 8);
    const bufferDays = Math.ceil(workDays * 0.1); // 10% buffer
    const totalDays = workDays + bufferDays;

    return {
      estimatedWorkDays: workDays,
      bufferDays: bufferDays,
      totalScheduledDays: totalDays,
    };
  },
});

// ============================================================================
// WORK ORDER SCHEDULING
// ============================================================================

/**
 * Create schedule for a work order
 */
export const createSchedule = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    projectId: v.id("projects"),
    scheduledStartDate: v.number(),
    assignedCrewIds: v.array(v.id("users")),
    assignedEquipmentIds: v.array(v.id("equipment")),
    crewLeaderId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get work order details
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    // Get project for location data
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // Get customer for property coordinates
    const customer = await ctx.db.get(workOrder.customerId);
    if (!customer) throw new Error("Customer not found");

    // Calculate timeline
    const timeline = await calculateTimeline(ctx, {
      workOrderId: args.workOrderId,
      estimatedTotalHours: workOrder.estimatedTotalHours,
    });

    // Calculate end date
    const startDate = new Date(args.scheduledStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + timeline.totalScheduledDays);

    // Create daily task breakdown
    const dailyTasks = [];
    let remainingHours = workOrder.estimatedTotalHours;

    for (let day = 0; day < timeline.estimatedWorkDays; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + day);

      const hoursForDay = Math.min(8, remainingHours);
      remainingHours -= hoursForDay;

      dailyTasks.push({
        dayNumber: day + 1,
        date: dayDate.getTime(),
        tasks: [], // Tasks will be populated separately
        totalHoursForDay: hoursForDay,
        status: "pending" as const,
      });
    }

    // Create schedule
    const scheduleId = await ctx.db.insert("workOrderSchedule", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      projectId: args.projectId,
      estimatedTotalHours: workOrder.estimatedTotalHours,
      estimatedWorkDays: timeline.estimatedWorkDays,
      bufferDays: timeline.bufferDays,
      totalScheduledDays: timeline.totalScheduledDays,
      scheduledStartDate: args.scheduledStartDate,
      scheduledEndDate: endDate.getTime(),
      dailyTasks,
      assignedCrewIds: args.assignedCrewIds,
      crewLeaderId: args.crewLeaderId,
      assignedEquipmentIds: args.assignedEquipmentIds,
      propertyLatitude: customer.propertyLatitude || 0,
      propertyLongitude: customer.propertyLongitude || 0,
      driveTimeMinutes: project.driveTimeMinutes || 0,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update work order status
    await ctx.db.patch(args.workOrderId, {
      scheduledStartDate: args.scheduledStartDate,
      scheduledEndDate: endDate.getTime(),
      status: "scheduled",
      updatedAt: Date.now(),
    });

    // Mark equipment as scheduled
    for (const equipmentId of args.assignedEquipmentIds) {
      await setEquipmentAvailability(ctx, {
        organizationId: args.organizationId,
        equipmentId,
        startDate: args.scheduledStartDate,
        endDate: endDate.getTime(),
        status: "scheduled",
        workOrderId: args.workOrderId,
      });
    }

    // Check for conflicts
    await detectConflicts(ctx, {
      organizationId: args.organizationId,
      scheduleId,
    });

    return scheduleId;
  },
});

/**
 * Update work order schedule (reschedule)
 */
export const rescheduleWorkOrder = mutation({
  args: {
    scheduleId: v.id("workOrderSchedule"),
    newStartDate: v.number(),
    reason: v.string(),
    rescheduledBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) throw new Error("Schedule not found");

    // Calculate new end date
    const startDate = new Date(args.newStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + schedule.totalScheduledDays);

    // Update daily tasks with new dates
    const updatedDailyTasks = schedule.dailyTasks.map((task, index) => {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + index);
      return {
        ...task,
        date: dayDate.getTime(),
        status: "pending" as const,
      };
    });

    // Update schedule
    await ctx.db.patch(args.scheduleId, {
      scheduledStartDate: args.newStartDate,
      scheduledEndDate: endDate.getTime(),
      dailyTasks: updatedDailyTasks,
      status: "rescheduled",
      rescheduledFrom: {
        originalStartDate: schedule.scheduledStartDate,
        originalEndDate: schedule.scheduledEndDate,
        reason: args.reason,
        rescheduledAt: Date.now(),
        rescheduledBy: args.rescheduledBy,
      },
      updatedAt: Date.now(),
    });

    // Update work order
    await ctx.db.patch(schedule.workOrderId, {
      scheduledStartDate: args.newStartDate,
      scheduledEndDate: endDate.getTime(),
      updatedAt: Date.now(),
    });

    // Re-check conflicts
    await detectConflicts(ctx, {
      organizationId: schedule.organizationId,
      scheduleId: args.scheduleId,
    });

    return args.scheduleId;
  },
});

// ============================================================================
// CREW AVAILABILITY
// ============================================================================

/**
 * Set crew member availability for a date range
 */
export const setCrewAvailability = mutation({
  args: {
    organizationId: v.id("organizations"),
    employeeId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(v.literal("available"), v.literal("unavailable"), v.literal("partial")),
    reason: v.optional(v.union(
      v.literal("vacation"),
      v.literal("sick"),
      v.literal("personal"),
      v.literal("training"),
      v.literal("other")
    )),
    notes: v.optional(v.string()),
    availableFrom: v.optional(v.number()),
    availableTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const availabilityIds = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      date.setHours(0, 0, 0, 0);

      // Check if availability already exists
      const existing = await ctx.db
        .query("crewAvailability")
        .withIndex("by_employee", (q) =>
          q.eq("employeeId", args.employeeId).eq("date", date.getTime())
        )
        .first();

      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          status: args.status,
          reason: args.reason,
          notes: args.notes,
          availableFrom: args.availableFrom,
          availableTo: args.availableTo,
          updatedAt: Date.now(),
        });
        availabilityIds.push(existing._id);
      } else {
        // Create new
        const id = await ctx.db.insert("crewAvailability", {
          organizationId: args.organizationId,
          employeeId: args.employeeId,
          date: date.getTime(),
          status: args.status,
          reason: args.reason,
          notes: args.notes,
          availableFrom: args.availableFrom,
          availableTo: args.availableTo,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        availabilityIds.push(id);
      }
    }

    return availabilityIds;
  },
});

/**
 * Get crew availability for a date range
 */
export const getCrewAvailability = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
    employeeIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);

    let availability = await ctx.db
      .query("crewAvailability")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.gte(q.field("date"), start.getTime()),
          q.lte(q.field("date"), end.getTime())
        )
      )
      .collect();

    if (args.employeeIds) {
      availability = availability.filter((a) =>
        args.employeeIds!.includes(a.employeeId)
      );
    }

    return availability;
  },
});

/**
 * Check if crew is available on a specific date
 */
export const checkCrewAvailable = query({
  args: {
    employeeId: v.id("users"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const dateStart = new Date(args.date);
    dateStart.setHours(0, 0, 0, 0);

    const availability = await ctx.db
      .query("crewAvailability")
      .withIndex("by_employee", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", dateStart.getTime())
      )
      .first();

    if (!availability) {
      // No record = available
      return { available: true, status: "available" };
    }

    return {
      available: availability.status === "available",
      status: availability.status,
      reason: availability.reason,
      availableFrom: availability.availableFrom,
      availableTo: availability.availableTo,
    };
  },
});

// ============================================================================
// EQUIPMENT AVAILABILITY
// ============================================================================

/**
 * Set equipment availability for a date range
 */
export const setEquipmentAvailability = mutation({
  args: {
    organizationId: v.id("organizations"),
    equipmentId: v.id("equipment"),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("scheduled"),
      v.literal("in_use"),
      v.literal("maintenance"),
      v.literal("repair"),
      v.literal("unavailable")
    ),
    workOrderId: v.optional(v.id("workOrders")),
    maintenanceType: v.optional(v.string()),
    expectedReturnDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const availabilityIds = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      date.setHours(0, 0, 0, 0);

      // Check if availability already exists
      const existing = await ctx.db
        .query("equipmentAvailability")
        .withIndex("by_equipment", (q) =>
          q.eq("equipmentId", args.equipmentId).eq("date", date.getTime())
        )
        .first();

      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          status: args.status,
          workOrderId: args.workOrderId,
          maintenanceType: args.maintenanceType,
          expectedReturnDate: args.expectedReturnDate,
          notes: args.notes,
          updatedAt: Date.now(),
        });
        availabilityIds.push(existing._id);
      } else {
        // Create new
        const id = await ctx.db.insert("equipmentAvailability", {
          organizationId: args.organizationId,
          equipmentId: args.equipmentId,
          date: date.getTime(),
          status: args.status,
          workOrderId: args.workOrderId,
          maintenanceType: args.maintenanceType,
          expectedReturnDate: args.expectedReturnDate,
          notes: args.notes,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        availabilityIds.push(id);
      }
    }

    return availabilityIds;
  },
});

/**
 * Get equipment availability for a date range
 */
export const getEquipmentAvailability = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
    equipmentIds: v.optional(v.array(v.id("equipment"))),
  },
  handler: async (ctx, args) => {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);

    let availability = await ctx.db
      .query("equipmentAvailability")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.gte(q.field("date"), start.getTime()),
          q.lte(q.field("date"), end.getTime())
        )
      )
      .collect();

    if (args.equipmentIds) {
      availability = availability.filter((a) =>
        args.equipmentIds!.includes(a.equipmentId)
      );
    }

    return availability;
  },
});

/**
 * Check if equipment is available on a specific date
 */
export const checkEquipmentAvailable = query({
  args: {
    equipmentId: v.id("equipment"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const dateStart = new Date(args.date);
    dateStart.setHours(0, 0, 0, 0);

    const availability = await ctx.db
      .query("equipmentAvailability")
      .withIndex("by_equipment", (q) =>
        q.eq("equipmentId", args.equipmentId).eq("date", dateStart.getTime())
      )
      .first();

    if (!availability) {
      // No record = available
      return { available: true, status: "available" };
    }

    return {
      available: availability.status === "available",
      status: availability.status,
      workOrderId: availability.workOrderId,
      expectedReturnDate: availability.expectedReturnDate,
    };
  },
});

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detect scheduling conflicts for a work order schedule
 */
export const detectConflicts = mutation({
  args: {
    organizationId: v.id("organizations"),
    scheduleId: v.id("workOrderSchedule"),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) throw new Error("Schedule not found");

    const conflicts = [];

    // Check each day
    for (const dailyTask of schedule.dailyTasks) {
      // Check crew availability
      for (const crewId of schedule.assignedCrewIds) {
        const crewCheck = await checkCrewAvailable(ctx, {
          employeeId: crewId,
          date: dailyTask.date,
        });

        if (!crewCheck.available) {
          const conflictId = await ctx.db.insert("scheduleConflicts", {
            organizationId: args.organizationId,
            conflictType: "crew_unavailable",
            workOrderId: schedule.workOrderId,
            conflictDate: dailyTask.date,
            resourceType: "crew",
            resourceId: crewId,
            status: "unresolved",
            createdAt: Date.now(),
          });
          conflicts.push(conflictId);
        }
      }

      // Check equipment availability
      for (const equipmentId of schedule.assignedEquipmentIds) {
        const equipmentCheck = await checkEquipmentAvailable(ctx, {
          equipmentId,
          date: dailyTask.date,
        });

        if (!equipmentCheck.available) {
          const conflictId = await ctx.db.insert("scheduleConflicts", {
            organizationId: args.organizationId,
            conflictType: "equipment_unavailable",
            workOrderId: schedule.workOrderId,
            conflictDate: dailyTask.date,
            resourceType: "equipment",
            resourceId: equipmentId,
            status: "unresolved",
            createdAt: Date.now(),
          });
          conflicts.push(conflictId);
        }
      }
    }

    return conflicts;
  },
});

/**
 * Get all conflicts for an organization
 */
export const getConflicts = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("unresolved"),
      v.literal("resolved"),
      v.literal("ignored")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("scheduleConflicts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));

    let conflicts = await query.collect();

    if (args.status) {
      conflicts = conflicts.filter((c) => c.status === args.status);
    }

    return conflicts;
  },
});

/**
 * Resolve a scheduling conflict
 */
export const resolveConflict = mutation({
  args: {
    conflictId: v.id("scheduleConflicts"),
    resolution: v.string(),
    resolvedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conflictId, {
      status: "resolved",
      resolution: args.resolution,
      resolvedAt: Date.now(),
      resolvedBy: args.resolvedBy,
    });

    return args.conflictId;
  },
});

// ============================================================================
// SCHEDULING QUERIES
// ============================================================================

/**
 * Get all schedules for an organization
 */
export const listSchedules = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("rescheduled")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("workOrderSchedule")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));

    let schedules = await query.collect();

    if (args.status) {
      schedules = schedules.filter((s) => s.status === args.status);
    }

    // Sort by start date (newest first)
    schedules.sort((a, b) => b.scheduledStartDate - a.scheduledStartDate);

    return schedules;
  },
});

/**
 * Get schedules for a specific date range (for calendar views)
 */
export const getSchedulesByDateRange = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const schedules = await ctx.db
      .query("workOrderSchedule")
      .withIndex("by_date_range")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.lte(q.field("scheduledStartDate"), args.endDate),
          q.gte(q.field("scheduledEndDate"), args.startDate)
        )
      )
      .collect();

    return schedules;
  },
});

/**
 * Get schedule details by ID
 */
export const getSchedule = query({
  args: {
    scheduleId: v.id("workOrderSchedule"),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) return null;

    // Get work order
    const workOrder = await ctx.db.get(schedule.workOrderId);

    // Get project
    const project = await ctx.db.get(schedule.projectId);

    // Get customer
    const customer = workOrder ? await ctx.db.get(workOrder.customerId) : null;

    // Get assigned crew members
    const crewMembers = await Promise.all(
      schedule.assignedCrewIds.map((id) => ctx.db.get(id))
    );

    // Get assigned equipment
    const equipment = await Promise.all(
      schedule.assignedEquipmentIds.map((id) => ctx.db.get(id))
    );

    return {
      schedule,
      workOrder,
      project,
      customer,
      crewMembers: crewMembers.filter(Boolean),
      equipment: equipment.filter(Boolean),
    };
  },
});

/**
 * Get all schedules for a specific crew member
 */
export const getCrewSchedules = query({
  args: {
    organizationId: v.id("organizations"),
    employeeId: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let schedules = await ctx.db
      .query("workOrderSchedule")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Filter by crew member
    schedules = schedules.filter((s) =>
      s.assignedCrewIds.includes(args.employeeId)
    );

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      schedules = schedules.filter((s) =>
        s.scheduledStartDate <= args.endDate! &&
        s.scheduledEndDate >= args.startDate!
      );
    }

    return schedules;
  },
});

/**
 * Get all schedules for a specific equipment
 */
export const getEquipmentSchedules = query({
  args: {
    organizationId: v.id("organizations"),
    equipmentId: v.id("equipment"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let schedules = await ctx.db
      .query("workOrderSchedule")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Filter by equipment
    schedules = schedules.filter((s) =>
      s.assignedEquipmentIds.includes(args.equipmentId)
    );

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      schedules = schedules.filter((s) =>
        s.scheduledStartDate <= args.endDate! &&
        s.scheduledEndDate >= args.startDate!
      );
    }

    return schedules;
  },
});

// ============================================================================
// SMART SCHEDULING
// ============================================================================

/**
 * Auto-schedule: Find optimal start date for a work order
 *
 * Considers:
 * - Crew availability
 * - Equipment availability
 * - Existing scheduled work orders
 * - Geographic clustering (future)
 */
export const findOptimalStartDate = query({
  args: {
    organizationId: v.id("organizations"),
    requiredCrewIds: v.array(v.id("users")),
    requiredEquipmentIds: v.array(v.id("equipment")),
    estimatedDays: v.number(),
    preferredStartDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchStartDate = args.preferredStartDate || Date.now();
    const maxDaysToSearch = 90; // Search up to 90 days ahead

    for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
      const potentialStartDate = new Date(searchStartDate);
      potentialStartDate.setDate(potentialStartDate.getDate() + dayOffset);
      potentialStartDate.setHours(0, 0, 0, 0);

      // Check if all resources are available for the entire duration
      let allAvailable = true;

      for (let day = 0; day < args.estimatedDays; day++) {
        const checkDate = new Date(potentialStartDate);
        checkDate.setDate(potentialStartDate.getDate() + day);

        // Check crew availability
        for (const crewId of args.requiredCrewIds) {
          const crewCheck = await checkCrewAvailable(ctx, {
            employeeId: crewId,
            date: checkDate.getTime(),
          });

          if (!crewCheck.available) {
            allAvailable = false;
            break;
          }
        }

        if (!allAvailable) break;

        // Check equipment availability
        for (const equipmentId of args.requiredEquipmentIds) {
          const equipmentCheck = await checkEquipmentAvailable(ctx, {
            equipmentId,
            date: checkDate.getTime(),
          });

          if (!equipmentCheck.available) {
            allAvailable = false;
            break;
          }
        }

        if (!allAvailable) break;
      }

      if (allAvailable) {
        const endDate = new Date(potentialStartDate);
        endDate.setDate(potentialStartDate.getDate() + args.estimatedDays);

        return {
          found: true,
          startDate: potentialStartDate.getTime(),
          endDate: endDate.getTime(),
          daysFromNow: dayOffset,
        };
      }
    }

    return {
      found: false,
      message: "No available dates found within the next 90 days",
    };
  },
});
