import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import RightDrawerNavigation from './RightDrawerNavigation';

interface AppShellProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 320;

export default function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Top AppBar - Only visible on mobile */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: 'background.paper',
          }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main' }}>
              TreeShop
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={toggleDrawer}
              aria-label="menu"
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content Area - Map Dashboard */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden',
          marginTop: isMobile ? '64px' : 0,
        }}
      >
        {children}
      </Box>

      {/* Right Drawer Navigation */}
      <Drawer
        anchor="right"
        open={drawerOpen || !isMobile}
        onClose={toggleDrawer}
        variant={isMobile ? 'temporary' : 'permanent'}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <RightDrawerNavigation onNavigate={() => isMobile && setDrawerOpen(false)} />
      </Drawer>
    </Box>
  );
}
