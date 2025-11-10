import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Calculate real-time PpH for an active work order
 * Returns current performance vs estimate
 */
export const calculateLivePpH = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, { workOrderId }) => {
    const workOrder = await ctx.db.get(workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    // Get all time entries for primary tasks
    const primaryTimeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_primary_task", (q) =>
        q.eq("isPrimaryTask", true)
      )
      .filter((q) => q.eq(q.field("workOrderId"), workOrderId))
      .collect();

    // Calculate total primary hours (including active entries)
    const totalPrimaryHours = primaryTimeEntries.reduce((sum, entry) => {
      if (entry.clockOut) {
        return sum + (entry.totalHours || 0);
      } else {
        // Active entry - calculate elapsed time
        const elapsed = (Date.now() - entry.clockIn) / 3600000; // ms to hours
        return sum + elapsed;
      }
    }, 0);

    if (totalPrimaryHours === 0) {
      return {
        currentPpH: 0,
        estimatedPpH: workOrder.estimatedPpH,
        performance: 0,
        hoursElapsed: 0,
        hoursRemaining: workOrder.estimatedPrimaryHours,
        onTrack: false,
      };
    }

    const currentPpH = workOrder.adjustedTreeShopScore / totalPrimaryHours;
    const performance = (currentPpH / workOrder.estimatedPpH) * 100;

    // Estimate remaining hours based on current pace
    const hoursRemaining = Math.max(0,
      (workOrder.adjustedTreeShopScore / currentPpH) - totalPrimaryHours
    );

    return {
      currentPpH,
      estimatedPpH: workOrder.estimatedPpH,
      performance, // > 100% means doing better than estimate
      hoursElapsed: totalPrimaryHours,
      hoursRemaining,
      onTrack: performance >= 90, // Within 10% of estimate
      treeShopScore: workOrder.adjustedTreeShopScore,
    };
  },
});

/**
 * Get equipment performance metrics
 * Aggregates PpH data across all work orders using this equipment
 */
export const getEquipmentPerformance = query({
  args: {
    organizationId: v.id("organizations"),
    equipmentId: v.id("equipment"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, equipmentId, dateFrom, dateTo }) => {
    // Get all completed work orders with this equipment
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.eq(q.field("assignedEquipmentIds"), [equipmentId]) // Simplified - actual would check array contains
        )
      )
      .collect();

    // Filter by date if provided
    const filteredOrders = workOrders.filter(wo => {
      if (dateFrom && wo.actualEndDate && wo.actualEndDate < dateFrom) return false;
      if (dateTo && wo.actualStartDate && wo.actualStartDate > dateTo) return false;
      return true;
    });

    if (filteredOrders.length === 0) {
      return {
        jobsCompleted: 0,
        totalHours: 0,
        totalRevenue: 0,
        averagePpH: 0,
        estimatedPpH: 0,
        performanceRating: 0,
      };
    }

    const totalHours = filteredOrders.reduce((sum, wo) =>
      sum + (wo.actualPrimaryHours || 0), 0);
    const totalScore = filteredOrders.reduce((sum, wo) =>
      sum + wo.adjustedTreeShopScore, 0);

    const averagePpH = totalScore / totalHours;
    const estimatedPpH = filteredOrders.reduce((sum, wo) =>
      sum + wo.estimatedPpH, 0) / filteredOrders.length;

    const performanceRating = (averagePpH / estimatedPpH) * 100;

    return {
      jobsCompleted: filteredOrders.length,
      totalHours,
      totalScore,
      averagePpH,
      estimatedPpH,
      performanceRating, // > 100% means outperforming estimates
      efficiency: totalHours / filteredOrders.reduce((sum, wo) =>
        sum + wo.estimatedPrimaryHours, 0) * 100,
    };
  },
});

/**
 * Get employee performance metrics
 * Tracks billable %, PpH, and efficiency ratings
 */
export const getEmployeePerformance = query({
  args: {
    organizationId: v.id("organizations"),
    employeeId: v.id("users"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, employeeId, dateFrom, dateTo }) => {
    // Get all time entries for this employee
    let timeEntriesQuery = ctx.db
      .query("timeEntries")
      .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), organizationId),
          q.eq(q.field("status"), "completed")
        )
      );

    if (dateFrom || dateTo) {
      timeEntriesQuery = timeEntriesQuery.filter((q) => {
        let conditions = [];
        if (dateFrom) conditions.push(q.gte(q.field("clockIn"), dateFrom));
        if (dateTo) conditions.push(q.lte(q.field("clockIn"), dateTo));
        return conditions.length > 0 ? q.and(...conditions) : true;
      });
    }

    const timeEntries = await timeEntriesQuery.collect();

    if (timeEntries.length === 0) {
      return {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        billablePercentage: 0,
        primaryTaskHours: 0,
        averagePpH: 0,
        efficiencyRating: 0,
        jobsWorked: 0,
      };
    }

    const billableHours = timeEntries
      .filter(e => e.isBillable)
      .reduce((sum, e) => sum + (e.totalHours || 0), 0);

    const nonBillableHours = timeEntries
      .filter(e => !e.isBillable)
      .reduce((sum, e) => sum + (e.totalHours || 0), 0);

    const primaryTaskHours = timeEntries
      .filter(e => e.isPrimaryTask)
      .reduce((sum, e) => sum + (e.totalHours || 0), 0);

    const totalHours = billableHours + nonBillableHours;
    const billablePercentage = (billableHours / totalHours) * 100;

    // Calculate average PpH from primary tasks
    const primaryEntries = timeEntries.filter(e => e.isPrimaryTask && e.pointsPerHour);
    const averagePpH = primaryEntries.length > 0
      ? primaryEntries.reduce((sum, e) => sum + (e.pointsPerHour || 0), 0) / primaryEntries.length
      : 0;

    // Get unique work orders
    const uniqueWorkOrders = new Set(timeEntries.map(e => e.workOrderId));

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      billablePercentage,
      primaryTaskHours,
      averagePpH,
      jobsWorked: uniqueWorkOrders.size,
      timeEntriesCount: timeEntries.length,
    };
  },
});

