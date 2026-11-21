import { GoogleGenAI, Type } from '@google/genai';
import type {
  DailyPeriodWindow,
  DailyPlanAiResponse,
  DashboardAiResponse,
  EnvironmentalSnapshot,
  IndoorAdviceAiResponse,
  LanguageCode,
  UserProfile,
} from '../../src/types/freshair.ts';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in Settings > Secrets.',
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 503;
    err.code = 'MISSING_API_KEY';
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientDemandError(error: unknown): boolean {
  const e = error as { status?: number; message?: string };
  const msg = e?.message ?? '';
  return (
    e?.status === 503 ||
    msg.includes('"code":503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand')
  );
}

function isRateLimitError(error: unknown): boolean {
  const e = error as { status?: number; message?: string };
  const msg = e?.message ?? '';
  return e?.status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('"code":429');
}

function safeJsonParse<T>(rawText: string): T {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: string;
    config?: Record<string, unknown>;
  },
) {
  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: PRIMARY_MODEL, delayMs: 0 },
    { model: FALLBACK_MODEL, delayMs: 350 },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }
    try {
      return await ai.models.generateContent({
        model: attempt.model,
        contents: params.contents,
        config: params.config,
      });
    } catch (err) {
      lastError = err;
      if (!isTransientDemandError(err) && !isRateLimitError(err)) {
        throw err;
      }
    }
  }
  throw lastError;
}

function fmtReading(value: number | null, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'UNAVAILABLE (do not guess or invent)';
  }
  return `${value} ${unit}`.trim();
}

function buildVerifiedContextBlock(
  env: EnvironmentalSnapshot | null,
  profile?: Partial<UserProfile>,
): string {
  const lines: string[] = [];

  if (!env) {
    lines.push('ENVIRONMENTAL DATA: Currently unavailable from Open-Meteo.');
  } else {
    lines.push(
      `LOCATION: ${env.location.name}${env.location.region ? `, ${env.location.region}` : ''}${env.location.country ? `, ${env.location.country}` : ''} (${env.location.latitude}, ${env.location.longitude})`,
    );
    lines.push(`DATA SOURCE: ${env.airQuality.source} & ${env.weather.source}`);
    lines.push(`AIR QUALITY STATUS: ${env.airQuality.status.toUpperCase()}`);
    lines.push(`MEASURED AT (LOCAL): ${env.airQuality.measuredAt ?? 'UNAVAILABLE'}`);
    lines.push(`- US AQI: ${fmtReading(env.airQuality.usAqi, '(0-500 scale)')}`);
    lines.push(`- European AQI: ${fmtReading(env.airQuality.europeanAqi, '')}`);
    lines.push(`- PM2.5: ${fmtReading(env.airQuality.pm25, 'µg/m³')}`);
    lines.push(`- PM10: ${fmtReading(env.airQuality.pm10, 'µg/m³')}`);
    lines.push(`- NO2: ${fmtReading(env.airQuality.no2, 'µg/m³')}`);
    lines.push(`- Ozone (O3): ${fmtReading(env.airQuality.o3, 'µg/m³')}`);
    lines.push(`- SO2: ${fmtReading(env.airQuality.so2, 'µg/m³')}`);
    lines.push(`- Carbon Monoxide (CO): ${fmtReading(env.airQuality.co, 'µg/m³')}`);
    lines.push(`- Dust: ${fmtReading(env.airQuality.dust, 'µg/m³')}`);
    lines.push(`- UV Index: ${fmtReading(env.airQuality.uvIndex, '')}`);
    lines.push(`WEATHER STATUS: ${env.weather.status.toUpperCase()}`);
    lines.push(`- Condition: ${env.weather.conditionLabel}`);
    lines.push(`- Temperature: ${fmtReading(env.weather.temperatureC, '°C')}`);
    lines.push(`- Feels Like: ${fmtReading(env.weather.apparentTemperatureC, '°C')}`);
    lines.push(`- Humidity: ${fmtReading(env.weather.humidityPercent, '%')}`);
    lines.push(`- Wind Speed: ${fmtReading(env.weather.windSpeedKmh, 'km/h')}`);
  }

  if (profile) {
    lines.push('');
    lines.push('USER PROFILE PREFERENCES:');
    lines.push(`- Household Group: ${profile.householdGroup ?? 'general'}`);
    lines.push(`- Respiratory Sensitivity: ${profile.respiratorySensitivity ?? 'none'}`);
    lines.push(`- Primary Commute: ${profile.commuteMode ?? 'public_transit'} (${profile.dailyCommuteKm ?? 10} km/day)`);
    lines.push(`- Has HEPA Air Purifier: ${profile.hasAirPurifier ? 'Yes' : 'No'}`);
    lines.push(`- Cooking Fuel: ${profile.cookingFuel ?? 'lpg_png'}`);
  }

  return lines.join('\n');
}

