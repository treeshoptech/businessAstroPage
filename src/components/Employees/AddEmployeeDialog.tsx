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
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface AddEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: Id<"organizations">;
}

const positionOptions = [
  { value: 'entry_ground_crew', label: 'Entry Ground Crew', defaultBurden: 1.6 },
  { value: 'experienced_climber', label: 'Experienced Climber', defaultBurden: 1.7 },
  { value: 'crew_leader', label: 'Crew Leader', defaultBurden: 1.8 },
  { value: 'certified_arborist', label: 'Certified Arborist', defaultBurden: 1.9 },
  { value: 'specialized_operator', label: 'Specialized Operator', defaultBurden: 2.0 },
];

export default function AddEmployeeDialog({ open, onClose, organizationId }: AddEmployeeDialogProps) {
  const createEmployee = useMutation(api.employees.create);

  const [name, setName] = useState('');
  const [position, setPosition] = useState<'entry_ground_crew' | 'experienced_climber' | 'crew_leader' | 'certified_arborist' | 'specialized_operator'>('entry_ground_crew');
  const [baseHourlyRate, setBaseHourlyRate] = useState('');
  const [burdenMultiplier, setBurdenMultiplier] = useState('1.6');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Calculate true cost
  const trueCost = useMemo(() => {
    const base = parseFloat(baseHourlyRate) || 0;
    const burden = parseFloat(burdenMultiplier) || 0;
    return base * burden;
  }, [baseHourlyRate, burdenMultiplier]);

  const handlePositionChange = (newPosition: string) => {
    setPosition(newPosition as any);
    const selectedPosition = positionOptions.find(p => p.value === newPosition);
    if (selectedPosition) {
      setBurdenMultiplier(selectedPosition.defaultBurden.toString());
    }
  };

  const handleSubmit = async () => {
    if (!name || !baseHourlyRate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createEmployee({
        organizationId,
        name,
        position,
        baseHourlyRate: parseFloat(baseHourlyRate),
        burdenMultiplier: parseFloat(burdenMultiplier),
        hireDate: new Date(hireDate).getTime(),
        status,
      });

      // Reset form
      setName('');
      setPosition('entry_ground_crew');
      setBaseHourlyRate('');
      setBurdenMultiplier('1.6');
      setHireDate(new Date().toISOString().split('T')[0]);
      setStatus('active');

      onClose();
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Failed to create employee. Please try again.');
    }
  };

  const handleClose = () => {
    setName('');
    setPosition('entry_ground_crew');
    setBaseHourlyRate('');
    setBurdenMultiplier('1.6');
    setHireDate(new Date().toISOString().split('T')[0]);
    setStatus('active');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Employee</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Name */}
          <TextField
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />

          {/* Position */}
          <TextField
            select
            label="Position"
            value={position}
            onChange={(e) => handlePositionChange(e.target.value)}
            required
            fullWidth
          >
            {positionOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Base Hourly Rate */}
          <TextField
            label="Base Hourly Rate"
            type="number"
            value={baseHourlyRate}
            onChange={(e) => setBaseHourlyRate(e.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>,
            }}
            helperText="Employee's base wage per hour"
          />

          {/* Burden Multiplier */}
          <TextField
            label="Burden Multiplier"
            type="number"
            value={burdenMultiplier}
            onChange={(e) => setBurdenMultiplier(e.target.value)}
            required
            fullWidth
            inputProps={{
              step: 0.1,
              min: 1.0,
              max: 3.0,
            }}
            helperText="Includes taxes, insurance, overhead (1.6-2.0 typical)"
          />

          {/* True Cost Display */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#0a0a0a',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              True Cost Per Hour
            </Typography>
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 700 }}>
              ${trueCost.toFixed(2)}/hr
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Base Rate × Burden Multiplier
            </Typography>
          </Box>

          {/* Hire Date */}
          <TextField
            label="Hire Date"
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            required
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />

          {/* Status */}
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            required
            fullWidth
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Add Employee
        </Button>
      </DialogActions>
    </Dialog>
  );
}
