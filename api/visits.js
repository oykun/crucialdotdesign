// Visit counts for the crucial.design/for dashboard: { "/for/caura": { n: 3, last: "2026-10-22T10:14:00Z" }, ... }
// Written by /api/seen. Read-only token, no caching.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const r = await fetch(`${process.env.KV_REST_API_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['HGETALL', 'visits'], ['HGETALL', 'last']]),
  }).catch(() => null);
  if (!r || !r.ok) return res.status(502).json({ error: 'Store unavailable' });

  const [{ result: v = [] }, { result: l = [] }] = await r.json();
  const last = {};
  for (let i = 0; i < l.length; i += 2) last[l[i]] = l[i + 1];
  const out = {};
  for (let i = 0; i < v.length; i += 2) out[v[i]] = { n: Number(v[i + 1]), last: last[v[i]] || null };

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}
