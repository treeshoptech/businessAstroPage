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
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DescriptionIcon from '@mui/icons-material/Description';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface CustomerProfileDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: Id<"customers">;
  onEdit: () => void;
}

export default function CustomerProfileDialog({
  open,
  onClose,
  customerId,
  onEdit,
}: CustomerProfileDialogProps) {
  const customer = useQuery(api.customers.get, { id: customerId });

  const projects = useQuery(api.projects.list, {
    organizationId: customer?.organizationId as Id<"organizations">
  });

  if (!customer) {
    return null;
  }

  // Get customer's projects
  const customerProjects = projects?.filter(p => p.customerId === customerId) || [];
  const activeProjects = customerProjects.filter(p =>
    p.status !== 'completed' && p.status !== 'cancelled'
  );

  // Status label mapping
  const statusLabels: Record<string, string> = {
    lead: 'Lead',
    proposal: 'Proposal',
    work_order: 'Work Order',
    invoice: 'Invoice',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  // Status colors
  const statusColors: Record<string, string> = {
    lead: '#666',
    proposal: '#2196f3',
    work_order: '#ff9800',
    invoice: '#4caf50',
    completed: '#9e9e9e',
    cancelled: '#f44336',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PersonIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {customer.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`${customerProjects.length} Projects`}
              size="small"
              sx={{
                bgcolor: '#1a1a1a',
                color: 'text.secondary',
                fontSize: '0.75rem'
              }}
            />
            {activeProjects.length > 0 && (
              <Chip
                label={`${activeProjects.length} Active`}
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: '#fff',
                  fontSize: '0.75rem'
                }}
              />
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#0a0a0a', pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Company */}
          {customer.company && (
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                Company
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <BusinessIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {customer.company}
                </Typography>
              </Box>
            </Box>
          )}

          <Divider />

          {/* Contact Information */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Contact Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {customer.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="body1">
                    {customer.email}
                  </Typography>
                </Box>
              )}
              {customer.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="body1">
                    {customer.phone}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Divider />

          {/* Property Address */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Property Location
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <LocationOnIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.3 }} />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {customer.propertyAddress}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {customer.propertyCity}, {customer.propertyState} {customer.propertyZip}
                </Typography>
                {customer.propertyLatitude && customer.propertyLongitude && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                    Coordinates: {customer.propertyLatitude.toFixed(6)}, {customer.propertyLongitude.toFixed(6)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Projects */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DescriptionIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Projects ({customerProjects.length})
              </Typography>
            </Box>
            {customerProjects.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                No projects yet
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {customerProjects.map((project: any) => (
                  <Box
                    key={project._id}
                    sx={{
                      p: 1.5,
                      bgcolor: '#1a1a1a',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {project.serviceType.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusLabels[project.status]}
                      size="small"
                      sx={{
                        bgcolor: statusColors[project.status],
                        color: '#fff',
                        fontSize: '0.7rem',
                        height: 22
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Notes */}
          {customer.notes && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {customer.notes}
                </Typography>
              </Box>
            </>
          )}

          {/* Created Date */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Customer since {new Date(customer.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ bgcolor: '#0a0a0a', borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button onClick={onEdit} variant="contained" color="primary">
          Edit Customer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
