import type {
  AirQualityMetrics,
  CpcbAqiCategoryLevel,
  CpcbAqiResult,
  CpcbSubIndexItem,
  DailyPeriodWindow,
  HourlyTrendPoint,
  LanguageCode,
} from '../types/freshair';

export interface AqiCategoryMeta {
  level: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous' | 'unavailable';
  label: string;
  labelHi: string;
  shortGuidance: string;
  shortGuidanceHi: string;
  textColor: string;
  surfaceColor: string;
  barColor: string;
  borderColor: string;
}

export interface CpcbCategoryMeta {
  level: CpcbAqiCategoryLevel;
  label: string;
  labelHi: string;
  description: string;
  descriptionHi: string;
  textColor: string;
  surfaceColor: string;
  barColor: string;
  borderColor: string;
}

export function getCpcbCategory(aqi: number | null): CpcbCategoryMeta {
  if (aqi === null || !Number.isFinite(aqi)) {
    return {
      level: 'insufficient_data',
      label: 'Insufficient Data',
      labelHi: 'अपर्याप्त डेटा',
      description: 'Official CPCB NAQI requires ≥3 monitored pollutants with at least one PM (PM2.5 or PM10).',
      descriptionHi: 'आधिकारिक CPCB NAQI के लिए कम से कम 3 प्रदूषक (PM2.5 या PM10 सहित) आवश्यक हैं।',
      textColor: 'text-[#526460]',
      surfaceColor: 'bg-[#F1F4F2]',
      barColor: '#94A3B8',
      borderColor: 'border-[#DCE3DF]',
    };
  }
  if (aqi <= 50) {
    return {
      level: 'good',
      label: 'Good',
      labelHi: 'अच्छा (Good)',
      description: 'Minimal health impact; air quality is considered clean and poses little risk.',
      descriptionHi: 'न्यूनतम स्वास्थ्य प्रभाव; वायु गुणवत्ता स्वच्छ और सुरक्षित है।',
      textColor: 'text-[#15803D]',
      surfaceColor: 'bg-[#ECFDF3]',
      barColor: '#16A34A',
      borderColor: 'border-[#BBF7D0]',
    };
  }
  if (aqi <= 100) {
    return {
      level: 'satisfactory',
      label: 'Satisfactory',
      labelHi: 'संतोषजनक (Satisfactory)',
      description: 'Minor breathing discomfort to sensitive individuals on prolonged exposure.',
      descriptionHi: 'संवेदनशील व्यक्तियों को सांस लेने में हल्की परेशानी हो सकती है।',
      textColor: 'text-[#4D7C0F]',
      surfaceColor: 'bg-[#F7FEE7]',
      barColor: '#65A30D',
      borderColor: 'border-[#D9F99D]',
    };
  }
  if (aqi <= 200) {
    return {
      level: 'moderate',
      label: 'Moderate',
      labelHi: 'मध्यम (Moderate)',
      description: 'Breathing discomfort to people with lungs, asthma and heart diseases.',
      descriptionHi: 'अस्थमा और हृदय रोगियों तथा बच्चों को सांस लेने में असुविधा हो सकती है।',
      textColor: 'text-[#A16207]',
      surfaceColor: 'bg-[#FEFCE8]',
      barColor: '#CA8A04',
      borderColor: 'border-[#FEF08A]',
    };
  }
  if (aqi <= 300) {
    return {
      level: 'poor',
      label: 'Poor',
      labelHi: 'खराब (Poor)',
      description: 'Breathing discomfort to most people on prolonged exposure.',
      descriptionHi: 'लंबे समय तक रहने पर अधिकांश लोगों को सांस लेने में तकलीफ हो सकती है।',
      textColor: 'text-[#C2410C]',
      surfaceColor: 'bg-[#FFF7ED]',
      barColor: '#EA580C',
      borderColor: 'border-[#FED7AA]',
    };
  }
  if (aqi <= 400) {
    return {
      level: 'very_poor',
      label: 'Very Poor',
      labelHi: 'बहुत खराब (Very Poor)',
      description: 'Respiratory illness on prolonged exposure; pronounced effect on vulnerable groups.',
      descriptionHi: 'लंबे समय तक संपर्क में रहने से श्वसन संबंधी बीमारी हो सकती है।',
      textColor: 'text-[#B91C1C]',
      surfaceColor: 'bg-[#FEF2F2]',
      barColor: '#DC2626',
      borderColor: 'border-[#FECACA]',
    };
  }
  return {
    level: 'severe',
    label: 'Severe',
    labelHi: 'गंभीर (Severe)',
    description: 'Affects healthy people and seriously impacts those with existing respiratory or cardiac conditions.',
    descriptionHi: 'स्वस्थ लोगों को भी प्रभावित करता है और बीमार व्यक्तियों पर गंभीर प्रभाव डालता है।',
    textColor: 'text-[#881337]',
    surfaceColor: 'bg-[#FFF1F2]',
    barColor: '#9F1239',
    borderColor: 'border-[#FECDD3]',
  };
}

