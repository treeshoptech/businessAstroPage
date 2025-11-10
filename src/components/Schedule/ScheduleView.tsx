import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Paper,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  CalendarMonth,
  ViewWeek,
  People,
  Construction,
  Add,
  Check,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import {format, startOfWeek, addDays, addWeeks, addMonths, startOfMonth, endOfMonth, isSameDay, isSameMonth} from 'date-fns';

interface ScheduleViewProps {
  organizationId: string;
}

type CalendarView = 'week' | 'month' | 'crew' | 'equipment';

export default function ScheduleView({ organizationId }: ScheduleViewProps) {
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleWizardOpen, setScheduleWizardOpen] = useState(false);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (view === 'week' || view === 'crew' || view === 'equipment') {
      const start = startOfWeek(currentDate);
      const end = addDays(start, 6);
      return { start, end };
    } else {
      // month view
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return { start, end };
    }
  }, [view, currentDate]);

  // Fetch schedules for date range
  const schedules = useQuery(api.scheduling.getSchedulesByDateRange, {
    organizationId: organizationId as Id<"organizations">,
    startDate: dateRange.start.getTime(),
    endDate: dateRange.end.getTime(),
  });

  // Navigation handlers
  const handlePrevious = () => {
    if (view === 'week' || view === 'crew' || view === 'equipment') {
      setCurrentDate(addWeeks(currentDate, -1));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (view === 'week' || view === 'crew' || view === 'equipment') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'draft':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return <ScheduleIcon fontSize="small" />;
      case 'completed':
        return <Check fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Schedule
        </Typography>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setScheduleWizardOpen(true)}
          sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
        >
          Schedule Work Order
        </Button>
      </Box>

      {/* Calendar Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          {/* View Toggle */}
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, newView) => newView && setView(newView)}
            size="small"
          >
            <ToggleButton value="week">
              <ViewWeek sx={{ mr: 1 }} fontSize="small" />
              Week
            </ToggleButton>
            <ToggleButton value="month">
              <CalendarMonth sx={{ mr: 1 }} fontSize="small" />
              Month
            </ToggleButton>
            <ToggleButton value="crew">
              <People sx={{ mr: 1 }} fontSize="small" />
              Crew
            </ToggleButton>
            <ToggleButton value="equipment">
              <Construction sx={{ mr: 1 }} fontSize="small" />
              Equipment
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Date Navigation */}
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={handlePrevious} size="small">
              <ChevronLeft />
            </IconButton>

            <Button
              variant="outlined"
              startIcon={<Today />}
              onClick={handleToday}
              size="small"
            >
              Today
            </Button>

            <IconButton onClick={handleNext} size="small">
              <ChevronRight />
            </IconButton>

            <Typography variant="h6" sx={{ ml: 2, minWidth: 200, textAlign: 'center' }}>
              {view === 'week' || view === 'crew' || view === 'equipment'
                ? `Week of ${format(dateRange.start, 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* Calendar View */}
      {view === 'week' && (
        <WeekView
          schedules={schedules || []}
          dateRange={dateRange}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      )}

      {view === 'month' && (
        <MonthView
          schedules={schedules || []}
          currentDate={currentDate}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      )}

      {view === 'crew' && (
        <CrewView
          organizationId={organizationId}
          schedules={schedules || []}
          dateRange={dateRange}
          getStatusColor={getStatusColor}
        />
      )}

      {view === 'equipment' && (
        <EquipmentView
          organizationId={organizationId}
          schedules={schedules || []}
          dateRange={dateRange}
          getStatusColor={getStatusColor}
        />
      )}

      {/* Schedule Wizard Modal */}
      <ScheduleWizardDialog
        open={scheduleWizardOpen}
        onClose={() => setScheduleWizardOpen(false)}
        organizationId={organizationId}
      />
    </Box>
  );
}

// ============================================================================
// WEEK VIEW
// ============================================================================

interface WeekViewProps {
  schedules: any[];
  dateRange: { start: Date; end: Date };
  getStatusColor: (status: string) => any;
  getStatusIcon: (status: string) => React.ReactNode;
}

function WeekView({ schedules, dateRange, getStatusColor, getStatusIcon }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(dateRange.start, i));

  const getSchedulesForDay = (day: Date) => {
    return schedules.filter((schedule) => {
      const scheduleStart = new Date(schedule.scheduledStartDate);
      const scheduleEnd = new Date(schedule.scheduledEndDate);
      return day >= scheduleStart && day <= scheduleEnd;
    });
  };

  return (
    <Grid container spacing={1}>
      {days.map((day) => {
        const daySchedules = getSchedulesForDay(day);
        const isToday = isSameDay(day, new Date());

        return (
          <Grid item xs={12} md={6} lg={12 / 7} key={day.toString()}>
            <Card
              sx={{
                height: '100%',
                minHeight: 300,
                bgcolor: isToday ? 'action.hover' : 'background.paper',
                border: isToday ? '2px solid' : '1px solid',
                borderColor: isToday ? 'primary.main' : 'divider',
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {format(day, 'EEE, MMM d')}
                  {isToday && (
                    <Chip
                      label="Today"
                      size="small"
                      color="primary"
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </Typography>

                <Stack spacing={1}>
                  {daySchedules.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No scheduled work
                    </Typography>
                  ) : (
                    daySchedules.map((schedule) => (
                      <Paper
                        key={schedule._id}
                        sx={{
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getStatusIcon(schedule.status)}
                          <Typography variant="caption" sx={{ flex: 1 }}>
                            WO-{schedule.workOrderId.slice(-4)}
                          </Typography>
                        </Stack>
                        <Chip
                          label={schedule.status}
                          size="small"
                          color={getStatusColor(schedule.status)}
                          sx={{ mt: 0.5 }}
                        />
                      </Paper>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

// ============================================================================
// MONTH VIEW
// ============================================================================

interface MonthViewProps {
  schedules: any[];
  currentDate: Date;
  getStatusColor: (status: string) => any;
  getStatusIcon: (status: string) => React.ReactNode;
}

function MonthView({ schedules, currentDate, getStatusColor, getStatusIcon }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = addDays(startOfWeek(monthEnd), 6);

  const weeks = [];
  let currentWeek = [];
  let day = startDate;

  while (day <= endDate) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    day = addDays(day, 1);
  }

  const getSchedulesForDay = (day: Date) => {
    return schedules.filter((schedule) => {
      const scheduleStart = new Date(schedule.scheduledStartDate);
      const scheduleEnd = new Date(schedule.scheduledEndDate);
      return day >= scheduleStart && day <= scheduleEnd;
    });
  };

  return (
    <Box>
      {/* Day Headers */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <Grid item xs={12 / 7} key={dayName}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', textAlign: 'center' }}>
              {dayName}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Grid */}
      {weeks.map((week, weekIndex) => (
        <Grid container spacing={1} key={weekIndex} sx={{ mb: 1 }}>
          {week.map((day) => {
            const daySchedules = getSchedulesForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <Grid item xs={12 / 7} key={day.toString()}>
                <Card
                  sx={{
                    height: 100,
                    bgcolor: isToday ? 'action.hover' : 'background.paper',
                    border: isToday ? '2px solid' : '1px solid',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    opacity: isCurrentMonth ? 1 : 0.5,
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" sx={{ fontWeight: isToday ? 700 : 400 }}>
                      {format(day, 'd')}
                    </Typography>

                    {daySchedules.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={daySchedules.length}
                          size="small"
                          color="primary"
                          sx={{ height: 16, fontSize: '0.65rem' }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ))}
    </Box>
  );
}

// ============================================================================
// CREW VIEW
// ============================================================================

interface CrewViewProps {
  organizationId: string;
  schedules: any[];
  dateRange: { start: Date; end: Date };
  getStatusColor: (status: string) => any;
}

function CrewView({ organizationId, schedules, dateRange, getStatusColor }: CrewViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(dateRange.start, i));

  // Fetch all users (crew members)
  const users = useQuery(api.users.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  const getSchedulesForCrewAndDay = (crewId: string, day: Date) => {
    return schedules.filter((schedule) => {
      const scheduleStart = new Date(schedule.scheduledStartDate);
      const scheduleEnd = new Date(schedule.scheduledEndDate);
      return (
        schedule.assignedCrewIds.includes(crewId) &&
        day >= scheduleStart &&
        day <= scheduleEnd
      );
    });
  };

  if (!users) return <Typography>Loading crew...</Typography>;

  return (
    <Box>
      {users.map((user) => (
        <Card key={user._id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              {user.name} - {user.role}
            </Typography>

            <Grid container spacing={1}>
              {days.map((day) => {
                const daySchedules = getSchedulesForCrewAndDay(user._id, day);
                const isToday = isSameDay(day, new Date());

                return (
                  <Grid item xs={12 / 7} key={day.toString()}>
                    <Paper
                      sx={{
                        p: 1,
                        height: 80,
                        bgcolor: isToday ? 'action.hover' : 'background.default',
                        border: isToday ? '2px solid' : '1px solid',
                        borderColor: isToday ? 'primary.main' : 'divider',
                      }}
                    >
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1 }}>
                        {format(day, 'EEE d')}
                      </Typography>

                      {daySchedules.length > 0 ? (
                        <Chip
                          label={`${daySchedules.length} jobs`}
                          size="small"
                          color={getStatusColor(daySchedules[0].status)}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Available
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// ============================================================================
// EQUIPMENT VIEW
// ============================================================================

interface EquipmentViewProps {
  organizationId: string;
  schedules: any[];
  dateRange: { start: Date; end: Date };
  getStatusColor: (status: string) => any;
}

function EquipmentView({ organizationId, schedules, dateRange, getStatusColor }: EquipmentViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(dateRange.start, i));

  // Fetch all equipment
  const equipment = useQuery(api.equipment.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  const getSchedulesForEquipmentAndDay = (equipmentId: string, day: Date) => {
    return schedules.filter((schedule) => {
      const scheduleStart = new Date(schedule.scheduledStartDate);
      const scheduleEnd = new Date(schedule.scheduledEndDate);
      return (
        schedule.assignedEquipmentIds.includes(equipmentId) &&
        day >= scheduleStart &&
        day <= scheduleEnd
      );
    });
  };

  if (!equipment) return <Typography>Loading equipment...</Typography>;

  // Filter active equipment only
  const activeEquipment = equipment.filter((eq) => eq.status === 'active');

  return (
    <Box>
      {activeEquipment.map((eq) => (
        <Card key={eq._id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              {eq.name} - {eq.category}
            </Typography>

            <Grid container spacing={1}>
              {days.map((day) => {
                const daySchedules = getSchedulesForEquipmentAndDay(eq._id, day);
                const isToday = isSameDay(day, new Date());

                return (
                  <Grid item xs={12 / 7} key={day.toString()}>
                    <Paper
                      sx={{
                        p: 1,
                        height: 80,
                        bgcolor: isToday ? 'action.hover' : 'background.default',
                        border: isToday ? '2px solid' : '1px solid',
                        borderColor: isToday ? 'primary.main' : 'divider',
                      }}
                    >
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1 }}>
                        {format(day, 'EEE d')}
                      </Typography>

                      {daySchedules.length > 0 ? (
                        <Chip
                          label={`${daySchedules.length} jobs`}
                          size="small"
                          color={getStatusColor(daySchedules[0].status)}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Available
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// ============================================================================
// SCHEDULE WIZARD DIALOG
// ============================================================================

interface ScheduleWizardDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

function ScheduleWizardDialog({ open, onClose, organizationId }: ScheduleWizardDialogProps) {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const createSchedule = useMutation(api.scheduling.createSchedule);

  const workOrders = useQuery(api.workOrders.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  const users = useQuery(api.users.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  const equipment = useQuery(api.equipment.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  const handleCreate = async () => {
    if (!selectedWorkOrder || selectedCrew.length === 0 || selectedEquipment.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const workOrder = workOrders?.find((wo) => wo._id === selectedWorkOrder);
    if (!workOrder) return;

    await createSchedule({
      organizationId: organizationId as Id<"organizations">,
      workOrderId: selectedWorkOrder as Id<"workOrders">,
      projectId: workOrder.projectId,
      scheduledStartDate: new Date(startDate).getTime(),
      assignedCrewIds: selectedCrew as Id<"users">[],
      assignedEquipmentIds: selectedEquipment as Id<"equipment">[],
    });

    onClose();
  };

  // Filter unscheduled work orders
  const unscheduledWorkOrders = workOrders?.filter((wo) => wo.status === 'scheduled') || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Schedule Work Order</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            select
            label="Work Order"
            value={selectedWorkOrder}
            onChange={(e) => setSelectedWorkOrder(e.target.value)}
            fullWidth
            required
          >
            {unscheduledWorkOrders.map((wo) => (
              <MenuItem key={wo._id} value={wo._id}>
                WO-{wo._id.slice(-4)} - {wo.serviceType} ({wo.estimatedTotalHours}h)
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Assign Crew *
            </Typography>
            <Grid container spacing={1}>
              {users?.map((user) => (
                <Grid item xs={6} key={user._id}>
                  <Chip
                    label={user.name}
                    onClick={() => {
                      setSelectedCrew((prev) =>
                        prev.includes(user._id)
                          ? prev.filter((id) => id !== user._id)
                          : [...prev, user._id]
                      );
                    }}
                    color={selectedCrew.includes(user._id) ? 'primary' : 'default'}
                    variant={selectedCrew.includes(user._id) ? 'filled' : 'outlined'}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Assign Equipment *
            </Typography>
            <Grid container spacing={1}>
              {equipment?.filter((eq) => eq.status === 'active').map((eq) => (
                <Grid item xs={6} key={eq._id}>
                  <Chip
                    label={eq.name}
                    onClick={() => {
                      setSelectedEquipment((prev) =>
                        prev.includes(eq._id)
                          ? prev.filter((id) => id !== eq._id)
                          : [...prev, eq._id]
                      );
                    }}
                    color={selectedEquipment.includes(eq._id) ? 'primary' : 'default'}
                    variant={selectedEquipment.includes(eq._id) ? 'filled' : 'outlined'}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" color="primary">
          Create Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
}
