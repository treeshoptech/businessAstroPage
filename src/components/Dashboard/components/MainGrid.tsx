import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import MapDashboard from '../../Map/MapDashboard';
import StatCard from './StatCard';

interface MainGridProps {
  apiKey?: string;
}

export default function MainGrid({ apiKey }: MainGridProps) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { sm: '100%', md: '1700px' },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* Map Dashboard */}
      <Box sx={{ height: '600px' }}>
        <MapDashboard apiKey={apiKey} />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Active Projects"
            value="24"
            interval="This month"
            trend="up"
            data={[200, 300, 400, 500, 600, 700, 800]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Total Revenue"
            value="$48,250"
            interval="This month"
            trend="up"
            data={[10000, 15000, 25000, 35000, 40000, 45000, 48250]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Close Rate"
            value="72%"
            interval="Last 30 days"
            trend="up"
            data={[65, 68, 70, 71, 69, 72, 72]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Avg Proposal"
            value="$8,450"
            interval="This quarter"
            trend="neutral"
            data={[7500, 8000, 8200, 8450, 8450, 8450, 8450]}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
