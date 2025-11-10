import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Chip,
  Divider,
  Alert,
  Paper,
} from '@mui/material';
import {
  Add,
  Delete,
  Map as MapIcon,
  CheckCircle,
  ArrowBack,
} from '@mui/icons-material';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import ServiceSelectionModal from './ServiceSelectionModal';
import AddressAutocomplete from '../Maps/AddressAutocomplete';
import LineItemCard from './LineItemCard';

interface ProposalBuilderProps {
  organizationId: string;
  onBack?: () => void;
  onSave?: (proposalId: Id<"proposals">) => void;
}

interface ProposalLineItem {
  id: string; // Temporary ID for UI
  lineItemId: Id<"lineItems">;
  serviceName: string;
  serviceIcon: string;
  description: string;
  treeShopScore: number;
  estimatedHours: number;
  loadoutName: string;
  priceRangeLow: number;
  priceRangeHigh: number;
  afissFactors: any[];
  afissMultiplier: number;
}

export default function ProposalBuilder({
  organizationId,
  onBack,
  onSave,
}: ProposalBuilderProps) {
  // State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyState, setPropertyState] = useState('');
  const [propertyZip, setPropertyZip] = useState('');
  const [propertyLatitude, setPropertyLatitude] = useState<number>(0);
  const [propertyLongitude, setPropertyLongitude] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<ProposalLineItem[]>([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [addressValid, setAddressValid] = useState(false);

  // Fetch data
  const customers = useQuery(api.customers.list, {
    organizationId: organizationId as Id<"organizations">,
  });

  const organization = useQuery(api.organizations.get, {
    organizationId: organizationId as Id<"organizations">,
  });

  // Calculate totals
  const totalLow = lineItems.reduce((sum, item) => sum + item.priceRangeLow, 0);
  const totalHigh = lineItems.reduce((sum, item) => sum + item.priceRangeHigh, 0);
  const totalHours = lineItems.reduce((sum, item) => sum + item.estimatedHours, 0);

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers?.find((c) => c._id === customerId);
    if (customer) {
      setPropertyAddress(customer.propertyAddress);
      setPropertyCity(customer.propertyCity);
      setPropertyState(customer.propertyState);
      setPropertyZip(customer.propertyZip);
      setPropertyLatitude(customer.propertyLatitude || 0);
      setPropertyLongitude(customer.propertyLongitude || 0);
      setAddressValid(true);
    }
  };

  // Handle address autocomplete
  const handleAddressSelect = (geocoded: any) => {
    setPropertyAddress(geocoded.address);
    setPropertyCity(geocoded.city);
    setPropertyState(geocoded.state);
    setPropertyZip(geocoded.zip);
    setPropertyLatitude(geocoded.latitude);
    setPropertyLongitude(geocoded.longitude);
    setAddressValid(true);
  };

  // Handle line item added from calculator
  const handleLineItemAdded = (lineItem: ProposalLineItem) => {
    setLineItems([...lineItems, { ...lineItem, id: Math.random().toString() }]);
    setServiceModalOpen(false);
  };

  // Remove line item
  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Validation
  const canSave = selectedCustomerId && addressValid && lineItems.length > 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {onBack && (
            <IconButton onClick={onBack}>
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            New Proposal
          </Typography>
        </Box>

        <Button
          variant="contained"
          disabled={!canSave}
          sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
        >
          Save Proposal
        </Button>
      </Box>

      <Stack spacing={3}>
        {/* Customer Selection */}
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
              CUSTOMER
            </Typography>

            <TextField
              select
              fullWidth
              value={selectedCustomerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              label="Select Customer"
              required
              disabled={lineItems.length > 0}
              helperText={lineItems.length > 0 ? 'Remove all services to change customer' : ''}
            >
              <MenuItem value="">
                <em>Choose customer...</em>
              </MenuItem>
              {customers?.map((customer) => (
                <MenuItem key={customer._id} value={customer._id}>
                  {customer.name} {customer.company && `(${customer.company})`}
                </MenuItem>
              ))}
            </TextField>

            {!selectedCustomerId && (
              <Button
                startIcon={<Add />}
                sx={{ mt: 2 }}
                size="small"
                disabled
              >
                Add New Customer (Coming Soon)
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Property Address - Only show after customer selected */}
        {selectedCustomerId && (
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                PROPERTY
              </Typography>

              {process.env.PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <AddressAutocomplete
                  apiKey={process.env.PUBLIC_GOOGLE_MAPS_API_KEY}
                  label="Property Address"
                  value={propertyAddress}
                  onAddressSelect={handleAddressSelect}
                  fullWidth
                  required
                />
              ) : (
                <TextField
                  label="Property Address"
                  value={propertyAddress}
                  onChange={(e) => {
                    setPropertyAddress(e.target.value);
                    setAddressValid(e.target.value.length > 0);
                  }}
                  fullWidth
                  required
                  helperText="Enter property address"
                />
              )}

              {addressValid && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <CheckCircle fontSize="small" color="success" />
                  <Typography variant="caption" color="success.main">
                    {propertyAddress}
                    {propertyCity && `, ${propertyCity}`}
                    {propertyState && `, ${propertyState}`}
                    {propertyZip && ` ${propertyZip}`}
                  </Typography>
                </Box>
              )}

              <Button
                startIcon={<MapIcon />}
                sx={{ mt: 2 }}
                size="small"
                disabled
              >
                Select on Map (Coming Soon)
              </Button>

              {(!organization?.latitude || !organization?.longitude) && (
                <Alert severity="warning" sx={{ mt: 2, fontSize: '0.875rem' }}>
                  Set organization address in settings to auto-calculate drive time
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes - Only show after address entered */}
        {selectedCustomerId && addressValid && (
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                ADDITIONAL DETAILS
              </Typography>

              <TextField
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                fullWidth
                placeholder="Add any special instructions or notes about this project..."
              />
            </CardContent>
          </Card>
        )}

          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                SERVICES
              </Typography>

              {lineItems.length === 0 ? (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setServiceModalOpen(true)}
                  fullWidth
                  size="large"
                  sx={{
                    bgcolor: '#22c55e',
                    '&:hover': { bgcolor: '#16a34a' },
                    py: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  Add Service
                </Button>
              ) : (
                <>
                  {/* Line Items List */}
                  <Stack spacing={2} sx={{ mb: 3 }}>
                    {lineItems.map((item, index) => (
                      <LineItemCard
                        key={item.id}
                        lineNumber={index + 1}
                        serviceName={item.serviceName}
                        serviceIcon={item.serviceIcon}
                        description={item.description}
                        estimatedHours={item.estimatedHours}
                        loadoutName={item.loadoutName}
                        priceRangeLow={item.priceRangeLow}
                        priceRangeHigh={item.priceRangeHigh}
                        afissMultiplier={item.afissMultiplier}
                        onDelete={() => handleRemoveLineItem(item.id)}
                      />
                    ))}
                  </Stack>

                  {/* Add Another Service Button */}
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setServiceModalOpen(true)}
                    fullWidth
                    sx={{
                      borderColor: '#22c55e',
                      color: '#22c55e',
                      '&:hover': {
                        borderColor: '#16a34a',
                        bgcolor: '#22c55e10',
                      },
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Add Another Service
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Total - Only show when there are line items */}
        {lineItems.length > 0 && (
          <Card sx={{ bgcolor: '#22c55e15', border: '2px solid #22c55e', position: 'sticky', bottom: 16, zIndex: 10 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  TOTAL INVESTMENT
                </Typography>
                <Chip
                  label={`${lineItems.length} service${lineItems.length === 1 ? '' : 's'}`}
                  size="small"
                  sx={{ bgcolor: '#22c55e', color: 'white', fontWeight: 600 }}
                />
              </Box>

              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5, color: '#22c55e' }}>
                ${totalLow.toLocaleString()} - ${totalHigh.toLocaleString()}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {totalHours.toFixed(1)} hours estimated on-site work
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Service Selection Modal */}
      <ServiceSelectionModal
        open={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        organizationId={organizationId}
        onServiceAdded={handleLineItemAdded}
        propertyAddress={propertyAddress}
        driveTimeMinutes={0}
      />
    </Box>
  );
}
