import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface AddCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

export default function AddCustomerDialog({ open, onClose, organizationId }: AddCustomerDialogProps) {
  const [formData, setFormData] = useState({
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

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const createCustomer = useMutation(api.customers.create);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: 'Customer name is required', severity: 'error' });
      return;
    }
    if (!formData.propertyAddress.trim()) {
      setSnackbar({ open: true, message: 'Property address is required', severity: 'error' });
      return;
    }
    if (!formData.propertyCity.trim()) {
      setSnackbar({ open: true, message: 'City is required', severity: 'error' });
      return;
    }
    if (!formData.propertyZip.trim()) {
      setSnackbar({ open: true, message: 'ZIP code is required', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await createCustomer({
        organizationId: organizationId as Id<"organizations">,
        name: formData.name,
        company: formData.company || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        propertyAddress: formData.propertyAddress,
        propertyCity: formData.propertyCity,
        propertyState: formData.propertyState,
        propertyZip: formData.propertyZip,
        notes: formData.notes || undefined,
      });

      setSnackbar({
        open: true,
        message: 'Customer created successfully!',
        severity: 'success'
      });

      // Reset form
      setTimeout(() => {
        setFormData({
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
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error creating customer:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create customer. Please try again.',
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
          Add New Customer
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0a0a0a', pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Customer Name"
                value={formData.name}
                onChange={handleChange('name')}
                fullWidth
                required
                variant="outlined"
              />
              <TextField
                label="Company (optional)"
                value={formData.company}
                onChange={handleChange('company')}
                fullWidth
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Phone"
                value={formData.phone}
                onChange={handleChange('phone')}
                fullWidth
                variant="outlined"
                placeholder="(555) 555-5555"
              />
            </Box>

            <TextField
              label="Property Address"
              value={formData.propertyAddress}
              onChange={handleChange('propertyAddress')}
              fullWidth
              required
              variant="outlined"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
              <TextField
                label="City"
                value={formData.propertyCity}
                onChange={handleChange('propertyCity')}
                fullWidth
                required
                variant="outlined"
              />
              <TextField
                label="State"
                value={formData.propertyState}
                onChange={handleChange('propertyState')}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="ZIP Code"
                value={formData.propertyZip}
                onChange={handleChange('propertyZip')}
                fullWidth
                required
                variant="outlined"
              />
            </Box>

            <TextField
              label="Notes (optional)"
              value={formData.notes}
              onChange={handleChange('notes')}
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              placeholder="Any special notes about this customer or property"
            />
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
            {loading ? 'Creating...' : 'Add Customer'}
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
