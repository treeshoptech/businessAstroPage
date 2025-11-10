# Web App Calculator Implementation Checklist

**Goal:** Achieve feature parity with iOS app pricing calculators
**Timeline:** 4 weeks
**Status:** Updated 2025-01-10

---

## Phase 1: Critical Calculators (2-3 weeks)

### 1. Stump Grinding Calculator ⚠️ HIGH PRIORITY
**File:** `src/components/Proposals/Calculators/StumpGrindingCalculatorModal.tsx`

- [ ] Replace placeholder with full implementation
- [ ] Add dynamic stump entry form
  - [ ] Diameter slider (6-60 inches)
  - [ ] Height above grade slider (0-3 feet)
  - [ ] Grind depth below slider (6-18 inches)
  - [ ] Default: 12 inches above, 12 inches below
- [ ] Add per-stump modifier checkboxes (5 types):
  - [ ] Hardwood species (+15%)
  - [ ] Large root flare (+20%)
  - [ ] Rotten/deteriorated (-15%)
  - [ ] Rocks in root zone (+10%)
  - [ ] Tight landscaping/near foundation (+15%)
- [ ] Add "Add Another Stump" button (unlimited stumps)
- [ ] Real-time StumpScore calculation per stump
  - [ ] Show base score
  - [ ] Show modifiers applied
  - [ ] Show adjusted score
- [ ] Total StumpScore display
- [ ] Production hours calculation (400 PpH default)
- [ ] 2-hour minimum enforcement
- [ ] Transport + buffer calculation
- [ ] AFISS factor integration (optional site-wide factors)
- [ ] Loadout selection
- [ ] Price range display (low/high margin)
- [ ] "Add to Proposal" button with full metadata
- [ ] Use existing `calculateStumpScore()` from formulas.ts

**Testing:**
- [ ] Test case: 18" stump, 1+1 ft, hardwood + root flare = 894.24 points
- [ ] Test case: 3 stumps with different modifiers
- [ ] Verify 2-hour minimum applies
- [ ] Verify transport calculation (30% rate)

---

### 2. Tree Removal Calculator ⚠️ HIGH PRIORITY
**File:** `src/components/Proposals/Calculators/TreeRemovalCalculatorModal.tsx`

- [ ] Replace placeholder with full implementation
- [ ] Add tree entry form (per tree):
  - [ ] Height slider (10-150 feet)
  - [ ] DBH slider (3-60 inches) - Diameter at Breast Height
  - [ ] Canopy radius slider (5-50 feet)
  - [ ] Visual helper showing measurement points
- [ ] Add "Add Another Tree" button (unlimited trees)
- [ ] Real-time TreeScore calculation per tree
  - [ ] Formula: H × (DBH÷12)² × CR²
  - [ ] Show calculation breakdown
- [ ] Total TreeScore display for all trees
- [ ] Production hours calculation (250 PpH default)
- [ ] Per-tree AFISS factors (optional):
  - [ ] Power lines nearby
  - [ ] Near structure
  - [ ] Limited access
  - [ ] Hazard tree
- [ ] Site-wide AFISS factor integration
- [ ] Loadout selection
- [ ] Transport + buffer calculation (50% transport rate)
- [ ] Price range display
- [ ] "Add to Proposal" button

**Add to formulas.ts:**
- [ ] `calculateTreeScore(height, dbh, canopyRadius)` function
- [ ] `calculateMultiTreeRemoval(trees, productionRate)` function
- [ ] Copy from iOS PricingFormulas.swift:274-303

**Testing:**
- [ ] Test case: 60 ft tall, 24" DBH, 15 ft canopy radius
- [ ] Test case: Multiple trees with different sizes
- [ ] Verify formula: H × (DBH÷12)² × CR²

---

### 3. Tree Trimming Calculator ⚠️ HIGH PRIORITY
**File:** `src/components/Proposals/Calculators/TreeTrimmingCalculatorModal.tsx`

