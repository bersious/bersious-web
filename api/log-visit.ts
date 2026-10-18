import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/log-visit
 *   Client-side tracking endpoint. Body = JSON of the partial entry built
 *   in the browser. We enrich it with the request IP and Vercel geo headers,
 *   then LPUSH into the Upstash Redis list `visitors:log`.
 *
 *   This endpoint has NO auth (any visitor can hit it), but it's just for
 *   logging — no sensitive operation exposed.
 */
const MAX_ENTRIES = 2000;

function getUpstashCreds(): { url: string; token: string } | null {
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
  if (!url || !token) return null;
  return { url, token };
}

async function upstash<T = any>(
  creds: { url: string; token: string },
  command: string[] | string[][]
): Promise<T> {
  const res = await fetch(creds.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { result: T };
  return data.result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const creds = getUpstashCreds();
  if (!creds) {
    // Silent fail — don't break the page
    return res.status(200).json({ ok: false, reason: 'no creds' });
  }

  try {
    // Parse body — Vercel parses JSON if Content-Type is application/json.
    // sendBeacon sends as text/plain, so we may need to parse manually.
    let partial: any = req.body;
    if (typeof partial === 'string') {
      try {
        partial = JSON.parse(partial);
      } catch {
        partial = {};
      }
    }
    if (!partial || typeof partial !== 'object') partial = {};

    // Enrich with IP + geo from Vercel headers
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      '0.0.0.0';

    const entry = {
      ts: Date.now(),
      ip,
      city: (req.headers['x-vercel-ip-city'] as string) || '',
      country: (req.headers['x-vercel-ip-country'] as string) || '',
      region: (req.headers['x-vercel-ip-region'] as string) || '',
      ua: partial.ua || (req.headers['user-agent'] as string) || '',
      device: partial.device || 'unknown',
      browser: partial.browser || 'unknown',
      os: partial.os || 'unknown',
      ref: partial.ref || '',
      path: partial.path || '/',
      lang: partial.lang || '',
    };

    // Pipeline: LPUSH then LTRIM
    await upstash<any>(creds, [
      ['LPUSH', 'visitors:log', JSON.stringify(entry)],
      ['LTRIM', 'visitors:log', '0', String(MAX_ENTRIES - 1)],
    ]);

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(200).json({ ok: false, reason: String(err?.message || err) });
  }
}
