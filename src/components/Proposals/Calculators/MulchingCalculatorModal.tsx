import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Divider,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import { Close, Map as MapIcon } from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import AFISSFactorPicker from '../AFISSFactorPicker';

interface MulchingCalculatorModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onLineItemAdded: (lineItem: any) => void;
  propertyLatitude: number;
  propertyLongitude: number;
  orgLatitude: number;
  orgLongitude: number;
}

interface DBHPackage {
  value: number;
  label: string;
  description: string;
}

const dbhPackages: DBHPackage[] = [
  { value: 4, label: '4" Package', description: 'Light brush, saplings, understory' },
  { value: 6, label: '6" Package', description: 'Small trees, dense brush areas' },
  { value: 8, label: '8" Package', description: 'Mature understory, medium trees' },
  { value: 10, label: '10" Package', description: 'Large trees, heavy vegetation' },
  { value: 15, label: '15" Package', description: 'Very large trees (specialized)' },
];

export default function MulchingCalculatorModal({
  open,
  onClose,
  organizationId,
  onLineItemAdded,
  propertyLatitude,
  propertyLongitude,
  orgLatitude,
  orgLongitude,
}: MulchingCalculatorModalProps) {
  // State
  const [acres, setAcres] = useState<number>(1);
  const [dbhPackage, setDbhPackage] = useState<number>(6);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string>('');
  const [afissModalOpen, setAfissModalOpen] = useState(false);
  const [selectedAfissFactors, setSelectedAfissFactors] = useState<any[]>([]);

  // Queries
  const loadouts = useQuery(api.loadouts.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  // Filter loadouts for forestry mulching service type
  const mulchingLoadouts = loadouts?.filter(
    (l) => l.serviceType === 'forestry-mulching'
  ) || [];

  // Auto-select first loadout
  useEffect(() => {
    if (mulchingLoadouts.length > 0 && !selectedLoadoutId) {
      setSelectedLoadoutId(mulchingLoadouts[0]._id);
    }
  }, [mulchingLoadouts, selectedLoadoutId]);

  // Calculations
  const calculateDriveTime = () => {
    if (!orgLatitude || !orgLongitude || !propertyLatitude || !propertyLongitude) {
      return 0;
    }
    // Simple drive time estimate: ~30 miles per hour average
    const distance = Math.sqrt(
      Math.pow((propertyLatitude - orgLatitude) * 69, 2) +
      Math.pow((propertyLongitude - orgLongitude) * 54.6, 2)
    );
    return distance / 30; // hours
  };

  const calculateAfissMultiplier = () => {
    if (selectedAfissFactors.length === 0) return 1.0;
    const totalIncrease = selectedAfissFactors.reduce(
      (sum, factor) => sum + (factor.percentage / 100),
      0
    );
    return 1.0 + totalIncrease;
  };

  const calculateTreeShopScore = () => {
    const baseScore = dbhPackage * acres;
    const afissMultiplier = calculateAfissMultiplier();
    return baseScore * afissMultiplier;
  };

  const calculateHours = () => {
    const selectedLoadout = mulchingLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return 0;

    const treeShopScore = calculateTreeShopScore();
    const productionRate = selectedLoadout.productionRate || 1.5; // Default 1.5 PpH
    const workHours = treeShopScore / productionRate;

    const driveTime = calculateDriveTime();
    const transportHours = driveTime * 2 * 0.5; // Round trip at 50% rate

    const bufferHours = (workHours + transportHours) * 0.1; // 10% buffer

    return workHours + transportHours + bufferHours;
  };

  const calculatePriceRange = () => {
    const selectedLoadout = mulchingLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return { low: 0, high: 0 };

    const totalHours = calculateHours();

    // Use loadout's pre-calculated billing rates (30% and 50% margins)
    const lowRate = selectedLoadout.billingRate30 || 0;
    const highRate = selectedLoadout.billingRate50 || 0;

    return {
      low: Math.round(totalHours * lowRate),
      high: Math.round(totalHours * highRate),
    };
  };

  const handleAddToProposal = () => {
    const selectedLoadout = mulchingLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return;

    const priceRange = calculatePriceRange();
    const hours = calculateHours();
    const treeShopScore = calculateTreeShopScore();
    const afissMultiplier = calculateAfissMultiplier();

    const lineItem = {
      lineItemId: selectedLoadout._id as Id<"lineItems">,
      serviceName: 'Forestry Mulching',
      serviceIcon: '🌲',
      description: `${acres} acres • Up to ${dbhPackage}" diameter trees`,
      treeShopScore,
      estimatedHours: hours,
      loadoutName: selectedLoadout.name,
      priceRangeLow: priceRange.low,
      priceRangeHigh: priceRange.high,
      afissFactors: selectedAfissFactors,
      afissMultiplier,
    };

    onLineItemAdded(lineItem);
  };

  const priceRange = calculatePriceRange();
  const hours = calculateHours();
  const afissMultiplier = calculateAfissMultiplier();

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" sx={{ fontSize: '1.5rem' }}>
                🌲
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Forestry Mulching
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            {/* PROJECT DETAILS */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                PROJECT DETAILS
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Acres"
                  type="number"
                  value={acres}
                  onChange={(e) => setAcres(Math.max(0.1, parseFloat(e.target.value) || 0))}
                  inputProps={{ min: 0.1, step: 0.1 }}
                  fullWidth
                />

                <TextField
                  select
                  label="DBH Package"
                  value={dbhPackage}
                  onChange={(e) => setDbhPackage(parseInt(e.target.value))}
                  fullWidth
                >
                  {dbhPackages.map((pkg) => (
                    <MenuItem key={pkg.value} value={pkg.value}>
                      <Box>
                        <Typography variant="body1">{pkg.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pkg.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="outlined"
                  startIcon={<MapIcon />}
                  fullWidth
                  disabled
                  sx={{ textTransform: 'none' }}
                >
                  Draw Work Area on Map (Coming Soon)
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* SITE ASSESSMENT */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                SITE ASSESSMENT
              </Typography>

              <Button
                variant="outlined"
                onClick={() => setAfissModalOpen(true)}
                fullWidth
                sx={{ textTransform: 'none', justifyContent: 'space-between' }}
              >
                <span>Site Complexity Factors</span>
                {selectedAfissFactors.length > 0 && (
                  <Chip
                    label={`${selectedAfissFactors.length} selected`}
                    size="small"
                    color="primary"
                  />
                )}
              </Button>

              {afissMultiplier > 1 && (
                <Card sx={{ mt: 2, bgcolor: 'warning.dark' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      AFISS Multiplier: {(afissMultiplier * 100 - 100).toFixed(0)}% increase
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedAfissFactors.map((f) => f.name).join(', ')}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>

            <Divider />

            {/* LOADOUT */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                LOADOUT
              </Typography>

              <TextField
                select
                label="Select Loadout"
                value={selectedLoadoutId}
                onChange={(e) => setSelectedLoadoutId(e.target.value)}
                fullWidth
                disabled={mulchingLoadouts.length === 0}
              >
                {mulchingLoadouts.map((loadout) => (
                  <MenuItem key={loadout._id} value={loadout._id}>
                    <Box>
                      <Typography variant="body1">{loadout.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {loadout.productionRate || 1.5} PpH • ${loadout.billingRate30}/hr - ${loadout.billingRate50}/hr
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {mulchingLoadouts.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  No forestry mulching loadouts configured. Create one in Settings.
                </Typography>
              )}

              <Button
                variant="outlined"
                fullWidth
                disabled
                sx={{ mt: 2, textTransform: 'none' }}
              >
                Scale Up Loadout (Coming Soon)
              </Button>
            </Box>

            <Divider />

            {/* PRICE CALCULATION */}
            <Card sx={{ bgcolor: 'action.hover' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                  ESTIMATED INVESTMENT
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  ${priceRange.low.toLocaleString()} - ${priceRange.high.toLocaleString()}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={`${hours.toFixed(1)} hours`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${acres} acres`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Up to ${dbhPackage}" DBH`}
                    size="small"
                    variant="outlined"
                  />
                  {afissMultiplier > 1 && (
                    <Chip
                      label={`+${(afissMultiplier * 100 - 100).toFixed(0)}% AFISS`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleAddToProposal}
            variant="contained"
            disabled={!selectedLoadoutId || acres <= 0}
            sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
          >
            Add to Proposal
          </Button>
        </DialogActions>
      </Dialog>

      <AFISSFactorPicker
        open={afissModalOpen}
        onClose={() => setAfissModalOpen(false)}
        selectedFactors={selectedAfissFactors}
        onFactorsChange={setSelectedAfissFactors}
        serviceType="forestry-mulching"
      />
    </>
  );
}
