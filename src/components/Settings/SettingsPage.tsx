import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { treeshopTheme } from '../../lib/theme';

interface SettingsPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  organizationId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage({ user, organizationId }: SettingsPageProps) {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Organization form state
  const [orgData, setOrgData] = useState({
    name: 'TREE SHOP LLC',
    address: '3634 Watermelon Lane',
    city: 'New Smyrna Beach',
    state: 'FL',
    zip: '32168',
    phone: '(386) 414-9142',
    email: 'office@fltreeshop.com',
  });

  // User profile state
  const [userData, setUserData] = useState({
    name: user.name,
    email: user.email,
    phone: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOrgChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setOrgData({ ...orgData, [field]: event.target.value });
  };

  const handleUserChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({ ...userData, [field]: event.target.value });
  };

  const handleSaveOrg = async () => {
    setLoading(true);
    try {
      // TODO: Call Convex mutation to update organization
      console.log('Saving organization:', orgData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Organization settings saved successfully!');
    } catch (error) {
      console.error('Error saving organization:', error);
      alert('Failed to save organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    setLoading(true);
    try {
      // Validate passwords match if changing password
      if (userData.newPassword && userData.newPassword !== userData.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      // TODO: Call Convex mutation to update user
      console.log('Saving user profile:', userData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('User profile saved successfully!');
    } catch (error) {
      console.error('Error saving user profile:', error);
      alert('Failed to save user profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={treeshopTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => window.location.href = '/'}
              sx={{ color: 'text.primary' }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Settings
            </Typography>
          </Box>

          {/* Tabs */}
          <Card sx={{ bgcolor: '#0a0a0a', mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <Tab
                icon={<BusinessIcon />}
                iconPosition="start"
                label="Organization"
                id="settings-tab-0"
                aria-controls="settings-tabpanel-0"
              />
              <Tab
                icon={<PersonIcon />}
                iconPosition="start"
                label="User Profile"
                id="settings-tab-1"
                aria-controls="settings-tabpanel-1"
              />
              <Tab
                icon={<SettingsIcon />}
                iconPosition="start"
                label="Preferences"
                id="settings-tab-2"
                aria-controls="settings-tabpanel-2"
              />
            </Tabs>
          </Card>

          {/* Organization Settings */}
          <TabPanel value={tabValue} index={0}>
            <Card sx={{ bgcolor: '#0a0a0a' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                  Organization Profile
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    label="Company Name"
                    value={orgData.name}
                    onChange={handleOrgChange('name')}
                    fullWidth
                    variant="outlined"
                  />

                  <TextField
                    label="Street Address"
                    value={orgData.address}
                    onChange={handleOrgChange('address')}
                    fullWidth
                    variant="outlined"
                  />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="City"
                      value={orgData.city}
                      onChange={handleOrgChange('city')}
                      fullWidth
                      variant="outlined"
                    />
                    <TextField
                      label="State"
                      value={orgData.state}
                      onChange={handleOrgChange('state')}
                      sx={{ width: '150px' }}
                      variant="outlined"
                    />
                    <TextField
                      label="ZIP Code"
                      value={orgData.zip}
                      onChange={handleOrgChange('zip')}
                      sx={{ width: '150px' }}
                      variant="outlined"
                    />
                  </Box>

                  <TextField
                    label="Phone Number"
                    value={orgData.phone}
                    onChange={handleOrgChange('phone')}
                    fullWidth
                    variant="outlined"
                  />

                  <TextField
                    label="Email Address"
                    value={orgData.email}
                    onChange={handleOrgChange('email')}
                    fullWidth
                    variant="outlined"
                    type="email"
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveOrg}
                      disabled={loading}
                      sx={{ minWidth: 150 }}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* User Profile Settings */}
          <TabPanel value={tabValue} index={1}>
            <Card sx={{ bgcolor: '#0a0a0a' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                  User Profile
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    label="Full Name"
                    value={userData.name}
                    onChange={handleUserChange('name')}
                    fullWidth
                    variant="outlined"
                  />

                  <TextField
                    label="Email Address"
                    value={userData.email}
                    disabled
                    fullWidth
                    variant="outlined"
                    helperText="Email is managed by WorkOS authentication"
                  />

                  <TextField
                    label="Phone Number"
                    value={userData.phone}
                    onChange={handleUserChange('phone')}
                    fullWidth
                    variant="outlined"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 600, color: 'text.primary' }}>
                    Change Password
                  </Typography>

                  <TextField
                    label="New Password"
                    type="password"
                    value={userData.newPassword}
                    onChange={handleUserChange('newPassword')}
                    fullWidth
                    variant="outlined"
                    helperText="Leave blank to keep current password"
                  />

                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={userData.confirmPassword}
                    onChange={handleUserChange('confirmPassword')}
                    fullWidth
                    variant="outlined"
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveUser}
                      disabled={loading}
                      sx={{ minWidth: 150 }}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Preferences Settings */}
          <TabPanel value={tabValue} index={2}>
            <Card sx={{ bgcolor: '#0a0a0a' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                  System Preferences
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Additional system preferences will be available in future updates.
                  </Typography>

                  <Box sx={{ p: 3, bgcolor: '#141414', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                      Current Role
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </Box>

                  <Box sx={{ p: 3, bgcolor: '#141414', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                      Organization
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      TREE SHOP LLC
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
