import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import LeadsView from './Leads/LeadsView';

interface LeadsPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

export default function LeadsPage({ organization }: LeadsPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Leads"
          currentPath="/leads"
          organizationId={organization?.id}
        >
          <LeadsView organizationId={organization?.id || ''} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
