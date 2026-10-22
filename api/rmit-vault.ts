import type { VercelRequest, VercelResponse } from '@vercel/node';

function getUpstashCreds(): { url: string; token: string } | null {
  const url =
    process.env.dailys_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.dailys_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function upstash<T = any>(
  creds: { url: string; token: string },
  command: (string | number)[]
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

const DEFAULT_STATE = {
  users: [
    { username: 'minh_mastering', name: 'Minh (Kỹ Sư Hòa Âm)', role: 'reviewer', did: 'tide:usr:minh_92a1' },
    { username: 'thu_producer', name: 'Thu (Giám Đốc Sản Xuất)', role: 'reviewer', did: 'tide:usr:thu_44b0' },
    { username: 'lan_soundcheck', name: 'Lan (Kiểm Âm)', role: 'reviewer', did: 'tide:usr:lan_77c8' }
  ],
  tracks: [
    { id: 'track_01', name: 'Lead_Single_Master_v4.flac', type: 'audio/flac', size: '42.8 MB', hash: 'b79a4e912f...', artistUsername: 'alice_artist', allowedUsers: ['minh_mastering'], artSeed: 0 },
    { id: 'track_02', name: 'Vocal_Stems_Studio_Dry.wav', type: 'audio/wav', size: '68.1 MB', hash: '82f10ac349...', artistUsername: 'alice_artist', allowedUsers: [], artSeed: 1 },
    { id: 'track_03', name: 'Behind_The_Scenes_Teaser.mp4', type: 'video/mp4', size: '115.4 MB', hash: '11ce9d40b2...', artistUsername: 'alice_artist', allowedUsers: [], artSeed: 2 }
  ],
  requests: [
    { id: 'req_demo_01', trackId: 'track_02', username: 'thu_producer', status: 'PENDING', createdAt: new Date().toISOString() }
  ],
  settings: { autoApprove: false },
  session: { artist: null, reviewer: null },
  lastUpdated: new Date().toISOString()
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const creds = getUpstashCreds();
  if (!creds) {
    return res.status(500).json({ ok: false, error: 'Database credentials missing on Vercel' });
  }

  const KEY = 'tide:rmit:global_vault';

  try {
    if (req.method === 'GET') {
      const raw = await upstash<string | null>(creds, ['GET', KEY]);
      if (!raw) {
        // Initialize default state
        await upstash(creds, ['SET', KEY, JSON.stringify(DEFAULT_STATE)]);
        return res.status(200).json({ ok: true, data: DEFAULT_STATE, source: 'initialized' });
      }
      return res.status(200).json({ ok: true, data: JSON.parse(raw), source: 'redis' });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const { action } = body;

      // Đọc state hiện tại
      let state = DEFAULT_STATE;
      const raw = await upstash<string | null>(creds, ['GET', KEY]);
      if (raw) {
        try { state = JSON.parse(raw); } catch (e) {}
      }

      if (action === 'RESET') {
        state = { ...DEFAULT_STATE, lastUpdated: new Date().toISOString() };
      } else if (action === 'SYNC_ALL') {
        if (body.tracks) state.tracks = body.tracks;
        if (body.users) state.users = body.users;
        state.lastUpdated = new Date().toISOString();
      } else if (action === 'UPDATE_TRACKS') {
        if (body.tracks) state.tracks = body.tracks;
        state.lastUpdated = new Date().toISOString();
      } else if (action === 'REGISTER_USER') {
        const newUser = body.user;
        if (newUser && !state.users.some(u => u.username === newUser.username)) {
          state.users.push(newUser);
          state.lastUpdated = new Date().toISOString();
        }
      }

      await upstash(creds, ['SET', KEY, JSON.stringify(state)]);
      return res.status(200).json({ ok: true, data: state });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
