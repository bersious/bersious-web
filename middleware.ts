import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

/**
 * Edge Middleware — log every visitor to Upstash Redis.
 * Captures: timestamp, IP, user-agent, country/city/region (from Vercel headers),
 *           device type, browser, OS, referrer, path.
 *
 * Skips: /api/* (own internal calls) and /secret-stats (caller, not visitor).
 * Safe: any error here is swallowed — middleware NEVER blocks the page.
 */
export const config = {
  matcher: [
    '/((?!_next/|favicon|assets/|api/visitors|secret-stats|sw\\.js|manifest\\.json).*)',
  ],
};

interface VisitorEntry {
  ts: number;
  ip: string;
  city: string;
  country: string;
  region: string;
  ua: string;
  device: string;
  browser: string;
  os: string;
  ref: string;
  path: string;
  lang: string;
}

const MAX_ENTRIES = 2000;

// Lazily-initialized Redis client. We try multiple env var name shapes
// because Upstash names them based on the database name (e.g. "dailys_KV_REST_API_URL")
// while @upstash/redis reads the standard "UPSTASH_REDIS_REST_URL".
let redisClient: Redis | null = null;
let redisInitTried = false;

function getRedis(): Redis | null {
  if (redisInitTried) return redisClient;
  redisInitTried = true;
  try {
    const url =
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      process.env.dailys_KV_REST_API_URL ||
      process.env.bersious_visitors_KV_REST_API_URL;
    const token =
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      process.env.dailys_KV_REST_API_TOKEN ||
      process.env.bersious_visitors_KV_REST_API_TOKEN;
    if (!url || !token) {
      console.warn('[middleware] Redis env vars not found — logging disabled');
      return null;
    }
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (e) {
    console.error('[middleware] Failed to init Redis client:', e);
    return null;
  }
}

function parseDevice(ua: string): { device: string; browser: string; os: string } {
  const u = ua.toLowerCase();
  if (/(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|preview|monitor)/.test(u)) {
    return { device: 'bot', browser: 'bot', os: 'bot' };
  }
  let device = 'desktop';
  if (/ipad|tablet|playbook|silk/.test(u)) device = 'tablet';
  else if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/.test(u)) device = 'mobile';
  let browser = 'unknown';
  if (/edg\//.test(u)) browser = 'Edge';
  else if (/opr\/|opera/.test(u)) browser = 'Opera';
  else if (/chrome|crios/.test(u)) browser = 'Chrome';
  else if (/firefox|fxios/.test(u)) browser = 'Firefox';
  else if (/safari/.test(u)) browser = 'Safari';
  let os = 'unknown';
  if (/windows nt/.test(u)) os = 'Windows';
  else if (/mac os x|macintosh/.test(u)) os = 'macOS';
  else if (/android/.test(u)) os = 'Android';
  else if (/iphone|ipad|ipod/.test(u)) os = 'iOS';
  else if (/linux/.test(u)) os = 'Linux';
  return { device, browser, os };
}

function stripQueryHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return '';
  }
}

export default async function middleware(req: NextRequest) {
  // Build response FIRST so the page is never blocked, even if logging crashes
  const res = NextResponse.next();

  // Only log GET
  if (req.method !== 'GET') return res;

  // Try to log, but EVERY error is caught — never break the user's page
  try {
    const redis = getRedis();
    if (!redis) return res; // env not configured → silent skip

    const ua = req.headers.get('user-agent') || '';
    const { device, browser, os } = parseDevice(ua);
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0';

    const entry: VisitorEntry = {
      ts: Date.now(),
      ip,
      city: req.headers.get('x-vercel-ip-city') || '',
      country: req.headers.get('x-vercel-ip-country') || '',
      region: req.headers.get('x-vercel-ip-region') || '',
      ua,
      device,
      browser,
      os,
      ref: stripQueryHost(req.headers.get('referer') || ''),
      path: req.nextUrl.pathname,
      lang: (req.headers.get('accept-language') || '').split(',')[0] || '',
    };

    // Fire-and-forget — don't await (don't slow page). Cap list at MAX_ENTRIES.
    redis
      .lpush('visitors:log', JSON.stringify(entry))
      .then(() => redis.ltrim('visitors:log', 0, MAX_ENTRIES - 1))
      .catch((err) => console.error('[middleware] Redis log failed:', err));
  } catch (err) {
    // Last-resort safety net — middleware must NEVER crash
    console.error('[middleware] Unexpected error:', err);
  }

  return res;
}
