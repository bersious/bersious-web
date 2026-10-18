import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

/**
 * GET  /api/visitors?key=<STATS_KEY>&limit=200
 *   → returns { total, uniqueIPs, byCountry, byDevice, byBrowser, byPath, topIPs, entries }
 * DELETE /api/visitors?key=<STATS_KEY>
 *   → clears the log
 *
 * Requires env var STATS_KEY. If not set, all requests are denied.
 */
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
    if (!url || !token) return null;
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    return null;
  }
}

const MAX_LIMIT = 2000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow STATS_KEY via env var, OR hardcoded fallback (so we don't have to redeploy
  // to change the key). To rotate the key later, just edit this file and push.
  const expected = process.env.STATS_KEY || '[REDACTED-STATS-KEY]';
  const provided = (req.query.key as string) || '';
  if (provided !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: 'Redis env vars not configured' });
  }

  try {
    if (req.method === 'DELETE') {
      await redis.del('visitors:log');
      return res.status(200).json({ ok: true, cleared: true });
    }

    const limit = Math.min(parseInt((req.query.limit as string) || '200', 10), MAX_LIMIT);
    const raw = (await redis.lrange('visitors:log', 0, limit - 1)) as string[];

    const entries = raw
      .map((e) => {
        try {
          return typeof e === 'string' ? JSON.parse(e) : e;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};
    const byPath: Record<string, number> = {};
    const byIP: Record<string, { count: number; lastTs: number; country: string; city: string }> = {};
    let uniqueIPs = 0;

    for (const e of entries as any[]) {
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
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'server error', detail: String(err?.message || err) });
  }
}
