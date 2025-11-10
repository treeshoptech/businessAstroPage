import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  Card,
  CardContent,
  Chip,
  Stack,
  Slider,
  FormControlLabel,
  Checkbox,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Close, Add, Delete, ExpandMore } from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { calculateStumpScore, formatCurrency, formatHours, MINIMUM_HOURS } from '../../../lib/pricing/formulas';
import AFISSFactorPicker from '../AFISSFactorPicker';

interface StumpGrindingCalculatorModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onLineItemAdded: (lineItem: any) => void;
  propertyLatitude: number;
  propertyLongitude: number;
  orgLatitude: number;
  orgLongitude: number;
}

interface Stump {
  id: string;
  diameterInches: number;
  heightAboveGradeFeet: number;
  grindDepthBelowGradeFeet: number;
  isHardwood: boolean;
  hasLargeRootFlare: boolean;
  isRotten: boolean;
  hasRocksInRootZone: boolean;
  isTightLandscaping: boolean;
}

const createNewStump = (): Stump => ({
  id: Math.random().toString(36).substring(7),
  diameterInches: 18,
  heightAboveGradeFeet: 1,
  grindDepthBelowGradeFeet: 1,
  isHardwood: false,
  hasLargeRootFlare: false,
  isRotten: false,
  hasRocksInRootZone: false,
  isTightLandscaping: false,
});

