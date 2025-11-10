import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import SpeedIcon from '@mui/icons-material/Speed';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface LoadoutProfileDialogProps {
  open: boolean;
  onClose: () => void;
  loadoutId: Id<"loadouts">;
  onEdit: () => void;
}

const serviceTypeLabels: Record<string, string> = {
  forestry_mulching: 'Forestry Mulching',
  stump_grinding: 'Stump Grinding',
  land_clearing: 'Land Clearing',
  tree_removal: 'Tree Removal',
  tree_trimming: 'Tree Trimming',
};

export default function LoadoutProfileDialog({
  open,
  onClose,
  loadoutId,
  onEdit,
}: LoadoutProfileDialogProps) {
  const loadoutDetails = useQuery(api.loadouts.getWithDetails, { id: loadoutId });

  if (!loadoutDetails) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {loadoutDetails.name}
          </Typography>
          {loadoutDetails.loadoutNumber && (
            <Chip
              label={loadoutDetails.loadoutNumber}
              size="small"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'primary.dark',
                color: 'primary.light',
                fontSize: '0.75rem'
              }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#0a0a0a', pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Service Type */}
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Service Type
            </Typography>
            <Chip
              label={serviceTypeLabels[loadoutDetails.serviceType]}
              sx={{
                bgcolor: 'primary.main',
                color: '#fff',
                mt: 0.5
              }}
            />
          </Box>

          <Divider />

          {/* Production & Billing */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Rates & Production
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoneyIcon sx={{ fontSize: 20, color: 'success.main' }} />
                <Typography variant="body1">
                  <strong>Loadout Billing Rate:</strong> ${loadoutDetails.billingRates.margin50.toFixed(2)}/hr
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body1">
                  <strong>Production Rate:</strong> {loadoutDetails.productionRatePpH} PpH
                </Typography>
              </Box>
              {loadoutDetails.overheadCostPerHour > 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 4 }}>
                  Overhead: ${loadoutDetails.overheadCostPerHour.toFixed(2)}/hr
                </Typography>
              )}
            </Box>
          </Box>

          <Divider />

          {/* Equipment */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BuildIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Equipment ({loadoutDetails.equipment.length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {loadoutDetails.equipment.map((eq: any) => (
                <Box
                  key={eq._id}
                  sx={{
                    p: 1.5,
                    bgcolor: '#1a1a1a',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {eq.name}
                  </Typography>
                  {eq.inventoryNumber && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      #{eq.inventoryNumber}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          <Divider />

          {/* Crew */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PeopleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Crew ({loadoutDetails.employees.length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {loadoutDetails.employees.map((emp: any) => (
                <Box
                  key={emp._id}
                  sx={{
                    p: 1.5,
                    bgcolor: '#1a1a1a',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {emp.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ${emp.baseHourlyRate.toFixed(2)}/hr
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Timestamps */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Created: {new Date(loadoutDetails.createdAt).toLocaleDateString()}
            </Typography>
            {loadoutDetails.updatedAt && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Last Modified: {new Date(loadoutDetails.updatedAt).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ bgcolor: '#0a0a0a', borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button onClick={onEdit} variant="contained" color="primary">
          Edit Loadout
        </Button>
      </DialogActions>
    </Dialog>
  );
}
