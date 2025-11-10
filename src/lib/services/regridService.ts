/**
 * Regrid API Integration Service
 * Provides access to official county parcel data including:
 * - Property boundaries (GeoJSON)
 * - Owner information
 * - Zoning and land use
 * - Assessment values
 * - Environmental factors (flood zones, etc.)
 *
 * API Docs: https://regrid.com/api
 */

// Types
export interface RegridParcel {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;

  // Parcel identification
  apn: string; // Assessor Parcel Number
  lotSizeAcres: number;
  lotSizeSqFt: number;

  // Owner information
  ownerName: string;
  ownerType: string; // 'individual', 'corporate', 'government', etc.
  mailingAddress: string;
  isAbsenteeOwner: boolean;

  // Financial
  assessedValue: number;
  landValue: number;
  improvementValue: number;
  marketValue: number;
  taxAmount: number;
  assessmentYear: number;

  // Zoning
  zoning: string;
  zoningDescription: string;
  landUse: string;
  landUseDescription: string;

  // Sale information
  saleDate?: string;
  salePrice?: number;
  deedType?: string;

  // Building details
  yearBuilt?: number;
  buildingSqFt?: number;
  stories?: number;
  bedrooms?: number;
  bathrooms?: number;

  // Environmental
  floodZone?: string;
  isInFloodplain: boolean;
  elevation?: number;

  // Geometry (GeoJSON)
  boundary?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][]; // [lng, lat] pairs
  };
}

export interface RegridSearchResult {
  parcel: RegridParcel;
  confidence: number; // 0-1, how confident the match is
  matchType: 'exact' | 'close' | 'fuzzy';
}

export interface RegridError {
  code: 'NO_API_KEY' | 'INVALID_URL' | 'NETWORK_ERROR' | 'NOT_FOUND' | 'RATE_LIMIT' | 'UNAUTHORIZED' | 'SERVER_ERROR';
  message: string;
  statusCode?: number;
}

