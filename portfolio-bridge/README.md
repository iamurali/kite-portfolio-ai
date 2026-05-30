# Portfolio Bridge Server

Local Express server (port 7891) that serves the portfolio HTML report and connects Tab 5 Stock Analyser to the Claude Code `/portfolio:stock` sub-skill.

## Setup

```bash
cd portfolio-bridge
npm install
npm start
```

Then open your portfolio report at:
```
http://localhost:7891/report
```

**Why not open the HTML file directly?** Browsers block `fetch()` from `file://` URLs to `localhost` (null-origin CORS restriction). The bridge serves the report from the same origin so Tab 5's API calls work without any browser restrictions.

## How it works

1. Open `http://localhost:7891/report` in your browser (bridge serves the latest Desktop report)
2. Tab 5 calls `GET /analyse?ticker=NETWEB` (relative URL, same-origin — no CORS issues)
2. Bridge checks `~/.portfolio/cache/` for a fresh result (< 7 days old)
3. **Cache hit** → returns immediately with cached HTML fragment + "Cached · X days ago" badge
4. **Cache miss** → writes a trigger file to `~/.portfolio/analyse-queue/NETWEB.trigger`
5. Claude Code (running `/portfolio:stock NETWEB`) detects the trigger, runs full analysis, writes result to `~/.portfolio/cache/NETWEB-DATE.json`
6. Bridge polls for result (120s timeout), returns HTML fragment to Tab 5

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /report` | Serve latest portfolio report from Desktop |
| `GET /report/:date` | Serve specific report e.g. `/report/2026-05-30` |
| `GET /analyse?ticker=TICKER` | Analyse a stock (cache or fresh) |
| `GET /analyse?ticker=TICKER&refresh=true` | Force fresh analysis (ignore cache) |
| `GET /cache/list` | List all cached tickers |
| `DELETE /cache/:ticker` | Clear cache for a ticker |

## Cache

- Location: `~/.portfolio/cache/`
- TTL: 7 days per ticker
- Format: `TICKER-YYYY-MM-DD.json` with `html_fragment`, `score`, `action`, `expires_at`

## Fallback

If bridge server is not running, Tab 5 falls back to showing the `/portfolio:stock TICKER` command for the user to copy and run manually in Claude Code.
