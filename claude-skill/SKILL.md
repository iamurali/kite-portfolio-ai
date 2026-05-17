---
name: kite-portfolio
description: >
  Analyses a Zerodha Kite stock portfolio. Use when the user says /portfolio,
  "analyse my portfolio", "portfolio performance", "portfolio vs nifty",
  "how is my portfolio doing", "stage analysis", "stock stages", or
  "portfolio review". Fetches live holdings and historical price data via
  the Kite MCP server, computes benchmark comparisons and Weinstein stage
  classifications, fetches concall AI summaries from trusted sources, and
  generates a 4-tab dark-mode HTML report saved to the Desktop.
---

# Kite Portfolio Analysis Skill

## MCP Tools used by this skill
- `mcp__kite__login`
- `mcp__kite__get_profile`
- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`

## Modules
Two modules — ask user which, or run both for "full review":
1. **Module 1 — Performance vs Benchmarks** → `performance.md`
2. **Module 2 — Stage & Earnings Analysis** → `stage-analysis.md`

For **full review**: Module 1 writes HTML Parts 1–2, Module 2 appends Parts 3–4.

---

## Step 0 — ALWAYS FIRST (parallel)

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

## HTML Assembly

**Module 1 only:** writes Parts 1+2, then Parts 3+4 with placeholders.
**Module 2 only:** writes all 4 parts (Tab 2 = placeholder).
**Full review:** Module 1 writes Parts 1+2, Module 2 appends Parts 3+4.

Tab 2 placeholder (Module-2-only):
```html
<div id="tab-performance" class="tab-content">
  <div class="card" style="text-align:center;padding:40px;color:var(--muted)">
    Run <strong>/portfolio performance</strong> to populate benchmark comparison.
  </div>
</div>
```

---

## Output (chat — brief)
After generating the report: current value, total P&L %, top 3 action flags, and
"Report saved to Desktop and opened in your browser."

## Reference files
- `performance.md` — Module 1 logic
- `stage-analysis.md` — Module 2 logic
- `html-report.md` — HTML write pattern + UI standards