export default function StumpGrindingCalculatorModal({
  open,
  onClose,
  organizationId,
  onLineItemAdded,
  propertyLatitude,
  propertyLongitude,
  orgLatitude,
  orgLongitude,
}: StumpGrindingCalculatorModalProps) {
  // State
  const [stumps, setStumps] = useState<Stump[]>([createNewStump()]);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string>('');
  const [afissModalOpen, setAfissModalOpen] = useState(false);
  const [selectedAfissFactors, setSelectedAfissFactors] = useState<any[]>([]);

  // Queries
  const loadouts = useQuery(api.loadouts.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  // Filter loadouts for stump grinding service type
  const stumpLoadouts = loadouts?.filter(
    (l) => l.serviceType === 'stump-grinding'
  ) || [];

  // Auto-select first loadout
  useEffect(() => {
    if (stumpLoadouts.length > 0 && !selectedLoadoutId) {
      setSelectedLoadoutId(stumpLoadouts[0]._id);
    }
  }, [stumpLoadouts, selectedLoadoutId]);

  // Handlers
  const addStump = () => {
    setStumps([...stumps, createNewStump()]);
  };

  const removeStump = (id: string) => {
    if (stumps.length === 1) return; // Keep at least one
    setStumps(stumps.filter(s => s.id !== id));
  };

  const updateStump = (id: string, updates: Partial<Stump>) => {
    setStumps(stumps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Calculations
  const calculateDriveTime = () => {
    if (!orgLatitude || !orgLongitude || !propertyLatitude || !propertyLongitude) {
      return 0;
    }
    const distance = Math.sqrt(
      Math.pow((propertyLatitude - orgLatitude) * 69, 2) +
      Math.pow((propertyLongitude - orgLongitude) * 54.6, 2)
    );
    return distance / 30; // hours
  };

  const calculateStumpScores = () => {
    return stumps.map(stump => {
      const baseScore = calculateStumpScore(stump);
      return {
        stumpId: stump.id,
        diameter: stump.diameterInches,
        baseScore,
        modifiers: getModifiersList(stump),
      };
    });
  };

  const getModifiersList = (stump: Stump): string[] => {
    const mods: string[] = [];
    if (stump.isHardwood) mods.push('Hardwood (+15%)');
    if (stump.hasLargeRootFlare) mods.push('Root Flare (+20%)');
    if (stump.isRotten) mods.push('Rotten (-15%)');
    if (stump.hasRocksInRootZone) mods.push('Rocks (+10%)');
    if (stump.isTightLandscaping) mods.push('Tight Space (+15%)');
    return mods;
  };

  const getTotalStumpScore = () => {
    return stumps.reduce((sum, stump) => sum + calculateStumpScore(stump), 0);
  };

  const calculateHours = () => {
    const selectedLoadout = stumpLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return 0;

    const totalStumpScore = getTotalStumpScore();
    const productionRate = selectedLoadout.productionRate || 400; // Default 400 pts/hr
    let workHours = totalStumpScore / productionRate;

    // Enforce 2-hour minimum
    workHours = Math.max(workHours, MINIMUM_HOURS.stump_grinding);

    const driveTime = calculateDriveTime();
    const transportHours = driveTime * 2 * 0.3; // Round trip at 30% rate (smaller trailer)

    const bufferHours = (workHours + transportHours) * 0.1; // 10% buffer

    return workHours + transportHours + bufferHours;
  };

  const calculatePriceRange = () => {
    const selectedLoadout = stumpLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return { low: 0, high: 0 };

    const totalHours = calculateHours();
    const lowRate = selectedLoadout.billingRate30 || 0;
    const highRate = selectedLoadout.billingRate50 || 0;

    return {
      low: Math.round(totalHours * lowRate),
      high: Math.round(totalHours * highRate),
    };
  };

  const handleAddToProposal = () => {
    const selectedLoadout = stumpLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return;

    const priceRange = calculatePriceRange();
    const hours = calculateHours();
    const totalStumpScore = getTotalStumpScore();
    const stumpScores = calculateStumpScores();

    const lineItem = {
      lineItemId: selectedLoadout._id as Id<"lineItems">,
      serviceName: 'Stump Grinding',
      serviceIcon: '🪵',
      description: `${stumps.length} stump${stumps.length === 1 ? '' : 's'} ground below grade`,
      treeShopScore: totalStumpScore,
      estimatedHours: hours,
      loadoutName: selectedLoadout.name,
      priceRangeLow: priceRange.low,
      priceRangeHigh: priceRange.high,
      stumpData: JSON.stringify(stumpScores),
      afissFactors: selectedAfissFactors,
    };

    onLineItemAdded(lineItem);
  };

  const priceRange = calculatePriceRange();
  const hours = calculateHours();
  const totalStumpScore = getTotalStumpScore();
  const stumpScores = calculateStumpScores();

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" sx={{ fontSize: '1.5rem' }}>
                🪵
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Stump Grinding
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ pb: 3 }}>
          {/* Loadout Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Loadout
            </Typography>
            <TextField
              select
              fullWidth
              value={selectedLoadoutId}
              onChange={(e) => setSelectedLoadoutId(e.target.value)}
              size="small"
            >
              {stumpLoadouts.map((loadout) => (
                <option key={loadout._id} value={loadout._id}>
                  {loadout.name} ({loadout.productionRate || 400} pts/hr)
                </option>
              ))}
            </TextField>
          </Box>

          {/* Stumps */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Stumps to Grind
              </Typography>
              <Button
                startIcon={<Add />}
                onClick={addStump}
                size="small"
                variant="outlined"
              >
                Add Stump
              </Button>
            </Box>

            <Stack spacing={2}>
              {stumps.map((stump, index) => (
                <Accordion key={stump.id} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        Stump #{index + 1} • {stump.diameterInches}" diameter
                      </Typography>
                      <Chip
                        label={`${Math.round(calculateStumpScore(stump))} pts`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      {/* Diameter */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Stump Diameter: {stump.diameterInches}"
                        </Typography>
                        <Slider
                          value={stump.diameterInches}
                          onChange={(_, value) => updateStump(stump.id, { diameterInches: value as number })}
                          min={6}
                          max={60}
                          step={1}
                          marks={[
                            { value: 6, label: '6"' },
                            { value: 20, label: '20"' },
                            { value: 40, label: '40"' },
                            { value: 60, label: '60"' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      {/* Height Above Grade */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Height Above Grade: {stump.heightAboveGradeFeet} ft
                        </Typography>
                        <Slider
                          value={stump.heightAboveGradeFeet}
                          onChange={(_, value) => updateStump(stump.id, { heightAboveGradeFeet: value as number })}
                          min={0}
                          max={3}
                          step={0.5}
                          marks={[
                            { value: 0, label: '0 ft' },
                            { value: 1, label: '1 ft' },
                            { value: 2, label: '2 ft' },
                            { value: 3, label: '3 ft' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      {/* Grind Depth Below */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Grind Depth Below Grade: {stump.grindDepthBelowGradeFeet} ft
                        </Typography>
                        <Slider
                          value={stump.grindDepthBelowGradeFeet}
                          onChange={(_, value) => updateStump(stump.id, { grindDepthBelowGradeFeet: value as number })}
                          min={0.5}
                          max={1.5}
                          step={0.25}
                          marks={[
                            { value: 0.5, label: '6"' },
                            { value: 1, label: '12"' },
                            { value: 1.5, label: '18"' },
                          ]}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) => `${value * 12}"`}
                        />
                      </Box>

                      {/* Modifiers */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Complexity Factors
                        </Typography>
                        <Stack spacing={1}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={stump.isHardwood}
                                onChange={(e) => updateStump(stump.id, { isHardwood: e.target.checked })}
                              />
                            }
                            label={<Typography variant="body2">Hardwood species (oak, hickory, etc.) +15%</Typography>}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={stump.hasLargeRootFlare}
                                onChange={(e) => updateStump(stump.id, { hasLargeRootFlare: e.target.checked })}
                              />
                            }
                            label={<Typography variant="body2">Large root flare/buttress +20%</Typography>}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={stump.isRotten}
                                onChange={(e) => updateStump(stump.id, { isRotten: e.target.checked })}
                              />
                            }
                            label={<Typography variant="body2">Rotten/deteriorated stump -15%</Typography>}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={stump.hasRocksInRootZone}
                                onChange={(e) => updateStump(stump.id, { hasRocksInRootZone: e.target.checked })}
                              />
                            }
                            label={<Typography variant="body2">Rocks in root zone +10%</Typography>}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={stump.isTightLandscaping}
                                onChange={(e) => updateStump(stump.id, { isTightLandscaping: e.target.checked })}
                              />
                            }
                            label={<Typography variant="body2">Tight landscaping/near foundation +15%</Typography>}
                          />
                        </Stack>
                      </Box>

                      {/* Remove Button */}
                      {stumps.length > 1 && (
                        <Button
                          startIcon={<Delete />}
                          onClick={() => removeStump(stump.id)}
                          size="small"
                          color="error"
                          variant="outlined"
                        >
                          Remove Stump
                        </Button>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Box>

          {/* AFISS Factors */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                AFISS Site Factors (Optional)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setAfissModalOpen(true)}
              >
                {selectedAfissFactors.length > 0 ? 'Edit Factors' : 'Add Factors'}
              </Button>
            </Box>
            {selectedAfissFactors.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {selectedAfissFactors.map((factor, idx) => (
                  <Chip
                    key={idx}
                    label={`${factor.factor} (+${factor.percentage}%)`}
                    size="small"
                    onDelete={() => {
                      setSelectedAfissFactors(
                        selectedAfissFactors.filter((_, i) => i !== idx)
                      );
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Calculation Results */}
          <Card variant="outlined" sx={{ bgcolor: 'primary.50', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Calculation Summary
              </Typography>

              {/* Stump Breakdown */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>
                  Stump Breakdown:
                </Typography>
                {stumpScores.map((score, idx) => (
                  <Box key={score.stumpId} sx={{ ml: 2, mt: 0.5 }}>
                    <Typography variant="body2">
                      #{idx + 1}: {score.diameter}" = {Math.round(score.baseScore)} pts
                      {score.modifiers.length > 0 && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          ({score.modifiers.join(', ')})
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Total StumpScore:
                </Typography>
                <Typography variant="body2">{Math.round(totalStumpScore)} points</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Estimated Hours:
                </Typography>
                <Typography variant="body2">{formatHours(hours)}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Investment Range:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {formatCurrency(priceRange.low)} - {formatCurrency(priceRange.high)}
                </Typography>
              </Box>

              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                Includes equipment, labor, transport, and 2-hour minimum
              </Typography>
            </CardContent>
          </Card>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleAddToProposal}
            variant="contained"
            disabled={!selectedLoadoutId || stumps.length === 0}
          >
            Add to Proposal
          </Button>
        </DialogActions>
      </Dialog>

      {/* AFISS Factor Picker Modal */}
      <AFISSFactorPicker
        open={afissModalOpen}
        onClose={() => setAfissModalOpen(false)}
        selectedFactors={selectedAfissFactors}
        onFactorsChange={setSelectedAfissFactors}
      />
    </>
  );
}
