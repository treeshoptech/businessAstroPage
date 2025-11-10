import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { Id } from '../../../convex/_generated/dataModel';
import MulchingCalculatorModal from './Calculators/MulchingCalculatorModal';
import StumpGrindingCalculatorModal from './Calculators/StumpGrindingCalculatorModal';
import LandClearingCalculatorModal from './Calculators/LandClearingCalculatorModal';
import TreeRemovalCalculatorModal from './Calculators/TreeRemovalCalculatorModal';
import TreeTrimmingCalculatorModal from './Calculators/TreeTrimmingCalculatorModal';

interface ServiceSelectionModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onLineItemAdded: (lineItem: any) => void;
  propertyLatitude: number;
  propertyLongitude: number;
  orgLatitude: number;
  orgLongitude: number;
}

interface ServiceType {
  id: string;
  icon: string;
  name: string;
  description: string;
}

const serviceTypes: ServiceType[] = [
  {
    id: 'forestry-mulching',
    icon: '🌲',
    name: 'Forestry Mulching',
    description: 'Clear vegetation up to 8" diameter using specialized mulching equipment',
  },
  {
    id: 'stump-grinding',
    icon: '🪵',
    name: 'Stump Grinding',
    description: 'Professional stump grinding and removal below grade level',
  },
  {
    id: 'land-clearing',
    icon: '🌳',
    name: 'Land Clearing',
    description: 'Complete land clearing for residential and commercial projects',
  },
  {
    id: 'tree-removal',
    icon: '🌳',
    name: 'Tree Removal',
    description: 'Safe removal of trees with professional climbing and rigging',
  },
  {
    id: 'tree-trimming',
    icon: '✂️',
    name: 'Tree Trimming',
    description: 'Professional pruning and trimming to improve tree health and appearance',
  },
];

export default function ServiceSelectionModal({
  open,
  onClose,
  organizationId,
  onLineItemAdded,
  propertyLatitude,
  propertyLongitude,
  orgLatitude,
  orgLongitude,
}: ServiceSelectionModalProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
  };

  const handleCalculatorClose = () => {
    setSelectedService(null);
  };

  const handleLineItemComplete = (lineItem: any) => {
    onLineItemAdded(lineItem);
    setSelectedService(null);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && !selectedService}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Select Service
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <List sx={{ py: 0 }}>
            {serviceTypes.map((service, index) => (
              <React.Fragment key={service.id}>
                <ListItemButton
                  onClick={() => handleServiceSelect(service.id)}
                  sx={{
                    py: 2.5,
                    px: 3,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 56 }}>
                    <Typography variant="h4" sx={{ fontSize: '2rem' }}>
                      {service.icon}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {service.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {service.description}
                      </Typography>
                    }
                  />
                </ListItemButton>
                {index < serviceTypes.length - 1 && (
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mx: 3 }} />
                )}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Calculator Modals */}
      <MulchingCalculatorModal
        open={selectedService === 'forestry-mulching'}
        onClose={handleCalculatorClose}
        organizationId={organizationId}
        onLineItemAdded={handleLineItemComplete}
        propertyLatitude={propertyLatitude}
        propertyLongitude={propertyLongitude}
        orgLatitude={orgLatitude}
        orgLongitude={orgLongitude}
      />

      <StumpGrindingCalculatorModal
        open={selectedService === 'stump-grinding'}
        onClose={handleCalculatorClose}
        organizationId={organizationId}
        onLineItemAdded={handleLineItemComplete}
        propertyLatitude={propertyLatitude}
        propertyLongitude={propertyLongitude}
        orgLatitude={orgLatitude}
        orgLongitude={orgLongitude}
      />

      <LandClearingCalculatorModal
        open={selectedService === 'land-clearing'}
        onClose={handleCalculatorClose}
        organizationId={organizationId}
        onLineItemAdded={handleLineItemComplete}
        propertyLatitude={propertyLatitude}
        propertyLongitude={propertyLongitude}
        orgLatitude={orgLatitude}
        orgLongitude={orgLongitude}
      />

      <TreeRemovalCalculatorModal
        open={selectedService === 'tree-removal'}
        onClose={handleCalculatorClose}
        organizationId={organizationId}
        onLineItemAdded={handleLineItemComplete}
        propertyLatitude={propertyLatitude}
        propertyLongitude={propertyLongitude}
        orgLatitude={orgLatitude}
        orgLongitude={orgLongitude}
      />

      <TreeTrimmingCalculatorModal
        open={selectedService === 'tree-trimming'}
        onClose={handleCalculatorClose}
        organizationId={organizationId}
        onLineItemAdded={handleLineItemComplete}
        propertyLatitude={propertyLatitude}
        propertyLongitude={propertyLongitude}
        orgLatitude={orgLatitude}
        orgLongitude={orgLongitude}
      />
    </>
  );
}
