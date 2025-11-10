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
import { Id } from '../../../convex/_generated/dataModel';
import ServiceSelectionModal from './ServiceSelectionModal';
import AddressAutocomplete from '../Maps/AddressAutocomplete';

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
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              CUSTOMER
            </Typography>

            <TextField
              select
              fullWidth
              value={selectedCustomerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              label="Select Customer"
              required
            >
              {customers?.map((customer) => (
                <MenuItem key={customer._id} value={customer._id}>
                  {customer.name} {customer.company && `(${customer.company})`}
                </MenuItem>
              ))}
            </TextField>

            <Button
              startIcon={<Add />}
              sx={{ mt: 2 }}
              size="small"
            >
              Add New Customer
            </Button>
          </CardContent>
        </Card>

        {/* Property Address */}
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
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
                onChange={(e) => setPropertyAddress(e.target.value)}
                fullWidth
                required
              />
            )}

            {addressValid && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CheckCircle fontSize="small" color="success" />
                <Typography variant="caption" color="success.main">
                  {propertyAddress}, {propertyCity}, {propertyState} {propertyZip}
                </Typography>
              </Box>
            )}

            <Button
              startIcon={<MapIcon />}
              sx={{ mt: 2 }}
              size="small"
            >
              Adjust on Map
            </Button>

            {(!organization?.latitude || !organization?.longitude) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Set organization address in settings to auto-calculate drive time
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              ADDITIONAL DETAILS
            </Typography>

            <TextField
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              SERVICES
            </Typography>

            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setServiceModalOpen(true)}
              fullWidth
              sx={{ mb: lineItems.length > 0 ? 3 : 0 }}
            >
              Add Service
            </Button>

            {/* Line Items List */}
            {lineItems.length > 0 && (
              <Stack spacing={2}>
                {lineItems.map((item) => (
                  <Paper
                    key={item.id}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6" sx={{ fontSize: '1.5rem' }}>
                            {item.serviceIcon}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {item.serviceName}
                          </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {item.description}
                        </Typography>

                        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                          <Chip
                            label={`${item.estimatedHours.toFixed(1)} hours`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={item.loadoutName}
                            size="small"
                            variant="outlined"
                          />
                          {item.afissMultiplier > 1 && (
                            <Chip
                              label={`AFISS ${(item.afissMultiplier * 100 - 100).toFixed(0)}%`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Stack>

                        <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
                          ${item.priceRangeLow.toLocaleString()} - ${item.priceRangeHigh.toLocaleString()}
                        </Typography>
                      </Box>

                      <IconButton
                        onClick={() => handleRemoveLineItem(item.id)}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Total */}
        <Card sx={{ bgcolor: 'action.hover' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              TOTAL INVESTMENT
            </Typography>

            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {lineItems.length > 0
                ? `$${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}`
                : '$0.00'}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {lineItems.length} {lineItems.length === 1 ? 'service' : 'services'}
              {totalHours > 0 && ` • ${totalHours.toFixed(1)} hours estimated`}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Service Selection Modal */}
      <ServiceSelectionModal
        open={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        organizationId={organizationId}
        onLineItemAdded={handleLineItemAdded}
        propertyLatitude={propertyLatitude}
        propertyLongitude={propertyLongitude}
        orgLatitude={organization?.latitude || 0}
        orgLongitude={organization?.longitude || 0}
      />
    </Box>
  );
}