/**
 * Official Indian CPCB NAQI pollutant breakpoint definition.
 * Reference: Central Pollution Control Board (CPCB), Ministry of Environment, Forest & Climate Change (MoEFCC), Govt. of India.
 * Formula: Ip = Ilo + [(Ihi - Ilo) / (Bhi - Blo)] * (Cp - Blo)
 */
interface CpcbBreakpoint {
  bLo: number;
  bHi: number;
  iLo: number;
  iHi: number;
}

const CPCB_BREAKPOINTS: Record<string, CpcbBreakpoint[]> = {
  pm25: [
    { bLo: 0, bHi: 30, iLo: 0, iHi: 50 },
    { bLo: 31, bHi: 60, iLo: 51, iHi: 100 },
    { bLo: 61, bHi: 90, iLo: 101, iHi: 200 },
    { bLo: 91, bHi: 120, iLo: 201, iHi: 300 },
    { bLo: 121, bHi: 250, iLo: 301, iHi: 400 },
    { bLo: 251, bHi: 380, iLo: 401, iHi: 500 },
  ],
  pm10: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 51, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 101, bHi: 250, iLo: 101, iHi: 200 },
    { bLo: 251, bHi: 350, iLo: 201, iHi: 300 },
    { bLo: 351, bHi: 430, iLo: 301, iHi: 400 },
    { bLo: 431, bHi: 500, iLo: 401, iHi: 500 },
  ],
  no2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 41, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 81, bHi: 180, iLo: 101, iHi: 200 },
    { bLo: 181, bHi: 280, iLo: 201, iHi: 300 },
    { bLo: 281, bHi: 400, iLo: 301, iHi: 400 },
    { bLo: 401, bHi: 500, iLo: 401, iHi: 500 },
  ],
  so2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 41, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 81, bHi: 380, iLo: 101, iHi: 200 },
    { bLo: 381, bHi: 800, iLo: 201, iHi: 300 },
    { bLo: 801, bHi: 1600, iLo: 301, iHi: 400 },
    { bLo: 1601, bHi: 2000, iLo: 401, iHi: 500 },
  ],
  co: [
    // Note: In mg/m3 per official CPCB table
    { bLo: 0.0, bHi: 1.0, iLo: 0, iHi: 50 },
    { bLo: 1.1, bHi: 2.0, iLo: 51, iHi: 100 },
    { bLo: 2.1, bHi: 10.0, iLo: 101, iHi: 200 },
    { bLo: 10.1, bHi: 17.0, iLo: 201, iHi: 300 },
    { bLo: 17.1, bHi: 34.0, iLo: 301, iHi: 400 },
    { bLo: 34.1, bHi: 50.0, iLo: 401, iHi: 500 },
  ],
  o3: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 51, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 101, bHi: 168, iLo: 101, iHi: 200 },
    { bLo: 169, bHi: 208, iLo: 201, iHi: 300 },
    { bLo: 209, bHi: 748, iLo: 301, iHi: 400 },
    { bLo: 749, bHi: 1000, iLo: 401, iHi: 500 },
  ],
};

export function calculateCpcbSubIndex(pollutant: string, concentration: number): number | null {
  if (!Number.isFinite(concentration) || concentration < 0) {
    return null;
  }
  const bps = CPCB_BREAKPOINTS[pollutant];
  if (!bps || bps.length === 0) {
    return null;
  }

  // Handle concentration below or equal to first breakpoint lower bound
  if (concentration <= bps[0].bLo) {
    return bps[0].iLo;
  }

  for (const bp of bps) {
    if (concentration >= bp.bLo && concentration <= bp.bHi) {
      const sub = bp.iLo + ((bp.iHi - bp.iLo) / (bp.bHi - bp.bLo)) * (concentration - bp.bLo);
      return Math.min(500, Math.max(0, Math.round(sub)));
    }
  }

  // If concentration exceeds highest breakpoint, extrapolate linearly with top bracket slope, capped at 500
  const top = bps[bps.length - 1];
  if (concentration > top.bHi) {
    const sub = top.iLo + ((top.iHi - top.iLo) / (top.bHi - top.bLo)) * (concentration - top.bLo);
    return Math.min(500, Math.max(401, Math.round(sub)));
  }

  return null;
}

