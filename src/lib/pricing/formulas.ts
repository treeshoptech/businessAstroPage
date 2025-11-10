/**
 * TreeShop Pricing Formulas
 * Complete pricing engine following CLAUDE.md specifications
 */

// Equipment Cost Calculation
export interface EquipmentCostInputs {
  purchasePrice: number;
  usefulLifeYears: number;
  annualHours: number;
  financeCostPerYear: number;
  insurancePerYear: number;
  registrationPerYear: number;
  fuelGallonsPerHour: number;
  fuelPricePerGallon: number;
  maintenancePerYear: number;
  repairsPerYear: number;
}

export interface EquipmentCostOutputs {
  ownershipCostPerHour: number;
  operatingCostPerHour: number;
  totalCostPerHour: number;
}

export function calculateEquipmentCost(
  inputs: EquipmentCostInputs
): EquipmentCostOutputs {
  const {
    purchasePrice,
    usefulLifeYears,
    annualHours,
    financeCostPerYear,
    insurancePerYear,
    registrationPerYear,
    fuelGallonsPerHour,
    fuelPricePerGallon,
    maintenancePerYear,
    repairsPerYear,
  } = inputs;

  // Ownership Cost = (Purchase ÷ Years + Finance + Insurance + Registration) ÷ Annual Hours
  const ownershipCostPerHour =
    (purchasePrice / usefulLifeYears +
      financeCostPerYear +
      insurancePerYear +
      registrationPerYear) /
    annualHours;

  // Operating Cost = (Fuel Cost/hr + Maintenance + Repairs) ÷ Annual Hours
  const fuelCostPerYear = fuelGallonsPerHour * fuelPricePerGallon * annualHours;
  const operatingCostPerHour =
    (fuelCostPerYear + maintenancePerYear + repairsPerYear) / annualHours;

  const totalCostPerHour = ownershipCostPerHour + operatingCostPerHour;

  return {
    ownershipCostPerHour,
    operatingCostPerHour,
    totalCostPerHour,
  };
}

// Employee Cost Calculation
export interface EmployeeCostInputs {
  baseHourlyRate: number;
  burdenMultiplier: number; // 1.6 - 2.0
}

export function calculateEmployeeTrueCost(inputs: EmployeeCostInputs): number {
  return inputs.baseHourlyRate * inputs.burdenMultiplier;
}

// Loadout Cost Calculation
export interface LoadoutCostInputs {
  equipmentCosts: number[]; // array of equipment hourly costs
  employeeCosts: number[]; // array of employee true costs
  overheadCostPerHour: number;
}

export interface LoadoutCostOutputs {
  totalEquipmentCost: number;
  totalLaborCost: number;
  totalLoadoutCost: number;
}

export function calculateLoadoutCost(
  inputs: LoadoutCostInputs
): LoadoutCostOutputs {
  const totalEquipmentCost = inputs.equipmentCosts.reduce(
    (sum, cost) => sum + cost,
    0
  );
  const totalLaborCost = inputs.employeeCosts.reduce((sum, cost) => sum + cost, 0);
  const totalLoadoutCost =
    totalEquipmentCost + totalLaborCost + inputs.overheadCostPerHour;

  return {
    totalEquipmentCost,
    totalLaborCost,
    totalLoadoutCost,
  };
}

// Billing Rate Calculation (Margin to Price Formula)
export interface BillingRateOutputs {
  margin30: number;
  margin40: number;
  margin50: number;
  margin60: number;
  margin70: number;
}

export function calculateBillingRates(cost: number): BillingRateOutputs {
  // Formula: Billing Rate = Cost ÷ (1 - Desired Margin%)
  return {
    margin30: cost / 0.7, // 1.43x
    margin40: cost / 0.6, // 1.67x
    margin50: cost / 0.5, // 2.0x
    margin60: cost / 0.4, // 2.5x
    margin70: cost / 0.3, // 3.33x
  };
}

// TreeShop Score Calculations by Service Type

// 1. Forestry Mulching
export interface ForestryMulchingInputs {
  acreage: number;
  dbhPackage: 4 | 6 | 8 | 10 | 15; // inches
  afissMultiplier: number; // default 1.0
}