// Regrid Service Class
export class RegridService {
  private baseURL = 'https://app.regrid.com/api/v2';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.PUBLIC_REGRID_API_KEY || '';
  }

  /**
   * Search for property by address
   */
  async searchByAddress(address: string): Promise<RegridSearchResult> {
    if (!this.apiKey) {
      throw this.createError('NO_API_KEY', 'Regrid API key not configured');
    }

    try {
      const response = await fetch(
        `${this.baseURL}/parcels?address=${encodeURIComponent(address)}&token=${this.apiKey}&limit=1`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      await this.handleResponseErrors(response);

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw this.createError('NOT_FOUND', 'Property not found in Regrid database');
      }

      const feature = data.features[0];
      const parcel = this.parseParcelFeature(feature);

      return {
        parcel,
        confidence: 0.95, // High confidence for address match
        matchType: 'exact',
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', `Network error: ${error}`);
    }
  }

  /**
   * Search for parcel by coordinates (lat/lng)
   */
  async searchByCoordinates(lat: number, lng: number): Promise<RegridSearchResult> {
    if (!this.apiKey) {
      throw this.createError('NO_API_KEY', 'Regrid API key not configured');
    }

    try {
      const response = await fetch(
        `${this.baseURL}/parcels?lat=${lat}&lon=${lng}&token=${this.apiKey}&limit=1`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      await this.handleResponseErrors(response);

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw this.createError('NOT_FOUND', 'No parcel found at these coordinates');
      }

      const feature = data.features[0];
      const parcel = this.parseParcelFeature(feature);

      return {
        parcel,
        confidence: 1.0, // Perfect confidence for coordinate match
        matchType: 'exact',
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', `Network error: ${error}`);
    }
  }

  /**
   * Get parcel by Regrid ID
   */
  async getParcelById(parcelId: string): Promise<RegridParcel> {
    if (!this.apiKey) {
      throw this.createError('NO_API_KEY', 'Regrid API key not configured');
    }

    try {
      const response = await fetch(
        `${this.baseURL}/parcels/${parcelId}?token=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      await this.handleResponseErrors(response);

      const data = await response.json();
      return this.parseParcelFeature(data);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', `Network error: ${error}`);
    }
  }

  /**
   * Parse Regrid API response feature into our RegridParcel format
   */
  private parseParcelFeature(feature: any): RegridParcel {
    const props = feature.properties || {};
    const fields = props.fields || {};
    const geometry = feature.geometry;

    return {
      id: props.ll_uuid || props.path || '',
      address: fields.address || fields.situs_address || '',
      city: fields.city || fields.situs_city || '',
      state: fields.state || fields.situs_state || '',
      zip: fields.zip || fields.situs_zip || '',
      county: fields.county || fields.county_name || '',

      apn: fields.apn || fields.parcel_id || '',
      lotSizeAcres: fields.ll_gisacre || 0,
      lotSizeSqFt: fields.ll_gissqft || 0,

      ownerName: fields.owner || fields.owner1 || 'Unknown',
      ownerType: this.determineOwnerType(fields.owner_type || fields.owner),
      mailingAddress: this.formatMailingAddress(fields),
      isAbsenteeOwner: this.isAbsenteeOwner(fields),

      assessedValue: fields.assessed_value || fields.total_value || 0,
      landValue: fields.land_value || 0,
      improvementValue: fields.improvement_value || fields.building_value || 0,
      marketValue: fields.market_value || fields.assessed_value || 0,
      taxAmount: fields.tax_amount || fields.annual_tax || 0,
      assessmentYear: fields.assessment_year || new Date().getFullYear(),

      zoning: fields.zoning || fields.zoning_code || 'Unknown',
      zoningDescription: fields.zoning_description || '',
      landUse: fields.land_use || fields.use_code || '',
      landUseDescription: fields.land_use_description || fields.use_description || '',

      saleDate: fields.sale_date || fields.last_sale_date,
      salePrice: fields.sale_price || fields.last_sale_price,
      deedType: fields.deed_type,

      yearBuilt: fields.year_built,
      buildingSqFt: fields.building_sqft || fields.living_sqft,
      stories: fields.stories,
      bedrooms: fields.bedrooms,
      bathrooms: fields.bathrooms,

      floodZone: fields.flood_zone || fields.fema_flood_zone,
      isInFloodplain: this.isInFloodZone(fields.flood_zone),
      elevation: fields.elevation,

      boundary: geometry ? {
        type: geometry.type,
        coordinates: geometry.coordinates,
      } : undefined,
    };
  }

  /**
   * Handle HTTP response errors
   */
  private async handleResponseErrors(response: Response): Promise<void> {
    if (response.ok) return;

    switch (response.status) {
      case 401:
        throw this.createError('UNAUTHORIZED', 'Invalid API key or unauthorized access', 401);
      case 404:
        throw this.createError('NOT_FOUND', 'Property not found', 404);
      case 429:
        throw this.createError('RATE_LIMIT', 'API rate limit exceeded. Please try again later.', 429);
      case 500:
      case 502:
      case 503:
        throw this.createError('SERVER_ERROR', `Regrid server error (HTTP ${response.status})`, response.status);
      default:
        throw this.createError('SERVER_ERROR', `Unexpected error (HTTP ${response.status})`, response.status);
    }
  }

  /**
   * Create standardized error object
   */
  private createError(code: RegridError['code'], message: string, statusCode?: number): RegridError {
    return {
      code,
      message,
      statusCode,
    };
  }

  /**
   * Determine owner type from owner string
   */
  private determineOwnerType(ownerString: string): string {
    if (!ownerString) return 'unknown';

    const upper = ownerString.toUpperCase();

    if (upper.includes('LLC') || upper.includes('INC') || upper.includes('CORP') || upper.includes('LTD')) {
      return 'corporate';
    }
    if (upper.includes('TRUST')) {
      return 'trust';
    }
    if (upper.includes('COUNTY') || upper.includes('CITY') || upper.includes('STATE') || upper.includes('FEDERAL')) {
      return 'government';
    }
    if (upper.includes('CHURCH') || upper.includes('SCHOOL') || upper.includes('FOUNDATION')) {
      return 'nonprofit';
    }

    return 'individual';
  }

  /**
   * Format mailing address from fields
   */
  private formatMailingAddress(fields: any): string {
    const parts = [
      fields.mail_address || fields.mail_address1,
      fields.mail_address2,
      fields.mail_city,
      fields.mail_state,
      fields.mail_zip,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Determine if owner is absentee (mailing address different from property address)
   */
  private isAbsenteeOwner(fields: any): boolean {
    const mailAddress = fields.mail_address || '';
    const situsAddress = fields.address || fields.situs_address || '';

    if (!mailAddress || !situsAddress) return false;

    return !mailAddress.toLowerCase().includes(situsAddress.toLowerCase().substring(0, 10));
  }

  /**
   * Check if property is in a flood zone
   */
  private isInFloodZone(floodZone?: string): boolean {
    if (!floodZone) return false;

    const zone = floodZone.toUpperCase();

    // High-risk flood zones start with A or V
    return zone.startsWith('A') || zone.startsWith('V');
  }
}

// Singleton instance
let regridServiceInstance: RegridService | null = null;

/**
 * Get singleton instance of RegridService
 */
export function getRegridService(apiKey?: string): RegridService {
  if (!regridServiceInstance) {
    regridServiceInstance = new RegridService(apiKey);
  }
  return regridServiceInstance;
}

/**
 * Helper: Check if Regrid API is configured
 */
export function isRegridConfigured(): boolean {
  const apiKey = import.meta.env.PUBLIC_REGRID_API_KEY;
  return !!apiKey && apiKey.length > 0;
}
