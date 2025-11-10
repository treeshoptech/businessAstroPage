import React, { useState, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface TreeShopCodeBuilderProps {
  open: boolean;
  onClose: () => void;
  employee: {
    _id: Id<"employees">;
    name: string;
    baseHourlyRate: number;
  };
}

// 16 Career Tracks
const careerTracks = [
  { code: 'ATC', name: 'Arboriculture & Tree Care', category: 'Field Operations' },
  { code: 'TRS', name: 'Tree Removal & Rigging', category: 'Field Operations' },
  { code: 'FOR', name: 'Forestry & Land Management', category: 'Field Operations' },
  { code: 'LCL', name: 'Land Clearing & Excavation', category: 'Field Operations' },
  { code: 'MUL', name: 'Mulching & Material Processing', category: 'Field Operations' },
  { code: 'STG', name: 'Stump Grinding & Site Restoration', category: 'Field Operations' },
  { code: 'ESR', name: 'Emergency & Storm Response', category: 'Field Operations' },
  { code: 'LSC', name: 'Landscaping & Grounds', category: 'Field Operations' },
  { code: 'EQO', name: 'Equipment Operations', category: 'Equipment & Maintenance' },
  { code: 'MNT', name: 'Maintenance & Repair', category: 'Equipment & Maintenance' },
  { code: 'SAL', name: 'Sales & Business Development', category: 'Business Operations' },
  { code: 'PMC', name: 'Project Management & Coordination', category: 'Business Operations' },
  { code: 'ADM', name: 'Administrative & Office Operations', category: 'Business Operations' },
  { code: 'FIN', name: 'Financial & Accounting', category: 'Business Operations' },
  { code: 'SAF', name: 'Safety & Compliance', category: 'Business Operations' },
  { code: 'TEC', name: 'Technology & Systems', category: 'Business Operations' },
];

// Tier multipliers
const tierData = [
  { tier: 1, experience: '0-6 months', multiplier: 1.6, description: 'Foundation Building' },
  { tier: 2, experience: '6-18 months', multiplier: 1.7, description: 'Skill Development' },
  { tier: 3, experience: '18mo-3yrs', multiplier: 1.8, description: 'Professional Competence' },
  { tier: 4, experience: '3-5 years', multiplier: 2.0, description: 'Advanced Leadership' },
  { tier: 5, experience: '5+ years', multiplier: 2.2, description: 'Master Level' },
];

// Leadership add-ons
const leadershipOptions = [
  { code: 'L', name: 'Team Leader', premium: 3.00 },
  { code: 'S', name: 'Supervisor', premium: 7.00 },
  { code: 'M', name: 'Manager', premium: 0 }, // Salary-based
  { code: 'D', name: 'Director', premium: 0 }, // Salary-based
];

// Equipment levels
const equipmentLevels = [
  { level: 1, name: 'Basic', premium: 0, description: 'Standard equipment operation' },
  { level: 2, name: 'Intermediate', premium: 1.50, description: 'Complex equipment scenarios' },
  { level: 3, name: 'Advanced', premium: 4.00, description: 'Bucket trucks, cranes, complex rigging' },
  { level: 4, name: 'Specialized', premium: 7.00, description: 'Night ops, emergency ops, manicured environments' },
];

// Driver classifications
const driverLevels = [
  { level: 1, name: 'Standard', premium: 0, description: 'Regular license' },
  { level: 2, name: 'CDL-B', premium: 2.00, description: 'Commercial license' },
  { level: 3, name: 'CDL-A', premium: 3.00, description: 'Can operate any vehicle' },
];

// Professional credentials
const credentials = [
  { code: 'CRA', name: 'Crane Operator (NCCCO)', premium: 4.00 },
  { code: 'ISA', name: 'ISA Arborist', premium: 3.00 },
  { code: 'OSHA', name: 'OSHA Trainer', premium: 2.00 },
];

export default function TreeShopCodeBuilder({ open, onClose, employee }: TreeShopCodeBuilderProps) {
  const updateEmployee = useMutation(api.employees.update);

  const [primaryTrack, setPrimaryTrack] = useState('');
  const [tier, setTier] = useState(1);
  const [leadership, setLeadership] = useState('');
  const [equipment, setEquipment] = useState(1);
  const [driver, setDriver] = useState(1);
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);

  // Calculate qualification pay rate
  const qualificationPayRate = useMemo(() => {
    const baseRate = employee.baseHourlyRate;
    const selectedTier = tierData.find(t => t.tier === tier);
    if (!selectedTier) return baseRate;

    // Apply tier multiplier
    let rate = baseRate * selectedTier.multiplier;

    // Add leadership premium
    const leadershipData = leadershipOptions.find(l => l.code === leadership);
    if (leadershipData && leadershipData.premium > 0) {
      rate += leadershipData.premium;
    }

    // Add equipment premium
    const equipmentData = equipmentLevels.find(e => e.level === equipment);
    if (equipmentData) {
      rate += equipmentData.premium;
    }

    // Add driver premium
    const driverData = driverLevels.find(d => d.level === driver);
    if (driverData) {
      rate += driverData.premium;
    }

    // Add credential premiums
    selectedCredentials.forEach(credCode => {
      const cred = credentials.find(c => c.code === credCode);
      if (cred) {
        rate += cred.premium;
      }
    });

    return rate;
  }, [employee.baseHourlyRate, tier, leadership, equipment, driver, selectedCredentials]);

  // Calculate true business cost (qualification rate × 1.7)
  const trueCost = qualificationPayRate * 1.7;

  // Build TreeShop code
  const treeShopCode = useMemo(() => {
    if (!primaryTrack) return '';

    let code = `${primaryTrack}${tier}`;

    if (leadership) code += `+${leadership}`;
    if (equipment > 1) code += `+E${equipment}`;
    if (driver > 1) code += `+D${driver}`;
    selectedCredentials.forEach(cred => {
      code += `+${cred}`;
    });

    return code;
  }, [primaryTrack, tier, leadership, equipment, driver, selectedCredentials]);

  const handleCredentialToggle = (credCode: string) => {
    setSelectedCredentials(prev =>
      prev.includes(credCode)
        ? prev.filter(c => c !== credCode)
        : [...prev, credCode]
    );
  };

  const handleSave = async () => {
    if (!primaryTrack) {
      alert('Please select a career track');
      return;
    }

    try {
      await updateEmployee({
        id: employee._id,
        name: employee.name,
        position: 'specialized_operator', // Upgrade to highest tier
        baseHourlyRate: employee.baseHourlyRate,
        burdenMultiplier: 1.7, // Standard TreeShop burden
        hireDate: Date.now(), // This should come from existing employee
        status: 'active',
        treeShopCode,
        treeShopPrimaryTrack: primaryTrack,
        treeShopTier: tier,
        treeShopLeadership: leadership || undefined,
        treeShopEquipment: equipment,
        treeShopDriver: driver,
        treeShopCredentials: selectedCredentials,
        treeShopCrossTraining: [], // Can be added later
        treeShopQualificationPayRate: qualificationPayRate,
      });

      onClose();
    } catch (error) {
      console.error('Failed to upgrade employee:', error);
      alert('Failed to upgrade employee. Please try again.');
    }
  };

  // Group tracks by category
  const tracksByCategory = useMemo(() => {
    const grouped: Record<string, typeof careerTracks> = {};
    careerTracks.forEach(track => {
      if (!grouped[track.category]) {
        grouped[track.category] = [];
      }
      grouped[track.category].push(track);
    });
    return grouped;
  }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6">TreeShop Employee Code Builder</Typography>
          <Typography variant="body2" color="text.secondary">
            Upgrade {employee.name} to TreeShop coding system
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Career Track Selection */}
          <Box>
            <FormControl fullWidth>
              <FormLabel>Primary Career Track</FormLabel>
              <TextField
                select
                value={primaryTrack}
                onChange={(e) => setPrimaryTrack(e.target.value)}
                size="small"
                sx={{ mt: 1 }}
              >
                {Object.entries(tracksByCategory).map(([category, tracks]) => [
                  <MenuItem key={category} disabled sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'primary.main' }}>
                    {category}
                  </MenuItem>,
                  ...tracks.map(track => (
                    <MenuItem key={track.code} value={track.code}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={track.code} size="small" sx={{ minWidth: 50 }} />
                        <Typography variant="body2">{track.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))
                ])}
              </TextField>
            </FormControl>
          </Box>

          {/* Tier Selection */}
          <Box>
            <FormLabel>Experience Tier</FormLabel>
            <TextField
              select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
              size="small"
              fullWidth
              sx={{ mt: 1 }}
            >
              {tierData.map(t => (
                <MenuItem key={t.tier} value={t.tier}>
                  <Box>
                    <Typography variant="body2">
                      Tier {t.tier} - {t.description} ({t.multiplier}x)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.experience}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider />

          {/* Add-On Qualifications */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Add-On Qualifications</Typography>

          {/* Leadership */}
          <Box>
            <FormLabel>Leadership (+L, +S, +M, +D)</FormLabel>
            <TextField
              select
              value={leadership}
              onChange={(e) => setLeadership(e.target.value)}
              size="small"
              fullWidth
              sx={{ mt: 1 }}
            >
              <MenuItem value="">None</MenuItem>
              {leadershipOptions.map(l => (
                <MenuItem key={l.code} value={l.code}>
                  {l.name} {l.premium > 0 ? `(+$${l.premium.toFixed(2)}/hr)` : '(Salary-based)'}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Equipment */}
          <Box>
            <FormLabel>Equipment Level (+E1, +E2, +E3, +E4)</FormLabel>
            <TextField
              select
              value={equipment}
              onChange={(e) => setEquipment(Number(e.target.value))}
              size="small"
              fullWidth
              sx={{ mt: 1 }}
            >
              {equipmentLevels.map(e => (
                <MenuItem key={e.level} value={e.level}>
                  <Box>
                    <Typography variant="body2">
                      {e.name} {e.premium > 0 ? `(+$${e.premium.toFixed(2)}/hr)` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Driver */}
          <Box>
            <FormLabel>Driver Classification (+D1, +D2, +D3)</FormLabel>
            <TextField
              select
              value={driver}
              onChange={(e) => setDriver(Number(e.target.value))}
              size="small"
              fullWidth
              sx={{ mt: 1 }}
            >
              {driverLevels.map(d => (
                <MenuItem key={d.level} value={d.level}>
                  {d.name} {d.premium > 0 ? `(+$${d.premium.toFixed(2)}/hr)` : ''} - {d.description}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Credentials */}
          <Box>
            <FormLabel>Professional Credentials</FormLabel>
            <FormGroup sx={{ mt: 1 }}>
              {credentials.map(cred => (
                <FormControlLabel
                  key={cred.code}
                  control={
                    <Checkbox
                      checked={selectedCredentials.includes(cred.code)}
                      onChange={() => handleCredentialToggle(cred.code)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      +{cred.code}: {cred.name} (+${cred.premium.toFixed(2)}/hr)
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
          </Box>

          <Divider />

          {/* Code Preview & Calculation */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#0a0a0a',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              TreeShop Employee Code
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', color: 'primary.main', mb: 2 }}>
              {treeShopCode || '[Select track and qualifications]'}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Base Rate:</Typography>
                <Typography variant="body2">${employee.baseHourlyRate.toFixed(2)}/hr</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Qualification Pay Rate:</Typography>
                <Typography variant="h6" sx={{ color: 'success.main' }}>
                  ${qualificationPayRate.toFixed(2)}/hr
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">True Business Cost (×1.7):</Typography>
                <Typography variant="body2" sx={{ color: 'warning.main' }}>
                  ${trueCost.toFixed(2)}/hr
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={!primaryTrack}>
          Upgrade to TreeShop Code
        </Button>
      </DialogActions>
    </Dialog>
  );
}
