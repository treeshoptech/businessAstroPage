import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  ListItemText,
  Divider,
  ListItemIcon,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import AppDrawer from './AppDrawer';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  currentPath?: string;
  organizationId?: string;
}

export default function AppLayout({
  children,
  title = 'TreeShop',
  currentPath = '/',
  organizationId,
}: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  // TODO: Re-enable notifications once events:list is deployed
  const recentEvents: any[] = [];
  const notificationCount = 0;

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotifAnchor(null);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'proposal_sent':
      case 'proposal_accepted':
      case 'work_order_completed':
      case 'invoice_paid':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'project_created':
      case 'customer_added':
        return <InfoIcon fontSize="small" color="info" />;
      case 'equipment_maintenance':
      case 'invoice_overdue':
        return <WarningIcon fontSize="small" color="warning" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const formatEventMessage = (event: any) => {
    const descriptions: Record<string, string> = {
      'proposal_sent': 'Proposal sent',
      'proposal_accepted': 'Proposal accepted',
      'work_order_completed': 'Work order completed',
      'invoice_paid': 'Invoice paid',
      'project_created': 'New project created',
      'customer_added': 'New customer added',
      'equipment_maintenance': 'Equipment maintenance due',
      'invoice_overdue': 'Invoice overdue',
    };
    return descriptions[event.type] || event.type.replace(/_/g, ' ');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top App Bar */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: '#0a0a0a',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
            {title}
          </Typography>

          <IconButton
            color="inherit"
            sx={{ mr: 1 }}
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton
            color="inherit"
            edge="end"
            onClick={handleDrawerToggle}
            aria-label="open drawer"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 360,
            bgcolor: 'background.paper',
          },
        }}
      >
        {recentEvents.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="No recent notifications" />
          </MenuItem>
        ) : (
          recentEvents.map((event) => (
            <React.Fragment key={event._id}>
              <MenuItem onClick={handleNotificationClose}>
                <ListItemIcon>
                  {getEventIcon(event.type)}
                </ListItemIcon>
                <ListItemText
                  primary={formatEventMessage(event)}
                  secondary={new Date(event.timestamp).toLocaleString()}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>
              <Divider />
            </React.Fragment>
          ))
        )}
      </Menu>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: isMobile ? 2 : 3,
          bgcolor: '#000',
        }}
      >
        {children}
      </Box>

      {/* Right Drawer */}
      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentPath={currentPath}
      />
    </Box>
  );
}
