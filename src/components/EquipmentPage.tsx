import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import EquipmentDirectory from './Equipment/EquipmentDirectory';

interface EquipmentPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

export default function EquipmentPage({ organization }: EquipmentPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Equipment"
          currentPath="/equipment"
          organizationId={organization?.id}
        >
          <EquipmentDirectory organizationId={organization?.id || ''} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
