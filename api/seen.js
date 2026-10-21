// Counts one visit to a /for spec page. Called by the tracker snippet on every /for page
// (skipped in Oykun's own browsers, marked with ?me). Stores in the crucial-visits Upstash store:
//   hash "visits": path -> count,  hash "last": path -> ISO time of the latest visit.
// Paths: /for, /for/<client>, /for/<client>/<person>.
const PATH = /^\/for(\/[a-z0-9-]+){0,2}$/;
const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin.includes('crucial.design') && !origin.includes('localhost')) return res.status(403).json({ error: 'Forbidden' });
  if (BOT.test(req.headers['user-agent'] || '')) return res.status(204).end();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = { p: body }; } }
  const p = String(body?.p || '').toLowerCase().replace(/\/+$/, '') || '/for';
  if (!PATH.test(p)) return res.status(400).json({ error: 'Bad path' });

  const r = await fetch(`${process.env.KV_REST_API_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['HINCRBY', 'visits', p, 1], ['HSET', 'last', p, new Date().toISOString()]]),
  }).catch(() => null);
  if (!r || !r.ok) return res.status(502).json({ error: 'Store unavailable' });
  return res.status(204).end();
}
