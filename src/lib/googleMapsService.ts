// Google Maps Service - Utility functions for geocoding, drive time, etc.
import { loadGoogleMapsAPI } from './googleMapsLoader';

export interface GeocodedAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface DriveTimeResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
  durationText: string;
}

export class GoogleMapsService {
  private apiKey: string;
  private google: typeof google | null = null;
  private organizationLocation: { lat: number; lng: number } | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    if (!this.google) {
      this.google = await loadGoogleMapsAPI(this.apiKey);
    }
  }

  setOrganizationLocation(latitude: number, longitude: number): void {
    this.organizationLocation = { lat: latitude, lng: longitude };
  }

  /**
   * Geocode an address to get coordinates and structured address components
   */
  async geocodeAddress(address: string): Promise<GeocodedAddress | null> {
    await this.initialize();
    if (!this.google) throw new Error('Google Maps not loaded');

    const geocoder = new this.google.maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const components = result.address_components;

          // Extract components
          const getComponent = (type: string): string => {
            const component = components.find((c) => c.types.includes(type));
            return component?.long_name || '';
          };

          const getShortComponent = (type: string): string => {
            const component = components.find((c) => c.types.includes(type));
            return component?.short_name || '';
          };

          resolve({
            address: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
            city: getComponent('locality') || getComponent('sublocality'),
            state: getShortComponent('administrative_area_level_1'),
            zip: getComponent('postal_code'),
            latitude: result.geometry.location.lat(),
            longitude: result.geometry.location.lng(),
            formattedAddress: result.formatted_address,
          });
        } else {
          console.error('Geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  /**
   * Calculate drive time and distance between two locations
   */
  async calculateDriveTime(
    origin: { lat: number; lng: number } | string,
    destination: { lat: number; lng: number } | string
  ): Promise<DriveTimeResult | null> {
    await this.initialize();
    if (!this.google) throw new Error('Google Maps not loaded');

    const service = new this.google.maps.DistanceMatrixService();

    return new Promise((resolve) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: this.google!.maps.TravelMode.DRIVING,
          unitSystem: this.google!.maps.UnitSystem.IMPERIAL,
        },
        (response, status) => {
          if (status === 'OK' && response && response.rows[0]?.elements[0]) {
            const element = response.rows[0].elements[0];

            if (element.status === 'OK') {
              const distanceMeters = element.distance.value;
              const durationSeconds = element.duration.value;

              resolve({
                distanceMeters,
                distanceMiles: distanceMeters * 0.000621371,
                durationSeconds,
                durationMinutes: Math.ceil(durationSeconds / 60),
                durationText: element.duration.text,
              });
            } else {
              console.error('Drive time calculation failed:', element.status);
              resolve(null);
            }
          } else {
            console.error('Distance Matrix API failed:', status);
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Calculate drive time from organization location to customer address
   */
  async calculateDriveTimeFromOrg(
    customerLocation: { lat: number; lng: number } | string
  ): Promise<DriveTimeResult | null> {
    if (!this.organizationLocation) {
      throw new Error('Organization location not set. Call setOrganizationLocation() first.');
    }

    return this.calculateDriveTime(this.organizationLocation, customerLocation);
  }

  /**
   * Reverse geocode coordinates to get address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    await this.initialize();
    if (!this.google) throw new Error('Google Maps not loaded');

    const geocoder = new this.google.maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          console.error('Reverse geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  /**
   * Validate an address exists
   */
  async validateAddress(address: string): Promise<boolean> {
    const result = await this.geocodeAddress(address);
    return result !== null;
  }

  /**
   * Get multiple address suggestions (for autocomplete alternative)
   */
  async getAddressSuggestions(input: string): Promise<string[]> {
    await this.initialize();
    if (!this.google) throw new Error('Google Maps not loaded');

    const service = new this.google.maps.places.AutocompleteService();

    return new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input,
          types: ['address'],
          componentRestrictions: { country: 'us' },
        },
        (predictions, status) => {
          if (status === this.google!.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions.map((p) => p.description));
          } else {
            resolve([]);
          }
        }
      );
    });
  }
}

// Singleton instance
let googleMapsService: GoogleMapsService | null = null;

export const getGoogleMapsService = (apiKey: string): GoogleMapsService => {
  if (!googleMapsService) {
    googleMapsService = new GoogleMapsService(apiKey);
  }
  return googleMapsService;
};
