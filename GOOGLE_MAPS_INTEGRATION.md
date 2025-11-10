# Google Maps API Integration

Complete integration of Google Maps API with Places Autocomplete, Geocoding, and Distance Matrix services.

## Files Created

### 1. `/src/lib/googleMapsLoader.ts`
Single-source loader for Google Maps API with:
- Singleton pattern to prevent multiple script loads
- Promise-based loading
- Auto-loads Places and Geometry libraries
- TypeScript declarations

### 2. `/src/lib/googleMapsService.ts`
Service class with comprehensive utilities:
- **geocodeAddress()** - Convert address to coordinates + structured components
- **calculateDriveTime()** - Calculate drive time/distance between two locations
- **calculateDriveTimeFromOrg()** - Auto-calculate from organization HQ
- **reverseGeocode()** - Convert coordinates to address
- **validateAddress()** - Check if address exists
- **getAddressSuggestions()** - Get autocomplete suggestions

### 3. `/src/components/Maps/AddressAutocomplete.tsx`
Material-UI integrated autocomplete component:
- Dropdown suggestions as you type
- Auto-populates structured address fields
- Returns geocoded data (lat/lng + parsed components)
- Works with Material-UI TextField
- Touch-friendly for mobile

## Usage Examples

### Basic Address Autocomplete
```tsx
import AddressAutocomplete from '@/components/Maps/AddressAutocomplete';

<AddressAutocomplete
  apiKey={process.env.GOOGLE_MAPS_API_KEY}
  label="Property Address"
  value={address}
  onAddressSelect={(geocoded) => {
    setAddress(geocoded.address);
    setCity(geocoded.city);
    setState(geocoded.state);
    setZip(geocoded.zip);
    setLatitude(geocoded.latitude);
    setLongitude(geocoded.longitude);
  }}
  fullWidth
/>
```

### Calculate Drive Time
```tsx
import { getGoogleMapsService } from '@/lib/googleMapsService';

const mapsService = getGoogleMapsService(apiKey);
mapsService.setOrganizationLocation(orgLat, orgLng);

const driveTime = await mapsService.calculateDriveTimeFromOrg({
  lat: customerLat,
  lng: customerLng
});

console.log(`Drive time: ${driveTime.durationMinutes} minutes`);
console.log(`Distance: ${driveTime.distanceMiles.toFixed(1)} miles`);
```

### Geocode Address Programmatically
```tsx
const mapsService = getGoogleMapsService(apiKey);
const result = await mapsService.geocodeAddress('1600 Amphitheatre Parkway, Mountain View, CA');

if (result) {
  console.log('Coordinates:', result.latitude, result.longitude);
  console.log('City:', result.city);
  console.log('State:', result.state);
}
```

## Integration Points

### Customers (Add/Edit)
Use `AddressAutocomplete` for property address field:
- Auto-populates city, state, zip
- Stores lat/lng for drive time calculations
- Validates address exists

### Projects/Proposals
Auto-calculate drive time on project creation:
```tsx
const mapsService = getGoogleMapsService(apiKey);
const driveTime = await mapsService.calculateDriveTimeFromOrg(customerAddress);
// Store driveTime.durationMinutes in project.driveTimeMinutes
```

### Line Items/Pricing
Use drive time in transport cost calculations:
```tsx
const transportHours = (driveTimeMinutes / 60 * 2) * transportRate;
```

### Map Dashboard
Display all customer locations on map with:
- Markers for each customer
- Drive time overlays
- Service area visualization

## Environment Variable

Add to `.env`:
```
PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

Required APIs to enable in Google Cloud Console:
1. Maps JavaScript API
2. Places API
3. Geocoding API
4. Distance Matrix API
5. Geometry API

## Features Implemented

- Address autocomplete with dropdown suggestions
- Structured address parsing (street, city, state, zip)
- Geocoding (address → coordinates)
- Reverse geocoding (coordinates → address)
- Drive time calculation
- Distance calculation (miles/meters)
- Address validation
- Organization HQ location management
- Singleton service pattern
- TypeScript support
- Material-UI integration
- Mobile-optimized

## Next Steps to Integrate

1. **Update AddCustomerDialog** - Replace address TextField with AddressAutocomplete
2. **Update EditCustomerDialog** - Same as above
3. **Update AddLeadDialog** - Add AddressAutocomplete for property address
4. **Update SimpleDashboard** - Pass API key to all components
5. **Create Maps Context** - Provide mapsService globally via React Context
6. **Update Proposal Builder** - Auto-calculate drive time when customer selected
7. **Enhance MapDashboard** - Show all customers with drive time circles

## API Key Security

- Store in environment variables only
- Never commit to git
- Use `PUBLIC_` prefix for Astro client-side access
- Restrict API key in Google Cloud Console:
  - HTTP referrers (treeshop.app)
  - API restrictions (only needed APIs)

---

**Status**: Core integration complete. Ready for component integration.
**Date**: 2025-01-09
