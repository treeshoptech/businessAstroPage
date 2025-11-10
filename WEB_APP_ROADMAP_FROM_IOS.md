# TreeShop Web App Roadmap - Learning from iOS Implementation

**Generated:** 2025-01-10
**Purpose:** Use iOS source files to enhance web app with proven features and architecture
**Timeline:** 8-12 weeks for complete feature parity

---

## 🎯 Executive Summary

The iOS app has **30+ production-ready services** that should be ported to the web app. This roadmap focuses on implementing the **data collection frontend** that feeds calculations to the **backend processing engine**, then returns results to display in the UI.

**Architecture Pattern:**
```
User Input (Frontend Forms)
  → Raw Field Data
  → Database Storage
  → Backend Processing (Formulas Engine)
  → Calculated Results
  → Frontend Display
```

---

## 📊 Priority Matrix

| Priority | Category | Impact | Effort | Timeline |
|----------|----------|--------|--------|----------|
| **P0** | Pricing Calculators | 🔴 Critical | High | Weeks 1-3 |
| **P1** | Property Intelligence | 🟠 High | Medium | Weeks 4-5 |
| **P2** | Map Features | 🟡 Medium | High | Weeks 6-8 |
| **P3** | Analytics & Optimization | 🟢 Low | Low | Weeks 9-10 |
| **P4** | Advanced Services | 🔵 Nice-to-have | Medium | Weeks 11-12 |

---

## 🔴 P0: Critical Pricing Calculators (Weeks 1-3)

### Status: 75% Complete (1 of 4 missing)

### ✅ Completed
- [x] Forestry Mulching Calculator
- [x] Land Clearing Calculator (day-based system)
- [x] Basic AFISS Factor Picker (50 factors, 7 categories)

### 🚧 In Progress (from WEBAPP_CALCULATOR_TODO.md)
- [ ] **Stump Grinding Calculator** - HIGH PRIORITY
  - Dynamic stump entry with modifiers
  - StumpScore calculation (D² × H)
  - Real-time calculation per stump
  - 2-hour minimum enforcement
  - 5 modifiers: hardwood, root flare, rotten, rocks, tight space

### 🔜 Immediate Next
- [ ] **Tree Removal Calculator**
  - Multi-tree entry form
  - TreeScore formula: H × (DBH÷12)² × CR²
  - Per-tree AFISS factors
  - 250 PpH default production rate

- [ ] **Tree Trimming Calculator**
  - Same tree entry as removal
  - Trim percentage/intensity selector
  - TrimScore = TreeScore × Trim%
  - Light (30%), Medium (50%), Heavy (80%) presets

### 📐 Missing Formulas in `formulas.ts`

**Add from iOS `PricingFormulas.swift`:**

