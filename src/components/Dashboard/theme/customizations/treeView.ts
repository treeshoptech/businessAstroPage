import { alpha, Theme } from '@mui/material/styles';
import { treeItemClasses } from '@mui/x-tree-view/TreeItem';
import type { TreeViewComponents } from '@mui/x-tree-view/themeAugmentation';

const gray = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
};

const brand = {
  50: '#e8f5e9',
  100: '#c8e6c9',
  200: '#a5d6a7',
  300: '#81c784',
  400: '#66bb6a',
  500: '#4caf50',
  600: '#43a047',
  700: '#388e3c',
  800: '#2e7d32',
  900: '#1b5e20',
};

export const treeViewCustomizations: TreeViewComponents<Theme> = {
  MuiTreeItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        position: 'relative',
        [`& .${treeItemClasses.groupTransition}`]: {
          marginLeft: theme.spacing(3.5),
          paddingLeft: theme.spacing(2),
          borderLeft: `1px solid ${(theme.vars || theme).palette.divider}`,
        },
        [`& .${treeItemClasses.content}`]: {
          '&:hover': {
            backgroundColor: alpha(gray[600], 0.1),
          },
          [`&.${treeItemClasses.selected}`]: {
            backgroundColor: alpha(gray[600], 0.3),
            '&:hover': {
              backgroundColor: alpha(gray[600], 0.4),
            },
          },
          '&:focus-visible': {
            outline: `3px solid ${alpha(brand[500], 0.5)}`,
            outlineOffset: '2px',
          },
        },
      }),
    },
  },
};
