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
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface AddLoadoutDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

interface Equipment {
  _id: Id<"equipment">;
  name: string;
  category: string;
  status: string;
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
}

interface Employee {
  _id: Id<"employees">;
  name: string;
  position: string;
  baseHourlyRate: number;
  burdenMultiplier: number;
  status: string;
}

const serviceTypes = [
  { value: 'forestry_mulching', label: 'Forestry Mulching' },
  { value: 'stump_grinding', label: 'Stump Grinding' },
  { value: 'land_clearing', label: 'Land Clearing' },
  { value: 'tree_removal', label: 'Tree Removal' },
  { value: 'tree_trimming', label: 'Tree Trimming' },
];

export default function AddLoadoutDialog({ open, onClose, organizationId }: AddLoadoutDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    serviceType: 'forestry_mulching',
    productionRatePpH: 1.5,
    overheadCostPerHour: 0,
  });

  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const allEquipment = useQuery(api.equipment.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Equipment[] | undefined;

  const allEmployees = useQuery(api.employees.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Employee[] | undefined;

  const createLoadout = useMutation(api.loadouts.create);

  // Filter active equipment and employees
  const activeEquipment = useMemo(() =>
    allEquipment?.filter(e => e.status === 'active') || [],
    [allEquipment]
  );

  const activeEmployees = useMemo(() =>
    allEmployees?.filter(e => e.status === 'active') || [],
    [allEmployees]
  );

  // Calculate equipment hourly cost
  const calculateEquipmentCost = (equipment: Equipment): number => {
    const ownershipPerHour = (
      (equipment.purchasePrice / equipment.usefulLifeYears +
      equipment.financeCostPerYear +
      equipment.insurancePerYear +
      equipment.registrationPerYear) / equipment.annualHours
    );

    const operatingPerHour = (
      (equipment.fuelGallonsPerHour * equipment.fuelPricePerGallon * equipment.annualHours +
      equipment.maintenancePerYear +
      equipment.repairsPerYear) / equipment.annualHours
    );

    return ownershipPerHour + operatingPerHour;
  };

  // Calculate employee true cost
  const calculateEmployeeCost = (employee: Employee): number => {
    return employee.baseHourlyRate * employee.burdenMultiplier;
  };

  // Calculate total loadout cost
  const totalLoadoutCost = useMemo(() => {
    const equipmentCost = selectedEquipmentIds.reduce((sum, id) => {
      const equipment = activeEquipment.find(e => e._id === id);
      return sum + (equipment ? calculateEquipmentCost(equipment) : 0);
    }, 0);

    const laborCost = selectedEmployeeIds.reduce((sum, id) => {
      const employee = activeEmployees.find(e => e._id === id);
      return sum + (employee ? calculateEmployeeCost(employee) : 0);
    }, 0);

    return equipmentCost + laborCost + formData.overheadCostPerHour;
  }, [selectedEquipmentIds, selectedEmployeeIds, activeEquipment, activeEmployees, formData.overheadCostPerHour]);

  // Calculate billing rates at different margins
  const billingRates = useMemo(() => ({
    margin30: totalLoadoutCost / 0.70,
    margin40: totalLoadoutCost / 0.60,
    margin50: totalLoadoutCost / 0.50,
    margin60: totalLoadoutCost / 0.40,
    margin70: totalLoadoutCost / 0.30,
  }), [totalLoadoutCost]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'productionRatePpH' || field === 'overheadCostPerHour'
      ? parseFloat(event.target.value) || 0
      : event.target.value;
    setFormData({ ...formData, [field]: value });
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    setSelectedEquipmentIds(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: 'Loadout name is required', severity: 'error' });
      return;
    }
    if (selectedEquipmentIds.length === 0) {
      setSnackbar({ open: true, message: 'Select at least one piece of equipment', severity: 'error' });
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      setSnackbar({ open: true, message: 'Select at least one crew member', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await createLoadout({
        organizationId: organizationId as Id<"organizations">,
        name: formData.name,
        serviceType: formData.serviceType as any,
        equipmentIds: selectedEquipmentIds as any,
        employeeIds: selectedEmployeeIds as any,
        productionRatePpH: formData.productionRatePpH,
        overheadCostPerHour: formData.overheadCostPerHour,
        billingRates,
      });

      setSnackbar({
        open: true,
        message: 'Loadout created successfully!',
        severity: 'success'
      });

      // Reset form
      setTimeout(() => {
        setFormData({
          name: '',
          serviceType: 'forestry_mulching',
          productionRatePpH: 1.5,
          overheadCostPerHour: 0,
        });
        setSelectedEquipmentIds([]);
        setSelectedEmployeeIds([]);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error creating loadout:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create loadout. Please try again.',
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
          Create New Loadout
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0a0a0a', pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Basic Information */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                Basic Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Loadout Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  fullWidth
                  required
                  variant="outlined"
                  placeholder="e.g., Cat 265 Mulching Crew"
                />
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
              </Box>
            </Box>

            <Divider />

            {/* Equipment Selection */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                Equipment
              </Typography>
              <FormControl component="fieldset" variant="standard">
                <FormGroup>
                  {activeEquipment.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No active equipment available. Add equipment first.
                    </Typography>
                  ) : (
                    activeEquipment.map((equipment) => (
                      <FormControlLabel
                        key={equipment._id}
                        control={
                          <Checkbox
                            checked={selectedEquipmentIds.includes(equipment._id)}
                            onChange={() => handleEquipmentToggle(equipment._id)}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{equipment.name}</span>
                            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 2 }}>
                              ${calculateEquipmentCost(equipment).toFixed(2)}/hr
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%' }}
                      />
                    ))
                  )}
                </FormGroup>
              </FormControl>
            </Box>

            <Divider />

            {/* Employee Selection */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                Crew Members
              </Typography>
              <FormControl component="fieldset" variant="standard">
                <FormGroup>
                  {activeEmployees.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No active employees available. Add employees first.
                    </Typography>
                  ) : (
                    activeEmployees.map((employee) => (
                      <FormControlLabel
                        key={employee._id}
                        control={
                          <Checkbox
                            checked={selectedEmployeeIds.includes(employee._id)}
                            onChange={() => handleEmployeeToggle(employee._id)}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{employee.name}</span>
                            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 2 }}>
                              ${calculateEmployeeCost(employee).toFixed(2)}/hr
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%' }}
                      />
                    ))
                  )}
                </FormGroup>
              </FormControl>
            </Box>

            <Divider />

            {/* Production & Overhead */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                Production & Overhead
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Production Rate (Points per Hour)"
                  type="number"
                  value={formData.productionRatePpH}
                  onChange={handleChange('productionRatePpH')}
                  fullWidth
                  variant="outlined"
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText="How many TreeShop Score points this loadout can complete per hour"
                />
                <TextField
                  label="Overhead Cost per Hour"
                  type="number"
                  value={formData.overheadCostPerHour}
                  onChange={handleChange('overheadCostPerHour')}
                  fullWidth
                  variant="outlined"
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Additional overhead costs (admin, office, etc.)"
                />
              </Box>
            </Box>

            <Divider />

            {/* Cost Summary */}
            <Box sx={{ bgcolor: '#1a1a1a', p: 2, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Cost Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Total Hourly Cost:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${totalLoadoutCost.toFixed(2)}/hr
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                    Loadout Billing Rate (50% margin):
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                    ${billingRates.margin50.toFixed(2)}/hr
                  </Typography>
                </Box>
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
            {loading ? 'Creating...' : 'Create Loadout'}
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
