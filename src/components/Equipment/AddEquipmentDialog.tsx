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
import Divider from '@mui/material/Divider';
// Using Box with flexbox instead of Grid due to MUI v6 API changes
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { calculateEquipmentCost } from '../../lib/pricing/formulas';

interface AddEquipmentDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: Id<"organizations">;
}

export default function AddEquipmentDialog({
  open,
  onClose,
  organizationId,
}: AddEquipmentDialogProps) {
  const addEquipment = useMutation(api.equipment.add);

  // Basic Info
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('excavator');
  const [status, setStatus] = useState<"active" | "maintenance" | "retired">('active');

  // Attachment-specific fields
  const [attachmentType, setAttachmentType] = useState('');
  const [hydraulicGPM, setHydraulicGPM] = useState('');
  const [hydraulicPSI, setHydraulicPSI] = useState('');
  const [weight, setWeight] = useState('');

  // Ownership Costs
  const [purchasePrice, setPurchasePrice] = useState(65000);
  const [usefulLifeYears, setUsefulLifeYears] = useState(7);
  const [annualHours, setAnnualHours] = useState(1500);
  const [financePercentage, setFinancePercentage] = useState(0);
  const [financeLoanYears, setFinanceLoanYears] = useState(0);
  const [insurancePerYear, setInsurancePerYear] = useState(0);
  const [registrationPerYear, setRegistrationPerYear] = useState(0);

  // Operating Costs
  const [fuelGallonsPerHour, setFuelGallonsPerHour] = useState(0);
  const [fuelPricePerGallon, setFuelPricePerGallon] = useState(3.75);
  const [maintenancePerYear, setMaintenancePerYear] = useState(0);
  const [repairsPerYear, setRepairsPerYear] = useState(0);

  // Calculate finance cost from percentage and loan term
  const financeCostPerYear = useMemo(() => {
    if (!financePercentage || !financeLoanYears || financePercentage === 0) {
      return 0;
    }
    const rate = financePercentage / 100;
    const totalInterest = purchasePrice * rate * financeLoanYears;
    return totalInterest / financeLoanYears;
  }, [purchasePrice, financePercentage, financeLoanYears]);

  // Calculate real-time costs
  const calculatedCosts = useMemo(() => {
    return calculateEquipmentCost({
      purchasePrice,
      usefulLifeYears,
      annualHours,
      financeCostPerYear,
      insurancePerYear,
      registrationPerYear,
      fuelGallonsPerHour,
      fuelPricePerGallon,
      maintenancePerYear,
      repairsPerYear,
    });
  }, [
    purchasePrice,
    usefulLifeYears,
    annualHours,
    financeCostPerYear,
    insurancePerYear,
    registrationPerYear,
    fuelGallonsPerHour,
    fuelPricePerGallon,
    maintenancePerYear,
    repairsPerYear,
  ]);

  const handleSubmit = async () => {
    // Build name from year/make/model
    const generatedName = [year, make, model].filter(Boolean).join(' ').trim();

    if (!generatedName) {
      alert('Please enter at least Year/Make/Model');
      return;
    }

    try {
      await addEquipment({
        organizationId,
        name: generatedName || `Equipment`,
        year: year ? Number(year) : undefined,
        make: make || undefined,
        model: model || undefined,
        category,
        attachmentType: category === 'attachment' && attachmentType ? attachmentType : undefined,
        hydraulicGPM: hydraulicGPM ? Number(hydraulicGPM) : undefined,
        hydraulicPSI: hydraulicPSI ? Number(hydraulicPSI) : undefined,
        weight: weight ? Number(weight) : undefined,
        purchasePrice,
        usefulLifeYears,
        annualHours,
        financePercentage: financePercentage || undefined,
        financeLoanYears: financeLoanYears || undefined,
        insurancePerYear,
        registrationPerYear,
        fuelGallonsPerHour,
        fuelPricePerGallon,
        maintenancePerYear,
        repairsPerYear,
        status,
      });

      // Reset form
      setYear('');
      setMake('');
      setModel('');
      setCategory('excavator');
      setStatus('active');
      setAttachmentType('');
      setHydraulicGPM('');
      setHydraulicPSI('');
      setWeight('');
      setPurchasePrice(65000);
      setUsefulLifeYears(7);
      setAnnualHours(1500);
      setFinancePercentage(0);
      setFinanceLoanYears(0);
      setInsurancePerYear(0);
      setRegistrationPerYear(0);
      setFuelGallonsPerHour(0);
      setFuelPricePerGallon(3.75);
      setMaintenancePerYear(0);
      setRepairsPerYear(0);

      onClose();
    } catch (error) {
      console.error('Error adding equipment:', error);
      alert('Failed to add equipment');
    }
  };

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
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
        Add Equipment
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ py: 2 }}>
          {/* Basic Info */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Basic Information
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                helperText="Optional"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Make"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="CAT, John Deere"
                helperText="Optional"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="265, F450, SK200TR"
                helperText="Optional"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
                  WOOD PROCESSING
                </MenuItem>
                <MenuItem value="chipper">Chipper</MenuItem>
                <MenuItem value="stump_grinder">Stump Grinder</MenuItem>
                <MenuItem value="forestry_mulcher">Forestry Mulcher</MenuItem>

                <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
                  HEAVY EQUIPMENT
                </MenuItem>
                <MenuItem value="excavator">Excavator</MenuItem>
                <MenuItem value="skid_steer">Skid Steer</MenuItem>
                <MenuItem value="track_loader">Track Loader</MenuItem>
                <MenuItem value="wheel_loader">Wheel Loader</MenuItem>
                <MenuItem value="tractor">Tractor</MenuItem>
                <MenuItem value="mini_skid">Mini Skid</MenuItem>
                <MenuItem value="backhoe">Backhoe</MenuItem>
                <MenuItem value="dozer">Dozer</MenuItem>

                <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
                  TRUCKS & TRAILERS
                </MenuItem>
                <MenuItem value="chip_truck">Chip Truck</MenuItem>
                <MenuItem value="log_truck">Log Truck</MenuItem>
                <MenuItem value="crew_truck">Crew Truck</MenuItem>
                <MenuItem value="trailer">Trailer</MenuItem>

                <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
                  ATTACHMENTS
                </MenuItem>
                <MenuItem value="attachment">Attachment</MenuItem>

                <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
                  OTHER
                </MenuItem>
                <MenuItem value="support">Support Equipment</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="retired">Retired</MenuItem>
              </TextField>
            </Box>
            {category === 'attachment' && (
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Attachment Type"
                  value={attachmentType}
                  onChange={(e) => setAttachmentType(e.target.value)}
                  placeholder="Grapple, Bucket, etc."
                  helperText="e.g., Root Grapple"
                />
              </Box>
            )}
          </Box>

          {/* Attachment-Specific Fields */}
          {category === 'attachment' && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'success.main' }}>
                Attachment Specifications
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="Hydraulic Flow (GPM)"
                    type="number"
                    value={hydraulicGPM}
                    onChange={(e) => setHydraulicGPM(e.target.value)}
                    placeholder="15-40"
                    helperText="Gallons per minute"
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="Hydraulic Pressure (PSI)"
                    type="number"
                    value={hydraulicPSI}
                    onChange={(e) => setHydraulicPSI(e.target.value)}
                    placeholder="3000-4500"
                    helperText="Pounds per sq inch"
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="Weight (lbs)"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="500-5000"
                    helperText="Total weight"
                  />
                </Box>
              </Box>
            </>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Ownership Costs */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Ownership Costs
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Purchase Price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Useful Life (years)"
                type="number"
                value={usefulLifeYears}
                onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Annual Hours"
                type="number"
                value={annualHours}
                onChange={(e) => setAnnualHours(Number(e.target.value))}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Finance %"
                type="number"
                value={financePercentage}
                onChange={(e) => setFinancePercentage(Number(e.target.value))}
                InputProps={{ endAdornment: '%' }}
                inputProps={{ step: 0.1, min: 0, max: 25 }}
                helperText="e.g., 5.0 for 5%"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Loan Term (years)"
                type="number"
                value={financeLoanYears}
                onChange={(e) => setFinanceLoanYears(Number(e.target.value))}
                inputProps={{ step: 1, min: 0, max: 10 }}
                helperText="0 if no loan"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Insurance/Year"
                type="number"
                value={insurancePerYear}
                onChange={(e) => setInsurancePerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Registration/Year"
                type="number"
                value={registrationPerYear}
                onChange={(e) => setRegistrationPerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Operating Costs */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Operating Costs
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Fuel (gal/hr)"
                type="number"
                value={fuelGallonsPerHour}
                onChange={(e) => setFuelGallonsPerHour(Number(e.target.value))}
                inputProps={{ step: 0.1 }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Fuel Price ($/gal)"
                type="number"
                value={fuelPricePerGallon}
                onChange={(e) => setFuelPricePerGallon(Number(e.target.value))}
                inputProps={{ step: 0.01 }}
                InputProps={{ startAdornment: '$' }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Maintenance/Year"
                type="number"
                value={maintenancePerYear}
                onChange={(e) => setMaintenancePerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Repairs/Year"
                type="number"
                value={repairsPerYear}
                onChange={(e) => setRepairsPerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Calculated Costs Display */}
          <Box
            sx={{
              bgcolor: '#0a0a0a',
              borderRadius: 2,
              p: 3,
              border: '1px solid #1a1a1a',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Calculated Hourly Costs
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Ownership Cost/Hour
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ${calculatedCosts.ownershipCostPerHour.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Operating Cost/Hour
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ${calculatedCosts.operatingCostPerHour.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Total Cost/Hour
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                  ${calculatedCosts.totalCostPerHour.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          sx={{ fontWeight: 600 }}
        >
          Add Equipment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
