import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Edge Middleware — log every visitor to Vercel KV
 * Captures: timestamp, IP, user-agent, country/city/region (from Vercel headers),
 *           device type, browser, OS, referrer, path.
 *
 * Cost: 1 KV read + 1 KV write per request.
 * Skips: /api/* (own internal calls) and /secret-stats (caller, not visitor).
 */
export const config = {
  // Match all paths except static assets and internal endpoints
  matcher: [
    '/((?!_next/|favicon|assets/|api/visitors|secret-stats|sw\\.js|manifest\\.json).*)',
  ],
};

interface VisitorEntry {
  ts: number;        // epoch ms
  ip: string;
  city: string;
  country: string;
  region: string;
  ua: string;
  device: string;    // mobile | tablet | desktop | bot
  browser: string;
  os: string;
  ref: string;       // referrer host
  path: string;
  lang: string;
}

const MAX_ENTRIES = 2000; // ring buffer cap

function parseDevice(ua: string): { device: string; browser: string; os: string } {
  const u = ua.toLowerCase();
  // Bot detection
  if (/(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|preview|monitor)/.test(u)) {
    return { device: 'bot', browser: 'bot', os: 'bot' };
  }
  // Device
  let device = 'desktop';
  if (/ipad|tablet|playbook|silk/.test(u)) device = 'tablet';
  else if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/.test(u)) device = 'mobile';
  // Browser
  let browser = 'unknown';
  if (/edg\//.test(u)) browser = 'Edge';
  else if (/opr\/|opera/.test(u)) browser = 'Opera';
  else if (/chrome|crios/.test(u)) browser = 'Chrome';
  else if (/firefox|fxios/.test(u)) browser = 'Firefox';
  else if (/safari/.test(u)) browser = 'Safari';
  // OS
  let os = 'unknown';
  if (/windows nt/.test(u)) os = 'Windows';
  else if (/mac os x|macintosh/.test(u)) os = 'macOS';
  else if (/android/.test(u)) os = 'Android';
  else if (/iphone|ipad|ipod/.test(u)) os = 'iOS';
  else if (/linux/.test(u)) os = 'Linux';
  return { device, browser, os };
}

function stripQuery(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return '';
  }
}

export default async function middleware(req: NextRequest) {
  // Build response first — never block the page
  const res = NextResponse.next();

  // Only log GET (skip preflight, POSTs, etc.)
  if (req.method !== 'GET') return res;

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
    ref: stripQuery(req.headers.get('referer') || ''),
    path: req.nextUrl.pathname,
    lang: (req.headers.get('accept-language') || '').split(',')[0] || '',
  };

  // Fire-and-forget: log to KV without awaiting (don't slow down page)
  kv
    .lpush('visitors:log', JSON.stringify(entry))
    .then(() => kv.ltrim('visitors:log', 0, MAX_ENTRIES - 1))
    .catch((err) => console.error('[middleware] KV log failed:', err));

  return res;
}
