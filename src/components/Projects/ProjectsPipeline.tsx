import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import AddLeadDialog from './AddLeadDialog';
import EditProjectDialog from './EditProjectDialog';

interface ProjectsPipelineProps {
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

const statusConfig = {
  lead: { label: 'Leads', color: '#3b82f6' },
  proposal: { label: 'Proposals', color: '#8b5cf6' },
  work_order: { label: 'Work Orders', color: '#f59e0b' },
  invoice: { label: 'Invoices', color: '#10b981' },
};

const serviceTypeLabels: Record<string, string> = {
  forestry_mulching: 'Forestry Mulching',
  stump_grinding: 'Stump Grinding',
  land_clearing: 'Land Clearing',
  tree_removal: 'Tree Removal',
  tree_trimming: 'Tree Trimming',
  property_assessment: 'Property Assessment',
};

export default function ProjectsPipeline({ organizationId }: ProjectsPipelineProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);

  const projects = useQuery(api.projects.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Project[] | undefined;

  const customers = useQuery(api.customers.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Customer[] | undefined;

  const moveToNextStage = useMutation(api.projects.moveToNextStage);
  const deleteProject = useMutation(api.projects.remove);

  // Group projects by status
  const projectsByStatus = useMemo(() => {
    if (!projects) return {};
    return projects.reduce((acc, project) => {
      if (!acc[project.status]) {
        acc[project.status] = [];
      }
      acc[project.status].push(project);
      return acc;
    }, {} as Record<string, Project[]>);
  }, [projects]);

  const stages = ['lead', 'proposal', 'work_order', 'invoice'];
  const currentStage = stages[currentTab];

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

  const handleMoveNext = async () => {
    if (!menuProject) return;
    try {
      await moveToNextStage({ id: menuProject._id });
      handleMenuClose();
    } catch (error) {
      console.error('Error moving project:', error);
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
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject({ id: menuProject._id });
        handleMenuClose();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const getNextStageAction = (status: string) => {
    const nextActions: Record<string, string> = {
      lead: 'Create Proposal',
      proposal: 'Create Work Order',
      work_order: 'Create Invoice',
      invoice: 'Mark Complete',
    };
    return nextActions[status] || 'Next Stage';
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
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>
            Projects Pipeline
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            New Lead
          </Button>
        </Box>

        {/* Tabs for Mobile/Desktop */}
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }
          }}
        >
          {stages.map((stage) => {
            const config = statusConfig[stage as keyof typeof statusConfig];
            const count = projectsByStatus[stage]?.length || 0;
            return (
              <Tab
                key={stage}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {config.label}
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        bgcolor: config.color,
                        color: '#fff',
                        minWidth: 24,
                        height: 20,
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Projects List for Current Tab */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        bgcolor: '#000'
      }}>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {!projectsByStatus[currentStage]?.length ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                No {statusConfig[currentStage as keyof typeof statusConfig].label}
              </Typography>
              <Typography variant="body2">
                {currentStage === 'lead'
                  ? 'Click "New Lead" to create your first lead'
                  : `Move projects from previous stages to see them here`
                }
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {projectsByStatus[currentStage].map((project) => (
                <Card
                  key={project._id}
                  sx={{
                    bgcolor: '#0a0a0a',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: statusConfig[project.status as keyof typeof statusConfig].color,
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            {getCustomerName(project.customerId)}
                          </Typography>
                        </Box>
                        <Chip
                          label={serviceTypeLabels[project.serviceType] || project.serviceType}
                          size="small"
                          sx={{
                            bgcolor: statusConfig[project.status as keyof typeof statusConfig].color,
                            color: '#fff',
                            fontSize: '0.75rem',
                            mb: 1
                          }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, project)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    {getCustomerAddress(project.customerId) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          {getCustomerAddress(project.customerId)}
                        </Typography>
                      </Box>
                    )}

                    {project.treeShopScore !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          TreeShop Score:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {project.treeShopScore.toFixed(1)}
                        </Typography>
                      </Box>
                    )}

                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                      Created {new Date(project.createdAt).toLocaleDateString()}
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
        {menuProject?.status !== 'invoice' && (
          <MenuItem onClick={handleMoveNext}>
            {getNextStageAction(menuProject?.status || '')}
          </MenuItem>
        )}
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
