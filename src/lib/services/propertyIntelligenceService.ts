/**
 * Property Intelligence Service
 * Analyzes property data from Regrid to provide:
 * - Automated risk assessment
 * - AFISS factor suggestions
 * - Complexity insights
 * - Pricing recommendations
 *
 * Based on iOS PropertyIntelligenceService.swift
 */

import { type RegridParcel } from './regridService';

// Types
export type RiskLevel = 'low' | 'medium' | 'high' | 'veryHigh';

export type InsightCategory =
  | 'access'
  | 'environmental'
  | 'legal'
  | 'infrastructure'
  | 'safety'
  | 'financial'
  | 'operational';

export type InsightImpact = 'positive' | 'neutral' | 'concern' | 'critical';

export interface PropertyInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  impact: InsightImpact;
  actionable: boolean;
  suggestedAFISSFactors?: string[]; // IDs of AFISS factors to consider
}

export interface PropertyIntelligenceReport {
  propertyId: string;
  address: string;
  summary: string;
  riskLevel: RiskLevel;
  keyInsights: PropertyInsight[];
  recommendations: string[];
  warnings: string[];
  opportunities: string[];
  estimatedComplexity: number; // AFISS multiplier suggestion (1.0 - 2.0+)
  confidenceScore: number; // 0-1, how confident we are in the analysis
  dataQualityScore: number; // 0-1, completeness of source data
  generatedAt: Date;
}

