import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const filename = (req.query.filename as string) || `track_${Date.now()}.mp3`;
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const blob = await put(`rmit-vault/${filename}`, req, {
      access: 'public',
      contentType: contentType,
      addRandomSuffix: true,
    });

    return res.status(200).json({ ok: true, url: blob.url });
  } catch (error: any) {
    console.error('Blob upload error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