```typescript
// Tree Removal (lines 274-303)
export function calculateTreeScore(
  height: number,
  dbh: number,
  canopyRadius: number
): number {
  const dbhInFeet = dbh / 12.0;
  return height * (dbhInFeet * dbhInFeet) * (canopyRadius * canopyRadius);
}

export function calculateMultiTreeRemoval(
  trees: Array<{height: number; dbh: number; canopyRadius: number}>,
  productionRate: number = 250
): { totalScore: number; productionHours: number } {
  const totalScore = trees.reduce((sum, tree) =>
    sum + calculateTreeScore(tree.height, tree.dbh, tree.canopyRadius), 0
  );
  const hours = productionRate > 0 ? totalScore / productionRate : 0;
  return { totalScore, hours };
}

// Tree Trimming (lines 305-360)
export function calculateTreeTrimming(
  tree: {height: number; dbh: number; canopyRadius: number},
  trimPercentage: number
): { trimScore: number; fullTreeScore: number; trimPercentage: number } {
  const fullScore = calculateTreeScore(tree.height, tree.dbh, tree.canopyRadius);
  return {
    trimScore: fullScore * trimPercentage,
    fullTreeScore: fullScore,
    trimPercentage
  };
}

export function getTrimIntensityFactor(percentage: number): number {
  if (percentage >= 0.10 && percentage <= 0.15) return 0.3;
  if (percentage >= 0.20 && percentage <= 0.30) return 0.5;
  if (percentage >= 0.40 && percentage <= 0.50) return 0.8;
  return percentage;
}

// Hydraulic Flow Rate Production (lines 440-447)
export function calculateProductionRateFromGPM(gpm: number): number {
  // Formula: R = (Q/30)^1.58 where Q = GPM
  // Benchmarks: 30 GPM = 1.0 PpH, 34 GPM = 1.3 PpH, 40 GPM = 2.0 PpH
  return Math.pow(gpm / 30.0, 1.58);
}

// Land Clearing ClearingScore System (lines 96-259)
// Copy full implementation from iOS - advanced 2-phase pricing
export interface ClearingScoreParams {
  acres: number;
  density: 'light' | 'average' | 'heavy';
  afissMultiplier: number;
}

export function calculateClearingScore(params: ClearingScoreParams) {
  const baseScore = params.acres;
  const densityMultiplier = params.density === 'light' ? 0.7
    : params.density === 'average' ? 1.0
    : 1.3;

  const adjustedScore = baseScore * densityMultiplier * params.afissMultiplier;
  const excavatorHours = adjustedScore * 16.0;
  const grubbingHours = adjustedScore * 8.0;

  return {
    baseClearingScore: baseScore,
    adjustedClearingScore: adjustedScore,
    excavatorHours,
    grubbingHours,
    totalWorkHours: excavatorHours + grubbingHours,
    excavatorDays: Math.ceil(excavatorHours / 8),
    grubbingDays: Math.ceil(grubbingHours / 8),
    totalDays: Math.ceil((excavatorHours + grubbingHours) / 8)
  };
}
```

---

## 🟠 P1: Property Intelligence System (Weeks 4-5)

### Overview
Port the **PropertyIntelligenceService** from iOS to provide automated property analysis, risk assessment, and pricing recommendations.

### Files to Port
- `iosSourceFiles/PropertyIntelligenceService.swift` (682 lines)
- `iosSourceFiles/RegridService.swift` (Regrid API integration)

### Frontend Components Needed

#### 1. Property Search & Analysis
**Component:** `src/components/Properties/PropertySearch.tsx`

```typescript
// User enters address → Search Regrid API → Display property card
interface PropertySearchProps {
  onPropertySelected: (property: PropertyBoundary) => void;
}

// Features:
// - Address autocomplete (Google Maps API)
// - Search by coordinates
// - Display property preview card
// - "Analyze Property" button
```

**Component:** `src/components/Properties/PropertyAnalysisView.tsx`

```typescript
// Display intelligence report with risk assessment
interface PropertyAnalysisView {
  propertyId: string;
  report: PropertyIntelligenceReport;
}

// Display sections:
// 1. Risk Level Badge (Low/Medium/High/Very High with colors)
// 2. Summary paragraph
// 3. Key Insights (categorized by type)
// 4. Warnings (critical items)
// 5. Recommendations (action items)
// 6. Opportunities (positive factors)
// 7. AFISS Multiplier suggestion
// 8. Confidence Score
```

#### 2. Property Boundary Visualization
**Component:** `src/components/Maps/PropertyBoundaryMap.tsx`

```typescript
// Show property parcel boundary on map
// - Fetch GeoJSON from Regrid
// - Render polygon overlay
// - Show lot size (acres/sqft)
// - Highlight easements if present
// - Draw work area polygons
```

### Backend Services Needed

#### 1. Regrid API Integration
**Service:** `src/lib/services/regridService.ts`

```typescript
// Port from RegridService.swift
export class RegridService {
  async searchProperty(address: string): Promise<PropertyBoundary>
  async fetchParcel(lat: number, lon: number): Promise<PropertyBoundary>
  async getParcelGeoJSON(parcelId: string): Promise<GeoJSON>
}

// Endpoints:
// - GET /api/v1/parcels.geojson?lat={lat}&lon={lon}
// - Requires: Regrid API key (stored in env vars)
```

