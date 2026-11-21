import type { DailyPeriodWindow, HourlyTrendPoint, LanguageCode } from '../types/freshair';

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
