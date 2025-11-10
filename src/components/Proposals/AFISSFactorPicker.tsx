import React, { useState } from 'react';
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
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Close,
  ExpandMore,
  Search,
} from '@mui/icons-material';

interface AFISSFactor {
  id: string;
  name: string;
  description: string;
  percentage: number;
  category: string;
}

interface AFISSFactorPickerProps {
  open: boolean;
  onClose: () => void;
  selectedFactors: AFISSFactor[];
  onFactorsChange: (factors: AFISSFactor[]) => void;
  serviceType: string;
}

// AFISS Factors organized by category (30-50 factors for MVP)
const afissFactors: AFISSFactor[] = [
  // ACCESS & ENTRY (9 factors)
  { id: 'access-1', category: 'Access & Entry', name: 'Narrow gate (<8 ft)', description: 'Equipment access restricted by gate width', percentage: 12 },
  { id: 'access-2', category: 'Access & Entry', name: 'No equipment access', description: 'Hand-carry only, no vehicle access', percentage: 50 },
  { id: 'access-3', category: 'Access & Entry', name: 'Long driveway (>500 ft)', description: 'Extended travel on property', percentage: 8 },
  { id: 'access-4', category: 'Access & Entry', name: 'Soft/muddy ground', description: 'Poor ground conditions for equipment', percentage: 15 },
  { id: 'access-5', category: 'Access & Entry', name: 'Backyard access only', description: 'No front yard or street access', percentage: 10 },
  { id: 'access-6', category: 'Access & Entry', name: 'Neighbor permission required', description: 'Access through adjacent property needed', percentage: 15 },
  { id: 'access-7', category: 'Access & Entry', name: 'Locked/controlled access', description: 'HOA, gate code, security required', percentage: 5 },
  { id: 'access-8', category: 'Access & Entry', name: 'Steep driveway', description: 'Slope >15% on access route', percentage: 12 },
  { id: 'access-9', category: 'Access & Entry', name: 'Multiple trip requirement', description: 'Site requires multiple equipment trips', percentage: 20 },

  // GROUND & TERRAIN (13 factors)
  { id: 'terrain-1', category: 'Ground & Terrain', name: 'Steep slope (15-30°)', description: 'Moderate slope in work area', percentage: 20 },
  { id: 'terrain-2', category: 'Ground & Terrain', name: 'Very steep slope (>30°)', description: 'Extreme slope requiring specialized rigging', percentage: 40 },
  { id: 'terrain-3', category: 'Ground & Terrain', name: 'Rocky ground', description: 'Rocks/boulders in work area', percentage: 15 },
  { id: 'terrain-4', category: 'Ground & Terrain', name: 'Large rocks in root zone', description: 'Rocks interfering with grinding/excavation', percentage: 25 },
  { id: 'terrain-5', category: 'Ground & Terrain', name: 'Wetlands in work area', description: 'Standing water or saturated soil', percentage: 20 },
  { id: 'terrain-6', category: 'Ground & Terrain', name: 'Creek or drainage', description: 'Water feature in or adjacent to work area', percentage: 15 },
  { id: 'terrain-7', category: 'Ground & Terrain', name: 'Dense undergrowth', description: 'Heavy brush requiring clearing first', percentage: 15 },
  { id: 'terrain-8', category: 'Ground & Terrain', name: 'Uneven terrain', description: 'Irregular ground surface', percentage: 10 },
  { id: 'terrain-9', category: 'Ground & Terrain', name: 'Sand or loose soil', description: 'Poor equipment traction', percentage: 12 },
  { id: 'terrain-10', category: 'Ground & Terrain', name: 'Concrete/pavement nearby', description: 'Hard surfaces requiring protection', percentage: 8 },
  { id: 'terrain-11', category: 'Ground & Terrain', name: 'Erosion concern', description: 'Work area subject to erosion', percentage: 10 },
  { id: 'terrain-12', category: 'Ground & Terrain', name: 'Fill dirt area', description: 'Unstable or recently filled ground', percentage: 15 },
  { id: 'terrain-13', category: 'Ground & Terrain', name: 'Multiple elevations', description: 'Work spans significant elevation changes', percentage: 18 },

  // OVERHEAD HAZARDS (6 factors)
  { id: 'overhead-1', category: 'Overhead Hazards', name: 'Power lines touching', description: 'Power lines in direct contact with work', percentage: 30 },
  { id: 'overhead-2', category: 'Overhead Hazards', name: 'Power lines nearby (<10 ft)', description: 'Power lines close to work area', percentage: 15 },
  { id: 'overhead-3', category: 'Overhead Hazards', name: 'Communication lines', description: 'Cable/phone lines in work area', percentage: 8 },
  { id: 'overhead-4', category: 'Overhead Hazards', name: 'High voltage transmission', description: 'Major transmission lines nearby', percentage: 50 },
  { id: 'overhead-5', category: 'Overhead Hazards', name: 'Tree leaning toward lines', description: 'Tree growth direction toward utilities', percentage: 20 },
  { id: 'overhead-6', category: 'Overhead Hazards', name: 'Low clearance', description: 'Limited vertical clearance for equipment', percentage: 12 },

  // UNDERGROUND HAZARDS (5 factors)
  { id: 'underground-1', category: 'Underground Hazards', name: 'Utilities marked in area', description: 'Underground utilities present (811 marked)', percentage: 15 },
  { id: 'underground-2', category: 'Underground Hazards', name: 'Septic system nearby', description: 'Septic tank or drain field in work area', percentage: 20 },
  { id: 'underground-3', category: 'Underground Hazards', name: 'Irrigation lines', description: 'Sprinkler system in work area', percentage: 10 },
  { id: 'underground-4', category: 'Underground Hazards', name: 'Buried cables/conduit', description: 'Known underground electrical runs', percentage: 15 },
  { id: 'underground-5', category: 'Underground Hazards', name: 'Unknown underground', description: 'Old property, utilities unknown', percentage: 12 },

  // STRUCTURES & TARGETS (10 factors)
  { id: 'structure-1', category: 'Structures & Targets', name: 'Building within 50 ft', description: 'Structure in potential fall zone', percentage: 20 },
  { id: 'structure-2', category: 'Structures & Targets', name: 'Building within 20 ft', description: 'Structure very close to work', percentage: 35 },
  { id: 'structure-3', category: 'Structures & Targets', name: 'Fence in work area', description: 'Fence requiring protection or removal', percentage: 8 },
  { id: 'structure-4', category: 'Structures & Targets', name: 'Pool or spa', description: 'High-value water feature nearby', percentage: 30 },
  { id: 'structure-5', category: 'Structures & Targets', name: 'Deck or patio', description: 'Hardscape requiring protection', percentage: 12 },
  { id: 'structure-6', category: 'Structures & Targets', name: 'Landscape lighting', description: 'Lighting system in work area', percentage: 8 },
  { id: 'structure-7', category: 'Structures & Targets', name: 'HVAC equipment', description: 'AC unit or heat pump nearby', percentage: 15 },
  { id: 'structure-8', category: 'Structures & Targets', name: 'Vehicles must remain', description: 'Parked vehicles cannot be moved', percentage: 10 },
  { id: 'structure-9', category: 'Structures & Targets', name: 'Mature landscaping', description: 'High-value plants requiring protection', percentage: 12 },
  { id: 'structure-10', category: 'Structures & Targets', name: 'Play equipment', description: 'Playground or sports equipment present', percentage: 10 },

  // ENVIRONMENTAL & REGULATORY (7 factors)
  { id: 'environmental-1', category: 'Environmental & Regulatory', name: 'Protected species habitat', description: 'Endangered species or nesting area', percentage: 30 },
  { id: 'environmental-2', category: 'Environmental & Regulatory', name: 'Conservation easement', description: 'Restricted land use area', percentage: 25 },
  { id: 'environmental-3', category: 'Environmental & Regulatory', name: 'HOA approval required', description: 'Homeowners association oversight', percentage: 10 },
  { id: 'environmental-4', category: 'Environmental & Regulatory', name: 'City permit required', description: 'Municipal permit needed for work', percentage: 15 },
  { id: 'environmental-5', category: 'Environmental & Regulatory', name: 'Historical district', description: 'Work in historic preservation area', percentage: 20 },
  { id: 'environmental-6', category: 'Environmental & Regulatory', name: 'Near public road', description: 'Traffic control or flagging required', percentage: 10 },
  { id: 'environmental-7', category: 'Environmental & Regulatory', name: 'Noise restrictions', description: 'Limited work hours or noise constraints', percentage: 15 },
];

