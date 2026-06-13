# Bridge Server

The bridge server is a local Express.js app (`portfolio-bridge/server.js`) running at `http://localhost:7891`. It serves the report UI, stock JSON data, and enables Tab 5 interactivity.

---

## Why is it needed?

Browsers (Chrome, Safari, Firefox) block `fetch()` calls from `file://` to `localhost` regardless of CORS headers — this is the "null-origin" restriction. Opening `report.html` directly from the filesystem means Tab 5 API calls (`fetch('/stock/AZAD')`) silently fail.

The bridge serves `report.html` at `http://localhost:7891/report`, making all API calls same-origin and unrestricted.

**Without the bridge:** Tabs 1–4 work (data is embedded in the file). Tab 5 shows a fallback with the `/kite-portfolio:stock TICKER` command to copy.

**With the bridge:** All 5 tabs work. Tab 5 can trigger analysis and auto-load results.

---

## Starting the server

```bash
cd portfolio-bridge
npm install   # first time only
npm start
```

Output:
```
Portfolio Bridge  http://localhost:7891

  Report:      http://localhost:7891/report  ✅ static
  Data:        http://localhost:7891/data/latest  ✅ found
  Health:      http://localhost:7891/health

  Data dir:    /Users/you/.portfolio/data
  Cache dir:   /Users/you/.portfolio/cache
  Stock rpts:  /Users/you/.portfolio/stock-reports
  Cache TTL:   7 days
  Claude CLI:  ✅ /opt/homebrew/bin/claude
```

---

## Endpoints

### Report serving

| Endpoint | Description |
|---|---|
| `GET /` | Redirects to `/report` |
| `GET /report` | Serves `report/report.html` from the repo |
| `GET /report/stock/:ticker` | Serves `report.html` — JS auto-opens stock analyser for that ticker |
| `GET /health` | `{ status: "ok", port: 7891, cacheTtlDays: 7, activeJobs: [], queueWatcher: "running" }` |

### Portfolio data

| Endpoint | Description |
|---|---|
| `GET /data/latest` | Returns most recent `portfolio-YYYY-MM-DD.json` |
| `GET /data/:date` | Returns portfolio JSON for a specific date (e.g. `/data/2026-06-14`) |
| `GET /data/list` | Returns array of all available portfolio data files with dates and sizes |

### Stock analysis

| Endpoint | Description |
|---|---|
| `GET /stock/:ticker` | Returns `~/.portfolio/stock-reports/TICKER/latest.json` |
| `GET /stock/list` | Returns array of all tickers with stock reports |
| `GET /analyse?ticker=AZAD` | Queues ticker for background analysis, polls for result (120s timeout) |
| `GET /analyse?ticker=AZAD&refresh=true` | Forces fresh analysis ignoring cache |

### Cache management

| Endpoint | Description |
|---|---|
| `GET /cache/list` | Lists all fresh cache entries with score, action, age |
| `DELETE /cache/:ticker` | Clears all cache files for a ticker |

### Bulk operations

| Endpoint | Description |
|---|---|
| `POST /trigger/bulk` | Queue multiple tickers: `{ "tickers": ["AZAD", "HDFCBANK"] }` |
| `GET /trigger/status` | Shows `{ pending, active, done, pendingCount, activeCount }` |

---

## Queue watcher

The bridge watches `~/.portfolio/analyse-queue/` for `.trigger` files every 10 seconds. When Tab 5 calls `GET /analyse?ticker=AZAD`, the bridge writes `AZAD.trigger` to the queue and polls for the result.

The queue watcher picks up the trigger and spawns:
```bash
node portfolio-bridge/analyse.mjs AZAD
```

> **Note:** The queue watcher path is for browser-triggered analysis from Tab 5. When running `/kite-portfolio:stock` directly in Claude Code, the analysis runs in the Claude session and writes results directly — no queue involved.

---

## Cache TTL

Stock analysis results are cached for **7 days** (`CACHE_TTL_DAYS = 7` in `server.js`).

Cache is stored at `~/.portfolio/stock-reports/TICKER/latest.json`. The `expires_at` field in the JSON determines freshness.

To change the TTL:
```js
// portfolio-bridge/server.js
const CACHE_TTL_DAYS = 7;  // change this value
```

To force a fresh analysis on any ticker:
- In Tab 5: click the ↻ Refresh button
- In Claude Code: `/kite-portfolio:stock TICKER --refresh` or ask "re-analyse TICKER with fresh data"
- Via API: `GET /analyse?ticker=TICKER&refresh=true`

---

## Skill sync on startup

The bridge automatically syncs skill files from `claude-skill/` in the repo to `~/.claude/skills/kite-portfolio/` on startup. This ensures the installed skill always reflects the latest repo version without a manual `cp` after each `git pull`.

Files synced: `SKILL.md`, `performance.md`, `stage-analysis.md`, `full.md`, `json-output.md`, `stock-analyser.md`, `stock-analyser-v2.js`

---

## Configuration

All configuration is in `portfolio-bridge/server.js`:

```js
const PORT = 7891;                    // change if port is in use
const CACHE_TTL_DAYS = 7;            // stock report cache lifetime
const QUEUE_POLL_INTERVAL = 10000;   // ms between queue checks (10s)
const CLAUDE_BIN = '/opt/homebrew/bin/claude';  // path to claude CLI
```

---

## Related pages

- [[Installation]] — how to install and start the bridge
- [[Architecture]] — full endpoint reference in context
- [[Troubleshooting]] — bridge-specific error fixes
