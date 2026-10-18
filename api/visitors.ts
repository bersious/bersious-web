import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

/**
 * GET /api/visitors?key=<STATS_KEY>&limit=200
 *   → returns array of visitor entries (newest first)
 * DELETE /api/visitors?key=<STATS_KEY>
 *   → clears all logs
 *
 * Requires env var STATS_KEY. If not set, all requests are denied.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expected = process.env.STATS_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'STATS_KEY env var not set' });
  }
  const provided = (req.query.key as string) || '';
  if (provided !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (req.method === 'DELETE') {
    await kv.del('visitors:log');
    return res.status(200).json({ ok: true, cleared: true });
  }

  const limit = Math.min(parseInt((req.query.limit as string) || '200', 10), MAX_LIMIT);
  const raw = (await kv.lrange('visitors:log', 0, limit - 1)) as string[];

  // Each entry is stored as a JSON string; parse them safely
  const entries = raw
    .map((e) => {
      try {
        return typeof e === 'string' ? JSON.parse(e) : e;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Aggregate stats
  const total = entries.length;
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
    total,
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
  });
}

const MAX_LIMIT = 2000;
