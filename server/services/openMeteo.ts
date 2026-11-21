import type {
  AirQualityMetrics,
  EnvironmentalSnapshot,
  HourlyTrendPoint,
  LocationInfo,
  WeatherMetrics,
} from '../../src/types/freshair.ts';

interface CacheEntry {
  expiresAt: number;
  data: EnvironmentalSnapshot;
}

const CACHE_TTL_MS = 3 * 60 * 1000;
const envCache = new Map<string, CacheEntry>();

function toFiniteOrNull(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  return null;
}

export function mapWmoWeatherCode(code: number | null): string {
  if (code === null) return 'Unavailable';
  const lookup: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return lookup[code] ?? `Weather code ${code}`;
}

export async function searchLocations(query: string): Promise<LocationInfo[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', trimmed);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo Geocoding returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    results?: Array<{
      id?: number;
      name?: string;
      admin1?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    }>;
  };

  if (!Array.isArray(payload.results)) {
    return [];
  }

  return payload.results
    .filter(
      (item) =>
        typeof item.name === 'string' &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number',
    )
    .map((item) => ({
      id: `${item.id ?? `${item.latitude}_${item.longitude}`}`,
      name: item.name as string,
      region: item.admin1 ?? '',
      country: item.country ?? '',
      latitude: Number((item.latitude as number).toFixed(4)),
      longitude: Number((item.longitude as number).toFixed(4)),
      timezone: item.timezone,
    }));
}

interface OpenMeteoAirQualityRaw {
  timezone?: string;
  current?: {
    time?: string;
    us_aqi?: number | null;
    european_aqi?: number | null;
    pm10?: number | null;
    pm2_5?: number | null;
    carbon_monoxide?: number | null;
    nitrogen_dioxide?: number | null;
    sulphur_dioxide?: number | null;
    ozone?: number | null;
    dust?: number | null;
    uv_index?: number | null;
  };
  hourly?: {
    time?: string[];
    us_aqi?: Array<number | null>;
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    nitrogen_dioxide?: Array<number | null>;
    ozone?: Array<number | null>;
  };
}

interface OpenMeteoWeatherRaw {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number | null;
    relative_humidity_2m?: number | null;
    apparent_temperature?: number | null;
    weather_code?: number | null;
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    surface_pressure?: number | null;
  };
}

function buildHourlyWindow(
  hourly: OpenMeteoAirQualityRaw['hourly'],
  currentTimeIso: string | null,
): HourlyTrendPoint[] {
  if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) {
    return [];
  }

  // Prefer the 24 hours of today (00:00 to 23:00 local) so Morning/Afternoon/Evening planner
  // and 24-hour trend chart always cover the full diurnal cycle for the location.
  const targetDatePrefix = currentTimeIso ? currentTimeIso.slice(0, 10) : hourly.time[0].slice(0, 10);
  const matchingIndices: number[] = [];

  for (let i = 0; i < hourly.time.length; i++) {
    if (hourly.time[i]?.startsWith(targetDatePrefix)) {
      matchingIndices.push(i);
    }
  }

  const indices =
    matchingIndices.length >= 12
      ? matchingIndices.slice(0, 24)
      : hourly.time.slice(0, 24).map((_, idx) => idx);

  return indices.map((idx) => {
    const timeStr = hourly.time?.[idx] ?? '';
    const hourStr = timeStr.slice(11, 13);
    const parsedHour = Number.parseInt(hourStr, 10);
    const hour = Number.isFinite(parsedHour) ? parsedHour : 0;
    const label = `${String(hour).padStart(2, '0')}:00`;

    return {
      time: timeStr,
      label,
      hour,
      usAqi: toFiniteOrNull(hourly.us_aqi?.[idx]),
      pm25: toFiniteOrNull(hourly.pm2_5?.[idx]),
      pm10: toFiniteOrNull(hourly.pm10?.[idx]),
      no2: toFiniteOrNull(hourly.nitrogen_dioxide?.[idx]),
      o3: toFiniteOrNull(hourly.ozone?.[idx]),
    };
  });
}

