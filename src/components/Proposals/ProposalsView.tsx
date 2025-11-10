import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import AddLeadDialog from '../Projects/AddLeadDialog';
import EditProjectDialog from '../Projects/EditProjectDialog';

interface ProposalsViewProps {
  organizationId: string;
}

interface Project {
  _id: Id<"projects">;
  organizationId: Id<"organizations">;
  customerId: Id<"customers">;
  serviceType: string;
  status: "lead" | "proposal" | "work_order" | "invoice" | "completed" | "cancelled";
  projectIntent?: string;
  siteHazards?: string[];
  driveTimeMinutes?: number;
  treeShopScore?: number;
  createdAt: number;
  updatedAt: number;
}

interface Customer {
  _id: Id<"customers">;
  name: string;
  email?: string;
  phone?: string;
  propertyAddress: string;
}

const serviceTypeLabels: Record<string, string> = {
  forestry_mulching: 'Forestry Mulching',
  stump_grinding: 'Stump Grinding',
  land_clearing: 'Land Clearing',
  tree_removal: 'Tree Removal',
  tree_trimming: 'Tree Trimming',
  property_assessment: 'Property Assessment',
};

export default function ProposalsView({ organizationId }: ProposalsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);

  const proposals = useQuery(api.projects.getByStatus, {
    organizationId: organizationId as Id<"organizations">,
    status: "proposal"
  }) as Project[] | undefined;

  const customers = useQuery(api.customers.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Customer[] | undefined;

  const moveToNextStage = useMutation(api.projects.moveToNextStage);
  const deleteProject = useMutation(api.projects.remove);

  // Filter proposals based on search query
  const filteredProposals = useMemo(() => {
    if (!proposals || !customers) return [];
    if (!searchQuery.trim()) return proposals;

    const query = searchQuery.toLowerCase();
    return proposals.filter(proposal => {
      const customer = customers.find(c => c._id === proposal.customerId);
      return (
        customer?.name.toLowerCase().includes(query) ||
        customer?.propertyAddress.toLowerCase().includes(query) ||
        serviceTypeLabels[proposal.serviceType]?.toLowerCase().includes(query) ||
        proposal.projectIntent?.toLowerCase().includes(query)
      );
    });
  }, [proposals, customers, searchQuery]);

  const getCustomerName = (customerId: Id<"customers">) => {
    const customer = customers?.find(c => c._id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getCustomerAddress = (customerId: Id<"customers">) => {
    const customer = customers?.find(c => c._id === customerId);
    return customer?.propertyAddress || '';
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    setAnchorEl(event.currentTarget);
    setMenuProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuProject(null);
  };

  const handleConvertToWorkOrder = async () => {
    if (!menuProject) return;
    try {
      await moveToNextStage({ id: menuProject._id });
      handleMenuClose();
    } catch (error) {
      console.error('Error converting to work order:', error);
    }
  };

  const handleEdit = () => {
    if (!menuProject) return;
    setSelectedProject(menuProject);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!menuProject) return;
    if (confirm('Are you sure you want to delete this proposal?')) {
      try {
        await deleteProject({ id: menuProject._id });
        handleMenuClose();
      } catch (error) {
        console.error('Error deleting proposal:', error);
      }
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
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Proposals
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Create and manage professional proposals
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            New Proposal
          </Button>
        </Box>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search proposals by customer, address, or service type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 600 }}
        />

        {/* Results Count */}
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {filteredProposals.length} {filteredProposals.length === 1 ? 'proposal' : 'proposals'}
          {searchQuery && ` matching "${searchQuery}"`}
        </Typography>
      </Box>

      {/* Proposals List */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        bgcolor: '#000'
      }}>
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          {filteredProposals.length === 0 ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                {searchQuery ? 'No proposals found' : 'No proposals yet'}
              </Typography>
              <Typography variant="body2">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Convert leads to proposals or create a new proposal directly'
                }
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredProposals.map((proposal) => (
                <Card
                  key={proposal._id}
                  sx={{
                    bgcolor: '#0a0a0a',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: '#8b5cf6',
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            {getCustomerName(proposal.customerId)}
                          </Typography>
                        </Box>
                        <Chip
                          label={serviceTypeLabels[proposal.serviceType] || proposal.serviceType}
                          size="small"
                          sx={{
                            bgcolor: '#8b5cf6',
                            color: '#fff',
                            fontSize: '0.75rem',
                            mb: 1
                          }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, proposal)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    {getCustomerAddress(proposal.customerId) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          {getCustomerAddress(proposal.customerId)}
                        </Typography>
                      </Box>
                    )}

                    {proposal.projectIntent && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontSize: '0.875rem' }}>
                        Intent: {proposal.projectIntent}
                      </Typography>
                    )}

                    {proposal.treeShopScore !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          TreeShop Score:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {proposal.treeShopScore.toFixed(1)}
                        </Typography>
                      </Box>
                    )}

                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                      Created {new Date(proposal.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>
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
        <MenuItem onClick={handleConvertToWorkOrder}>
          Convert to Work Order
        </MenuItem>
        <MenuItem onClick={handleEdit}>Edit Details</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <AddLeadDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        organizationId={organizationId}
      />

      {selectedProject && (
        <EditProjectDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
        />
      )}
    </Box>
  );
}