function languageInstruction(language: LanguageCode): string {
  if (language === 'hi') {
    return 'Respond clearly and naturally in Hindi (Devanagari script). Keep technical pollutant symbols like PM2.5, PM10, AQI, NO2, O3, CO2, and µg/m³ readable in standard notation.';
  }
  return 'Respond in clear, calm, practical English suitable for families and urban residents.';
}

const CORE_SAFETY_RULES = `STRICT RULES:
1. NEVER fabricate, estimate, or invent AQI, PM2.5, PM10, pollutant, or weather numbers.
2. Only cite measurements explicitly provided in the VERIFIED ENVIRONMENTAL CONTEXT below. If a reading is marked UNAVAILABLE, state plainly that it is unavailable.
3. Keep all health guidance strictly informational and precautionary — never diagnose medical conditions or replace licensed doctors or official public health advisories.
4. Keep advice concrete, actionable, and tailored to urban smog and everyday family living.`;

function extractReadableErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Raw message is plain text
  }
  return raw;
}

function normalizeGeminiError(error: unknown): { statusCode: number; message: string; code: string } {
  const errObj = error as { statusCode?: number; status?: number; code?: string; message?: string };
  const rawMessage = errObj?.message || 'Unable to generate AI response right now.';
  const cleanMessage = extractReadableErrorMessage(rawMessage);

  if (errObj?.code === 'MISSING_API_KEY') {
    return { statusCode: 503, message: cleanMessage, code: 'MISSING_API_KEY' };
  }
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED') || errObj?.status === 403) {
    return {
      statusCode: 403,
      message: 'Gemini API authentication failed. Please check your API key in Settings > Secrets.',
      code: 'API_KEY_ERROR',
    };
  }
  if (isRateLimitError(error)) {
    return {
      statusCode: 429,
      message: 'Gemini API rate limit reached. Please wait a moment and try again, or verify your key quota in Settings > Secrets.',
      code: 'RATE_LIMITED',
    };
  }
  if (isTransientDemandError(error)) {
    return {
      statusCode: 503,
      message: 'Gemini is temporarily experiencing high demand. Please retry in a few seconds.',
      code: 'MODEL_BUSY',
    };
  }
  return {
    statusCode: errObj?.statusCode || 502,
    message: cleanMessage,
    code: 'GEMINI_UPSTREAM_ERROR',
  };
}

