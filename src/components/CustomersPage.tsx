import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import CustomerDirectory from './Customers/CustomerDirectory';

interface CustomersPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

export default function CustomersPage({ organization }: CustomersPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Customers"
          currentPath="/customers"
          organizationId={organization?.id}
        >
          <CustomerDirectory organizationId={organization?.id || ''} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
