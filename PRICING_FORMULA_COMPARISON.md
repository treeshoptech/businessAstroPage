# TreeShop Pricing Formula Comparison: iOS App vs Web App

**Date:** 2025-01-10
**Purpose:** Identify discrepancies between iOS Swift formulas and web TypeScript formulas to ensure accuracy across platforms

---

## Executive Summary

After comprehensive analysis of both codebases, the **core pricing formulas are mathematically identical** between iOS and web implementations. However, there are **significant feature gaps** in the web app that need to be implemented to match iOS functionality.

### Status Overview

| Feature | iOS App | Web App | Status |
|---------|---------|---------|--------|
| Core Pricing Formulas | ✅ Complete | ✅ Complete | **MATCH** |
| Forestry Mulching Calculator | ✅ Complete | ✅ Complete | **MATCH** |
| Stump Grinding Calculator | ✅ Complete | ❌ Placeholder | **MISSING** |
| Land Clearing Calculator | ✅ Complete (ClearingScore) | ❌ Placeholder | **DIFFERENT SYSTEM** |
| Tree Removal Calculator | ✅ Complete | ❌ Placeholder | **MISSING** |
| Tree Trimming Calculator | ✅ Complete | ❌ Placeholder | **MISSING** |
| AFISS Factor System | ✅ 80+ factors planned | ✅ 50 factors | **PARTIAL** |
| Hydraulic GPM Calculator | ✅ Complete | ❌ Missing | **MISSING** |

---

## Detailed Formula Comparison

### 1. Forestry Mulching - ✅ IDENTICAL

**iOS Formula (PricingFormulas.swift:27-43):**
```swift
let baseTreeShopScore = Double(params.dbhPackage) * params.acres
let adjustedTreeShopScore = baseTreeShopScore * params.difficultyMultiplier
let productionHours = adjustedTreeShopScore / params.productionRate
```

**Web Formula (formulas.ts:134-139):**
```typescript
const baseScore = inputs.acreage * inputs.dbhPackage;
return baseScore * inputs.afissMultiplier;
// Production hours calculated in calculateProjectPricing()
const productionHours = treeShopScore / productionRatePpH;
```

**Verdict:** ✅ **Mathematically identical**
Both use: `Score = Acres × DBH Package × AFISS Multiplier`

---

### 2. Stump Grinding - ✅ FORMULA MATCHES, ❌ WEB MISSING UI

**iOS Formula (PricingFormulas.swift:68-94):**
```swift
let baseScore = pow(stump.diameter, 2) * (stump.heightAbove + stump.depthBelow)

var modifier = 1.0
if stump.hasLargeRootFlare { modifier *= 1.2 }  // +20%
if stump.isHardwood { modifier *= 1.15 }        // +15%
if stump.isRotten { modifier *= 0.85 }          // -15%

let modifiedScore = baseScore * modifier
let hours = totalScore / productionRate  // 400 default
```

**Web Formula (formulas.ts:153-177):**
```typescript
let score = diameterInches ** 2 * (heightAboveGradeFeet + grindDepthBelowGradeFeet);

if (isHardwood) score *= 1.15;         // +15%
if (hasLargeRootFlare) score *= 1.2;   // +20%
if (isRotten) score *= 0.85;           // -15%
if (hasRocksInRootZone) score *= 1.1;  // +10%
if (isTightLandscaping) score *= 1.15; // +15%

return score;
```

**Verdict:** ✅ **Formulas identical**, ❌ **Web UI is placeholder**

**What Web Needs:**
- Multi-stump entry form (like iOS)
- Per-stump modifiers (hardwood, root flare, rotten, rocks, landscaping)
- "Add Another Stump" functionality
- Real-time StumpScore calculation display
- 2-hour minimum enforcement
- Transport + buffer calculation

**iOS Has 3 Modifiers, Web Has 5 Modifiers:**
- iOS: Large root flare (+20%), Hardwood (+15%), Rotten (-15%)
- Web: Above + Rocks (+10%), Tight landscaping (+15%)
- **Recommendation:** Add rocks and landscaping modifiers to iOS for consistency

---

### 3. Land Clearing - ⚠️ DIFFERENT SYSTEMS

**iOS System: "ClearingScore" (PricingFormulas.swift:96-167)**

iOS uses a **two-phase system** with specific hour calculations:

