# Equipment Manager - Quick Start Guide

## Get Started in 3 Steps

### 1. Start the Servers

Open two terminal windows:

**Terminal 1 - Convex:**
```bash
cd /Users/lockin/businessAstroPage
npm run convex
```

**Terminal 2 - Astro:**
```bash
cd /Users/lockin/businessAstroPage
npm run dev
```

### 2. Open in Browser

Navigate to: **http://localhost:3000/equipment**

### 3. Add Your First Equipment

Click the green "Add Equipment" button and use this sample data:

**Ford F450 Truck:**
```
Name: Ford F450
Category: Truck
Status: Active

Purchase Price: $65,000
Useful Life: 5 years
Annual Hours: 2,000
Finance Cost/Year: $3,250
Insurance/Year: $3,000
Registration/Year: $600

Fuel (gal/hr): 6
Fuel Price ($/gal): $3.75
Maintenance/Year: $8,500
Repairs/Year: $3,500
```

Watch the Total Cost/Hour calculate to ~$38.43/hr in real-time!

---

## What You Can Do

- **Add Equipment** - Click green button, fill form, watch costs calculate live
- **Edit Equipment** - Click pencil icon on any row
- **Delete Equipment** - Click trash icon (validates usage in loadouts)
- **Search** - Type in search box to filter by name/category
- **Filter** - Use dropdowns to filter by category or status
- **Sort** - Click any column header to sort

---

## Sample Data Available

See `EQUIPMENT_TEST_DATA.md` for 4 complete equipment samples you can add.

---

## Files You Created

1. `/convex/equipment.ts` - Backend CRUD
2. `/src/components/Equipment/EquipmentList.tsx` - Main UI
3. `/src/components/Equipment/AddEquipmentDialog.tsx` - Add form
4. `/src/components/Equipment/EditEquipmentDialog.tsx` - Edit form
5. `/src/components/Equipment/DeleteEquipmentDialog.tsx` - Delete confirmation
6. `/src/components/ConvexClientProvider.tsx` - Convex wrapper
7. `/src/pages/equipment.astro` - Equipment page

---

## Need Help?

See `EQUIPMENT_MANAGER_SUMMARY.md` for complete documentation.

