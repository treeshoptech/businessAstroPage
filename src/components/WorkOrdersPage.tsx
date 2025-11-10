import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import WorkOrdersView from './WorkOrders/WorkOrdersView';

interface WorkOrdersPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

export default function WorkOrdersPage({ organization }: WorkOrdersPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Work Orders"
          currentPath="/work-orders"
          organizationId={organization?.id}
        >
          <WorkOrdersView organizationId={organization?.id || ''} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
