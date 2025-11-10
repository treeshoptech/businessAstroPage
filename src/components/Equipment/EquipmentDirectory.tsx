import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
import { calculateEquipmentCost } from '../../lib/pricing/formulas';
import AddEquipmentDialog from './AddEquipmentDialog';
import EditEquipmentDialog from './EditEquipmentDialog';
import DeleteEquipmentDialog from './DeleteEquipmentDialog';

interface EquipmentDirectoryProps {
  organizationId: string;
}

interface Equipment {
  _id: Id<"equipment">;
  organizationId: Id<"organizations">;
  name: string;
  category: string;
  attachmentType?: string;
  compatibleWith?: string[];
  inventoryNumber?: string;
  year?: number;
  make?: string;
  model?: string;
  hydraulicGPM?: number;
  hydraulicPSI?: number;
  weight?: number;
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
  // Wood Processing
  chipper: 'Chipper',
  stump_grinder: 'Stump Grinder',
  forestry_mulcher: 'Forestry Mulcher',
  // Heavy Equipment
  excavator: 'Excavator',
  skid_steer: 'Skid Steer',
  track_loader: 'Track Loader',
  wheel_loader: 'Wheel Loader',
  tractor: 'Tractor',
  mini_skid: 'Mini Skid',
  backhoe: 'Backhoe',
  dozer: 'Dozer',
  // Aerial Access
  bucket_truck: 'Bucket Truck',
  boom_truck: 'Boom Truck',
  spider_lift: 'Spider Lift',
  // Trucks & Trailers
  chip_truck: 'Chip Truck',
  log_truck: 'Log Truck',
  crew_truck: 'Crew Truck',
  grapple_truck: 'Grapple Truck',
  crane_truck: 'Crane Truck',
  flatbed_truck: 'Flatbed Truck',
  dump_truck: 'Dump Truck',
  trailer: 'Trailer',
  // Cranes & Loaders
  knuckleboom_crane: 'Knuckleboom Crane',
  log_loader: 'Log Loader',
  // Attachments
  attachment: 'Attachment',
  // Climbing & Rigging
  winch: 'Winch',
  grcs: 'GRCS',
  climbing_gear: 'Climbing Gear',
  // Saws
  chainsaw: 'Chainsaw',
  pole_saw: 'Pole Saw',
  // PHC Equipment
  spray_truck: 'Spray Truck',
  sprayer: 'Sprayer',
  injection_system: 'Injection System',
  air_spade: 'Air Spade',
  // Support
  forklift: 'Forklift',
  skidder: 'Skidder',
  generator: 'Generator',
  firewood_processor: 'Firewood Processor',
  tub_grinder: 'Tub Grinder',
  support: 'Support Equipment',
};

