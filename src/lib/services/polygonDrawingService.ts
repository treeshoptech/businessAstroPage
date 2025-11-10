/**
 * Polygon Drawing Service
 * Service for drawing and managing map polygons with area calculation
 * Based on iOS PolygonDrawingService.swift
 */

// Types
export interface CoordinatePoint {
  id: string;
  latitude: number;
  longitude: number;
}

export interface DrawnPolygon {
  id: string;
  name: string;
  points: CoordinatePoint[];
  area: number; // Square meters
  acreage: number;
  serviceType?: 'mulching' | 'clearing' | 'other';
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PolygonDrawingService {
  /**
   * Create a new polygon from points
   */
  createPolygon(
    name: string,
    points: Array<{ lat: number; lng: number }>,
    serviceType?: DrawnPolygon['serviceType']
  ): DrawnPolygon {
    const coordinatePoints: CoordinatePoint[] = points.map((p) => ({
      id: this.generateId(),
      latitude: p.lat,
      longitude: p.lng,
    }));

    const area = this.calculateArea(coordinatePoints);
    const acreage = this.convertToAcres(area);

    return {
      id: this.generateId(),
      name,
      points: coordinatePoints,
      area,
      acreage,
      serviceType,
      color: this.getServiceColor(serviceType),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Calculate polygon area using Shoelace formula (Gauss area formula)
   * Accurate for lat/lng coordinates on Earth's surface
   */
  calculateArea(points: CoordinatePoint[]): number {
    if (points.length < 3) return 0;

    const earthRadius = 6371000; // meters

    // Convert lat/lng to Cartesian coordinates
    const cartesianPoints: Array<{ x: number; y: number; z: number }> = points.map(
      (point) => {
        const lat = (point.latitude * Math.PI) / 180;
        const lon = (point.longitude * Math.PI) / 180;

        const x = earthRadius * Math.cos(lat) * Math.cos(lon);
        const y = earthRadius * Math.cos(lat) * Math.sin(lon);
        const z = earthRadius * Math.sin(lat);

        return { x, y, z };
      }
    );

    // Calculate area using cross products (Shoelace formula in 3D)
    let area = 0;

    for (let i = 0; i < cartesianPoints.length; i++) {
      const p1 = cartesianPoints[i];
      const p2 = cartesianPoints[(i + 1) % cartesianPoints.length];

      area += p1.x * p2.y - p2.x * p1.y;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Convert square meters to acres
   */
  convertToAcres(squareMeters: number): number {
    return squareMeters * 0.000247105;
  }

  /**
   * Convert acres to square meters
   */
  convertToSquareMeters(acres: number): number {
    return acres / 0.000247105;
  }

  /**
   * Validate polygon (minimum 3 points, no self-intersection)
   */
  validatePolygon(points: CoordinatePoint[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (points.length < 3) {
      errors.push('Polygon must have at least 3 points');
    }

    // Check for duplicate points
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (
          points[i].latitude === points[j].latitude &&
          points[i].longitude === points[j].longitude
        ) {
          errors.push(`Duplicate point at index ${i} and ${j}`);
        }
      }
    }

    // Basic self-intersection check (simplified)
    if (points.length > 3 && this.checkSelfIntersection(points)) {
      errors.push('Polygon cannot intersect itself');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Simplify polygon by removing redundant points
   * Uses Douglas-Peucker algorithm
   */
  simplifyPolygon(points: CoordinatePoint[], tolerance: number = 0.0001): CoordinatePoint[] {
    if (points.length <= 3) return points;

    return this.douglasPeucker(points, tolerance);
  }

  /**
   * Calculate perimeter of polygon in meters
   */
  calculatePerimeter(points: CoordinatePoint[]): number {
    if (points.length < 2) return 0;

    let perimeter = 0;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      perimeter += this.haversineDistance(p1, p2);
    }

    return perimeter;
  }

  /**
   * Calculate centroid (center point) of polygon
   */
  calculateCentroid(points: CoordinatePoint[]): { lat: number; lng: number } {
    if (points.length === 0) return { lat: 0, lng: 0 };

    let sumLat = 0;
    let sumLng = 0;

    points.forEach((point) => {
      sumLat += point.latitude;
      sumLng += point.longitude;
    });

    return {
      lat: sumLat / points.length,
      lng: sumLng / points.length,
    };
  }

  /**
   * Check if a point is inside the polygon
   */
  pointInPolygon(
    point: { lat: number; lng: number },
    polygon: CoordinatePoint[]
  ): boolean {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > point.lat !== yj > point.lat &&
        point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Convert to GeoJSON format
   */
  toGeoJSON(polygon: DrawnPolygon): any {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            ...polygon.points.map((p) => [p.longitude, p.latitude]),
            [polygon.points[0].longitude, polygon.points[0].latitude], // Close the ring
          ],
        ],
      },
      properties: {
        id: polygon.id,
        name: polygon.name,
        area: polygon.area,
        acreage: polygon.acreage,
        serviceType: polygon.serviceType,
        color: polygon.color,
        createdAt: polygon.createdAt.toISOString(),
        updatedAt: polygon.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Parse from GeoJSON format
   */
  fromGeoJSON(geojson: any): DrawnPolygon | null {
    try {
      if (geojson.type !== 'Feature' || geojson.geometry.type !== 'Polygon') {
        return null;
      }

      const coordinates = geojson.geometry.coordinates[0];
      const points: CoordinatePoint[] = coordinates
        .slice(0, -1) // Remove last point (closing point)
        .map((coord: number[]) => ({
          id: this.generateId(),
          latitude: coord[1],
          longitude: coord[0],
        }));

      const area = this.calculateArea(points);
      const acreage = this.convertToAcres(area);

      return {
        id: geojson.properties?.id || this.generateId(),
        name: geojson.properties?.name || 'Untitled',
        points,
        area,
        acreage,
        serviceType: geojson.properties?.serviceType,
        color: geojson.properties?.color,
        createdAt: geojson.properties?.createdAt
          ? new Date(geojson.properties.createdAt)
          : new Date(),
        updatedAt: geojson.properties?.updatedAt
          ? new Date(geojson.properties.updatedAt)
          : new Date(),
      };
    } catch (error) {
      console.error('Error parsing GeoJSON:', error);
      return null;
    }
  }

  // Private helper methods

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private getServiceColor(serviceType?: DrawnPolygon['serviceType']): string {
    switch (serviceType) {
      case 'mulching':
        return '#10b981'; // Green
      case 'clearing':
        return '#f59e0b'; // Amber
      default:
        return '#3b82f6'; // Blue
    }
  }

  /**
   * Check for self-intersection (simplified)
   */
  private checkSelfIntersection(points: CoordinatePoint[]): boolean {
    // Simplified check - only checks if any two non-adjacent edges intersect
    for (let i = 0; i < points.length; i++) {
      const edge1 = {
        p1: points[i],
        p2: points[(i + 1) % points.length],
      };

      for (let j = i + 2; j < points.length; j++) {
        // Skip adjacent edges
        if (j === (i + points.length - 1) % points.length) continue;

        const edge2 = {
          p1: points[j],
          p2: points[(j + 1) % points.length],
        };

        if (this.edgesIntersect(edge1.p1, edge1.p2, edge2.p1, edge2.p2)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if two line segments intersect
   */
  private edgesIntersect(
    p1: CoordinatePoint,
    p2: CoordinatePoint,
    p3: CoordinatePoint,
    p4: CoordinatePoint
  ): boolean {
    const ccw = (A: CoordinatePoint, B: CoordinatePoint, C: CoordinatePoint) => {
      return (
        (C.latitude - A.latitude) * (B.longitude - A.longitude) >
        (B.latitude - A.latitude) * (C.longitude - A.longitude)
      );
    };

    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private haversineDistance(p1: CoordinatePoint, p2: CoordinatePoint): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = (p1.latitude * Math.PI) / 180;
    const lat2 = (p2.latitude * Math.PI) / 180;
    const deltaLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const deltaLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Douglas-Peucker polygon simplification algorithm
   */
  private douglasPeucker(points: CoordinatePoint[], tolerance: number): CoordinatePoint[] {
    if (points.length <= 2) return points;

    // Find the point with maximum distance from line
    let maxDistance = 0;
    let maxIndex = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);

      return [...left.slice(0, -1), ...right];
    } else {
      return [start, end];
    }
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(
    point: CoordinatePoint,
    lineStart: CoordinatePoint,
    lineEnd: CoordinatePoint
  ): number {
    const dx = lineEnd.longitude - lineStart.longitude;
    const dy = lineEnd.latitude - lineStart.latitude;

    const numerator = Math.abs(
      dy * point.longitude - dx * point.latitude + lineEnd.longitude * lineStart.latitude - lineEnd.latitude * lineStart.longitude
    );

    const denominator = Math.sqrt(dx * dx + dy * dy);

    return numerator / denominator;
  }
}

// Singleton instance
let polygonServiceInstance: PolygonDrawingService | null = null;

/**
 * Get singleton instance
 */
export function getPolygonDrawingService(): PolygonDrawingService {
  if (!polygonServiceInstance) {
    polygonServiceInstance = new PolygonDrawingService();
  }
  return polygonServiceInstance;
}