export async function fetchEnvironmentalData(
  location: LocationInfo,
  forceRefresh = false,
): Promise<EnvironmentalSnapshot> {
  const cacheKey = `${location.latitude.toFixed(2)}:${location.longitude.toFixed(2)}`;
  const cached = envCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.data,
      location: { ...cached.data.location, ...location },
      fromCache: true,
    };
  }

  const aqUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  aqUrl.searchParams.set('latitude', String(location.latitude));
  aqUrl.searchParams.set('longitude', String(location.longitude));
  aqUrl.searchParams.set(
    'current',
    [
      'us_aqi',
      'european_aqi',
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'dust',
      'uv_index',
    ].join(','),
  );
  aqUrl.searchParams.set('hourly', ['us_aqi', 'pm2_5', 'pm10', 'nitrogen_dioxide', 'ozone'].join(','));
  aqUrl.searchParams.set('timezone', 'auto');
  aqUrl.searchParams.set('forecast_days', '2');

  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', String(location.latitude));
  weatherUrl.searchParams.set('longitude', String(location.longitude));
  weatherUrl.searchParams.set(
    'current',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'surface_pressure',
    ].join(','),
  );
  weatherUrl.searchParams.set('timezone', 'auto');

  const [aqSettled, weatherSettled] = await Promise.allSettled([
    fetch(aqUrl.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Open-Meteo Air Quality HTTP ${res.status}`);
      return (await res.json()) as OpenMeteoAirQualityRaw;
    }),
    fetch(weatherUrl.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Open-Meteo Weather HTTP ${res.status}`);
      return (await res.json()) as OpenMeteoWeatherRaw;
    }),
  ]);

  let resolvedTimezone = location.timezone;
  let airQuality: AirQualityMetrics;
  let hourlyTrend: HourlyTrendPoint[] = [];

  if (aqSettled.status === 'fulfilled') {
    const raw = aqSettled.value;
    if (raw.timezone) resolvedTimezone = raw.timezone;
    const c = raw.current;

    const usAqi = toFiniteOrNull(c?.us_aqi);
    const pm25 = toFiniteOrNull(c?.pm2_5);
    const pm10 = toFiniteOrNull(c?.pm10);

    const anyPresent = [
      usAqi,
      pm25,
      pm10,
      toFiniteOrNull(c?.european_aqi),
      toFiniteOrNull(c?.nitrogen_dioxide),
    ].some((v) => v !== null);

    airQuality = {
      usAqi,
      europeanAqi: toFiniteOrNull(c?.european_aqi),
      pm25,
      pm10,
      no2: toFiniteOrNull(c?.nitrogen_dioxide),
      o3: toFiniteOrNull(c?.ozone),
      so2: toFiniteOrNull(c?.sulphur_dioxide),
      co: toFiniteOrNull(c?.carbon_monoxide),
      dust: toFiniteOrNull(c?.dust),
      uvIndex: toFiniteOrNull(c?.uv_index),
      measuredAt: typeof c?.time === 'string' ? c.time : null,
      source: 'Open-Meteo Air Quality API',
      status: anyPresent ? (usAqi !== null && pm25 !== null ? 'ok' : 'partial') : 'unavailable',
    };

    hourlyTrend = buildHourlyWindow(raw.hourly, airQuality.measuredAt);
  } else {
    airQuality = {
      usAqi: null,
      europeanAqi: null,
      pm25: null,
      pm10: null,
      no2: null,
      o3: null,
      so2: null,
      co: null,
      dust: null,
      uvIndex: null,
      measuredAt: null,
      source: 'Open-Meteo Air Quality API',
      status: 'unavailable',
      errorMessage:
        aqSettled.reason instanceof Error
          ? aqSettled.reason.message
          : 'Unable to fetch air quality readings from Open-Meteo.',
    };
  }

  let weather: WeatherMetrics;
  if (weatherSettled.status === 'fulfilled') {
    const raw = weatherSettled.value;
    if (raw.timezone && !resolvedTimezone) resolvedTimezone = raw.timezone;
    const c = raw.current;
    const weatherCode = toFiniteOrNull(c?.weather_code);
    weather = {
      temperatureC: toFiniteOrNull(c?.temperature_2m),
      apparentTemperatureC: toFiniteOrNull(c?.apparent_temperature),
      humidityPercent: toFiniteOrNull(c?.relative_humidity_2m),
      windSpeedKmh: toFiniteOrNull(c?.wind_speed_10m),
      windDirectionDeg: toFiniteOrNull(c?.wind_direction_10m),
      surfacePressureHpa: toFiniteOrNull(c?.surface_pressure),
      weatherCode,
      conditionLabel: mapWmoWeatherCode(weatherCode),
      measuredAt: typeof c?.time === 'string' ? c.time : null,
      source: 'Open-Meteo Weather Forecast API',
      status: 'ok',
    };
  } else {
    weather = {
      temperatureC: null,
      apparentTemperatureC: null,
      humidityPercent: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
      surfacePressureHpa: null,
      weatherCode: null,
      conditionLabel: 'Unavailable',
      measuredAt: null,
      source: 'Open-Meteo Weather Forecast API',
      status: 'unavailable',
      errorMessage:
        weatherSettled.reason instanceof Error
          ? weatherSettled.reason.message
          : 'Unable to fetch weather conditions from Open-Meteo.',
    };
  }

  const snapshot: EnvironmentalSnapshot = {
    location: {
      ...location,
      timezone: resolvedTimezone,
    },
    airQuality,
    weather,
    hourlyTrend,
    fetchedAt: new Date().toISOString(),
    fromCache: false,
  };

  if (airQuality.status !== 'unavailable' || weather.status !== 'unavailable') {
    envCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: snapshot,
    });
  }

  return snapshot;
}
