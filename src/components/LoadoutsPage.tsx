import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import LoadoutDirectory from './Loadouts/LoadoutDirectory';

interface LoadoutsPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

export default function LoadoutsPage({ organization }: LoadoutsPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Loadouts"
          currentPath="/loadouts"
          organizationId={organization?.id}
        >
          <LoadoutDirectory organizationId={organization?.id || ''} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