#### 2. Property Intelligence Engine
**Service:** `src/lib/services/propertyIntelligenceService.ts`

```typescript
// Port from PropertyIntelligenceService.swift
export class PropertyIntelligenceService {
  analyzeProperty(property: PropertyBoundary): PropertyIntelligenceReport

  // Analysis modules:
  - analyzeAccess()        // Gate width, terrain, access roads
  - analyzeEnvironmental() // Wetlands, flood zones, protected species
  - analyzeLegalRestrictions() // HOA, historic property, tree ordinances
  - analyzeInfrastructure()    // Power lines, underground utilities
  - analyzeSafety()            // Hazards, confined space, traffic control
  - analyzeFinancial()         // Property value, owner type
  - analyzeEasements()         // Utility, conservation, access easements

  calculateRiskLevel(): RiskLevel
  generateSummary(): string
}
```

### Data Models Needed

```typescript
// Add to Convex schema
export interface PropertyBoundary {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;

  // Parcel data
  apn: string;
  lotSizeAcres: number;
  lotSizeSqFt: number;
  coordinates: GeoJSON;

  // Owner info
  ownerName: string;
  ownerType: string;
  mailingAddress: string;
  isAbsenteeOwner: boolean;

  // Assessment
  assessedValue: number;
  landValue: number;
  improvementValue: number;
  taxAmount: number;

  // Zoning
  zoning: string;
  zoningDescription: string;
  landUse: string;

  // Environmental
  floodZone: string;
  isInFloodplain: boolean;
  hasWetlands: boolean;
  wetlandAcres: number;

  // Access factors
  hasNarrowGate: boolean;
  gateWidth: number;
  hasSoftGround: boolean;
  averageSlope: number;

  // Infrastructure
  hasPowerLines: boolean;
  powerLineProximity: string;
  hasUndergroundUtilities: boolean;
  proximityToBuildings: number;

  // AFISS calculations
  suggestedAFISSMultiplier: number;
  dataQualityScore: number;
}

export interface PropertyIntelligenceReport {
  propertyId: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'veryHigh';
  keyInsights: PropertyInsight[];
  recommendations: string[];
  warnings: string[];
  opportunities: string[];
  estimatedComplexity: number; // AFISS multiplier
  confidenceScore: number;
  generatedAt: Date;
}

export interface PropertyInsight {
  category: 'access' | 'environmental' | 'legal' | 'infrastructure' | 'safety' | 'financial' | 'operational';
  title: string;
  description: string;
  impact: 'positive' | 'neutral' | 'concern' | 'critical';
  actionable: boolean;
}
```

### User Flow

```
1. Lead Creation → Enter property address
2. Search Regrid API → Fetch parcel data
3. Auto-populate property details
4. Generate intelligence report
5. Display risk assessment & recommendations
6. AFISS factors auto-suggested based on report
7. User reviews and adjusts factors
8. Proceed to pricing calculator with pre-filled data
```

### Value Proposition
- **Automatic risk assessment** - Know before you quote
- **AFISS suggestions** - Data-driven complexity factors
- **Legal compliance** - Identify permits/restrictions upfront
- **Professional credibility** - Show you did your homework
- **Time savings** - 5 minutes vs 30 minutes of manual research

---

## 🟡 P2: Advanced Map Features (Weeks 6-8)

### Overview
Port mapping services from iOS to enable territory analysis, route optimization, and work area visualization.

### Files to Port
- `iosSourceFiles/MapService.swift` - Territory analysis and distance calculations
- `iosSourceFiles/PolygonDrawingService.swift` - Draw work areas on map
- `iosSourceFiles/HeatMapService.swift` - Revenue density visualization
- `iosSourceFiles/RouteOptimizationService.swift` - Multi-stop route planning
- `iosSourceFiles/DirectionsService.swift` - Apple Maps integration

### Frontend Components Needed

#### 1. Territory Analysis Dashboard
**Component:** `src/components/Maps/TerritoryDashboard.tsx`

