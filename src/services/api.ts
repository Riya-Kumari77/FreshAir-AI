import type {
  DailyPeriodWindow,
  DailyPlanAiResponse,
  DashboardAiResponse,
  EnvironmentalSnapshot,
  IndoorAdviceAiResponse,
  LanguageCode,
  LocationInfo,
  UserProfile,
} from '../types/freshair';

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Unexpected response from server (HTTP ${response.status}).`);
    }
  }

  if (!response.ok) {
    const errMsg =
      (parsed as { error?: string } | null)?.error ||
      `Request failed with status ${response.status}.`;
    throw new Error(errMsg);
  }
  return parsed as T;
}

export async function searchLocationsApi(query: string): Promise<LocationInfo[]> {
  const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`);
  const data = await parseJsonOrThrow<{ results: LocationInfo[] }>(res);
  return data.results ?? [];
}

export async function fetchEnvironmentApi(
  location: LocationInfo,
  forceRefresh = false,
): Promise<EnvironmentalSnapshot> {
  const params = new URLSearchParams({
    id: location.id,
    name: location.name,
    region: location.region,
    country: location.country,
    lat: String(location.latitude),
    lon: String(location.longitude),
    refresh: forceRefresh ? 'true' : 'false',
  });
  const res = await fetch(`/api/environment?${params.toString()}`);
  return parseJsonOrThrow<EnvironmentalSnapshot>(res);
}

export async function fetchDashboardAiRecommendations(
  environment: EnvironmentalSnapshot,
  profile: UserProfile,
  language: LanguageCode,
): Promise<DashboardAiResponse> {
  const res = await fetch('/api/ai/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ environment, profile, language }),
  });
  return parseJsonOrThrow<DashboardAiResponse>(res);
}

export async function sendAssistantChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  environment: EnvironmentalSnapshot | null,
  profile: UserProfile,
  language: LanguageCode,
): Promise<{ reply: string; generatedAt: string }> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, environment, profile, language }),
  });
  return parseJsonOrThrow<{ reply: string; generatedAt: string }>(res);
}

export async function fetchPersonalizedDailyPlan(
  environment: EnvironmentalSnapshot,
  profile: UserProfile,
  periods: DailyPeriodWindow[],
  language: LanguageCode,
): Promise<DailyPlanAiResponse> {
  const res = await fetch('/api/ai/daily-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ environment, profile, periods, language }),
  });
  return parseJsonOrThrow<DailyPlanAiResponse>(res);
}

export async function fetchIndoorRoomAdvice(
  environment: EnvironmentalSnapshot | null,
  profile: UserProfile,
  roomDetails: { roomType: string; areaSqFt: number; concern: string },
  language: LanguageCode,
): Promise<IndoorAdviceAiResponse> {
  const res = await fetch('/api/ai/indoor-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ environment, profile, roomDetails, language }),
  });
  return parseJsonOrThrow<IndoorAdviceAiResponse>(res);
}
