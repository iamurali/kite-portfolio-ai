# Changelog

All notable changes to kite-portfolio-ai are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Added
- **`report/report.html`** — Verdict banner rendered above sidebar on every stock load: BUY/HOLD/WATCH/SELL action badge (mapped from ADD/HOLD/TRIM/EXIT), SVG score ring, upside % / downside % cards from analyst target range, analyst count, key insight line, bull/bear case pills.
- **`report/report.html`** — Interactive price chart tab (📈 Price Chart): Chart.js 4.4 loaded lazily from CDN, 1M/3M/6M/1Y/2Y range buttons, toggleable 20/50/200 DMA overlays, volume sub-chart, hover tooltip with exact price.
- **`report/report.html`** — References tab (📎 References): sources grouped by section (earnings/concall/forensics/sector/competitive/technical), each with source name, note, and "Open ↗" link to the original URL.
- **`report/report.html`** — QoQ columns in earnings table: QoQ Rev% and QoQ PAT% added alongside existing YoY columns; computed from sequential quarter data in Step E patch script.
- **`report/report.html`** — Rich sector section: market definition callout, TAM/India share/CAGR/cycle stats row, cycle rationale, structured positive/negative triggers with timeline + impact color-coding, company position paragraph, watchlist metrics pills.
- **`claude-skill/SKILL.md`** — Step D rewrites Module 3 primary path: uses Agent tool (subagent) directly instead of `analyse.mjs` subprocess (which times out). Embeds complete v3.0 schema template in the subagent prompt including new `sector`, `verdict` (with targets/cases as objects), and `references[]` fields.
- **`claude-skill/SKILL.md`** — Step E: post-subagent Python patch script injects 2Y candle OHLCV data and computes QoQ per quarter into the written JSON automatically.
- **`portfolio-bridge/analyse.mjs`** — V3 local runner replacing all Workflow/subagent orchestration for Module 3. Single Node.js process: resolves ticker via Kite MCP, fetches candles via Kite MCP, computes technicals locally (zero tokens), makes **one** Claude call with embedded web searches that outputs the exact `report.html` JSON schema (`earnings`, `concall.sections.*`, `forensics`, `competitive`, `management_integrity`, `sector`, `triggers`, `verdict`, `score.dimensions`). Validates 14 required field paths after write. Token cost ~15-25K vs ~150K for V2.
- **`claude-skill/stock-analyser-v2.js`** — V2 Claude Workflow script (kept for reference — no longer active). Six deterministic phases: Resolve → Fetch → Technicals → Score → Deep Analysis → Assemble. Each phase has a JSON Schema eval gate (TickerSchema, FetchSchema, ScoreSchema, SectionSchema) that validates output before proceeding. Up to 2 retries on fetch failures. Per-section placeholder fallback if ≤3 of 8 sections fail — report always completes. `pipeline()` for all 8 analysis sections runs them concurrently (wall-clock ~2-3 min vs ~5 min sequential). Stage score computed in pure JS (zero tokens, deterministic). Progress visible in `/workflows`.

### Changed
- **`claude-skill/SKILL.md`** — Module 3 invocation updated: `/kite-portfolio:stock <TICKER>` now runs `node portfolio-bridge/analyse.mjs <TICKER>` directly via Bash. No Workflow tool, no subagents.
- **`portfolio-bridge/server.js`** — Queue watcher `spawnClaudeAnalysis()` rewritten: spawns `node analyse.mjs <TICKER>` instead of `claude -p /kite-portfolio:stock`.
- **`portfolio-bridge/server.js`** — `GET /stock/:ticker` endpoint reads from `~/.portfolio/stock-reports/<TICKER>/latest.json` and serves structured JSON to Tab 5. Backwards-compatible with legacy `html_fragment` cache.
- **`portfolio-bridge/server.js`** — `STOCK_REPORTS_DIR` (`~/.portfolio/stock-reports/`) created on startup. Directory ensured alongside existing cache/results/queue directories.
- **`docs/sample-stock-data.json`** — Complete ZAGGLE example for Module 3 JSON schema (schema v3.0). Reference file for all 12 top-level keys.
- **`report/report.html`** — Full client-side stock analyser renderer in Tab 5. Left-sidebar nav with 11 sections: Summary, Strategic Updates, Guidance Outlook, Risk Analysis, Q&A Summary, Earning Triggers, Management Consistency, Forensics, Moat & Peers, Sector, Verdict + Score. Sentiment polarity chips (+ve/-ve/neu) on every concall point. Beat/miss badges with market reaction % in earnings table. Score ring shown ONLY in Verdict + Score section.