export function calculateCpcbAqi(aq: AirQualityMetrics | null | undefined): CpcbAqiResult {
  const subIndices: Record<string, CpcbSubIndexItem> = {};

  if (!aq) {
    return {
      aqi: null,
      category: getCpcbCategory(null),
      dominantPollutant: null,
      subIndices: {},
      isComplete: false,
      monitoredCount: 0,
      hasRequiredParticulate: false,
      missingRequirements: ['No environmental data feed available.'],
    };
  }

  // PM2.5 (µg/m³)
  if (aq.pm25 !== null && Number.isFinite(aq.pm25)) {
    const sub = calculateCpcbSubIndex('pm25', aq.pm25);
    if (sub !== null) {
      subIndices.pm25 = {
        pollutant: 'pm25',
        name: 'PM2.5',
        concentration: aq.pm25,
        unit: 'µg/m³',
        subIndex: sub,
      };
    }
  }

  // PM10 (µg/m³)
  if (aq.pm10 !== null && Number.isFinite(aq.pm10)) {
    const sub = calculateCpcbSubIndex('pm10', aq.pm10);
    if (sub !== null) {
      subIndices.pm10 = {
        pollutant: 'pm10',
        name: 'PM10',
        concentration: aq.pm10,
        unit: 'µg/m³',
        subIndex: sub,
      };
    }
  }

  // NO2 (µg/m³)
  if (aq.no2 !== null && Number.isFinite(aq.no2)) {
    const sub = calculateCpcbSubIndex('no2', aq.no2);
    if (sub !== null) {
      subIndices.no2 = {
        pollutant: 'no2',
        name: 'NO2',
        concentration: aq.no2,
        unit: 'µg/m³',
        subIndex: sub,
      };
    }
  }

  // SO2 (µg/m³)
  if (aq.so2 !== null && Number.isFinite(aq.so2)) {
    const sub = calculateCpcbSubIndex('so2', aq.so2);
    if (sub !== null) {
      subIndices.so2 = {
        pollutant: 'so2',
        name: 'SO2',
        concentration: aq.so2,
        unit: 'µg/m³',
        subIndex: sub,
      };
    }
  }

  // CO: Open-Meteo provides µg/m3; convert to mg/m3 for CPCB breakpoint comparison
  if (aq.co !== null && Number.isFinite(aq.co)) {
    const coMg = aq.co / 1000;
    const sub = calculateCpcbSubIndex('co', coMg);
    if (sub !== null) {
      subIndices.co = {
        pollutant: 'co',
        name: 'CO',
        concentration: Number(coMg.toFixed(2)),
        unit: 'mg/m³',
        subIndex: sub,
      };
    }
  }

  // Ozone O3 (µg/m³)
  if (aq.o3 !== null && Number.isFinite(aq.o3)) {
    const sub = calculateCpcbSubIndex('o3', aq.o3);
    if (sub !== null) {
      subIndices.o3 = {
        pollutant: 'o3',
        name: 'Ozone (O3)',
        concentration: aq.o3,
        unit: 'µg/m³',
        subIndex: sub,
      };
    }
  }

  const monitoredCount = Object.keys(subIndices).length;
  const hasRequiredParticulate = 'pm25' in subIndices || 'pm10' in subIndices;

  const missingRequirements: string[] = [];
  if (monitoredCount < 3) {
    missingRequirements.push(
      `CPCB standard requires ≥3 monitored pollutants (${monitoredCount} currently measured: ${Object.keys(subIndices).map((k) => subIndices[k].name).join(', ') || 'none'}).`,
    );
  }
  if (!hasRequiredParticulate) {
    missingRequirements.push(
      'CPCB standard requires at least one particulate matter measurement (PM2.5 or PM10). Neither is currently available.',
    );
  }

  const isComplete = monitoredCount >= 3 && hasRequiredParticulate;

  if (!isComplete) {
    return {
      aqi: null,
      category: getCpcbCategory(null),
      dominantPollutant: null,
      subIndices,
      isComplete: false,
      monitoredCount,
      hasRequiredParticulate,
      missingRequirements,
    };
  }

  // Dominant pollutant has the highest sub-index
  let dominant: { code: string; name: string; subIndex: number } | null = null;
  let maxSubIndex = -1;

  for (const item of Object.values(subIndices)) {
    if (item.subIndex > maxSubIndex) {
      maxSubIndex = item.subIndex;
      dominant = { code: item.pollutant, name: item.name, subIndex: item.subIndex };
    }
  }

  const aqi = maxSubIndex >= 0 ? maxSubIndex : null;
  const category = getCpcbCategory(aqi);

  return {
    aqi,
    category,
    dominantPollutant: dominant,
    subIndices,
    isComplete: true,
    monitoredCount,
    hasRequiredParticulate,
    missingRequirements: [],
  };
}