export function calculateForestryMulchingScore(
  inputs: ForestryMulchingInputs
): number {
  const baseScore = inputs.acreage * inputs.dbhPackage;
  return baseScore * inputs.afissMultiplier;
}

// 2. Stump Grinding
export interface StumpInputs {
  diameterInches: number;
  heightAboveGradeFeet: number;
  grindDepthBelowGradeFeet: number;
  isHardwood: boolean;
  hasLargeRootFlare: boolean;
  isRotten: boolean;
  hasRocksInRootZone: boolean;
  isTightLandscaping: boolean;
}

export function calculateStumpScore(inputs: StumpInputs): number {
  const {
    diameterInches,
    heightAboveGradeFeet,
    grindDepthBelowGradeFeet,
    isHardwood,
    hasLargeRootFlare,
    isRotten,
    hasRocksInRootZone,
    isTightLandscaping,
  } = inputs;

  // Base StumpScore = Diameter² × (Height Above + Grind Depth Below)
  let score =
    diameterInches ** 2 * (heightAboveGradeFeet + grindDepthBelowGradeFeet);

  // Apply modifiers
  if (isHardwood) score *= 1.15; // +15%
  if (hasLargeRootFlare) score *= 1.2; // +20%
  if (isRotten) score *= 0.85; // -15%
  if (hasRocksInRootZone) score *= 1.1; // +10%
  if (isTightLandscaping) score *= 1.15; // +15%

  return score;
}

// 3. Land Clearing (day-based estimation)
export interface LandClearingInputs {
  projectType: "standard_lot" | "large_lot" | "multi_lot";
  clearingIntensity: "light" | "standard" | "heavy";
  afissDayAdjustment: number; // additional days (0 to 1+)
}

export function calculateLandClearingDays(
  inputs: LandClearingInputs
): number {
  const { projectType, clearingIntensity, afissDayAdjustment } = inputs;

  let baseDays = 1;

  // Determine base days from project type + intensity
  if (projectType === "standard_lot") {
    if (clearingIntensity === "light") baseDays = 1;
    else if (clearingIntensity === "standard") baseDays = 1.5;
    else baseDays = 2;
  } else if (projectType === "large_lot") {
    if (clearingIntensity === "light") baseDays = 1.5;
    else if (clearingIntensity === "standard") baseDays = 2;
    else baseDays = 2.5;
  } else {
    // multi_lot
    baseDays = 3; // minimum, typically custom quote
  }

  return baseDays + afissDayAdjustment;
}

// Project Pricing Calculation
export interface ProjectPricingInputs {
  treeShopScore: number;
  productionRatePpH: number; // Points per Hour
  driveTimeOneWayMinutes: number;
  transportBillingRate: number; // percentage of loadout rate (0.3 - 0.5)
  loadoutHourlyRate: number;
  bufferPercentage: number; // default 0.10 (10%)
}

export interface ProjectPricingOutputs {
  productionHours: number;
  transportHours: number;
  bufferHours: number;
  totalHours: number;
  totalCost: number;
  priceAtMargin30: number;
  priceAtMargin40: number;
  priceAtMargin50: number;
  priceAtMargin60: number;
  priceAtMargin70: number;
}

export function calculateProjectPricing(
  inputs: ProjectPricingInputs
): ProjectPricingOutputs {
  const {
    treeShopScore,
    productionRatePpH,
    driveTimeOneWayMinutes,
    transportBillingRate,
    loadoutHourlyRate,
    bufferPercentage,
  } = inputs;

  // Production Hours = TreeShop Score ÷ Production Rate (PpH)
  const productionHours = treeShopScore / productionRatePpH;

  // Transport Hours = (One-Way Drive Time × 2) × Transport Rate
  const driveTimeHours = (driveTimeOneWayMinutes * 2) / 60;
  const transportHours = driveTimeHours * transportBillingRate;

  // Buffer Hours = (Production + Transport) × Buffer %
  const bufferHours = (productionHours + transportHours) * bufferPercentage;

  // Total Hours
  const totalHours = productionHours + transportHours + bufferHours;

  // Total Cost (before margin)
  const totalCost = totalHours * loadoutHourlyRate;

  // Prices at different margins
  const billingRates = calculateBillingRates(loadoutHourlyRate);

  return {
    productionHours,
    transportHours,
    bufferHours,
    totalHours,
    totalCost,
    priceAtMargin30: totalHours * billingRates.margin30,
    priceAtMargin40: totalHours * billingRates.margin40,
    priceAtMargin50: totalHours * billingRates.margin50,
    priceAtMargin60: totalHours * billingRates.margin60,
    priceAtMargin70: totalHours * billingRates.margin70,
  };
}