```swift
enum ClearingDensity {
    case light    // 0.7x multiplier
    case average  // 1.0x multiplier
    case heavy    // 1.3x multiplier
}

let baseScore = acres  // 1 acre = 1 ClearingScore point
let adjustedScore = baseScore * density.multiplier * afissMultiplier

// Two-phase work calculation
let excavatorHours = adjustedScore * 16.0  // 2 days × 8 hrs per point
let grubbingHours = adjustedScore * 8.0    // 1 day × 8 hrs per point
let totalWorkHours = excavatorHours + grubbingHours
```

**Pricing includes:**
- Excavator phase: Equipment cost + Rental cost (e.g., $1500/day rented excavator)
- Grubbing phase: Loadout cost
- Debris removal: Truck loads (acres × 2.5) × $700/load
- Separate margins for each phase

---

**Web System: "Day-Based Estimation" (formulas.ts:179-208)**

Web uses **simpler day estimates** without detailed phase breakdown:

```typescript
type ProjectType = "standard_lot" | "large_lot" | "multi_lot"
type Intensity = "light" | "standard" | "heavy"

// Day matrix lookup
standard_lot + light = 1 day
standard_lot + standard = 1.5 days
standard_lot + heavy = 2 days

large_lot + light = 1.5 days
large_lot + standard = 2 days
large_lot + heavy = 2.5 days

multi_lot = 3+ days (custom)

// Add AFISS adjustment
totalDays = baseDays + afissDayAdjustment
```

---

**Verdict:** ⚠️ **DIFFERENT METHODOLOGIES - CHOOSE ONE**

**iOS Approach (ClearingScore):**
- ✅ More scientific and precise
- ✅ Accounts for two distinct work phases
- ✅ Handles rented equipment costs
- ✅ Calculates debris removal separately
- ✅ Scalable to any acreage
- ❌ More complex to explain to customers

**Web Approach (Day-Based):**
- ✅ Simple and intuitive for small jobs
- ✅ Matches how customers think ("how many days?")
- ✅ Easy to quote on-site
- ❌ Less accurate for large or complex jobs
- ❌ Doesn't account for debris removal
- ❌ No rented equipment consideration

**Recommendation:**
1. **Keep iOS ClearingScore system** as the "professional/large job" method
2. **Keep Web day-based system** as the "quick estimate/small job" method
3. **Add both to both platforms** with toggle option
4. For MVP: **Implement iOS ClearingScore in web** for consistency

---

### 4. Tree Removal - ✅ FORMULA EXISTS, ❌ WEB MISSING UI

**iOS Formula (PricingFormulas.swift:274-303):**
```swift
// TreeScore = H × (DBH÷12)² × CR²
let dbhInFeet = dbh / 12.0
let score = height * (dbhInFeet * dbhInFeet) * (canopyRadius * canopyRadius)

// Multi-tree calculation
let totalScore = trees.reduce(0) { sum, tree in
    sum + calculateTreeScore(height, dbh, canopyRadius)
}
let hours = totalScore / productionRate  // 250 default PpH
```

**Web Formula (formulas.ts):**
❌ **NOT IMPLEMENTED** - No tree removal formula exists in web app

**Verdict:** ❌ **MISSING FROM WEB**

**What Web Needs:**
- Tree entry form (height, DBH, canopy radius)
- Multi-tree support ("Add Another Tree")
- TreeScore calculation display
- AFISS factors per tree (power lines, structures, etc.)
- Production rate: 250 PpH default
- Tree removal calculator modal in Proposal Builder

---

### 5. Tree Trimming - ✅ FORMULA EXISTS, ❌ WEB MISSING UI

**iOS Formula (PricingFormulas.swift:305-345):**
```swift
let fullScore = calculateTreeScore(height, dbh, canopyRadius)
let trimScore = fullScore * trimPercentage

// Trim intensity factors
Light (10-15%): 0.3
Medium (20-30%): 0.5
Heavy (40-50%): 0.8
```

**Web Formula (formulas.ts):**
❌ **NOT IMPLEMENTED** - No tree trimming formula exists

**Verdict:** ❌ **MISSING FROM WEB**

**What Web Needs:**
- Same tree entry form as removal
- Trim percentage slider (0-100%)
- Trim intensity presets (Light/Medium/Heavy)
- Shows both full TreeScore and trim score
- Multi-tree support with per-tree trim percentages

---

### 6. Project Pricing (Complete Calculation) - ✅ IDENTICAL

**iOS Formula (PricingFormulas.swift:384-412):**
```swift
let transportHours = (driveTimeOneWay * 2.0) * transportRate
let bufferHours = (productionHours + transportHours) * bufferPercent
let totalHours = productionHours + transportHours + bufferHours

let totalCost = totalHours * loadoutCostPerHour
let totalPrice = totalHours * billingRatePerHour
let totalProfit = totalPrice - totalCost
let profitMargin = totalProfit / totalPrice
```

