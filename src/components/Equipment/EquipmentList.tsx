import React, { useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Menu from '@mui/material/Menu';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { treeshopTheme } from '../../lib/theme';
import { calculateEquipmentCost } from '../../lib/pricing/formulas';
import ConvexClientProvider from '../ConvexClientProvider';
import AddEquipmentDialog from './AddEquipmentDialog';
import EditEquipmentDialog from './EditEquipmentDialog';
import DeleteEquipmentDialog from './DeleteEquipmentDialog';

// Hardcoded org ID for MVP (will add real auth later)
const TEST_ORG_ID = "test-org-123" as Id<"organizations">;

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

const categoryLabels: Record<string, string> = {
  truck: 'Truck',
  mulcher: 'Mulcher',
  stump_grinder: 'Stump Grinder',
  excavator: 'Excavator',
  trailer: 'Trailer',
  support: 'Support',
};

export default function EquipmentList() {
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Query equipment from Convex
  const equipment = useQuery(api.equipment.list, { organizationId: TEST_ORG_ID }) as Equipment[] | undefined;

  // Calculate costs for each equipment item
  const equipmentWithCosts = useMemo(() => {
    if (!equipment) return [];

    return equipment.map((item) => {
      const costs = calculateEquipmentCost({
        purchasePrice: item.purchasePrice,
        usefulLifeYears: item.usefulLifeYears,
        annualHours: item.annualHours,
        financeCostPerYear: item.financeCostPerYear,
        insurancePerYear: item.insurancePerYear,
        registrationPerYear: item.registrationPerYear,
        fuelGallonsPerHour: item.fuelGallonsPerHour,
        fuelPricePerGallon: item.fuelPricePerGallon,
        maintenancePerYear: item.maintenancePerYear,
        repairsPerYear: item.repairsPerYear,
      });

      return {
        ...item,
        ...costs,
      };
    });
  }, [equipment]);

  // Filter equipment based on search and filters
  const filteredEquipment = useMemo(() => {
    return equipmentWithCosts.filter((item) => {
      const matchesSearch =
        searchText === '' ||
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        categoryLabels[item.category].toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [equipmentWithCosts, searchText, categoryFilter, statusFilter]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, equipment: Equipment & { totalCostPerHour: number }) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedEquipment(equipment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedEquipment) {
      setEditDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleDelete = () => {
    if (selectedEquipment) {
      setDeleteDialogOpen(true);
      handleMenuClose();
    }
  };

  return (
    <ConvexClientProvider>
      <ThemeProvider theme={treeshopTheme}>
        <CssBaseline />
        <Box sx={{ height: '100vh', bgcolor: 'background.default', p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Equipment Manager
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ fontWeight: 600 }}
          >
            Add Equipment
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            label="Category"
            size="small"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            <MenuItem value="truck">Truck</MenuItem>
            <MenuItem value="mulcher">Mulcher</MenuItem>
            <MenuItem value="stump_grinder">Stump Grinder</MenuItem>
            <MenuItem value="excavator">Excavator</MenuItem>
            <MenuItem value="trailer">Trailer</MenuItem>
            <MenuItem value="support">Support</MenuItem>
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="retired">Retired</MenuItem>
          </TextField>
        </Box>

        {/* Equipment Cards */}
        <Box sx={{ height: 'calc(100vh - 250px)', overflow: 'auto' }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {filteredEquipment.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <Typography variant="h6" gutterBottom>
                  {searchText || categoryFilter !== 'all' || statusFilter !== 'all' ? 'No equipment found' : 'No equipment yet'}
                </Typography>
                <Typography variant="body2">
                  {searchText || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add equipment to get started'
                  }
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredEquipment.map((item) => (
                  <Card
                    key={item._id}
                    sx={{
                      bgcolor: '#0a0a0a',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      }
                    }}
                  >
                    <CardActionArea onClick={() => { setSelectedEquipment(item); setEditDialogOpen(true); }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            {/* Equipment Name */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <BuildIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                {item.name}
                              </Typography>
                            </Box>

                            {/* Category & Status */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, ml: 3.5 }}>
                              <Chip
                                label={categoryLabels[item.category]}
                                size="small"
                                sx={{
                                  bgcolor: 'primary.main',
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  height: 22
                                }}
                              />
                              <Chip
                                label={item.status}
                                size="small"
                                sx={{
                                  bgcolor: item.status === 'active' ? '#1b5e20' : item.status === 'maintenance' ? '#e65100' : '#424242',
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  height: 22,
                                  textTransform: 'capitalize'
                                }}
                              />
                            </Box>

                            {/* Costs */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoneyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                  Purchase Price: ${item.purchasePrice.toLocaleString()}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', ml: 3 }}>
                                Ownership: ${item.ownershipCostPerHour.toFixed(2)}/hr | Operating: ${item.operatingCostPerHour.toFixed(2)}/hr
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'success.main', fontSize: '0.875rem', ml: 3, fontWeight: 700 }}>
                                Total Cost: ${item.totalCostPerHour.toFixed(2)}/hr
                              </Typography>
                            </Box>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, item)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit Equipment
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete Equipment
          </MenuItem>
        </Menu>

        {/* Dialogs */}
        <AddEquipmentDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          organizationId={TEST_ORG_ID}
        />

        {selectedEquipment && (
          <>
            <EditEquipmentDialog
              open={editDialogOpen}
              onClose={() => {
                setEditDialogOpen(false);
                setSelectedEquipment(null);
              }}
              equipment={selectedEquipment}
            />

            <DeleteEquipmentDialog
              open={deleteDialogOpen}
              onClose={() => {
                setDeleteDialogOpen(false);
                setSelectedEquipment(null);
              }}
              equipment={selectedEquipment}
              organizationId={TEST_ORG_ID}
            />
          </>
        )}
        </Box>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