// AFISS Factor Management
export interface AFISSFactor {
  category:
    | "access"
    | "facilities"
    | "irregularities"
    | "site_conditions"
    | "safety";
  factor: string;
  percentage: number; // e.g., 0.12 for 12%
}

export function calculateAFISSMultiplier(factors: AFISSFactor[]): number {
  const totalPercentage = factors.reduce(
    (sum, factor) => sum + factor.percentage,
    0
  );
  return 1.0 + totalPercentage;
}

// Production Rate Defaults by Service
export const PRODUCTION_RATES = {
  forestry_mulching_cat265: 1.3, // IA/hour
  forestry_mulching_sk200tr: 5.0, // IA/hour
  forestry_mulching_default: 1.5, // IA/hour
  stump_grinding_default: 400, // StumpScore points/hour
  land_clearing_daily: 8, // hours per day
  tree_removal_default: 250, // TreeShop Score points/hour
  tree_trimming_default: 250, // TreeShop Score points/hour
};

// Minimum Project Thresholds
export const MINIMUM_HOURS = {
  stump_grinding: 2, // 2-hour minimum
  general: 0.5, // 30-minute minimum
};

// ============================================================================
// TREE REMOVAL & TRIMMING FORMULAS (from iOS PricingFormulas.swift)
// ============================================================================

// Tree Removal Calculation
export interface TreeInputs {
  heightFeet: number;
  dbhInches: number; // Diameter at Breast Height
  canopyRadiusFeet: number;
}

export interface TreeScoreResult {
  treeScore: number;
  description: string;
}

/**
 * Calculate TreeScore using exponential formula: H × (DBH÷12)² × CR²
 * DBH is entered in inches but must be converted to feet for calculation
 */
export function calculateTreeScore(
  height: number,
  dbh: number,
  canopyRadius: number
): number {
  const dbhInFeet = dbh / 12.0;
  return height * (dbhInFeet * dbhInFeet) * (canopyRadius * canopyRadius);
}

/**
 * Calculate TreeScore for a single tree with description
 */
export function calculateTreeRemoval(tree: TreeInputs): TreeScoreResult {
  const score = calculateTreeScore(
    tree.heightFeet,
    tree.dbhInches,
    tree.canopyRadiusFeet
  );

  const description = `${tree.heightFeet}' tall × ${tree.dbhInches}" DBH × ${tree.canopyRadiusFeet}' canopy = ${Math.round(score)} points`;

  return { treeScore: score, description };
}

/**
 * Calculate total TreeScore for multiple trees
 */
export function calculateMultiTreeRemoval(
  trees: TreeInputs[],
  productionRate: number = 250
): { totalScore: number; productionHours: number } {
  const totalScore = trees.reduce((sum, tree) => {
    return (
      sum +
      calculateTreeScore(tree.heightFeet, tree.dbhInches, tree.canopyRadiusFeet)
    );
  }, 0);

  const hours = productionRate > 0 ? totalScore / productionRate : 0;

  return { totalScore, hours };
}

// Tree Trimming Calculation
export interface TreeTrimmingResult {
  trimScore: number;
  fullTreeScore: number;
  trimPercentage: number;
  description: string;
}

/**
 * Calculate TrimScore for tree trimming jobs
 * @param tree - Tree measurements
 * @param trimPercentage - Percentage of canopy being removed (0.0 - 1.0)
 */
