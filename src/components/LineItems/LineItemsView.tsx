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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface LineItemsViewProps {
  organizationId: string;
}

interface LineItem {
  _id: Id<"lineItems">;
  serviceName: string;
  serviceCode: string;
  serviceType: string;
  category: "tree_work" | "land_work" | "specialty";
  status: "active" | "draft" | "inactive";
  description: string;
  formulaType: string;
  defaultProductionRatePpH: number;
  minimumPrice: number;
  primaryUnit: string;
  createdAt: number;
  updatedAt?: number;
}

const categoryLabels = {
  tree_work: 'Tree Work',
  land_work: 'Land Work',
  specialty: 'Specialty',
};

const serviceTypeLabels: Record<string, string> = {
  forestry_mulching: 'Forestry Mulching',
  stump_grinding: 'Stump Grinding',
  land_clearing: 'Land Clearing',
  tree_removal: 'Tree Removal',
  tree_trimming: 'Tree Trimming',
  property_assessment: 'Property Assessment',
  custom: 'Custom Service',
};

const formulaTypeLabels: Record<string, string> = {
  acreage_dbh: 'Acreage × DBH',
  stump_score: 'Stump Score (D² × H+D)',
  day_based: 'Day-Based Estimation',
  tree_removal: 'Tree Score (H×C×2×D÷12)',
  tree_trimming: 'Trimming Factor',
  custom: 'Custom Formula',
};

export default function LineItemsView({ organizationId }: LineItemsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'inactive'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<LineItem | null>(null);

  const lineItems = useQuery(api.lineItems.list, {
    organizationId: organizationId as Id<"organizations">
  }) as LineItem[] | undefined;

  const duplicateLineItem = useMutation(api.lineItems.duplicate);
  const deleteLineItem = useMutation(api.lineItems.remove);
  const updateLineItem = useMutation(api.lineItems.update);

  // Filter line items
  const filteredLineItems = useMemo(() => {
    if (!lineItems) return [];

    let filtered = lineItems;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.serviceName.toLowerCase().includes(query) ||
        item.serviceCode.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        serviceTypeLabels[item.serviceType]?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [lineItems, statusFilter, searchQuery]);

  // Group by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, LineItem[]> = {
      tree_work: [],
      land_work: [],
      specialty: [],
    };

    filteredLineItems.forEach(item => {
      grouped[item.category].push(item);
    });

    return grouped;
  }, [filteredLineItems]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: LineItem) => {
    setAnchorEl(event.currentTarget);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuItem(null);
  };

  const handleDuplicate = async () => {
    if (!menuItem) return;
    try {
      await duplicateLineItem({ id: menuItem._id });
      handleMenuClose();
    } catch (error) {
      console.error('Error duplicating line item:', error);
    }
  };

  const handleToggleStatus = async () => {
    if (!menuItem) return;
    try {
      const newStatus = menuItem.status === 'active' ? 'inactive' : 'active';
      await updateLineItem({ id: menuItem._id, status: newStatus });
      handleMenuClose();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    if (!menuItem) return;
    if (confirm(`Are you sure you want to delete "${menuItem.serviceName}"?`)) {
      try {
        await deleteLineItem({ id: menuItem._id });
        handleMenuClose();
      } catch (error) {
        console.error('Error deleting line item:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'inactive': return 'default';
      default: return 'default';
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
              Line Items Library
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Manage service templates and pricing formulas
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => window.location.href = '/app/line-items/new'}
            size="small"
          >
            New Line Item
          </Button>
        </Box>

        {/* Status Tabs */}
        <Tabs
          value={statusFilter}
          onChange={(_, value) => setStatusFilter(value)}
          sx={{ mb: 2, minHeight: 40 }}
        >
          <Tab label="All" value="all" sx={{ minHeight: 40 }} />
          <Tab label="Active" value="active" sx={{ minHeight: 40 }} />
          <Tab label="Draft" value="draft" sx={{ minHeight: 40 }} />
          <Tab label="Inactive" value="inactive" sx={{ minHeight: 40 }} />
        </Tabs>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search line items by name, code, or description..."
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
          {filteredLineItems.length} {filteredLineItems.length === 1 ? 'item' : 'items'}
          {searchQuery && ` matching "${searchQuery}"`}
        </Typography>
      </Box>

      {/* Line Items List */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        bgcolor: '#000'
      }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {filteredLineItems.length === 0 ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                {searchQuery ? 'No line items found' : 'No line items yet'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first service line item to get started'
                }
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => window.location.href = '/app/line-items/new'}
                >
                  Create Line Item
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(itemsByCategory).map(([category, items]) => (
                items.length > 0 && (
                  <Box key={category}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </Typography>
                    <Grid container spacing={2}>
                      {items.map((item) => (
                        <Grid item xs={12} md={6} lg={4} key={item._id}>
                          <Card
                            sx={{
                              bgcolor: '#0a0a0a',
                              border: '1px solid',
                              borderColor: 'divider',
                              height: '100%',
                              '&:hover': {
                                borderColor: '#8b5cf6',
                              }
                            }}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', mb: 0.5 }}>
                                    {item.serviceName}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                    {item.serviceCode}
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleMenuOpen(e, item)}
                                  sx={{ color: 'text.secondary' }}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </Box>

                              <Chip
                                label={item.status.toUpperCase()}
                                size="small"
                                color={getStatusColor(item.status) as any}
                                sx={{ mb: 1, fontSize: '0.7rem' }}
                              />

                              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>
                                {item.description}
                              </Typography>

                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Formula:
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {formulaTypeLabels[item.formulaType]}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Production:
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {item.defaultProductionRatePpH} PpH
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Min Price:
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    {formatCurrency(item.minimumPrice)}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )
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
        <MenuItem onClick={() => {
          if (menuItem) window.location.href = `/app/line-items/edit/${menuItem._id}`;
          handleMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={handleToggleStatus}>
          {menuItem?.status === 'active' ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
