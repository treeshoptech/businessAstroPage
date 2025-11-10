import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

// Service type icons would go here

const categoryColors: Record<string, string> = {
  tree_work: '#10b981',
  land_work: '#f59e0b',
  specialty: '#8b5cf6',
};

interface LineItemDirectoryModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onSelectLineItem: (lineItem: any) => void;
}

export default function LineItemDirectoryModal({
  open,
  onClose,
  organizationId,
  onSelectLineItem,
}: LineItemDirectoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Query all active line items
  const lineItems = useQuery(api.lineItems.getByStatus, {
    organizationId: organizationId as Id<"organizations">,
    status: "active",
  });

  // Filter line items
  const filteredLineItems = React.useMemo(() => {
    if (!lineItems) return [];
    
    let filtered = lineItems;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.serviceName.toLowerCase().includes(query) ||
        item.serviceCode.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [lineItems, selectedCategory, searchQuery]);

  const handleSelectLineItem = (lineItem: any) => {
    onSelectLineItem(lineItem);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0a0a0a',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Add Service to Proposal
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Select a service type from your line item directory
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Search and Category Filter */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search services..."
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
            sx={{ mb: 2 }}
          />

          {/* Category Chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="All Services"
              onClick={() => setSelectedCategory(null)}
              sx={{
                bgcolor: selectedCategory === null ? '#fff' : 'transparent',
                color: selectedCategory === null ? '#000' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedCategory === null ? '#fff' : 'divider',
                '&:hover': {
                  bgcolor: selectedCategory === null ? '#fff' : 'rgba(255,255,255,0.05)',
                },
              }}
            />
            <Chip
              label="Tree Work"
              onClick={() => setSelectedCategory('tree_work')}
              sx={{
                bgcolor: selectedCategory === 'tree_work' ? categoryColors.tree_work : 'transparent',
                color: selectedCategory === 'tree_work' ? '#fff' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedCategory === 'tree_work' ? categoryColors.tree_work : 'divider',
                '&:hover': {
                  bgcolor: selectedCategory === 'tree_work' ? categoryColors.tree_work : 'rgba(16,185,129,0.1)',
                },
              }}
            />
            <Chip
              label="Land Work"
              onClick={() => setSelectedCategory('land_work')}
              sx={{
                bgcolor: selectedCategory === 'land_work' ? categoryColors.land_work : 'transparent',
                color: selectedCategory === 'land_work' ? '#fff' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedCategory === 'land_work' ? categoryColors.land_work : 'divider',
                '&:hover': {
                  bgcolor: selectedCategory === 'land_work' ? categoryColors.land_work : 'rgba(245,158,11,0.1)',
                },
              }}
            />
            <Chip
              label="Specialty"
              onClick={() => setSelectedCategory('specialty')}
              sx={{
                bgcolor: selectedCategory === 'specialty' ? categoryColors.specialty : 'transparent',
                color: selectedCategory === 'specialty' ? '#fff' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedCategory === 'specialty' ? categoryColors.specialty : 'divider',
                '&:hover': {
                  bgcolor: selectedCategory === 'specialty' ? categoryColors.specialty : 'rgba(139,92,246,0.1)',
                },
              }}
            />
          </Box>
        </Box>

        {/* Line Items Grid */}
        {filteredLineItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
              {searchQuery || selectedCategory ? 'No services found' : 'No active line items'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Create line items in Settings to get started'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            maxHeight: '500px',
            overflow: 'auto',
            pr: 1,
          }}>
            {filteredLineItems.map((lineItem) => (
              <Card
                key={lineItem._id}
                sx={{
                  bgcolor: '#1a1a1a',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: categoryColors[lineItem.category],
                    boxShadow: `0 0 0 1px ${categoryColors[lineItem.category]}40`,
                  },
                }}
              >
                <CardActionArea onClick={() => handleSelectLineItem(lineItem)}>
                  <CardContent>
                    {/* Category Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', mb: 1 }}>
                      <Chip
                        label={lineItem.category.replace('_', ' ')}
                        size="small"
                        sx={{
                          bgcolor: categoryColors[lineItem.category],
                          color: '#fff',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>
                    {/* Service Name */}
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem' }}>
                      {lineItem.serviceName}
                    </Typography>

                    {/* Service Code */}
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                      {lineItem.serviceCode}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {lineItem.description}
                    </Typography>

                    {/* Production Rate */}
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Production Rate:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {lineItem.defaultProductionRatePpH} PpH
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}

        {/* Results Count */}
        {filteredLineItems.length > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
            Showing {filteredLineItems.length} {filteredLineItems.length === 1 ? 'service' : 'services'}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
