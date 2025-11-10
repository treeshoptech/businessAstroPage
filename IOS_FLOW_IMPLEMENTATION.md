# TreeShop Web App - iOS Flow Implementation Guide

**Goal:** Match the iOS proposal builder flow exactly - clean, direct, functional.

---

## Current State vs Target State

### ❌ Current Web App Issues:
1. Proposal builder is cluttered with too many fields visible at once
2. Service selection flow unclear
3. Calculator modals exist but not properly integrated
4. AFISS picker not matching iOS design
5. Line items not displaying cleanly in proposal
6. No running total like iOS

### ✅ Target iOS Flow (from screenshots):
1. Clean proposal form with progressive disclosure
2. Clear "Add Service" button that opens service picker
3. Service picker shows 5 service types with icons/descriptions
4. Each service opens its calculator modal
5. Calculator shows: inputs → AFISS → loadout → price
6. AFISS picker is searchable with collapsible categories
7. Line items display clearly with icon, description, hours, price
8. Running total always visible at bottom

---

## Implementation Checklist

### Phase 1: Proposal Builder Main View

**File:** `src/components/Proposals/ProposalBuilder.tsx`

**Changes:**

1. **Simplify initial form** - Progressive disclosure like iOS:
```tsx
// CUSTOMER section (collapsed until selected)
<Section title="CUSTOMER">
  <CustomerPicker />
  {!selectedCustomer && <Button>+ Add New Customer</Button>}
</Section>

// PROPERTY section (only shows after customer selected)
{selectedCustomer && (
  <Section title="PROPERTY">
    <AddressAutocomplete />
    <Button startIcon={<MapIcon />}>
      {propertyCoordinates ? "Adjust on Map" : "Select on Map"}
    </Button>
    {!orgAddress && (
      <Alert severity="warning">
        Set organization address in Settings to auto-calculate drive time
      </Alert>
    )}
  </Section>
)}

// ADDITIONAL DETAILS (optional, collapsed by default)
{selectedCustomer && (
  <Section title="ADDITIONAL DETAILS">
    <TextField
      label="Notes (Optional)"
      multiline
      rows={3}
    />
  </Section>
)}

// SERVICES section - The key part
<Section title="SERVICES">
  {lineItems.length === 0 ? (
    <Button
      variant="contained"
      size="large"
      fullWidth
      startIcon={<Add />}
      onClick={() => setServiceModalOpen(true)}
      sx={{ py: 2 }}
    >
      Add Service
    </Button>
  ) : (
    <>
      {lineItems.map((item, index) => (
        <LineItemCard
          key={item.id}
          lineNumber={index + 1}
          lineItem={item}
          onDelete={() => removeLineItem(item.id)}
        />
      ))}
      <Button
        startIcon={<Add />}
        onClick={() => setServiceModalOpen(true)}
      >
        Add Another Service
      </Button>
    </>
  )}
</Section>

// TOTAL section - Always visible like iOS
<Paper
  elevation={3}
  sx={{
    p: 3,
    textAlign: 'center',
    bgcolor: 'background.paper',
    position: 'sticky',
    bottom: 0,
  }}
>
  <Typography variant="caption" color="text.secondary" fontWeight={600}>
    TOTAL INVESTMENT
  </Typography>
  <Typography
    variant="h2"
    color="success.main"
    fontWeight={700}
    sx={{ my: 1 }}
  >
    ${totalInvestment.toLocaleString()}
  </Typography>
  <Typography variant="caption" color="text.secondary">
    {lineItems.length} service{lineItems.length !== 1 ? 's' : ''}
  </Typography>
</Paper>
```

