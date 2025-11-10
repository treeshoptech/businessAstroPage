# TreeShop Scheduling System - Complete Implementation

**Date:** 2025-01-09
**Status:** Core scheduling system complete (Google Calendar integration pending)

---

## Overview

Complete scheduling system for TreeShop.app that converts proposal hours into scheduled work orders with:
- Timeline auto-calculation (hours → days)
- Crew and equipment availability tracking
- Conflict detection and resolution
- Smart auto-scheduling algorithm
- Multiple calendar views (Week, Month, Crew, Equipment)
- Schedule wizard for easy work order scheduling
- Geographic data for route optimization (foundation laid)

---

## Files Created/Modified

### 1. Schema Extensions (`/convex/schema.ts`)

**Added 4 new tables:**

#### `crewAvailability` Table
Tracks crew member availability by date:
- Date-based availability status (available, unavailable, partial)
- Reason tracking (vacation, sick, personal, training)
- Partial availability with time ranges
- Recurring pattern support
- Indexed by organization, employee, date, and status

#### `equipmentAvailability` Table
Tracks equipment availability by date:
- Status tracking (available, scheduled, in_use, maintenance, repair)
- Work order linkage for scheduled equipment
- Maintenance tracking with expected return dates
- Indexed by organization, equipment, date, status, and work order

#### `workOrderSchedule` Table
Enhanced scheduling for work orders:
- Timeline calculation (estimated hours, work days, buffer days)
- Scheduled start/end dates
- Daily task breakdown with hours allocation
- Crew and equipment assignments
- Crew leader designation
- Geographic data (property coordinates, drive time)
- Google Calendar integration fields (event ID, sync status)
- Rescheduling history tracking
- Notification tracking
- Status flow: draft → scheduled → confirmed → in_progress → completed

#### `scheduleConflicts` Table
Conflict detection and management:
- Conflict types: crew double-booked, equipment double-booked, crew unavailable, equipment unavailable
- Resource identification (type and ID)
- Conflict date and work order linkage
- Resolution workflow (unresolved → resolved/ignored)
- Resolution tracking with notes and user

---

### 2. Scheduling API (`/convex/scheduling.ts`)

**Comprehensive API with 20+ endpoints:**

#### Timeline Calculation
```typescript
calculateTimeline(workOrderId, estimatedTotalHours)
// Returns: estimatedWorkDays, bufferDays, totalScheduledDays
// Formula: Work days = hours ÷ 8, Buffer = 10%
```

#### Work Order Scheduling
```typescript
createSchedule({
  organizationId,
  workOrderId,
  projectId,
  scheduledStartDate,
  assignedCrewIds,
  assignedEquipmentIds,
  crewLeaderId
})
// Creates full schedule with daily task breakdown
// Auto-detects conflicts
// Updates work order status
// Marks equipment as scheduled
```

```typescript
rescheduleWorkOrder({
  scheduleId,
  newStartDate,
  reason,
  rescheduledBy
})
// Updates schedule dates
// Recalculates daily tasks
// Tracks rescheduling history
// Re-checks conflicts
```

#### Crew Availability
```typescript
setCrewAvailability({
  organizationId,
  employeeId,
  startDate,
  endDate,
  status, // available, unavailable, partial
  reason?, // vacation, sick, personal, training
  notes?,
  availableFrom?, // for partial availability
  availableTo?
})
// Creates availability records for date range
// Updates existing records if found
```

```typescript
getCrewAvailability(organizationId, startDate, endDate, employeeIds?)
checkCrewAvailable(employeeId, date)
```

#### Equipment Availability
```typescript
setEquipmentAvailability({
  organizationId,
  equipmentId,
  startDate,
  endDate,
  status, // available, scheduled, in_use, maintenance, repair
  workOrderId?,
  maintenanceType?,
  expectedReturnDate?
})
```

```typescript
getEquipmentAvailability(organizationId, startDate, endDate, equipmentIds?)
checkEquipmentAvailable(equipmentId, date)
```

