import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConvexClientProvider from './ConvexClientProvider';
import { treeshopTheme } from '../lib/theme';
import AppLayout from './Navigation/AppLayout';
import ProjectsPipeline from './Projects/ProjectsPipeline';

interface ProjectsPageProps {
  organization?: {
    id: string;
    name: string;
  };
}

export default function ProjectsPage({ organization }: ProjectsPageProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <AppLayout
          title="Projects"
          currentPath="/projects"
          organizationId={organization?.id}
        >
          <ProjectsPipeline organizationId={organization?.id || ''} />
        </AppLayout>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