```typescript
// Features:
// - Display organization HQ as center point
// - Draw drive time isochrones (30 min, 60 min, 120 min circles)
// - Plot all customer locations
// - Color-code by project status
// - Show revenue by territory zone
```

**Component:** `src/components/Maps/DriveTimeCalculator.tsx`

```typescript
// Input: Property address
// Calculate:
// - Straight-line distance from HQ
// - Real driving distance (Google Maps API)
// - Drive time in traffic
// - Transport hours for pricing (one-way × 2 × 0.5)
```

#### 2. Polygon Drawing Tool
**Component:** `src/components/Maps/PolygonDrawTool.tsx`

```typescript
// Port PolygonDrawingService functionality
// Features:
// - Click to add points
// - Close polygon (minimum 3 points)
// - Calculate area using Shoelace formula
// - Display acreage in real-time
// - Save polygon with name
// - Multiple polygons per property
// - Use for mulching/clearing area calculation
```

**Component:** `src/components/Maps/WorkAreaManager.tsx`

```typescript
// Manage multiple drawn areas per project
interface DrawnPolygon {
  id: string;
  name: string;
  points: Array<{lat: number; lng: number}>;
  area: number; // square meters
  acreage: number;
  color: string;
  serviceType: 'mulching' | 'clearing' | 'other';
}

// Features:
// - List all drawn areas
// - Edit/delete areas
// - Export to proposal
// - Visualize on map with different colors per service type
```

#### 3. Route Optimization
**Component:** `src/components/Schedule/RouteOptimizer.tsx`

```typescript
// Input: Multiple job sites for a day
// Output: Optimized route order
// Algorithm: Nearest-neighbor TSP heuristic
// Display:
// - Optimized order
// - Total driving distance
// - Total driving time
// - Map with route lines
// - Time savings vs. unoptimized
```

### Backend Services Needed

#### 1. Map Service
**Service:** `src/lib/services/mapService.ts`

```typescript
// Port MapService.swift functionality
export class MapService {
  // Drive time isochrones
  calculateDriveTimeCircles(
    origin: {lat: number; lng: number},
    radiusMinutes: number[]
  ): Circle[]

  // Distance calculations
  straightLineDistance(from: Coords, to: Coords): number
  drivingDistance(from: Coords, to: Coords): Promise<number>
  driveTime(from: Coords, to: Coords): Promise<number>

  // Territory analysis
  calculateCentroid(coordinates: Coords[]): Coords
  calculateBoundingBox(coordinates: Coords[]): BoundingBox

  // Route optimization
  optimizeRoute(origin: Coords, stops: Coords[]): number[] // Returns optimized order
  calculateRouteDistance(origin: Coords, stops: Coords[], order: number[]): number
}
```

#### 2. Polygon Drawing Service
**Service:** `src/lib/services/polygonService.ts`

```typescript
// Port PolygonDrawingService.swift
export class PolygonService {
  calculateArea(points: Coords[]): number // Square meters using Shoelace formula
  convertToAcres(sqMeters: number): number
  validatePolygon(points: Coords[]): boolean
  simplifyPolygon(points: Coords[], tolerance: number): Coords[]

  // GeoJSON conversion
  toGeoJSON(polygon: DrawnPolygon): GeoJSON
  fromGeoJSON(geojson: GeoJSON): DrawnPolygon
}
```

### Data Models Needed

```typescript
// Add to Convex schema
export interface DrawnArea {
  id: string;
  projectId: string;
  name: string;
  coordinates: Array<{lat: number; lng: number}>;
  area: number; // square meters
  acreage: number;
  color: string;
  serviceType: 'mulching' | 'clearing' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteOptimization {
  id: string;
  date: Date;
  origin: {lat: number; lng: number};
  stops: Array<{
    projectId: string;
    address: string;
    coordinates: {lat: number; lng: number};
    estimatedDuration: number; // minutes on-site
  }>;
  optimizedOrder: number[];
  totalDistance: number; // miles
  totalDriveTime: number; // minutes
  createdAt: Date;
}
```

### Integration Points

