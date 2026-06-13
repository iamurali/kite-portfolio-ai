---
name: stock-researcher
description: >
  Zerodha Kite portfolio analyser and on-demand stock deep-dive.
  Use when the user says "/stock-researcher", "show portfolio menu", or wants to choose
  which analysis to run. For direct sub-skill invocations use:
  /stock-researcher:performance, /stock-researcher:stage, /stock-researcher:full,
  or /stock-researcher:stock <TICKER>.
---

# Stock Researcher

## MCP Tools used by this skill
- `mcp__kite__login`
- `mcp__kite__get_profile`
- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`
- `mcp__kite__search_instruments` (stock sub-skill only)
- `mcp__kite__get_ltp` (stock sub-skill only)

## Sub-skills

| Command | What it does |
|---|---|
| `/stock-researcher:performance` | Module 1 — Portfolio returns vs NIFTY 50, 500, SMLCAP 250 benchmarks |
| `/stock-researcher:stage` | Module 2 — Weinstein stage + 0-100 fundamental scoring for all holdings |
| `/stock-researcher:full` | Module 1 + 2 — Complete portfolio report |
| `/stock-researcher:stock <TICKER>` | Module 3 — 8-section institutional deep-dive on any NSE/BSE stock |

---

## Module Routing — Read FIRST

**If the invocation is `/stock-researcher:stock <TICKER>` or any "analyse TICKER / deep dive on TICKER / research TICKER" request:**
→ Skip Step 0. Load `stock-researcher-stock` sub-skill and follow its steps.
→ Do NOT call `get_profile()` or `get_holdings()`. Module 3 resolves the ticker via `search_instruments`.

**If the invocation is `/stock-researcher:performance`, `/stock-researcher:stage`, or `/stock-researcher:full`:**
→ Continue to Step 0 below.

**If the invocation is `/stock-researcher` with no sub-command:**
→ Show the menu above and ask which module to run.

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

**Rule 4:** Write JSON in one atomic write (`.tmp` → rename). Token budget ≤ 3,000 total.

**Rule 5:** Extract ONLY these values from each candle dataset:
- `close_today`, `close_30d`, `close_90d`, `close_180d`, `close_365d`
- `ma50`, `ma150`, `ma200` (approx if <200 trading days available)
- `slope200` = ma200[today] − ma200[30d ago]
- `high_1y`, `low_1y`
- `pct_from_high` = ((close_today − high_1y) / high_1y) × 100 ← always ≤ 0
- `pct_above_200ma` = ((close_today − ma200) / ma200) × 100

**Rule 6:** Guards:
- Empty holdings → "No holdings found. Check your Kite session." and stop.
- Stock with <50 trading days → skip MA classification; show "INSUFFICIENT DATA".
- Stage 1 and Stage 2 tracked separately — never merge into "uptrend capital".

---

## Authentication
On session error:
```
mcp__kite__login()
```
Show login URL as markdown link. Wait for user confirmation.

---

## JSON Output

Write a single JSON file per run to `~/.portfolio/data/portfolio-YYYY-MM-DD.json`.
Latest symlink: `~/.portfolio/data/latest.json`

After writing, open the report:
```bash
# Try to open the bundled report.html (adjust path to where plugin is installed)
open "$(dirname "$(dirname "$0")")/../../report/report.html" 2>/dev/null \
  || open ~/Desktop/portfolio-report-*.html 2>/dev/null \
  || echo "Report written to ~/.portfolio/data/latest.json — open report/report.html in your browser"
```

Schema reference: `docs/portfolio-data-schema.md` (in repo root, one level above this plugin folder)

---

## Output (chat — brief)
- Portfolio: current value, total P&L %, top 3 action flags (with scores)
- Stock deep-dive: ticker, score/100, action, 1-line key insight

## Reference files (repo root, relative to plugin)
- `../../docs/portfolio-data-schema.md` — full JSON field reference
- `../../docs/prompt-library-index.md` — prompt ID → section mapping for stock deep-dive
- `../../docs/stage-framework.md` — Weinstein stage rules
- `../../docs/sample-stock-data.json` — exact JSON schema for Module 3 output
- `../../report/report.html` — static report UI (never modify)