#### Conflict Detection
```typescript
detectConflicts(organizationId, scheduleId)
// Checks each day in schedule
// Detects crew unavailability
// Detects equipment unavailability
// Creates conflict records
// Returns array of conflict IDs
```

```typescript
getConflicts(organizationId, status?)
resolveConflict(conflictId, resolution, resolvedBy)
```

#### Scheduling Queries
```typescript
listSchedules(organizationId, status?)
getSchedulesByDateRange(organizationId, startDate, endDate)
getSchedule(scheduleId) // Full details with related data
getCrewSchedules(organizationId, employeeId, startDate?, endDate?)
getEquipmentSchedules(organizationId, equipmentId, startDate?, endDate?)
```

#### Smart Scheduling
```typescript
findOptimalStartDate({
  organizationId,
  requiredCrewIds,
  requiredEquipmentIds,
  estimatedDays,
  preferredStartDate?
})
// Searches up to 90 days ahead
// Finds first date where ALL resources available
// Returns: found, startDate, endDate, daysFromNow
```

---

### 3. Work Orders API (`/convex/workOrders.ts`)

**New file created:**

#### Queries
- `list(organizationId)` - All work orders for organization
- `getByStatus(organizationId, status)` - Filter by status
- `get(workOrderId)` - Full details with project/customer/proposal
- `getByCustomer(customerId)` - All work orders for a customer

#### Mutations
- `createFromProposal(organizationId, proposalId)` - Create work order from signed proposal
- `updateStatus(workOrderId, status, notes?)` - Update work order status
- `assignCrew(workOrderId, employeeIds)` - Assign crew members
- `assignEquipment(workOrderId, equipmentIds)` - Assign equipment
- `start(workOrderId)` - Mark as in progress with actual start date
- `complete(workOrderId, actualTotalHours, customerSignature?)` - Complete work order
- `addPhotos(workOrderId, photoType, photoUrls)` - Add before/during/after photos

---

### 4. Schedule View UI (`/src/components/Schedule/ScheduleView.tsx`)

**Comprehensive calendar interface with 4 view modes:**

#### Main ScheduleView Component
- View toggle: Week | Month | Crew | Equipment
- Date navigation with Previous/Today/Next buttons
- Current date display
- Conflicts badge showing unresolved issues
- "Schedule Work Order" button opening wizard
- Integrated with SimpleDashboard routing

#### Week View
- 7-day grid layout (Sunday - Saturday)
- Today highlighting
- Scheduled work orders per day
- Status color coding (Green=Scheduled, Blue=In Progress, Red=Overdue)
- Status icons (Check for completed, Clock for scheduled)
- Mobile-responsive grid (stacks on smaller screens)

#### Month View
- Calendar grid with week headers (Sun - Sat)
- Full month display starting from first week
- Current month day highlighting
- Work order count badges per day
- Non-current month days shown with reduced opacity
- Today border highlighting

