/**
 * True Black Google Maps Style
 * Custom map styling to match TreeShop's #000000 background
 * Optimized for dark mode and professional aesthetic
 */

export const trueBlackMapStyle = [
  // Background - True black
  {
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  // Labels - White text with black stroke
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#000000' }, { weight: 2 }],
  },
  // Administrative boundaries
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ffffff' }],
  },
  // Roads - Slightly elevated from background
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#141414' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ffffff' }],
  },
  // Water - Subtle differentiation
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4CAF50' }], // TreeShop green for water labels
  },
  // Parks and vegetation - TreeShop green tint
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4CAF50' }],
  },
  // Points of interest
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }], // Hide business POIs for cleaner map
  },
  // Transit
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }],
  },
  // Landscape
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
];

/**
 * Map options for true black theme
 */
export const trueBlackMapOptions = {
  styles: trueBlackMapStyle,
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  backgroundColor: '#000000',
};