- [ ] Replace placeholder with full implementation
- [ ] Use same tree entry form as removal
  - [ ] Height, DBH, canopy radius sliders
- [ ] Add trim percentage slider (0-100%)
- [ ] Add trim intensity presets:
  - [ ] Light (10-15%) → 30% factor
  - [ ] Medium (20-30%) → 50% factor
  - [ ] Heavy (40-50%) → 80% factor
- [ ] Real-time TrimScore calculation
  - [ ] Show full TreeScore
  - [ ] Show trim percentage
  - [ ] Show final TrimScore (full × percentage)
- [ ] Multi-tree support with per-tree trim percentages
- [ ] Production hours calculation (250 PpH default)
- [ ] AFISS factor integration
- [ ] Loadout selection
- [ ] Transport + buffer calculation
- [ ] Price range display
- [ ] "Add to Proposal" button

**Add to formulas.ts:**
- [ ] `calculateTreeTrimming(tree, trimPercentage)` function
- [ ] `calculateMultiTreeTrimming(trees, trimPercentage, productionRate)` function
- [ ] `getTrimIntensityFactor(percentage)` helper
- [ ] Copy from iOS PricingFormulas.swift:305-360

**Testing:**
- [ ] Test case: 60 ft tree, 30% trim intensity
- [ ] Test case: Multiple trees with different trim percentages

---

### 4. Land Clearing Calculator (Decision Needed)
**File:** `src/components/Proposals/Calculators/LandClearingCalculatorModal.tsx`

#### Option A: Simple Day-Based (Current Web Approach) ⭐ RECOMMENDED FOR MVP

- [ ] Replace placeholder with simple implementation
- [ ] Project type selector:
  - [ ] Standard Residential Lot
  - [ ] Large Residential Lot
  - [ ] Multi-Lot or Commercial
- [ ] Clearing intensity selector:
  - [ ] Light (sparse vegetation)
  - [ ] Standard (typical density)
  - [ ] Heavy (dense overgrowth)
- [ ] Day matrix calculation:
  - [ ] Standard + Light = 1 day
  - [ ] Standard + Standard = 1.5 days
  - [ ] Standard + Heavy = 2 days
  - [ ] Large + Light = 1.5 days
  - [ ] Large + Standard = 2 days
  - [ ] Large + Heavy = 2.5 days
  - [ ] Multi-lot = 3+ days (custom)
- [ ] AFISS day adjustment (+0.5 to +1 day)
- [ ] Total days display
- [ ] Daily rate calculation (8 hrs × loadout hourly)
- [ ] Price range display
- [ ] "Add to Proposal" button

#### Option B: ClearingScore System (iOS Approach) - ADVANCED

- [ ] Add ClearingScore calculation to formulas.ts
- [ ] Acreage input field
- [ ] Density selector (Light/Average/Heavy):
  - [ ] Light: 0.7x multiplier
  - [ ] Average: 1.0x multiplier
  - [ ] Heavy: 1.3x multiplier
- [ ] ClearingScore calculation:
  - [ ] Base: Acres (1 acre = 1 point)
  - [ ] Adjusted: Base × Density × AFISS
- [ ] Two-phase work hours:
  - [ ] Excavator: 16 hrs per ClearingScore point
  - [ ] Grubbing: 8 hrs per ClearingScore point
- [ ] Debris removal calculation:
  - [ ] Truck loads: Acres × 2.5
  - [ ] Cost per load: $700
- [ ] Rented equipment costs:
  - [ ] Excavator rental input ($/day)
  - [ ] Convert to hourly
- [ ] Three-phase pricing:
  - [ ] Excavator phase (equipment + rental)
  - [ ] Grubbing phase (loadout)
  - [ ] Debris phase (truck loads)
  - [ ] Separate margins for each
- [ ] Display excavator days and grubbing days
- [ ] Total price display
- [ ] "Add to Proposal" button

