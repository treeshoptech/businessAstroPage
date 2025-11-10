import React, { Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import ProposalsView from './Proposals/ProposalsView';

interface ProposalsPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function ProposalsPage({ organization }: ProposalsPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <Suspense fallback={<LoadingFallback />}>
          <AppLayout
            title="Proposals"
            currentPath="/proposals"
            organizationId={organization?.id}
          >
            <ProposalsView organizationId={organization?.id || ''} />
          </AppLayout>
        </Suspense>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
