import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import MapDashboard from './Map/MapDashboard';

interface HomePageProps {
  googleMapsApiKey?: string;
  organization?: {
    id: string;
    name: string;
  };
}

export default function HomePage({ googleMapsApiKey, organization }: HomePageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Dashboard"
          currentPath="/"
          organizationId={organization?.id}
        >
          <Box sx={{ height: '600px' }}>
            <MapDashboard apiKey={googleMapsApiKey} organizationId={organization?.id} />
          </Box>
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
