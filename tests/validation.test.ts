import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createExpressApp } from '../server';

describe('Backend Input Validation & Security', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createExpressApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('GET /api/health', () => {
    it('returns status ok and does not expose raw secret API keys', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('FreshAir-AI');
      expect(typeof data.geminiConfigured).toBe('boolean');
      // Must never return key strings
      expect(data.geminiApiKey).toBeUndefined();
      expect(data.apiKey).toBeUndefined();
    });

    it('sets standard security and rate limiting headers', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      // Rate limit headers
      const hasRateLimit = res.headers.has('ratelimit-limit') || res.headers.has('ratelimit');
      expect(hasRateLimit).toBe(true);
      // Helmet security headers
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    });
  });

  describe('GET /api/locations/search validation', () => {
    it('rejects queries shorter than 2 characters with 400', async () => {
      const res = await fetch(`${baseUrl}/api/locations/search?q=a`);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('between 2 and 100 characters');
    });

    it('rejects queries longer than 100 characters with 400', async () => {
      const longQuery = 'x'.repeat(101);
      const res = await fetch(`${baseUrl}/api/locations/search?q=${longQuery}`);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('between 2 and 100 characters');
    });
  });

  describe('GET /api/environment validation', () => {
    it('rejects missing latitude or longitude with 400', async () => {
      const res1 = await fetch(`${baseUrl}/api/environment?lat=28.61`);
      expect(res1.status).toBe(400);
      const res2 = await fetch(`${baseUrl}/api/environment?lon=77.20`);
      expect(res2.status).toBe(400);
    });

    it('rejects out-of-range coordinates with 400', async () => {
      // Latitude > 90
      const res1 = await fetch(`${baseUrl}/api/environment?lat=95.0&lon=77.2`);
      expect(res1.status).toBe(400);

      // Longitude > 180
      const res2 = await fetch(`${baseUrl}/api/environment?lat=28.6&lon=195.0`);
      expect(res2.status).toBe(400);

      // Non-numeric
      const res3 = await fetch(`${baseUrl}/api/environment?lat=invalid&lon=77.2`);
      expect(res3.status).toBe(400);
    });
  });

  describe('POST /api/ai/chat validation', () => {
    it('rejects empty message array with 400', async () => {
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('At least one message is required');
    });

    it('rejects messages array exceeding 50 turns with 400', async () => {
      const tooManyMessages = Array.from({ length: 51 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: tooManyMessages }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('turn length');
    });
  });

  describe('POST /api/ai/indoor-advice validation', () => {
    it('rejects invalid or extreme room area with 400', async () => {
      // Too small (< 20 sq ft)
      const res1 = await fetch(`${baseUrl}/api/ai/indoor-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomDetails: { areaSqFt: 5 } }),
      });
      expect(res1.status).toBe(400);
      const body1 = await res1.json();
      expect(body1.error).toContain('between 20 and 5000 sq ft');

      // Too large (> 5000 sq ft)
      const res2 = await fetch(`${baseUrl}/api/ai/indoor-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomDetails: { areaSqFt: 9000 } }),
      });
      expect(res2.status).toBe(400);

      // Non-numeric
      const res3 = await fetch(`${baseUrl}/api/ai/indoor-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomDetails: { areaSqFt: 'invalid' } }),
      });
      expect(res3.status).toBe(400);
    });
  });
});
