# CLAUDE.md — kite-portfolio-ai

Developer reference for Claude Code working in this repository. Read this before editing any skill file.

---

## What this repo is

A Claude Code skill (`/portfolio`) that analyses a Zerodha Kite portfolio and generates a 5-tab dark-mode HTML report. Built as Claude-native Markdown workflow files — no Python or JavaScript business logic in the skill layer.

**Three modules:**
1. `performance.md` — benchmark comparison (Module 1)
2. `stage-analysis.md` — stage classification + fundamental scoring (Module 2)
3. `stock-analyser.md` — on-demand deep-dive sub-skill (`/kite-portfolio:stock TICKER`) (Module 3)

---

## Skill invocation

| User says | Skill runs |
|---|---|
| `/portfolio` | `kite-portfolio` (SKILL.md) → shows sub-skill menu |
| `/kite-portfolio:performance` | `kite-portfolio:performance` — Module 1 only |
| `/kite-portfolio:stage` | `kite-portfolio:stage` — Module 2 only |
| `/kite-portfolio:full` | `kite-portfolio:full` — Module 1 + 2 |
| `/kite-portfolio:stock NETWEB` | `kite-portfolio:stock` — Module 3 (stock-analyser.md) |
| "analyse my portfolio" | `kite-portfolio:full` |
| "deep dive on TATAELXSI" | `kite-portfolio:stock` |

All four sub-skills (`performance`, `stage`, `full`, `stock`) are declared with `name: kite-portfolio` + `subcommand: <name>` frontmatter — directly invocable without routing through SKILL.md.

---

## Critical rules — never break these

### MCP calls
- `instrument_token` comes directly from `get_holdings()` — **never call `search_instruments` for portfolio stocks**
- Benchmark tokens are hardcoded: NIFTY 50=`256265`, NIFTY 500=`268041`, SMLCAP 250=`267273` — never search for them
- `search_instruments` is only used in Module 3 (stock-analyser) for arbitrary tickers

### Data sources — whitelist only
Only ever WebSearch these domains. Never add others without updating this list:
```
screener.in, trendlyne.com, tickertape.in, moneycontrol.com,
economictimes.indiatimes.com, businessstandard.com, livemint.com,
bseindia.com, nseindia.com, valueresearchonline.com,
capitalmind.in, valuepickr.com
```

### HTML write pattern
Always write HTML in **chunked sequential Bash appends** (4 parts, max ~200 lines each). Never write the full HTML in one string — it will exceed the output token limit.

### Tracking position rule
Weight ≤ 0.2% → label `TRACKING`. Never recommend EXIT based on size alone. Full analysis still runs.