**Add to formulas.ts (if Option B):**
- [ ] `calculateClearingScore()` function
- [ ] `calculateClearingPricing()` function
- [ ] `estimateTruckLoads()` helper
- [ ] Copy from iOS PricingFormulas.swift:96-259

#### Option C: Implement Both with Toggle ⭐⭐ BEST LONG-TERM

- [ ] Add tab switcher: "Quick Estimate" vs "Detailed Analysis"
- [ ] Quick Estimate tab: Day-based system (Option A)
- [ ] Detailed Analysis tab: ClearingScore system (Option B)
- [ ] Let user choose based on job complexity

**Decision Required:** Choose Option A for MVP, implement Option C post-launch

---

## Phase 2: Advanced Features (1 week)

### 5. Add Missing Formulas to formulas.ts

- [ ] **Tree Removal Formulas:**
  ```typescript
  export function calculateTreeScore(
    height: number,
    dbh: number,
    canopyRadius: number
  ): number {
    const dbhInFeet = dbh / 12.0;
    return height * (dbhInFeet * dbhInFeet) * (canopyRadius * canopyRadius);
  }
  ```

- [ ] **Tree Trimming Formulas:**
  ```typescript
  export function calculateTreeTrimming(
    tree: { height: number; dbh: number; canopyRadius: number },
    trimPercentage: number
  ): { trimScore: number; fullTreeScore: number } {
    const fullScore = calculateTreeScore(tree.height, tree.dbh, tree.canopyRadius);
    return {
      trimScore: fullScore * trimPercentage,
      fullTreeScore: fullScore
    };
  }

  export function getTrimIntensityFactor(percentage: number): number {
    if (percentage >= 0.10 && percentage <= 0.15) return 0.3;
    if (percentage >= 0.20 && percentage <= 0.30) return 0.5;
    if (percentage >= 0.40 && percentage <= 0.50) return 0.8;
    return percentage;
  }
  ```

- [ ] **Hydraulic GPM Production Rate:**
  ```typescript
  export function calculateProductionRateFromGPM(gpm: number): number {
    // Formula: R = (Q/30)^1.58 where Q = GPM
    // Based on TreeShop research: https://www.treeshop.app/articles/12
    // Benchmarks: 30 GPM = 1.0 PpH, 34 GPM = 1.3 PpH, 40 GPM = 2.0 PpH
    return Math.pow(gpm / 30.0, 1.58);
  }
  ```

- [ ] **ClearingScore System (if implementing Option B/C for land clearing):**
  - [ ] Copy `calculateClearingScore()` from iOS
  - [ ] Copy `calculateClearingPricing()` from iOS
  - [ ] Copy `estimateTruckLoads()` from iOS

---

### 6. Expand AFISS Factor System

**File:** `src/components/Proposals/AFISSFactorPicker.tsx`

**Current:** 50 factors across 7 categories
**Target:** 80+ factors across 18 categories

- [ ] Add 30 more factors to reach 80+
- [ ] Reorganize into 18 categories (from current 7)
- [ ] New categories to add:
  - [ ] Wildlife/Environmental (beyond current)
  - [ ] Weather/Seasonal
  - [ ] Customer/Site Management
  - [ ] Equipment Logistics
  - [ ] Crew Safety/PPE
  - [ ] Noise/Time Restrictions
  - [ ] Material Handling
  - [ ] Site Restoration
  - [ ] Legal/Liability
  - [ ] Quality Requirements
  - [ ] Emergency/Rush Jobs
- [ ] Ensure percentages match iOS exactly
- [ ] Create shared JSON database for both platforms

**AFISS Factor Database JSON:**
- [ ] Create `src/data/afissFactors.json`
- [ ] Include: ID, category, factor name, description, percentage
- [ ] Use this JSON in both web and iOS (export to iOS team)
- [ ] Version control for factor changes

---

### 7. GPM Production Rate Calculator (Optional)

**File:** `src/components/Equipment/GPMCalculator.tsx` (new)

