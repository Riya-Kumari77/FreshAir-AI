import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Square,
  Sparkles,
  Wind,
  Calculator,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { INDOOR_GUIDE_TOPICS } from '../data/constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { fetchIndoorRoomAdvice } from '../services/api';
import type {
  EnvironmentalSnapshot,
  IndoorAdviceAiResponse,
  LanguageCode,
  SavedRecommendation,
  UserProfile,
} from '../types/freshair';
import { findCleanestWindow, formatReading } from '../utils/aqi';

interface IndoorAirViewProps {
  environment: EnvironmentalSnapshot | null;
  profile: UserProfile;
  language: LanguageCode;
  savedItems: SavedRecommendation[];
  onToggleSave: (item: Omit<SavedRecommendation, 'id' | 'savedAt'>) => void;
}

export const IndoorAirView: React.FC<IndoorAirViewProps> = ({
  environment,
  profile,
  language,
  savedItems,
  onToggleSave,
}) => {
  const [checkedTips, setCheckedTips] = useLocalStorage<Record<string, boolean>>(
    'freshair_indoor_checklist_v1',
    {},
  );
  const [activeTopic, setActiveTopic] = useState<string>('all');

  // Transparent HEPA CADR calculator state
  const [roomLengthFt, setRoomLengthFt] = useState<number>(14);
  const [roomWidthFt, setRoomWidthFt] = useState<number>(12);
  const [ceilingHeightFt, setCeilingHeightFt] = useState<number>(9.5);
  const [targetAch, setTargetAch] = useState<number>(4.5);

  // Room-specific Gemini advisor
  const [roomType, setRoomType] = useState('Bedroom');
  const [roomConcern, setRoomConcern] = useState('Winter smog infiltration and overnight dust');
  const [aiAdvice, setAiAdvice] = useState<IndoorAdviceAiResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setAiAdvice(null);
    setAiError(null);
  }, [environment?.location.id, language]);

  const aq = environment?.airQuality ?? null;
  const cleanestWindow = useMemo(
    () => findCleanestWindow(environment?.hourlyTrend ?? []),
    [environment?.hourlyTrend],
  );

  const ventilationStatus = useMemo(() => {
    const pm25 = aq?.pm25 ?? null;
    const usAqi = aq?.usAqi ?? null;

    if (pm25 === null && usAqi === null) {
      return {
        verdict: 'Check Local Conditions',
        tone: 'text-[#526460]',
        detail:
          'Live outdoor air quality data is currently unavailable. Avoid wide window ventilation during visible haze or rush-hour traffic.',
      };
    }

    if ((usAqi !== null && usAqi > 150) || (pm25 !== null && pm25 > 55)) {
      return {
        verdict: 'Keep Windows Closed · Recirculate Filtered Air',
        tone: 'text-[#B91C1C]',
        detail: `Outdoor air is elevated (US AQI ${formatReading(usAqi, '', 0)}, PM2.5 ${formatReading(pm25, 'µg/m³', 1)}). Keep exterior doors and windows sealed, run a True HEPA purifier if available, and restrict natural ventilation to a brief 10-minute flush during the cleanest forecast hour${cleanestWindow ? ` (~${cleanestWindow.label})` : ''}.`,
      };
    }

    if ((usAqi !== null && usAqi > 100) || (pm25 !== null && pm25 > 35)) {
      return {
        verdict: 'Limit Ventilation to Brief Off-Peak Windows',
        tone: 'text-[#C2410C]',
        detail: `Moderate-to-sensitive outdoor conditions (US AQI ${formatReading(usAqi, '', 0)}). Ventilate briefly away from traffic rush hours${cleanestWindow ? `, ideally near ${cleanestWindow.label} (forecast AQI ${cleanestWindow.usAqi})` : ''}, and keep kitchen exhaust running while cooking.`,
      };
    }

    return {
      verdict: 'Safe for Natural Cross-Ventilation',
      tone: 'text-[#15803D]',
      detail: `Current outdoor air is relatively clean (US AQI ${formatReading(usAqi, '', 0)}, PM2.5 ${formatReading(pm25, 'µg/m³', 1)}). Open opposite windows for 15–30 minutes to flush indoor CO2, cooking odors, and VOCs.`,
    };
  }, [aq?.pm25, aq?.usAqi, cleanestWindow]);

  const cadrCalc = useMemo(() => {
    const areaSqFt = Math.max(20, roomLengthFt * roomWidthFt);
    const volumeCuFt = areaSqFt * Math.max(7, ceilingHeightFt);
    const volumeM3 = volumeCuFt * 0.0283168;
    const recommendedCadrM3h = Math.round(volumeM3 * targetAch);
    const recommendedCadrCfm = Math.round(recommendedCadrM3h / 1.699);
    return {
      areaSqFt: Math.round(areaSqFt),
      volumeM3: Number(volumeM3.toFixed(1)),
      recommendedCadrM3h,
      recommendedCadrCfm,
    };
  }, [roomLengthFt, roomWidthFt, ceilingHeightFt, targetAch]);

  const allChecklistCount = useMemo(
    () => INDOOR_GUIDE_TOPICS.reduce((acc, t) => acc + t.checklist.length, 0),
    [],
  );
  const completedCount = useMemo(
    () => Object.values(checkedTips).filter(Boolean).length,
    [checkedTips],
  );

  const visibleTopics =
    activeTopic === 'all'
      ? INDOOR_GUIDE_TOPICS
      : INDOOR_GUIDE_TOPICS.filter((t) => t.section === activeTopic);

  const toggleTip = (id: string) => {
    setCheckedTips((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAskRoomPlan = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetchIndoorRoomAdvice(
        environment,
        profile,
        {
          roomType,
          areaSqFt: cadrCalc.areaSqFt,
          concern: roomConcern,
        },
        language,
      );
      setAiAdvice(res);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate indoor advice.');
    } finally {
      setAiLoading(false);
    }
  };

  const savedAdviceTitle = `Indoor Plan: ${roomType} (${cadrCalc.areaSqFt} sq ft)`;
  const isAdviceSaved = savedItems.some((s) => s.title === savedAdviceTitle && s.category === 'indoor');

  return (
    <div className="space-y-6">
      {/* Live Outdoor-Driven Ventilation Advisor */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-[#526460]">
              <Wind className="h-4 w-4 text-[#0F766E]" />
              <span>Live Ventilation Guidance · {environment?.location.name ?? 'No location selected'}</span>
            </div>
            <h2 className={`font-display text-lg font-semibold ${ventilationStatus.tone}`}>
              {ventilationStatus.verdict}
            </h2>
            <p className="text-sm text-[#445652] leading-relaxed">{ventilationStatus.detail}</p>
          </div>

          <div className="shrink-0 md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-[#EDF1EE]">
            <p className="text-xs text-[#647571]">Home Checklist Progress</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#0F1F1C] mt-0.5">
              {completedCount} / {allChecklistCount}
            </p>
            <p className="text-[11px] text-[#647571]">Verified actions checked by you</p>
          </div>
        </div>
      </section>

      {/* HEPA Air Purifier CADR Calculator + Gemini Room Advisor */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 bg-white border border-[#E2E8E4] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-[#0F766E]" />
              <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
                Air Purifier CADR Sizing Calculator
              </h3>
            </div>
            <p className="text-xs text-[#647571]">
              Calculate recommended Clean Air Delivery Rate (CADR) for True HEPA filtration using standard Air Changes per Hour (ACH).
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <label className="block text-xs font-medium text-[#445652]">
                Room Length (ft)
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={roomLengthFt}
                  onChange={(e) => setRoomLengthFt(Math.max(5, Number(e.target.value) || 5))}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </label>
              <label className="block text-xs font-medium text-[#445652]">
                Room Width (ft)
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={roomWidthFt}
                  onChange={(e) => setRoomWidthFt(Math.max(5, Number(e.target.value) || 5))}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </label>
              <label className="block text-xs font-medium text-[#445652]">
                Ceiling Height (ft)
                <input
                  type="number"
                  step="0.5"
                  min={7}
                  max={20}
                  value={ceilingHeightFt}
                  onChange={(e) => setCeilingHeightFt(Math.max(7, Number(e.target.value) || 7))}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </label>
              <label className="block text-xs font-medium text-[#445652]">
                Target Air Changes / Hr (ACH)
                <select
                  value={targetAch}
                  onChange={(e) => setTargetAch(Number(e.target.value))}
                  className="mt-1.5 w-full px-3 py-2 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={3}>3.0 ACH (Everyday)</option>
                  <option value={4.5}>4.5 ACH (Urban Smog)</option>
                  <option value={5}>5.0 ACH (Sensitive / Severe Smog)</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#EDF1EE] flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="text-xs text-[#647571]">Minimum Recommended CADR</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#0F766E] mt-0.5">
                {cadrCalc.recommendedCadrM3h} m³/h{' '}
                <span className="text-sm font-normal text-[#526460]">
                  ({cadrCalc.recommendedCadrCfm} CFM)
                </span>
              </p>
            </div>
            <p className="text-[11px] text-[#647571] font-mono tabular-nums">
              Formula: {cadrCalc.volumeM3} m³ × {targetAch} ACH
            </p>
          </div>
        </div>

        {/* Gemini Room-Specific Indoor Air Plan */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8E4] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
              Tailored Room Air Plan (Gemini AI)
            </h3>
            <p className="text-xs text-[#647571] mt-0.5">
              Combine your room size ({cadrCalc.areaSqFt} sq ft), cooking fuel ({profile.cookingFuel}), and live outdoor air readings.
            </p>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-[#445652]">
                  Room Type
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="Bedroom">Bedroom</option>
                    <option value="Living Room">Living Room</option>
                    <option value="Kitchen & Dining">Kitchen &amp; Dining</option>
                    <option value="Kids Study Room">Kids Study Room</option>
                    <option value="Home Office">Home Office</option>
                  </select>
                </label>

                <label className="block text-xs font-medium text-[#445652]">
                  Primary Concern
                  <input
                    type="text"
                    value={roomConcern}
                    onChange={(e) => setRoomConcern(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleAskRoomPlan()}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? 'Generating Room Plan...' : 'Generate Room Plan'}
              </button>
            </div>

            {aiError && (
              <div className="mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiAdvice && (
              <div className="mt-4 pt-4 border-t border-[#EDF1EE] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-[#1E312D] leading-relaxed">{aiAdvice.summary}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onToggleSave({
                        title: savedAdviceTitle,
                        body: `${aiAdvice.summary}\nVentilation: ${aiAdvice.ventilationTiming}\n${aiAdvice.priorityActions.map((a) => `• ${a}`).join('\n')}`,
                        category: 'indoor',
                        locationName: environment?.location.name ?? 'Local',
                        aqiAtSave: aq?.usAqi ?? null,
                        language,
                      })
                    }
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border shrink-0 ${
                      isAdviceSaved
                        ? 'border-[#0F766E] text-[#0F766E] bg-[#0F766E]/10'
                        : 'border-[#DCE3DF] text-[#526460]'
                    }`}
                  >
                    {isAdviceSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    {isAdviceSaved ? 'Saved' : 'Save'}
                  </button>
                </div>
                <p className="text-xs text-[#0F766E] font-medium">
                  Ventilation Window: {aiAdvice.ventilationTiming}
                </p>
                <ul className="space-y-1.5 text-xs text-[#445652]">
                  {aiAdvice.priorityActions.map((act, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#0F766E] font-semibold">–</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Practical Indoor Guide Sections */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
              Indoor Air Quality Action Playbook
            </h3>
            <p className="text-xs text-[#647571]">
              Check off practices adopted in your home to track your readiness across all 5 core indoor categories.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EBF0ED] rounded-lg self-start">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'ventilation', label: 'Ventilation' },
              { id: 'cooking', label: 'Cooking' },
              { id: 'dust', label: 'Dust' },
              { id: 'purifier', label: 'Purifier' },
              { id: 'prevention', label: 'Prevention' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTopic(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTopic === tab.id
                    ? 'bg-white text-[#0F1F1C] shadow-xs'
                    : 'text-[#526460] hover:text-[#0F1F1C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visibleTopics.map((topic) => (
            <article key={topic.id} className="bg-white border border-[#E2E8E4] rounded-xl p-5 space-y-4">
              <div>
                <h4 className="font-display text-base font-semibold text-[#0F1F1C]">{topic.title}</h4>
                <p className="text-xs sm:text-sm text-[#526460] mt-1 leading-relaxed">{topic.summary}</p>
              </div>

              <div className="divide-y divide-[#EDF1EE]">
                {topic.checklist.map((item) => {
                  const checked = Boolean(checkedTips[item.id]);
                  return (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => toggleTip(item.id)}
                        className="w-full flex items-start gap-2.5 text-left group"
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" />
                        ) : (
                          <Square className="h-4 w-4 text-[#94A39F] group-hover:text-[#0F766E] shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p
                            className={`text-xs sm:text-sm leading-snug ${
                              checked ? 'line-through text-[#7C8C88]' : 'text-[#0F1F1C]'
                            }`}
                          >
                            {item.text}
                          </p>
                          <p className="text-[11px] text-[#647571] mt-1">{item.impact}</p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
