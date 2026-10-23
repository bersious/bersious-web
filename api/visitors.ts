import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET  /api/visitors?key=<STATS_KEY>&limit=200
 *   → returns { total, uniqueIPs, byCountry, byDevice, byBrowser, byPath, topIPs, entries }
 * DELETE /api/visitors?key=<STATS_KEY>
 *   → clears the log
 *
 * Talks to Upstash Redis via plain HTTP REST — no npm package needed,
 * so Vercel doesn't have to bundle/install anything. Works in any runtime.
 *
 * Auth: STATS_KEY env var, or hardcoded fallback '[REDACTED-STATS-KEY]'.
 */
const KEY = process.env.STATS_KEY || '[REDACTED-STATS-KEY]';
const MAX_LIMIT = 2000;

// Upstash REST helpers — call them via fetch
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
  command: string[]
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
  // Auth
  const provided = (req.query.key as string) || '';
  if (provided !== KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const creds = getUpstashCreds();
  if (!creds) {
    return res.status(503).json({
      error: 'Upstash env vars not configured',
      hint: 'Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or dailys_KV_REST_API_URL + dailys_KV_REST_API_TOKEN, in Vercel Environment Variables.',
    });
  }

  try {
    if (req.method === 'DELETE') {
      const deleted = await upstash<number>(creds, ['DEL', 'visitors:log']);
      await upstash<number>(creds, ['DEL', 'stalkers:log']).catch(() => {});
      return res.status(200).json({ ok: true, cleared: true, deleted });
    }

    const limit = Math.min(parseInt((req.query.limit as string) || '200', 10), MAX_LIMIT);
    const raw = await upstash<(string | null)[]>(creds, [
      'LRANGE',
      'visitors:log',
      '0',
      String(limit - 1),
    ]);

    const rawStalkers = (await upstash<(string | null)[]>(creds, [
      'LRANGE',
      'stalkers:log',
      '0',
      '99',
    ]).catch(() => [])) as (string | null)[];

    const stalkers = (rawStalkers || [])
      .map((e) => {
        if (!e) return null;
        try {
          return typeof e === 'string' ? JSON.parse(e) : e;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Upstash returns each entry as a JSON string (because we LPUSH'd JSON.stringify)
    const entries = (raw || [])
      .map((e) => {
        if (!e) return null;
        try {
          return typeof e === 'string' ? JSON.parse(e) : e;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as any[];

    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};
    const byPath: Record<string, number> = {};
    const byIP: Record<string, { count: number; lastTs: number; country: string; city: string }> = {};
    let uniqueIPs = 0;

    for (const e of entries) {
      byCountry[e.country || '?'] = (byCountry[e.country || '?'] || 0) + 1;
      byDevice[e.device] = (byDevice[e.device] || 0) + 1;
      byBrowser[e.browser] = (byBrowser[e.browser] || 0) + 1;
      byPath[e.path] = (byPath[e.path] || 0) + 1;
      if (!byIP[e.ip]) {
        byIP[e.ip] = { count: 0, lastTs: e.ts, country: e.country, city: e.city };
        uniqueIPs++;
      }
      byIP[e.ip].count++;
      if (e.ts > byIP[e.ip].lastTs) byIP[e.ip].lastTs = e.ts;
    }

    return res.status(200).json({
      total: entries.length,
      uniqueIPs,
      byCountry,
      byDevice,
      byBrowser,
      byPath,
      topIPs: Object.entries(byIP)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20)
        .map(([ip, v]) => ({ ip, ...v })),
      entries,
      stalkers,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'server error', detail: String(err?.message || err) });
  }
}