- [ ] Create standalone GPM calculator component
- [ ] Input: Hydraulic flow (GPM)
- [ ] Output: Production rate (PpH)
- [ ] Display formula: R = (Q/30)^1.58
- [ ] Show benchmarks:
  - [ ] 30 GPM → 1.0 PpH
  - [ ] 34 GPM → 1.3 PpH
  - [ ] 40 GPM → 2.0 PpH
  - [ ] 50 GPM → 3.0 PpH
- [ ] Integrate into equipment setup flow
- [ ] Auto-populate production rate when GPM is entered

---

## Phase 3: Polish & Consistency (3-5 days)

### 8. Synchronize Stump Grinding Modifiers

**iOS App:**
- [ ] Add "Rocks in root zone" (+10%) modifier to iOS
- [ ] Add "Tight landscaping/near foundation" (+15%) modifier to iOS

**Result:** Both platforms will have 5 modifiers:
1. Hardwood species (+15%)
2. Large root flare (+20%)
3. Rotten/deteriorated (-15%)
4. Rocks in root zone (+10%)
5. Tight landscaping (+15%)

---

### 9. Production Rate Constants Audit

**Files:**
- iOS: `PricingFormulas.swift` (lines 299-307)
- Web: `formulas.ts` (lines 299-307)

- [ ] Compare all production rate constants
- [ ] Ensure these match:
  - [ ] Forestry mulching CAT 265: 1.3 PpH
  - [ ] Forestry mulching SK200TR: 5.0 PpH
  - [ ] Forestry mulching default: 1.5 PpH
  - [ ] Stump grinding default: 400 points/hour
  - [ ] Land clearing daily: 8 hours
  - [ ] Tree removal default: 250 PpH
  - [ ] Tree trimming default: 250 PpH
- [ ] Document any discrepancies
- [ ] Update to match iOS if differences found

---

### 10. Utility Functions Audit

**iOS has these (PricingFormulas.swift:450-479):**
- `formatCurrency()` - $1,234.56
- `formatHours()` - 12.5 hrs
- `formatMiles()` - 45.2 mi
- `formatPercentage()` - 50.0%
- `formatScore()` - 1.2M or 1.5K or 123

**Web audit:**
- [ ] Find existing formatting utilities in web app
- [ ] Ensure currency formatting matches iOS
- [ ] Ensure hours/score formatting is consistent
- [ ] Create missing formatters if needed
- [ ] Centralize in `src/lib/utils/formatting.ts`

---

## Testing & Validation

### Formula Validation Tests

Create test suite: `src/tests/pricing-formulas.test.ts`

- [ ] **Test Case 1: Forestry Mulching**
  ```typescript
  Input: 3.5 acres, 6" DBH, 1.27 AFISS, 1.5 PpH
  Expected:
    - Base Score: 21 points
    - Adjusted Score: 26.67 points
    - Production Hours: 17.78 hours
  ```

- [ ] **Test Case 2: Stump Grinding**
  ```typescript
  Input: 18" diameter, 1 ft above, 1 ft below, hardwood + root flare
  Expected:
    - Base Score: 648 points
    - Modifiers: 1.38x
    - Final Score: 894.24 points
    - Hours (400 PpH): 2.24 hours
  ```

- [ ] **Test Case 3: Tree Removal**
  ```typescript
  Input: 60 ft tall, 24" DBH, 15 ft canopy
  Expected:
    - TreeScore: 60 × (2)² × (15)² = 54,000 points
  ```

- [ ] **Test Case 4: Project Pricing**
  ```typescript
  Input: 20 prod hrs, $286.16 loadout, 45 min drive, 50% transport, 10% buffer
  Expected:
    - Transport: 0.75 hrs
    - Buffer: 2.075 hrs
    - Total: 22.825 hrs
    - Cost: $6,531.10
    - Price (50%): $13,062.20
  ```

- [ ] **Test Case 5: Billing Rate**
  ```typescript
  Input: $246.43 cost, 50% margin
  Expected: $492.86/hour
  Verify: $492.86 - $246.43 = $246.43 profit (50% of price)
  ```

