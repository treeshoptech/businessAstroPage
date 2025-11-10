import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import AddEmployeeDialog from './AddEmployeeDialog';
import TreeShopCodeBuilder from './TreeShopCodeBuilder';

interface EmployeeDirectoryProps {
  organizationId: string;
  currentUserRole: string;
}

interface Employee {
  _id: Id<"employees">;
  name: string;
  position: "entry_ground_crew" | "experienced_climber" | "crew_leader" | "certified_arborist" | "specialized_operator";
  baseHourlyRate: number;
  burdenMultiplier: number;
  hireDate: number;
  status: "active" | "inactive";
  createdAt: number;
  // TreeShop coding fields
  treeShopCode?: string;
  treeShopQualificationPayRate?: number;
}

const positionLabels: Record<string, string> = {
  entry_ground_crew: 'Entry Ground Crew',
  experienced_climber: 'Experienced Climber',
  crew_leader: 'Crew Leader',
  certified_arborist: 'Certified Arborist',
  specialized_operator: 'Specialized Operator',
};

const statusColors: Record<string, string> = {
  active: '#1b5e20',
  inactive: '#424242',
};

export default function EmployeeDirectory({ organizationId, currentUserRole }: EmployeeDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [treeShopBuilderOpen, setTreeShopBuilderOpen] = useState(false);

  const employees = useQuery(api.employees.list, {
    organizationId: organizationId as Id<"organizations">
  }) as Employee[] | undefined;

  // Filter employees based on search
  const filteredEmployees = employees?.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    positionLabels[emp.position].toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, employee: Employee) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedEmployee(employee);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEmployee(null);
  };

  const handleViewDetails = () => {
    console.log('View details for:', selectedEmployee);
    handleMenuClose();
  };

  const handleUpgradeToTreeShop = () => {
    setTreeShopBuilderOpen(true);
    handleMenuClose();
  };

  const calculateTrueCost = (baseRate?: number, multiplier?: number): number => {
    if (!baseRate || !multiplier) return 0;
    return baseRate * multiplier;
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
            Employees
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setAddDialogOpen(true)}
          >
            Add Employee
          </Button>
        </Box>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search employees by name or position..."
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

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'}
        </Typography>
      </Box>

      {/* Employee List */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        bgcolor: '#000'
      }}>
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          {filteredEmployees.length === 0 ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary'
            }}>
              <Typography variant="h6" gutterBottom>
                {searchQuery ? 'No employees found' : 'No employees yet'}
              </Typography>
              <Typography variant="body2">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Team members are managed through user accounts'
                }
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredEmployees.map((employee) => {
                const trueCost = calculateTrueCost(employee.baseHourlyRate, employee.burdenMultiplier);
                const isExpanded = expandedEmployeeId === employee._id;

                return (
                  <Card
                    key={employee._id}
                    sx={{
                      bgcolor: '#0a0a0a',
                      border: '1px solid',
                      borderColor: isExpanded ? 'primary.main' : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      }
                    }}
                  >
                    <CardContent>
                      {/* Collapsed Header - Always Visible */}
                      <Box
                        onClick={() => setExpandedEmployeeId(isExpanded ? null : employee._id)}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                              {employee.name}
                            </Typography>
                            {employee.treeShopCode && (
                              <Chip
                                label={employee.treeShopCode}
                                size="small"
                                sx={{
                                  fontFamily: 'monospace',
                                  bgcolor: 'success.dark',
                                  color: 'success.light',
                                  fontSize: '0.7rem',
                                  height: 20,
                                  alignSelf: 'flex-start'
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            ${employee.baseHourlyRate.toFixed(2)}/hr
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, employee)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Expanded Details - Conditionally Visible */}
                      {isExpanded && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          {/* Position & Status */}
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Chip
                              label={positionLabels[employee.position]}
                              size="small"
                              sx={{
                                bgcolor: 'primary.main',
                                color: '#fff',
                                fontSize: '0.75rem',
                                height: 22
                              }}
                            />
                            <Chip
                              label={employee.status}
                              size="small"
                              sx={{
                                bgcolor: statusColors[employee.status],
                                color: '#fff',
                                fontSize: '0.75rem',
                                height: 22,
                                textTransform: 'capitalize'
                              }}
                            />
                          </Box>

                          {/* Compensation Info */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AttachMoneyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                Base Rate: ${employee.baseHourlyRate.toFixed(2)}/hr
                              </Typography>
                            </Box>
                            {employee.treeShopQualificationPayRate && (
                              <Typography variant="body2" sx={{ color: 'success.main', fontSize: '0.875rem', ml: 3, fontWeight: 600 }}>
                                Qualification Rate: ${employee.treeShopQualificationPayRate.toFixed(2)}/hr
                              </Typography>
                            )}
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', ml: 3 }}>
                              True Cost: ${trueCost.toFixed(2)}/hr (×{employee.burdenMultiplier.toFixed(1)} burden)
                            </Typography>
                          </Box>

                          {/* Hire Date */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              Hired: {new Date(employee.hireDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </CardContent>
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
        <MenuItem onClick={handleViewDetails}>View Profile</MenuItem>
        <MenuItem onClick={handleMenuClose}>Edit Employee</MenuItem>
        {selectedEmployee && !selectedEmployee.treeShopCode && (
          <MenuItem onClick={handleUpgradeToTreeShop} sx={{ color: 'success.main' }}>
            Upgrade to TreeShop Code
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          Deactivate
        </MenuItem>
      </Menu>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        organizationId={organizationId as Id<"organizations">}
      />

      {/* TreeShop Code Builder Dialog */}
      {selectedEmployee && (
        <TreeShopCodeBuilder
          open={treeShopBuilderOpen}
          onClose={() => {
            setTreeShopBuilderOpen(false);
            setSelectedEmployee(null);
          }}
          employee={{
            _id: selectedEmployee._id,
            name: selectedEmployee.name,
            baseHourlyRate: selectedEmployee.baseHourlyRate,
          }}
        />
      )}
    </Box>
  );
}
