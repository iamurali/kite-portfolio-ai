---
name: stock-researcher
subcommand: performance
description: >
  Module 1: Compare Zerodha Kite portfolio returns against NIFTY 50, NIFTY 500,
  and NIFTY SMLCAP 250 benchmarks. Use when the user says "/stock-researcher:performance",
  "how does my portfolio compare to nifty", "benchmark comparison", "portfolio vs index",
  or "performance report". Writes performance fields to ~/.portfolio/data/portfolio-YYYY-MM-DD.json.
---

# Module 1 — Portfolio Performance vs Benchmarks

## MCP Tools used
- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`

---

## Step 1 — Holdings (from Step 0)
All portfolio totals already computed in SKILL.md Step 0. Use them directly.

---

## Step 2 — Fetch ALL data in ONE parallel batch

Fire ALL simultaneously — no waiting between calls:

```
# 3 benchmark indices (hardcoded tokens)
mcp__kite__get_historical_data(instrument_token=256265, from_date="<today-365d> 00:00:00", to_date="<today> 23:59:59", interval="day")  # Nifty 50
mcp__kite__get_historical_data(instrument_token=268041, from_date="<today-365d> 00:00:00", to_date="<today> 23:59:59", interval="day")  # Nifty 500
mcp__kite__get_historical_data(instrument_token=267273, from_date="<today-365d> 00:00:00", to_date="<today> 23:59:59", interval="day")  # Nifty Smlcap 250

# All portfolio stocks (one per holding, all parallel)
mcp__kite__get_historical_data(instrument_token=<token_from_holdings>, ...)
# ...repeat for every holding

# MF category benchmarks (4 WebSearches, all parallel)
WebSearch("Parag Parikh Flexi Cap Fund direct plan trailing returns 1 year 6 month site:valueresearchonline.com")
WebSearch("Parag Parikh Flexi Cap Fund direct growth returns site:moneycontrol.com")
WebSearch("Nippon India Small Cap Fund direct plan trailing returns 1 year 6 month site:valueresearchonline.com")
WebSearch("Nippon India Small Cap Fund direct growth returns site:moneycontrol.com")
```

`from_date` = today minus 365 days. `to_date` = today.

---

## Step 3 — MF Cross-Verification

| Condition | Action |
|---|---|
| 2+ sources agree within ±0.5% | Use that figure. Mark ✅ Verified |
| Sources diverge >1% | Use `valueresearchonline.com`. Mark ⚠️ Sources diverge |
| Only 1 source | Use it. Mark ⚠️ Single source |
| No data | Mark N/A |

**Always use Direct Plan figures only.**

---

## Step 4 — Compute Returns

From each candle dataset: `close_today`, `close_30d`, `close_90d`, `close_180d`, `close_365d`

```
return_pct(period) = ((close_today − close_Nd) / close_Nd) × 100
```

Portfolio period return = Σ (stock_return_pct × weight) across all stocks.

---

## Step 5 — Benchmark Comparison Table

| Period | Portfolio | Nifty 50 | Nifty 500 | Smlcap 250 | Flexicap MF | Smallcap MF |
|---|---|---|---|---|---|---|
| 1 Month | | | | | | |
| 3 Month | | | | | | |
| 6 Month | | | | | | |
| 1 Year | | | | | | |
| Since Avg Buy | `total_return_pct` | N/A | N/A | N/A | N/A | N/A |

Mark ✅ where portfolio beats benchmark, ❌ where it lags.

---

## Step 6 — Stock-wise Returns Table

| Stock | Weight | 1M | 3M | 6M | 1Y | Since Avg Buy |
|---|---|---|---|---|---|---|

Mark ✅/❌ vs Nifty 50 per period.

---

## Step 7 — 4–6 Key Insights
- Portfolio beats/lags all benchmarks over 1Y?
- Which stocks drag returns most?
- Smallcap tilt justified vs Smallcap 250?
- Would a simple index fund have outperformed?
- 1M vs 1Y momentum trend (improving or deteriorating)?

---

## Step 8 — Write JSON Output

Write to `~/.portfolio/data/portfolio-<YYYY-MM-DD>.json` (atomic `.tmp` → rename).
Token budget: ≤ 1,500 tokens for JSON write.

Populate: `meta`, `portfolio` (partial), `benchmarks`, `holdings[].returns`
Leave `technical`, `fundamental_score`, `earnings`, `concall`, `action` empty — Module 2 fills those.

Schema reference: `../../docs/portfolio-data-schema.md`

After writing, open report:
```bash
open "$(dirname "$0")/../../../../report/report.html" 2>/dev/null \
  || echo "Report at ~/.portfolio/data/latest.json — open report/report.html"
```

If running as part of `/stock-researcher:full`: Module 2 will read this file, merge its data, and overwrite with the complete dataset.
