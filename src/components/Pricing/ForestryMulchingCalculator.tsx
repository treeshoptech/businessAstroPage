import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface ForestryMulchingCalculatorProps {
  organizationId: Id<"organizations">;
  onBack: () => void;
}

interface LineItem {
  id: string;
  acreage: number;
  dbhPackage: number;
  description: string;
}

const DBH_PACKAGES = [
  { value: 4, label: '4" DBH - Light brush' },
  { value: 6, label: '6" DBH - Small trees' },
  { value: 8, label: '8" DBH - Mature understory' },
  { value: 10, label: '10" DBH - Large trees' },
  { value: 15, label: '15" DBH - Very large trees' },
];

export default function ForestryMulchingCalculator({
  organizationId,
  onBack,
}: ForestryMulchingCalculatorProps) {
  const [customerId, setCustomerId] = useState<Id<"customers"> | ''>('');
  const [loadoutId, setLoadoutId] = useState<Id<"loadouts"> | ''>('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [driveTimeMinutes, setDriveTimeMinutes] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', acreage: 0, dbhPackage: 6, description: '' }
  ]);
  const [profitMargin, setProfitMargin] = useState(50);

  const customers = useQuery(api.customers.list, { organizationId });
  const loadouts = useQuery(api.loadouts.list, { organizationId });
  const selectedLoadout = useQuery(
    api.loadouts.get,
    loadoutId ? { id: loadoutId } : "skip"
  );
  const createProject = useMutation(api.projects.create);

  const calculations = useMemo(() => {
    if (!selectedLoadout) return null;

    const productionRate = selectedLoadout.productionRatePpH || 1.5;
    const loadoutHourlyCost = selectedLoadout.totalCostPerHour || 0;

    const totalInchAcres = lineItems.reduce((sum, item) => {
      return sum + (item.acreage * item.dbhPackage);
    }, 0);

    const productionHours = totalInchAcres / productionRate;
    const transportHours = (driveTimeMinutes / 60) * 2 * 0.5;
    const bufferHours = (productionHours + transportHours) * 0.1;
    const totalHours = productionHours + transportHours + bufferHours;

    const totalCost = totalHours * loadoutHourlyCost;
    const billingRate = loadoutHourlyCost / (1 - profitMargin / 100);
    const totalPrice = totalHours * billingRate;
    const profit = totalPrice - totalCost;

    return {
      totalInchAcres,
      productionHours,
      transportHours,
      bufferHours,
      totalHours,
      loadoutHourlyCost,
      billingRate,
      totalCost,
      totalPrice,
      profit,
    };
  }, [selectedLoadout, lineItems, driveTimeMinutes, profitMargin]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), acreage: 0, dbhPackage: 6, description: '' },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateProject = async () => {
    if (!customerId || !loadoutId || !calculations) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createProject({
        organizationId,
        customerId: customerId as Id<"customers">,
        serviceType: 'forestry_mulching',
        status: 'proposal',
        treeShopScore: calculations.totalInchAcres,
        propertyAddress: propertyAddress || undefined,
        driveTimeMinutes: driveTimeMinutes || undefined,
        notes: `Forestry Mulching Project`,
      });
      
      alert('Project created successfully!');
      onBack();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#000' }}>
      <Box sx={{
        p: { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <IconButton onClick={onBack} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Forestry Mulching Calculator
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', ml: 7 }}>
          Calculate pricing with line items
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto', display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          
          <Box sx={{ flex: 1 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Project Details
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label="Customer"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value as Id<"customers">)}
                  >
                    <MenuItem value="">Select Customer</MenuItem>
                    {customers?.map((customer) => (
                      <MenuItem key={customer._id} value={customer._id}>
                        {customer.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="Loadout"
                    value={loadoutId}
                    onChange={(e) => setLoadoutId(e.target.value as Id<"loadouts">)}
                  >
                    <MenuItem value="">Select Loadout</MenuItem>
                    {loadouts?.map((loadout) => (
                      <MenuItem key={loadout._id} value={loadout._id}>
                        {loadout.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth
                    label="Property Address"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                  />

                  <TextField
                    fullWidth
                    type="number"
                    label="Drive Time (minutes)"
                    value={driveTimeMinutes}
                    onChange={(e) => setDriveTimeMinutes(Number(e.target.value))}
                  />
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Line Items
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addLineItem}
                    size="small"
                    variant="outlined"
                  >
                    Add Line
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {lineItems.map((item, index) => (
                    <Card key={item.id} sx={{ bgcolor: '#1a1a1a', border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="subtitle2">Line {index + 1}</Typography>
                          {lineItems.length > 1 && (
                            <IconButton
                              size="small"
                              onClick={() => removeLineItem(item.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                              type="number"
                              label="Acreage"
                              value={item.acreage}
                              onChange={(e) => updateLineItem(item.id, 'acreage', Number(e.target.value))}
                              sx={{ flex: 1 }}
                            />
                            <TextField
                              select
                              label="DBH"
                              value={item.dbhPackage}
                              onChange={(e) => updateLineItem(item.id, 'dbhPackage', Number(e.target.value))}
                              sx={{ flex: 2 }}
                            >
                              {DBH_PACKAGES.map((pkg) => (
                                <MenuItem key={pkg.value} value={pkg.value}>
                                  {pkg.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Box>

                          <TextField
                            fullWidth
                            label="Description"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '0 0 400px' }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid', borderColor: 'divider', position: 'sticky', top: 16 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Pricing Summary
                </Typography>

                {calculations ? (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Total: {calculations.totalInchAcres.toFixed(2)} inch-acres
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Hours: {calculations.totalHours.toFixed(2)}
                      </Typography>
                    </Box>

                    <TextField
                      fullWidth
                      select
                      label="Profit Margin"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(Number(e.target.value))}
                      sx={{ mb: 3 }}
                    >
                      <MenuItem value={30}>30%</MenuItem>
                      <MenuItem value={40}>40%</MenuItem>
                      <MenuItem value={50}>50%</MenuItem>
                      <MenuItem value={60}>60%</MenuItem>
                      <MenuItem value={70}>70%</MenuItem>
                    </TextField>

                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1, mb: 3 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Cost: ${calculations.totalCost.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: 'success.main' }}>
                        Profit: ${calculations.profit.toFixed(2)}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Price: ${calculations.totalPrice.toFixed(2)}
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleCreateProject}
                      disabled={!customerId || !loadoutId}
                    >
                      Create Proposal
                    </Button>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 4 }}>
                    Select a loadout to see pricing
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
