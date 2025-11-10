import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import AddCustomerDialog from './AddCustomerDialog';
import EditCustomerDialog from './EditCustomerDialog';
import CustomerProfileDialog from './CustomerProfileDialog';

interface CustomerDirectoryProps {
  organizationId: string;
}

interface Customer {
  _id: Id<"customers">;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  notes?: string;
  createdAt: number;
}

interface Project {
  _id: Id<"projects">;
  customerId: Id<"customers">;
  status: string;
}

export default function CustomerDirectory({ organizationId }: CustomerDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const customers = useQuery(api.customers.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Customer[] | undefined;

  const projects = useQuery(api.projects.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Project[] | undefined;

  const deleteCustomer = useMutation(api.customers.remove);

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(query) ||
      customer.company?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.propertyAddress.toLowerCase().includes(query) ||
      customer.propertyCity.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Get project count for a customer
  const getProjectCount = (customerId: Id<"customers">) => {
    if (!projects) return 0;
    return projects.filter(p => p.customerId === customerId).length;
  };

  // Get active projects count (not completed/cancelled)
  const getActiveProjectCount = (customerId: Id<"customers">) => {
    if (!projects) return 0;
    return projects.filter(p =>
      p.customerId === customerId &&
      p.status !== 'completed' &&
      p.status !== 'cancelled'
    ).length;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, customer: Customer) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCustomer(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCustomer(null);
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    const projectCount = getProjectCount(selectedCustomer._id);
    if (projectCount > 0) {
      alert(`Cannot delete customer with ${projectCount} project(s). Delete projects first.`);
      handleMenuClose();
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedCustomer.name}?`)) {
      try {
        await deleteCustomer({ id: selectedCustomer._id });
        handleMenuClose();
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const handleViewDetails = () => {
    setProfileDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    setProfileDialogOpen(false); // Close profile dialog if open
    handleMenuClose();
  };

  const toggleCustomerExpanded = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
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
            Customers
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            Add Customer
          </Button>
        </Box>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search customers by name, company, email, phone, or address..."
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
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
          {searchQuery && ` matching "${searchQuery}"`}
        </Typography>
      </Box>

      {/* Customer List */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        bgcolor: '#000'
      }}>
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          {filteredCustomers.length === 0 ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </Typography>
              <Typography variant="body2">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Customers will be created automatically when you add new leads'
                }
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredCustomers.map((customer) => {
                const totalProjects = getProjectCount(customer._id);
                const activeProjects = getActiveProjectCount(customer._id);
                const isExpanded = expandedCustomers.has(customer._id);

                return (
                  <Card
                    key={customer._id}
                    sx={{
                      bgcolor: '#0a0a0a',
                      border: '1px solid',
                      borderColor: isExpanded ? 'primary.main' : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      }
                    }}
                  >
                    <CardActionArea onClick={() => toggleCustomerExpanded(customer._id)}>
                      <CardContent sx={{ py: isExpanded ? 2 : 1.5 }}>
                        {/* Always visible - Customer Name Row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              {customer.name}
                            </Typography>
                            {!isExpanded && totalProjects > 0 && (
                              <Chip
                                label={totalProjects}
                                size="small"
                                sx={{
                                  bgcolor: '#1a1a1a',
                                  color: 'text.secondary',
                                  fontSize: '0.7rem',
                                  height: 20,
                                  ml: 1
                                }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMenuOpen(e, customer);
                              }}
                              sx={{ color: 'text.secondary' }}
                            >
                              <MoreVertIcon />
                            </IconButton>
                            {isExpanded ? (
                              <ExpandLessIcon sx={{ color: 'text.secondary' }} />
                            ) : (
                              <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
                            )}
                          </Box>
                        </Box>

                        {/* Expanded content */}
                        {isExpanded && (
                          <Box sx={{ mt: 2 }}>
                            {/* Company */}
                            {customer.company && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, ml: 3.5 }}>
                                <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                  {customer.company}
                                </Typography>
                              </Box>
                            )}

                            {/* Project Count */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                              <Chip
                                label={`${totalProjects} Total Projects`}
                                size="small"
                                sx={{
                                  bgcolor: '#1a1a1a',
                                  color: 'text.secondary',
                                  fontSize: '0.75rem',
                                  height: 22
                                }}
                              />
                              {activeProjects > 0 && (
                                <Chip
                                  label={`${activeProjects} Active`}
                                  size="small"
                                  sx={{
                                    bgcolor: 'primary.main',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    height: 22
                                  }}
                                />
                              )}
                            </Box>

                            {/* Address */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                              <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.3 }} />
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                {customer.propertyAddress}, {customer.propertyCity}, {customer.propertyState} {customer.propertyZip}
                              </Typography>
                            </Box>

                            {/* Contact Info */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {customer.email && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                    {customer.email}
                                  </Typography>
                                </Box>
                              )}
                              {customer.phone && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                    {customer.phone}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* Created Date */}
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                              Customer since {new Date(customer.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </CardActionArea>
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
        <MenuItem onClick={handleViewDetails}>View Full Profile</MenuItem>
        <MenuItem onClick={handleEdit}>Edit Customer</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete Customer
        </MenuItem>
      </Menu>

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        organizationId={organizationId}
      />

      {/* Edit Customer Dialog */}
      {selectedCustomer && (
        <EditCustomerDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          customerId={selectedCustomer._id}
        />
      )}

      {/* Customer Profile Dialog */}
      {selectedCustomer && (
        <CustomerProfileDialog
          open={profileDialogOpen}
          onClose={() => setProfileDialogOpen(false)}
          customerId={selectedCustomer._id}
          onEdit={handleEdit}
        />
      )}
    </Box>
  );
}