export default function AFISSFactorPicker({
  open,
  onClose,
  selectedFactors,
  onFactorsChange,
  serviceType,
}: AFISSFactorPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Group factors by category
  const categories = Array.from(new Set(afissFactors.map((f) => f.category)));

  const filteredFactors = afissFactors.filter((factor) =>
    factor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    factor.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFactorSelected = (factorId: string) => {
    return selectedFactors.some((f) => f.id === factorId);
  };

  const handleToggleFactor = (factor: AFISSFactor) => {
    if (isFactorSelected(factor.id)) {
      onFactorsChange(selectedFactors.filter((f) => f.id !== factor.id));
    } else {
      onFactorsChange([...selectedFactors, factor]);
    }
  };

  const handleClearAll = () => {
    onFactorsChange([]);
  };

  const totalIncrease = selectedFactors.reduce((sum, f) => sum + f.percentage, 0);

  return (
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Site Complexity Factors
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {selectedFactors.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Chip
              label={`+${totalIncrease}% total increase`}
              color="warning"
              sx={{ fontWeight: 600 }}
            />
            <Button size="small" onClick={handleClearAll}>
              Clear All
            </Button>
          </Box>
        )}

        <TextField
          placeholder="Search factors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box>
          {categories.map((category) => {
            const categoryFactors = filteredFactors.filter((f) => f.category === category);
            if (categoryFactors.length === 0 && searchQuery) return null;

            const selectedCount = categoryFactors.filter((f) => isFactorSelected(f.id)).length;

            return (
              <Accordion key={category} defaultExpanded={searchQuery !== ''}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {category}
                    </Typography>
                    {selectedCount > 0 && (
                      <Chip
                        label={selectedCount}
                        size="small"
                        color="primary"
                        sx={{ ml: 'auto', mr: 2 }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={0}>
                    {categoryFactors.map((factor) => (
                      <FormControlLabel
                        key={factor.id}
                        control={
                          <Checkbox
                            checked={isFactorSelected(factor.id)}
                            onChange={() => handleToggleFactor(factor)}
                          />
                        }
                        label={
                          <Box sx={{ py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {factor.name}
                              </Typography>
                              <Chip
                                label={`+${factor.percentage}%`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {factor.description}
                            </Typography>
                          </Box>
                        }
                        sx={{ ml: 0, alignItems: 'flex-start' }}
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {selectedFactors.length} factors selected
          </Typography>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
          >
            Done
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
