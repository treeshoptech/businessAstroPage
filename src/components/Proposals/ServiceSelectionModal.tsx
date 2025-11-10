import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ForestIcon from '@mui/icons-material/Forest';
import LandscapeIcon from '@mui/icons-material/Landscape';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ParkIcon from '@mui/icons-material/Park';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

// Import calculator modals
import MulchingCalculatorModal from './Calculators/MulchingCalculatorModal';
import StumpGrindingCalculatorModal from './Calculators/StumpGrindingCalculatorModal';
import LandClearingCalculatorModal from './Calculators/LandClearingCalculatorModal';
import TreeRemovalCalculatorModal from './Calculators/TreeRemovalCalculatorModal';
import TreeTrimmingCalculatorModal from './Calculators/TreeTrimmingCalculatorModal';

import type { PricingCalculationResult } from '../../lib/pricing/formulas';

interface ServiceSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onServiceAdded: (lineItem: PricingCalculationResult) => void;
  propertyAddress?: string;
  driveTimeMinutes?: number;
  organizationId: string;
}

type ServiceType = 'mulching' | 'stump-grinding' | 'land-clearing' | 'tree-removal' | 'tree-trimming';

const services = [
  {
    type: 'mulching' as ServiceType,
    icon: <ForestIcon />,
    title: 'Forestry Mulching',
    description: 'Clear vegetation by acreage and DBH',
    color: '#4CAF50',
  },
  {
    type: 'stump-grinding' as ServiceType,
    icon: <DeleteSweepIcon />,
    title: 'Stump Grinding',
    description: 'Grind stumps with diameter and depth',
    color: '#FF9800',
  },
  {
    type: 'land-clearing' as ServiceType,
    icon: <LandscapeIcon />,
    title: 'Land Clearing',
    description: 'Clear lots by project type and intensity',
    color: '#FFC107',
  },
  {
    type: 'tree-removal' as ServiceType,
    icon: <ParkIcon />,
    title: 'Tree Removal',
    description: 'Remove trees from inventory with AFISS',
    color: '#F44336',
  },
  {
    type: 'tree-trimming' as ServiceType,
    icon: <ContentCutIcon />,
    title: 'Tree Trimming',
    description: 'Trim trees with adjustable intensity',
    color: '#2196F3',
  },
];

export default function ServiceSelectionModal({
  open,
  onClose,
  onServiceAdded,
  propertyAddress,
  driveTimeMinutes,
  organizationId,
}: ServiceSelectionModalProps) {
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const handleServiceSelect = (serviceType: ServiceType) => {
    setSelectedService(serviceType);
    setCalculatorOpen(true);
  };

  const handleCalculatorClose = () => {
    setCalculatorOpen(false);
    setSelectedService(null);
  };

  const handleServiceCalculated = (result: PricingCalculationResult) => {
    onServiceAdded(result);
    handleCalculatorClose();
    onClose(); // Close service selection after adding
  };

  return (
    <>
      <Dialog
        open={open && !calculatorOpen}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Add Service
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Select a service type to add to this proposal
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <List sx={{ p: 0 }}>
            {services.map((service) => (
              <ListItemButton
                key={service.type}
                onClick={() => handleServiceSelect(service.type)}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: service.color,
                    bgcolor: `${service.color}10`,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 48,
                    color: service.color,
                    '& svg': { fontSize: 32 },
                  }}
                >
                  {service.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {service.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {service.description}
                    </Typography>
                  }
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Calculator Modals */}
      {selectedService === 'mulching' && (
        <MulchingCalculatorModal
          open={calculatorOpen}
          onClose={handleCalculatorClose}
          onCalculate={handleServiceCalculated}
          propertyAddress={propertyAddress}
          driveTimeMinutes={driveTimeMinutes}
          organizationId={organizationId}
        />
      )}

      {selectedService === 'stump-grinding' && (
        <StumpGrindingCalculatorModal
          open={calculatorOpen}
          onClose={handleCalculatorClose}
          onCalculate={handleServiceCalculated}
          propertyAddress={propertyAddress}
          driveTimeMinutes={driveTimeMinutes}
          organizationId={organizationId}
        />
      )}

      {selectedService === 'land-clearing' && (
        <LandClearingCalculatorModal
          open={calculatorOpen}
          onClose={handleCalculatorClose}
          onCalculate={handleServiceCalculated}
          propertyAddress={propertyAddress}
          driveTimeMinutes={driveTimeMinutes}
          organizationId={organizationId}
        />
      )}

      {selectedService === 'tree-removal' && (
        <TreeRemovalCalculatorModal
          open={calculatorOpen}
          onClose={handleCalculatorClose}
          onCalculate={handleServiceCalculated}
          propertyAddress={propertyAddress}
          driveTimeMinutes={driveTimeMinutes}
          organizationId={organizationId}
        />
      )}

      {selectedService === 'tree-trimming' && (
        <TreeTrimmingCalculatorModal
          open={calculatorOpen}
          onClose={handleCalculatorClose}
          onCalculate={handleServiceCalculated}
          propertyAddress={propertyAddress}
          driveTimeMinutes={driveTimeMinutes}
          organizationId={organizationId}
        />
      )}
    </>
  );
}
