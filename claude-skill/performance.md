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

## Step 8 — Write HTML Parts 1 + 2

Follow `html-report.md` chunked write pattern.

**Part 1 (cat >):** `<!DOCTYPE html>` through end of Tab 1 (Overview tab content).
**Part 2 (cat >>):** Tab 2 (Performance tab content).

If full review: leave Tab 3 and Tab 4 for Module 2 to append.
If Module 1 only: after Part 2, write a minimal Part 3 (Tab 3 + Tab 4 placeholders) and Part 4 (closing `</body></html>` + script).

Placeholder for missing tabs when Module 1 runs alone:
```html
<div id="tab-stages" class="tab-content">
  <div class="card" style="text-align:center;padding:40px;color:var(--muted)">
    Run <strong>/portfolio stage</strong> to populate stage analysis.
  </div>
</div>
<div id="tab-rebalance" class="tab-content">
  <div class="card" style="text-align:center;padding:40px;color:var(--muted)">
    Run <strong>/portfolio stage</strong> to populate rebalancing plan.
  </div>
</div>
<script>
function showTab(n,b){document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));document.querySelectorAll('.tab-btn').forEach(e=>e.classList.remove('active'));document.getElementById('tab-'+n).classList.add('active');b.classList.add('active');}
</script></body></html>
```
