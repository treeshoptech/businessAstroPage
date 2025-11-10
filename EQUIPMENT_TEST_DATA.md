# Equipment Manager - Test Data

Use these sample equipment items to test the Equipment Manager. You can add them through the UI by clicking "Add Equipment" button.

## Sample Equipment 1: Ford F450 Truck

**Basic Info:**
- Name: `Ford F450`
- Category: `Truck`
- Status: `Active`

**Ownership Costs:**
- Purchase Price: `$65,000`
- Useful Life: `5` years
- Annual Hours: `2,000`
- Finance Cost/Year: `$3,250`
- Insurance/Year: `$3,000`
- Registration/Year: `$600`

**Operating Costs:**
- Fuel (gal/hr): `6`
- Fuel Price ($/gal): `$3.75`
- Maintenance/Year: `$8,500`
- Repairs/Year: `$3,500`

**Expected Calculated Costs:**
- Ownership Cost/Hour: ~$9.93/hr
- Operating Cost/Hour: ~$28.50/hr
- **Total Cost/Hour: ~$38.43/hr**

---

## Sample Equipment 2: Supertrak SK200TR Mulcher

**Basic Info:**
- Name: `Supertrak SK200TR`
- Category: `Mulcher`
- Status: `Active`

**Ownership Costs:**
- Purchase Price: `$325,000`
- Useful Life: `7` years
- Annual Hours: `1,500`
- Finance Cost/Year: `$16,250`
- Insurance/Year: `$8,000`
- Registration/Year: `$800`

**Operating Costs:**
- Fuel (gal/hr): `9`
- Fuel Price ($/gal): `$3.75`
- Maintenance/Year: `$40,000`
- Repairs/Year: `$10,000`

**Expected Calculated Costs:**
- Ownership Cost/Hour: ~$47.65/hr
- Operating Cost/Hour: ~$67.08/hr
- **Total Cost/Hour: ~$114.73/hr**

---

## Sample Equipment 3: CAT 265 Forestry Mulcher

**Basic Info:**
- Name: `CAT 265 Forestry Mulcher`
- Category: `Mulcher`
- Status: `Active`

**Ownership Costs:**
- Purchase Price: `$185,000`
- Useful Life: `7` years
- Annual Hours: `1,500`
- Finance Cost/Year: `$9,250`
- Insurance/Year: `$5,000`
- Registration/Year: `$600`

**Operating Costs:**
- Fuel (gal/hr): `7.5`
- Fuel Price ($/gal): `$3.75`
- Maintenance/Year: `$25,000`
- Repairs/Year: `$6,000`

**Expected Calculated Costs:**
- Ownership Cost/Hour: ~$36.23/hr
- Operating Cost/Hour: ~$39.17/hr
- **Total Cost/Hour: ~$75.40/hr**

---

## Sample Equipment 4: Vermeer SC652 Stump Grinder

**Basic Info:**
- Name: `Vermeer SC652`
- Category: `Stump Grinder`
- Status: `Active`

**Ownership Costs:**
- Purchase Price: `$42,000`
- Useful Life: `5` years
- Annual Hours: `1,200`
- Finance Cost/Year: `$2,100`
- Insurance/Year: `$1,800`
- Registration/Year: `$300`

**Operating Costs:**
- Fuel (gal/hr): `4`
- Fuel Price ($/gal): `$3.75`
- Maintenance/Year: `$5,000`
- Repairs/Year: `$2,500`

**Expected Calculated Costs:**
- Ownership Cost/Hour: ~$10.50/hr
- Operating Cost/Hour: ~$18.75/hr
- **Total Cost/Hour: ~$29.25/hr**

---

## Testing Checklist

### Add Equipment
- [ ] Click "Add Equipment" button
- [ ] Fill in all fields for Sample Equipment 1 (Ford F450)
- [ ] Verify real-time cost calculation updates as you type
- [ ] Verify Total Cost/Hour shows ~$38.43 in green
- [ ] Click "Add Equipment" and verify it appears in the list
- [ ] Repeat for other 3 sample equipment items

### Edit Equipment
- [ ] Click Edit icon on any equipment row
- [ ] Modify the purchase price
- [ ] Verify cost calculations update in real-time
- [ ] Click "Save Changes"
- [ ] Verify changes appear in the list

### Delete Equipment
- [ ] Click Delete icon on any equipment row
- [ ] Verify warning dialog appears
- [ ] Click "Delete" to confirm
- [ ] Verify equipment is removed from list

### Filters and Search
- [ ] Type "Ford" in search box - verify only Ford appears
- [ ] Select "Mulcher" in category filter - verify only mulchers appear
- [ ] Select "Maintenance" in status filter - verify empty if none in maintenance
- [ ] Clear all filters and verify all equipment appears

### DataGrid Features
- [ ] Click column headers to sort (Name, Category, Purchase Price, etc.)
- [ ] Verify pagination works (if you have 25+ items)
- [ ] Verify mobile responsive layout

### Edge Cases
- [ ] Try to add equipment with empty name - should show error
- [ ] Try to delete equipment that's used in a loadout - should show error (need to create loadout first)
- [ ] Verify negative numbers are prevented in cost fields

---

## Notes

- All costs are calculated using formulas from `/Users/lockin/businessAstroPage/src/lib/pricing/formulas.ts`
- Equipment ownership formula: `(Purchase ÷ Years + Finance + Insurance + Registration) ÷ Annual Hours`
- Equipment operating formula: `(Fuel Cost/hr + Maintenance + Repairs) ÷ Annual Hours`
- Total Cost/Hour = Ownership + Operating