#### Crew View
- One row per crew member
- 7-day horizontal timeline per crew
- Shows crew name and role
- Availability status (Available vs. # jobs assigned)
- Job count chips with status colors
- Helps identify who's overbooked or underutilized

#### Equipment View
- One row per active equipment
- 7-day horizontal timeline per equipment
- Shows equipment name and category
- Availability status (Available vs. # jobs assigned)
- Job count chips with status colors
- Filtered to active equipment only

#### Schedule Wizard Dialog
- Work order selection dropdown
- Start date picker
- Multi-select crew assignment (chips)
- Multi-select equipment assignment (chips)
- Create schedule button
- Validation (requires all fields)

#### Status Color Coding
```typescript
Green (success): scheduled, confirmed
Blue (info): in_progress
Yellow (warning): draft
Red (error): cancelled
Gray (default): completed
```

---

### 5. Integration with SimpleDashboard

**Modified `/src/components/SimpleDashboard.tsx`:**
- Added ScheduleView lazy import
- Added 'schedule' to page title mapping
- Added 'schedule' route to renderPageContent
- Route: `/app/schedule` → ScheduleView component

---

## How It Works

### Workflow: Proposal → Scheduled Work Order

**Step 1: Proposal is Signed**
- Customer signs proposal digitally
- Proposal status → "signed"
- Project status → "proposal"

**Step 2: Create Work Order**
```typescript
await createFromProposal({
  organizationId,
  proposalId
})
```
- Creates work order from proposal data
- Copies estimated hours, TreeShop Score, AFISS factors
- Sets status to "scheduled"
- Updates project status to "work_order"

**Step 3: Schedule the Work Order**
```typescript
await createSchedule({
  organizationId,
  workOrderId,
  projectId,
  scheduledStartDate,
  assignedCrewIds,
  assignedEquipmentIds,
  crewLeaderId
})
```

**What happens:**
1. Calculate timeline from estimated hours
2. Calculate end date (start + total days)
3. Create daily task breakdown:
   - Day 1, 2, 3... up to estimated work days
   - Allocate hours per day (8 hrs max)
   - Tasks TBD (will be populated later)
4. Mark equipment as scheduled for date range
5. Check for conflicts (crew/equipment availability)
6. Update work order with scheduled dates
7. Create workOrderSchedule record

**Step 4: View in Calendar**
- Open Schedule page (`/app/schedule`)
- See work order on scheduled dates
- View by week, month, crew, or equipment
- Check for conflicts (red badge)

**Step 5: Resolve Conflicts (if any)**
- View conflicts list
- Reschedule work order if needed
- Mark crew/equipment unavailable
- Re-run conflict detection

**Step 6: Execute Work Order**
- Field crew opens work order on mobile
- Clock in/out with time entries
- Take before/during/after photos
- Complete tasks
- Get customer signature

**Step 7: Complete Work Order**
```typescript
await complete({
  workOrderId,
  actualTotalHours,
  customerSignature
})
```
- Status → "completed"
- Project status → "completed"
- Ready for invoicing

---

## Timeline Calculation Logic

**Formula:**
```
Work Days = CEIL(Estimated Hours ÷ 8)
Buffer Days = CEIL(Work Days × 0.10)
Total Scheduled Days = Work Days + Buffer Days
```

**Example 1: 15-hour job**
```
Work Days = CEIL(15 ÷ 8) = 2 days
Buffer Days = CEIL(2 × 0.10) = 1 day
Total = 3 days
```

**Example 2: 30-hour job**
```
Work Days = CEIL(30 ÷ 8) = 4 days
Buffer Days = CEIL(4 × 0.10) = 1 day
Total = 5 days
```

**Daily Task Allocation:**
- Day 1: 8 hours
- Day 2: 8 hours
- Day 3: 8 hours
- Day 4: 6 hours (remaining)
- Buffer day: 0 hours (contingency only)

---

## Conflict Detection

**Conflict Types:**

1. **Crew Double-Booked**
   - Crew member assigned to 2+ work orders on same date
   - Detected during schedule creation
   - Resolution: Reschedule one work order

2. **Equipment Double-Booked**
   - Equipment assigned to 2+ work orders on same date
   - Detected during schedule creation
   - Resolution: Reschedule or assign different equipment

3. **Crew Unavailable**
   - Crew member marked unavailable (vacation, sick, etc.)
   - Crew assigned to work order on unavailable date
   - Resolution: Assign different crew or reschedule

4. **Equipment Unavailable**
   - Equipment in maintenance/repair
   - Equipment assigned to work order on unavailable date
   - Resolution: Assign different equipment or reschedule

**Detection Flow:**
```typescript
1. Create schedule
2. For each day in schedule:
   - Check each crew member availability
   - Check each equipment availability
   - Create conflict record if unavailable
3. Return array of conflicts
4. Display conflicts badge in UI
```

---

## Smart Auto-Scheduling

**Algorithm:**
```typescript
findOptimalStartDate({
  requiredCrewIds,
  requiredEquipmentIds,
  estimatedDays,
  preferredStartDate?
})
```

**Search Logic:**
1. Start from preferred date (or today)
2. For each day in next 90 days:
   3. Check if ALL crew available for entire duration
   4. Check if ALL equipment available for entire duration
   5. If all available: RETURN that date
   6. Else: Try next day
7. If no dates found: Return "not found"

**Example:**
```
Job needs: 2 crew, 1 mulcher, 3 days
Preferred: Jan 15
Search:
- Jan 15-17: Crew 1 unavailable (vacation) ❌
- Jan 16-18: Crew 1 unavailable (vacation) ❌
- Jan 17-19: Crew 1 unavailable (vacation) ❌
- Jan 18-20: Mulcher in maintenance ❌
- Jan 19-21: ALL AVAILABLE ✅
Result: Jan 19 (4 days from preferred)
```

---

## Geographic Clustering (Foundation)

**Data Already Captured:**
- `propertyLatitude` and `propertyLongitude` in workOrderSchedule
- `driveTimeMinutes` from proposal

**Future Enhancement:**
- Find nearby jobs on same day
- Optimize crew routes
- Suggest grouping jobs by geography
- Calculate transport time savings

---

## Google Calendar Integration (Pending)

**Schema Ready:**
- `googleCalendarEventId` field in workOrderSchedule
- `googleCalendarSyncStatus` (synced, pending, failed)
- `lastSyncedAt` timestamp

**Future Implementation:**
1. OAuth2 Google Calendar API authentication
2. Create calendar event when schedule created
3. Update event when rescheduled
4. Webhook for changes made in Google Calendar
5. Two-way sync (TreeShop ↔ Google)

---

## Notifications (Pending)

**Schema Ready:**
- `notificationsSent` array in workOrderSchedule
- Tracks notification type, timestamp, recipients

**Future Implementation:**
1. Crew assignment notification
2. Day-before reminder
3. Job start reminder
4. Conflict alert
5. Reschedule notification

---

## Weather Integration (Future)

**Not Yet Implemented:**

Will integrate with weather API to:
- Show weather forecast on scheduled dates
- Alert if bad weather expected
- Suggest rescheduling outdoor work
- Track weather-related delays

---

## Usage Examples

### 1. Create Schedule from Work Order

```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const createSchedule = useMutation(api.scheduling.createSchedule);

await createSchedule({
  organizationId: "org123",
  workOrderId: "wo456",
  projectId: "proj789",
  scheduledStartDate: new Date('2025-01-15').getTime(),
  assignedCrewIds: ["user1", "user2"],
  assignedEquipmentIds: ["equip1"],
  crewLeaderId: "user1"
});
```

### 2. Mark Crew Unavailable

```typescript
const setCrewAvailability = useMutation(api.scheduling.setCrewAvailability);

await setCrewAvailability({
  organizationId: "org123",
  employeeId: "user1",
  startDate: new Date('2025-01-20').getTime(),
  endDate: new Date('2025-01-25').getTime(),
  status: "unavailable",
  reason: "vacation",
  notes: "Family trip to Disney"
});
```

### 3. Find Best Start Date

```typescript
const findOptimal = useQuery(api.scheduling.findOptimalStartDate, {
  organizationId: "org123",
  requiredCrewIds: ["user1", "user2"],
  requiredEquipmentIds: ["equip1", "equip2"],
  estimatedDays: 3,
  preferredStartDate: new Date('2025-01-15').getTime()
});

if (findOptimal?.found) {
  console.log(`Start on: ${new Date(findOptimal.startDate)}`);
  console.log(`${findOptimal.daysFromNow} days from preferred date`);
}
```

### 4. Reschedule Work Order

```typescript
const reschedule = useMutation(api.scheduling.rescheduleWorkOrder);

await reschedule({
  scheduleId: "sched123",
  newStartDate: new Date('2025-01-20').getTime(),
  reason: "Weather delay - heavy rain forecasted",
  rescheduledBy: "user1"
});
```

### 5. Get Crew's Schedule

```typescript
const crewSchedule = useQuery(api.scheduling.getCrewSchedules, {
  organizationId: "org123",
  employeeId: "user1",
  startDate: new Date('2025-01-01').getTime(),
  endDate: new Date('2025-01-31').getTime()
});

console.log(`Crew has ${crewSchedule?.length} jobs in January`);
```

---

## Integration Points

### Proposal Builder
When proposal is signed:
```typescript
// Create work order
const workOrderId = await createFromProposal({ organizationId, proposalId });

// Optionally auto-schedule
const scheduleId = await createSchedule({
  organizationId,
  workOrderId,
  projectId,
  scheduledStartDate,
  assignedCrewIds,
  assignedEquipmentIds
});
```

### Mobile App (Field Crew)
- View today's scheduled work orders
- Clock in/out on tasks
- Take progress photos
- Mark tasks complete
- Get customer signature

### Equipment Maintenance
When equipment needs maintenance:
```typescript
await setEquipmentAvailability({
  organizationId,
  equipmentId,
  startDate: maintenanceStart,
  endDate: maintenanceEnd,
  status: "maintenance",
  maintenanceType: "Scheduled maintenance - oil change",
  expectedReturnDate: maintenanceEnd
});
```

### Analytics Dashboard
- Crew utilization rate (% of days scheduled)
- Equipment utilization rate
- Average schedule-to-completion time
- Conflict rate (% of schedules with conflicts)

---

## Next Steps

1. **Google Calendar Integration** (Highest Priority)
   - OAuth2 setup for Google Calendar API
   - Create/update/delete calendar events
   - Webhook for two-way sync
   - Calendar color coding by status

2. **Notifications System**
   - Email/SMS notifications for crew assignments
   - Day-before reminders
   - Conflict alerts
   - Reschedule notifications

3. **Weather Integration**
   - Fetch weather forecast for scheduled dates
   - Alert on bad weather
   - Track weather delays
   - Suggest optimal scheduling based on weather

4. **Route Optimization**
   - Geographic clustering algorithm
   - Optimize crew routes for multiple jobs
   - Calculate transport time savings
   - Display on map

5. **Mobile App Schedule View**
   - Today's schedule for field crew
   - Turn-by-turn navigation to job site
   - Real-time updates from office
   - Offline schedule access

6. **Recurring Work Orders**
   - Weekly/monthly service schedules
   - Auto-create work orders
   - Template management
   - Contract scheduling

---

## API Reference

All endpoints available at:
```typescript
import { api } from '../convex/_generated/api';
```

**Timeline:**
- `api.scheduling.calculateTimeline`

**Work Order Scheduling:**
- `api.scheduling.createSchedule`
- `api.scheduling.rescheduleWorkOrder`

**Crew Availability:**
- `api.scheduling.setCrewAvailability`
- `api.scheduling.getCrewAvailability`
- `api.scheduling.checkCrewAvailable`

**Equipment Availability:**
- `api.scheduling.setEquipmentAvailability`
- `api.scheduling.getEquipmentAvailability`
- `api.scheduling.checkEquipmentAvailable`

**Conflicts:**
- `api.scheduling.detectConflicts`
- `api.scheduling.getConflicts`
- `api.scheduling.resolveConflict`

**Queries:**
- `api.scheduling.listSchedules`
- `api.scheduling.getSchedulesByDateRange`
- `api.scheduling.getSchedule`
- `api.scheduling.getCrewSchedules`
- `api.scheduling.getEquipmentSchedules`

**Smart Scheduling:**
- `api.scheduling.findOptimalStartDate`

**Work Orders:**
- `api.workOrders.list`
- `api.workOrders.getByStatus`
- `api.workOrders.get`
- `api.workOrders.createFromProposal`
- `api.workOrders.updateStatus`
- `api.workOrders.assignCrew`
- `api.workOrders.assignEquipment`
- `api.workOrders.start`
- `api.workOrders.complete`

---

**Status:** Core scheduling system is production-ready. Google Calendar integration and notifications are next priorities.

**Date:** 2025-01-09
**Version:** 1.0
