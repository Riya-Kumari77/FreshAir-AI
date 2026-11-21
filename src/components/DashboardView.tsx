import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Sparkles,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  MessageSquare,
} from 'lucide-react';
import type {
  DashboardAiResponse,
  EnvironmentalSnapshot,
  LanguageCode,
  SavedRecommendation,
  UserProfile,
} from '../types/freshair';
import {
  calculateCpcbAqi,
  formatReading,
  formatTemperature,
  formatTimestamp,
  formatWindDirection,
  getUsAqiCategory,
} from '../utils/aqi';

interface DashboardViewProps {
  environment: EnvironmentalSnapshot | null;
  envLoading: boolean;
  envError: string | null;
  onRetryEnv: () => void;
  profile: UserProfile;
  language: LanguageCode;
  aiRecommendations: DashboardAiResponse | null;
  aiLoading: boolean;
  aiError: string | null;
  onGenerateAi: () => void;
  savedItems: SavedRecommendation[];
  onToggleSave: (item: Omit<SavedRecommendation, 'id' | 'savedAt'>) => void;
  onOpenAssistant: () => void;
}

type TrendMetricKey = 'usAqi' | 'pm25' | 'pm10' | 'gases';

export const DashboardView: React.FC<DashboardViewProps> = ({
  environment,
  envLoading,
  envError,
  onRetryEnv,
  profile,
  language,
  aiRecommendations,
  aiLoading,
  aiError,
  onGenerateAi,
  savedItems,
  onToggleSave,
  onOpenAssistant,
}) => {
  const [trendMetric, setTrendMetric] = useState<TrendMetricKey>('usAqi');

  const aq = environment?.airQuality ?? null;
  const weather = environment?.weather ?? null;
  const aqiMeta = getUsAqiCategory(aq?.usAqi ?? null);
  const cpcbResult = useMemo(() => calculateCpcbAqi(aq), [aq]);

  const aqiMarkerPercent = useMemo(() => {
    if (aq?.usAqi === null || aq?.usAqi === undefined) return null;
    return Math.min(100, Math.max(0, (aq.usAqi / 350) * 100));
  }, [aq?.usAqi]);

  const pollutantRows = useMemo(() => {
    if (!aq) return [];
    return [
      {
        code: 'PM2.5',
        name: language === 'hi' ? 'सूक्ष्म कण (PM2.5)' : 'Fine Particulate Matter',
        value: aq.pm25,
        unit: 'µg/m³',
        guideline: 'WHO 24h: 15 µg/m³',
      },
      {
        code: 'PM10',
        name: language === 'hi' ? 'मोटे कण (PM10)' : 'Coarse Particulate Matter',
        value: aq.pm10,
        unit: 'µg/m³',
        guideline: 'WHO 24h: 45 µg/m³',
      },
      {
        code: 'NO₂',
        name: language === 'hi' ? 'नाइट्रोजन डाइऑक्साइड' : 'Nitrogen Dioxide',
        value: aq.no2,
        unit: 'µg/m³',
        guideline: 'WHO 24h: 25 µg/m³',
      },
      {
        code: 'O₃',
        name: language === 'hi' ? 'ओज़ोन' : 'Ground-Level Ozone',
        value: aq.o3,
        unit: 'µg/m³',
        guideline: 'WHO 8h: 100 µg/m³',
      },
      {
        code: 'SO₂',
        name: language === 'hi' ? 'सल्फर डाइऑक्साइड' : 'Sulphur Dioxide',
        value: aq.so2,
        unit: 'µg/m³',
        guideline: 'WHO 24h: 40 µg/m³',
      },
      {
        code: 'CO',
        name: language === 'hi' ? 'कार्बन मोनोऑक्साइड' : 'Carbon Monoxide',
        value: aq.co,
        unit: 'µg/m³',
        guideline: 'Urban ambient level',
      },
      {
        code: 'Dust',
        name: language === 'hi' ? 'वायुमंडलीय धूल' : 'Airborne Mineral Dust',
        value: aq.dust,
        unit: 'µg/m³',
        guideline: 'Surface dust load',
      },
      {
        code: 'UV',
        name: language === 'hi' ? 'पराबैंगनी सूचकांक' : 'UV Radiation Index',
        value: aq.uvIndex,
        unit: 'index',
        guideline: '0–2 Low · 6+ High',
      },
    ];
  }, [aq, language]);

  const hasChartData = useMemo(() => {
    if (!environment?.hourlyTrend.length) return false;
    if (trendMetric === 'gases') {
      return environment.hourlyTrend.some((p) => p.no2 !== null || p.o3 !== null);
    }
    return environment.hourlyTrend.some((p) => p[trendMetric] !== null);
  }, [environment?.hourlyTrend, trendMetric]);

  const isRecommendationSaved = (title: string) =>
    savedItems.some((item) => item.title === title && item.category === 'dashboard');

  if (envLoading && !environment) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-80 bg-[#E6ECE9] rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-64 bg-white border border-[#E2E8E4] rounded-xl animate-pulse" />
          <div className="lg:col-span-5 h-64 bg-white border border-[#E2E8E4] rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-white border border-[#E2E8E4] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (envError && !environment) {
    return (
      <div className="bg-white border border-[#FECACA] rounded-xl p-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#B91C1C] shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h2 className="font-display text-base font-semibold text-[#0F1F1C]">
                Environmental readings temporarily unavailable
              </h2>
              <p className="text-sm text-[#526460] mt-1">{envError}</p>
            </div>
            <p className="text-xs text-[#647571]">
              FreshAir-AI never invents or simulates live AQI measurements when Open-Meteo is unreachable.
            </p>
            <button
              type="button"
              onClick={onRetryEnv}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Open-Meteo Fetch
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unboxed Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#526460]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-[#0F1F1C]">
            {environment?.location.name}
            {environment?.location.region ? `, ${environment.location.region}` : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span>Source: Open-Meteo Air Quality &amp; Weather API</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Measured: {formatTimestamp(aq?.measuredAt ?? weather?.measuredAt)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Updated: {formatTimestamp(environment?.fetchedAt)}
          </span>
        </div>
        {envError && (
          <span className="text-[#B91C1C] font-medium">Last refresh failed: {envError}</span>
        )}
      </div>

      {/* Partial unavailability notice */}
      {(aq?.status === 'unavailable' || weather?.status === 'unavailable') && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 text-xs text-[#92400E] flex items-center justify-between gap-4">
          <span>
            {aq?.status === 'unavailable'
              ? `Air quality feed unavailable: ${aq.errorMessage ?? 'Upstream timeout'}. `
              : ''}
            {weather?.status === 'unavailable'
              ? `Weather feed unavailable: ${weather.errorMessage ?? 'Upstream timeout'}.`
              : ''}
          </span>
          <button
            type="button"
            onClick={onRetryEnv}
            className="font-medium underline underline-offset-2 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Hero Split: AQI Overview + Weather Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* AQI Overview */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8E4] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#526460]">
                {language === 'hi' ? 'लाइव एयर क्वालिटी इंडेक्स (US AQI)' : 'Current Air Quality Index (US AQI)'}
              </p>
              <div className="mt-2 flex items-baseline gap-4">
                <span className="font-mono tabular-nums text-5xl sm:text-6xl font-semibold tracking-tight text-[#0F1F1C]">
                  {aq?.usAqi !== null && aq?.usAqi !== undefined ? Math.round(aq.usAqi) : '—'}
                </span>
                <div>
                  <p className={`font-display text-lg font-semibold ${aqiMeta.textColor}`}>
                    {language === 'hi' ? aqiMeta.labelHi : aqiMeta.label}
                  </p>
                  <p className="text-xs text-[#647571] font-mono tabular-nums mt-0.5">
                    European AQI: {formatReading(aq?.europeanAqi, '', 0)}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAssistant}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#0F766E] bg-[#0F766E]/8 hover:bg-[#0F766E]/15 rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {language === 'hi' ? 'AI से पूछें' : 'Ask AI About Today'}
            </button>
          </div>

          <p className="mt-4 text-sm text-[#445652] leading-relaxed">
            {language === 'hi' ? aqiMeta.shortGuidanceHi : aqiMeta.shortGuidance}
          </p>

          {/* AQI Spectrum Track */}
          <div
            role="meter"
            aria-label={language === 'hi' ? 'वायु गुणवत्ता सूचकांक पैमाना' : 'Air Quality Index meter'}
            aria-valuenow={aq?.usAqi !== null && aq?.usAqi !== undefined ? Math.round(aq.usAqi) : undefined}
            aria-valuemin={0}
            aria-valuemax={500}
            aria-valuetext={
              aq?.usAqi !== null && aq?.usAqi !== undefined
                ? `${Math.round(aq.usAqi)} - ${aqiMeta.label}`
                : 'Unavailable'
            }
            className="mt-6 pt-5 border-t border-[#EDF1EE]"
          >
            <div className="relative h-2.5 w-full rounded-full overflow-hidden flex" aria-hidden="true">
              <div className="h-full flex-1 bg-[#16A34A]" title="0–50 Good" />
              <div className="h-full flex-1 bg-[#EAB308]" title="51–100 Moderate" />
              <div className="h-full flex-1 bg-[#F97316]" title="101–150 Unhealthy for Sensitive" />
              <div className="h-full flex-1 bg-[#DC2626]" title="151–200 Unhealthy" />
              <div className="h-full flex-1 bg-[#9333EA]" title="201–300 Very Unhealthy" />
              <div className="h-full flex-1 bg-[#9F1239]" title="301+ Hazardous" />
            </div>
            {aqiMarkerPercent !== null && (
              <div className="relative h-4 mt-1" aria-hidden="true">
                <div
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${aqiMarkerPercent}%` }}
                >
                  <span className="h-2 w-0.5 bg-[#0F1F1C]" />
                  <span className="font-mono tabular-nums text-[10px] font-medium text-[#0F1F1C]">
                    {Math.round(aq?.usAqi as number)}
                  </span>
                </div>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-[11px] font-mono tabular-nums text-[#647571]" aria-hidden="true">
              <span>0 Good</span>
              <span>100 Moderate</span>
              <span>200 Unhealthy</span>
              <span>300+ Hazardous</span>
            </div>
          </div>

          {/* CPCB National AQI (India) Standard Display */}
          <div className="mt-6 pt-5 border-t border-[#EDF1EE]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#0F766E]/10 text-[#0F766E]">
                  CPCB NAQI (India)
                </span>
                <span className="text-xs text-[#647571]">
                  {language === 'hi' ? 'केंद्रीय प्रदूषण नियंत्रण बोर्ड मानक' : 'Central Pollution Control Board Standard'}
                </span>
              </div>
              {cpcbResult.isComplete && cpcbResult.dominantPollutant && (
                <span className="text-xs font-mono font-medium text-[#445652] bg-[#F2F5F3] px-2 py-0.5 rounded">
                  Dominant: {cpcbResult.dominantPollutant.name} ({cpcbResult.dominantPollutant.subIndex})
                </span>
              )}
            </div>

            {cpcbResult.isComplete ? (
              <div className="mt-3 flex flex-wrap items-baseline gap-4">
                <span className="font-mono tabular-nums text-3xl sm:text-4xl font-semibold text-[#0F1F1C]">
                  {cpcbResult.aqi}
                </span>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cpcbResult.category.textColor} ${cpcbResult.category.surfaceColor} border ${cpcbResult.category.borderColor}`}
                  >
                    {language === 'hi' ? cpcbResult.category.labelHi : cpcbResult.category.label}
                  </span>
                  <p className="mt-1 text-xs text-[#526460]">
                    {language === 'hi' ? cpcbResult.category.descriptionHi : cpcbResult.category.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                    CPCB AQI Incomplete
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">·</span>
                  <span className="text-[11px] text-[#64748B]">
                    {cpcbResult.monitoredCount} / 3 required pollutants measured
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#475569] leading-relaxed">
                  {cpcbResult.missingRequirements.join(' ')}
                </p>
              </div>
            )}

            {/* CPCB Sub-indices Breakdown */}
            {Object.keys(cpcbResult.subIndices).length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                <span className="text-[#647571] font-sans text-xs mr-1">Sub-indices:</span>
                {Object.values(cpcbResult.subIndices).map((sub) => (
                  <span
                    key={sub.pollutant}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F2F5F3] text-[#334155] border border-[#E2E8E4]"
                    title={`${sub.name}: ${sub.concentration} ${sub.unit} -> CPCB Sub-index ${sub.subIndex}`}
                  >
                    <span className="font-semibold text-[#0F1F1C]">{sub.name}</span>
                    <span className="tabular-nums font-bold">{sub.subIndex}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weather Overview */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8E4] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#526460]">
                  {language === 'hi' ? 'स्थानीय मौसम' : 'Local Weather Overview'}
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono tabular-nums text-4xl font-semibold text-[#0F1F1C]">
                    {formatTemperature(weather?.temperatureC, profile.temperatureUnit, '—')}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-[#445652]">
                  {weather?.conditionLabel ?? 'Unavailable'}
                </p>
              </div>
              <Thermometer className="h-5 w-5 text-[#0F766E] shrink-0" />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#EDF1EE] grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <p className="text-xs text-[#647571]">Feels Like</p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-medium text-[#0F1F1C]">
                {formatTemperature(weather?.apparentTemperatureC, profile.temperatureUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#647571] flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-[#0F766E]" />
                Humidity
              </p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-medium text-[#0F1F1C]">
                {formatReading(weather?.humidityPercent, '%', 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#647571] flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-[#0F766E]" />
                Wind
              </p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-medium text-[#0F1F1C]">
                {formatReading(weather?.windSpeedKmh, 'km/h', 1)}
              </p>
              <p className="text-[11px] font-mono text-[#647571]">
                {formatWindDirection(weather?.windDirectionDeg)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#647571] flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-[#0F766E]" />
                Pressure
              </p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-medium text-[#0F1F1C]">
                {formatReading(weather?.surfacePressureHpa, 'hPa', 0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pollutants Grid */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F1F1C]">
              {language === 'hi' ? 'प्रदूषक रीडिंग्स' : 'Measured Pollutants & Surface Load'}
            </h2>
            <p className="text-xs text-[#647571] mt-0.5">
              Zero readings are shown as <span className="font-mono">0.0</span>; missing provider data is labeled{' '}
              <span className="font-medium text-[#0F1F1C]">Unavailable</span>.
            </p>
          </div>
          <span className="text-xs text-[#647571]">Units in µg/m³ unless noted</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:gap-4">
          {pollutantRows.map((item) => {
            const unavailable = item.value === null || item.value === undefined;
            const pollutantSubKey =
              item.code === 'PM2.5'
                ? 'pm25'
                : item.code === 'PM10'
                  ? 'pm10'
                  : item.code === 'NO₂'
                    ? 'no2'
                    : item.code === 'O₃'
                      ? 'o3'
                      : item.code === 'SO₂'
                        ? 'so2'
                        : item.code === 'CO'
                          ? 'co'
                          : null;
            const subIndexObj = pollutantSubKey ? cpcbResult.subIndices[pollutantSubKey] : null;

            return (
              <div
                key={item.code}
                className="py-3.5 sm:p-4 sm:border sm:border-[#EDF1EE] sm:rounded-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-[#0F1F1C]">{item.code}</span>
                    <span className="text-[11px] text-[#647571]">{item.guideline}</span>
                  </div>
                  <p className="text-xs text-[#526460] mt-0.5">{item.name}</p>
                </div>
                <div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    {unavailable ? (
                      <span className="text-sm font-medium text-[#647571]">Unavailable</span>
                    ) : (
                      <>
                        <span className="font-mono tabular-nums text-2xl font-semibold text-[#0F1F1C]">
                          {item.value?.toFixed(1)}
                        </span>
                        <span className="text-xs text-[#647571] font-mono">{item.unit}</span>
                      </>
                    )}
                  </div>
                  {subIndexObj && (
                    <div className="mt-2 text-[11px] font-mono text-[#0F766E] flex items-center justify-between border-t border-[#EDF1EE] pt-1.5">
                      <span>CPCB Sub-Index</span>
                      <span className="font-semibold">{subIndexObj.subIndex}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 24-Hour Pollution Trend Chart */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F1F1C]">
              {language === 'hi' ? '24-घंटे का प्रदूषण रुझान' : '24-Hour Pollution Trend'}
            </h2>
            <p className="text-xs text-[#647571] mt-0.5">
              Hourly Open-Meteo model curve for today ({environment?.location.timezone ?? 'local time'})
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-[#F2F5F3] rounded-lg self-start sm:self-auto">
            {(
              [
                { id: 'usAqi', label: 'US AQI' },
                { id: 'pm25', label: 'PM2.5' },
                { id: 'pm10', label: 'PM10' },
                { id: 'gases', label: 'NO₂ & O₃' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTrendMetric(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  trendMetric === tab.id
                    ? 'bg-white text-[#0F1F1C] shadow-xs'
                    : 'text-[#526460] hover:text-[#0F1F1C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {hasChartData ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {trendMetric === 'gases' ? (
                <LineChart
                  data={environment?.hourlyTrend ?? []}
                  margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAEFEA" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#647571', fontFamily: 'JetBrains Mono' }}
                    interval={2}
                    stroke="#DCE3DF"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#647571', fontFamily: 'JetBrains Mono' }}
                    stroke="#DCE3DF"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#DCE3DF',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown, name: string) => [
                      typeof value === 'number' ? `${value.toFixed(1)} µg/m³` : 'Unavailable',
                      name === 'no2' ? 'NO₂' : 'O₃',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="no2"
                    name="no2"
                    stroke="#0F766E"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="o3"
                    name="o3"
                    stroke="#D97706"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              ) : (
                <AreaChart
                  data={environment?.hourlyTrend ?? []}
                  margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="freshairChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAEFEA" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#647571', fontFamily: 'JetBrains Mono' }}
                    interval={2}
                    stroke="#DCE3DF"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#647571', fontFamily: 'JetBrains Mono' }}
                    stroke="#DCE3DF"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#DCE3DF',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown) => {
                      if (typeof value !== 'number') return ['Unavailable', trendMetric.toUpperCase()];
                      const unit = trendMetric === 'usAqi' ? 'US AQI' : 'µg/m³';
                      return [`${value.toFixed(trendMetric === 'usAqi' ? 0 : 1)} ${unit}`, trendMetric === 'usAqi' ? 'US AQI' : trendMetric.toUpperCase()];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={trendMetric}
                    stroke="#0F766E"
                    strokeWidth={2}
                    fill="url(#freshairChartGrad)"
                    connectNulls={false}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-[#DCE3DF] rounded-lg px-4">
            <p className="text-sm font-medium text-[#0F1F1C]">Hourly trend data unavailable</p>
            <p className="text-xs text-[#647571] mt-1 max-w-md">
              Open-Meteo did not return hourly readings for this metric at the selected coordinates.
            </p>
          </div>
        )}
      </section>

      {/* AI-Generated Recommendations Section */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EDF1EE]">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F1F1C]">
              {language === 'hi' ? 'Gemini AI व्यक्तिगत सुझाव' : 'AI-Generated Recommendations'}
            </h2>
            <p className="text-xs text-[#647571] mt-0.5">
              Grounded strictly in current Open-Meteo readings and your household profile ({profile.householdGroup.replace('_', ' ')}, sensitivity: {profile.respiratorySensitivity})
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerateAi}
            disabled={aiLoading || !environment}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Sparkles className="h-4 w-4" />
            {aiLoading
              ? language === 'hi'
                ? 'सुझाव तैयार हो रहे हैं...'
                : 'Generating Guidance...'
              : aiRecommendations
                ? language === 'hi'
                  ? 'सुझाव रिफ्रेश करें'
                  : 'Regenerate Guidance'
                : language === 'hi'
                  ? 'AI सुझाव प्राप्त करें'
                  : 'Generate AI Guidance'}
          </button>
        </div>

        {aiLoading && !aiRecommendations && (
          <div className="py-6 space-y-4">
            <div className="h-4 w-3/4 bg-[#EBF0ED] rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-[#F7F9F8] rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {aiError && (
          <div className="mt-5 p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-[#991B1B]">
              <p className="font-medium">Unable to generate Gemini recommendations</p>
              <p className="text-xs mt-0.5 text-[#B91C1C]">{aiError}</p>
            </div>
            <button
              type="button"
              onClick={onGenerateAi}
              className="px-3.5 py-2 text-xs font-medium text-[#991B1B] bg-white border border-[#FECACA] hover:bg-[#FFF5F5] rounded-lg whitespace-nowrap self-start sm:self-auto"
            >
              Try Again
            </button>
          </div>
        )}

        {aiRecommendations && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-[#243632] leading-relaxed bg-[#F6FAF8] border border-[#DCE8E3] rounded-lg p-4">
              {aiRecommendations.briefing}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {aiRecommendations.recommendations.map((rec) => {
                const saved = isRecommendationSaved(rec.title);
                return (
                  <article
                    key={rec.id}
                    className="border border-[#E6ECE9] rounded-lg p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-[#0F766E]">{rec.category}</p>
                          <h3 className="font-display text-sm font-semibold text-[#0F1F1C] mt-0.5">
                            {rec.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onToggleSave({
                              title: rec.title,
                              body: `${rec.summary}\n${rec.actionSteps.map((s) => `• ${s}`).join('\n')}`,
                              category: 'dashboard',
                              locationName: environment?.location.name ?? 'Unknown',
                              aqiAtSave: aq?.usAqi ?? null,
                              language,
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                            saved
                              ? 'border-[#0F766E] bg-[#0F766E]/10 text-[#0F766E]'
                              : 'border-[#DCE3DF] text-[#526460] hover:text-[#0F1F1C] hover:bg-[#F5F8F6]'
                          }`}
                        >
                          {saved ? (
                            <>
                              <BookmarkCheck className="h-3.5 w-3.5" />
                              Saved
                            </>
                          ) : (
                            <>
                              <Bookmark className="h-3.5 w-3.5" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-xs sm:text-sm text-[#445652] leading-relaxed">
                        {rec.summary}
                      </p>
                      {rec.actionSteps.length > 0 && (
                        <ul className="mt-3 space-y-1.5 text-xs text-[#2E403C]">
                          {rec.actionSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#0F766E] font-semibold mt-0.5">–</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#EDF1EE] text-xs text-[#647571]">
              <span>{aiRecommendations.disclaimer}</span>
              <span className="font-mono tabular-nums">
                Generated {formatTimestamp(aiRecommendations.generatedAt)}
              </span>
            </div>
          </div>
        )}

        {!aiRecommendations && !aiLoading && !aiError && (
          <div className="py-8 text-center">
            <p className="text-sm text-[#445652]">
              Generate personalized, non-medical air quality guidance tailored to today&apos;s readings.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
