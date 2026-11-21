import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchEnvironmentalData,
  searchLocations,
} from './server/services/openMeteo.ts';
import {
  generateAssistantChatReply,
  generateDashboardRecommendations,
  generateIndoorRoomAdvice,
  generatePersonalizedDailyPlan,
} from './server/services/geminiService.ts';
import type {
  DailyPeriodWindow,
  EnvironmentalSnapshot,
  LanguageCode,
  LocationInfo,
  UserProfile,
} from './src/types/freshair.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function parseLanguage(value: unknown): LanguageCode {
  return value === 'hi' ? 'hi' : 'en';
}

function sendNormalizedError(res: express.Response, err: unknown, fallbackMessage: string) {
  const e = err as { statusCode?: number; message?: string; code?: string };
  const status = typeof e?.statusCode === 'number' && e.statusCode >= 400 && e.statusCode < 600
    ? e.statusCode
    : 500;

  let message = typeof e?.message === 'string' && e.message.trim() ? e.message : fallbackMessage;

  // Redact any accidental secret/API key strings
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey && apiKey.length > 5 && message.includes(apiKey)) {
    message = message.replaceAll(apiKey, '[REDACTED_SECRET]');
  }

  res.status(status).json({
    error: message,
    code: e?.code || 'INTERNAL_ERROR',
  });
}