export default function EquipmentDirectory({ organizationId }: EquipmentDirectoryProps) {
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [expandedEquipmentId, setExpandedEquipmentId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Query equipment from Convex
  const equipment = useQuery(api.equipment.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Equipment[] | undefined;

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{
        p: { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Equipment
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            Add Equipment
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
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
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All Categories</MenuItem>

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
              AERIAL ACCESS
            </MenuItem>
            <MenuItem value="bucket_truck">Bucket Truck</MenuItem>
            <MenuItem value="boom_truck">Boom Truck</MenuItem>
            <MenuItem value="spider_lift">Spider Lift</MenuItem>

            <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
              TRUCKS & TRAILERS
            </MenuItem>
            <MenuItem value="chip_truck">Chip Truck</MenuItem>
            <MenuItem value="log_truck">Log Truck</MenuItem>
            <MenuItem value="crew_truck">Crew Truck</MenuItem>
            <MenuItem value="grapple_truck">Grapple Truck</MenuItem>
            <MenuItem value="crane_truck">Crane Truck</MenuItem>
            <MenuItem value="flatbed_truck">Flatbed Truck</MenuItem>
            <MenuItem value="dump_truck">Dump Truck</MenuItem>
            <MenuItem value="trailer">Trailer</MenuItem>

            <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
              CRANES & LOADERS
            </MenuItem>
            <MenuItem value="knuckleboom_crane">Knuckleboom Crane</MenuItem>
            <MenuItem value="log_loader">Log Loader</MenuItem>

            <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
              ATTACHMENTS
            </MenuItem>
            <MenuItem value="attachment">Attachment</MenuItem>

            <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
              CLIMBING & RIGGING
            </MenuItem>
            <MenuItem value="winch">Winch</MenuItem>
            <MenuItem value="grcs">GRCS</MenuItem>
            <MenuItem value="climbing_gear">Climbing Gear</MenuItem>

            <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
              SAWS
            </MenuItem>
            <MenuItem value="chainsaw">Chainsaw</MenuItem>
            <MenuItem value="pole_saw">Pole Saw</MenuItem>

            <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
              PHC EQUIPMENT
            </MenuItem>
            <MenuItem value="spray_truck">Spray Truck</MenuItem>
            <MenuItem value="sprayer">Sprayer</MenuItem>
            <MenuItem value="injection_system">Injection System</MenuItem>
            <MenuItem value="air_spade">Air Spade</MenuItem>

            <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'primary.main' }}>
              SUPPORT EQUIPMENT
            </MenuItem>
            <MenuItem value="forklift">Forklift</MenuItem>
            <MenuItem value="skidder">Skidder</MenuItem>
            <MenuItem value="generator">Generator</MenuItem>
            <MenuItem value="firewood_processor">Firewood Processor</MenuItem>
            <MenuItem value="tub_grinder">Tub Grinder</MenuItem>
            <MenuItem value="support">Other Support</MenuItem>
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

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {filteredEquipment.length} {filteredEquipment.length === 1 ? 'item' : 'items'}
        </Typography>
      </Box>

      {/* Equipment Cards */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        bgcolor: '#000'
      }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {filteredEquipment.length === 0 ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary'
            }}>
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
              {filteredEquipment.map((item) => {
                const isExpanded = expandedEquipmentId === item._id;

                return (
                  <Card
                    key={item._id}
                    sx={{
                      bgcolor: '#0a0a0a',
                      border: '1px solid',
                      borderColor: isExpanded ? 'primary.main' : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      }
                    }}
                  >
                    <CardContent>
                      {/* Collapsed Header - Always Visible */}
                      <Box
                        onClick={() => setExpandedEquipmentId(isExpanded ? null : item._id)}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <BuildIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                              {item.year || item.make || item.model
                                ? `${item.year || ''} ${item.make || ''} ${item.model || ''}`.trim()
                                : item.name}
                            </Typography>
                            {item.inventoryNumber && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                #{item.inventoryNumber}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={categoryLabels[item.category] || item.category}
                                size="small"
                                sx={{
                                  bgcolor: 'primary.dark',
                                  color: 'primary.light',
                                  fontSize: '0.7rem',
                                  height: 20
                                }}
                              />
                              {item.category === 'attachment' && item.attachmentType && (
                                <Chip
                                  label={item.attachmentType}
                                  size="small"
                                  sx={{
                                    bgcolor: 'success.dark',
                                    color: 'success.light',
                                    fontSize: '0.7rem',
                                    height: 20
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.9rem' }}>
                            ${item.totalCostPerHour.toFixed(2)}/hr
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, item)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Expanded Details - Conditionally Visible */}
                      {isExpanded && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          {/* Status Chip */}
                          <Box sx={{ mb: 2 }}>
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

                          {/* Equipment Details */}
                          {(item.year || item.make || item.model) && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                {[item.year, item.make, item.model].filter(Boolean).join(' ')}
                              </Typography>
                            </Box>
                          )}

                          {/* Attachment-specific specs */}
                          {item.category === 'attachment' && (
                            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, mb: 1, display: 'block' }}>
                                ATTACHMENT SPECIFICATIONS
                              </Typography>
                              {item.hydraulicGPM && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                  Hydraulic Flow: {item.hydraulicGPM} GPM
                                </Typography>
                              )}
                              {item.hydraulicPSI && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                  Hydraulic Pressure: {item.hydraulicPSI} PSI
                                </Typography>
                              )}
                              {item.weight && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                  Weight: {item.weight.toLocaleString()} lbs
                                </Typography>
                              )}
                              {item.compatibleWith && item.compatibleWith.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                    Compatible with:
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {item.compatibleWith.map((machine, idx) => (
                                      <Chip
                                        key={idx}
                                        label={machine}
                                        size="small"
                                        sx={{
                                          fontSize: '0.65rem',
                                          height: 18,
                                          bgcolor: '#2a2a2a',
                                          color: 'text.secondary'
                                        }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          )}

                          {/* Costs Breakdown */}
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
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', ml: 3, mt: 1 }}>
                              Useful Life: {item.usefulLifeYears} years | Annual Hours: {item.annualHours.toLocaleString()}
                            </Typography>
                            {item.fuelGallonsPerHour > 0 && (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', ml: 3 }}>
                                Fuel: {item.fuelGallonsPerHour} gal/hr @ ${item.fuelPricePerGallon.toFixed(2)}/gal
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
        organizationId={organizationId as Id<"organizations">}
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
            organizationId={organizationId as Id<"organizations">}
          />
        </>
      )}
    </Box>
  );
}
