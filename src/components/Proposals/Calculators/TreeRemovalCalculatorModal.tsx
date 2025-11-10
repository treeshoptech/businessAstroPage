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
} from '@mui/material';
import { Close, Add, Delete, ExpandMore } from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { calculateTreeScore, formatCurrency, formatHours, formatScore, PRODUCTION_RATES } from '../../../lib/pricing/formulas';
import AFISSFactorPicker from '../AFISSFactorPicker';

interface TreeRemovalCalculatorModalProps {
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
  dbhInches: number; // Diameter at Breast Height
  canopyRadiusFeet: number;
}

const createNewTree = (): Tree => ({
  id: Math.random().toString(36).substring(7),
  heightFeet: 40,
  dbhInches: 18,
  canopyRadiusFeet: 15,
});

export default function TreeRemovalCalculatorModal({
  open,
  onClose,
  organizationId,
  onLineItemAdded,
  propertyLatitude,
  propertyLongitude,
  orgLatitude,
  orgLongitude,
}: TreeRemovalCalculatorModalProps) {
  // State
  const [trees, setTrees] = useState<Tree[]>([createNewTree()]);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string>('');
  const [afissModalOpen, setAfissModalOpen] = useState(false);
  const [selectedAfissFactors, setSelectedAfissFactors] = useState<any[]>([]);

  // Queries
  const loadouts = useQuery(api.loadouts.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  // Filter loadouts for tree removal service type
  const treeRemovalLoadouts = loadouts?.filter(
    (l) => l.serviceType === 'tree-removal'
  ) || [];

  // Auto-select first loadout
  useEffect(() => {
    if (treeRemovalLoadouts.length > 0 && !selectedLoadoutId) {
      setSelectedLoadoutId(treeRemovalLoadouts[0]._id);
    }
  }, [treeRemovalLoadouts, selectedLoadoutId]);

  // Handlers
  const addTree = () => {
    setTrees([...trees, createNewTree()]);
  };

  const removeTree = (id: string) => {
    if (trees.length === 1) return; // Keep at least one
    setTrees(trees.filter(t => t.id !== id));
  };

  const updateTree = (id: string, updates: Partial<Tree>) => {
    setTrees(trees.map(t => t.id === id ? { ...t, ...updates } : t));
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

  const calculateAfissMultiplier = () => {
    if (selectedAfissFactors.length === 0) return 1.0;
    const totalIncrease = selectedAfissFactors.reduce(
      (sum, factor) => sum + (factor.percentage / 100),
      0
    );
    return 1.0 + totalIncrease;
  };

  const calculateTreeScores = () => {
    return trees.map(tree => {
      const baseScore = calculateTreeScore(tree.heightFeet, tree.dbhInches, tree.canopyRadiusFeet);
      return {
        treeId: tree.id,
        height: tree.heightFeet,
        dbh: tree.dbhInches,
        canopy: tree.canopyRadiusFeet,
        baseScore,
      };
    });
  };

  const getTotalTreeScore = () => {
    const baseTotal = trees.reduce((sum, tree) =>
      sum + calculateTreeScore(tree.heightFeet, tree.dbhInches, tree.canopyRadiusFeet), 0
    );
    const afissMultiplier = calculateAfissMultiplier();
    return baseTotal * afissMultiplier;
  };

  const calculateHours = () => {
    const selectedLoadout = treeRemovalLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return 0;

    const totalTreeScore = getTotalTreeScore();
    const productionRate = selectedLoadout.productionRate || PRODUCTION_RATES.tree_removal_default; // Default 250 PpH
    const workHours = totalTreeScore / productionRate;

    const driveTime = calculateDriveTime();
    const transportHours = driveTime * 2 * 0.5; // Round trip at 50% rate

    const bufferHours = (workHours + transportHours) * 0.1; // 10% buffer

    return workHours + transportHours + bufferHours;
  };

  const calculatePriceRange = () => {
    const selectedLoadout = treeRemovalLoadouts.find((l) => l._id === selectedLoadoutId);
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
    const selectedLoadout = treeRemovalLoadouts.find((l) => l._id === selectedLoadoutId);
    if (!selectedLoadout) return;

    const priceRange = calculatePriceRange();
    const hours = calculateHours();
    const totalTreeScore = getTotalTreeScore();
    const treeScores = calculateTreeScores();
    const afissMultiplier = calculateAfissMultiplier();

    const lineItem = {
      lineItemId: selectedLoadout._id as Id<"lineItems">,
      serviceName: 'Tree Removal',
      serviceIcon: '🌳',
      description: `${trees.length} tree${trees.length === 1 ? '' : 's'} removal`,
      treeShopScore: totalTreeScore,
      estimatedHours: hours,
      loadoutName: selectedLoadout.name,
      priceRangeLow: priceRange.low,
      priceRangeHigh: priceRange.high,
      treeData: JSON.stringify(treeScores),
      afissFactors: selectedAfissFactors,
      afissMultiplier,
    };

    onLineItemAdded(lineItem);
  };

  const priceRange = calculatePriceRange();
  const hours = calculateHours();
  const totalTreeScore = getTotalTreeScore();
  const treeScores = calculateTreeScores();
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
                🌳
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Tree Removal
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
              {treeRemovalLoadouts.map((loadout) => (
                <option key={loadout._id} value={loadout._id}>
                  {loadout.name} ({loadout.productionRate || PRODUCTION_RATES.tree_removal_default} pts/hr)
                </option>
              ))}
            </TextField>
          </Box>

          {/* Trees */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Trees to Remove
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
                        Tree #{index + 1} • {tree.heightFeet}' tall, {tree.dbhInches}" DBH
                      </Typography>
                      <Chip
                        label={formatScore(calculateTreeScore(tree.heightFeet, tree.dbhInches, tree.canopyRadiusFeet))}
                        size="small"
                        color="primary"
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
                      </Paper>

                      {/* Height */}
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

                      {/* DBH */}
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

                      {/* Canopy Radius */}
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

                      {/* TreeScore Display */}
                      <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.50' }}>
                        <Typography variant="body2">
                          <strong>TreeScore Formula:</strong> H × (DBH÷12)² × CR²
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {tree.heightFeet} × ({tree.dbhInches}÷12)² × {tree.canopyRadiusFeet}² = {' '}
                          <strong>{formatScore(calculateTreeScore(tree.heightFeet, tree.dbhInches, tree.canopyRadiusFeet))} points</strong>
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
              Add factors like power lines, near structures, limited access, hazard trees
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
          <Card variant="outlined" sx={{ bgcolor: 'primary.50', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Calculation Summary
              </Typography>

              {/* Tree Breakdown */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>
                  Tree Breakdown:
                </Typography>
                {treeScores.map((score, idx) => (
                  <Box key={score.treeId} sx={{ ml: 2, mt: 0.5 }}>
                    <Typography variant="body2">
                      #{idx + 1}: {score.height}' × {score.dbh}" DBH × {score.canopy}' canopy = {formatScore(score.baseScore)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Base TreeScore:
                </Typography>
                <Typography variant="body2">{formatScore(getTotalTreeScore() / afissMultiplier)}</Typography>
              </Box>

              {afissMultiplier > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    AFISS Adjusted:
                  </Typography>
                  <Typography variant="body2">{formatScore(getTotalTreeScore())}</Typography>
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
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {formatCurrency(priceRange.low)} - {formatCurrency(priceRange.high)}
                </Typography>
              </Box>

              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                Includes equipment, labor, transport, and site cleanup
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
