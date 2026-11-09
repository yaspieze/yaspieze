# Yaspieze backend setup

This backend is prepared but is not live until you deploy it and configure the website. Your site can stay on GitHub Pages. It checks YouTube's unofficial regular-videos feed (Shorts excluded) and delivers contact messages to a Discord channel. It caches successful video responses for five minutes. YouTube may change or block the feed; the homepage retains a last-known thumbnail if the API is unavailable.

## 1. Create a Discord webhook
1. In a Discord server you manage, choose a private channel for messages.
2. Open **Edit Channel → Integrations → Webhooks → New Webhook**. Copy the webhook URL.
3. Treat the URL like a password. Do not post it in GitHub or chat.

## 2. Create a Cloudflare Turnstile widget
1. Log in to the Cloudflare dashboard, open **Turnstile**, then **Add widget**.
2. Add `www.fngl.ir` and `fngl.ir` as hostnames. Choose Managed mode and create it.
3. Copy the **site key** (public) and **secret key** (private). Never commit or share the secret key.

## 3. Create and deploy the Worker
1. In Cloudflare, open **Workers & Pages → Create application → Create Worker**. Name it `yaspieze-api` and deploy the starter Worker.
2. Open the Worker, select **Edit code**, replace the starter code with the full contents of `backend/worker.mjs` from this repository, then **Deploy**.
3. In the Worker, open **Settings → Variables and Secrets**, add encrypted **secrets** named `DISCORD_WEBHOOK_URL` and `TURNSTILE_SECRET_KEY`, with the webhook URL and Turnstile secret key respectively. Save and deploy changes if Cloudflare asks. The exact labels can vary slightly in the dashboard.
4. Copy the Worker's public URL, for example `https://yaspieze-api.YOUR-SUBDOMAIN.workers.dev` (without a trailing slash). No custom domain is required.
5. Open `https://YOUR-WORKER-URL/api/latest` in a browser. It should return JSON containing `id`, `title`, and `published`. If it returns 503, the Worker cannot currently fetch YouTube's feed; retry or check the Worker logs.

## 4. Connect the site
Edit `backend-config.json` in the GitHub repository, replacing the two empty strings with the **public** Worker URL and **public** Turnstile site key. For example:

```json
{"apiBase":"https://yaspieze-api.YOUR-SUBDOMAIN.workers.dev","turnstileSiteKey":"YOUR-PUBLIC-SITE-KEY"}
```

These two values are public; do not put the Discord webhook URL, Cloudflare API token, or Turnstile secret here. Commit the change to `main`, then wait for GitHub Pages to update. Alternatively, send the public Worker URL and public site key to the site developer to connect them. The form stays hidden until both public values are present; the previous YouTube method continues until the Worker URL is configured.

## 5. Test
- Visit the homepage and check that the latest regular-video thumbnail opens the correct YouTube video.
- Visit `/connect/` and send a test message. Complete Turnstile; confirm it appears in the private Discord channel with the supplied reply details.
- Try mobile and desktop. If verification cannot load, visitors can still contact `yappieze` on Discord.

Messages and reply details are sent to Discord and processed by Cloudflare Turnstile; make sure visitors know this in your site's privacy notice before accepting real submissions. Turnstile helps prevent automated abuse but is not a complete rate limiter. Monitor usage and add Cloudflare rate-limiting controls if needed. On the Workers Free plan, usage is subject to Cloudflare's account limits; check the current pricing and limits before enabling paid services.