```typescript
// 1. Property search → Auto-calculate drive time from HQ
// 2. Mulching calculator → Draw work area, auto-populate acreage
// 3. Daily schedule → Optimize route for crew
// 4. Territory analysis → Revenue heatmap by zip code
```

---

## 🟢 P3: Analytics & Optimization (Weeks 9-10)

### Overview
Port analytics and self-learning systems from iOS to improve pricing accuracy and business intelligence.

### Files to Port
- `iosSourceFiles/AdaptiveProductionRateService.swift` - Self-learning production rates
- `iosSourceFiles/PricingEngine.swift` - Centralized pricing with scaling

### Frontend Components Needed

#### 1. Adaptive Rate Dashboard
**Component:** `src/components/Analytics/AdaptiveRateDashboard.tsx`

```typescript
// Display for each loadout:
interface AdaptiveRateDisplay {
  loadoutName: string;
  defaultRate: number; // PpH
  adaptiveRate: number; // Calculated from completion data
  confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient';
  dataPoints: number; // How many completed projects
  standardDeviation: number;
  lastCalculated: Date;
}

// Features:
// - Toggle adaptive rates on/off per loadout
// - View historical performance graph
// - See outliers that were trimmed
// - Confidence indicators
// - "Recalculate" button
```

#### 2. Project Completion Report
**Component:** `src/components/WorkOrders/CompletionReportForm.tsx`

```typescript
// When work order completes, collect actual performance data
interface CompletionReportForm {
  projectId: string;
  completedDate: Date;

  // Per loadout used:
  loadouts: Array<{
    loadoutId: string;
    actualHours: number;
    actualTreeShopScore: number; // Work completed
    actualPpH: number; // Auto-calculated

    // Conditions that affected performance
    weatherImpact: number; // -20% to +20%
    crewExperience: 'trainee' | 'standard' | 'expert';
    equipmentIssues: boolean;
    siteComplexity: number; // Actual vs estimated AFISS
  }>;

  // Notes
  notes: string;
  lessonsLearned: string;
}
```

### Backend Services Needed

#### 1. Adaptive Production Rate Engine
**Service:** `src/lib/services/adaptiveRateService.ts`

```typescript
// Port AdaptiveProductionRateService.swift
export class AdaptiveRateService {
  // Configuration (from Organization settings)
  config = {
    lookbackDays: 90,          // How far back to look
    minimumDataPoints: 10,     // Minimum projects before going adaptive
    outlierTrimPercent: 0.10,  // Trim top/bottom 10%
    confidenceThreshold: 0.15  // CV > 15% = low confidence
  };

  // Calculate adaptive rate for a loadout
  calculateAdaptiveRate(
    loadout: Loadout,
    completionReports: CompletionReport[]
  ): AdaptiveRateResult

  // Update loadouts automatically when project completes
  async updateLoadoutsFromReport(
    report: CompletionReport
  ): Promise<void>

  // Manual refresh for all loadouts
  async updateAllLoadouts(
    organizationId: string
  ): Promise<void>
}

interface AdaptiveRateResult {
  adaptiveRate: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient';
  dataPoints: number;
  rawDataPoints: number; // Before trimming
  standardDeviation: number;
  coefficientOfVariation: number;
  isUsingDefaults: boolean;
  calculatedAt: Date;
}
```

#### 2. Statistical Analysis Service
**Service:** `src/lib/services/statisticsService.ts`

```typescript
// Helper functions for adaptive rate calculations
export class StatisticsService {
  calculateMean(values: number[]): number
  calculateStandardDeviation(values: number[], mean: number): number
  calculateCoefficientOfVariation(stdev: number, mean: number): number
  trimOutliers(values: number[], trimPercent: number): number[]
  determineConfidence(dataPoints: number, cv: number): string
}
```

### Data Models Needed

