import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface SettingsContentProps {
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

export default function SettingsContent({
  organizationId,
  userId,
  userName,
  userEmail,
  userRole,
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Query organization data
  const organization = useQuery(api.organizations.getById, {
    id: organizationId as Id<"organizations">,
  });

  // Organization basic info state
  const [orgName, setOrgName] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgCity, setOrgCity] = useState('');
  const [orgState, setOrgState] = useState('');
  const [orgZip, setOrgZip] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');

  // Pricing settings state
  const [marginLow, setMarginLow] = useState(30);
  const [marginHigh, setMarginHigh] = useState(50);
  const [taxRate, setTaxRate] = useState(0);
  const [currency, setCurrency] = useState('USD');

  // Production settings state
  const [bufferPercentage, setBufferPercentage] = useState(10);
  const [transportRate, setTransportRate] = useState(0.5);
  const [minimumHours, setMinimumHours] = useState(2);
  const [minimumPrice, setMinimumPrice] = useState(500);

  // Terms & Proposal settings state
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [proposalValidityDays, setProposalValidityDays] = useState(30);
  const [showHourBreakdown, setShowHourBreakdown] = useState(false);
  const [showAfissFactors, setShowAfissFactors] = useState(true);
  const [proposalHeaderText, setProposalHeaderText] = useState('');
  const [proposalFooterText, setProposalFooterText] = useState('');

  // User profile state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load organization data
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setOrgAddress(organization.address || '');
      setOrgCity(organization.city || '');
      setOrgState(organization.state || '');
      setOrgZip(organization.zip || '');
      setOrgPhone(organization.phone || '');
      setOrgEmail(organization.email || '');

      // Pricing settings
      setMarginLow(organization.defaultMarginLow ?? 30);
      setMarginHigh(organization.defaultMarginHigh ?? 50);
      setTaxRate(organization.taxRate ?? 0);
      setCurrency(organization.currency ?? 'USD');

      // Production settings
      setBufferPercentage(organization.globalBufferPercentage ?? 10);
      setTransportRate(organization.defaultTransportRate ?? 0.5);
      setMinimumHours(organization.minimumJobHours ?? 2);
      setMinimumPrice(organization.minimumJobPrice ?? 500);

      // Terms & Proposal settings
      setTermsAndConditions(organization.defaultTermsAndConditions ?? '');
      setProposalValidityDays(organization.proposalValidityDays ?? 30);
      setShowHourBreakdown(organization.showHourBreakdown ?? false);
      setShowAfissFactors(organization.showAfissFactors ?? true);
      setProposalHeaderText(organization.proposalHeaderText ?? '');
      setProposalFooterText(organization.proposalFooterText ?? '');
    }
  }, [organization]);

  // Load user data
  useEffect(() => {
    setDisplayName(userName || '');
  }, [userName]);

  const updateOrganization = useMutation(api.organizations.update);

  const handleSaveOrganization = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateOrganization({
        id: organizationId as Id<"organizations">,
        name: orgName,
        address: orgAddress,
        city: orgCity,
        state: orgState,
        zip: orgZip,
        phone: orgPhone,
        email: orgEmail,
      });

      setSaveMessage({ type: 'success', text: 'Organization settings saved successfully' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save organization settings' });
      console.error('Error saving organization:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePricing = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateOrganization({
        id: organizationId as Id<"organizations">,
        defaultMarginLow: marginLow,
        defaultMarginHigh: marginHigh,
        taxRate: taxRate,
        currency: currency,
      });

      setSaveMessage({ type: 'success', text: 'Pricing settings saved successfully' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save pricing settings' });
      console.error('Error saving pricing:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProduction = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateOrganization({
        id: organizationId as Id<"organizations">,
        globalBufferPercentage: bufferPercentage,
        defaultTransportRate: transportRate,
        minimumJobHours: minimumHours,
        minimumJobPrice: minimumPrice,
      });

      setSaveMessage({ type: 'success', text: 'Production settings saved successfully' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save production settings' });
      console.error('Error saving production:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTermsAndProposal = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateOrganization({
        id: organizationId as Id<"organizations">,
        defaultTermsAndConditions: termsAndConditions,
        proposalValidityDays: proposalValidityDays,
        showHourBreakdown: showHourBreakdown,
        showAfissFactors: showAfissFactors,
        proposalHeaderText: proposalHeaderText,
        proposalFooterText: proposalFooterText,
      });

      setSaveMessage({ type: 'success', text: 'Terms and proposal settings saved successfully' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save terms and proposal settings' });
      console.error('Error saving terms:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderOrganizationTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Company Information
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="Company Name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
        />

        <TextField
          fullWidth
          label="Address"
          value={orgAddress}
          onChange={(e) => setOrgAddress(e.target.value)}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
          <TextField
            label="City"
            value={orgCity}
            onChange={(e) => setOrgCity(e.target.value)}
          />
          <TextField
            label="State"
            value={orgState}
            onChange={(e) => setOrgState(e.target.value)}
          />
          <TextField
            label="ZIP Code"
            value={orgZip}
            onChange={(e) => setOrgZip(e.target.value)}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Phone"
            value={orgPhone}
            onChange={(e) => setOrgPhone(e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            value={orgEmail}
            onChange={(e) => setOrgEmail(e.target.value)}
          />
        </Box>

        <Button
          variant="contained"
          onClick={handleSaveOrganization}
          disabled={isSaving}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );

  const renderPricingTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Global Pricing Defaults
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        These settings apply to all new quotes and proposals. Individual line items can override these defaults.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Default Margin Range
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Low Margin"
              type="number"
              value={marginLow}
              onChange={(e) => setMarginLow(Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Conservative estimate (e.g., 30%)"
            />
            <TextField
              label="High Margin"
              type="number"
              value={marginHigh}
              onChange={(e) => setMarginHigh(Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Optimistic estimate (e.g., 50%)"
            />
          </Box>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Tax and Currency
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Tax Rate"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Sales tax percentage (e.g., 7.5)"
            />
            <TextField
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              helperText="ISO currency code (e.g., USD)"
            />
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={handleSavePricing}
          disabled={isSaving}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Pricing Settings'}
        </Button>
      </Box>
    </Box>
  );

  const renderProductionTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Global Production Defaults
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        These settings control how estimates are calculated across all service types.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Buffer and Transport
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Buffer Percentage"
              type="number"
              value={bufferPercentage}
              onChange={(e) => setBufferPercentage(Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Added to all estimates for contingency (e.g., 10%)"
            />
            <TextField
              label="Transport Rate"
              type="number"
              value={transportRate}
              onChange={(e) => setTransportRate(Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">×</InputAdornment>,
              }}
              helperText="Multiplier for transport billing (e.g., 0.5 = 50%)"
            />
          </Box>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Minimum Job Requirements
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Minimum Job Hours"
              type="number"
              value={minimumHours}
              onChange={(e) => setMinimumHours(Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
              }}
              helperText="Minimum billable hours per job (e.g., 2)"
            />
            <TextField
              label="Minimum Job Price"
              type="number"
              value={minimumPrice}
              onChange={(e) => setMinimumPrice(Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Minimum project price (e.g., $500)"
            />
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={handleSaveProduction}
          disabled={isSaving}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Production Settings'}
        </Button>
      </Box>
    </Box>
  );

  const renderTermsTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Terms & Proposal Settings
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        Configure default terms and conditions, plus how proposals are displayed to customers.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Default Terms & Conditions
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            placeholder="Enter your standard terms and conditions here..."
            helperText="These terms will be included in all proposals by default"
          />
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Proposal Validity
          </Typography>
          <TextField
            label="Validity Period"
            type="number"
            value={proposalValidityDays}
            onChange={(e) => setProposalValidityDays(Number(e.target.value))}
            InputProps={{
              endAdornment: <InputAdornment position="end">days</InputAdornment>,
            }}
            helperText="How long proposals remain valid (e.g., 30 days)"
            sx={{ maxWidth: 300 }}
          />
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Customer-Facing Display Options
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showHourBreakdown}
                  onChange={(e) => setShowHourBreakdown(e.target.checked)}
                />
              }
              label="Show Hour Breakdown (Not Recommended)"
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 4, mt: -0.5 }}>
              Shows hourly rates to customers. Most tree services prefer to hide this.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={showAfissFactors}
                  onChange={(e) => setShowAfissFactors(e.target.checked)}
                />
              }
              label="Show AFISS Factors (Recommended)"
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 4, mt: -0.5 }}>
              Displays complexity factors (access, hazards, etc.) for transparency.
            </Typography>
          </Box>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Proposal Header & Footer
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Header Text"
              value={proposalHeaderText}
              onChange={(e) => setProposalHeaderText(e.target.value)}
              placeholder="Thank you for considering our services..."
              helperText="Appears at the top of all proposals"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Footer Text"
              value={proposalFooterText}
              onChange={(e) => setProposalFooterText(e.target.value)}
              placeholder="We look forward to working with you..."
              helperText="Appears at the bottom of all proposals"
            />
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={handleSaveTermsAndProposal}
          disabled={isSaving}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Terms & Proposal Settings'}
        </Button>
      </Box>
    </Box>
  );

  const renderUserProfileTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        User Profile
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <TextField
          fullWidth
          label="Email"
          value={userEmail}
          disabled
          helperText="Email is managed through WorkOS authentication"
        />

        <TextField
          fullWidth
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Change Password
        </Typography>

        <TextField
          fullWidth
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <TextField
          fullWidth
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <TextField
          fullWidth
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button
          variant="contained"
          disabled={isSaving}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Update Profile'}
        </Button>
      </Box>
    </Box>
  );

  const renderPreferencesTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Preferences
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="Role"
          value={userRole}
          disabled
          helperText="Your role is set by your organization administrator"
        />

        <TextField
          fullWidth
          label="Organization"
          value={organization?.name || ''}
          disabled
        />

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
          Additional preference settings coming soon...
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {saveMessage && (
        <Alert
          severity={saveMessage.type}
          onClose={() => setSaveMessage(null)}
          sx={{ mb: 2 }}
        >
          {saveMessage.text}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
        }}
      >
        <Tab label="Organization" />
        <Tab label="Pricing" />
        <Tab label="Production" />
        <Tab label="Terms & Proposals" />
        <Tab label="User Profile" />
        <Tab label="Preferences" />
      </Tabs>

      <Box sx={{ py: 2 }}>
        {activeTab === 0 && renderOrganizationTab()}
        {activeTab === 1 && renderPricingTab()}
        {activeTab === 2 && renderProductionTab()}
        {activeTab === 3 && renderTermsTab()}
        {activeTab === 4 && renderUserProfileTab()}
        {activeTab === 5 && renderPreferencesTab()}
      </Box>
    </Box>
  );
}
