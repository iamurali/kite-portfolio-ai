---
name: kite-portfolio
description: >
  Analyses a Zerodha Kite stock portfolio OR performs on-demand stock deep-dive.
  Main entry for kite-portfolio. Use when the user says /portfolio or wants to choose
  which analysis to run. For direct sub-skill invocations use /kite-portfolio:performance,
  /kite-portfolio:stage, /kite-portfolio:full, or /kite-portfolio:stock <TICKER>.
---

# Kite Portfolio Analysis Skill

## MCP Tools used by this skill
- `mcp__kite__login`
- `mcp__kite__get_profile`
- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`
- `mcp__kite__search_instruments` (stock-analyser only)
- `mcp__kite__get_ltp` (stock-analyser only)

## Modules
Three modules — choose based on user intent:

1. **Module 1 — Performance vs Benchmarks** → `performance.md`
2. **Module 2 — Stage & Earnings Analysis (Fundamental Scoring)** → `stage-analysis.md`
3. **Module 3 — Stock Analyser (on-demand deep-dive)** → `stock-analyser.md`

For **full portfolio review**: Module 1 writes HTML Parts 1–2, Module 2 appends Parts 3–4 + Tab 5 shell.

For **`/kite-portfolio:stock <TICKER>`**: Run Module 3 standalone. Does NOT require holdings data.

---

## Module Routing — Read FIRST

**If the invocation is `/kite-portfolio:stock <TICKER>` or any "analyse TICKER / deep dive on TICKER / research TICKER" request:**
→ Skip Step 0 entirely. Load `stock-analyser.md` and follow its steps.
→ Do NOT call `get_profile()` or `get_holdings()`. Module 3 resolves the ticker via `search_instruments` only.

**If the invocation is `/portfolio`, `/kite-portfolio:performance`, `/kite-portfolio:stage`, or `/kite-portfolio:full`:**
→ Continue to Step 0 below.

---

## Step 0 — ALWAYS FIRST for portfolio analysis (parallel)

```
mcp__kite__get_profile()
mcp__kite__get_holdings()
```

Extract per stock: `tradingsymbol`, `exchange`, `instrument_token`, `quantity`,
`average_price`, `last_price`, `pnl`, `day_change_percentage`

Compute once and reuse:
- `cost_value = quantity × average_price`
- `current_value = quantity × last_price`
- `total_invested = Σ cost_value`
- `total_current = Σ current_value`
- `total_pnl = total_current − total_invested`
- `total_return_pct = (total_pnl / total_invested) × 100`
- `day_change_abs = last_price × (day_change_percentage/100) × quantity` per stock
- `total_day_change = Σ day_change_abs`
- `weight = current_value / total_current` per stock
- **tracking** = True if `weight ≤ 0.002` (0.2%)

**`instrument_token` is read directly from holdings — never call `search_instruments`.**

---

## Benchmark tokens (hardcoded — do not search)
| Index | Token |
|---|---|
| NIFTY 50 | `256265` |
| NIFTY 500 | `268041` |
| NIFTY SMLCAP 250 | `267273` |

---

## Tracking Position Rule
Weight ≤ 0.2% → label `TRACKING`. Never recommend EXIT based on size alone.
Full stage + concall analysis still applies.

---

## Speed Rules (finish in under 5 minutes)

**Rule 1:** Fire ALL historical data calls in ONE parallel batch (all stocks + benchmarks simultaneously).

**Rule 2:** Use `from_date = today minus 365 days` for ALL fetches. Single dataset serves both modules.

**Rule 3:** Fire ALL WebSearches in parallel with historical data fetches.

**Rule 4:** Write HTML in sequential Bash appends (4 parts, max 200 lines each). Never write full HTML in one string.

**Rule 5:** Extract ONLY these values from each candle dataset:
- `close_today`, `close_30d`, `close_90d`, `close_180d`, `close_365d`
- `ma50`, `ma150`, `ma200` (approx if <200 trading days available)
- `slope200` = ma200[today] − ma200[30d ago]
- `high_1y`, `low_1y`
- `pct_from_high` = ((close_today − high_1y) / high_1y) × 100  ← always ≤ 0
- `pct_above_200ma` = ((close_today − ma200) / ma200) × 100

**Rule 6:** Guards:
- Empty holdings → "No holdings found. Check your Kite session." and stop.
- Stock with <50 trading days → skip MA classification; show "INSUFFICIENT DATA".
- Colour palette exhaustion (>11 stocks) → cycle back with 60% opacity.
- Stage 1 and Stage 2 tracked separately — never merge into "uptrend capital".

---

## Authentication
On session error:
```
mcp__kite__login()
```
Show login URL as markdown link. Wait for user confirmation.

---

## Bridge Server Check

Before opening the portfolio report, check if the bridge server is running:
```bash
curl -s --max-time 2 http://localhost:7891/health
```
- If `{"status":"ok",...}` → open report at `http://localhost:7891/report` (same-origin, Tab 5 works)
- If connection refused → open `~/Desktop/portfolio-report-YYYY-MM-DD.html` directly, and note: "Start `cd portfolio-bridge && npm start` to enable Tab 5 Stock Analyser."

**Why the bridge URL?** Browsers block `fetch()` from `file://` to `localhost` (CORS null-origin restriction). The bridge serves the report at `http://localhost:7891/report` so all Tab 5 fetch calls are same-origin and work without any restrictions.

## JSON Output (replaces HTML generation)

Claude no longer generates HTML. Instead, write a single JSON file per run.
The static `report/report.html` (served by the bridge) reads JSON and renders client-side.

**Module 1 only:** writes `~/.portfolio/data/portfolio-YYYY-MM-DD.json` with `meta`, `portfolio` (partial), `benchmarks`, `holdings[].returns`.
**Module 2 only:** writes same file with `meta`, `portfolio` (full), `holdings[].technical/fundamental_score/earnings/concall/action/risk_flags`.
**Full review:** Module 1 writes first, Module 2 reads, merges, and overwrites with complete data.

JSON data path: `~/.portfolio/data/portfolio-YYYY-MM-DD.json`
Latest symlink: `~/.portfolio/data/latest.json`
Schema reference: `docs/portfolio-data-schema.md`

**Token budget:** Module 1 JSON ≤ 1,500 tokens. Module 2 JSON ≤ 2,000 tokens. Total ≤ 3,000 tokens (vs ~12,000 for HTML generation).

After writing JSON, open the report:
```bash
curl -s --max-time 1 http://localhost:7891/health > /dev/null 2>&1 \
  && open http://localhost:7891/report \
  || echo "Bridge not running. Start: cd portfolio-bridge && npm start"
```

---

## Output (chat — brief)
For portfolio report: current value, total P&L %, top 3 action flags (with scores), and
"Report saved to Desktop and opened in your browser."

For `/kite-portfolio:stock`: ticker, score/100, action, 1-line key insight, standalone HTML path.

## Reference files
- `performance.md` — Module 1: benchmark comparison + JSON write (performance fields)
- `stage-analysis.md` — Module 2: stage classification + fundamental scoring + JSON write (stage/concall fields)
- `stock-analyser.md` — Module 3: on-demand deep-dive for any NSE/BSE ticker
- `json-output.md` — JSON write spec, schema examples, merge pattern, token budget
- `docs/portfolio-data-schema.md` — full JSON field reference (master contract)
- `docs/sample-portfolio-data.json` — complete sample JSON for reference
- `docs/prompt-library-index.md` — prompt ID → section mapping for stock-analyser
- `report/report.html` — static report UI (never modify from skill — managed separately)