```typescript
// Add to Convex schema
export interface ProjectCompletionReport {
  id: string;
  projectId: string;
  organizationId: string;
  completedDate: Date;

  // Performance data per loadout
  loadoutPerformance: Array<{
    loadoutId: string;
    serviceType: 'mulching' | 'stumpGrinding' | 'clearing' | 'treeRemoval' | 'trimming';

    // Estimated vs Actual
    estimatedHours: number;
    actualHours: number;
    estimatedTreeShopScore: number;
    actualTreeShopScore: number;

    // Production rate
    estimatedPpH: number;
    actualPpH: number;
    variance: number; // Percentage difference

    // Conditions
    weatherImpact: number;
    crewExperience: string;
    equipmentIssues: boolean;
    siteComplexity: number;
  }>;

  // Financial performance
  estimatedRevenue: number;
  actualRevenue: number;
  estimatedCost: number;
  actualCost: number;

  // Notes
  notes: string;
  lessonsLearned: string;

  createdAt: Date;
}

export interface LoadoutAdaptiveSettings {
  loadoutId: string;
  adaptiveRateEnabled: boolean;
  currentAdaptiveRate: number | null;
  lastCalculation: Date | null;
  confidenceLevel: string | null;
  dataPoints: number;
}
```

### Algorithm: Adaptive Production Rate

**Step-by-step process (port from Swift):**

1. **Fetch completion reports** for loadout (last 90 days)
2. **Check minimum threshold** (10+ projects required)
3. **Sort by actualPpH**
4. **Trim outliers** (remove top/bottom 10%)
5. **Calculate mean** (this becomes adaptive rate)
6. **Calculate standard deviation**
7. **Calculate coefficient of variation** (CV = stdev / mean)
8. **Determine confidence level:**
   - High: 20+ projects, CV < 10%
   - Medium: 10-19 projects, CV < 15%
   - Low: 10-14 projects or CV > 15%
   - Insufficient: < 10 projects (use default rate)
9. **Update loadout** with new adaptive rate
10. **Display confidence indicator** in UI

### User Flow

```
1. Complete work order → Fill out completion report
2. Enter actual hours and work completed
3. System calculates actualPpH
4. AdaptiveRateService updates loadout rates (background)
5. Next quote uses adaptive rate (if confidence is acceptable)
6. User sees confidence indicator in calculator
7. Analytics dashboard shows performance trends
```

### Value Proposition
- **Self-improving accuracy** - Pricing gets better with each job
- **Data-driven decisions** - Not guessing production rates
- **Competitive advantage** - Know your true capabilities
- **Identify training needs** - See which crews underperform
- **Equipment comparisons** - Which mulcher is actually faster?

---

## 🔵 P4: Advanced Services (Weeks 11-12)

### Quick Wins from iOS Source Files

#### 1. GPS Tracking & Geofencing
**Files:** `GPSTrackingService.swift`, `GeofenceService.swift`

- Track crew arrival/departure at job sites
- Auto-start timers when entering geofence
- Verify work was performed at correct location
- Mileage tracking for equipment

**Frontend:** Time clock with GPS verification
**Backend:** Store GPS tracks, calculate on-site hours

---

#### 2. Offline Time Tracking
**File:** `OfflineTimerService.swift`

- Crews can track time without internet
- Sync when connection restored
- Prevent data loss in rural areas

**Frontend:** Offline-capable timer component
**Backend:** Queue system for offline sync

---

#### 3. Heat Map Visualization
**File:** `HeatMapService.swift`

- Revenue density by zip code
- Customer concentration visualization
- Identify underserved territories
- Marketing ROI by area

**Frontend:** Interactive heat map component
**Backend:** Aggregate revenue by location

---

#### 4. Calendar Integration
**File:** `CalendarService.swift`

- Sync work orders to device calendar
- Add job sites to Maps
- Crew schedule coordination

**Frontend:** Calendar export buttons
**Backend:** Generate iCal files

---

#### 5. Reminder Service
**File:** `ReminderService.swift`

- Follow-up reminders for proposals
- Seasonal service reminders
- Equipment maintenance alerts
- Customer birthday reminders

**Frontend:** Notification preferences
**Backend:** Scheduled jobs system

---

#### 6. Site Plan Exporter
**File:** `SitePlanExporter.swift`