export function createExpressApp(): express.Express {
  const app = express();

  // HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: IS_PROD
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              connectSrc: [
                "'self'",
                'https://air-quality-api.open-meteo.com',
                'https://api.open-meteo.com',
                'https://geocoding-api.open-meteo.com',
              ],
              imgSrc: ["'self'", 'data:', 'https:'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  // General API rate limiter (180 requests/minute per client IP)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this client. Please slow down and try again shortly.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  });
  app.use('/api/', apiLimiter);

  // Stricter rate limiter for Gemini Generative AI endpoints (30 requests/minute per client IP)
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'AI request limit reached. Please wait a moment before sending more queries.',
      code: 'AI_RATE_LIMIT_EXCEEDED',
    },
  });
  app.use('/api/ai/', aiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'FreshAir-AI',
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  app.get('/api/locations/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2 || q.length > 100) {
        res.status(400).json({ error: 'Search query must be between 2 and 100 characters.' });
        return;
      }
      const results = await searchLocations(q);
      res.json({ results });
    } catch (error) {
      sendNormalizedError(res, error, 'Unable to search locations via Open-Meteo.');
    }
  });

  app.get('/api/environment', async (req, res) => {
    try {
      const latRaw = typeof req.query.lat === 'string' ? req.query.lat.trim() : '';
      const lonRaw = typeof req.query.lon === 'string' ? req.query.lon.trim() : '';
      if (!latRaw || !lonRaw) {
        res.status(400).json({ error: 'Both latitude and longitude query parameters are required.' });
        return;
      }

      const lat = Number(latRaw);
      const lon = Number(lonRaw);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        res.status(400).json({ error: 'Valid latitude (-90..90) and longitude (-180..180) are required.' });
        return;
      }

      const location: LocationInfo = {
        id: typeof req.query.id === 'string' && req.query.id.trim() ? req.query.id.trim().slice(0, 64) : `${lat.toFixed(4)}_${lon.toFixed(4)}`,
        name: typeof req.query.name === 'string' && req.query.name.trim() ? req.query.name.trim().slice(0, 80) : 'Selected Location',
        region: typeof req.query.region === 'string' ? req.query.region.trim().slice(0, 80) : '',
        country: typeof req.query.country === 'string' ? req.query.country.trim().slice(0, 80) : '',
        latitude: Number(lat.toFixed(4)),
        longitude: Number(lon.toFixed(4)),
      };

      const forceRefresh = req.query.refresh === 'true';
      const snapshot = await fetchEnvironmentalData(location, forceRefresh);
      res.json(snapshot);
    } catch (error) {
      sendNormalizedError(res, error, 'Failed to fetch environmental readings.');
    }
  });

  app.post('/api/ai/recommendations', async (req, res) => {
    try {
      const { environment, profile, language } = req.body as {
        environment?: EnvironmentalSnapshot;
        profile?: Partial<UserProfile>;
        language?: LanguageCode;
      };

      if (
        !environment ||
        typeof environment !== 'object' ||
        !environment.location ||
        typeof environment.location.name !== 'string' ||
        !environment.airQuality ||
        typeof environment.airQuality !== 'object'
      ) {
        res.status(400).json({ error: 'Valid environmental context is required to generate recommendations.' });
        return;
      }

      const data = await generateDashboardRecommendations(
        environment,
        profile ?? {},
        parseLanguage(language ?? profile?.language),
      );
      res.json(data);
    } catch (error) {
      sendNormalizedError(res, error, 'Unable to generate AI recommendations.');
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { messages, environment, profile, language } = req.body as {
        messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
        environment?: EnvironmentalSnapshot | null;
        profile?: Partial<UserProfile>;
        language?: LanguageCode;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'At least one message is required.' });
        return;
      }

      if (messages.length > 50) {
        res.status(400).json({ error: 'Conversation exceeds maximum allowed turn length (50 messages).' });
        return;
      }

      const sanitizedMessages = messages
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0,
        )
        .map((m) => ({
          role: m.role,
          content: m.content.trim().slice(0, 2000),
        }));

      if (sanitizedMessages.length === 0) {
        res.status(400).json({ error: 'Message content cannot be empty.' });
        return;
      }

      const data = await generateAssistantChatReply(
        sanitizedMessages,
        environment ?? null,
        profile ?? {},
        parseLanguage(language ?? profile?.language),
      );
      res.json(data);
    } catch (error) {
      sendNormalizedError(res, error, 'Unable to reach FreshAir-AI Assistant.');
    }
  });

  app.post('/api/ai/daily-plan', async (req, res) => {
    try {
      const { environment, profile, periods, language } = req.body as {
        environment?: EnvironmentalSnapshot;
        profile?: Partial<UserProfile>;
        periods?: DailyPeriodWindow[];
        language?: LanguageCode;
      };

      if (
        !environment ||
        typeof environment !== 'object' ||
        !environment.location ||
        !Array.isArray(periods) ||
        periods.length === 0
      ) {
        res.status(400).json({ error: 'Environmental context and hourly periods are required.' });
        return;
      }

      const data = await generatePersonalizedDailyPlan(
        environment,
        profile ?? {},
        periods.slice(0, 6),
        parseLanguage(language ?? profile?.language),
      );
      res.json(data);
    } catch (error) {
      sendNormalizedError(res, error, 'Unable to personalize daily plan.');
    }
  });

  app.post('/api/ai/indoor-advice', async (req, res) => {
    try {
      const { environment, profile, roomDetails, language } = req.body as {
        environment?: EnvironmentalSnapshot | null;
        profile?: Partial<UserProfile>;
        roomDetails?: { roomType?: string; areaSqFt?: number; concern?: string };
        language?: LanguageCode;
      };

      const areaSqFt = Number(roomDetails?.areaSqFt);
      if (!Number.isFinite(areaSqFt) || areaSqFt < 20 || areaSqFt > 5000) {
        res.status(400).json({ error: 'Room area must be between 20 and 5000 sq ft.' });
        return;
      }

      const data = await generateIndoorRoomAdvice(
        environment ?? null,
        profile ?? {},
        {
          roomType: String(roomDetails?.roomType || 'Living Room').slice(0, 60),
          areaSqFt,
          concern: String(roomDetails?.concern || 'Winter smog and indoor dust').slice(0, 160),
        },
        parseLanguage(language ?? profile?.language),
      );
      res.json(data);
    } catch (error) {
      sendNormalizedError(res, error, 'Unable to generate indoor air plan.');
    }
  });

  // Catch malformed JSON payloads and unhandled API errors cleanly as JSON
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
      res.status(400).json({ error: 'Malformed JSON request body.', code: 'INVALID_JSON' });
      return;
    }
    if (req.path.startsWith('/api/')) {
      sendNormalizedError(res, err, 'Unexpected server error.');
      return;
    }
    next(err);
  });

  return app;
}

async function startServer() {
  const app = createExpressApp();

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FreshAir-AI server running on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`);
  });
}

if (!process.env.VITEST) {
  startServer().catch((err) => {
    console.error('Failed to start FreshAir-AI server:', err);
    process.exit(1);
  });
}
