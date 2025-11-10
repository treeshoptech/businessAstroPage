import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MapDashboard from './Map/MapDashboard';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';

// Lazy load components that use Convex to prevent SSR issues
const SettingsContent = React.lazy(() => import('./Settings/SettingsContent'));
const EmployeeDirectory = React.lazy(() => import('./Employees/EmployeeDirectory'));
const CustomerDirectory = React.lazy(() => import('./Customers/CustomerDirectory'));
const LoadoutDirectory = React.lazy(() => import('./Loadouts/LoadoutDirectory'));
const EquipmentDirectory = React.lazy(() => import('./Equipment/EquipmentDirectory'));
const PricingCalculator = React.lazy(() => import('./Pricing/PricingCalculator'));
const ExecutiveDashboard = React.lazy(() => import('./Analytics/ExecutiveDashboard'));

// Line Items
const LineItemsView = React.lazy(() => import('./LineItems/LineItemsView'));

// Schedule
const ScheduleView = React.lazy(() => import('./Schedule/ScheduleView'));

// Workflow components (to be created)
const LeadsView = React.lazy(() => import('./Leads/LeadsView'));
const ProposalsView = React.lazy(() => import('./Proposals/ProposalsView'));
const WorkOrdersView = React.lazy(() => import('./WorkOrders/WorkOrdersView'));
const InvoicesView = React.lazy(() => import('./Invoices/InvoicesView'));

interface SimpleDashboardProps {
  googleMapsApiKey?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  currentPage?: string;
}

export default function SimpleDashboard({
  googleMapsApiKey,
  user,
  organization,
  currentPage = 'dashboard'
}: SimpleDashboardProps) {

  const getPageTitle = () => {
    switch (currentPage) {
      case 'settings': return 'Settings';
      case 'employees': return 'Employees';
      case 'equipment': return 'Equipment';
      case 'loadouts': return 'Loadouts';
      case 'customers': return 'Customers';
      case 'leads': return 'Leads';
      case 'proposals': return 'Proposals';
      case 'work-orders': return 'Work Orders';
      case 'invoices': return 'Invoices';
      case 'pricing': return 'Pricing';
      case 'line-items': return 'Line Items Library';
      case 'schedule': return 'Schedule';
      case 'analytics': return 'Analytics';
      default: return 'Dashboard';
    }
  };

  const renderPageContent = () => {
    return (
      <React.Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography>Loading...</Typography>
        </Box>
      }>
        {currentPage === 'settings' ? (
          <SettingsContent user={user!} organizationId={organization?.id || ''} />
        ) : currentPage === 'employees' ? (
          <EmployeeDirectory organizationId={organization?.id || ''} currentUserRole={user?.role || ''} />
        ) : currentPage === 'equipment' ? (
          <EquipmentDirectory organizationId={organization?.id || ''} />
        ) : currentPage === 'loadouts' ? (
          <LoadoutDirectory organizationId={organization?.id || ''} />
        ) : currentPage === 'customers' ? (
          <CustomerDirectory organizationId={organization?.id || ''} />
        ) : currentPage === 'pricing' ? (
          <PricingCalculator organizationId={organization?.id || ''} />
        ) : currentPage === 'line-items' ? (
          <LineItemsView organizationId={organization?.id || ''} />
        ) : currentPage === 'schedule' ? (
          <ScheduleView organizationId={organization?.id || ''} />
        ) : currentPage === 'leads' ? (
          <LeadsView organizationId={organization?.id || ''} />
        ) : currentPage === 'proposals' ? (
          <ProposalsView organizationId={organization?.id || ''} />
        ) : currentPage === 'work-orders' ? (
          <WorkOrdersView organizationId={organization?.id || ''} />
        ) : currentPage === 'invoices' ? (
          <InvoicesView organizationId={organization?.id || ''} />
        ) : currentPage === 'analytics' ? (
          <ExecutiveDashboard organizationId={organization?.id || ''} />
        ) : (
          <MapDashboard apiKey={googleMapsApiKey} organizationId={organization?.id} />
        )}
      </React.Suspense>
    );
  };

  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout title={getPageTitle()} currentPath={`/${currentPage}`}>
          {renderPageContent()}
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
