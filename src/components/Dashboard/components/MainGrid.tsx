import Box from '@mui/material/Box';
import MapDashboard from '../../Map/MapDashboard';

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
      }}
    >
      {/* Map Dashboard - Full height */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <MapDashboard apiKey={apiKey} />
      </Box>
    </Box>
  );
}
