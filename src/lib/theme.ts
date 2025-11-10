import { createTheme } from '@mui/material/styles';

/**
 * TreeShop True Black Theme
 * Pure #000000 background for OLED optimization and professional aesthetic
 * Elevation hierarchy: #000000 → #0a0a0a → #141414
 */
export const treeshopTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4CAF50', // TreeShop green
      light: '#81C784',
      dark: '#388E3C',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#66BB6A', // Lighter green for accents
      light: '#81C784',
      dark: '#4CAF50',
    },
    background: {
      default: '#000000', // TRUE BLACK - OLED optimized
      paper: '#0a0a0a',   // Slightly elevated surfaces (cards, drawers)
    },
    text: {
      primary: '#ffffff',   // Pure white text
      secondary: '#b0b0b0', // Gray for secondary text
      disabled: '#666666',  // Disabled elements
    },
    divider: '#1a1a1a', // Subtle dividers and borders
    error: {
      main: '#f44336', // Red for errors/warnings
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ff9800', // Orange for proposals pending
      light: '#ffa726',
      dark: '#f57c00',
    },
    success: {
      main: '#4CAF50', // Green (matches primary)
      light: '#66BB6A',
      dark: '#388E3C',
    },
    info: {
      main: '#2196f3', // Blue for invoices
      light: '#42a5f5',
      dark: '#1976d2',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000', // Force true black
          scrollbarColor: '#1a1a1a #000000', // Dark scrollbar
          scrollbarWidth: 'thin',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: '#000000',
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#1a1a1a',
          borderRadius: '4px',
          '&:hover': {
            background: '#2a2a2a',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove MUI's default gradient
          backgroundColor: '#0a0a0a', // Slightly elevated black
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#000000', // Drawer same as background
          borderRight: '1px solid #1a1a1a', // Subtle border
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          borderBottom: '1px solid #1a1a1a',
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a0a0a',
          backgroundImage: 'none',
          borderRadius: 12,
          border: '1px solid #1a1a1a',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          border: '1px solid #1a1a1a',
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#0a0a0a',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #1a1a1a',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#0a0a0a',
            borderBottom: '1px solid #1a1a1a',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#141414', // Modals more prominent
          backgroundImage: 'none',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0a0a0a',
          border: '1px solid #1a1a1a',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#1a1a1a',
        },
      },
    },
  },
});
