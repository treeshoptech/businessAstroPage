import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface AddProjectDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

const serviceTypes = [
  { value: 'forestry_mulching', label: 'Forestry Mulching' },
  { value: 'stump_grinding', label: 'Stump Grinding' },
  { value: 'land_clearing', label: 'Land Clearing' },
  { value: 'tree_removal', label: 'Tree Removal' },
  { value: 'tree_trimming', label: 'Tree Trimming' },
  { value: 'property_assessment', label: 'Property Assessment' },
];

const siteHazardOptions = [
  'Wetlands present',
  'Large ditches or drainage',
  'Protected animal habitats',
  'Steep slopes',
  'Underground utilities',
  'Overhead power lines',
  'Property boundary concerns',
];

export default function AddProjectDialog({ open, onClose, organizationId }: AddProjectDialogProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    serviceType: 'forestry_mulching',
    projectIntent: '',
    driveTimeMinutes: 0,
    treeShopScore: 0,
  });
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const createProject = useMutation(api.projects.create);
  const customers = useQuery(api.customers.list, {
    organizationId: organizationId as Id<"organizations">
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'driveTimeMinutes' || field === 'treeShopScore'
      ? parseFloat(event.target.value) || 0
      : event.target.value;

    setFormData({ ...formData, [field]: value });
  };

  const handleHazardToggle = (hazard: string) => {
    setSelectedHazards(prev =>
      prev.includes(hazard)
        ? prev.filter(h => h !== hazard)
        : [...prev, hazard]
    );
  };

  const handleSubmit = async () => {
    if (!formData.customerId) {
      setSnackbar({
        open: true,
        message: 'Please select a customer',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      await createProject({
        organizationId: organizationId as Id<"organizations">,
        customerId: formData.customerId as Id<"customers">,
        serviceType: formData.serviceType as any,
        projectIntent: formData.projectIntent || undefined,
        driveTimeMinutes: formData.driveTimeMinutes > 0 ? formData.driveTimeMinutes : undefined,
        treeShopScore: formData.treeShopScore > 0 ? formData.treeShopScore : undefined,
        siteHazards: selectedHazards.length > 0 ? selectedHazards : undefined,
      });

      setSnackbar({
        open: true,
        message: 'Lead created successfully!',
        severity: 'success'
      });

      setTimeout(() => {
        onClose();
        setFormData({
          customerId: '',
          serviceType: 'forestry_mulching',
          projectIntent: '',
          driveTimeMinutes: 0,
          treeShopScore: 0,
        });
        setSelectedHazards([]);
      }, 1500);
    } catch (error) {
      console.error('Error creating lead:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create lead',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid', borderColor: 'divider' }}>
          Create New Lead
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0a0a0a', pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              select
              label="Customer"
              value={formData.customerId}
              onChange={handleChange('customerId')}
              fullWidth
              variant="outlined"
              required
            >
              {customers?.map((customer) => (
                <MenuItem key={customer._id} value={customer._id}>
                  {customer.name} - {customer.propertyAddress}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Service Type"
              value={formData.serviceType}
              onChange={handleChange('serviceType')}
              fullWidth
              variant="outlined"
            >
              {serviceTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Project Intent"
              value={formData.projectIntent}
              onChange={handleChange('projectIntent')}
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              placeholder="What's the goal for this project?"
            />

            <TextField
              label="Drive Time (minutes)"
              type="number"
              value={formData.driveTimeMinutes}
              onChange={handleChange('driveTimeMinutes')}
              fullWidth
              variant="outlined"
              inputProps={{ min: 0 }}
            />

            <TextField
              label="TreeShop Score (optional)"
              type="number"
              value={formData.treeShopScore}
              onChange={handleChange('treeShopScore')}
              fullWidth
              variant="outlined"
              inputProps={{ min: 0, step: 0.1 }}
            />

            <FormControl component="fieldset" variant="standard">
              <FormLabel component="legend" sx={{ mb: 1 }}>Site Hazards</FormLabel>
              <FormGroup>
                {siteHazardOptions.map((hazard) => (
                  <FormControlLabel
                    key={hazard}
                    control={
                      <Checkbox
                        checked={selectedHazards.includes(hazard)}
                        onChange={() => handleHazardToggle(hazard)}
                      />
                    }
                    label={hazard}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0a0a0a', borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 100 }}
          >
            {loading ? 'Creating...' : 'Create Lead'}
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