### Integration Tests

- [ ] Test each calculator in Proposal Builder flow
- [ ] Verify line item creation with correct metadata
- [ ] Test AFISS factor picker integration
- [ ] Test loadout selection and cost calculation
- [ ] Test drive time calculation from coordinates
- [ ] Test margin selector (30-70%)
- [ ] Test "Add to Proposal" functionality
- [ ] Verify proposal PDF generation includes calculator data

### Cross-Platform Consistency Tests

- [ ] Run same test cases on iOS app
- [ ] Compare results (should be identical)
- [ ] Document any discrepancies
- [ ] Fix discrepancies in appropriate platform

---

## Documentation Updates

### Update Existing Docs

- [ ] Update CLAUDE.md with any new formulas
- [ ] Update TreeShop iOS Architecture doc with web parity status
- [ ] Create "Pricing Formula Specification" shared doc (iOS + Web)

### Create New Docs

- [ ] Calculator UI/UX specification (design system)
- [ ] AFISS Factor Master List (shared JSON)
- [ ] Formula Validation Test Suite documentation
- [ ] Cross-Platform Sync Protocol (how to keep formulas aligned)

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All 4 calculator modals are functional (not placeholders)
- [ ] Each calculator passes validation tests
- [ ] Each calculator integrates with Proposal Builder
- [ ] AFISS factors work in all calculators

### Phase 2 Complete When:
- [ ] All formulas exist in formulas.ts (matching iOS)
- [ ] AFISS factors expanded to 80+
- [ ] GPM calculator implemented (optional)

### Phase 3 Complete When:
- [ ] iOS and web have matching modifiers
- [ ] Production rate constants are synchronized
- [ ] All tests pass on both platforms
- [ ] Documentation is complete

### Overall Feature Parity Achieved When:
- [ ] All services available in both platforms
- [ ] All formulas produce identical results
- [ ] UI/UX is consistent (within platform norms)
- [ ] Test coverage is >90%

---

## Timeline Estimate

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1 | Critical calculators (4) | 2-3 weeks | HIGH |
| Phase 2 | Advanced features | 1 week | MEDIUM |
| Phase 3 | Polish & consistency | 3-5 days | LOW |
| **Total** | **All phases** | **~4 weeks** | |

**Critical Path:**
1. Stump grinding calculator (Week 1)
2. Tree removal calculator (Week 2)
3. Tree trimming calculator (Week 2-3)
4. Land clearing calculator decision + implementation (Week 3)

---

## Resources Needed

- [ ] Design mockups for calculator UIs (use iOS as reference)
- [ ] AFISS factor content (30 new factors with descriptions)
- [ ] Test data sets for validation
- [ ] iOS team sync for formula verification
- [ ] QA time for cross-platform testing

---

## Risk Assessment

### High Risk
- **Land clearing methodology decision** - Could delay implementation if choice not made
  - Mitigation: Choose day-based (Option A) for MVP, add ClearingScore later

### Medium Risk
- **AFISS factor expansion scope creep** - 80+ factors is a lot of content
  - Mitigation: Start with 60 factors, expand to 80+ post-launch

### Low Risk
- **Formula implementation** - Well-defined, already exist in iOS
  - Mitigation: Direct port from Swift to TypeScript

---

## Next Steps (Immediate)

1. **Today:**
   - [ ] Review this checklist with team
   - [ ] Decide on land clearing approach (A, B, or C)
   - [ ] Assign stump grinding calculator to developer

2. **This Week:**
   - [ ] Start stump grinding calculator implementation
   - [ ] Create formulas test suite
   - [ ] Begin AFISS factor content creation (30 new factors)

3. **Next Week:**
   - [ ] Complete stump grinding calculator
   - [ ] Start tree removal calculator
   - [ ] Sync with iOS team on formula validation

---

**Last Updated:** 2025-01-10
**Maintained By:** Development Team
**Review Frequency:** Weekly during implementation phase