export function getUsAqiCategory(aqi: number | null): AqiCategoryMeta {
  if (aqi === null || !Number.isFinite(aqi)) {
    return {
      level: 'unavailable',
      label: 'Unavailable',
      labelHi: 'उपलब्ध नहीं',
      shortGuidance: 'Live US AQI reading is currently unavailable for this location.',
      shortGuidanceHi: 'इस स्थान के लिए वर्तमान US AQI डेटा अभी उपलब्ध नहीं है।',
      textColor: 'text-[#526460]',
      surfaceColor: 'bg-[#F1F4F2]',
      barColor: '#94A3B8',
      borderColor: 'border-[#DCE3DF]',
    };
  }
  if (aqi <= 50) {
    return {
      level: 'good',
      label: 'Good',
      labelHi: 'अच्छी (Good)',
      shortGuidance: 'Air quality is satisfactory with minimal risk for outdoor activities.',
      shortGuidanceHi: 'वायु गुणवत्ता संतोषजनक है और बाहरी गतिविधियों के लिए अनुकूल है।',
      textColor: 'text-[#15803D]',
      surfaceColor: 'bg-[#ECFDF3]',
      barColor: '#16A34A',
      borderColor: 'border-[#BBF7D0]',
    };
  }
  if (aqi <= 100) {
    return {
      level: 'moderate',
      label: 'Moderate',
      labelHi: 'मध्यम (Moderate)',
      shortGuidance: 'Acceptable air quality; unusually sensitive individuals should limit prolonged exertion.',
      shortGuidanceHi: 'वायु गुणवत्ता स्वीकार्य है; संवेदनशील लोग लंबे बाहरी व्यायाम को सीमित रखें।',
      textColor: 'text-[#A16207]',
      surfaceColor: 'bg-[#FEFCE8]',
      barColor: '#CA8A04',
      borderColor: 'border-[#FEF08A]',
    };
  }
  if (aqi <= 150) {
    return {
      level: 'sensitive',
      label: 'Unhealthy for Sensitive Groups',
      labelHi: 'संवेदनशील समूहों के लिए अस्वस्थ',
      shortGuidance: 'Children, older adults, and people with respiratory sensitivities should reduce heavy outdoor effort.',
      shortGuidanceHi: 'बच्चों, बुजुर्गों और श्वसन संवेदनशील लोगों को बाहरी मेहनत कम करनी चाहिए।',
      textColor: 'text-[#C2410C]',
      surfaceColor: 'bg-[#FFF7ED]',
      barColor: '#EA580C',
      borderColor: 'border-[#FED7AA]',
    };
  }
  if (aqi <= 200) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy',
      labelHi: 'अस्वस्थ (Unhealthy)',
      shortGuidance: 'Everyone may begin to experience irritation; consider moving vigorous workouts indoors.',
      shortGuidanceHi: 'सभी लोगों को हल्की परेशानी हो सकती है; भारी व्यायाम घर के अंदर करें।',
      textColor: 'text-[#B91C1C]',
      surfaceColor: 'bg-[#FEF2F2]',
      barColor: '#DC2626',
      borderColor: 'border-[#FECACA]',
    };
  }
  if (aqi <= 300) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy',
      labelHi: 'अत्यंत अस्वस्थ',
      shortGuidance: 'Elevated smog risk; limit outdoor exposure, close windows, and use N95/FFP2 masks if commuting.',
      shortGuidanceHi: 'स्मॉग का उच्च जोखिम; बाहर निकलना सीमित करें, खिड़कियाँ बंद रखें और N95 मास्क पहनें।',
      textColor: 'text-[#7E22CE]',
      surfaceColor: 'bg-[#FAF5FF]',
      barColor: '#9333EA',
      borderColor: 'border-[#E9D5FF]',
    };
  }
  return {
    level: 'hazardous',
    label: 'Hazardous',
    labelHi: 'खतरनाक (Hazardous)',
    shortGuidance: 'Severe air pollution episode; avoid non-essential outdoor exposure and prioritize clean indoor air.',
    shortGuidanceHi: 'गंभीर वायु प्रदूषण की स्थिति; अनावश्यक रूप से बाहर न निकलें और घर के अंदर स्वच्छ हवा बनाए रखें।',
    textColor: 'text-[#881337]',
    surfaceColor: 'bg-[#FFF1F2]',
    barColor: '#9F1239',
    borderColor: 'border-[#FECDD3]',
  };
}

