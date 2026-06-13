# Commands

Full reference for all kite-portfolio-ai commands.

---

## Command overview

| Command | Module | Description |
|---|---|---|
| `/kite-portfolio` | — | Show sub-skill menu |
| `/kite-portfolio:performance` | Module 1 | Portfolio returns vs benchmarks |
| `/kite-portfolio:stage` | Module 2 | Stage classification + fundamental scoring |
| `/kite-portfolio:full` | 1 + 2 | Complete portfolio report |
| `/kite-portfolio:stock TICKER` | Module 3 | On-demand stock deep-dive |

---

## `/kite-portfolio:performance` — Module 1

Compares your portfolio returns against 5 benchmarks over 1M / 3M / 6M / 1Y.

**Benchmarks:**
- NIFTY 50 (token `256265`)
- NIFTY 500 (token `268041`)
- NIFTY SMLCAP 250 (token `267273`)
- Parag Parikh Flexi Cap Fund (Direct Growth)
- Nippon India Small Cap Fund (Direct Growth)

**Output:** Benchmark comparison table, 1-year bar chart, stock-wise returns table, key insights.

**Natural language triggers:**
```
"how does my portfolio compare to nifty"
"benchmark comparison"
"portfolio vs nifty 50"
"returns vs market"
```

---

## `/kite-portfolio:stage` — Module 2

Runs Weinstein stage classification and 0-100 fundamental scoring for every holding. Generates a full rebalancing priority list.

**Output:** Stage summary table, per-stock cards with MA levels, earnings, concall summary, score chip, action recommendation.

**Natural language triggers:**
```
"stage analysis of my holdings"
"which stocks should I trim"
"fundamental scoring"
"rebalancing plan"
"which stocks are in stage 4"
```

---

## `/kite-portfolio:full` — Modules 1 + 2

Runs Module 1 then Module 2. Complete 5-tab portfolio report.

**Output:** All 5 tabs — Overview, Performance, Stage Analysis, Rebalancing, Stock Analyser shell.

**Natural language triggers:**
```
"analyse my portfolio"
"full portfolio review"
"complete analysis"
"portfolio report"
```

**Speed:** ~5–7 minutes for a 15–20 stock portfolio.

---

## `/kite-portfolio:stock TICKER` — Module 3

On-demand institutional-grade deep-dive for any NSE/BSE stock. Does **not** require the stock to be in your portfolio.

```
/kite-portfolio:stock AZAD
/kite-portfolio:stock HDFCBANK
/kite-portfolio:stock TATAELXSI
/kite-portfolio:stock KIRLOSENG
```

**What it does:**
1. Fetches 2-year daily OHLCV data from Kite
2. Computes MA20/50/150/200, RSI14, Weinstein stage, slope inline
3. Runs 6 parallel web searches (earnings, concall, moat, balance sheet, sector, valuation)
4. Generates 13-section analysis with 0-100 score

**Output:** Opens `http://localhost:7891/report/stock/TICKER` with a full interactive report.

**Natural language triggers:**
```
"deep dive on TATAELXSI"
"research BAJAJFINSV fundamentals"
"analyse HDFCBANK"
"should I buy AZAD"
```

**Speed:** ~3–5 minutes fresh, ~2 seconds from 7-day cache.

**Ticker format:** Use the exact NSE symbol. Check on [nseindia.com](https://nseindia.com) if unsure.
- ✅ `HDFCBANK` not `HDFC Bank`
- ✅ `TATAELXSI` not `Tata Elxsi`
- ✅ `M&M` for Mahindra (use quotes if needed)

---

## Cache behaviour

Stock deep-dive results are cached for **7 days** in `~/.portfolio/stock-reports/TICKER/latest.json`.

On a cache hit, Claude reports the age and opens the existing report instantly.

**Force refresh:**
```
/kite-portfolio:stock AZAD --refresh
```
Or ask: `"re-analyse AZAD with fresh data"`

---

## Authentication

On session error, Claude shows a login link automatically. Complete Kite login in your browser then say `continue`.

Session typically lasts 6–8 hours. Re-authenticate at the start of each Claude session.

---

## Related pages

- [[Portfolio-Report]] — what each tab shows
- [[Stock-Analyser]] — the 13 sections in detail
- [[Scoring-Rubric]] — how the 0-100 score is computed
