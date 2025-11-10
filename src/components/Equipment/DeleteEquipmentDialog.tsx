import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import WarningIcon from '@mui/icons-material/Warning';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface Equipment {
  _id: Id<"equipment">;
  name: string;
}

interface DeleteEquipmentDialogProps {
  open: boolean;
  onClose: () => void;
  equipment: Equipment;
  organizationId: Id<"organizations">;
}

export default function DeleteEquipmentDialog({
  open,
  onClose,
  equipment,
  organizationId,
}: DeleteEquipmentDialogProps) {
  const removeEquipment = useMutation(api.equipment.remove);
  const usageCheck = useQuery(
    api.equipment.checkUsage,
    open ? { equipmentId: equipment._id, organizationId } : "skip"
  );

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (usageCheck?.isUsed) {
      alert('Cannot delete. Equipment is used in loadouts.');
      return;
    }

    setIsDeleting(true);
    try {
      await removeEquipment({
        id: equipment._id,
        organizationId,
      });
      onClose();
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
      alert(error.message || 'Failed to delete equipment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon sx={{ color: 'warning.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Delete Equipment
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          {usageCheck?.isUsed ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Cannot delete <strong>{equipment.name}</strong>. This equipment is used in{' '}
              {usageCheck.loadoutCount} loadout(s):
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                {usageCheck.loadouts.map((loadout) => (
                  <li key={loadout.id}>{loadout.name}</li>
                ))}
              </Box>
            </Alert>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete <strong>{equipment.name}</strong>?
              </Typography>
              <Alert severity="warning">
                This action cannot be undone.
              </Alert>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={usageCheck?.isUsed || isDeleting}
          sx={{ fontWeight: 600 }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