/**
 * Strictly distinguishes unavailable (null/undefined) from a genuine measured zero (0).
 */
export function formatReading(
  value: number | null | undefined,
  unit = '',
  decimals = 1,
  unavailableLabel = 'Unavailable',
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return unavailableLabel;
  }
  const formatted = decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatTemperature(
  tempC: number | null | undefined,
  unit: 'C' | 'F',
  unavailableLabel = 'Unavailable',
): string {
  if (tempC === null || tempC === undefined || !Number.isFinite(tempC)) {
    return unavailableLabel;
  }
  if (unit === 'F') {
    const f = (tempC * 9) / 5 + 32;
    return `${f.toFixed(1)} °F`;
  }
  return `${tempC.toFixed(1)} °C`;
}

export function formatWindDirection(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || !Number.isFinite(deg)) {
    return 'Unavailable';
  }
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return `${dirs[idx]} (${Math.round(deg)}°)`;
}

export function formatTimestamp(isoOrLocal: string | null | undefined): string {
  if (!isoOrLocal) return 'Unavailable';
  const parsed = new Date(isoOrLocal);
  if (Number.isNaN(parsed.getTime())) {
    return isoOrLocal.replace('T', ' ');
  }
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function computeDailyPeriodWindows(hourly: HourlyTrendPoint[]): DailyPeriodWindow[] {
  const definitions: Array<{
    period: 'morning' | 'afternoon' | 'evening';
    timeRange: string;
    startHour: number;
    endHour: number;
  }> = [
    { period: 'morning', timeRange: '06:00 – 11:00', startHour: 6, endHour: 11 },
    { period: 'afternoon', timeRange: '12:00 – 17:00', startHour: 12, endHour: 17 },
    { period: 'evening', timeRange: '18:00 – 22:00', startHour: 18, endHour: 22 },
  ];

  return definitions.map((def) => {
    const slice = hourly.filter((p) => p.hour >= def.startHour && p.hour <= def.endHour);
    const aqis = slice.map((p) => p.usAqi).filter((v): v is number => v !== null);
    const pm25s = slice.map((p) => p.pm25).filter((v): v is number => v !== null);

    return {
      period: def.period,
      timeRange: def.timeRange,
      avgAqi: aqis.length > 0 ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length) : null,
      minAqi: aqis.length > 0 ? Math.round(Math.min(...aqis)) : null,
      maxAqi: aqis.length > 0 ? Math.round(Math.max(...aqis)) : null,
      avgPm25:
        pm25s.length > 0
          ? Number((pm25s.reduce((a, b) => a + b, 0) / pm25s.length).toFixed(1))
          : null,
      pointCount: slice.length,
    };
  });
}

export function findCleanestWindow(hourly: HourlyTrendPoint[]): {
  label: string;
  usAqi: number;
  pm25: number | null;
} | null {
  const daytime = hourly.filter((p) => p.hour >= 6 && p.hour <= 21 && p.usAqi !== null);
  const pool = daytime.length > 0 ? daytime : hourly.filter((p) => p.usAqi !== null);
  if (pool.length === 0) return null;

  let best = pool[0];
  for (const pt of pool) {
    if ((pt.usAqi as number) < (best.usAqi as number)) {
      best = pt;
    }
  }
  return {
    label: best.label,
    usAqi: Math.round(best.usAqi as number),
    pm25: best.pm25,
  };
}

export function getPeriodLabel(period: 'morning' | 'afternoon' | 'evening', lang: LanguageCode): string {
  if (lang === 'hi') {
    if (period === 'morning') return 'सुबह (Morning)';
    if (period === 'afternoon') return 'दोपहर (Afternoon)';
    return 'शाम (Evening)';
  }
  if (period === 'morning') return 'Morning';
  if (period === 'afternoon') return 'Afternoon';
  return 'Evening';
}

export function getLocalDateIso(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
