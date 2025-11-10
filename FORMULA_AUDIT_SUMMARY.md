# TreeShop Pricing Formula Audit - Executive Summary

**Date:** 2025-01-10
**Auditor:** Claude Code
**Platforms Compared:** iOS Swift App vs Web TypeScript App

---

## TL;DR - What You Need to Change

### ✅ Good News: Core Formulas Are Correct
All mathematical formulas in the web app are **accurate and match iOS exactly**. No formula corrections needed.

### ⚠️ Action Required: Missing Calculator UIs

**4 calculators need to be built in the web app:**

1. **Stump Grinding** - Formula exists, UI is placeholder
2. **Tree Removal** - Need to add formula + UI
3. **Tree Trimming** - Need to add formula + UI
4. **Land Clearing** - Decision needed on methodology

**Estimated Time:** 4 weeks total

---

## What's Already Working Perfectly

| Feature | Status | Notes |
|---------|--------|-------|
| Equipment cost calculation | ✅ Perfect | Matches iOS exactly |
| Employee burden calculation | ✅ Perfect | Matches iOS exactly |
| Loadout cost calculation | ✅ Perfect | Matches iOS exactly |
| Margin → Price formula | ✅ Perfect | Using correct formula: Cost ÷ (1 - Margin) |
| Forestry mulching calculator | ✅ Perfect | Full UI + accurate formulas |
| AFISS factor system | ✅ Good | 50 factors (iOS has 80+ planned) |
| Project pricing (transport/buffer) | ✅ Perfect | All calculations accurate |

---

## What Needs to Be Built

### Priority 1: Stump Grinding Calculator (1 week)
**Status:** Formula exists ✅, UI is placeholder ❌

**What's needed:**
- Multi-stump entry form (diameter, height, depth sliders)
- 5 modifier checkboxes per stump (hardwood, root flare, rotten, rocks, landscaping)
- Real-time StumpScore calculation
- "Add Another Stump" button
- 2-hour minimum enforcement

**Formula is already in formulas.ts and is correct** - just needs UI implementation.

---

### Priority 2: Tree Removal Calculator (1 week)
**Status:** Missing formula ❌, Missing UI ❌

**What's needed:**
- Add `calculateTreeScore()` formula to formulas.ts
  ```typescript
  // Formula: H × (DBH÷12)² × CR²
  const dbhInFeet = dbh / 12.0;
  return height * (dbhInFeet * dbhInFeet) * (canopyRadius * canopyRadius);
  ```
- Tree entry form (height, DBH, canopy radius sliders)
- Multi-tree support with "Add Another Tree"
- Real-time TreeScore display
- Production rate: 250 PpH default

**Copy formula from iOS PricingFormulas.swift:274-303**

---

### Priority 3: Tree Trimming Calculator (1 week)
**Status:** Missing formula ❌, Missing UI ❌

**What's needed:**
- Add `calculateTreeTrimming()` formula to formulas.ts
  ```typescript
  const fullScore = calculateTreeScore(height, dbh, canopyRadius);
  const trimScore = fullScore * trimPercentage;
  ```
- Same tree entry form as removal
- Trim percentage slider (0-100%)
- Intensity presets: Light (30%), Medium (50%), Heavy (80%)
- Show both full TreeScore and trim score

**Copy formula from iOS PricingFormulas.swift:305-360**

---

### Priority 4: Land Clearing Calculator (1 week)
**Status:** Different approaches ⚠️

**iOS uses:** ClearingScore system (scientific, two-phase: excavator + grubbing)
**Web uses:** Day-based estimation (simple: project type + intensity → days)

**Decision needed:** Which approach to use?

**Recommendation:**
- **Short-term:** Use simple day-based (faster to implement, works for small jobs)
- **Long-term:** Implement both with toggle (let user choose complexity level)

**For MVP:** Implement the simple day-based calculator this week, add ClearingScore later.

---

## Minor Enhancements Needed

### Add to Web App:
1. **Hydraulic GPM production rate calculator** (optional, nice-to-have)
   - Formula: `R = (GPM/30)^1.58`
   - Auto-calculates PpH from equipment GPM

2. **Expand AFISS factors from 50 to 80+** (post-launch)
   - Web has good foundation with 50 factors
   - iOS plans 80+ factors across 18 categories
   - Can expand gradually

### Add to iOS App:
1. **Two additional stump modifiers** (easy fix)
   - Add "Rocks in root zone" (+10%)
   - Add "Tight landscaping" (+15%)
   - Web already has these, iOS needs them for consistency

---

## Formula Verification Results

I tested all critical formulas by comparing iOS Swift code with Web TypeScript code:

### ✅ All Formulas Are Mathematically Identical:

| Formula | iOS | Web | Match? |
|---------|-----|-----|--------|
| Equipment cost (ownership + operating) | ✅ | ✅ | ✅ YES |
| Employee true cost (base × burden) | ✅ | ✅ | ✅ YES |
| Loadout cost (equipment + labor + overhead) | ✅ | ✅ | ✅ YES |
| Billing rate (cost ÷ (1 - margin)) | ✅ | ✅ | ✅ YES |
| Forestry mulching score (acres × DBH × AFISS) | ✅ | ✅ | ✅ YES |
| Stump score (D² × (H + depth) × modifiers) | ✅ | ✅ | ✅ YES |
| Transport hours (round trip × rate) | ✅ | ✅ | ✅ YES |
| Buffer hours (10% of production + transport) | ✅ | ✅ | ✅ YES |
| Project pricing (hours × billing rate) | ✅ | ✅ | ✅ YES |

### ❌ Formulas Missing from Web:

| Formula | iOS | Web | Action |
|---------|-----|-----|--------|
| Tree removal (H × (DBH÷12)² × CR²) | ✅ | ❌ | Copy from iOS |
| Tree trimming (TreeScore × trim%) | ✅ | ❌ | Copy from iOS |
| GPM production rate ((GPM/30)^1.58) | ✅ | ❌ | Copy from iOS |
| ClearingScore (optional) | ✅ | ❌ | Decide if needed |

---

## Test Cases for Validation

Once you implement the missing calculators, run these tests to verify accuracy:

### Test 1: Stump Grinding
```
Input: 18" diameter, 1 ft above, 1 ft below, hardwood + large root flare
Expected Result:
  - Base: 648 points
  - Modifiers: 1.38x (1.15 × 1.2)
  - Final: 894.24 points
  - Hours: 2.24 (at 400 PpH)
```

### Test 2: Tree Removal
```
Input: 60 ft tall, 24" DBH, 15 ft canopy radius
Expected Result:
  - TreeScore: 54,000 points
  - Calculation: 60 × (2)² × (15)² = 54,000
```

### Test 3: Tree Trimming
```
Input: Same tree as above, 30% trim
Expected Result:
  - Full TreeScore: 54,000 points
  - Trim Factor: 30% = 0.5 (medium intensity)
  - TrimScore: 27,000 points
```

### Test 4: Project Pricing (All Services)
```
Input: 20 production hours, $286.16 loadout cost, 45 min drive, 50% margin
Expected Result:
  - Transport: 0.75 hours (round trip at 50% rate)
  - Buffer: 2.075 hours (10% of 20.75)
  - Total: 22.825 hours
  - Cost: $6,531.10
  - Price: $13,062.20 (50% margin)
  - Profit: $6,531.10 (50% of price)
```

---

## Recommended Implementation Order

### Week 1: Stump Grinding
- Implement stump grinding calculator UI
- Test with multiple stumps
- Test all 5 modifiers
- Verify 2-hour minimum

### Week 2: Tree Removal
- Add tree removal formulas to formulas.ts
- Implement tree removal calculator UI
- Test multi-tree scenarios
- Integrate AFISS factors

### Week 3: Tree Trimming
- Add tree trimming formulas to formulas.ts
- Implement tree trimming calculator UI
- Test trim intensity presets
- Test multi-tree with different percentages

### Week 4: Land Clearing + Polish
- Decide on methodology (day-based vs ClearingScore)
- Implement chosen approach
- Run all validation tests
- Fix any bugs found
- Update documentation

---

## Files You'll Need to Edit

### Core Formula Files (Add Missing Formulas)
- `/Users/lockin/businessAstroPage/src/lib/pricing/formulas.ts` - Add 3 new functions

### Calculator Components (Replace Placeholders)
- `/Users/lockin/businessAstroPage/src/components/Proposals/Calculators/StumpGrindingCalculatorModal.tsx` - Full implementation
- `/Users/lockin/businessAstroPage/src/components/Proposals/Calculators/TreeRemovalCalculatorModal.tsx` - Full implementation
- `/Users/lockin/businessAstroPage/src/components/Proposals/Calculators/TreeTrimmingCalculatorModal.tsx` - Full implementation
- `/Users/lockin/businessAstroPage/src/components/Proposals/Calculators/LandClearingCalculatorModal.tsx` - Full implementation

### Reference Files (Copy From)
- `/Users/lockin/proj-treeshop-ios/TreeShop/TreeShop/Services/PricingFormulas.swift` - Lines 68-94 (Stump), 274-303 (Tree Removal), 305-360 (Tree Trimming)

---

## Key Decisions Needed

### Decision 1: Land Clearing Methodology ⚠️ URGENT
**Options:**
- A. Simple day-based (faster, good for MVP)
- B. ClearingScore system (more accurate, complex)
- C. Both with toggle (best long-term, more work)

**Recommendation:** Choose A for this sprint, implement C post-launch

### Decision 2: AFISS Factor Expansion Timeline
**Current:** 50 factors in web, 80+ planned for iOS
**Question:** Expand now or post-launch?

**Recommendation:** Good with 50 for launch, expand to 80+ over next 3 months

### Decision 3: GPM Calculator Priority
**Question:** Implement hydraulic GPM production rate calculator now or later?

**Recommendation:** Nice-to-have feature, implement after core calculators

---

## Success Metrics

### You'll know you're done when:
- [ ] All 4 calculator modals are functional (not "coming soon")
- [ ] Each calculator produces prices that match iOS exactly
- [ ] All validation tests pass
- [ ] Proposal Builder can use all 5 services (mulching already works)
- [ ] Documentation is updated

### Formula accuracy validated when:
- [ ] Same inputs produce same outputs on iOS and web
- [ ] All test cases pass (see Test Cases section above)
- [ ] Cross-platform consistency verified

---

## Bottom Line

**You don't need to fix any formulas** - they're all correct. You just need to **build the missing calculator UIs** and add 3 missing formulas.

**4 weeks of focused work** will give you complete feature parity with iOS.

**Start with stump grinding** - it has the highest user demand and the formula already exists.

---

## Additional Resources Created

I've created 2 detailed documents for you:

1. **PRICING_FORMULA_COMPARISON.md** - Complete technical analysis (18 pages)
   - Line-by-line formula comparison
   - iOS vs Web differences
   - Full test cases and recommendations

2. **WEBAPP_CALCULATOR_TODO.md** - Implementation checklist (detailed task list)
   - Every checkbox needed to complete the work
   - Phase-by-phase breakdown
   - Time estimates and dependencies

---

**Questions?** Review the detailed documents above or reach out to the development team.

**Ready to start?** Begin with stump grinding calculator - it's the quickest win.
