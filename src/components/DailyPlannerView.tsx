import React, { useEffect, useMemo, useState } from 'react';
import {
  Sunrise,
  Sun,
  Sunset,
  Sparkles,
  CheckSquare,
  Square,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react';
import { fetchPersonalizedDailyPlan } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type {
  DailyPeriodWindow,
  DailyPlanAiResponse,
  EnvironmentalSnapshot,
  LanguageCode,
  SavedRecommendation,
  UserProfile,
} from '../types/freshair';
import {
  computeDailyPeriodWindows,
  findCleanestWindow,
  formatReading,
  getLocalDateIso,
  getPeriodLabel,
  getUsAqiCategory,
} from '../utils/aqi';

interface DailyPlannerViewProps {
  environment: EnvironmentalSnapshot | null;
  profile: UserProfile;
  language: LanguageCode;
  savedItems: SavedRecommendation[];
  onToggleSave: (item: Omit<SavedRecommendation, 'id' | 'savedAt'>) => void;
}

function buildBaselineRoutine(windowData: DailyPeriodWindow, profile: UserProfile, lang: LanguageCode) {
  const aqi = windowData.avgAqi;
  const highSensitivity = profile.respiratorySensitivity === 'high' || profile.householdGroup === 'children' || profile.householdGroup === 'seniors';

  if (aqi === null) {
    return {
      outdoorActivity:
        lang === 'hi'
          ? 'इस समय स्लॉट के लिए प्रति-घंटा पूर्वानुमान उपलब्ध नहीं है। बाहर निकलने से पहले लाइव डैशबोर्ड रीडिंग देखें।'
          : 'Hourly forecast is unavailable for this window. Check the latest live dashboard reading before vigorous outdoor exercise.',
      commuteSuggestion:
        lang === 'hi'
          ? 'मेट्रो, इलेक्ट्रिक बस या कारपूलिंग चुनें ताकि स्थानीय उत्सर्जन कम रहे।'
          : 'Prefer metro, electric transit, or carpooling to keep local tailpipe emissions low.',
      familyTip:
        lang === 'hi'
          ? 'संवेदनशील सदस्यों के लिए घर के अंदर हवादार और धूल-मुक्त वातावरण बनाए रखें।'
          : 'Keep indoor rooms dust-free and monitor comfort for children and older adults.',
    };
  }

  if (aqi <= 50) {
    return {
      outdoorActivity:
        lang === 'hi'
          ? 'बाहरी सैर, साइकिल चलाने और बच्चों के खेलने के लिए अनुकूल समय।'
          : 'Favorable window for brisk walking, cycling, park visits, and outdoor school sports.',
      commuteSuggestion:
        lang === 'hi'
          ? 'कम दूरी के लिए पैदल या साइकिल चुनें; लंबी दूरी के लिए मेट्रो/बस सर्वोत्तम है।'
          : 'Great conditions for walking or cycling short errands; use metro or electric transit for longer trips.',
      familyTip:
        lang === 'hi'
          ? 'ताज़ी हवा के लिए 20–30 मिनट के लिए क्रॉस-वेंटिलेशन हेतु खिड़कियाँ खोलें।'
          : 'Open opposite windows for 20–30 minutes to refresh indoor air across bedrooms and living areas.',
    };
  }

  if (aqi <= 100) {
    return {
      outdoorActivity:
        lang === 'hi'
          ? highSensitivity
            ? 'बाहरी गतिविधि मध्यम रखें और अधिक ट्रैफ़िक वाली सड़कों से बचें।'
            : 'हल्का से मध्यम बाहरी व्यायाम सामान्यतः सुरक्षित है; ट्रैफ़िक से दूर पार्क चुनें।'
          : highSensitivity
            ? 'Keep outdoor activity moderate and avoid busy arterial roads during peak traffic.'
            : 'Light-to-moderate outdoor exercise is generally comfortable; prefer green parks away from traffic corridors.',
      commuteSuggestion:
        lang === 'hi'
          ? 'भीड़भाड़ के समय स्थानीय उत्सर्जन कम रखने के लिए मेट्रो, CNG/इलेक्ट्रिक बस या कारपूलिंग चुनें।'
          : 'Choose metro rail, CNG/EV bus, or carpooling to avoid adding rush-hour exhaust near residential roads.',
      familyTip:
        lang === 'hi'
          ? 'बच्चे और बुजुर्ग थोड़े समय बाहर रह सकते हैं; पर्याप्त पानी पिएँ और धूल वाले क्षेत्रों से बचें।'
          : 'Children and older adults can spend brief time outdoors; hydrate well and avoid dusty construction zones.',
    };
  }

  if (aqi <= 150) {
    return {
      outdoorActivity:
        lang === 'hi'
          ? 'तेज़ दौड़ या भारी व्यायाम घर के अंदर करें। ज़रूरी बाहरी सैर छोटी रखें और मुख्य सड़कों से बचें।'
          : 'Shift intense jogging or HIIT indoors. Keep essential outdoor walks short and away from high-traffic intersections.',
      commuteSuggestion:
        lang === 'hi'
          ? 'बंद-केबिन मेट्रो या इलेक्ट्रिक बस का उपयोग करें; पैदल या दोपहिया यात्रा में N95/FFP2 मास्क पहनें।'
          : 'Use closed-cabin metro or electric bus; wear a well-fitted N95/FFP2 mask if walking or riding a two-wheeler.',
      familyTip:
        lang === 'hi'
          ? 'बच्चों और बुजुर्गों का लंबे समय तक बाहर खेलना कम करें; ट्रैफ़िक पीक के दौरान खिड़कियाँ बंद रखें।'
          : 'Reduce prolonged outdoor play for children and seniors; keep windows closed during traffic peaks.',
    };
  }

  return {
    outdoorActivity:
      lang === 'hi'
        ? 'बाहर भारी व्यायाम से बचें। व्यायाम घर के अंदर करें और स्मॉग रोकने के लिए खिड़कियाँ-दरवाज़े बंद रखें।'
        : 'Avoid strenuous outdoor workouts. Move exercise indoors and keep doors/windows tightly closed to limit smog entry.',
    commuteSuggestion:
      lang === 'hi'
        ? 'संभव हो तो घर से काम/पढ़ाई करें, या मेट्रो में यात्रा करें और बाहर निकलते समय फिटेड N95/FFP2 मास्क पहनें।'
        : 'Work remotely if possible, or use enclosed metro rail with a well-fitted N95/FFP2 mask on platforms and walks.',
    familyTip:
      lang === 'hi'
        ? 'बच्चों, बुजुर्गों और संवेदनशील सदस्यों को घर के अंदर रखें; उपलब्ध होने पर बेडरूम में HEPA एयर प्यूरीफायर चलाएँ।'
        : 'Keep children, seniors, and sensitive family members indoors; run HEPA air purification in bedrooms if available.',
  };
}

export const DailyPlannerView: React.FC<DailyPlannerViewProps> = ({
  environment,
  profile,
  language,
  savedItems,
  onToggleSave,
}) => {
  const [aiPlan, setAiPlan] = useState<DailyPlanAiResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const todayKey = getLocalDateIso(0);
  const [completedTasks, setCompletedTasks] = useLocalStorage<Record<string, boolean>>(
    `freshair_planner_done_${todayKey}`,
    {},
  );

  useEffect(() => {
    setAiPlan(null);
    setAiError(null);
  }, [environment?.location.id, language]);

  const periods = useMemo(
    () => computeDailyPeriodWindows(environment?.hourlyTrend ?? []),
    [environment?.hourlyTrend],
  );

  const cleanestHour = useMemo(
    () => findCleanestWindow(environment?.hourlyTrend ?? []),
    [environment?.hourlyTrend],
  );

  const handlePersonalizeWithAi = async () => {
    if (!environment) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await fetchPersonalizedDailyPlan(environment, profile, periods, language);
      setAiPlan(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to personalize daily plan.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleDone = (key: string) => {
    setCompletedTasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const periodIcons = {
    morning: Sunrise,
    afternoon: Sun,
    evening: Sunset,
  };

  return (
    <div className="space-y-6">
      {/* Header & Cleanest Window Summary */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <h2 className="font-display text-lg font-semibold text-[#0F1F1C]">
            {language === 'hi' ? 'स्मार्ट दैनिक रूटीन प्लानर' : 'Smart Daily Routine Planner'}
          </h2>
          <p className="text-sm text-[#526460] max-w-2xl">
            {language === 'hi'
              ? 'Open-Meteo के प्रति-घंटा पूर्वानुमान के आधार पर सुबह, दोपहर और शाम की सुरक्षित दिनचर्या।'
              : 'Morning, afternoon, and evening guidance derived from today’s Open-Meteo hourly forecast for your location.'}
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#526460]">
            <span>
              Location: <strong className="text-[#0F1F1C]">{environment?.location.name ?? 'Unavailable'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Cleanest daytime hour:{' '}
              {cleanestHour ? (
                <strong className="font-mono tabular-nums text-[#0F766E]">
                  {cleanestHour.label} (US AQI {cleanestHour.usAqi})
                </strong>
              ) : (
                <strong className="text-[#647571]">Unavailable</strong>
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handlePersonalizeWithAi()}
          disabled={aiLoading || !environment}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap self-start lg:self-auto"
        >
          <Sparkles className="h-4 w-4" />
          {aiLoading
            ? language === 'hi'
              ? 'AI योजना बना रहा है...'
              : 'Personalizing Plan...'
            : language === 'hi'
              ? 'Gemini AI से व्यक्तिगत बनाएं'
              : 'Personalize with Gemini AI'}
        </button>
      </section>

      {aiError && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {aiPlan?.daySummary && (
        <div className="bg-[#F5FAF8] border border-[#CFE4DC] rounded-xl p-4 text-sm text-[#16352F]">
          <p className="font-medium text-xs text-[#0F766E] mb-1">Gemini Personalized Day Brief</p>
          <p className="leading-relaxed">{aiPlan.daySummary}</p>
        </div>
      )}

      {/* Morning / Afternoon / Evening Routine Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {periods.map((windowData) => {
          const Icon = periodIcons[windowData.period];
          const cat = getUsAqiCategory(windowData.avgAqi);
          const aiSlot = aiPlan?.slots.find((s) => s.period === windowData.period);
          const baseline = buildBaselineRoutine(windowData, profile, language);

          const outdoorText = aiSlot?.outdoorActivity || baseline.outdoorActivity;
          const commuteText = aiSlot?.commuteSuggestion || baseline.commuteSuggestion;
          const familyText = aiSlot?.familyTip || baseline.familyTip;

          const periodTitle = aiSlot?.title || getPeriodLabel(windowData.period, language);
          const saveTitle = `${periodTitle} Routine (${environment?.location.name ?? 'Local'})`;
          const isSaved = savedItems.some((s) => s.title === saveTitle && s.category === 'planner');

          const rows = [
            { id: `${windowData.period}-outdoor`, heading: language === 'hi' ? 'बाहरी गतिविधि' : 'Outdoor Activity', text: outdoorText },
            { id: `${windowData.period}-commute`, heading: language === 'hi' ? 'कम-उत्सर्जन यात्रा' : 'Low-Emission Commute', text: commuteText },
            { id: `${windowData.period}-family`, heading: language === 'hi' ? 'परिवार के लिए सुझाव' : 'Family-Friendly Note', text: familyText },
          ];

          return (
            <article
              key={windowData.period}
              className="bg-white border border-[#E2E8E4] rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#EDF1EE]">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-[#F2F6F4] text-[#0F766E]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
                        {periodTitle}
                      </h3>
                      <p className="font-mono tabular-nums text-xs text-[#647571]">
                        {windowData.timeRange}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono tabular-nums text-lg font-semibold text-[#0F1F1C]">
                      {windowData.avgAqi !== null ? `AQI ${windowData.avgAqi}` : 'Unavailable'}
                    </p>
                    <p className={`text-xs font-medium ${cat.textColor}`}>
                      {language === 'hi' ? cat.labelHi : cat.label}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-[#647571] font-mono tabular-nums">
                  <span>
                    Range: {windowData.minAqi !== null && windowData.maxAqi !== null ? `${windowData.minAqi}–${windowData.maxAqi}` : 'N/A'}
                  </span>
                  <span>Avg PM2.5: {formatReading(windowData.avgPm25, 'µg/m³', 1)}</span>
                </div>

                <div className="mt-4 space-y-3.5">
                  {rows.map((row) => {
                    const checked = Boolean(completedTasks[row.id]);
                    return (
                      <div key={row.id} className="space-y-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`${row.heading}: ${checked ? 'completed' : 'pending'}`}
                          onClick={() => toggleDone(row.id)}
                          className="flex items-center gap-2 text-left text-xs font-semibold text-[#0F1F1C] hover:text-[#0F766E]"
                        >
                          {checked ? (
                            <CheckSquare className="h-4 w-4 text-[#0F766E] shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-[#94A39F] shrink-0" />
                          )}
                          <span className={checked ? 'line-through text-[#647571]' : ''}>
                            {row.heading}
                          </span>
                        </button>
                        <p className={`pl-6 text-xs sm:text-sm leading-relaxed ${checked ? 'text-[#7C8C88]' : 'text-[#445652]'}`}>
                          {row.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#EDF1EE] flex items-center justify-between">
                <span className="text-[11px] text-[#647571]">
                  {aiSlot ? 'Personalized by Gemini' : 'Forecast-based baseline'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onToggleSave({
                      title: saveTitle,
                      body: `Outdoor: ${outdoorText}\nCommute: ${commuteText}\nFamily: ${familyText}`,
                      category: 'planner',
                      locationName: environment?.location.name ?? 'Selected Location',
                      aqiAtSave: windowData.avgAqi,
                      language,
                    })
                  }
                  className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                    isSaved ? 'text-[#0F766E]' : 'text-[#526460] hover:text-[#0F1F1C]'
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {isSaved ? 'Saved' : 'Save Routine'}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
