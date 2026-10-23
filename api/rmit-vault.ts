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

const STATE_KEY = 'tide:rmit:global_vault';
const BLOB_PREFIX = 'tide:rmit:blob:';
const MAX_BLOB_BYTES = 1_500_000;

const DEFAULT_STATE = {
  users: [
    { username: 'minh_mastering', name: 'Minh (Kỹ Sư Hòa Âm)', role: 'reviewer', did: 'tide:usr:minh_92a1', avatar: '', createdAt: '2026-10-20T08:00:00Z', blockedArtists: [] },
    { username: 'thu_producer', name: 'Thu (Giám Đốc Sản Xuất)', role: 'reviewer', did: 'tide:usr:thu_44b0', avatar: '', createdAt: '2026-10-21T09:30:00Z', blockedArtists: [] },
    { username: 'lan_soundcheck', name: 'Lan (Kiểm Âm)', role: 'reviewer', did: 'tide:usr:lan_77c8', avatar: '', createdAt: '2026-10-22T10:15:00Z', blockedArtists: [] }
  ],
  artists: [
    { username: 'alice_artist', name: 'Alice Nguyễn', genre: 'Indie Pop / Electronic', bio: 'Nghệ sĩ độc lập, tác giả album Midnight Cipher', artSeed: 0, avatar: '', createdAt: '2026-10-19T14:00:00Z', blockedUsers: [] },
    { username: 'endy_producer', name: 'Endy (Thiện Nhân)', genre: 'Lo-Fi / Cinematic AI', bio: 'Nhà sản xuất âm nhạc tại UIT Studio', artSeed: 1, avatar: '', createdAt: '2026-10-20T16:00:00Z', blockedUsers: [] }
  ],
  tracks: [],
  requests: [],
  comments: [],
  settings: { autoApprove: false },
  session: { artist: null, reviewer: null },
  lastUpdated: new Date().toISOString()
};

