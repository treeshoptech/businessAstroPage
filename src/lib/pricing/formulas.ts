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
