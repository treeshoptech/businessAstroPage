import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface ExecutiveDashboardProps {
  organizationId: string;
}

export default function ExecutiveDashboard({ organizationId }: ExecutiveDashboardProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { startDate: start.getTime(), endDate: end.getTime() };
  }, [timeRange]);

  // Fetch KPIs
  const kpis = useQuery(api.analytics.calculateKPIs, {
    organizationId: organizationId as Id<"organizations">,
    startDate,
    endDate,
  });

  // Fetch latest snapshot for comparison
  const latestSnapshot = useQuery(api.analytics.getLatestSnapshot, {
    organizationId: organizationId as Id<"organizations">,
    period: "daily",
  });

  // Fetch recent events for activity feed
  const recentEvents = useQuery(api.events.getRecent, {
    organizationId: organizationId as Id<"organizations">,
    limit: 10,
  });

  if (!kpis) {
    return <LinearProgress />;
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Render KPI card
  const renderKPICard = (
    title: string,
    value: string | number,
    subtitle?: string,
    trend?: number,
    icon?: React.ReactNode
  ) => (
    <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
              {title}
            </Typography>
          </Box>
          {icon && (
            <Box sx={{ color: 'primary.main', opacity: 0.8 }}>
              {icon}
            </Box>
          )}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}

        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            {trend >= 0 ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />
            )}
            <Typography
              variant="caption"
              sx={{
                color: trend >= 0 ? '#10b981' : '#ef4444',
                fontWeight: 600,
              }}
            >
              {trend >= 0 ? '+' : ''}{formatPercent(trend)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              vs previous period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Executive Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Real-time business intelligence and performance metrics
          </Typography>
        </Box>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            label="Time Range"
          >
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
            <MenuItem value="quarter">Last Quarter</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPI Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderKPICard(
            'Total Revenue',
            formatCurrency(kpis.totalRevenue),
            `${kpis.proposalsWon} projects`,
            undefined,
            <AttachMoneyIcon />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderKPICard(
            'Close Rate',
            formatPercent(kpis.closeRate),
            `${kpis.proposalsWon} of ${kpis.proposalsSent} sent`,
            undefined,
            <CheckCircleIcon />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderKPICard(
            'Avg Proposal Value',
            formatCurrency(kpis.averageProposalValue),
            'per signed proposal',
            undefined,
            <DescriptionIcon />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {renderKPICard(
            'New Customers',
            kpis.newCustomers,
            'in selected period',
            undefined,
            <PeopleIcon />
          )}
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Proposal Pipeline
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Proposals Created</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {kpis.proposalsCreated}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Proposals Sent</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {kpis.proposalsSent}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={kpis.proposalsCreated > 0 ? (kpis.proposalsSent / kpis.proposalsCreated) * 100 : 0}
                    sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#10b981' }}>
                      Proposals Won
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                      {kpis.proposalsWon}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={kpis.proposalsSent > 0 ? (kpis.proposalsWon / kpis.proposalsSent) * 100 : 0}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#10b981' },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#ef4444' }}>
                      Proposals Lost
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>
                      {kpis.proposalsLost}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={kpis.proposalsSent > 0 ? (kpis.proposalsLost / kpis.proposalsSent) * 100 : 0}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#ef4444' },
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Recent Activity
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflow: 'auto' }}>
                {recentEvents && recentEvents.length > 0 ? (
                  recentEvents.map((event) => (
                    <Box
                      key={event._id}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        pb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none', pb: 0 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: event.eventType.includes('signed') || event.eventType.includes('paid')
                            ? '#10b981'
                            : event.eventType.includes('rejected') || event.eventType.includes('overdue')
                            ? '#ef4444'
                            : 'primary.main',
                          mt: 0.75,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(event.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={event.source}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.05)',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    No recent activity
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Work Orders */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Completed Work Orders
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {kpis.workOrdersCompleted}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                in selected period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Quick Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    Proposals per Day
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {(kpis.proposalsCreated / 30).toFixed(1)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    Revenue per Project
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {formatCurrency(kpis.averageProposalValue)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
