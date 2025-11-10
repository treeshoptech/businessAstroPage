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
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Close, Add, Delete, ExpandMore } from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { calculateTreeScore, calculateTreeTrimming, getTrimIntensityFactor, formatCurrency, formatHours, formatScore, PRODUCTION_RATES } from '../../../lib/pricing/formulas';
import AFISSFactorPicker from '../AFISSFactorPicker';

interface TreeTrimmingCalculatorModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onLineItemAdded: (lineItem: any) => void;
  propertyLatitude: number;
  propertyLongitude: number;
  orgLatitude: number;
  orgLongitude: number;
}

interface Tree {
  id: string;
  heightFeet: number;
  dbhInches: number;
  canopyRadiusFeet: number;
  trimPercentage: number; // 0.0 to 1.0
}

const createNewTree = (): Tree => ({
  id: Math.random().toString(36).substring(7),
  heightFeet: 40,
  dbhInches: 18,
  canopyRadiusFeet: 15,
  trimPercentage: 0.25, // 25% default
});

export default function TreeTrimmingCalculatorModal({
  open,
  onClose,
  organizationId,
  onLineItemAdded,
  propertyLatitude,
  propertyLongitude,
  orgLatitude,
  orgLongitude,
}: TreeTrimmingCalculatorModalProps) {
  // State
  const [trees, setTrees] = useState<Tree[]>([createNewTree()]);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string>('');
  const [afissModalOpen, setAfissModalOpen] = useState(false);
  const [selectedAfissFactors, setSelectedAfissFactors] = useState<any[]>([]);

  // Queries
  const loadouts = useQuery(api.loadouts.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  // Filter loadouts for tree trimming service type
  const treeTrimmingLoadouts = loadouts?.filter(
    (l) => l.serviceType === 'tree-trimming'
  ) || [];

  // Auto-select first loadout
  useEffect(() => {
    if (treeTrimmingLoadouts.length > 0 && !selectedLoadoutId) {
      setSelectedLoadoutId(treeTrimmingLoadouts[0]._id);
    }
  }, [treeTrimmingLoadouts, selectedLoadoutId]);

  // Handlers
  const addTree = () => {
    setTrees([...trees, createNewTree()]);
  };

  const removeTree = (id: string) => {
    if (trees.length === 1) return;
    setTrees(trees.filter(t => t.id !== id));
  };

  const updateTree = (id: string, updates: Partial<Tree>) => {
    setTrees(trees.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const setTrimPreset = (id: string, preset: 'light' | 'medium' | 'heavy') => {
    const percentages = {
      light: 0.125, // 12.5% (middle of 10-15%)
      medium: 0.25, // 25% (middle of 20-30%)
      heavy: 0.45, // 45% (middle of 40-50%)
    };
    updateTree(id, { trimPercentage: percentages[preset] });
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
    return distance / 30;
  };

  const calculateAfissMultiplier = () => {
    if (selectedAfissFactors.length === 0) return 1.0;
    const totalIncrease = selectedAfissFactors.reduce(
      (sum, factor) => sum + (factor.percentage / 100),
      0
    );
    return 1.0 + totalIncrease;
  };

  const calculateTreeTrimScores = () => {
    return trees.map(tree => {
      const result = calculateTreeTrimming(
        { heightFeet: tree.heightFeet, dbhInches: tree.dbhInches, canopyRadiusFeet: tree.canopyRadiusFeet },
        tree.trimPercentage
      );
      return {
        treeId: tree.id,
        height: tree.heightFeet,
        dbh: tree.dbhInches,
        canopy: tree.canopyRadiusFeet,
        trimPercentage: tree.trimPercentage,
        fullScore: result.fullTreeScore,
        trimScore: result.trimScore,
      };
    });
  };

  const getTotalTrimScore = () => {
    const baseTotal = trees.reduce((sum, tree) => {
      const result = calculateTreeTrimming(
        { heightFeet: tree.heightFeet, dbhInches: tree.dbhInches, canopyRadiusFeet: tree.canopyRadiusFeet },
        tree.trimPercentage
      );
      return sum + result.trimScore;
    }, 0);
    const afissMultiplier = calculateAfissMultiplier();
    return baseTotal * afissMultiplier;
  };

  const calculateHours = () => {
    const selectedLoadout = treeTrimmingLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return 0;

    const totalTrimScore = getTotalTrimScore();
    const productionRate = selectedLoadout.productionRate || PRODUCTION_RATES.tree_trimming_default;
    const workHours = totalTrimScore / productionRate;

    const driveTime = calculateDriveTime();
    const transportHours = driveTime * 2 * 0.5;
    const bufferHours = (workHours + transportHours) * 0.1;

    return workHours + transportHours + bufferHours;
  };

  const calculatePriceRange = () => {
    const selectedLoadout = treeTrimmingLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return { low: 0, high: 0 };

    const totalHours = calculateHours();
    const lowRate = selectedLoadout.billingRate30 || 0;
    const highRate = selectedLoadout.billingRate50 || 0;

    return {
      low: Math.round(totalHours * lowRate),
      high: Math.round(totalHours * highRate),
    };
  };

  const getTrimIntensityLabel = (percentage: number): string => {
    if (percentage >= 0.1 && percentage <= 0.15) return 'Light';
    if (percentage >= 0.2 && percentage <= 0.3) return 'Medium';
    if (percentage >= 0.4 && percentage <= 0.5) return 'Heavy';
    return 'Custom';
  };

  const handleAddToProposal = () => {
    const selectedLoadout = treeTrimmingLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return;

    const priceRange = calculatePriceRange();
    const hours = calculateHours();
    const totalTrimScore = getTotalTrimScore();
    const trimScores = calculateTreeTrimScores();
    const afissMultiplier = calculateAfissMultiplier();

    const lineItem = {
      lineItemId: selectedLoadout._id as Id<"lineItems">,
      serviceName: 'Tree Trimming',
      serviceIcon: '✂️',
      description: `${trees.length} tree${trees.length === 1 ? '' : 's'} trimming`,
      treeShopScore: totalTrimScore,
      estimatedHours: hours,
      loadoutName: selectedLoadout.name,
      priceRangeLow: priceRange.low,
      priceRangeHigh: priceRange.high,
      treeData: JSON.stringify(trimScores),
      afissFactors: selectedAfissFactors,
      afissMultiplier,
    };

    onLineItemAdded(lineItem);
  };

  const priceRange = calculatePriceRange();
  const hours = calculateHours();
  const totalTrimScore = getTotalTrimScore();
  const trimScores = calculateTreeTrimScores();
  const afissMultiplier = calculateAfissMultiplier();

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
                ✂️
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Tree Trimming
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
              {treeTrimmingLoadouts.map((loadout) => (
                <option key={loadout._id} value={loadout._id}>
                  {loadout.name} ({loadout.productionRate || PRODUCTION_RATES.tree_trimming_default} pts/hr)
                </option>
              ))}
            </TextField>
          </Box>

          {/* Trees */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Trees to Trim
              </Typography>
              <Button
                startIcon={<Add />}
                onClick={addTree}
                size="small"
                variant="outlined"
              >
                Add Tree
              </Button>
            </Box>

            <Stack spacing={2}>
              {trees.map((tree, index) => (
                <Accordion key={tree.id} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        Tree #{index + 1} • {tree.heightFeet}' tall, {Math.round(tree.trimPercentage * 100)}% trim
                      </Typography>
                      <Chip
                        label={formatScore(calculateTreeTrimming(
                          { heightFeet: tree.heightFeet, dbhInches: tree.dbhInches, canopyRadiusFeet: tree.canopyRadiusFeet },
                          tree.trimPercentage
                        ).trimScore)}
                        size="small"
                        color="secondary"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      {/* Measurement Guide */}
                      <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.50', borderColor: 'info.main', borderWidth: 1, borderStyle: 'solid' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          📏 Measurement Guide:
                        </Typography>
                        <Typography variant="caption" display="block">
                          • <strong>Height:</strong> Ground to top of tree (feet)
                        </Typography>
                        <Typography variant="caption" display="block">
                          • <strong>DBH:</strong> Diameter at Breast Height - 4.5 ft up from ground (inches)
                        </Typography>
                        <Typography variant="caption" display="block">
                          • <strong>Canopy Radius:</strong> Distance from trunk to edge of canopy (feet)
                        </Typography>
                        <Typography variant="caption" display="block">
                          • <strong>Trim %:</strong> Estimate percentage of canopy to be removed
                        </Typography>
                      </Paper>

                      {/* Tree Measurements */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Tree Height: {tree.heightFeet} ft
                        </Typography>
                        <Slider
                          value={tree.heightFeet}
                          onChange={(_, value) => updateTree(tree.id, { heightFeet: value as number })}
                          min={10}
                          max={150}
                          step={5}
                          marks={[
                            { value: 10, label: '10 ft' },
                            { value: 40, label: '40 ft' },
                            { value: 80, label: '80 ft' },
                            { value: 120, label: '120 ft' },
                            { value: 150, label: '150 ft' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          DBH (Diameter at Breast Height): {tree.dbhInches}"
                        </Typography>
                        <Slider
                          value={tree.dbhInches}
                          onChange={(_, value) => updateTree(tree.id, { dbhInches: value as number })}
                          min={3}
                          max={60}
                          step={1}
                          marks={[
                            { value: 3, label: '3"' },
                            { value: 15, label: '15"' },
                            { value: 30, label: '30"' },
                            { value: 45, label: '45"' },
                            { value: 60, label: '60"' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Canopy Radius: {tree.canopyRadiusFeet} ft
                        </Typography>
                        <Slider
                          value={tree.canopyRadiusFeet}
                          onChange={(_, value) => updateTree(tree.id, { canopyRadiusFeet: value as number })}
                          min={5}
                          max={50}
                          step={1}
                          marks={[
                            { value: 5, label: '5 ft' },
                            { value: 15, label: '15 ft' },
                            { value: 30, label: '30 ft' },
                            { value: 50, label: '50 ft' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      {/* Trim Percentage */}
                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Trim Intensity Presets:
                        </Typography>
                        <ToggleButtonGroup
                          value={null}
                          exclusive
                          size="small"
                          sx={{ mb: 2 }}
                        >
                          <ToggleButton value="light" onClick={() => setTrimPreset(tree.id, 'light')}>
                            <Box>
                              <Typography variant="caption" display="block">Light</Typography>
                              <Typography variant="caption" display="block" color="text.secondary">10-15%</Typography>
                            </Box>
                          </ToggleButton>
                          <ToggleButton value="medium" onClick={() => setTrimPreset(tree.id, 'medium')}>
                            <Box>
                              <Typography variant="caption" display="block">Medium</Typography>
                              <Typography variant="caption" display="block" color="text.secondary">20-30%</Typography>
                            </Box>
                          </ToggleButton>
                          <ToggleButton value="heavy" onClick={() => setTrimPreset(tree.id, 'heavy')}>
                            <Box>
                              <Typography variant="caption" display="block">Heavy</Typography>
                              <Typography variant="caption" display="block" color="text.secondary">40-50%</Typography>
                            </Box>
                          </ToggleButton>
                        </ToggleButtonGroup>

                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Trim Percentage: {Math.round(tree.trimPercentage * 100)}% ({getTrimIntensityLabel(tree.trimPercentage)})
                        </Typography>
                        <Slider
                          value={tree.trimPercentage * 100}
                          onChange={(_, value) => updateTree(tree.id, { trimPercentage: (value as number) / 100 })}
                          min={5}
                          max={70}
                          step={5}
                          marks={[
                            { value: 5, label: '5%' },
                            { value: 20, label: '20%' },
                            { value: 40, label: '40%' },
                            { value: 60, label: '60%' },
                            { value: 70, label: '70%' },
                          ]}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) => `${value}%`}
                        />
                      </Box>

                      {/* TrimScore Display */}
                      <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.50' }}>
                        <Typography variant="body2">
                          <strong>Full TreeScore:</strong> {formatScore(calculateTreeScore(tree.heightFeet, tree.dbhInches, tree.canopyRadiusFeet))}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>TrimScore:</strong> {formatScore(calculateTreeScore(tree.heightFeet, tree.dbhInches, tree.canopyRadiusFeet))} × {Math.round(tree.trimPercentage * 100)}% = {' '}
                          <strong>{formatScore(calculateTreeTrimming(
                            { heightFeet: tree.heightFeet, dbhInches: tree.dbhInches, canopyRadiusFeet: tree.canopyRadiusFeet },
                            tree.trimPercentage
                          ).trimScore)} points</strong>
                        </Typography>
                      </Paper>

                      {/* Remove Button */}
                      {trees.length > 1 && (
                        <Button
                          startIcon={<Delete />}
                          onClick={() => removeTree(tree.id)}
                          size="small"
                          color="error"
                          variant="outlined"
                        >
                          Remove Tree
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
                AFISS Complexity Factors
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setAfissModalOpen(true)}
              >
                {selectedAfissFactors.length > 0 ? 'Edit Factors' : 'Add Factors'}
              </Button>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
              Add factors like power lines, near structures, limited access
            </Typography>
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
            {selectedAfissFactors.length > 0 && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'warning.main', fontWeight: 600 }}>
                AFISS Multiplier: {afissMultiplier.toFixed(2)}× (+{((afissMultiplier - 1) * 100).toFixed(0)}%)
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Calculation Results */}
          <Card variant="outlined" sx={{ bgcolor: 'secondary.50', borderColor: 'secondary.main' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Calculation Summary
              </Typography>

              {/* Tree Breakdown */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>
                  Tree Breakdown:
                </Typography>
                {trimScores.map((score, idx) => (
                  <Box key={score.treeId} sx={{ ml: 2, mt: 0.5 }}>
                    <Typography variant="body2">
                      #{idx + 1}: {score.height}' × {score.dbh}" DBH × {Math.round(score.trimPercentage * 100)}% = {formatScore(score.trimScore)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Base TrimScore:
                </Typography>
                <Typography variant="body2">{formatScore(getTotalTrimScore() / afissMultiplier)}</Typography>
              </Box>

              {afissMultiplier > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    AFISS Adjusted:
                  </Typography>
                  <Typography variant="body2">{formatScore(getTotalTrimScore())}</Typography>
                </Box>
              )}

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
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                  {formatCurrency(priceRange.low)} - {formatCurrency(priceRange.high)}
                </Typography>
              </Box>

              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                Includes equipment, labor, transport, and debris removal
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
            disabled={!selectedLoadoutId || trees.length === 0}
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