2. **Line Item Card Component** - Match iOS display:
```tsx
function LineItemCard({ lineNumber, lineItem, onDelete }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" gap={2}>
          {/* Service Icon */}
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: 2,
              bgcolor: `${lineItem.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ color: lineItem.color, fontSize: 28 }}>
              {lineItem.icon}
            </Icon>
          </Box>

          {/* Details */}
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              {lineNumber}.
            </Typography>
            <Typography variant="subtitle1" fontWeight={600}>
              {lineItem.serviceName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {lineItem.description}
            </Typography>

            <Box display="flex" gap={2} mt={1}>
              <Chip
                size="small"
                icon={<AccessTime />}
                label={`${lineItem.estimatedHours.toFixed(1)} hrs`}
              />
              <Chip
                size="small"
                icon={<Build />}
                label={lineItem.loadoutName}
              />
            </Box>
          </Box>

          {/* Price */}
          <Box textAlign="right">
            <Typography variant="h6" color="success.main" fontWeight={700}>
              ${lineItem.lineTotal.toLocaleString()}
            </Typography>
            <IconButton onClick={onDelete} color="error">
              <Delete />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
```

---

### Phase 2: Service Selection Modal

**File:** `src/components/Proposals/ServiceSelectionModal.tsx`

**Design:** Full-screen modal (mobile) or large dialog (desktop) matching iOS

```tsx
export default function ServiceSelectionModal({ open, onClose, onServiceSelect }) {
  const services = [
    {
      id: 'mulching',
      icon: 'park',
      color: '#4CAF50',
      title: 'Forestry Mulching',
      description: 'Clear vegetation by acreage and DBH',
    },
    {
      id: 'stump-grinding',
      icon: 'circle',
      color: '#FF9800',
      title: 'Stump Grinding',
      description: 'Grind stumps with diameter and depth',
    },
    {
      id: 'land-clearing',
      icon: 'landscape',
      color: '#795548',
      title: 'Land Clearing',
      description: 'Clear lots by project type and intensity',
    },
    {
      id: 'tree-removal',
      icon: 'nature',
      color: '#F44336',
      title: 'Tree Removal',
      description: 'Remove trees from inventory with AFISS',
    },
    {
      id: 'tree-trimming',
      icon: 'content_cut',
      color: '#2196F3',
      title: 'Tree Trimming',
      description: 'Trim trees with adjustable intensity',
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile} // Mobile gets full screen
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Add Service</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          SELECT SERVICE TYPE
        </Typography>

        <Stack spacing={1}>
          {services.map((service) => (
            <Paper
              key={service.id}
              sx={{
                p: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => {
                onServiceSelect(service.id);
                onClose();
              }}
            >
              <Box display="flex" gap={2} alignItems="center">
                {/* Icon */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: `${service.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon sx={{ color: service.color, fontSize: 32 }}>
                    {service.icon}
                  </Icon>
                </Box>

                {/* Text */}
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {service.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {service.description}
                  </Typography>
                </Box>

                {/* Chevron */}
                <ChevronRight color="action" />
              </Box>
            </Paper>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Phase 3: Calculator Modal Structure

**File:** `src/components/Proposals/Calculators/MulchingCalculatorModal.tsx`

**Structure matching iOS:**

```tsx
export default function MulchingCalculatorModal({
  open,
  onClose,
  onComplete,
  driveTimeMinutes,
  organizationId,
}) {
  const [acres, setAcres] = useState(1);
  const [dbhPackage, setDbhPackage] = useState(6);
  const [selectedAFISS, setSelectedAFISS] = useState<string[]>([]);
  const [selectedLoadout, setSelectedLoadout] = useState(null);
  const [showAFISS, setShowAFISS] = useState(false);
  const [showScaling, setShowScaling] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Forestry Mulching</DialogTitle>

      <DialogContent>
        {/* PROJECT DETAILS Section */}
        <SectionHeader>PROJECT DETAILS</SectionHeader>

        <TextField
          label="Acres"
          type="number"
          value={acres}
          onChange={(e) => setAcres(Number(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          variant="outlined"
          startIcon={<MapIcon />}
          sx={{ mb: 2 }}
        >
          Draw Work Area on Map
          <Typography variant="caption" display="block">
            Auto-calculate acreage from polygon
          </Typography>
        </Button>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>DBH Package</InputLabel>
          <Select value={dbhPackage} onChange={(e) => setDbhPackage(e.target.value)}>
            <MenuItem value={4}>4" DBH</MenuItem>
            <MenuItem value={6}>6" DBH</MenuItem>
            <MenuItem value={8}>8" DBH</MenuItem>
            <MenuItem value={10}>10" DBH</MenuItem>
            <MenuItem value={15}>15" DBH</MenuItem>
          </Select>
        </FormControl>

        {/* SITE ASSESSMENT Section */}
        <SectionHeader>SITE ASSESSMENT</SectionHeader>

        <Button
          fullWidth
          variant="outlined"
          onClick={() => setShowAFISS(true)}
          sx={{ mb: 3 }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Box display="flex" gap={1}>
              <Icon>checklist</Icon>
              <Box textAlign="left">
                <Typography variant="body2" fontWeight={600}>
                  Site Complexity Factors
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedAFISS.length > 0
                    ? `${selectedAFISS.length} factor${selectedAFISS.length > 1 ? 's' : ''} selected`
                    : 'Tap to add complexity factors'
                  }
                </Typography>
              </Box>
            </Box>
            {selectedAFISS.length > 0 && <CheckCircle color="success" />}
          </Box>
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
          Select factors for access restrictions, hazards, and site-specific challenges
        </Typography>

        {/* LOADOUT Section */}
        <SectionHeader>LOADOUT</SectionHeader>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Loadout</InputLabel>
          <Select value={selectedLoadout} onChange={(e) => setSelectedLoadout(e.target.value)}>
            {loadouts.map(loadout => (
              <MenuItem key={loadout._id} value={loadout._id}>
                {loadout.loadoutName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedLoadout && (
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowScaling(true)}
            sx={{ mb: 3 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box display="flex" gap={1}>
                <Icon color="warning">add_circle</Icon>
                <Box textAlign="left">
                  <Typography variant="body2" fontWeight={600}>
                    Scale Up Loadout
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add equipment or crew for larger jobs
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Button>
        )}

        {/* ESTIMATED TIMELINE Section */}
        {calculationResult && (
          <>
            <SectionHeader>ESTIMATED TIMELINE</SectionHeader>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight={600}>On-site Work</Typography>
              <Typography variant="body2" color="warning.main" fontWeight={600}>
                {calculationResult.totalHours.toFixed(1)} hours
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
              Includes equipment transport and site preparation
            </Typography>

            {/* LINE ITEM TOTAL */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                LINE ITEM TOTAL
              </Typography>
              <Typography
                variant="h3"
                color="success.main"
                fontWeight={700}
                sx={{ my: 1 }}
              >
                ${calculationResult.lineTotal.toLocaleString()}
              </Typography>
            </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onComplete(calculationResult)}
          disabled={!calculationResult}
        >
          Add to Proposal
        </Button>
      </DialogActions>

      {/* AFISS Modal */}
      <AFISSFactorPicker
        open={showAFISS}
        onClose={() => setShowAFISS(false)}
        selected={selectedAFISS}
        onSelect={setSelectedAFISS}
      />
    </Dialog>
  );
}
```

---

### Phase 4: AFISS Factor Picker

**File:** `src/components/Proposals/AFISSFactorPicker.tsx`

**Design: Full-screen modal with search + collapsible categories**

```tsx
export default function AFISSFactorPicker({ open, onClose, selected, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const categories = [
    {
      id: 'access',
      icon: 'swap_horiz',
      title: 'Access & Entry',
      count: 9,
      factors: [
        { id: 'narrow-gate', name: 'Narrow gate (<8 ft)', impact: 12 },
        { id: 'no-access', name: 'No equipment access', impact: 50 },
        // ... more factors
      ],
    },
    {
      id: 'terrain',
      icon: 'terrain',
      title: 'Ground & Terrain',
      count: 13,
      factors: [
        // ... factors
      ],
    },
    {
      id: 'overhead',
      icon: 'arrow_upward',
      title: 'Overhead Hazards',
      count: 6,
      factors: [
        // ... factors
      ],
    },
    {
      id: 'underground',
      icon: 'arrow_downward',
      title: 'Underground Hazards',
      count: 5,
      factors: [
        // ... factors
      ],
    },
    {
      id: 'structures',
      icon: 'business',
      title: 'Structures & Targets',
      count: 10,
      factors: [
        // ... factors
      ],
    },
    {
      id: 'environmental',
      icon: 'eco',
      title: 'Environmental & Regulatory',
      count: 7,
      factors: [
        // ... factors
      ],
    },
  ];

  const filteredCategories = searchQuery
    ? categories.map(cat => ({
        ...cat,
        factors: cat.factors.filter(f =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(cat => cat.factors.length > 0)
    : categories;

  const handleToggleCategory = (catId: string) => {
    setExpandedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  const handleToggleFactor = (factorId: string) => {
    onSelect(
      selected.includes(factorId)
        ? selected.filter(id => id !== factorId)
        : [...selected, factorId]
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
    >
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Button onClick={() => onSelect([])}>Clear All</Button>
          <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
            AFISS Factors
          </Typography>
          <Button onClick={onClose} color="primary" variant="contained">
            Done
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search factors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search />,
          }}
          sx={{ mb: 3 }}
        />

        {/* Header */}
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Site Complexity Factors
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select all factors that apply to this project
        </Typography>

        {/* Categories */}
        <Stack spacing={1}>
          {filteredCategories.map((category) => (
            <Paper key={category.id} sx={{ overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => handleToggleCategory(category.id)}
              >
                <Icon sx={{ mr: 2, color: 'primary.main' }}>
                  {category.icon}
                </Icon>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {category.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {category.count} factors
                  </Typography>
                </Box>
                <Icon>
                  {expandedCategories.includes(category.id) ? 'expand_less' : 'expand_more'}
                </Icon>
              </Box>

              <Collapse in={expandedCategories.includes(category.id)}>
                <Box sx={{ p: 2, pt: 0 }}>
                  {category.factors.map((factor) => (
                    <Box
                      key={factor.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Checkbox
                        checked={selected.includes(factor.id)}
                        onChange={() => handleToggleFactor(factor.id)}
                      />
                      <Box flex={1}>
                        <Typography variant="body2">
                          {factor.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={`+${factor.impact}%`}
                        size="small"
                        color="warning"
                      />
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Dialog>
  );
}
```

---

## Summary of Changes

### Files to Create/Update:

1. **ProposalBuilder.tsx** - Simplify layout, progressive disclosure
2. **ServiceSelectionModal.tsx** - Clean service picker matching iOS
3. **MulchingCalculatorModal.tsx** - Restructure to match iOS sections
4. **StumpGrindingCalculatorModal.tsx** - Same structure
5. **LandClearingCalculatorModal.tsx** - Same structure
6. **AFISSFactorPicker.tsx** - Full-screen searchable picker
7. **LineItemCard.tsx** - New component for clean line item display

### Key UI Patterns:

1. **Progressive Disclosure** - Only show sections when relevant
2. **Clear CTAs** - Big buttons like "Add Service", "Add to Proposal"
3. **Visual Hierarchy** - Icons + colors for service types
4. **Running Totals** - Always visible sticky footer
5. **Touch-Friendly** - Large tap targets, full-width buttons
6. **Searchable** - AFISS picker has search
7. **Collapsible** - Categories collapse/expand

### Visual Design:

- **True black background** (#000000) ✓
- **Green accent** (#4CAF50) ✓
- **Service-specific colors** (green, orange, brown, red, blue) ✓
- **Clean cards** with rounded corners ✓
- **SF Symbols equivalents** (Material Icons) ✓
- **Large, bold prices** in green ✓

---

## Next Steps

1. Build/update these 7 components
2. Test the full flow: Customer → Property → Add Service → Calculator → AFISS → Add to Proposal → Save
3. Verify real-time calculations work
4. Test on mobile (responsive)
5. Connect to Convex mutations for saving
6. Add success/error handling
7. Test with real loadout data

This will give you the same smooth, intuitive flow as the iOS app.