### Changed
- **`claude-skill/stock-analyser.md`** — Complete rewrite of Steps 4-6. Subagent B now returns structured JSON objects (not HTML fragments). Output path changed from `~/Desktop/stock-analysis-*.html` to `~/.portfolio/stock-reports/<TICKER>/latest.json`. Cache metadata no longer contains `html_fragment`. All 8 analysis sections now apply full prompt-library depth (all steps of each framework, not shallow summaries). Schema version bumped to 3.0.
- **`docs/portfolio-data-schema.md`** — Version bumped to 3.0. Added Module 3 schema appendix covering all 12 top-level keys (meta, price, technical, score, earnings, concall, forensics, competitive, sector, triggers, management_integrity, verdict) with full field reference for concall sections, polarity values, management integrity grades, and cache metadata format.
- **`report/report.html`** — `analyseStock()` now calls `GET /stock/:ticker` first (fast path); falls back to `GET /analyse` for trigger queuing. Tab 5 layout replaced with flex sidebar+content panel.
- **`CLAUDE.md`** — File map updated with new files. Common mistakes table extended with 4 new entries covering stock output path, html_fragment, Subagent B output format, and score ring placement.
- **`claude-skill/SKILL.md`** — Output path reference updated; `docs/sample-stock-data.json` added to reference files.

---

## [3.0.0] — 2026-05-30

### The Big Change: JSON-First Architecture

Claude no longer generates HTML. It writes one compact JSON file (~15–20 KB) and a static `report/report.html` renders everything client-side. **Token savings: ~79% per run** (~12,000 → ~2,500 tokens).

### Added
- **`report/report.html`** — static self-contained report UI (65 KB, 1,301 lines). Never regenerated by Claude. Contains all CSS, JS render engine, and 5-tab layout. Fetches `GET /data/latest` on load and renders all tabs client-side from JSON.
  - `renderOverview()` — stat grid, priority actions banner, holdings table, allocation bars
  - `renderPerformance()` — benchmark table, bar chart (positive/negative), stock returns, auto-computed insights
  - `renderStages()` — stage summary table, sticky sidebar, full stock cards with MA strip, earnings grid, 9-section concall card, risk flags, score breakdown
  - `renderRebalancing()` — priority list with score chips, reallocation table, health grid
  - Tab 5 stock analyser (persistent nav search, bridge `/analyse` integration)
- **`docs/portfolio-data-schema.md`** — master JSON contract between Claude (writer) and report.html (reader). Full field spec for all 4 top-level keys: `meta`, `portfolio`, `benchmarks`, `holdings[]`
- **`docs/sample-portfolio-data.json`** — complete 4-stock sample (NETWEB, KIRLOSENG, BAJAJHLDNG, ZAGGLE) with all fields populated, used for report.html development and testing
- **`claude-skill/json-output.md`** (renamed from `html-report.md`) — JSON write spec: atomic write pattern, module-level field ownership, merge pattern for full review, token budget per module
- **Bridge `/data/*` endpoints** in `portfolio-bridge/server.js`:
  - `GET /data/latest` — returns most recent portfolio JSON from `~/.portfolio/data/`
  - `GET /data/list` — returns array of available dated JSON files
  - `GET /data/:date` — returns specific date's JSON
  - `~/.portfolio/data/` directory auto-created on server start
- **Bridge `/report` update** — now serves `report/report.html` from repo (static, always fresh). Falls back to latest Desktop HTML if repo file absent (legacy compatibility)
- Bridge startup log now shows `✅ static` / `✅ found` / `⚠️` status for report and data files