- Export property boundaries to PDF
- Include work areas, hazards, access points
- Share with crew before job
- Customer approval document

**Frontend:** "Export Site Plan" button
**Backend:** PDF generation with map overlay

---

## 📋 Implementation Checklist

### Week 1-3: P0 Calculators
- [ ] Port tree removal formulas to `formulas.ts`
- [ ] Port tree trimming formulas to `formulas.ts`
- [ ] Port hydraulic GPM formula to `formulas.ts`
- [ ] Build Stump Grinding Calculator component
- [ ] Build Tree Removal Calculator component
- [ ] Build Tree Trimming Calculator component
- [ ] Test all formulas against iOS output
- [ ] Integrate with Proposal Builder
- [ ] Update AFISS picker to 80+ factors (expand from 50)

### Week 4-5: P1 Property Intelligence
- [ ] Set up Regrid API account
- [ ] Add Regrid API key to env vars
- [ ] Create `regridService.ts`
- [ ] Create `propertyIntelligenceService.ts`
- [ ] Add PropertyBoundary schema to Convex
- [ ] Add PropertyIntelligenceReport schema to Convex
- [ ] Build PropertySearch component
- [ ] Build PropertyAnalysisView component
- [ ] Build PropertyBoundaryMap component
- [ ] Integrate with Lead creation flow
- [ ] Test with real property addresses

### Week 6-8: P2 Map Features
- [ ] Create `mapService.ts`
- [ ] Create `polygonService.ts`
- [ ] Add DrawnArea schema to Convex
- [ ] Add RouteOptimization schema to Convex
- [ ] Build PolygonDrawTool component
- [ ] Build WorkAreaManager component
- [ ] Build TerritoryDashboard component
- [ ] Build RouteOptimizer component
- [ ] Integrate polygon drawing with calculators
- [ ] Test drive time calculations
- [ ] Test route optimization algorithm

### Week 9-10: P3 Analytics
- [ ] Create `adaptiveRateService.ts`
- [ ] Create `statisticsService.ts`
- [ ] Add ProjectCompletionReport schema to Convex
- [ ] Add LoadoutAdaptiveSettings schema to Convex
- [ ] Build CompletionReportForm component
- [ ] Build AdaptiveRateDashboard component
- [ ] Implement outlier trimming algorithm
- [ ] Implement confidence calculation
- [ ] Test adaptive rate calculations
- [ ] Add Organization settings for adaptive rates
- [ ] Create background job to update rates daily

### Week 11-12: P4 Advanced Features
- [ ] Evaluate priority for GPS, Heat Map, Calendar, etc.
- [ ] Implement 2-3 highest-value features
- [ ] Polish and bug fixes
- [ ] Cross-platform testing
- [ ] Documentation updates

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Test pricing formulas
describe('Tree Removal Formulas', () => {
  test('calculateTreeScore', () => {
    const score = calculateTreeScore(60, 24, 15);
    expect(score).toBe(54000); // 60 × (2)² × (15)²
  });
});