export function calculateTreeTrimming(
  tree: TreeInputs,
  trimPercentage: number
): TreeTrimmingResult {
  const fullScore = calculateTreeScore(
    tree.heightFeet,
    tree.dbhInches,
    tree.canopyRadiusFeet
  );
  const trimScore = fullScore * trimPercentage;

  const description = `${tree.heightFeet}' tall × ${tree.dbhInches}" DBH × ${tree.canopyRadiusFeet}' canopy × ${Math.round(trimPercentage * 100)}% trim = ${Math.round(trimScore)} points`;

  return {
    trimScore,
    fullTreeScore: fullScore,
    trimPercentage,
    description,
  };
}

/**
 * Calculate total trim work for multiple trees
 */
export function calculateMultiTreeTrimming(
  trees: TreeInputs[],
  trimPercentage: number,
  productionRate: number = 250
): { totalScore: number; productionHours: number } {
  const totalScore = trees.reduce((sum, tree) => {
    const fullScore = calculateTreeScore(
      tree.heightFeet,
      tree.dbhInches,
      tree.canopyRadiusFeet
    );
    return sum + fullScore * trimPercentage;
  }, 0);

  const hours = productionRate > 0 ? totalScore / productionRate : 0;

  return { totalScore, hours };
}

/**
 * Get trim intensity factor from percentage
 * Light (10-15%): 0.3, Medium (20-30%): 0.5, Heavy (40-50%): 0.8
 */
export function getTrimIntensityFactor(percentage: number): number {
  if (percentage >= 0.1 && percentage <= 0.15) {
    return 0.3;
  } else if (percentage >= 0.2 && percentage <= 0.3) {
    return 0.5;
  } else if (percentage >= 0.4 && percentage <= 0.5) {
    return 0.8;
  }
  return percentage; // Use actual percentage if not in standard range
}

// ============================================================================
// ADVANCED LAND CLEARING - CLEARINGSCORE SYSTEM (from iOS)
// ============================================================================

export type ClearingDensity = "light" | "average" | "heavy";

export interface ClearingScoreParams {
  acres: number;
  density: ClearingDensity;
  afissMultiplier: number;
}

export interface ClearingScoreResult {
  baseClearingScore: number;
  adjustedClearingScore: number;
  excavatorHours: number;
  grubbingHours: number;
  totalWorkHours: number;
  excavatorDays: number;
  grubbingDays: number;
  totalDays: number;
}

/**
 * Calculate ClearingScore for land clearing projects
 * Base = Acres (1 acre = 1 ClearingScore point)
 * Apply density and AFISS multipliers
 */
export function calculateClearingScore(
  params: ClearingScoreParams
): ClearingScoreResult {
  const { acres, density, afissMultiplier } = params;

  // Density multipliers
  const densityMultiplier =
    density === "light" ? 0.7 : density === "average" ? 1.0 : 1.3;

  // Base = Acres (1 acre = 1 ClearingScore point)
  const baseScore = acres;

  // Apply density and AFISS multipliers
  const adjustedScore = baseScore * densityMultiplier * afissMultiplier;

  // Work Hours
  // Excavator: 16 hours per ClearingScore point (2 days × 8 hrs)
  // Grubbing: 8 hours per ClearingScore point (1 day × 8 hrs)
  const excavatorHours = adjustedScore * 16.0;
  const grubbingHours = adjustedScore * 8.0;
  const totalWorkHours = excavatorHours + grubbingHours;

  // Convert to Days for Display (scheduling)
  const excavatorDays = Math.ceil(excavatorHours / 8.0);
  const grubbingDays = Math.ceil(grubbingHours / 8.0);
  const totalDays = Math.ceil(totalWorkHours / 8.0);

  return {
    baseClearingScore: baseScore,
    adjustedClearingScore: adjustedScore,
    excavatorHours,
    grubbingHours,
    totalWorkHours,
    excavatorDays,
    grubbingDays,
    totalDays,
  };
}

export interface ClearingPricingParams {
  clearingScore: ClearingScoreResult;
  excavatorLoadoutCostPerHour: number;
  excavatorRentalCostPerHour: number; // e.g., $1500/day ÷ 8 hrs = $187.50/hr
  grubbingLoadoutCostPerHour: number;
  truckLoads: number; // Debris removal (default: acres × 2.5)
  costPerTruckLoad: number; // Default: $700
  excavatorMargin: number; // 0.50 = 50%
  grubbingMargin: number; // 0.50 = 50%
  debrisMargin: number; // 0.50 = 50%
}

