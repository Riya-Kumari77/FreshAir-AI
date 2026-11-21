import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { LayoutShell } from './components/LayoutShell';
import { LocationSelectorModal } from './components/LocationSelectorModal';
import { DashboardView } from './components/DashboardView';
import { AssistantView } from './components/AssistantView';
import { DailyPlannerView } from './components/DailyPlannerView';
import { DEFAULT_USER_PROFILE } from './data/constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  fetchDashboardAiRecommendations,
  fetchEnvironmentApi,
} from './services/api';
import type {
  AppTab,
  DashboardAiResponse,
  EnvironmentalSnapshot,
  LanguageCode,
  LocationInfo,
  SavedRecommendation,
  UserProfile,
} from './types/freshair';

const IndoorAirView = React.lazy(() =>
  import('./components/IndoorAirView').then((m) => ({ default: m.IndoorAirView })),
);
const SustainabilityView = React.lazy(() =>
  import('./components/SustainabilityView').then((m) => ({ default: m.SustainabilityView })),
);
const ProfileView = React.lazy(() =>
  import('./components/ProfileView').then((m) => ({ default: m.ProfileView })),
);

function ViewLoadingFallback() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading view">
      <div className="h-8 w-64 bg-[#E6ECE9] rounded-lg" />
      <div className="h-48 bg-white border border-[#E2E8E4] rounded-xl" />
      <div className="h-64 bg-white border border-[#E2E8E4] rounded-xl" />
    </div>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [profile, setProfile] = useLocalStorage<UserProfile>(
    'freshair_user_profile_v1',
    DEFAULT_USER_PROFILE,
  );
  const [savedItems, setSavedItems] = useLocalStorage<SavedRecommendation[]>(
    'freshair_saved_recs_v1',
    [],
  );

  const [location, setLocation] = useState<LocationInfo>(profile.defaultLocation);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [environment, setEnvironment] = useState<EnvironmentalSnapshot | null>(null);
  const [envLoading, setEnvLoading] = useState<boolean>(true);
  const [envError, setEnvError] = useState<string | null>(null);

  const [aiRecommendations, setAiRecommendations] = useState<DashboardAiResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const lastAiContextKey = useRef<string>('');
  const envReqIdRef = useRef<number>(0);
  const aiReqIdRef = useRef<number>(0);

  const loadEnvironment = useCallback(
    async (targetLocation: LocationInfo, forceRefresh = false) => {
      const reqId = ++envReqIdRef.current;
      setEnvLoading(true);
      setEnvError(null);
      try {
        const snapshot = await fetchEnvironmentApi(targetLocation, forceRefresh);
        if (reqId !== envReqIdRef.current) return;
        setEnvironment(snapshot);
      } catch (err) {
        if (reqId !== envReqIdRef.current) return;
        setEnvError(
          err instanceof Error
            ? err.message
            : 'Unable to reach Open-Meteo environmental service.',
        );
      } finally {
        if (reqId === envReqIdRef.current) {
          setEnvLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadEnvironment(location, false);
  }, [location, loadEnvironment]);

  const generateDashboardAi = useCallback(
    async (envSnapshot: EnvironmentalSnapshot, userProfile: UserProfile) => {
      const reqId = ++aiReqIdRef.current;
      setAiLoading(true);
      setAiError(null);
      try {
        const data = await fetchDashboardAiRecommendations(
          envSnapshot,
          userProfile,
          userProfile.language,
        );
        if (reqId !== aiReqIdRef.current) return;
        setAiRecommendations(data);
        lastAiContextKey.current = `${envSnapshot.location.latitude}:${envSnapshot.location.longitude}:${userProfile.language}`;
      } catch (err) {
        if (reqId !== aiReqIdRef.current) return;
        setAiError(
          err instanceof Error ? err.message : 'Unable to generate Gemini recommendations.',
        );
      } finally {
        if (reqId === aiReqIdRef.current) {
          setAiLoading(false);
        }
      }
    },
    [],
  );

  // Auto-generate dashboard AI recommendations once live data arrives for a new location/language
  useEffect(() => {
    if (!environment || environment.airQuality.status === 'unavailable') return;
    const key = `${environment.location.latitude}:${environment.location.longitude}:${profile.language}`;
    if (lastAiContextKey.current !== key) {
      lastAiContextKey.current = key;
      void generateDashboardAi(environment, profile);
    }
  }, [environment, profile, generateDashboardAi]);

  const handleLanguageChange = (nextLang: LanguageCode) => {
    setProfile((prev) => ({ ...prev, language: nextLang }));
  };

  const handleSelectLocation = (nextLoc: LocationInfo) => {
    setLocation(nextLoc);
    setAiRecommendations(null);
    setAiError(null);
    lastAiContextKey.current = '';
  };

  const handleToggleSaveRecommendation = (
    candidate: Omit<SavedRecommendation, 'id' | 'savedAt'>,
  ) => {
    setSavedItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.category === candidate.category &&
          (item.title === candidate.title || item.body === candidate.body),
      );
      if (existing) {
        return prev.filter((item) => item.id !== existing.id);
      }
      return [
        {
          ...candidate,
          id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  };

  const handleRemoveSavedItem = (id: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <LayoutShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      location={location}
      onOpenLocationPicker={() => setLocationModalOpen(true)}
      onRefreshData={() => void loadEnvironment(location, true)}
      isRefreshing={envLoading}
      language={profile.language}
      onChangeLanguage={handleLanguageChange}
      savedCount={savedItems.length}
    >
      {activeTab === 'dashboard' && (
        <DashboardView
          environment={environment}
          envLoading={envLoading}
          envError={envError}
          onRetryEnv={() => void loadEnvironment(location, true)}
          profile={profile}
          language={profile.language}
          aiRecommendations={aiRecommendations}
          aiLoading={aiLoading}
          aiError={aiError}
          onGenerateAi={() => {
            if (environment) {
              void generateDashboardAi(environment, profile);
            }
          }}
          savedItems={savedItems}
          onToggleSave={handleToggleSaveRecommendation}
          onOpenAssistant={() => setActiveTab('assistant')}
        />
      )}

      {activeTab === 'assistant' && (
        <AssistantView
          environment={environment}
          profile={profile}
          language={profile.language}
          onChangeLanguage={handleLanguageChange}
          savedItems={savedItems}
          onToggleSave={handleToggleSaveRecommendation}
        />
      )}

      {activeTab === 'planner' && (
        <DailyPlannerView
          environment={environment}
          profile={profile}
          language={profile.language}
          savedItems={savedItems}
          onToggleSave={handleToggleSaveRecommendation}
        />
      )}

      {activeTab === 'indoor' && (
        <Suspense fallback={<ViewLoadingFallback />}>
          <IndoorAirView
            environment={environment}
            profile={profile}
            language={profile.language}
            savedItems={savedItems}
            onToggleSave={handleToggleSaveRecommendation}
          />
        </Suspense>
      )}

      {activeTab === 'sustainability' && (
        <Suspense fallback={<ViewLoadingFallback />}>
          <SustainabilityView
            language={profile.language}
            defaultCommuteKm={profile.dailyCommuteKm}
          />
        </Suspense>
      )}

      {activeTab === 'profile' && (
        <Suspense fallback={<ViewLoadingFallback />}>
          <ProfileView
            profile={profile}
            onUpdateProfile={(next) => {
              setProfile(next);
              if (next.defaultLocation.id !== profile.defaultLocation.id) {
                handleSelectLocation(next.defaultLocation);
              }
            }}
            activeLocation={location}
            onOpenLocationPicker={() => setLocationModalOpen(true)}
            savedItems={savedItems}
            onRemoveSavedItem={handleRemoveSavedItem}
          />
        </Suspense>
      )}

      <LocationSelectorModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={handleSelectLocation}
        language={profile.language}
      />
    </LayoutShell>
  );
}

export default App;