export async function generateDashboardRecommendations(
  env: EnvironmentalSnapshot,
  profile: Partial<UserProfile>,
  language: LanguageCode,
): Promise<DashboardAiResponse> {
  try {
    const ai = getGeminiClient();
    const contextBlock = buildVerifiedContextBlock(env, profile);

    const response = await generateWithRetry(ai, {
      contents: `Based strictly on the verified Open-Meteo environmental readings and user profile below, provide a concise air quality briefing (2 sentences) and 4 practical, personalized recommendations covering: Health & Exposure, Outdoor Timing, Indoor Protection, and Commute & Sustainability.\n\n${contextBlock}`,
      config: {
        systemInstruction: `${CORE_SAFETY_RULES}\n${languageInstruction(language)}\nReturn structured JSON matching the schema.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            briefing: {
              type: Type.STRING,
              description: 'Concise 2-sentence interpretation of current verified air quality and weather.',
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  actionSteps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['category', 'title', 'summary', 'actionSteps'],
              },
            },
            disclaimer: {
              type: Type.STRING,
              description: 'Brief 1-sentence responsible informational notice.',
            },
          },
          required: ['briefing', 'recommendations', 'disclaimer'],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    const parsed = safeJsonParse<{
      briefing: string;
      recommendations: Array<{
        category: string;
        title: string;
        summary: string;
        actionSteps: string[];
      }>;
      disclaimer: string;
    }>(rawText);

    return {
      briefing: parsed.briefing,
      recommendations: (parsed.recommendations ?? []).slice(0, 4).map((rec, idx) => ({
        id: `rec-${Date.now()}-${idx}`,
        category: rec.category,
        title: rec.title,
        summary: rec.summary,
        actionSteps: Array.isArray(rec.actionSteps) ? rec.actionSteps.slice(0, 3) : [],
      })),
      disclaimer:
        parsed.disclaimer ||
        (language === 'hi'
          ? 'यह जानकारी सामान्य जागरूकता के लिए है, चिकित्सीय सलाह का विकल्प नहीं है।'
          : 'Informational guidance only; not medical advice or a replacement for official air advisories.'),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw normalizeGeminiError(error);
  }
}

export async function generateAssistantChatReply(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  env: EnvironmentalSnapshot | null,
  profile: Partial<UserProfile>,
  language: LanguageCode,
): Promise<{ reply: string; generatedAt: string }> {
  try {
    const ai = getGeminiClient();
    const contextBlock = buildVerifiedContextBlock(env, profile);

    const recentHistory = messages.slice(-10);
    const transcript = recentHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'FreshAir-AI'}: ${m.content}`)
      .join('\n\n');

    const response = await generateWithRetry(ai, {
      contents: `VERIFIED ENVIRONMENTAL CONTEXT:\n${contextBlock}\n\nCONVERSATION:\n${transcript}\n\nAnswer the latest user message concisely with practical, easy-to-scan bullet points where helpful (under 220 words).`,
      config: {
        systemInstruction: `You are FreshAir-AI, a calm, evidence-grounded urban air quality companion.\n${CORE_SAFETY_RULES}\n${languageInstruction(language)}`,
      },
    });

    const reply = (response.text ?? '').trim();
    if (!reply) {
      throw new Error('Empty response received from Gemini.');
    }

    return {
      reply,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw normalizeGeminiError(error);
  }
}

export async function generatePersonalizedDailyPlan(
  env: EnvironmentalSnapshot,
  profile: Partial<UserProfile>,
  periods: DailyPeriodWindow[],
  language: LanguageCode,
): Promise<DailyPlanAiResponse> {
  try {
    const ai = getGeminiClient();
    const contextBlock = buildVerifiedContextBlock(env, profile);
    const periodSummary = periods
      .map(
        (p) =>
          `- ${p.period.toUpperCase()} (${p.timeRange}): Avg US AQI = ${p.avgAqi ?? 'UNAVAILABLE'}, Range = ${p.minAqi ?? 'N/A'}–${p.maxAqi ?? 'N/A'}, Avg PM2.5 = ${p.avgPm25 !== null ? `${p.avgPm25} µg/m³` : 'UNAVAILABLE'}`,
      )
      .join('\n');

    const response = await generateWithRetry(ai, {
      contents: `Create a personalized Morning, Afternoon, and Evening routine using ONLY the verified current readings and hourly forecast windows below.\n\n${contextBlock}\n\nVERIFIED HOURLY FORECAST WINDOWS:\n${periodSummary}`,
      config: {
        systemInstruction: `${CORE_SAFETY_RULES}\n${languageInstruction(language)}\nReturn structured JSON with exactly 3 slots: morning, afternoon, evening.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            daySummary: { type: Type.STRING },
            slots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  period: { type: Type.STRING },
                  title: { type: Type.STRING },
                  outdoorActivity: { type: Type.STRING },
                  commuteSuggestion: { type: Type.STRING },
                  familyTip: { type: Type.STRING },
                },
                required: ['period', 'title', 'outdoorActivity', 'commuteSuggestion', 'familyTip'],
              },
            },
            disclaimer: { type: Type.STRING },
          },
          required: ['daySummary', 'slots', 'disclaimer'],
        },
      },
    });

    const parsed = safeJsonParse<{
      daySummary: string;
      slots: Array<{
        period: string;
        title: string;
        outdoorActivity: string;
        commuteSuggestion: string;
        familyTip: string;
      }>;
      disclaimer: string;
    }>((response.text ?? '').trim());

    const allowedPeriods: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
    const normalizedSlots = allowedPeriods.map((p, i) => {
      const match =
        parsed.slots?.find((s) => s.period?.toLowerCase() === p) ?? parsed.slots?.[i];
      return {
        period: p,
        title: match?.title ?? p.charAt(0).toUpperCase() + p.slice(1),
        outdoorActivity: match?.outdoorActivity ?? '',
        commuteSuggestion: match?.commuteSuggestion ?? '',
        familyTip: match?.familyTip ?? '',
      };
    });

    return {
      daySummary: parsed.daySummary,
      slots: normalizedSlots,
      disclaimer:
        parsed.disclaimer ||
        'Informational daily guidance based on Open-Meteo forecast; adjust for local conditions and official advisories.',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw normalizeGeminiError(error);
  }
}

export async function generateIndoorRoomAdvice(
  env: EnvironmentalSnapshot | null,
  profile: Partial<UserProfile>,
  roomDetails: { roomType: string; areaSqFt: number; concern: string },
  language: LanguageCode,
): Promise<IndoorAdviceAiResponse> {
  try {
    const ai = getGeminiClient();
    const contextBlock = buildVerifiedContextBlock(env, profile);

    const response = await generateWithRetry(ai, {
      contents: `Provide practical indoor air quality recommendations for a ${roomDetails.roomType} (~${roomDetails.areaSqFt} sq ft) with primary concern: "${roomDetails.concern}".\n\n${contextBlock}`,
      config: {
        systemInstruction: `${CORE_SAFETY_RULES}\n${languageInstruction(language)}\nReturn concise, structured JSON.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            priorityActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            ventilationTiming: { type: Type.STRING },
            disclaimer: { type: Type.STRING },
          },
          required: ['summary', 'priorityActions', 'ventilationTiming', 'disclaimer'],
        },
      },
    });

    const parsed = safeJsonParse<{
      summary: string;
      priorityActions: string[];
      ventilationTiming: string;
      disclaimer: string;
    }>((response.text ?? '').trim());

    return {
      summary: parsed.summary,
      priorityActions: Array.isArray(parsed.priorityActions) ? parsed.priorityActions.slice(0, 5) : [],
      ventilationTiming: parsed.ventilationTiming,
      disclaimer:
        parsed.disclaimer ||
        'General indoor air improvement guidance; not medical advice.',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw normalizeGeminiError(error);
  }
}
