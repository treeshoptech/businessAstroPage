import React, { useState, useMemo, useEffect } from 'react';
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
import Grid from '@mui/material/Grid';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { calculateEquipmentCost } from '../../lib/pricing/formulas';

interface Equipment {
  _id: Id<"equipment">;
  organizationId: Id<"organizations">;
  name: string;
  category: "truck" | "mulcher" | "stump_grinder" | "excavator" | "trailer" | "support";
  purchasePrice: number;
  usefulLifeYears: number;
  annualHours: number;
  financeCostPerYear: number;
  insurancePerYear: number;
  registrationPerYear: number;
  fuelGallonsPerHour: number;
  fuelPricePerGallon: number;
  maintenancePerYear: number;
  repairsPerYear: number;
  status: "active" | "maintenance" | "retired";
  createdAt: number;
}

interface EditEquipmentDialogProps {
  open: boolean;
  onClose: () => void;
  equipment: Equipment;
}

export default function EditEquipmentDialog({
  open,
  onClose,
  equipment,
}: EditEquipmentDialogProps) {
  const updateEquipment = useMutation(api.equipment.update);

  // Basic Info
  const [name, setName] = useState('');
  const [category, setCategory] = useState<"truck" | "mulcher" | "stump_grinder" | "excavator" | "trailer" | "support">('truck');
  const [status, setStatus] = useState<"active" | "maintenance" | "retired">('active');

  // Ownership Costs
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [usefulLifeYears, setUsefulLifeYears] = useState(0);
  const [annualHours, setAnnualHours] = useState(0);
  const [financeCostPerYear, setFinanceCostPerYear] = useState(0);
  const [insurancePerYear, setInsurancePerYear] = useState(0);
  const [registrationPerYear, setRegistrationPerYear] = useState(0);

  // Operating Costs
  const [fuelGallonsPerHour, setFuelGallonsPerHour] = useState(0);
  const [fuelPricePerGallon, setFuelPricePerGallon] = useState(0);
  const [maintenancePerYear, setMaintenancePerYear] = useState(0);
  const [repairsPerYear, setRepairsPerYear] = useState(0);

  // Pre-populate form when equipment changes
  useEffect(() => {
    if (equipment) {
      setName(equipment.name);
      setCategory(equipment.category);
      setStatus(equipment.status);
      setPurchasePrice(equipment.purchasePrice);
      setUsefulLifeYears(equipment.usefulLifeYears);
      setAnnualHours(equipment.annualHours);
      setFinanceCostPerYear(equipment.financeCostPerYear);
      setInsurancePerYear(equipment.insurancePerYear);
      setRegistrationPerYear(equipment.registrationPerYear);
      setFuelGallonsPerHour(equipment.fuelGallonsPerHour);
      setFuelPricePerGallon(equipment.fuelPricePerGallon);
      setMaintenancePerYear(equipment.maintenancePerYear);
      setRepairsPerYear(equipment.repairsPerYear);
    }
  }, [equipment]);

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
    if (!name.trim()) {
      alert('Please enter equipment name');
      return;
    }

    try {
      await updateEquipment({
        id: equipment._id,
        name: name.trim(),
        category,
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
        status,
      });

      onClose();
    } catch (error) {
      console.error('Error updating equipment:', error);
      alert('Failed to update equipment');
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
        Edit Equipment
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ py: 2 }}>
          {/* Basic Info */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Basic Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                required
              >
                <MenuItem value="truck">Truck</MenuItem>
                <MenuItem value="mulcher">Mulcher</MenuItem>
                <MenuItem value="stump_grinder">Stump Grinder</MenuItem>
                <MenuItem value="excavator">Excavator</MenuItem>
                <MenuItem value="trailer">Trailer</MenuItem>
                <MenuItem value="support">Support</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
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
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Ownership Costs */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Ownership Costs
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Purchase Price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Useful Life (years)"
                type="number"
                value={usefulLifeYears}
                onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Annual Hours"
                type="number"
                value={annualHours}
                onChange={(e) => setAnnualHours(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Finance Cost/Year"
                type="number"
                value={financeCostPerYear}
                onChange={(e) => setFinanceCostPerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Insurance/Year"
                type="number"
                value={insurancePerYear}
                onChange={(e) => setInsurancePerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Registration/Year"
                type="number"
                value={registrationPerYear}
                onChange={(e) => setRegistrationPerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Operating Costs */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Operating Costs
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Fuel (gal/hr)"
                type="number"
                value={fuelGallonsPerHour}
                onChange={(e) => setFuelGallonsPerHour(Number(e.target.value))}
                inputProps={{ step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Fuel Price ($/gal)"
                type="number"
                value={fuelPricePerGallon}
                onChange={(e) => setFuelPricePerGallon(Number(e.target.value))}
                inputProps={{ step: 0.01 }}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Maintenance/Year"
                type="number"
                value={maintenancePerYear}
                onChange={(e) => setMaintenancePerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Repairs/Year"
                type="number"
                value={repairsPerYear}
                onChange={(e) => setRepairsPerYear(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
          </Grid>

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
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Ownership Cost/Hour
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ${calculatedCosts.ownershipCostPerHour.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Operating Cost/Hour
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ${calculatedCosts.operatingCostPerHour.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Total Cost/Hour
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                  ${calculatedCosts.totalCostPerHour.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
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
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
