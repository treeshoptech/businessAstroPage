import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import ForestIcon from '@mui/icons-material/Forest';
import LandscapeIcon from '@mui/icons-material/Landscape';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { Id } from '../../../convex/_generated/dataModel';
import ForestryMulchingCalculator from './ForestryMulchingCalculator';

interface PricingCalculatorProps {
  organizationId: string;
}

type ServiceType = 'forestry_mulching' | 'stump_grinding' | 'land_clearing' | null;

export default function PricingCalculator({ organizationId }: PricingCalculatorProps) {
  const [selectedService, setSelectedService] = useState<ServiceType>(null);

  const services = [
    {
      id: 'forestry_mulching' as const,
      name: 'Forestry Mulching',
      description: 'Clear vegetation with precision mulching',
      icon: ForestIcon,
      color: '#4caf50',
      available: true,
    },
    {
      id: 'stump_grinding' as const,
      name: 'Stump Grinding',
      description: 'Professional stump removal services',
      icon: DeleteSweepIcon,
      color: '#ff9800',
      available: false,
    },
    {
      id: 'land_clearing' as const,
      name: 'Land Clearing',
      description: 'Complete lot clearing and site prep',
      icon: LandscapeIcon,
      color: '#2196f3',
      available: false,
    },
  ];

  if (selectedService === 'forestry_mulching') {
    return (
      <ForestryMulchingCalculator
        organizationId={organizationId as Id<"organizations">}
        onBack={() => setSelectedService(null)}
      />
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#000' }}>
      <Box sx={{
        p: { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
          Pricing Calculator
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Select a service to generate a professional proposal
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
        <Box sx={{
          maxWidth: 1200,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3
        }}>
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card
                key={service.id}
                sx={{
                  bgcolor: '#0a0a0a',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  opacity: service.available ? 1 : 0.5,
                  '&:hover': service.available ? { borderColor: service.color } : {}
                }}
              >
                <CardActionArea
                  onClick={() => service.available && setSelectedService(service.id)}
                  disabled={!service.available}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Icon sx={{ fontSize: 48, color: service.color }} />
                      {!service.available && (
                        <Chip label="Coming Soon" size="small" sx={{ bgcolor: '#1a1a1a' }} />
                      )}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      {service.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
                      {service.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