### Changed
- **`claude-skill/performance.md`** Step 8 — replaced "Write HTML Parts 1+2" with "Write JSON (performance fields)". Module 1 now writes `meta`, `portfolio` (partial), `benchmarks`, `holdings[].returns` to JSON.
- **`claude-skill/stage-analysis.md`** Step 10 — replaced "Generate HTML Report" with "Write JSON (stage/concall fields)". Module 2 now merges `technical`, `fundamental_score`, `earnings`, `concall`, `action`, `risk_flags` per holding.
- **`claude-skill/SKILL.md`** — "HTML Assembly" section replaced by "JSON Output" section. Token budget documented. Reference files list updated.
- **`CLAUDE.md`** — architecture section updated to reflect JSON-first flow

### Token Impact
| Step | Before | After | Saving |
|---|---|---|---|
| HTML write (CSS + 4 parts) | ~10,000 tokens | 0 | −10,000 |
| JSON write | 0 | ~2,500 tokens | +2,500 |
| **Net per run** | **~12,000** | **~2,500** | **−79%** |

### Backward Compatibility
- Old Desktop HTML files (`~/Desktop/portfolio-report-*.html`) still work — bridge falls back to them if `report/report.html` is absent
- No breaking change to the `/analyse`, `/cache/*` endpoints
- The 5-tab UI, concall card sections, and score chips all look identical — only the generation method changed

---

## [2.0.0] — 2026-05-30

### Added
- **Fundamentals-first rebalancing engine** in `claude-skill/stage-analysis.md`
  - New 0–100 scoring rubric: Business Quality (40 pts) + Macro/Micro (30 pts) + Technical Stage (30 pts)
  - Score chip `[72/100]` shown next to every action badge in the Rebalancing tab; click to expand per-dimension breakdown
  - Rebalancing priority now driven by score, not stage alone
- **`/kite-portfolio:stock <TICKER>` sub-skill** (Module 3) in `claude-skill/stock-analyser.md`
  - Triggered as a sub-skill of `/portfolio`: `/kite-portfolio:stock NETWEB`
  - 8-section institutional deep-dive: Quarterly Earnings · Concall Intelligence · Financial Forensics · Competitive Landscape · Sector Intelligence · Growth Triggers · Management Integrity · Final Verdict
  - 2-tier subagent model: Subagent A (parallel data fetches, returns JSON summary), Subagent B (8 analysis sections, returns HTML fragments) — keeps main context lean
  - Outputs standalone HTML to `~/Desktop/stock-analysis-TICKER-DATE.html`
- **Tab 5 — Stock Analyser** in the portfolio report
  - Input any NSE/BSE ticker → click Analyse → score ring + 8 sections injected inline
  - Cache indicator badge ("Cached · 2d ago") + ⟳ Refresh button
  - Fallback UI shown when bridge server is not running
- **Bridge server** (`portfolio-bridge/server.js`)
  - Express.js, port 7891
  - Connects Tab 5 HTML button → file queue → Claude Code skill → result injection
  - 7-day analysis cache in `~/.portfolio/cache/TICKER-DATE.json`
  - Hard refresh via `?refresh=true` query param
  - `GET /cache/list` endpoint to view all cached tickers
  - `DELETE /cache/:ticker` endpoint to clear a stock's cache
- **Prompt library index** (`docs/prompt-library-index.md`)
  - 8 prompt IDs from AI prompt library mapped to skill sections
  - Each entry includes: framing instruction, query pattern, output structure
- **New CSS components** in `html-report.md`
  - `.score-chip` — coloured score chip (green/amber/red) for rebalancing table
  - `.analyser-input-wrap`, `.analyser-input`, `.analyser-btn`, `.analyser-refresh-btn`, `.cache-badge` — Tab 5 input widget
  - `.analyser-score-card`, `.score-ring-wrap`, `.criteria-rows`, `.criteria-row` — score card with SVG ring
  - `.forensics-grid` — 3-column forensics panel
  - `.integrity-row`, `.integrity-grade` — management integrity display
  - `.trigger-table` — growth trigger table with probability colour coding

### Changed
- **`claude-skill/stage-analysis.md`** — Step 6 (Action) completely rewritten
  - Old: pure technical logic (Stage 4 → EXIT, near 52W high → TRIM)
  - New: fundamental score 0–100 drives action; Stage 4 + strong fundamentals = WATCH (not EXIT); near 52W high + accelerating earnings = HOLD/ADD
  - Step 7 (stock card) — added FUNDAMENTAL SCORE block above TECHNICAL section
  - Step 8 (summary table) — added Score and Valuation columns
  - Step 9 (rebalancing) — rewritten with score-driven priority tiers
  - Notes section updated to explain fundamentals-first philosophy
