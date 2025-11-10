import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import SpeedIcon from '@mui/icons-material/Speed';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import AddLoadoutDialog from './AddLoadoutDialog';
import LoadoutProfileDialog from './LoadoutProfileDialog';

interface LoadoutDirectoryProps {
  organizationId: string;
}

interface Loadout {
  _id: Id<"loadouts">;
  name: string;
  serviceType: string;
  equipmentIds: Id<"equipment">[];
  employeeIds: Id<"employees">[];
  productionRatePpH: number;
  overheadCostPerHour: number;
  billingRates: {
    margin30: number;
    margin40: number;
    margin50: number;
    margin60: number;
    margin70: number;
  };
  createdAt: number;
}

const serviceTypeLabels: Record<string, string> = {
  forestry_mulching: 'Forestry Mulching',
  stump_grinding: 'Stump Grinding',
  land_clearing: 'Land Clearing',
  tree_removal: 'Tree Removal',
  tree_trimming: 'Tree Trimming',
};

export default function LoadoutDirectory({ organizationId }: LoadoutDirectoryProps) {
  const [selectedLoadout, setSelectedLoadout] = useState<Loadout | null>(null);
  const [expandedLoadoutId, setExpandedLoadoutId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const loadouts = useQuery(api.loadouts.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Loadout[] | undefined;

  const deleteLoadout = useMutation(api.loadouts.remove);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, loadout: Loadout) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedLoadout(loadout);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLoadout(null);
  };

  const handleDelete = async () => {
    if (!selectedLoadout) return;

    if (confirm(`Are you sure you want to delete ${selectedLoadout.name}?`)) {
      try {
        await deleteLoadout({ id: selectedLoadout._id });
        handleMenuClose();
      } catch (error) {
        console.error('Error deleting loadout:', error);
      }
    }
  };

  const handleViewDetails = () => {
    setProfileDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = () => {
    // TODO: Open edit dialog with pre-populated data
    console.log('Edit loadout:', selectedLoadout);
    handleMenuClose();
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Loadouts
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            Add Loadout
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {loadouts?.length || 0} {loadouts?.length === 1 ? 'loadout' : 'loadouts'}
        </Typography>
      </Box>

      {/* Loadout List */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        bgcolor: '#000'
      }}>
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          {!loadouts || loadouts.length === 0 ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                No loadouts yet
              </Typography>
              <Typography variant="body2">
                Create a loadout to configure equipment and crew for a service
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loadouts.map((loadout) => {
                const isExpanded = expandedLoadoutId === loadout._id;

                return (
                  <Card
                    key={loadout._id}
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
                        onClick={() => setExpandedLoadoutId(isExpanded ? null : loadout._id)}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <LocalShippingIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                              {loadout.name}
                            </Typography>
                            <Chip
                              label={serviceTypeLabels[loadout.serviceType]}
                              size="small"
                              sx={{
                                bgcolor: 'primary.main',
                                color: '#fff',
                                fontSize: '0.7rem',
                                height: 20,
                                alignSelf: 'flex-start'
                              }}
                            />
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            ${loadout.billingRates.margin50.toFixed(2)}/hr LBR
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, loadout)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Expanded Details - Conditionally Visible */}
                      {isExpanded && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          {/* Production & Costs */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SpeedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                Production Rate: {loadout.productionRatePpH} PpH
                              </Typography>
                            </Box>
                            {loadout.overheadCostPerHour > 0 && (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', ml: 3 }}>
                                Overhead: ${loadout.overheadCostPerHour.toFixed(2)}/hr
                              </Typography>
                            )}
                          </Box>

                          {/* Equipment & Crew */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <BuildIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                Equipment: {loadout.equipmentIds.length} {loadout.equipmentIds.length === 1 ? 'piece' : 'pieces'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PeopleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                Crew: {loadout.employeeIds.length} {loadout.employeeIds.length === 1 ? 'member' : 'members'}
                              </Typography>
                            </Box>
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
        <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
        <MenuItem onClick={handleEdit}>Edit Loadout</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete Loadout
        </MenuItem>
      </Menu>

      {/* Add Loadout Dialog */}
      <AddLoadoutDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        organizationId={organizationId}
      />

      {/* Loadout Profile Dialog */}
      {selectedLoadout && (
        <LoadoutProfileDialog
          open={profileDialogOpen}
          onClose={() => setProfileDialogOpen(false)}
          loadoutId={selectedLoadout._id}
          onEdit={handleEdit}
        />
      )}
    </Box>
  );
}