**Web Formula (formulas.ts:233-276):**
```typescript
const driveTimeHours = (driveTimeOneWayMinutes * 2) / 60;
const transportHours = driveTimeHours * transportBillingRate;
const bufferHours = (productionHours + transportHours) * bufferPercentage;
const totalHours = productionHours + transportHours + bufferHours;

const totalCost = totalHours * loadoutHourlyRate;
// Prices calculated at 5 margin levels (30-70%)
```

**Verdict:** ✅ **IDENTICAL**

Both correctly implement:
- Round-trip transport at reduced rate (0.3-0.5x)
- 10% buffer on production + transport
- Cost calculation: Hours × Loadout Rate
- Price calculation: Hours × Billing Rate (cost ÷ (1 - margin))

---

### 7. Billing Rate / Margin Formula - ✅ IDENTICAL

**iOS Formula (PricingFormulas.swift:416-422):**
```swift
static func calculateBillingRate(loadoutCost: Double, targetMargin: Double) -> Double {
    return targetMargin < 1.0
        ? loadoutCost / (1 - targetMargin)
        : loadoutCost
}
```

**Web Formula (formulas.ts:114-123):**
```typescript
export function calculateBillingRates(cost: number): BillingRateOutputs {
  return {
    margin30: cost / 0.7,  // 1.43x
    margin40: cost / 0.6,  // 1.67x
    margin50: cost / 0.5,  // 2.0x
    margin60: cost / 0.4,  // 2.5x
    margin70: cost / 0.3,  // 3.33x
  };
}
```

**Verdict:** ✅ **IDENTICAL**

Both use the **correct margin formula**: `Price = Cost ÷ (1 - Margin%)`
NOT the incorrect markup formula: `Price = Cost × (1 + Markup%)`

---

### 8. Hydraulic GPM Production Rate - ❌ MISSING FROM WEB

**iOS Formula (PricingFormulas.swift:445-447):**
```swift
/// Formula: R = (Q/30)^1.58 where Q = GPM
/// Benchmarks: 30 GPM = 1.0 PpH, 34 GPM = 1.3 PpH, 40 GPM = 2.0 PpH
static func calculateProductionRateFromGPM(gpm: Double) -> Double {
    return pow(gpm / 30.0, 1.58)
}
```

**Web Formula:**
❌ **NOT IMPLEMENTED**

**Verdict:** ❌ **MISSING FROM WEB**

**What Web Needs:**
- Add `calculateProductionRateFromGPM()` to formulas.ts
- Use in equipment setup to auto-calculate production rates
- Reference: https://www.treeshop.app/articles/12
- Formula validated by TreeShop research

---

### 9. AFISS Factor System - ⚠️ PARTIAL IMPLEMENTATION

**iOS System (planned):**
- 80+ factors across 18 categories
- 30-50 factors for MVP
- Stored in SwiftData models
- Applied per project/service

**Web System (AFISSFactorPicker.tsx):**
- **50 factors across 7 categories** (currently implemented)
- Searchable, category-based UI
- Real-time multiplier calculation
- Integration with mulching calculator modal

**Categories in Web (with counts):**
1. Access & Entry (9 factors) - 5-50%
2. Ground & Terrain (13 factors) - 8-40%
3. Overhead Hazards (6 factors) - 8-50%
4. Underground Hazards (5 factors) - 10-20%
5. Structures & Targets (10 factors) - 8-35%
6. Environmental & Regulatory (7 factors) - 10-30%

**Verdict:** ⚠️ **Web has good foundation, needs expansion to 80+ factors**

**Recommendation:**
- Web's current 50 factors are production-ready
- Expand to match iOS's planned 80+ factors over time
- Ensure factor IDs and percentages match across platforms
- Create shared AFISS factor database (JSON) used by both iOS and web

---

## Missing Features in Web App

### Critical (Blocking Parity)

1. **Stump Grinding Calculator UI**
   - Multi-stump entry form
   - Per-stump modifiers (5 types)
   - Real-time StumpScore display
   - 2-hour minimum enforcement

2. **Land Clearing Calculator UI**
   - Choice between ClearingScore system (iOS) or day-based (current)
   - Two-phase pricing (excavator + grubbing)
   - Debris removal calculation
   - Rented equipment cost handling

3. **Tree Removal Calculator**
   - Complete implementation from scratch
   - Height, DBH, canopy radius inputs
   - Multi-tree support
   - TreeScore calculation