- **`claude-skill/SKILL.md`** — updated
  - Description updated to include Stock Analyser sub-skill
  - Module 3 registered (`stock-analyser.md`)
  - Bridge server health check step added before report open
  - MCP tools list updated (added `search_instruments`, `get_ltp`)
  - Reference files section updated
- **`claude-skill/html-report.md`** — updated
  - Tab 5 added to nav bar
  - Part 4 write now includes Tab 5 shell
  - Rebalancing item format updated with score chip and expandable detail
  - New CSS classes section added
  - Score chip usage documented
  - Tab 5 write notes added
- **`README.md`** — fully updated for v2
  - New feature table (5-tab report, 8-section stock analyser)
  - Bridge server setup step added
  - Rebalancing score table documented
  - Stock Analyser documented as `/kite-portfolio:stock TICKER` sub-skill (not a separate skill)
  - Architecture diagram updated (Subagent A/B, cache paths)
  - File structure updated
  - Screenshot section updated (Tab 5 placeholder noted)

### Technical
- Subagent A / B isolation pattern established for `/kite-portfolio:stock` sub-skill — raw search results never appear in main context
- Cache write format standardised: `TICKER-YYYY-MM-DD.json` with `html_fragment`, `score`, `action`, `expires_at`
- Bridge server poll interval: 3s, timeout: 120s
- Score chip colour logic: `score-chip.high` (≥70), `score-chip.mid` (40–69), `score-chip.low` (<40)

---

## [1.0.0] — 2026-05-17

### Added
- Initial release: `kite-portfolio-ai`
- Module 1 — Performance vs Benchmarks (`performance.md`)
  - Live 1M/3M/6M/1Y returns vs Nifty 50, Nifty 500, Nifty Smallcap 250
  - MF cross-verification (valueresearchonline.com + moneycontrol.com)
  - Benchmark bar chart, stock-wise returns table, 4–6 key insights
- Module 2 — Stage & Earnings Analysis (`stage-analysis.md`)
  - Weinstein Stage 1/2/3/4 classification using 50/150/200 MA
  - 13-section Concall AI summary card per stock
  - Risk flag pills (PE, concentration, stage, SME, earnings momentum, debt)
  - Rebalancing priority list (HIGH/MEDIUM/LOW/ADDS) — technical-only at this stage
- 4-tab dark-mode HTML report (`html-report.md`)
  - Tab 1: Overview, Tab 2: Performance, Tab 3: Stage Analysis, Tab 4: Rebalancing
  - Sidebar stock selector (desktop) / dropdown (mobile)
  - Chunked 4-part write pattern to avoid token limit
- Claude Code skill (`SKILL.md`) with parallel fetch speed rules
- Cursor rules, GitHub Copilot instructions, MCP tool definitions
- Sample report (`examples/sample-report.html`)
- Hardcoded benchmark tokens (NIFTY 50: 256265, NIFTY 500: 268041, SMLCAP 250: 267273)
- Tracking position rule (weight ≤ 0.2% → TRACKING, never EXIT on size)

---

## Screenshot update checklist

When updating skill files, refresh these screenshots in `assets/`:

| Screenshot | Tab | When to update |
|---|---|---|
| `screenshot-overview.png` | Tab 1 | Holdings table or stat grid changes |
| `screenshot-performance.png` | Tab 2 | Benchmark comparison changes |
| `screenshot-stage-analysis.png` | Tab 3 | Stock card structure, concall card, MAs |
| `screenshot-rebalancing.png` | Tab 4 | Action logic, score chip, rebalancing table |
| `screenshot-stock-analyser.png` | Tab 5 | Any Tab 5 UI changes, score ring, sub-tabs |

**How to take a screenshot:**
1. Run `/kite-portfolio:full` to generate a report with live data
2. Open the report in your browser
3. Navigate to the tab you want to screenshot
4. `Cmd+Shift+4` (macOS) → select the tab content area
5. Save to `assets/screenshot-<tab>.png`
6. Keep files under 500 KB — use a tool like `pngcrush` or TinyPNG if needed
