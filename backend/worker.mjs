// Cloudflare Worker for the Yaspieze website. Secrets belong in Workers settings.
const ORIGINS = new Set(['https://www.fngl.ir', 'https://fngl.ir']);
const FEED = 'https://www.youtube.com/feeds/videos.xml?playlist_id=UULFjZ31sAP7v7aXQCpNvdX0lg';
const json = (data, status, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers } });
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
  const known = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  if (entity[0] !== '#') return known[entity.toLowerCase()] || whole;
  const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
  return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : whole;
});
export function parseFeed(xml) {
  const entries = [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)].map(([, body]) => {
    const id = body.match(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/)?.[1];
    const title = body.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = body.match(/<published>([^<]+)<\/published>/)?.[1];
    return id && title && published && Number.isFinite(Date.parse(published)) ? { id, title: decode(title), published } : null;
  }).filter(Boolean).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return entries[0] || null;
}
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const cors = origin && ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      if (!origin || !ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } });
    }
    if (url.pathname === '/api/latest' && request.method === 'GET') {
      try {
        const key = new Request('https://cache.invalid/latest-regular-video');
        const cache = caches.default;
        let cached = await cache.match(key);
        if (!cached) {
          const response = await fetch(FEED, { headers: { 'User-Agent': 'YaspiezeWebsite/1.0' }, signal: AbortSignal.timeout(8000) });
          if (!response.ok) throw new Error('Feed unavailable');
          const video = parseFeed(await response.text());
          if (!video) throw new Error('No videos found');
          cached = json(video, 200, { 'Cache-Control': 'public, max-age=300' });
          ctx.waitUntil(cache.put(key, cached.clone()));
        }
        return new Response(cached.body, { status: 200, headers: { ...Object.fromEntries(cached.headers), ...cors } });
      } catch { return json({ error: 'Latest video temporarily unavailable.' }, 503, { ...cors, 'Cache-Control': 'no-store' }); }
    }
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      if (!origin || !ORIGINS.has(origin)) return json({ error: 'Not allowed.' }, 403, cors);
      if (!env.DISCORD_WEBHOOK_URL || !env.TURNSTILE_SECRET_KEY) return json({ error: 'Contact form is not configured.' }, 503, cors);
      if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(env.DISCORD_WEBHOOK_URL)) return json({ error: 'Contact form is not configured.' }, 503, cors);
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Invalid request.' }, 415, cors);
      if (Number(request.headers.get('Content-Length') || 0) > 12000) return json({ error: 'Message too large.' }, 413, cors);
      let input;
      try {
        if (!request.body) return json({ error: 'Invalid request.' }, 400, cors);
        const reader = request.body.getReader();
        const decoder = new TextDecoder();
        let text = '', size = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 12000) { await reader.cancel(); return json({ error: 'Message too large.' }, 413, cors); }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
        input = JSON.parse(text);
      } catch { return json({ error: 'Invalid request.' }, 400, cors); }
      const name = typeof input?.name === 'string' ? input.name.trim() : '';
      const reply = typeof input?.reply === 'string' ? input.reply.trim() : '';
      const message = typeof input?.message === 'string' ? input.message.trim() : '';
      const token = typeof input?.token === 'string' ? input.token : '';
      if (!name || name.length > 80 || !reply || reply.length > 160 || !message || message.length > 1500 || !token || token.length > 2048) return json({ error: 'Please check your details and verification.' }, 400, cors);
      try {
        const params = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
        const ip = request.headers.get('CF-Connecting-IP'); if (ip) params.set('remoteip', ip);
        const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: params, signal: AbortSignal.timeout(8000) });
        const result = await verify.json();
        if (!verify.ok || !result.success || !['www.fngl.ir','fngl.ir'].includes(result.hostname)) return json({ error: 'Verification failed. Please try again.' }, 403, cors);
        const sent = await fetch(env.DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [{ title: 'New website message', description: message, color: 11635967, fields: [{ name: 'Name', value: name }, { name: 'Reply to', value: reply }] }] }), signal: AbortSignal.timeout(8000) });
        if (!sent.ok) throw new Error('Delivery failed');
        return json({ ok: true }, 200, { ...cors, 'Cache-Control': 'no-store' });
      } catch { return json({ error: 'Could not send your message. Please try again or contact yappieze on Discord.' }, 502, { ...cors, 'Cache-Control': 'no-store' }); }
    }
    return json({ error: 'Not found.' }, 404, cors);
  }
};