4. **Tree Trimming Calculator**
   - Complete implementation from scratch
   - Trim percentage slider
   - Intensity presets (Light/Medium/Heavy)
   - Multi-tree support

### Important (Enhances Functionality)

5. **Hydraulic GPM Production Rate Calculator**
   - Add formula to formulas.ts
   - Integrate into equipment setup
   - Auto-calculate PpH from GPM input

6. **AFISS Factor Expansion**
   - Add 30 more factors to reach 80+
   - Organize into 18 categories (currently 7)
   - Ensure consistency with iOS

### Nice to Have (Future)

7. **Production Rate Constants**
   - Web has them in formulas.ts (lines 299-307)
   - iOS has them in PricingFormulas.swift (lines 299-307)
   - Ensure they stay synchronized

8. **Utility Formatting Functions**
   - iOS has formatCurrency, formatHours, formatScore, etc.
   - Web likely has these elsewhere - audit for consistency

---

## Recommendations for Web App Updates

### Phase 1: Critical Calculator Implementation (2-3 weeks)

**Priority 1: Stump Grinding Calculator Modal**
- File: `src/components/Proposals/Calculators/StumpGrindingCalculatorModal.tsx`
- Implement multi-stump entry form (similar to iOS)
- Add 5 modifier checkboxes per stump
- Real-time StumpScore calculation
- Use existing `calculateStumpScore()` from formulas.ts
- 2-hour minimum display
- Integration with Proposal Builder

**Priority 2: Tree Removal Calculator Modal**
- File: `src/components/Proposals/Calculators/TreeRemovalCalculatorModal.tsx`
- Create tree entry form (height, DBH, canopy radius)
- Add `calculateTreeScore()` to formulas.ts (copy from iOS)
- Multi-tree support with "Add Another Tree" button
- AFISS factors per tree (power lines, structures, etc.)
- Display TreeScore in real-time
- Production rate: 250 PpH default

**Priority 3: Tree Trimming Calculator Modal**
- File: `src/components/Proposals/Calculators/TreeTrimmingCalculatorModal.tsx`
- Same tree entry form as removal
- Add trim percentage slider (0-100%)
- Intensity presets: Light (30%), Medium (50%), Heavy (80%)
- Add `calculateTreeTrimming()` to formulas.ts
- Show both full TreeScore and trim score
- Multi-tree support with per-tree percentages

**Priority 4: Land Clearing Calculator Modal**
- File: `src/components/Proposals/Calculators/LandClearingCalculatorModal.tsx`
- **Decision needed:** ClearingScore (iOS) vs Day-Based (current web)
- Recommend: Implement **both** with toggle
- ClearingScore tab: Acres + Density + AFISS → Hours → Price with phases
- Day-Based tab: Project Type + Intensity + AFISS → Days → Price
- Add debris removal calculation (acres × 2.5 loads × $700)
- Handle rented equipment costs (excavator rental)

### Phase 2: Advanced Features (1 week)

**Priority 5: Add Missing Formulas to formulas.ts**
- `calculateTreeScore()` - H × (DBH÷12)² × CR²
- `calculateTreeTrimming()` - Full score × trim percentage
- `calculateProductionRateFromGPM()` - (GPM/30)^1.58
- Ensure all match iOS exactly

**Priority 6: Expand AFISS Factors**
- Add 30 more factors to reach 80+
- Reorganize into 18 categories (from current 7)
- Ensure percentages match iOS
- Create shared JSON database for both platforms

### Phase 3: Polish & Consistency (3-5 days)

**Priority 7: Stump Grinding Modifiers**
- Add "Rocks in root zone" (+10%) to iOS
- Add "Tight landscaping" (+15%) to iOS
- Ensure both platforms have all 5 modifiers

**Priority 8: Production Rate Synchronization**
- Audit constants in both platforms
- Ensure forestry mulching, stump grinding rates match
- Document defaults in shared spec

**Priority 9: Utility Functions**
- Add formatting helpers to web if missing
- Ensure currency, hours, score formatting matches iOS

---

## Formula Accuracy Summary

### ✅ Correct and Matching (No Changes Needed)

1. **Equipment Cost Calculation** - Ownership + Operating per hour
2. **Employee True Cost** - Base rate × burden multiplier
3. **Loadout Cost** - Equipment + Labor + Overhead
4. **Billing Rate Formula** - Cost ÷ (1 - Margin%) [CORRECT]
5. **Forestry Mulching Score** - Acres × DBH × AFISS
6. **Stump Grinding Score** - Diameter² × (Height + Depth) × Modifiers
7. **Project Pricing** - Production + Transport + Buffer hours
8. **Transport Calculation** - Round trip × reduced rate (0.3-0.5)
9. **Buffer Calculation** - 10% of (production + transport)
10. **Profit Margin Calculation** - Profit ÷ Price

