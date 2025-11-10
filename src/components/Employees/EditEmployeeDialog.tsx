import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface Employee {
  _id: Id<"users">;
  name: string;
  email: string;
  role: string;
  position?: string;
  baseHourlyRate?: number;
  burdenMultiplier?: number;
  hireDate?: number;
  status?: "active" | "inactive";
}

interface EditEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

export default function EditEmployeeDialog({ open, onClose, employee }: EditEmployeeDialogProps) {
  const [formData, setFormData] = useState({
    position: employee.position || '',
    baseHourlyRate: employee.baseHourlyRate || 0,
    burdenMultiplier: employee.burdenMultiplier || 1.7,
    hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
    status: employee.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const updateUser = useMutation(api.users.update);

  useEffect(() => {
    setFormData({
      position: employee.position || '',
      baseHourlyRate: employee.baseHourlyRate || 0,
      burdenMultiplier: employee.burdenMultiplier || 1.7,
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      status: employee.status || 'active',
    });
  }, [employee]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'baseHourlyRate' || field === 'burdenMultiplier'
      ? parseFloat(event.target.value) || 0
      : event.target.value;

    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUser({
        id: employee._id,
        position: formData.position || undefined,
        baseHourlyRate: formData.baseHourlyRate > 0 ? formData.baseHourlyRate : undefined,
        burdenMultiplier: formData.burdenMultiplier > 0 ? formData.burdenMultiplier : undefined,
        hireDate: formData.hireDate ? new Date(formData.hireDate).getTime() : undefined,
        status: formData.status as "active" | "inactive",
      });

      setSnackbar({
        open: true,
        message: 'Employee details updated successfully!',
        severity: 'success'
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating employee:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update employee details',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const trueCost = formData.baseHourlyRate && formData.burdenMultiplier
    ? formData.baseHourlyRate * formData.burdenMultiplier
    : 0;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid', borderColor: 'divider' }}>
          Edit Employee Details
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0a0a0a', pt: 3 }}>
          <Box sx={{ mb: 2, p: 2, bgcolor: '#141414', borderRadius: 1 }}>
            <Box sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>Employee</Box>
            <Box sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>{employee.name}</Box>
            <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{employee.email}</Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Position/Title"
              value={formData.position}
              onChange={handleChange('position')}
              fullWidth
              variant="outlined"
              placeholder="e.g., Crew Leader, Arborist, Equipment Operator"
            />

            <TextField
              label="Base Hourly Rate"
              type="number"
              value={formData.baseHourlyRate}
              onChange={handleChange('baseHourlyRate')}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: <Box sx={{ mr: 1, color: 'text.secondary' }}>$</Box>,
              }}
              inputProps={{ min: 0, step: 0.5 }}
            />

            <TextField
              label="Burden Multiplier"
              type="number"
              value={formData.burdenMultiplier}
              onChange={handleChange('burdenMultiplier')}
              fullWidth
              variant="outlined"
              helperText="Typical: Entry 1.6x, Climber 1.7x, Leader 1.8x, Arborist 1.9x, Specialist 2.0x"
              inputProps={{ min: 1.0, max: 3.0, step: 0.1 }}
            />

            {trueCost > 0 && (
              <Box sx={{ p: 2, bgcolor: '#141414', borderRadius: 1 }}>
                <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 0.5 }}>
                  True Cost Per Hour
                </Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'success.main' }}>
                  ${trueCost.toFixed(2)}
                </Box>
                <Box sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5 }}>
                  ${formData.baseHourlyRate.toFixed(2)} × {formData.burdenMultiplier.toFixed(1)}x
                </Box>
              </Box>
            )}

            <TextField
              label="Hire Date"
              type="date"
              value={formData.hireDate}
              onChange={handleChange('hireDate')}
              fullWidth
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={handleChange('status')}
              fullWidth
              variant="outlined"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0a0a0a', borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 100 }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