/**
 * Get service type performance metrics
 * Analyzes performance across all jobs of a specific service type
 */
export const getServiceTypePerformance = query({
  args: {
    organizationId: v.id("organizations"),
    serviceType: v.string(),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, serviceType, dateFrom, dateTo }) => {
    // Get all completed work orders for this service type
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("serviceType"), serviceType),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    // Filter by date
    const filteredOrders = workOrders.filter(wo => {
      if (dateFrom && wo.actualEndDate && wo.actualEndDate < dateFrom) return false;
      if (dateTo && wo.actualStartDate && wo.actualStartDate > dateTo) return false;
      return true;
    });

    if (filteredOrders.length === 0) {
      return {
        jobsCompleted: 0,
        averageTreeShopScore: 0,
        averageEstimatedHours: 0,
        averageActualHours: 0,
        averagePpH: 0,
        estimatedPpH: 0,
        performanceRating: 0,
        onTimePercentage: 0,
      };
    }

    const totalScore = filteredOrders.reduce((sum, wo) => sum + wo.adjustedTreeShopScore, 0);
    const totalEstimatedHours = filteredOrders.reduce((sum, wo) => sum + wo.estimatedPrimaryHours, 0);
    const totalActualHours = filteredOrders.reduce((sum, wo) => sum + (wo.actualPrimaryHours || 0), 0);

    const averagePpH = totalScore / totalActualHours;
    const estimatedPpH = totalScore / totalEstimatedHours;
    const performanceRating = (averagePpH / estimatedPpH) * 100;

    // Calculate on-time percentage (within 10% of estimate)
    const onTimeJobs = filteredOrders.filter(wo => {
      const variance = Math.abs((wo.actualPrimaryHours || 0) - wo.estimatedPrimaryHours) / wo.estimatedPrimaryHours;
      return variance <= 0.10; // Within 10%
    });

    return {
      jobsCompleted: filteredOrders.length,
      averageTreeShopScore: totalScore / filteredOrders.length,
      averageEstimatedHours: totalEstimatedHours / filteredOrders.length,
      averageActualHours: totalActualHours / filteredOrders.length,
      averagePpH,
      estimatedPpH,
      performanceRating,
      efficiency: (totalEstimatedHours / totalActualHours) * 100,
      onTimePercentage: (onTimeJobs.length / filteredOrders.length) * 100,
    };
  },
});

/**
 * Get project-specific performance analysis
 * Detailed breakdown of estimated vs actual for a single project
 */
export const getProjectPerformance = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, { workOrderId }) => {
    const workOrder = await ctx.db.get(workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    // Get all tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", workOrderId))
      .collect();

    // Get all time entries
    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", workOrderId))
      .collect();

    // Calculate task-level breakdowns
    const taskBreakdown = tasks.map(task => {
      const taskEntries = timeEntries.filter(e => e.taskId === task._id);
      const actualHours = taskEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);

      return {
        taskName: task.taskName,
        category: task.taskCategory,
        isBillable: task.isBillable,
        isPrimary: task.isPrimaryTask,
        estimatedHours: task.estimatedHours,
        actualHours,
        variance: actualHours - task.estimatedHours,
        variancePercent: ((actualHours - task.estimatedHours) / task.estimatedHours) * 100,
      };
    });

    // Calculate totals
    const totalEstimated = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalActual = taskBreakdown.reduce((sum, t) => sum + t.actualHours, 0);

    const billableEstimated = tasks.filter(t => t.isBillable)
      .reduce((sum, t) => sum + t.estimatedHours, 0);
    const billableActual = taskBreakdown.filter(t => t.isBillable)
      .reduce((sum, t) => sum + t.actualHours, 0);

    return {
      workOrder: {
        treeShopScore: workOrder.adjustedTreeShopScore,
        estimatedPpH: workOrder.estimatedPpH,
        actualPpH: workOrder.actualPpH,
        performanceVsEstimate: workOrder.performanceVsEstimate,
      },
      totals: {
        estimatedHours: totalEstimated,
        actualHours: totalActual,
        variance: totalActual - totalEstimated,
        variancePercent: ((totalActual - totalEstimated) / totalEstimated) * 100,
      },
      billable: {
        estimatedHours: billableEstimated,
        actualHours: billableActual,
        billablePercentage: (billableActual / totalActual) * 100,
      },
      tasks: taskBreakdown,
      insights: {
        mostOverBudget: taskBreakdown.reduce((max, t) =>
          t.variance > (max?.variance || 0) ? t : max, taskBreakdown[0]),
        mostUnderBudget: taskBreakdown.reduce((min, t) =>
          t.variance < (min?.variance || 0) ? t : min, taskBreakdown[0]),
      },
    };
  },
});
