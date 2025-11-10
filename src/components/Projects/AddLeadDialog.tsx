import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface AddLeadDialogProps {
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

export default function AddLeadDialog({ open, onClose, organizationId }: AddLeadDialogProps) {
  // Customer Data
  const [customerData, setCustomerData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    propertyAddress: '',
    propertyCity: '',
    propertyState: 'FL',
    propertyZip: '',
    notes: '',
  });

  // Project Data
  const [projectData, setProjectData] = useState({
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

  const createCustomer = useMutation(api.customers.create);
  const createProject = useMutation(api.projects.create);

  const handleCustomerChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerData({ ...customerData, [field]: event.target.value });
  };

  const handleProjectChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'driveTimeMinutes' || field === 'treeShopScore'
      ? parseFloat(event.target.value) || 0
      : event.target.value;

    setProjectData({ ...projectData, [field]: value });
  };

  const handleHazardToggle = (hazard: string) => {
    setSelectedHazards(prev =>
      prev.includes(hazard)
        ? prev.filter(h => h !== hazard)
        : [...prev, hazard]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!customerData.name.trim()) {
      setSnackbar({ open: true, message: 'Customer name is required', severity: 'error' });
      return;
    }
    if (!customerData.propertyAddress.trim()) {
      setSnackbar({ open: true, message: 'Property address is required', severity: 'error' });
      return;
    }
    if (!customerData.propertyCity.trim()) {
      setSnackbar({ open: true, message: 'City is required', severity: 'error' });
      return;
    }
    if (!customerData.propertyZip.trim()) {
      setSnackbar({ open: true, message: 'ZIP code is required', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create the customer
      const customerId = await createCustomer({
        organizationId: organizationId as Id<"organizations">,
        name: customerData.name,
        company: customerData.company || undefined,
        email: customerData.email || undefined,
        phone: customerData.phone || undefined,
        propertyAddress: customerData.propertyAddress,
        propertyCity: customerData.propertyCity,
        propertyState: customerData.propertyState,
        propertyZip: customerData.propertyZip,
        notes: customerData.notes || undefined,
      });

      // Step 2: Create the project (lead) linked to the new customer
      await createProject({
        organizationId: organizationId as Id<"organizations">,
        customerId: customerId as Id<"customers">,
        serviceType: projectData.serviceType as any,
        projectIntent: projectData.projectIntent || undefined,
        driveTimeMinutes: projectData.driveTimeMinutes > 0 ? projectData.driveTimeMinutes : undefined,
        treeShopScore: projectData.treeShopScore > 0 ? projectData.treeShopScore : undefined,
        siteHazards: selectedHazards.length > 0 ? selectedHazards : undefined,
      });

      setSnackbar({
        open: true,
        message: 'Lead and customer created successfully!',
        severity: 'success'
      });

      // Reset form
      setTimeout(() => {
        setCustomerData({
          name: '',
          company: '',
          email: '',
          phone: '',
          propertyAddress: '',
          propertyCity: '',
          propertyState: 'FL',
          propertyZip: '',
          notes: '',
        });
        setProjectData({
          serviceType: 'forestry_mulching',
          projectIntent: '',
          driveTimeMinutes: 0,
          treeShopScore: 0,
        });
        setSelectedHazards([]);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error creating lead:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create lead. Please try again.',
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Customer Information Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                Customer Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Customer Name"
                    value={customerData.name}
                    onChange={handleCustomerChange('name')}
                    fullWidth
                    required
                    variant="outlined"
                  />
                  <TextField
                    label="Company (optional)"
                    value={customerData.company}
                    onChange={handleCustomerChange('company')}
                    fullWidth
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Email"
                    type="email"
                    value={customerData.email}
                    onChange={handleCustomerChange('email')}
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    label="Phone"
                    value={customerData.phone}
                    onChange={handleCustomerChange('phone')}
                    fullWidth
                    variant="outlined"
                    placeholder="(555) 555-5555"
                  />
                </Box>

                <TextField
                  label="Property Address"
                  value={customerData.propertyAddress}
                  onChange={handleCustomerChange('propertyAddress')}
                  fullWidth
                  required
                  variant="outlined"
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="City"
                    value={customerData.propertyCity}
                    onChange={handleCustomerChange('propertyCity')}
                    fullWidth
                    required
                    variant="outlined"
                  />
                  <TextField
                    label="State"
                    value={customerData.propertyState}
                    onChange={handleCustomerChange('propertyState')}
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    label="ZIP Code"
                    value={customerData.propertyZip}
                    onChange={handleCustomerChange('propertyZip')}
                    fullWidth
                    required
                    variant="outlined"
                  />
                </Box>

                <TextField
                  label="Notes (optional)"
                  value={customerData.notes}
                  onChange={handleCustomerChange('notes')}
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={2}
                  placeholder="Any special notes about this customer or property"
                />
              </Box>
            </Box>

            <Divider />

            {/* Project Information Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                Project Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Service Type"
                  value={projectData.serviceType}
                  onChange={handleProjectChange('serviceType')}
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
                  value={projectData.projectIntent}
                  onChange={handleProjectChange('projectIntent')}
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={2}
                  placeholder="What's the goal for this project?"
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Drive Time (minutes)"
                    type="number"
                    value={projectData.driveTimeMinutes}
                    onChange={handleProjectChange('driveTimeMinutes')}
                    fullWidth
                    variant="outlined"
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="TreeShop Score (optional)"
                    type="number"
                    value={projectData.treeShopScore}
                    onChange={handleProjectChange('treeShopScore')}
                    fullWidth
                    variant="outlined"
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Box>

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
            </Box>
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
            sx={{ minWidth: 120 }}
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
