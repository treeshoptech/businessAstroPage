import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import EmployeeDirectory from './Employees/EmployeeDirectory';

interface EmployeesPageProps {
  organization?: {
    id: string;
    name: string;
  };
  userRole?: string;
}

export default function EmployeesPage({ organization, userRole = 'owner' }: EmployeesPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Employees"
          currentPath="/employees"
          organizationId={organization?.id}
        >
          <EmployeeDirectory organizationId={organization?.id || ''} currentUserRole={userRole} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
