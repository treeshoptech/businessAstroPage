# TreeShop Dashboard Component

This is an adapted version of the official Material-UI Dashboard template, customized for the TreeShop application with our treeshopTheme.

## Overview

The Dashboard component provides a complete responsive layout with:
- **Top AppNavbar** (mobile only) - Displays on mobile devices
- **Header** (desktop only) - Search, date picker, notifications, breadcrumbs
- **Right-side SideMenu** (desktop) - Navigation drawer positioned on the right
- **Right-side SideMenuMobile** (mobile) - Responsive drawer for mobile devices
- **MainGrid content area** - Currently shows placeholder for MapDashboard component
- **TreeShop True Black Theme** - #000000 OLED-optimized dark theme

## Installation

All required dependencies have been installed:
- `@mui/material`
- `@mui/icons-material`
- `@mui/x-charts`
- `@mui/x-data-grid`
- `@mui/x-tree-view`
- `@mui/x-date-pickers`
- `@emotion/react`
- `@emotion/styled`
- `dayjs`

## File Structure

```
Dashboard/
├── Dashboard.tsx              # Main component with theme integration
├── index.ts                   # Barrel exports for easy imports
├── components/
│   ├── AppNavbar.tsx         # Mobile-only top navigation bar
│   ├── Header.tsx            # Desktop header with search/notifications
│   ├── MainGrid.tsx          # Main content area (placeholder)
│   ├── SideMenu.tsx          # Right-side navigation drawer (desktop)
│   ├── SideMenuMobile.tsx    # Right-side navigation drawer (mobile)
│   ├── MenuButton.tsx        # Reusable button with badge support
│   ├── MenuContent.tsx       # Navigation menu items
│   ├── OptionsMenu.tsx       # User profile dropdown menu
│   ├── Search.tsx            # Search input component
│   ├── NavbarBreadcrumbs.tsx # Breadcrumb navigation
│   ├── SelectContent.tsx     # Project/company selector
│   ├── CustomDatePicker.tsx  # Custom styled date picker
│   └── CardAlert.tsx         # Alert/notification card
└── theme/
    └── customizations/
        ├── index.ts          # Barrel exports for theme customizations
        ├── charts.ts         # MUI X Charts customizations
        ├── datePickers.ts    # MUI X Date Pickers customizations
        └── treeView.ts       # MUI X Tree View customizations
```

## Usage

### Basic Usage in Astro

```astro
---
import { Dashboard } from '../components/Dashboard';
---

<Dashboard client:load />
```

### Usage in React

```tsx
import { Dashboard } from '@/components/Dashboard';

function App() {
  return <Dashboard />;
}
```

### Individual Component Imports

```tsx
import {
  Dashboard,
  Header,
  SideMenu,
  MainGrid
} from '@/components/Dashboard';
```

## Key Adaptations Made

### 1. Theme Integration
- **Original**: Used their custom AppTheme component
- **Adapted**: Integrated with our existing `treeshopTheme` from `src/lib/theme.ts`
- **Result**: Maintains TreeShop's true black (#000000) OLED-optimized design

### 2. Navigation Position
- **Original**: Left-side navigation drawer
- **Adapted**: Right-side navigation drawer (anchor="right")
- **Reason**: Prepares for future customization with TreeShop-specific navigation

### 3. Brand Identity
- **Original**: Generic "Dashboard" branding with blue gradient icon
- **Adapted**: "TreeShop" branding with Forest icon and green gradient
- **Icons**: Changed DashboardRoundedIcon to ForestIcon

### 4. Content Area
- **Original**: Full analytics dashboard with charts, data grids, stats
- **Adapted**: Clean placeholder that says "Map Dashboard goes here"
- **Reason**: Ready to integrate your MapDashboard component

### 5. Theme Customizations
- **Charts**: Dark mode optimized with gray color scheme
- **Date Pickers**: TreeShop green brand colors for selected dates
- **Tree View**: Subtle hover and selection states
- **Data Grid**: Already handled in main treeshopTheme

### 6. Import Paths
- **Original**: Used relative imports to `shared-theme` directory
- **Adapted**: All imports point to our project structure
- **No external dependencies**: Everything is self-contained

## Theme Customizations Applied

### Charts (from @mui/x-charts)
- Dark gray axes and grid lines
- True black tooltips with divider borders
- Rounded legend marks

### Date Pickers (from @mui/x-date-pickers)
- Dark paper background (#111827)
- TreeShop green selection highlights
- Focus states with brand-colored outlines

### Tree View (from @mui/x-tree-view)
- Subtle gray hover states
- Brand-colored focus indicators
- Left border for nested items

## Responsive Behavior

### Desktop (md and up)
- Right-side permanent drawer (240px width)
- Full header with search, date picker, notifications
- Breadcrumb navigation visible
- Content area flows to the left of the drawer

### Mobile (xs to md)
- AppNavbar at top with TreeShop branding
- Hamburger menu button opens right-side drawer
- Header hidden on mobile
- Full-width content area

## Next Steps

### Replace MainGrid Placeholder

Replace the placeholder in `components/MainGrid.tsx` with your actual content:

```tsx
// components/MainGrid.tsx
import { MapDashboard } from '@/components/Map/MapDashboard';

export default function MainGrid() {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { sm: '100%', md: '1700px' },
      }}
    >
      <MapDashboard />
    </Box>
  );
}
```

### Customize Navigation

Update `components/MenuContent.tsx` to match your app's navigation:

```tsx
const mainListItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
  { text: 'Customers', icon: <PeopleIcon />, href: '/customers' },
  { text: 'Projects', icon: <WorkIcon />, href: '/projects' },
  { text: 'Pricing', icon: <MoneyIcon />, href: '/pricing' },
];
```

### Add Authentication

Update the user profile section in `SideMenu.tsx` and `SideMenuMobile.tsx`:

```tsx
// Get user data from your auth provider
const user = useAuth();

<Avatar
  sizes="small"
  alt={user.name}
  src={user.avatar}
  sx={{ width: 36, height: 36 }}
/>
<Typography variant="body2">
  {user.name}
</Typography>
<Typography variant="caption">
  {user.email}
</Typography>
```

### Integrate with Routing

If using Astro routing, update navigation items to use Astro's `<a>` tags or your router:

```tsx
<ListItemButton component="a" href="/dashboard">
  <ListItemIcon><HomeIcon /></ListItemIcon>
  <ListItemText primary="Dashboard" />
</ListItemButton>
```

## TypeScript Types

All components are fully typed with TypeScript:
- Proper interface definitions for props
- MUI theme augmentation for X components
- Type-safe component composition

## Testing the Dashboard

Visit `/dashboard-demo` in your browser to see the dashboard in action:

```bash
npm run dev
# Navigate to http://localhost:4321/dashboard-demo
```

## Performance Notes

- All MUI components are tree-shakeable
- Emotion CSS-in-JS for optimal runtime performance
- Theme customizations are merged at build time
- No runtime theme switching overhead

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design works on all screen sizes
- OLED-optimized true black theme for mobile devices

## Credits

- Original template: [Material-UI Dashboard](https://github.com/mui/material-ui/tree/master/docs/data/material/getting-started/templates/dashboard)
- Adapted for TreeShop by Claude Code
- Theme integration with TreeShop True Black Theme
- Customized for TreeShop application requirements
