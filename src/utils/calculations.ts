/**
 * Scientific and Engineering Calculations for FreshAir-AI
 * - CADR (Clean Air Delivery Rate) per AHAM / EPA standards
 * - Transport GHG emissions avoidance per IPCC / CEA India guidelines
 */

export interface CadrCalculationResult {
  areaSqFt: number;
  volumeCuFt: number;
  volumeM3: number;
  recommendedCadrM3h: number;
  recommendedCadrCfm: number;
}

/**
 * Calculates required HEPA Clean Air Delivery Rate (CADR) for a given room dimension and target Air Changes per Hour (ACH).
 * Reference standard: AHAM AC-1 (Association of Home Appliance Manufacturers) & US EPA indoor air guidelines.
 * For wildfire and urban winter smog reduction, EPA and Harvard T.H. Chan School of Public Health recommend 4 to 6 ACH.
 *
 * 1 cubic foot = 0.0283168 cubic meters
 * 1 CFM (Cubic Feet per Minute) = 1.699 m³/h
 */
export function calculateHepaCadr(
  lengthFt: number,
  widthFt: number,
  ceilingHeightFt: number,
  targetAch: number,
): CadrCalculationResult {
  const safeLength = Math.max(1, Number.isFinite(lengthFt) ? lengthFt : 1);
  const safeWidth = Math.max(1, Number.isFinite(widthFt) ? widthFt : 1);
  const safeHeight = Math.max(6, Number.isFinite(ceilingHeightFt) ? ceilingHeightFt : 8);
  const safeAch = Math.max(1, Number.isFinite(targetAch) ? targetAch : 4);

  const areaSqFt = Math.max(20, safeLength * safeWidth);
  const volumeCuFt = areaSqFt * Math.max(7, safeHeight);
  const volumeM3 = volumeCuFt * 0.0283168;
  const recommendedCadrM3h = Math.round(volumeM3 * safeAch);
  const recommendedCadrCfm = Math.round(recommendedCadrM3h / 1.699);

  return {
    areaSqFt: Math.round(areaSqFt),
    volumeCuFt: Math.round(volumeCuFt),
    volumeM3: Number(volumeM3.toFixed(1)),
    recommendedCadrM3h,
    recommendedCadrCfm,
  };
}

/**
 * Calculates estimated kilograms of CO2 avoided by choosing a cleaner transport mode over a baseline mode.
 *
 * Formula:
 * Delta grams CO2/km = max(0, baseline_g/km - alternative_g/km)
 * Total avoided kg CO2 = (distance_km * Delta grams CO2/km) / 1000
 *
 * Reference: Central Electricity Authority (CEA) India CO2 baseline database & IPCC Tier 1 transport emissions.
 */
export function calculateTripSavingsKg(
  distanceKm: number,
  baselineGramsCo2PerKm: number,
  alternativeGramsCo2PerKm: number,
): number {
  const safeDistance = Math.max(0, Number.isFinite(distanceKm) ? distanceKm : 0);
  const safeBaseline = Math.max(0, Number.isFinite(baselineGramsCo2PerKm) ? baselineGramsCo2PerKm : 0);
  const safeAlternative = Math.max(0, Number.isFinite(alternativeGramsCo2PerKm) ? alternativeGramsCo2PerKm : 0);

  const deltaGramsPerKm = Math.max(0, safeBaseline - safeAlternative);
  return Number(((safeDistance * deltaGramsPerKm) / 1000).toFixed(2));
}
