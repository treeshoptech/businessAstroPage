/**
 * TreeShop TypeScript Type Definitions
 */

// Organization (Multi-tenant root)
export interface Organization {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  workosOrgId: string;
  status: 'active' | 'trial' | 'suspended';
  createdAt: number;
}

// User
export type UserRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'estimator'
  | 'crew_leader'
  | 'crew_member';

export interface User {
  _id: string;
  organizationId: string;
  workosUserId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: number;
}

// Equipment
export type EquipmentCategory =
  | 'truck'
  | 'mulcher'
  | 'stump_grinder'
  | 'excavator'
  | 'trailer'
  | 'support';

export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

export interface Equipment {
  _id: string;
  organizationId: string;
  name: string;
  category: EquipmentCategory;
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
  status: EquipmentStatus;
  createdAt: number;
}

// Employee
export type EmployeePosition =
  | 'entry_ground_crew'
  | 'experienced_climber'
  | 'crew_leader'
  | 'certified_arborist'
  | 'specialized_operator';

export interface Employee {
  _id: string;
  organizationId: string;
  name: string;
  position: EmployeePosition;
  baseHourlyRate: number;
  burdenMultiplier: number;
  hireDate: number;
  status: 'active' | 'inactive';
  createdAt: number;
}

// Loadout
export type ServiceType =
  | 'forestry_mulching'
  | 'stump_grinding'
  | 'land_clearing'
  | 'tree_removal'
  | 'tree_trimming';

export interface Loadout {
  _id: string;
  organizationId: string;
  name: string;
  serviceType: ServiceType;
  equipmentIds: string[];
  employeeIds: string[];
  productionRatePpH: number;
  overheadCostPerHour: number;
  billingRates: {
    margin30: number;
    margin40: number;
    margin50: number;
    margin60: number;
    margin70: number;
  };
  createdAt: number;
}

// Customer
export interface Customer {
  _id: string;
  organizationId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyLatitude?: number;
  propertyLongitude?: number;
  notes?: string;
  createdAt: number;
}

// Project
export type ProjectStatus =
  | 'lead'
  | 'proposal'
  | 'work_order'
  | 'invoice'
  | 'completed'
  | 'cancelled';

export interface Project {
  _id: string;
  organizationId: string;
  customerId: string;
  serviceType: ServiceType | 'property_assessment';
  status: ProjectStatus;
  treeShopScore?: number;
  driveTimeMinutes?: number;
  projectIntent?: string;
  siteHazards?: string[];
  createdAt: number;
  updatedAt: number;
}

// AFISS Factor
export interface AFISSFactor {
  category: 'access' | 'facilities' | 'irregularities' | 'site_conditions' | 'safety';
  factor: string;
  percentage: number;
}

// Proposal
export interface Proposal {
  _id: string;
  organizationId: string;
  projectId: string;
  loadoutId: string;
  scopeOfWork: string;
  inclusions: string[];
  exclusions: string[];
  afissFactors: AFISSFactor[];
  afissMultiplier: number;
  adjustedTreeShopScore: number;
  estimatedHours: number;
  transportHours: number;
  bufferHours: number;
  totalHours: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  termsAndConditions?: string;
  signatureDataUrl?: string;
  signedName?: string;
  signedDate?: number;
  createdAt: number;
}

// Quote
export interface Quote {
  _id: string;
  organizationId: string;
  proposalId: string;
  totalCost: number;
  selectedMargin: number;
  finalPrice: number;
  profitAmount: number;
  profitMarginPercent: number;
  createdAt: number;
}
