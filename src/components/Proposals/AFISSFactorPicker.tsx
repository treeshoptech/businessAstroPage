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

  // ENVIRONMENTAL & REGULATORY (9 factors)
  { id: 'environmental-1', category: 'Environmental & Regulatory', name: 'Protected species habitat', description: 'Endangered species or nesting area', percentage: 30 },
  { id: 'environmental-2', category: 'Environmental & Regulatory', name: 'Conservation easement', description: 'Restricted land use area', percentage: 25 },
  { id: 'environmental-3', category: 'Environmental & Regulatory', name: 'HOA approval required', description: 'Homeowners association oversight', percentage: 10 },
  { id: 'environmental-4', category: 'Environmental & Regulatory', name: 'City permit required', description: 'Municipal permit needed for work', percentage: 15 },
  { id: 'environmental-5', category: 'Environmental & Regulatory', name: 'Historical district', description: 'Work in historic preservation area', percentage: 20 },
  { id: 'environmental-6', category: 'Environmental & Regulatory', name: 'Near public road', description: 'Traffic control or flagging required', percentage: 10 },
  { id: 'environmental-7', category: 'Environmental & Regulatory', name: 'Noise restrictions', description: 'Limited work hours or noise constraints', percentage: 15 },
  { id: 'environmental-8', category: 'Environmental & Regulatory', name: 'Tree ordinance', description: 'City/county tree protection requirements', percentage: 18 },
  { id: 'environmental-9', category: 'Environmental & Regulatory', name: 'Flood zone restrictions', description: 'Work in FEMA flood zone', percentage: 15 },

  // TREE CONDITIONS (8 factors)
  { id: 'tree-1', category: 'Tree Conditions', name: 'Dead/hazard tree', description: 'Structurally unsound tree requiring extra precaution', percentage: 15 },
  { id: 'tree-2', category: 'Tree Conditions', name: 'Leaning tree', description: 'Tree with significant lean', percentage: 20 },
  { id: 'tree-3', category: 'Tree Conditions', name: 'Multi-trunk tree', description: 'Multiple stems requiring separate rigging', percentage: 10 },
  { id: 'tree-4', category: 'Tree Conditions', name: 'Rotten wood', description: 'Decay present in trunk or major limbs', percentage: 18 },
  { id: 'tree-5', category: 'Tree Conditions', name: 'Included bark', description: 'Weak branch unions', percentage: 12 },
  { id: 'tree-6', category: 'Tree Conditions', name: 'Codominant stems', description: 'Two or more competing leaders', percentage: 15 },
  { id: 'tree-7', category: 'Tree Conditions', name: 'Vines/ivy covering', description: 'Heavy vine growth obscuring structure', percentage: 10 },
  { id: 'tree-8', category: 'Tree Conditions', name: 'Storm damage present', description: 'Broken limbs or split trunk', percentage: 25 },

  // WEATHER & SEASONAL (5 factors)
  { id: 'weather-1', category: 'Weather & Seasonal', name: 'Hot weather (>95°F)', description: 'Extreme heat affecting crew safety', percentage: 10 },
  { id: 'weather-2', category: 'Weather & Seasonal', name: 'Cold weather (<35°F)', description: 'Cold affecting equipment and crew', percentage: 12 },
  { id: 'weather-3', category: 'Weather & Seasonal', name: 'Rain in forecast', description: 'Weather delays likely', percentage: 15 },
  { id: 'weather-4', category: 'Weather & Seasonal', name: 'Leaf-on season', description: 'Trees fully leafed, reduced visibility', percentage: 8 },
  { id: 'weather-5', category: 'Weather & Seasonal', name: 'Windy conditions', description: 'Wind affecting safety and precision', percentage: 20 },

  // CUSTOMER REQUIREMENTS (6 factors)
  { id: 'customer-1', category: 'Customer Requirements', name: 'Customer must be present', description: 'Owner requires supervision throughout', percentage: 5 },
  { id: 'customer-2', category: 'Customer Requirements', name: 'Save specific branches', description: 'Selective cutting requirements', percentage: 12 },
  { id: 'customer-3', category: 'Customer Requirements', name: 'Wood/logs to remain', description: 'Customer wants firewood left on-site', percentage: 8 },
  { id: 'customer-4', category: 'Customer Requirements', name: 'Minimal ground impact', description: 'Protect lawn/landscaping meticulously', percentage: 15 },
  { id: 'customer-5', category: 'Customer Requirements', name: 'After-hours work', description: 'Evening or weekend work required', percentage: 25 },
  { id: 'customer-6', category: 'Customer Requirements', name: 'Multiple property owners', description: 'Shared tree or property line work', percentage: 18 },

  // EQUIPMENT & LOGISTICS (7 factors)
  { id: 'equipment-1', category: 'Equipment & Logistics', name: 'Crane required', description: 'Job requires crane rental', percentage: 30 },
  { id: 'equipment-2', category: 'Equipment & Logistics', name: 'Specialized rigging', description: 'Complex rigging setup needed', percentage: 20 },
  { id: 'equipment-3', category: 'Equipment & Logistics', name: 'Hand-work percentage high', description: '>50% manual labor vs. equipment', percentage: 25 },
  { id: 'equipment-4', category: 'Equipment & Logistics', name: 'Limited staging area', description: 'No space for equipment/debris staging', percentage: 15 },
  { id: 'equipment-5', category: 'Equipment & Logistics', name: 'Trailer positioning difficult', description: 'Cannot position chipper optimally', percentage: 10 },
  { id: 'equipment-6', category: 'Equipment & Logistics', name: 'Fuel/water not available', description: 'Must bring all supplies', percentage: 8 },
  { id: 'equipment-7', category: 'Equipment & Logistics', name: 'Equipment breakdown risk', description: 'Old/unreliable equipment for this job', percentage: 15 },

  // CREW FACTORS (5 factors)
  { id: 'crew-1', category: 'Crew Factors', name: 'Training crew', description: 'Inexperienced crew member learning', percentage: 20 },
  { id: 'crew-2', category: 'Crew Factors', name: 'Short-handed crew', description: 'Missing typical crew member', percentage: 25 },
  { id: 'crew-3', category: 'Crew Factors', name: 'Multiple small crews', description: 'Split crew across multiple sites', percentage: 15 },
  { id: 'crew-4', category: 'Crew Factors', name: 'Temporary crew member', description: 'Unfamiliar crew member substituted', percentage: 12 },
  { id: 'crew-5', category: 'Crew Factors', name: 'First job of season', description: 'Crew getting back into rhythm', percentage: 10 },

  // DEBRIS & CLEANUP (6 factors)
  { id: 'debris-1', category: 'Debris & Cleanup', name: 'All wood must be removed', description: 'Cannot leave any wood or mulch on-site', percentage: 15 },
  { id: 'debris-2', category: 'Debris & Cleanup', name: 'Hand-rake cleanup required', description: 'Meticulous manual cleanup needed', percentage: 20 },
  { id: 'debris-3', category: 'Debris & Cleanup', name: 'Dump closed/restricted', description: 'Limited debris disposal options', percentage: 12 },
  { id: 'debris-4', category: 'Debris & Cleanup', name: 'Hazardous material present', description: 'Treated wood or contaminated material', percentage: 30 },
  { id: 'debris-5', category: 'Debris & Cleanup', name: 'Debris through house', description: 'Must carry debris through structure', percentage: 40 },
  { id: 'debris-6', category: 'Debris & Cleanup', name: 'Stump chips must be removed', description: 'Cannot leave grinding debris', percentage: 10 },

  // SAFETY & PPE (5 factors)
  { id: 'safety-1', category: 'Safety & PPE', name: 'Confined space entry', description: 'Work in enclosed area requiring monitoring', percentage: 25 },
  { id: 'safety-2', category: 'Safety & PPE', name: 'High-visibility requirement', description: 'Hi-vis clothing and cones required', percentage: 5 },
  { id: 'safety-3', category: 'Safety & PPE', name: 'Spotter required full-time', description: 'Dedicated safety observer needed', percentage: 15 },
  { id: 'safety-4', category: 'Safety & PPE', name: 'Respiratory protection', description: 'Masks/respirators required for conditions', percentage: 10 },
  { id: 'safety-5', category: 'Safety & PPE', name: 'Fall protection rigging', description: 'Additional fall arrest systems needed', percentage: 20 },

  // TIME CONSTRAINTS (4 factors)
  { id: 'time-1', category: 'Time Constraints', name: 'Rush job (<48 hrs)', description: 'Emergency or urgent timeline', percentage: 30 },
  { id: 'time-2', category: 'Time Constraints', name: 'Limited work window', description: 'Restricted hours (e.g., 9am-3pm only)', percentage: 20 },
  { id: 'time-3', category: 'Time Constraints', name: 'Work during event', description: 'Event on property during work', percentage: 25 },
  { id: 'time-4', category: 'Time Constraints', name: 'Multiple-day staging', description: 'Job spans multiple non-consecutive days', percentage: 15 },

  // COMMUNICATION & ACCESS (4 factors)
  { id: 'communication-1', category: 'Communication & Access', name: 'Language barrier', description: 'Communication challenges with customer', percentage: 8 },
  { id: 'communication-2', category: 'Communication & Access', name: 'Remote property', description: 'Limited cell service at site', percentage: 10 },
  { id: 'communication-3', category: 'Communication & Access', name: 'Gated community', description: 'Security and access protocols', percentage: 5 },
  { id: 'communication-4', category: 'Communication & Access', name: 'Pet management', description: 'Aggressive or loose pets on property', percentage: 12 },

  // LEGAL & LIABILITY (5 factors)
  { id: 'legal-1', category: 'Legal & Liability', name: 'Property line dispute', description: 'Unclear or disputed boundary', percentage: 25 },
  { id: 'legal-2', category: 'Legal & Liability', name: 'Threatened litigation', description: 'Customer has mentioned legal action', percentage: 50 },
  { id: 'legal-3', category: 'Legal & Liability', name: 'High-value property', description: 'Property >$1M, increased liability', percentage: 15 },
  { id: 'legal-4', category: 'Legal & Liability', name: 'Neighboring complaints', description: 'Known neighbor disputes or complaints', percentage: 20 },
  { id: 'legal-5', category: 'Legal & Liability', name: 'Documentation heavy', description: 'Customer requires extensive documentation', percentage: 10 },

  // OPERATIONAL COMPLEXITY (4 factors)
  { id: 'operational-1', category: 'Operational Complexity', name: 'Coordinating with others', description: 'Must coordinate with other contractors', percentage: 15 },
  { id: 'operational-2', category: 'Operational Complexity', name: 'Multi-phase project', description: 'Work split across multiple phases', percentage: 20 },
  { id: 'operational-3', category: 'Operational Complexity', name: 'Utility coordination', description: 'Must coordinate utility shutoff/service', percentage: 18 },
  { id: 'operational-4', category: 'Operational Complexity', name: 'Inspection required', description: 'City/county inspection needed during work', percentage: 12 },
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
