---
name: portfolio
subcommand: performance
description: >
  Module 1: Compare Zerodha Kite portfolio returns against NIFTY 50, NIFTY 500,
  and NIFTY SMLCAP 250 benchmarks. Use when the user says "/kite-portfolio:performance",
  "how does my portfolio compare to nifty", "benchmark comparison", or "portfolio vs index".
  Writes performance fields to ~/.portfolio/data/portfolio-YYYY-MM-DD.json and opens report.
---

# Module 1 — Portfolio Performance vs Benchmarks

## MCP Tools used
- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`

---

## Step 1 — Holdings (from Step 0)
All portfolio totals already computed in skill.md Step 0. Use them directly.

---

## Step 2 — Fetch ALL data in ONE parallel batch

Fire ALL simultaneously — no waiting between calls:

```
# 3 benchmark indices
mcp__kite__get_historical_data(instrument_token=256265, from_date="YYYY-MM-DD 00:00:00", to_date="YYYY-MM-DD 23:59:59", interval="day")  # Nifty 50
mcp__kite__get_historical_data(instrument_token=268041, from_date="YYYY-MM-DD 00:00:00", to_date="YYYY-MM-DD 23:59:59", interval="day")  # Nifty 500
mcp__kite__get_historical_data(instrument_token=267273, from_date="YYYY-MM-DD 00:00:00", to_date="YYYY-MM-DD 23:59:59", interval="day")  # Nifty Smlcap 250

# All stocks (one per holding, all parallel)
mcp__kite__get_historical_data(instrument_token=<token_from_holdings>, from_date="YYYY-MM-DD 00:00:00", to_date="YYYY-MM-DD 23:59:59", interval="day")
# ...repeat for every holding

# MF returns (4 WebSearches, all parallel)
WebSearch("Parag Parikh Flexi Cap Fund direct plan 1 year 6 month 3 month 1 month returns site:valueresearchonline.com")
WebSearch("Parag Parikh Flexi Cap Fund direct growth trailing returns site:moneycontrol.com")
WebSearch("Nippon India Small Cap Fund direct plan 1 year 6 month 3 month returns site:valueresearchonline.com")
WebSearch("Nippon India Small Cap Fund direct growth trailing returns site:moneycontrol.com")
```

`from_date` = today minus 365 days. `to_date` = today. **Same dataset used by Module 2 — do not re-fetch.**

---

## Step 3 — MF Cross-Verification

From the 4 WebSearch results:

| Condition | Action |
|---|---|
| 2+ sources agree within ±0.5% | Use that figure. Mark ✅ Verified |
| Sources diverge >1% | Use `valueresearchonline.com`. Mark ⚠️ Sources diverge |
| Only 1 source | Use it. Mark ⚠️ Single source |
| No data | Mark N/A |

**Always use Direct Plan figures only.** State the as-of date shown by source.
These are category benchmarks for comparison — not the user's actual MF portfolio.

---

## Step 4 — Compute Returns (Rule 5 values only)

From each candle dataset extract: `close_today`, `close_30d`, `close_90d`, `close_180d`, `close_365d`

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

## Step 6 — Stock-wise Returns

| Stock | Weight | 1M | 3M | 6M | 1Y | Since Avg Buy |
|---|---|---|---|---|---|---|

Mark ✅/❌ vs Nifty 50 per period.

---

## Step 7 — 4–6 Insights
- Portfolio beats/lags all benchmarks over 1Y?
- Which stocks drag returns?
- Smallcap tilt justified vs Smallcap 250?
- Would index fund have outperformed?
- 1M vs 1Y momentum trend (improving or deteriorating?)

---

## Step 8 — Write JSON Output

**No HTML generation.** Write a single JSON file following `docs/portfolio-data-schema.md`.

Populate these JSON sections from Module 1 data:
- `meta` — generated_at, report_date, user_name, schema_version, modules_run: ["performance"]
- `portfolio` — all portfolio-level fields (total_invested, total_current, pnl, return_pct, day_change, num_stocks)
  - Leave stage*_pct, atrisk_pct, accel_pct, avg_mgmt_stars, top_priority_actions as null (Module 2 fills these)
- `benchmarks` — nifty50, nifty500, smlcap250, flexicap_mf, smallcap_mf, portfolio returns for 1m/3m/6m/1y
- `holdings[]` — for each stock: core fields + returns object + vs_nifty50 beat flags
  - Leave technical, fundamental_score, earnings, risk_flags, concall, action as absent (Module 2 adds them)

```bash
mkdir -p ~/.portfolio/data

# Write to temp then rename atomically
cat > ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json << 'EOF'
{"meta":{"generated_at":"<ISO_TIMESTAMP>","report_date":"<YYYY-MM-DD>","user_name":"<NAME>","schema_version":"2.0","modules_run":["performance"]},"portfolio":{...},"benchmarks":{...},"holdings":[...]}
EOF
mv ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json \
   ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json

ln -sf ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json \
        ~/.portfolio/data/latest.json
```

**Token budget: target ≤ 1,500 tokens for the JSON write** (compact, no whitespace in final output).

After writing, check bridge and open report:
```bash
curl -s --max-time 1 http://localhost:7891/health > /dev/null 2>&1 && open http://localhost:7891/report || echo "Start bridge: cd portfolio-bridge && npm start"
```

If full review: Module 2 will read this JSON, merge its data, and overwrite the file with the complete dataset.