export interface ClearingPricingResult {
  // Excavator Phase
  excavatorEquipmentCost: number;
  excavatorRentalCost: number;
  excavatorTotalCost: number;
  excavatorPrice: number;

  // Grubbing Phase
  grubbingCost: number;
  grubbingPrice: number;

  // Debris Removal
  debrisCost: number;
  debrisPrice: number;

  // Totals
  totalCost: number;
  totalPrice: number;
  totalProfit: number;
  profitMargin: number;
}

/**
 * Calculate two-phase land clearing pricing with debris removal
 */
export function calculateClearingPricing(
  params: ClearingPricingParams
): ClearingPricingResult {
  const {
    clearingScore,
    excavatorLoadoutCostPerHour,
    excavatorRentalCostPerHour,
    grubbingLoadoutCostPerHour,
    truckLoads,
    costPerTruckLoad,
    excavatorMargin,
    grubbingMargin,
    debrisMargin,
  } = params;

  // Excavator Phase Costs
  const excavatorEquipmentCost =
    clearingScore.excavatorHours * excavatorLoadoutCostPerHour;
  const excavatorRentalCost =
    clearingScore.excavatorHours * excavatorRentalCostPerHour;
  const excavatorTotalCost = excavatorEquipmentCost + excavatorRentalCost;

  // Grubbing Phase Costs
  const grubbingCost = clearingScore.grubbingHours * grubbingLoadoutCostPerHour;

  // Debris Removal Costs
  const debrisCost = truckLoads * costPerTruckLoad;

  // Total Costs
  const totalCost = excavatorTotalCost + grubbingCost + debrisCost;

  // Calculate Prices (using margin formula: Price = Cost ÷ (1 - Margin))
  const excavatorPrice =
    excavatorMargin < 1.0
      ? excavatorTotalCost / (1 - excavatorMargin)
      : excavatorTotalCost;
  const grubbingPrice =
    grubbingMargin < 1.0 ? grubbingCost / (1 - grubbingMargin) : grubbingCost;
  const debrisPrice =
    debrisMargin < 1.0 ? debrisCost / (1 - debrisMargin) : debrisCost;

  // Total Price and Profit
  const totalPrice = excavatorPrice + grubbingPrice + debrisPrice;
  const totalProfit = totalPrice - totalCost;
  const profitMargin = totalPrice > 0 ? totalProfit / totalPrice : 0;

  return {
    excavatorEquipmentCost,
    excavatorRentalCost,
    excavatorTotalCost,
    excavatorPrice,
    grubbingCost,
    grubbingPrice,
    debrisCost,
    debrisPrice,
    totalCost,
    totalPrice,
    totalProfit,
    profitMargin,
  };
}

/**
 * Helper: Estimate truck loads from acreage
 */
export function estimateTruckLoads(
  acres: number,
  loadsPerAcre: number = 2.5
): number {
  return Math.ceil(acres * loadsPerAcre);
}

// ============================================================================
// HYDRAULIC FLOW PRODUCTION RATE (from iOS)
// ============================================================================

/**
 * Calculate mulching production rate from hydraulic flow (GPM)
 * Formula: R = (Q/30)^1.58 where Q = GPM
 * Based on TreeShop research: https://www.treeshop.app/articles/12
 * Benchmarks: 30 GPM = 1.0 PpH, 34 GPM = 1.3 PpH, 40 GPM = 2.0 PpH
 */
export function calculateProductionRateFromGPM(gpm: number): number {
  return Math.pow(gpm / 30.0, 1.58);
}

// ============================================================================
// UTILITY FUNCTIONS (from iOS)
// ============================================================================

/**
 * Format currency values
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format hours display
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

/**
 * Format miles display
 */
export function formatMiles(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format percentage display
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format score with K/M notation
 */
export function formatScore(score: number): string {
  if (score >= 1_000_000) {
    return `${(score / 1_000_000).toFixed(2)}M`;
  } else if (score >= 1_000) {
    return `${(score / 1_000).toFixed(1)}K`;
  } else {
    return score.toFixed(0);
  }
}