export class PropertyIntelligenceService {
  /**
   * Analyze property and generate intelligence report
   */
  analyzeProperty(parcel: RegridParcel): PropertyIntelligenceReport {
    const insights: PropertyInsight[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const opportunities: string[] = [];

    // Run all analysis modules
    insights.push(...this.analyzeAccess(parcel));
    insights.push(...this.analyzeEnvironmental(parcel));
    insights.push(...this.analyzeLegalRestrictions(parcel));
    insights.push(...this.analyzeInfrastructure(parcel));
    insights.push(...this.analyzeSafety(parcel));
    insights.push(...this.analyzeFinancial(parcel));
    insights.push(...this.analyzeOwnership(parcel));

    // Categorize insights into warnings/recommendations/opportunities
    insights.forEach((insight) => {
      if (insight.impact === 'critical') {
        warnings.push(`${insight.title}: ${insight.description}`);
      } else if (insight.impact === 'concern') {
        recommendations.push(`Consider: ${insight.title}`);
      } else if (insight.impact === 'positive') {
        opportunities.push(insight.title);
      }
    });

    const riskLevel = this.calculateRiskLevel(insights);
    const estimatedComplexity = this.calculateComplexityMultiplier(insights);
    const summary = this.generateSummary(parcel, riskLevel, insights);
    const confidenceScore = this.calculateConfidenceScore(parcel);
    const dataQualityScore = this.calculateDataQuality(parcel);

    return {
      propertyId: parcel.id,
      address: parcel.address,
      summary,
      riskLevel,
      keyInsights: insights,
      recommendations,
      warnings,
      opportunities,
      estimatedComplexity,
      confidenceScore,
      dataQualityScore,
      generatedAt: new Date(),
    };
  }

  /**
   * Analyze property access and terrain
   */
  private analyzeAccess(parcel: RegridParcel): PropertyInsight[] {
    const insights: PropertyInsight[] = [];

    // Large lot = potential access challenges
    if (parcel.lotSizeAcres > 2) {
      insights.push({
        id: 'access-large-lot',
        category: 'access',
        title: 'Large property',
        description: `${parcel.lotSizeAcres.toFixed(1)} acre lot may have access challenges or long distances`,
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['access-3', 'access-5'], // Long driveway, backyard access
      });
    }

    // Very small lot = tight workspace
    if (parcel.lotSizeAcres < 0.25) {
      insights.push({
        id: 'access-small-lot',
        category: 'access',
        title: 'Compact property',
        description: 'Small lot may have limited equipment staging and maneuvering space',
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['equipment-4'], // Limited staging area
      });
    }

    return insights;
  }

  /**
   * Analyze environmental factors
   */
  private analyzeEnvironmental(parcel: RegridParcel): PropertyInsight[] {
    const insights: PropertyInsight[] = [];

    // Flood zone analysis
    if (parcel.isInFloodplain) {
      insights.push({
        id: 'env-flood-zone',
        category: 'environmental',
        title: 'Flood Zone Present',
        description: `Property in flood zone ${parcel.floodZone || 'unknown'} - potential wetlands or drainage issues`,
        impact: 'critical',
        actionable: true,
        suggestedAFISSFactors: ['terrain-5', 'terrain-6', 'environmental-9'], // Wetlands, creek, flood restrictions
      });
    }

    // Zoning analysis
    const residentialZoning = ['R', 'RS', 'RD', 'RM', 'RH'];
    const isResidential = residentialZoning.some((z) =>
      parcel.zoning.toUpperCase().startsWith(z)
    );

    if (!isResidential) {
      insights.push({
        id: 'env-non-residential',
        category: 'environmental',
        title: 'Commercial/Industrial Zoning',
        description: `Property zoned ${parcel.zoning} - may have stricter regulations or special requirements`,
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['environmental-4'], // City permit required
      });
    }

    return insights;
  }

  /**
   * Analyze legal restrictions and compliance
   */
  private analyzeLegalRestrictions(parcel: RegridParcel): PropertyInsight[] {
    const insights: PropertyInsight[] = [];

    // Historic district check (heuristic based on building age)
    if (parcel.yearBuilt && parcel.yearBuilt < 1950) {
      insights.push({
        id: 'legal-historic',
        category: 'legal',
        title: 'Potential Historic Property',
        description: `Building constructed in ${parcel.yearBuilt} - may be in historic district with restrictions`,
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['environmental-5'], // Historical district
      });
    }

    // Property line work considerations
    if (parcel.lotSizeSqFt < 8000) {
      insights.push({
        id: 'legal-boundary',
        category: 'legal',
        title: 'Property Boundary Proximity',
        description: 'Small lot increases likelihood of work near property lines - verify boundaries',
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['legal-1', 'customer-6'], // Property line dispute, multiple owners
      });
    }

    return insights;
  }

  /**
   * Analyze infrastructure and utilities
   */
  private analyzeInfrastructure(parcel: RegridParcel): PropertyInsight[] {
    const insights: PropertyInsight[] = [];

    // Age of structure = likely older utilities
    if (parcel.yearBuilt && parcel.yearBuilt < 1980) {
      insights.push({
        id: 'infra-old-utilities',
        category: 'infrastructure',
        title: 'Older Property Infrastructure',
        description: 'Property built before 1980 - underground utilities may be poorly documented',
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['underground-5', 'underground-1'], // Unknown underground, utilities marked
      });
    }

    return insights;
  }

  /**
   * Analyze safety factors
   */
  private analyzeSafety(parcel: RegridParcel): PropertyInsight[] {
    const insights: PropertyInsight[] = [];

    // High-value property = increased liability
    if (parcel.marketValue > 1000000) {
      insights.push({
        id: 'safety-high-value',
        category: 'safety',
        title: 'High-Value Property',
        description: `Property valued at ${this.formatCurrency(parcel.marketValue)} - increased liability exposure`,
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['legal-3'], // High-value property
      });
    }

    // Multi-story building
    if (parcel.stories && parcel.stories > 2) {
      insights.push({
        id: 'safety-multi-story',
        category: 'safety',
        title: 'Multi-Story Structure',
        description: `${parcel.stories}-story building nearby - increased fall risk and rigging requirements`,
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['structure-1', 'structure-2'], // Building within 50ft, 20ft
      });
    }

    return insights;
  }

  /**
   * Analyze financial factors
   */
  private analyzeFinancial(parcel: RegridParcel): PropertyInsight[] {
    const insights: PropertyInsight[] = [];

    // Low assessment = potential cash flow issues
    if (parcel.assessedValue < 150000) {
      insights.push({
        id: 'financial-low-value',
        category: 'financial',
        title: 'Lower-Value Property',
        description: 'Lower assessed value - owner may have budget constraints',
        impact: 'neutral',
        actionable: true,
      });
    }

    // Recent sale
    if (parcel.saleDate) {
      const saleYear = parseInt(parcel.saleDate.substring(0, 4));
      const currentYear = new Date().getFullYear();

      if (currentYear - saleYear <= 2) {
        insights.push({
          id: 'financial-recent-sale',
          category: 'financial',
          title: 'Recently Purchased',
          description: `Property sold in ${saleYear} - new owner may be motivated for improvements`,
          impact: 'positive',
          actionable: false,
        });
      }
    }

    return insights;
  }

  /**
   * Analyze ownership structure
   */
  private analyzeOwnership(parcel: RegridParcel): PropertyInsight[] {
    const insights: PropertyInsight[] = [];

    // Absentee owner
    if (parcel.isAbsenteeOwner) {
      insights.push({
        id: 'ownership-absentee',
        category: 'operational',
        title: 'Absentee Owner',
        description: 'Owner does not live at property - may require remote communication and access coordination',
        impact: 'concern',
        actionable: true,
        suggestedAFISSFactors: ['communication-2'], // Remote property
      });
    }

    // Corporate ownership
    if (parcel.ownerType === 'corporate') {
      insights.push({
        id: 'ownership-corporate',
        category: 'operational',
        title: 'Corporate Owned',
        description: 'Property owned by corporation - may require additional documentation or approval processes',
        impact: 'neutral',
        actionable: true,
        suggestedAFISSFactors: ['legal-5'], // Documentation heavy
      });
    }

    return insights;
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(insights: PropertyInsight[]): RiskLevel {
    const criticalCount = insights.filter((i) => i.impact === 'critical').length;
    const concernCount = insights.filter((i) => i.impact === 'concern').length;

    if (criticalCount >= 2) return 'veryHigh';
    if (criticalCount >= 1 || concernCount >= 4) return 'high';
    if (concernCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * Calculate suggested AFISS complexity multiplier
   */
  private calculateComplexityMultiplier(insights: PropertyInsight[]): number {
    let baseMultiplier = 1.0;

    insights.forEach((insight) => {
      switch (insight.impact) {
        case 'critical':
          baseMultiplier += 0.15;
          break;
        case 'concern':
          baseMultiplier += 0.08;
          break;
        case 'neutral':
          baseMultiplier += 0.03;
          break;
      }
    });

    // Cap at reasonable maximum
    return Math.min(baseMultiplier, 2.0);
  }

  /**
   * Generate natural language summary
   */
  private generateSummary(
    parcel: RegridParcel,
    riskLevel: RiskLevel,
    insights: PropertyInsight[]
  ): string {
    const parts: string[] = [];

    // Property description
    if (parcel.lotSizeAcres > 0) {
      parts.push(
        `${parcel.lotSizeAcres.toFixed(1)}-acre ${parcel.ownerType} property`
      );
    }

    // Zoning
    if (parcel.zoningDescription) {
      parts.push(`zoned ${parcel.zoningDescription.toLowerCase()}`);
    }

    // Risk assessment
    const riskDescriptions = {
      low: 'with minimal complexity factors',
      medium: 'with moderate site challenges',
      high: 'requiring careful planning and execution',
      veryHigh: 'with significant complexity and risk factors',
    };
    parts.push(riskDescriptions[riskLevel]);

    // Key concerns
    const criticalInsights = insights.filter((i) => i.impact === 'critical');
    if (criticalInsights.length > 0) {
      parts.push(
        `Key concerns: ${criticalInsights.map((i) => i.title.toLowerCase()).join(', ')}`
      );
    }

    return parts.join(', ') + '.';
  }

  /**
   * Calculate confidence in analysis
   */
  private calculateConfidenceScore(parcel: RegridParcel): number {
    let score = 0.5; // Base 50%

    // More data = higher confidence
    if (parcel.address) score += 0.1;
    if (parcel.lotSizeAcres > 0) score += 0.1;
    if (parcel.ownerName && parcel.ownerName !== 'Unknown') score += 0.1;
    if (parcel.zoning) score += 0.05;
    if (parcel.floodZone) score += 0.05;
    if (parcel.yearBuilt) score += 0.05;
    if (parcel.boundary) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(parcel: RegridParcel): number {
    const fields = [
      parcel.address,
      parcel.lotSizeAcres > 0,
      parcel.ownerName,
      parcel.assessedValue > 0,
      parcel.zoning,
      parcel.landUse,
      parcel.apn,
      parcel.county,
      parcel.boundary !== undefined,
    ];

    const filledFields = fields.filter(Boolean).length;
    return filledFields / fields.length;
  }

  /**
   * Format currency for display
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}

// Singleton instance
let propertyIntelligenceInstance: PropertyIntelligenceService | null = null;

/**
 * Get singleton instance
 */
export function getPropertyIntelligenceService(): PropertyIntelligenceService {
  if (!propertyIntelligenceInstance) {
    propertyIntelligenceInstance = new PropertyIntelligenceService();
  }
  return propertyIntelligenceInstance;
}