### ⚠️ Different Approaches (Decision Needed)

1. **Land Clearing** - iOS uses ClearingScore system (scientific), Web uses day-based (simple)
   - Recommendation: Implement both, let user choose

### ❌ Missing from Web (Implement)

1. **Stump Grinding Calculator UI** - Formula exists, UI is placeholder
2. **Tree Removal Calculator** - Complete implementation needed
3. **Tree Trimming Calculator** - Complete implementation needed
4. **Land Clearing ClearingScore System** - Optional, add for parity
5. **Hydraulic GPM Production Rate** - Add formula to web
6. **30 Additional AFISS Factors** - Expand from 50 to 80+

### ⚠️ Minor Inconsistencies (Harmonize)

1. **Stump Modifiers** - Web has 5, iOS has 3 (add 2 to iOS)
2. **AFISS Categories** - Web has 7, iOS plans 18 (expand web)

---

## Testing Recommendations

### Formula Validation Tests (Run on Both Platforms)

**Test Case 1: Forestry Mulching**
- Input: 3.5 acres, 6" DBH, 1.27 AFISS multiplier, 1.5 PpH
- Expected:
  - Base Score: 21 points
  - Adjusted Score: 26.67 points
  - Production Hours: 17.78 hours

**Test Case 2: Stump Grinding**
- Input: 18" diameter, 1 ft above, 1 ft below, hardwood + large root flare
- Expected:
  - Base Score: 648 points
  - Modifiers: 1.15 × 1.2 = 1.38x
  - Final Score: 894.24 points
  - Production Hours (400 PpH): 2.24 hours

**Test Case 3: Project Pricing**
- Input: 20 production hours, $286.16 loadout cost, 45 min drive, 50% transport rate, 10% buffer
- Expected:
  - Transport Hours: 0.75 hours
  - Buffer Hours: 2.075 hours
  - Total Hours: 22.825 hours
  - Cost: $6,531.10
  - Price (50% margin): $13,062.20

**Test Case 4: Billing Rate**
- Input: $246.43 loadout cost, 50% margin
- Expected: $492.86/hour
- Verify: $492.86 - $246.43 = $246.43 profit (50% of $492.86)

---

## Action Items for Web App Team

### Immediate (This Sprint)
- [ ] Review land clearing methodology decision (ClearingScore vs day-based)
- [ ] Implement stump grinding calculator UI
- [ ] Add tree removal formulas to formulas.ts

### Next Sprint
- [ ] Implement tree removal calculator UI
- [ ] Implement tree trimming calculator UI
- [ ] Add hydraulic GPM production rate formula

### Following Sprint
- [ ] Expand AFISS factors from 50 to 80+
- [ ] Implement land clearing ClearingScore system (if approved)
- [ ] Add rocks and landscaping modifiers to iOS stump grinding

### Ongoing
- [ ] Create shared AFISS factor database (JSON)
- [ ] Synchronize production rate constants across platforms
- [ ] Run validation tests on both platforms monthly
- [ ] Document any formula changes in both codebases

---

## Conclusion

**Core pricing formulas are mathematically correct and identical across platforms.** The main work needed is implementing the missing calculator UIs in the web app to achieve feature parity with iOS.

### Key Findings:
1. ✅ **No formula errors detected** - all calculations follow CLAUDE.md specification
2. ✅ **Forestry mulching calculator is complete and accurate** on both platforms
3. ❌ **4 major calculators missing UI in web** (stump, tree removal, tree trimming, land clearing)
4. ⚠️ **Different land clearing methodologies** - decision needed on which to use
5. ⚠️ **AFISS factors need expansion** - web has 50, iOS plans 80+
6. ⚠️ **Minor modifier inconsistencies** - easily harmonized

### Estimated Development Time:
- **Critical calculators:** 2-3 weeks (stump, tree removal, tree trimming, land clearing)
- **Advanced features:** 1 week (formulas, GPM calculator, AFISS expansion)
- **Polish:** 3-5 days (consistency, testing, documentation)
- **Total:** ~4 weeks for complete parity

---

**Next Steps:**
1. Prioritize stump grinding calculator (highest user demand)
2. Decide on land clearing methodology (ClearingScore vs day-based)
3. Create shared AFISS factor JSON database
4. Schedule weekly sync between iOS and web teams for formula consistency
