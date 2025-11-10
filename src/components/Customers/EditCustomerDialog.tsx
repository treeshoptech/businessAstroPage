import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface EditCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: Id<"customers">;
}

export default function EditCustomerDialog({
  open,
  onClose,
  customerId,
}: EditCustomerDialogProps) {
  const customer = useQuery(api.customers.get, open ? { id: customerId } : "skip");
  const updateCustomer = useMutation(api.customers.update);

  // Form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyState, setPropertyState] = useState('');
  const [propertyZip, setPropertyZip] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Load customer data when it becomes available
  useEffect(() => {
    if (customer && open) {
      setName(customer.name);
      setCompany(customer.company || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setPropertyAddress(customer.propertyAddress);
      setPropertyCity(customer.propertyCity);
      setPropertyState(customer.propertyState);
      setPropertyZip(customer.propertyZip);
      setNotes(customer.notes || '');
    }
  }, [customer, open]);

  const handleSubmit = async () => {
    if (!name.trim() || !propertyAddress.trim() || !propertyCity.trim() || !propertyState.trim() || !propertyZip.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await updateCustomer({
        id: customerId,
        name: name.trim(),
        company: company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        propertyAddress: propertyAddress.trim(),
        propertyCity: propertyCity.trim(),
        propertyState: propertyState.trim(),
        propertyZip: propertyZip.trim(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Edit Customer
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#0a0a0a', pt: 3 }}>
        {!customer ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Loading...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Customer Information */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Customer Information
            </Typography>

            {/* Using Box with flexbox instead of Grid due to MUI v6 API changes */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Company (Optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Box>
            </Box>
          </Box>

          {/* Contact Information */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Contact Information
            </Typography>

            {/* Using Box with flexbox instead of Grid due to MUI v6 API changes */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Email (Optional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Phone (Optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Box>
            </Box>
          </Box>

          {/* Property Address */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Property Address
            </Typography>

            {/* Using Box with flexbox instead of Grid due to MUI v6 API changes */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="Street Address"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                required
              />

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ flex: 2, minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="City"
                    value={propertyCity}
                    onChange={(e) => setPropertyCity(e.target.value)}
                    required
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 100 }}>
                  <TextField
                    fullWidth
                    label="State"
                    value={propertyState}
                    onChange={(e) => setPropertyState(e.target.value)}
                    required
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 100 }}>
                  <TextField
                    fullWidth
                    label="ZIP"
                    value={propertyZip}
                    onChange={(e) => setPropertyZip(e.target.value)}
                    required
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Notes */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Additional Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes about this customer..."
            />
          </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ bgcolor: '#0a0a0a', borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={!customer || saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
