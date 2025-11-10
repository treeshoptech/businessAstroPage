import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import InvoicesView from './Invoices/InvoicesView';

interface InvoicesPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

export default function InvoicesPage({ organization }: InvoicesPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Invoices"
          currentPath="/invoices"
          organizationId={organization?.id}
        >
          <InvoicesView organizationId={organization?.id || ''} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
