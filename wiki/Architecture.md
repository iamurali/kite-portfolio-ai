# Architecture

How kite-portfolio-ai works under the hood — data flows, token costs, and repo structure.

---

## Portfolio analysis flow

```
User: /kite-portfolio:full

Claude Code (main session)
  │
  ├── mcp__kite__login()                     ← authenticate (if needed)
  ├── mcp__kite__get_profile()               ← user info
  ├── mcp__kite__get_holdings()              ← live holdings with instrument tokens
  │
  │   ── parallel batch ──────────────────────────────────────────────────────
  ├── mcp__kite__get_historical_data() × N   ← 2Y daily candles per stock
  ├── mcp__kite__get_historical_data() × 3   ← 2Y daily candles for benchmarks
  └── WebSearch() × N                        ← concall + earnings data per stock
  │   ── end parallel ──────────────────────────────────────────────────────
  │
  │   Module 1 — Performance
  ├── Compute 1M/3M/6M/1Y returns per stock
  ├── Compute benchmark returns (Nifty 50/500/SMLCAP + MF)
  └── Write → ~/.portfolio/data/portfolio-YYYY-MM-DD.json (Module 1 fields)
  │
  │   Module 2 — Stage + Fundamentals
  ├── MA50/MA150/MA200 + slope → Weinstein Stage per stock
  ├── 0-100 score per stock (8 dimensions)
  ├── Concall AI 13-section summary per stock
  └── Merge + Write → ~/.portfolio/data/portfolio-YYYY-MM-DD.json (full)
       Create symlink: ~/.portfolio/data/latest.json

Browser: http://localhost:7891/report
  └── GET /data/latest → renders all 5 tabs client-side from JSON
```

**Token cost:** ~2,500 tokens to write JSON (vs ~12,000 for the old HTML generation approach). 79% reduction.

---

## Stock deep-dive flow

```
User: /kite-portfolio:stock AZAD

Claude Code (main session)
  │
  ├── Step A: Cache check
  │     ls ~/.portfolio/stock-reports/AZAD/*.json → if <7 days, open browser, done
  │
  ├── Step B: Resolve + fetch (MCP)
  │     mcp__kite__search_instruments("AZAD") → instrument_token
  │     mcp__kite__get_ltp(["NSE:AZAD"])      → current price
  │     mcp__kite__get_historical_data(token, 2Y, "day") → 494 candles
  │
  ├── Step C: Compute technicals (Python inline, zero tokens)
  │     MA20/50/150/200, RSI14, Weinstein stage, slope200
  │     pct_from_high, pct_above_200ma, volume_ratio
  │
  ├── Step D: Research subagent (Agent tool)
  │     6 parallel WebSearches:
  │       earnings · concall · moat · balance sheet · sector · valuation
  │     Returns: complete JSON (schema v3.0, all 13 sections)
  │     Token budget: ~20-25K tokens (stays in subagent)
  │
  ├── Step E: Patch candles + QoQ (Python inline)
  │     Inject 494 candle rows into JSON
  │     Compute QoQ growth per quarter from sequential data
  │     Write → ~/.portfolio/stock-reports/AZAD/latest.json
  │
  └── Open: http://localhost:7891/report/stock/AZAD
            http://localhost:7891/stock/AZAD (raw JSON)

Browser: http://localhost:7891/report/stock/AZAD
  └── fetch('/stock/AZAD') → renderStockAnalysis(data) → 13 sections client-side
```

**Token cost:** ~20–30K tokens per stock (research subagent keeps web search results out of main context).

---

## Bridge server endpoints

The bridge server (`portfolio-bridge/server.js`) runs at `http://localhost:7891`.

| Endpoint | Method | Description |
|---|---|---|
| `/report` | GET | Serves `report/report.html` (static) |
| `/report/stock/:ticker` | GET | Serves `report.html` — JS reads path and auto-triggers analyser |
| `/data/latest` | GET | Returns most recent portfolio JSON |
| `/data/:date` | GET | Returns portfolio JSON for a specific date (YYYY-MM-DD) |
| `/data/list` | GET | Lists all available portfolio JSON files |
| `/stock/:ticker` | GET | Returns stock analysis JSON from `stock-reports/TICKER/latest.json` |
| `/stock/list` | GET | Lists all tickers with cached stock reports |
| `/analyse` | GET | Queues a ticker for background analysis via bridge watcher |
| `/health` | GET | Health check — returns server status |
| `/cache/list` | GET | Lists all fresh cache entries |
| `/cache/:ticker` | DELETE | Clears cache for a ticker |
| `/trigger/bulk` | POST | Queue multiple tickers: `{ tickers: ["AZAD", "HDFCBANK"] }` |
| `/trigger/status` | GET | Shows pending/active/done analysis jobs |

