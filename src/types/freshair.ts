export type AppTab =
  | 'dashboard'
  | 'assistant'
  | 'planner'
  | 'indoor'
  | 'sustainability'
  | 'profile';

export type LanguageCode = 'en' | 'hi';

export interface LocationInfo {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface AirQualityMetrics {
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
  co: number | null;
  dust: number | null;
  uvIndex: number | null;
  measuredAt: string | null;
  source: string;
  status: 'ok' | 'partial' | 'unavailable';
  errorMessage?: string;
}

export type CpcbAqiCategoryLevel =
  | 'good'
  | 'satisfactory'
  | 'moderate'
  | 'poor'
  | 'very_poor'
  | 'severe'
  | 'insufficient_data';

export interface CpcbSubIndexItem {
  pollutant: string;
  name: string;
  concentration: number;
  unit: string;
  subIndex: number;
}

export interface CpcbAqiResult {
  aqi: number | null;
  category: {
    level: CpcbAqiCategoryLevel;
    label: string;
    labelHi: string;
    description: string;
    descriptionHi: string;
    textColor: string;
    surfaceColor: string;
    barColor: string;
    borderColor: string;
  };
  dominantPollutant: {
    code: string;
    name: string;
    subIndex: number;
  } | null;
  subIndices: Record<string, CpcbSubIndexItem>;
  isComplete: boolean;
  monitoredCount: number;
  hasRequiredParticulate: boolean;
  missingRequirements: string[];
}

export interface WeatherMetrics {
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  surfacePressureHpa: number | null;
  weatherCode: number | null;
  conditionLabel: string;
  measuredAt: string | null;
  source: string;
  status: 'ok' | 'unavailable';
  errorMessage?: string;
}

export interface HourlyTrendPoint {
  time: string;
  label: string;
  hour: number;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
}

export interface EnvironmentalSnapshot {
  location: LocationInfo;
  airQuality: AirQualityMetrics;
  weather: WeatherMetrics;
  hourlyTrend: HourlyTrendPoint[];
  fetchedAt: string;
  fromCache?: boolean;
}

export interface UserProfile {
  name: string;
  language: LanguageCode;
  temperatureUnit: 'C' | 'F';
  defaultLocation: LocationInfo;
  householdGroup: 'general' | 'children' | 'seniors' | 'mixed_family';
  respiratorySensitivity: 'none' | 'mild' | 'high';
  commuteMode: 'car' | 'two_wheeler' | 'public_transit' | 'cycle_walk' | 'remote';
  dailyCommuteKm: number;
  hasAirPurifier: boolean;
  cookingFuel: 'lpg_png' | 'induction' | 'mixed_solid';
}

export interface AiRecommendationItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  actionSteps: string[];
}

export interface DashboardAiResponse {
  briefing: string;
  recommendations: AiRecommendationItem[];
  disclaimer: string;
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  error?: boolean;
}

export interface DailyPeriodWindow {
  period: 'morning' | 'afternoon' | 'evening';
  timeRange: string;
  avgAqi: number | null;
  minAqi: number | null;
  maxAqi: number | null;
  avgPm25: number | null;
  pointCount: number;
}

export interface DailyPlanSlot {
  period: 'morning' | 'afternoon' | 'evening';
  title: string;
  outdoorActivity: string;
  commuteSuggestion: string;
  familyTip: string;
}

export interface DailyPlanAiResponse {
  daySummary: string;
  slots: DailyPlanSlot[];
  disclaimer: string;
  generatedAt: string;
}

export interface IndoorAdviceAiResponse {
  summary: string;
  priorityActions: string[];
  ventilationTiming: string;
  disclaimer: string;
  generatedAt: string;
}

export interface SavedRecommendation {
  id: string;
  title: string;
  body: string;
  category: 'dashboard' | 'assistant' | 'planner' | 'indoor';
  locationName: string;
  aqiAtSave: number | null;
  language: LanguageCode;
  savedAt: string;
}

export interface SustainabilityLogEntry {
  id: string;
  dateISO: string;
  actionId: string;
  label: string;
  category: 'transport' | 'energy' | 'household';
  co2SavedKg: number;
  distanceKm?: number;
  assumptionNote: string;
}
