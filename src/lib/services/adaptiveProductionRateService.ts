/**
 * Adaptive Production Rate Service
 * Self-learning system that improves production rate accuracy based on completed project data
 *
 * Algorithm:
 * 1. Collect actual performance data from completed projects
 * 2. Calculate actual PpH (Points per Hour) for each job
 * 3. Sort and trim outliers (top/bottom 10%)
 * 4. Calculate mean as new adaptive rate
 * 5. Calculate confidence based on data points and variance
 *
 * Based on iOS AdaptiveProductionRateService.swift
 */

// Types
export interface CompletionReport {
  projectId: string;
  completedDate: Date;
  loadoutId: string;
  serviceType: 'mulching' | 'stump-grinding' | 'tree-removal' | 'tree-trimming' | 'land-clearing';

  // Estimated vs Actual
  estimatedHours: number;
  actualHours: number;
  estimatedTreeShopScore: number;
  actualTreeShopScore: number;

  // Production rate
  estimatedPpH: number;
  actualPpH: number;
  variance: number; // Percentage difference

  // Conditions that affected performance
  weatherImpact: number; // -0.2 to +0.2 (20%)
  crewExperience: 'trainee' | 'standard' | 'expert';
  equipmentIssues: boolean;
  siteComplexity: number; // Actual AFISS multiplier
}

export interface AdaptiveRateResult {
  adaptiveRate: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient';
  dataPoints: number;
  rawDataPoints: number; // Before trimming outliers
  standardDeviation: number;
  coefficientOfVariation: number;
  isUsingDefaults: boolean;
  calculatedAt: Date;
  dataRange: {
    min: number;
    max: number;
    median: number;
  };
}

export interface AdaptiveRateConfig {
  lookbackDays: number; // How far back to look for data (default: 90)
  minimumDataPoints: number; // Minimum projects required (default: 10)
  outlierTrimPercent: number; // Trim top/bottom % (default: 0.10)
  confidenceThreshold: number; // CV threshold for confidence (default: 0.15)
}

export class AdaptiveProductionRateService {
  private config: AdaptiveRateConfig = {
    lookbackDays: 90,
    minimumDataPoints: 10,
    outlierTrimPercent: 0.10,
    confidenceThreshold: 0.15,
  };

  constructor(config?: Partial<AdaptiveRateConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Calculate adaptive production rate from completion reports
   */
  calculateAdaptiveRate(
    reports: CompletionReport[],
    defaultRate: number
  ): AdaptiveRateResult {
    // Filter to recent reports
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackDays);

    const recentReports = reports.filter(
      (r) => new Date(r.completedDate) >= cutoffDate
    );

    // Check minimum threshold
    if (recentReports.length < this.config.minimumDataPoints) {
      return {
        adaptiveRate: defaultRate,
        confidenceLevel: 'insufficient',
        dataPoints: recentReports.length,
        rawDataPoints: recentReports.length,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        isUsingDefaults: true,
        calculatedAt: new Date(),
        dataRange: { min: 0, max: 0, median: 0 },
      };
    }

    // Extract actual PpH values
    const rates = recentReports.map((r) => r.actualPpH).sort((a, b) => a - b);
    const rawDataPoints = rates.length;

    // Trim outliers
    const trimmedRates = this.trimOutliers(rates, this.config.outlierTrimPercent);

    // Calculate statistics
    const mean = this.calculateMean(trimmedRates);
    const stdev = this.calculateStandardDeviation(trimmedRates, mean);
    const cv = this.calculateCoefficientOfVariation(stdev, mean);

    // Determine confidence
    const confidenceLevel = this.determineConfidence(
      trimmedRates.length,
      cv,
      this.config.confidenceThreshold
    );

    return {
      adaptiveRate: mean,
      confidenceLevel,
      dataPoints: trimmedRates.length,
      rawDataPoints,
      standardDeviation: stdev,
      coefficientOfVariation: cv,
      isUsingDefaults: false,
      calculatedAt: new Date(),
      dataRange: {
        min: Math.min(...trimmedRates),
        max: Math.max(...trimmedRates),
        median: this.calculateMedian(trimmedRates),
      },
    };
  }