---

## JSON schema (v3.0)

Stock analysis JSON written to `~/.portfolio/stock-reports/TICKER/latest.json`:

```
{
  meta         — ticker, company, exchange, report_date, schema_version
  price        — last_price, day_change_pct, high_1y, low_1y, pct_from_high
  technical    — stage, stage_emoji, ma50/150/200, slope200, rsi_14, volume_ratio
  score        — total (0-100), action, action_css, score_label, dimensions{}
  earnings     — quarters[], ttm_pe, de_ratio, roe, roce, fcf_positive
  concall      — quarter, attendees, sentiment, analyst_pulse, sections{}
                   sections: strategic_updates, guidance_outlook, risk_analysis,
                              qa_summary, earning_triggers, management_consistency
  management_integrity — composite_grade, delivery_rate_pct, quarters[]
  forensics    — pl_3year[], cashflow_3year[], balance_sheet{}, red_flags[], ratios_12[]
  competitive  — industry_overview, company_positioning, peers[], moat_radar[]
  triggers     — name, type, revenue_impact, timeline, probability
  sector       — name, definition, tam_usd_bn, cagr_pct, cycle,
                  positive_triggers[], negative_triggers[], watchlist_metrics[]
  verdict      — score, action, key_insight, target_high/low, upside/downside_pct,
                  entry_zone, support, resistance, stop_loss,
                  bull_case{}, base_case{}, bear_case{}
  candles      — 494 rows of {date, open, high, low, close, volume}
  references   — section, source, url, note
}
```

Full field reference: [`docs/portfolio-data-schema.md`](../docs/portfolio-data-schema.md)

---

## Report rendering

`report/report.html` is a 2,560-line self-contained file:
- Never regenerated by Claude (static, committed to git)
- Loads Chart.js 4.4 from CDN lazily (only when chart tab is opened)
- All 5 portfolio tabs + 13 stock analyser sections rendered client-side
- Deep-link routing: `/report/stock/AZAD` → auto-opens analyser on AZAD

**render pipeline:**
```
fetch('/data/latest')
  → renderAll(data)
    → renderOverview(data)
    → renderPerformance(data)
    → renderStages(data)
    → renderRebalancing(data)
    → loadCachedList()          ← populates Tab 5 "Recently Analysed" grid

fetch('/stock/AZAD')
  → buildVerdictBanner(data)   ← top banner
  → renderStockAnalysis(data)  ← default to Summary section
```

---

## Repo structure

```
kite-portfolio-ai/
├── claude-skill/
│   ├── SKILL.md              ← master orchestrator (routing, Steps A-E)
│   ├── performance.md        ← Module 1: benchmark comparison
│   ├── stage-analysis.md     ← Module 2: Weinstein + 0-100 scoring
│   ├── json-output.md        ← JSON write spec, merge pattern, token budget
│   └── stock-analyser-v2.js  ← Module 3 V2 workflow script (reference only)
│
├── portfolio-bridge/
│   ├── server.js             ← Express bridge (port 7891)
│   ├── analyse.mjs           ← V3 one-shot stock analysis runner
│   └── package.json
│
├── report/
│   └── report.html           ← Static report UI (2,560 lines)
│
├── docs/
│   ├── portfolio-data-schema.md   ← Full JSON field reference
│   ├── sample-stock-data.json     ← Complete AZAD example (schema v3.0)
│   ├── prompt-library-index.md    ← Analysis prompt frameworks
│   ├── stage-framework.md         ← Weinstein stage reference
│   ├── mf-benchmarks.md           ← MF benchmark fund reference
│   └── html-ui-standards.md       ← CSS variable reference
│
├── portfolio-plugin/         ← Claude Code installable plugin
│   ├── .claude-plugin/       ← Plugin manifest + permissions
│   ├── .cursor-plugin/       ← Cursor plugin manifest
│   ├── .mcp.json             ← Kite MCP server config
│   └── skills/               ← Sub-skills for plugin install
│
├── assets/                   ← Screenshots
├── wiki/                     ← Wiki source files
└── CHANGELOG.md
```

**Runtime directories** (outside repo, auto-created by bridge):
```
~/.portfolio/
  data/            ← portfolio JSON (portfolio-YYYY-MM-DD.json + latest.json symlink)
  stock-reports/   ← TICKER/latest.json per stock
  cache/           ← legacy 7-day cache metadata
  analyse-queue/   ← trigger files for background analysis
```

---

## Related pages

- [[Bridge-Server]] — full endpoint reference and configuration
- [[Installation]] — how to set up the bridge server
- [[Data-Sources]] — where the web research data comes from
