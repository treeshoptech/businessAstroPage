import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Badge,
  Collapse,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MapIcon from '@mui/icons-material/Map';
import TimelineIcon from '@mui/icons-material/Timeline';
import FolderIcon from '@mui/icons-material/Folder';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BarChartIcon from '@mui/icons-material/BarChart';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import SupportIcon from '@mui/icons-material/Support';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  currentPath?: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  expandable?: boolean;
  items?: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  badge?: number;
  expandable?: boolean;
  items?: NavItem[];
}

export default function AppDrawer({ open, onClose, currentPath = '/' }: AppDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Navigation structure
  const primaryNav: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/app/dashboard',
    },
    {
      id: 'map',
      label: 'Map View',
      path: '/app/map',
    },
  ];

  const sections: NavSection[] = [
    {
      id: 'pipeline',
      label: 'PIPELINE',
      icon: <TimelineIcon />,
      badge: 12,
      expandable: true,
      items: [
        { id: 'leads', label: 'Leads', path: '/app/pipeline/leads', badge: 12 },
        { id: 'proposals', label: 'Proposals', path: '/app/pipeline/proposals', badge: 8 },
        { id: 'work-orders', label: 'Work Orders', path: '/app/pipeline/work-orders', badge: 5 },
        { id: 'invoices', label: 'Invoices', path: '/app/pipeline/invoices', badge: 3 },
      ],
    },
    {
      id: 'directories',
      label: 'DIRECTORIES',
      icon: <FolderIcon />,
      badge: 142,
      expandable: true,
      items: [
        { id: 'customers', label: 'Customers', path: '/app/directories/customers', badge: 142 },
        { id: 'equipment', label: 'Equipment', path: '/app/directories/equipment', badge: 8 },
        { id: 'employees', label: 'Employees', path: '/app/directories/employees', badge: 6 },
        { id: 'loadouts', label: 'Loadouts', path: '/app/directories/loadouts', badge: 5 },
      ],
    },
    {
      id: 'pricing',
      label: 'PRICING',
      icon: <AttachMoneyIcon />,
      expandable: true,
      items: [
        {
          id: 'calculators',
          label: 'Calculators',
          path: '/app/pricing/calculators',
          expandable: true,
          items: [
            { id: 'mulching', label: 'Forestry Mulching', path: '/app/pricing/calculators/mulching' },
            { id: 'stump', label: 'Stump Grinding', path: '/app/pricing/calculators/stump-grinding' },
            { id: 'land', label: 'Land Clearing', path: '/app/pricing/calculators/land-clearing' },
            { id: 'removal', label: 'Tree Removal', path: '/app/pricing/calculators/tree-removal' },
            { id: 'trimming', label: 'Tree Trimming', path: '/app/pricing/calculators/tree-trimming' },
          ],
        },
        { id: 'line-items', label: 'Line Items', path: '/app/pricing/line-items', badge: 5 },
        { id: 'afiss', label: 'AFISS Factors', path: '/app/pricing/afiss', badge: 80 },
        { id: 'history', label: 'Pricing History', path: '/app/pricing/history' },
      ],
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      icon: <BarChartIcon />,
      badge: 3,
      expandable: true,
      items: [
        {
          id: 'reports',
          label: 'Reports',
          path: '/app/analytics/reports',
          expandable: true,
          items: [
            { id: 'financial', label: 'Financial Reports', path: '/app/analytics/reports/financial' },
            { id: 'operational', label: 'Operational Reports', path: '/app/analytics/reports/operational' },
            { id: 'assets', label: 'Asset Reports', path: '/app/analytics/reports/assets' },
            { id: 'customers', label: 'Customer Reports', path: '/app/analytics/reports/customers' },
            { id: 'services', label: 'Service Reports', path: '/app/analytics/reports/services' },
            { id: 'custom', label: 'Custom Builder', path: '/app/analytics/reports/custom' },
            { id: 'saved', label: 'Saved Reports', path: '/app/analytics/reports/saved' },
          ],
        },
        { id: 'performance', label: 'Performance', path: '/app/analytics/performance' },
        { id: 'kpis', label: 'KPIs', path: '/app/analytics/kpis' },
        { id: 'alerts', label: 'Alerts', path: '/app/analytics/alerts', badge: 3 },
      ],
    },
    {
      id: 'operations',
      label: 'OPERATIONS',
      icon: <BuildIcon />,
      badge: 2,
      expandable: true,
      items: [
        { id: 'time-tracking', label: 'Time Tracking', path: '/app/operations/time-tracking', badge: 2 },
        { id: 'photos', label: 'Photo Gallery', path: '/app/operations/photos' },
        { id: 'logs', label: 'Daily Logs', path: '/app/operations/logs' },
        { id: 'schedule', label: 'Schedule', path: '/app/operations/schedule' },
      ],
    },
  ];

  const secondaryNav: NavItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      path: '/app/settings',
    },
    {
      id: 'help',
      label: 'Help & Docs',
      path: '/app/help',
    },
    {
      id: 'support',
      label: 'Support',
      path: '/app/support',
    },
  ];

  const handleToggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleNavigate = (path: string) => {
    window.location.href = path;
    if (isMobile) {
      onClose();
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const isExpanded = expandedSections.includes(item.id);
    const isActive = currentPath === item.path;
    const hasSubItems = item.items && item.items.length > 0;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ pl: depth * 2 }}>
          <ListItemButton
            onClick={() =>
              hasSubItems ? handleToggleSection(item.id) : handleNavigate(item.path)
            }
            sx={{
              minHeight: isMobile ? 60 : 56,
              bgcolor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? '#000' : 'inherit',
              '&:hover': {
                bgcolor: isActive ? 'primary.main' : 'rgba(255,255,255,0.05)',
              },
              '&:active': {
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: depth > 0 ? '0.875rem' : '1rem',
                fontWeight: depth > 0 ? 400 : 500,
              }}
            />
            {item.badge !== undefined && (
              <Badge
                badgeContent={item.badge}
                color="primary"
                sx={{ mr: 1 }}
              />
            )}
            {hasSubItems ? (
              isExpanded ? (
                <ExpandLessIcon />
              ) : (
                <ExpandMoreIcon />
              )
            ) : (
              <ChevronRightIcon sx={{ opacity: 0.5 }} />
            )}
          </ListItemButton>
        </ListItem>

        {hasSubItems && (
          <Collapse in={isExpanded} timeout={200}>
            <List disablePadding>
              {item.items!.map((subItem) => renderNavItem(subItem, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const renderSection = (section: NavSection) => {
    const isExpanded = expandedSections.includes(section.id);

    return (
      <React.Fragment key={section.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleToggleSection(section.id)}
            sx={{
              minHeight: isMobile ? 60 : 56,
              '&:active': {
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              {section.icon}
            </ListItemIcon>
            <ListItemText
              primary={section.label}
              primaryTypographyProps={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                color: 'text.secondary',
              }}
            />
            {section.badge !== undefined && (
              <Badge
                badgeContent={section.badge}
                color="default"
                sx={{ mr: 1 }}
              />
            )}
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
        </ListItem>

        <Collapse in={isExpanded} timeout={200}>
          <List disablePadding>
            {section.items?.map((item) => renderNavItem(item, 0))}
          </List>
        </Collapse>
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          TreeShop
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Primary Navigation */}
      <List sx={{ pt: 2 }}>
        {primaryNav.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              sx={{
                minHeight: isMobile ? 60 : 56,
                bgcolor: currentPath === item.path ? 'primary.main' : 'transparent',
                color: currentPath === item.path ? '#000' : 'inherit',
                '&:hover': {
                  bgcolor:
                    currentPath === item.path ? 'primary.main' : 'rgba(255,255,255,0.05)',
                },
                '&:active': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.id === 'dashboard' ? <DashboardIcon /> : <MapIcon />}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Expandable Sections */}
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {sections.map((section) => renderSection(section))}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Secondary Navigation */}
      <List>
        {secondaryNav.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              sx={{
                minHeight: isMobile ? 60 : 56,
                '&:active': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.id === 'settings' ? (
                  <SettingsIcon />
                ) : item.id === 'help' ? (
                  <HelpIcon />
                ) : (
                  <SupportIcon />
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* User Menu */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.05)',
          },
          '&:active': {
            bgcolor: 'rgba(255,255,255,0.1)',
          },
        }}
        onClick={handleUserMenuOpen}
      >
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: '#000' }}>
          JS
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            John Smith
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            TreeShop Co • Owner
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <MoreVertIcon />
        </IconButton>
      </Box>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            minWidth: 200,
          },
        }}
      >
        <MenuItem onClick={() => handleNavigate('/app/settings/profile')}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/app/analytics/performance')}>
          <ListItemIcon>
            <BarChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My Performance</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/app/settings/notifications')}>
          <ListItemIcon>
            <NotificationsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Notifications</ListItemText>
          <Badge badgeContent={5} color="error" sx={{ ml: 2 }} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => (window.location.href = '/logout')}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '60%' : 300,
          maxWidth: isMobile ? 400 : 300,
          bgcolor: '#0a0a0a',
          backgroundImage: 'none',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