// Test adaptive rate algorithm
describe('Adaptive Rate Service', () => {
  test('trimOutliers removes top and bottom 10%', () => {
    // Test implementation
  });
});
```

### Integration Tests
- Test calculator → proposal flow
- Test property search → AFISS suggestion flow
- Test completion report → adaptive rate update flow
- Test polygon drawing → calculator integration

### Cross-Platform Tests
- Run same inputs on iOS and Web
- Compare calculated outputs
- Document any discrepancies
- Fix to match iOS (source of truth)

---

## 📊 Success Metrics

### Feature Parity Metrics
- [ ] 100% of iOS pricing formulas ported
- [ ] 100% of iOS calculators available in web
- [ ] 95%+ calculation accuracy (web matches iOS)
- [ ] < 5% formula drift over time

### Adoption Metrics
- [ ] 80%+ of proposals use property intelligence
- [ ] 50%+ of loadouts use adaptive rates
- [ ] 70%+ of projects use polygon drawing
- [ ] 60%+ of daily schedules use route optimization

### Business Impact Metrics
- [ ] 20% reduction in quote preparation time
- [ ] 15% improvement in pricing accuracy
- [ ] 10% increase in close rate (better site analysis)
- [ ] 25% reduction in job overruns (better estimates)

---

## 🎯 Quick Wins (Do These First)

### This Week
1. **Stump Grinding Calculator** - 2 days
2. **Tree Removal Formulas** - 1 day
3. **Tree Removal Calculator** - 2 days

### Next Week
1. **Tree Trimming Calculator** - 1 day
2. **Regrid API Integration** - 2 days
3. **Property Intelligence Engine** - 2 days

### Following Week
1. **Property Search UI** - 1 day
2. **Polygon Drawing Tool** - 3 days
3. **Integration Testing** - 1 day

---

## 💡 Architecture Insights from iOS

### What iOS Does Well (Copy This)
1. **Centralized PricingEngine** - All calculations in one place
2. **SwiftData persistence** - Offline-first architecture
3. **Real-time calculations** - Update as user types
4. **Loadout scaling** - Add extra equipment/crew on the fly
5. **Service modularity** - Each service is independent
6. **Formula versioning** - Can track pricing changes over time

### Web App Advantages (Leverage These)
1. **Instant updates** - No app store approval
2. **Collaborative** - Multiple users, real-time sync
3. **Desktop power** - Bigger screens, more data
4. **Third-party integrations** - Easier API connections
5. **Analytics dashboards** - More powerful visualizations
6. **Cross-platform** - Works on any device with browser

### Recommended Architecture Pattern

```
┌─────────────────────────────────────────────────┐
│  Frontend (React/Astro)                         │
│  - Form inputs (calculators)                    │
│  - Real-time validation                         │
│  - Display results                              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  API Layer (Convex Actions)                     │
│  - Validate inputs                              │
│  - Call pricing engine                          │
│  - Store results                                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Business Logic (TypeScript Services)           │
│  - formulas.ts (pricing calculations)           │
│  - adaptiveRateService.ts                       │
│  - propertyIntelligenceService.ts               │
│  - mapService.ts                                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Database (Convex)                              │
│  - Projects, Proposals, Line Items              │
│  - Completion Reports                           │
│  - Property Intelligence                        │
│  - Adaptive Rate History                        │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Step 1: Review This Document
- [ ] Read through entire roadmap
- [ ] Prioritize features for your business
- [ ] Adjust timeline based on team size

### Step 2: Set Up Development Environment
- [ ] Clone iOS source files reference
- [ ] Review iOS implementation before coding web version
- [ ] Set up test data for each calculator

### Step 3: Start with P0 Calculators
- [ ] Port formulas first (no UI)
- [ ] Write unit tests for formulas
- [ ] Build UI components
- [ ] Test integration with Proposal Builder

### Step 4: Deploy and Iterate
- [ ] Deploy to staging
- [ ] Get user feedback
- [ ] Iterate based on usage
- [ ] Move to P1, P2, P3, P4

---

## 📚 Resources

### Reference Files
- `iosSourceFiles/PricingFormulas.swift` - Complete formula library
- `iosSourceFiles/PricingEngine.swift` - Centralized pricing calculations
- `iosSourceFiles/PropertyIntelligenceService.swift` - Property analysis
- `iosSourceFiles/AdaptiveProductionRateService.swift` - Self-learning rates
- `iosSourceFiles/MapService.swift` - Territory and route tools
- `iosSourceFiles/PolygonDrawingService.swift` - Area calculation

### Documentation
- `/Users/lockin/.claude/CLAUDE.md` - Complete pricing system spec
- `WEBAPP_CALCULATOR_TODO.md` - Existing calculator checklist
- iOS Architecture docs - SwiftData patterns and service design

### External APIs
- **Regrid API** - Property parcel data (https://regrid.com)
- **Google Maps API** - Geocoding and directions
- **Apple MapKit** - iOS map integration (reference)

---

**Last Updated:** 2025-01-10
**Next Review:** Weekly during implementation
**Maintained By:** Development Team
**Version:** 1.0