function normalizeState(s: any) {
  if (!s || typeof s !== 'object') return DEFAULT_STATE;
  return {
    users: Array.isArray(s.users) ? s.users.map((u: any) => ({
      ...u,
      avatar: u.avatar || '',
      createdAt: u.createdAt || '2026-10-22T08:00:00Z',
      blockedArtists: Array.isArray(u.blockedArtists) ? u.blockedArtists : []
    })) : DEFAULT_STATE.users,
    artists: Array.isArray(s.artists) && s.artists.length ? s.artists.map((a: any) => ({
      ...a,
      avatar: a.avatar || '',
      createdAt: a.createdAt || '2026-10-20T08:00:00Z',
      blockedUsers: Array.isArray(a.blockedUsers) ? a.blockedUsers : []
    })) : DEFAULT_STATE.artists,
    tracks: Array.isArray(s.tracks) ? s.tracks.map((t: any) => ({
      ...t,
      coverArt: t.coverArt || t.cover || ''
    })) : DEFAULT_STATE.tracks,
    requests: Array.isArray(s.requests) 
      ? s.requests.filter((r: any) => !r.trackId.startsWith('track_0'))
      : [],
    comments: Array.isArray(s.comments) ? s.comments : [],
    settings: { ...DEFAULT_STATE.settings, ...(s.settings || {}) },
    session: { ...DEFAULT_STATE.session, ...(s.session || {}) },
    lastUpdated: s.lastUpdated || new Date().toISOString()
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const creds = getUpstashCreds();
  if (!creds) {
    return res.status(500).json({ ok: false, error: 'Database credentials missing on Vercel' });
  }

  try {
    // ---- Blob fetch: GET /api/rmit-vault?blob=<trackId> ----
    if (req.method === 'GET' && req.query.blob) {
      const trackId = String(req.query.blob);
      const data = await upstash<string | null>(creds, ['GET', BLOB_PREFIX + trackId]);
      if (!data) return res.status(404).json({ ok: false, error: 'blob not found' });
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === 'GET') {
      const raw = await upstash<string | null>(creds, ['GET', STATE_KEY]);
      if (!raw) {
        await upstash(creds, ['SET', STATE_KEY, JSON.stringify(DEFAULT_STATE)]);
        return res.status(200).json({ ok: true, data: DEFAULT_STATE, source: 'initialized' });
      }
      const state = normalizeState(JSON.parse(raw));
      return res.status(200).json({ ok: true, data: state, source: 'redis' });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const { action } = body;

      if (action === 'UPLOAD_BLOB') {
        const { trackId, data } = body;
        if (!trackId || !data) return res.status(400).json({ ok: false, error: 'missing trackId/data' });
        const approxBytes = Math.floor((String(data).length * 3) / 4);
        if (approxBytes > MAX_BLOB_BYTES) {
          return res.status(200).json({ ok: true, skipped: true, reason: 'file too large for cloud mirror' });
        }
        await upstash(creds, ['SET', BLOB_PREFIX + trackId, String(data)]);
        return res.status(200).json({ ok: true, bytes: approxBytes });
      }

      let state = DEFAULT_STATE;
      const raw = await upstash<string | null>(creds, ['GET', STATE_KEY]);
      if (raw) {
        try { state = normalizeState(JSON.parse(raw)); } catch (e) {}
      }

      const touch = () => { state.lastUpdated = new Date().toISOString(); };

      switch (action) {
        case 'SYNC_ALL':
          if (body.tracks) state.tracks = body.tracks;
          if (body.users) state.users = body.users;
          if (body.requests) state.requests = body.requests;
          touch();
          break;

        case 'RESET':
          state = JSON.parse(JSON.stringify(DEFAULT_STATE));
          break;

        case 'TOGGLE_BLOCK': {
          const { fromRole, fromUsername, targetUsername } = body;
          if (fromRole === 'artist') {
            const artist = state.artists.find((a: any) => a.username === fromUsername);
            if (artist) {
              artist.blockedUsers = Array.isArray(artist.blockedUsers) ? artist.blockedUsers : [];
              if (artist.blockedUsers.includes(targetUsername)) {
                artist.blockedUsers = artist.blockedUsers.filter((u: string) => u !== targetUsername);
              } else {
                artist.blockedUsers.push(targetUsername);
                // revoke any active requests from this user
                state.requests = state.requests.filter((r: any) => r.username !== targetUsername);
              }
              touch();
            }
          } else if (fromRole === 'reviewer' || fromRole === 'user') {
            const user = state.users.find((u: any) => u.username === fromUsername);
            if (user) {
              user.blockedArtists = Array.isArray(user.blockedArtists) ? user.blockedArtists : [];
              if (user.blockedArtists.includes(targetUsername)) {
                user.blockedArtists = user.blockedArtists.filter((a: string) => a !== targetUsername);
              } else {
                user.blockedArtists.push(targetUsername);
              }
              touch();
            }
          }
          break;
        }

        case 'UPDATE_PROFILE': {
          const { role, username, avatar, bio, genre } = body;
          if (role === 'artist') {
            const a = state.artists.find((x: any) => x.username === username);
            if (a) {
              if (avatar !== undefined) a.avatar = avatar;
              if (bio !== undefined) a.bio = bio;
              if (genre !== undefined) a.genre = genre;
              touch();
            }
          } else {
            const u = state.users.find((x: any) => x.username === username);
            if (u) {
              if (avatar !== undefined) u.avatar = avatar;
              touch();
            }
          }
          break;
        }

        case 'REGISTER_ARTIST': {
          const newArtist = body.artist;
          if (newArtist && !state.artists.some((a: any) => a.username === newArtist.username)) {
            state.artists.push(newArtist);
            touch();
          }
          break;
        }

        case 'ADMIN_DELETE_ARTIST': {
          const { username } = body;
          if (username) {
            state.artists = state.artists.filter((a: any) => a.username !== username);
            // Optionally also remove tracks by this artist
            state.tracks = state.tracks.filter((t: any) => t.artistId !== username && t.artistUser !== username);
            touch();
          }
          break;
        }

        case 'ADMIN_DELETE_USER': {
          const { username } = body;
          if (username) {
            state.users = state.users.filter((u: any) => u.username !== username);
            state.requests = state.requests.filter((r: any) => r.username !== username);
            state.tracks.forEach((t: any) => {
              if (Array.isArray(t.allowedUsers)) {
                t.allowedUsers = t.allowedUsers.filter((u: string) => u !== username);
              }
            });
            touch();
          }
          break;
        }

        case 'ADMIN_UPDATE_USER_PASSWORD': {
          const { username, password } = body;
          const u = state.users.find((x: any) => x.username === username);
          if (u) {
            u.password = password;
            touch();
          }
          break;
        }

        case 'ADMIN_UPDATE_ARTIST_PASSWORD': {
          const { username, password } = body;
          const a = state.artists.find((x: any) => x.username === username);
          if (a) {
            a.password = password;
            touch();
          }
          break;
        }

        case 'UPDATE_TRACKS':
          if (body.tracks) state.tracks = body.tracks;
          touch();
          break;

        case 'ADD_TRACK': {
          const bytes = Number(body.bytes) || 4 * 1024 * 1024;
          const artistUser = (body.track?.artistUsername || body.track?.artistUser || body.artist || '').toLowerCase();

          // Giới hạn nghiêm ngặt mỗi ca sĩ tối đa 100MB dung lượng tải lên
          const MAX_ARTIST_STORAGE_BYTES = 100 * 1024 * 1024;
          const artistTracks = state.tracks.filter((t: any) => (t.artistUsername || t.artistUser || '').toLowerCase() === artistUser);
          const currentTotalBytes = artistTracks.reduce((sum: number, t: any) => sum + (Number(t.rawBytes) || 4 * 1024 * 1024), 0);

          if (currentTotalBytes + bytes > MAX_ARTIST_STORAGE_BYTES) {
            return res.status(200).json({
              ok: false,
              quotaExceeded: true,
              error: `Ca sĩ @${artistUser} đã dùng ${(currentTotalBytes / 1024 / 1024).toFixed(1)}MB / 100MB. Không thể tải thêm!`
            });
          }

          if (body.track && !state.tracks.some((t: any) => t.id === body.track.id)) {
            body.track.rawBytes = bytes;
            state.tracks.unshift(body.track);
            touch();
          }
          break;
        }

        case 'DELETE_TRACK':
          state.tracks = state.tracks.filter((t: any) => t.id !== body.trackId);
          state.requests = state.requests.filter((r: any) => r.trackId !== body.trackId);
          await upstash(creds, ['DEL', BLOB_PREFIX + body.trackId]);
          touch();
          break;

        case 'REGISTER_USER': {
          const newUser = body.user;
          if (newUser && !state.users.some((u: any) => u.username === newUser.username)) {
            state.users.push(newUser);
            touch();
          }
          break;
        }

        case 'REQUEST_ACCESS': {
          const { trackId, username } = body;
          const track = state.tracks.find((t: any) => t.id === trackId);
          if (track && username && !track.allowedUsers.includes(username)) {
            // Check if user is blocked by artist or user has blocked artist
            const artist = state.artists.find((a: any) => a.username === (track.artistId || track.artistUser));
            if (artist && Array.isArray(artist.blockedUsers) && artist.blockedUsers.includes(username)) {
              return res.status(200).json({ ok: false, error: 'User is blocked by artist', blocked: true });
            }
            const user = state.users.find((u: any) => u.username === username);
            if (user && Array.isArray(user.blockedArtists) && user.blockedArtists.includes(track.artistId || track.artistUser)) {
              return res.status(200).json({ ok: false, error: 'Artist is blocked by user', blocked: true });
            }

            const already = state.requests.find(
              (r: any) => r.trackId === trackId && r.username === username && r.status === 'PENDING'
            );
            if (!already) {
              state.requests.push({
                id: `req_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
                trackId,
                username,
                status: 'PENDING',
                createdAt: new Date().toISOString()
              });
            }
            if (state.settings.autoApprove) {
              if (!track.allowedUsers.includes(username)) track.allowedUsers.push(username);
              state.requests.forEach((r: any) => {
                if (r.trackId === trackId && r.username === username) r.status = 'APPROVED';
              });
            }
            touch();
          }
          break;
        }

        case 'RESOLVE_REQUEST': {
          const { requestId, decision } = body;
          const request = state.requests.find((r: any) => r.id === requestId);
          if (request) {
            request.status = decision === 'APPROVE' ? 'APPROVED' : 'DENIED';
            const track = state.tracks.find((t: any) => t.id === request.trackId);
            if (track && decision === 'APPROVE' && !track.allowedUsers.includes(request.username)) {
              track.allowedUsers.push(request.username);
            }
            if (track && decision === 'DENY') {
              track.allowedUsers = track.allowedUsers.filter((u: string) => u !== request.username);
            }
            touch();
          }
          break;
        }

        case 'GRANT_ACCESS': {
          const { trackId, username, isSinglePlay } = body;
          const track = state.tracks.find((t: any) => t.id === trackId);
          if (track && username) {
            if (!Array.isArray(track.allowedUsers)) track.allowedUsers = [];
            if (!Array.isArray(track.singlePlayUsers)) track.singlePlayUsers = [];
            if (!track.allowedUsers.includes(username)) track.allowedUsers.push(username);
            if (isSinglePlay) {
              if (!track.singlePlayUsers.includes(username)) track.singlePlayUsers.push(username);
            } else {
              track.singlePlayUsers = track.singlePlayUsers.filter((u: string) => u !== username);
            }
            state.requests.forEach((r: any) => {
              if (r.trackId === trackId && r.username === username && r.status === 'PENDING') {
                r.status = 'APPROVED';
              }
            });
            touch();
          }
          break;
        }

        case 'RECORD_PLAYBACK_FINISHED': {
          const { trackId, username } = body;
          const track = state.tracks.find((t: any) => t.id === trackId);
          if (track && Array.isArray(track.singlePlayUsers) && track.singlePlayUsers.includes(username)) {
            // Tự động thu hồi quyền sau khi nghe xong 1 lần!
            track.allowedUsers = (track.allowedUsers || []).filter((u: string) => u !== username);
            track.singlePlayUsers = track.singlePlayUsers.filter((u: string) => u !== username);
            touch();
          }
          break;
        }

        case 'REVOKE_ACCESS': {
          const { trackId, username } = body;
          const track = state.tracks.find((t: any) => t.id === trackId);
          if (track) {
            track.allowedUsers = track.allowedUsers.filter((u: string) => u !== username);
            state.requests.forEach((r: any) => {
              if (r.trackId === trackId && r.username === username) r.status = 'DENIED';
            });
            touch();
          }
          break;
        }

                                case 'ADD_COMMENT': {
          const { trackId, username, text } = body;
          if (trackId && username && text) {
            if (!Array.isArray(state.comments)) state.comments = [];
            state.comments.unshift({
              id: `cmt_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
              trackId,
              username,
              text: String(text).trim(),
              createdAt: new Date().toISOString()
            });
            touch();
          }
          break;
        }

        case 'SET_TAMPER_PROTECTION': {
          const { trackId, enabled } = body;
          const track = state.tracks.find((t: any) => t.id === trackId);
          if (track) {
            track.tamperProtection = !!enabled;
            touch();
          }
          break;
        }

        case 'SET_WATERMARK_MODE': {
          const { trackId, mode } = body;
          const track = state.tracks.find((t: any) => t.id === trackId);
          if (track) {
            track.watermarkMode = mode || 'none';
            touch();
          }
          break;
        }

        case 'SET_PREVIEW_LIMIT': {
          const { trackId, limitSeconds } = body;
          const track = state.tracks.find((t: any) => t.id === trackId);
          if (track) {
            track.previewLimitSeconds = Number(limitSeconds) || 0;
            touch();
          }
          break;
        }

        case 'SET_AUTO_APPROVE':
          state.settings.autoApprove = !!body.value;
          touch();
          break;

        case 'SET_SESSION': {
          const { role, username } = body;
          if (role === 'artist' || role === 'reviewer') {
            state.session[role] = username || null;
            touch();
          }
          break;
        }

        default:
          return res.status(400).json({ ok: false, error: `unknown action: ${action}` });
      }

      await upstash(creds, ['SET', STATE_KEY, JSON.stringify(state)]);
      return res.status(200).json({ ok: true, data: state });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('rmit-vault API error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
