# Lenny 2.0 — Sensible Care Hub

React + Vite app deployed to Cloudflare Pages.
All API calls are proxied through the existing Cloudflare Worker — no secrets in the browser.

## Architecture

```
Browser (Freddy)
    │
    ├── /claude-proxy          → Worker → api.anthropic.com  (ANTHROPIC_API_KEY in Worker env)
    ├── /snapforms-proxy/...   → Worker → user.snapforms.com.au  (client secret passed as Bearer)
    └── localStorage           → participant records + Snapforms client secret
```

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

> In dev mode, fetch calls to the Worker work normally (CORS is set to `*`).

## Deploy to Cloudflare Pages

### Option A — Git-connected (recommended)

1. Push this folder to a GitHub/GitLab repo
2. Cloudflare Dashboard → Pages → Create application → Connect to Git
3. Set build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save and Deploy — auto-deploys on every push to `main`.

### Option B — Direct upload (quick test)

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name freddy
```

## Worker environment variable required

The Worker at `care-plan-update-claude.systems-30d.workers.dev` needs one env var set:

| Variable            | Value                  |
|---------------------|------------------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

Set this in Cloudflare Dashboard → Workers & Pages → your Worker → Settings → Variables.

The Snapforms client secret is NOT a Worker env var — Freddy passes it per-request
as `Authorization: Bearer <secret>`. It's stored in the user's browser localStorage
under key `freddy2_snapApiKey`.

## Worker endpoints

| Method | Path                                      | Purpose                          |
|--------|-------------------------------------------|----------------------------------|
| POST   | `/claude-proxy`                           | Proxy to Anthropic API           |
| GET    | `/snapforms-proxy/resolve-record-key`     | Record Key → response_id         |
| GET    | `/snapforms-proxy/resolve-token`          | wf_token (returns hint to use Record Key) |
| PUT    | `/snapforms-proxy/responses/:id`          | Update Snapforms response fields |
| GET    | `/snapforms-proxy/responses`              | Debug: list recent responses     |