  /**
   * Trim outliers from sorted array
   */
  private trimOutliers(sortedValues: number[], trimPercent: number): number[] {
    if (sortedValues.length < 4) return sortedValues;

    const trimCount = Math.floor(sortedValues.length * trimPercent);
    return sortedValues.slice(trimCount, sortedValues.length - trimCount);
  }

  /**
   * Calculate mean (average)
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate median
   */
  private calculateMedian(sortedValues: number[]): number {
    if (sortedValues.length === 0) return 0;

    const mid = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2 === 0) {
      return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    } else {
      return sortedValues[mid];
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;

    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate coefficient of variation (CV = stdev / mean)
   */
  private calculateCoefficientOfVariation(stdev: number, mean: number): number {
    if (mean === 0) return 0;
    return stdev / mean;
  }

  /**
   * Determine confidence level based on data points and variance
   */
  private determineConfidence(
    dataPoints: number,
    cv: number,
    threshold: number
  ): 'high' | 'medium' | 'low' | 'insufficient' {
    if (dataPoints < this.config.minimumDataPoints) {
      return 'insufficient';
    }

    // High confidence: 20+ projects, CV < 10%
    if (dataPoints >= 20 && cv < 0.10) {
      return 'high';
    }

    // Medium confidence: 10-19 projects, CV < 15%
    if (dataPoints >= 10 && cv < threshold) {
      return 'medium';
    }

    // Low confidence: 10-14 projects or CV > 15%
    if (dataPoints >= 10) {
      return 'low';
    }

    return 'insufficient';
  }

  /**
   * Generate human-readable confidence description
   */
  getConfidenceDescription(result: AdaptiveRateResult): string {
    switch (result.confidenceLevel) {
      case 'high':
        return `High confidence with ${result.dataPoints} projects and low variance (${(result.coefficientOfVariation * 100).toFixed(1)}% CV)`;
      case 'medium':
        return `Medium confidence with ${result.dataPoints} projects and moderate variance (${(result.coefficientOfVariation * 100).toFixed(1)}% CV)`;
      case 'low':
        return `Low confidence - more data needed or high variance (${(result.coefficientOfVariation * 100).toFixed(1)}% CV)`;
      case 'insufficient':
        return `Insufficient data (${result.dataPoints}/${this.config.minimumDataPoints} projects needed)`;
      default:
        return 'Unknown confidence level';
    }
  }

  /**
   * Compare adaptive rate to default rate
   */
  compareToDefault(adaptiveRate: number, defaultRate: number): {
    percentDifference: number;
    direction: 'faster' | 'slower' | 'same';
    recommendation: string;
  } {
    const diff = ((adaptiveRate - defaultRate) / defaultRate) * 100;

    let direction: 'faster' | 'slower' | 'same' = 'same';
    if (Math.abs(diff) < 5) {
      direction = 'same';
    } else if (diff > 0) {
      direction = 'faster';
    } else {
      direction = 'slower';
    }

    let recommendation = '';
    if (direction === 'faster') {
      recommendation = `Your crew is ${Math.abs(diff).toFixed(1)}% faster than assumed - consider updating estimates`;
    } else if (direction === 'slower') {
      recommendation = `Your crew is ${Math.abs(diff).toFixed(1)}% slower than assumed - adjust pricing accordingly`;
    } else {
      recommendation = 'Your default rate is well-calibrated';
    }

    return {
      percentDifference: diff,
      direction,
      recommendation,
    };
  }
}

// Singleton instance
let adaptiveRateServiceInstance: AdaptiveProductionRateService | null = null;

/**
 * Get singleton instance
 */
export function getAdaptiveProductionRateService(
  config?: Partial<AdaptiveRateConfig>
): AdaptiveProductionRateService {
  if (!adaptiveRateServiceInstance) {
    adaptiveRateServiceInstance = new AdaptiveProductionRateService(config);
  }
  return adaptiveRateServiceInstance;
}
