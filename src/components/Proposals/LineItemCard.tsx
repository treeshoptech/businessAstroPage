import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import { Delete } from '@mui/icons-material';

interface LineItemCardProps {
  lineNumber: number;
  serviceName: string;
  serviceIcon: string;
  description: string;
  estimatedHours: number;
  loadoutName: string;
  priceRangeLow: number;
  priceRangeHigh: number;
  afissMultiplier: number;
  onDelete: () => void;
}

const serviceColors: Record<string, string> = {
  'Forestry Mulching': '#4CAF50',
  'Stump Grinding': '#FF9800',
  'Land Clearing': '#FFC107',
  'Tree Removal': '#F44336',
  'Tree Trimming': '#2196F3',
};

export default function LineItemCard({
  lineNumber,
  serviceName,
  serviceIcon,
  description,
  estimatedHours,
  loadoutName,
  priceRangeLow,
  priceRangeHigh,
  afissMultiplier,
  onDelete,
}: LineItemCardProps) {
  const serviceColor = serviceColors[serviceName] || '#9E9E9E';

  return (
    <Paper
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: serviceColor,
          boxShadow: 2,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left side - Service icon and details */}
        <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: `${serviceColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0,
            }}
          >
            {serviceIcon}
          </Box>

          {/* Details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title with line number */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: 'text.secondary',
                }}
              >
                #{lineNumber}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: serviceColor,
                }}
              >
                {serviceName}
              </Typography>
            </Box>

            {/* Description */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1.5, lineHeight: 1.4 }}
            >
              {description}
            </Typography>

            {/* Metadata chips */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label={`${estimatedHours.toFixed(1)} hours`}
                size="small"
                variant="outlined"
                sx={{ borderColor: 'divider' }}
              />
              <Chip
                label={loadoutName}
                size="small"
                variant="outlined"
                sx={{ borderColor: 'divider' }}
              />
              {afissMultiplier > 1 && (
                <Chip
                  label={`AFISS +${((afissMultiplier - 1) * 100).toFixed(0)}%`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>

            {/* Price range */}
            <Typography
              variant="h6"
              sx={{
                mt: 2,
                fontWeight: 700,
                color: serviceColor,
              }}
            >
              ${priceRangeLow.toLocaleString()} - ${priceRangeHigh.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* Right side - Delete button */}
        <IconButton
          onClick={onDelete}
          size="small"
          sx={{
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.dark',
              color: 'error.contrastText',
            },
          }}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
}