### Fundamental scoring drives action — not stage
Stage is a **timing signal only**. Rebalancing actions come from the 0–100 fundamental score:
- Stage 4 + strong fundamentals (score ≥ 55) = WATCH/STRONG HOLD (await technical recovery)
- Stage 2 + weak fundamentals (score < 30) = TRIM/EXIT (don't hold just because price is rising)
- Near 52W high is NOT a sell signal if earnings are accelerating and score is high

---

## File map

| File | Purpose | Edit when |
|---|---|---|
| `claude-skill/SKILL.md` | Master orchestrator, module routing, speed rules | Adding new modules, changing invocation triggers |
| `claude-skill/performance.md` | Module 1: benchmark comparison logic | Changing benchmark set, return calculation, MF sources |
| `claude-skill/stage-analysis.md` | Module 2: Weinstein stage + 0-100 scoring + concall 13-section card | Changing scoring rubric, action thresholds, concall card sections |
| `claude-skill/stock-analyser.md` | Module 3: on-demand deep-dive, JSON-first output, full prompt-library depth | Adding analysis sections, changing subagent structure, prompt depth |
| `claude-skill/html-report.md` | HTML template, CSS, all tab templates | Adding tabs, changing CSS vars, new components |
| `portfolio-bridge/server.js` | Express bridge, cache logic, poll loop, GET /stock/:ticker | Cache TTL, port, new endpoints |
| `report/report.html` | Static report UI — client-side JSON renderer for all tabs including Tab 5 stock analyser | Changing Tab 5 layout, adding renderer sections, CSS for sidebar |
| `docs/portfolio-data-schema.md` | Master JSON schema — Modules 1/2 + Module 3 appendix (schema v3.0) | Adding new fields, Module 3 schema changes |
| `docs/sample-stock-data.json` | Complete ZAGGLE example for Module 3 JSON schema | Updating schema reference |
| `docs/prompt-library-index.md` | Prompt ID → skill section mapping | Adding new analysis frameworks, changing search patterns |
| `docs/stage-framework.md` | Weinstein stage reference | Stage classification rule changes |
| `docs/mf-benchmarks.md` | MF benchmark funds reference | Changing MF comparison set |
| `docs/html-ui-standards.md` | CSS variable reference | Design system changes |

---

## Scoring rubric (Module 2 + Module 3)

```
Business Quality (0–40):
  A. Earnings Growth      0–10  (4Q PAT YoY trend)
  B. Management Credibility 0–10 (⭐ scale from concall)
  C. Moat Strength        0–10  (pricing power, market share)
  D. Balance Sheet        0–10  (D/E, FCF, ROE)

Macro/Micro (0–30):
  E. Sector Tailwind      0–10  (govt policy, cycle)
  F. Competitive Position 0–10  (share gaining/stable/losing)
  G. Valuation            0–10  (P/E vs 3Y historical average)

Technical Stage (0–30):
  H. Weinstein Stage      0–30  (Stage 2B=30, 2A=25, 1=15, 3=8, 4=0)

Total → Action:
  85–100: STRONG ADD  |  70–84: ADD  |  55–69: STRONG HOLD
  40–54:  HOLD        |  30–39: WATCH
  15–29:  TRIM        |  0–14:  EXIT
```

Overrides:
- TRACKING positions: score drives thesis assessment, but never EXIT on size
- SME (`-SM`): max action = TRIM regardless of score (liquidity/spread risk)
- Score 40–54 (HOLD) but Stage 4 + D/E > 1 → downgrade to WATCH minimum
- Score 70+ but Stage 4 → ADD/STRONG HOLD with note "await Stage 1/2A base before adding"

---

## Module 3 — Subagent model

```
Main context
  ├── Subagent A  (data fetching)
  │     7 parallel tasks: historical candles + 6 WebSearches
  │     Returns: structured JSON only (never raw search results)
  │     Token budget: ~50K tokens (stays in subagent)
  │
  ├── Subagent B  (8 analysis sections)
  │     Input: Subagent A JSON + raw text blobs
  │     Runs: 8 sections using prompt-library-index.md framing
  │     Returns: HTML fragments only (not markdown, not raw data)
  │     Token budget: ~80K tokens (stays in subagent)
  │
  └── Main  (assembly)
        Input: technical candle summary + fragments from B
        Work: score computation + HTML assembly + file writes
        Token budget: ~30K tokens
```

Raw search results must **never** appear in main context. If subagents are not used for some reason, summarise search results to <200 words per stock before using them in main context.

---

## Bridge server

- Port: `7891`
- Start: `cd portfolio-bridge && npm start`
- Cache TTL: 7 days (`CACHE_TTL_DAYS = 7` in server.js)
- Cache path: `~/.portfolio/cache/TICKER-YYYY-MM-DD.json`
- Result path: `~/.portfolio/results/TICKER-YYYY-MM-DD.html`
- Queue path: `~/.portfolio/analyse-queue/TICKER.trigger`
- Hard refresh: `?refresh=true` query param

The bridge is optional. Without it, Tab 5 shows a fallback with the `/kite-portfolio:stock TICKER` command. The skill itself always writes a standalone HTML to Desktop.

---

## HTML report CSS variables — never change these

```css
--bg: #0f1117       --surface: #1a1d27    --surface2: #22263a
--border: #2e3250   --text: #e2e8f0       --muted: #8892b0
--green: #22c55e    --red: #ef4444        --yellow: #f59e0b
--blue: #60a5fa     --purple: #a78bfa     --accent: #6366f1
```

Stage badge + action badge exact CSS is documented in `html-report.md` under "UI Standardisation Rules". Always use those exact styles.

Score chip classes:
```css
.score-chip.high  { background:#14532d; color:#4ade80; }   /* score ≥ 70 */
.score-chip.mid   { background:#451a03; color:#fcd34d; }   /* score 40–69 */
.score-chip.low   { background:#450a0a; color:#fca5a5; }   /* score < 40 */
```

---

## Sample data discipline

Any file under `docs/` that is committed to the repo must use dummy/anonymised data only. Never commit real portfolio values.

**Before committing sample data files, verify:**
- `meta.user_name` → `"Demo User"` (never a real name)
- `meta.generated_at` / `report_date` → any date is fine (not sensitive)
- Holdings symbols → real tickers are OK (they're public), but quantities and buy prices should be illustrative, not real
- No account IDs, profile IDs, or broker credentials anywhere in `docs/`

Run this check before staging sample files:
```bash
grep -rE "(your-real-name|profile_id|account_id)" docs/
```

---

## Changelog discipline

Every change to any skill file must get a CHANGELOG.md entry:
- Add under `[Unreleased]` section
- Categorise as `Added`, `Changed`, or `Fixed`
- Reference the file(s) changed
- Move `[Unreleased]` entries to a versioned release `[X.Y.Z] — YYYY-MM-DD` when tagging

---

## Screenshot discipline

Every change that affects the visual output of a tab needs a screenshot update:

| Tab affected | Screenshot file |
|---|---|
| Tab 1 (Overview) | `assets/screenshot-overview.png` |
| Tab 2 (Performance) | `assets/screenshot-performance.png` |
| Tab 3 (Stage Analysis) | `assets/screenshot-stage-analysis.png` |
| Tab 4 (Rebalancing) | `assets/screenshot-rebalancing.png` |
| Tab 5 (Stock Analyser) | `assets/screenshot-stock-analyser.png` |

Steps: run `/portfolio full` with live data → screenshot the changed tab → save to `assets/` → keep under 500 KB.

---

## Prompt library reference

8 prompts from `ai_prompt_library_llm_indexed.md` are indexed in `docs/prompt-library-index.md`:

| Prompt ID | Used in |
|---|---|
| `quarterly-earnings-analysis-engine` | Module 3, Section A |
| `concall-intelligence-report` | Module 2 + 3, Section B |
| `3-statement-financial-forensics` | Module 3, Section C |
| `competitive-landscape-decoder` | Module 3, Section D |
| `institutional-sector-intelligence-report` | Module 3, Section E |
| `red-flag-detector-early-warning-system` | Module 3, Section C |
| `financial-health-check-12-ratio-diagnostic` | Module 3, Section C |
| `mega-stock-research-framework` (Parts 8,11,12) | Module 3, Sections F/G/H |

Always check `docs/prompt-library-index.md` for the exact framing instruction and search query pattern before implementing a section.

---

## Common mistakes to avoid

| Mistake | Correct approach |
|---|---|
| Recommending EXIT because Stage 4 | Check fundamental score first — Stage 4 + score ≥55 = WATCH |
| Recommending TRIM because near 52W high | Check if earnings accelerating + score ≥70 — if yes, HOLD/ADD |
| Calling `search_instruments` for portfolio stocks | Token comes from `get_holdings()` directly |
| Writing full HTML in one Bash string | Always use 4-part chunked appends |
| Returning raw WebSearch results to main context | Summarise in subagent, return JSON/HTML only |
| Adding score-based actions to Module 1 (performance) | Module 1 shows returns only — no action recommendations |
| Pre-populating Tab 5 during report generation | Tab 5 is on-demand only — just write the input shell |
| Writing stock analysis HTML to `~/Desktop/` | Module 3 writes JSON to `~/.portfolio/stock-reports/<TICKER>/` only — bridge serves it |
| Writing `html_fragment` to cache JSON | Cache metadata only: score, action, expires_at, data_path — no HTML in cache |
| Subagent B returning HTML fragments | Subagent B returns structured JSON objects per section — report.html renders them |
| Showing score ring in every stock analyser tab | Score ring + dimension breakdown shown ONLY in "Verdict + Score" section |
