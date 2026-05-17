# Kite Portfolio Analysis — GitHub Copilot Instructions

This repository provides an AI-powered portfolio analysis skill for Zerodha Kite.
When the user asks to analyse their stock portfolio, compare returns vs benchmarks,
classify holdings by stage, summarise concall data, or generate a rebalancing plan,
follow the instructions below.

---

## Trigger phrases
Activate these instructions when the user mentions:
- "analyse my portfolio", "portfolio performance", "portfolio vs nifty"
- "stage analysis", "stock stages", "how is my portfolio doing"
- "portfolio review", "rebalancing plan", "/portfolio"

---

## Required: Kite MCP server
This skill requires the Kite MCP server. The following tools must be available:
- `mcp__kite__login` — authenticate session
- `mcp__kite__get_profile` — retrieve user profile
- `mcp__kite__get_holdings` — live CNC holdings with instrument_token
- `mcp__kite__get_historical_data` — daily candle data

If the server is not connected, tell the user to configure it per the README.

---

## Workflow

### Step 0 — Authentication + Holdings (always run first)
Call `mcp__kite__get_profile()` and `mcp__kite__get_holdings()` in parallel.

From holdings compute per stock: `weight = current_value / total_current`.
If `weight ≤ 0.2%` → this is a **tracking position** (label TRACKING, never EXIT based on size).

### Step 1 — Fetch all data in one parallel batch
Fire simultaneously:
- `mcp__kite__get_historical_data` for Nifty 50 (token: 256265), Nifty 500 (268041), Nifty Smallcap 250 (267273)
- `mcp__kite__get_historical_data` for every holding (use `instrument_token` from holdings — do NOT call search_instruments)
- WebSearch for MF returns (Parag Parikh Flexi Cap + Nippon India Small Cap, Direct Plan, from valueresearchonline.com)
- WebSearch for concall/earnings per stock (from: screener.in, trendlyne.com, moneycontrol.com, businessstandard.com only)

Use `from_date = today minus 365 days`, `interval = "day"` for all candle calls.

### Step 2 — Compute period returns
Extract: `close_today`, `close_30d`, `close_90d`, `close_180d`, `close_365d`
Portfolio period return = Σ (stock_return × weight) for each period (1M/3M/6M/1Y).

### Step 3 — Classify stages (Weinstein framework)
Compute `ma50`, `ma150`, `ma200`, `slope200 = ma200_today − ma200_30d_ago`.
- **Stage 2** ✅: price > ma50 > ma150 > ma200 AND slope200 > 0
- **Stage 1** 🔵: price ≈ ma200 (±5%), slope200 ≈ 0 (flat)
- **Stage 3** ⚠️: price choppy around ma200, slope200 flattening or negative
- **Stage 4** 🔴: price < ma50 < ma150 < ma200 AND slope200 < 0

### Step 4 — Concall AI summary per stock
From the WebSearch results, produce for each stock:
1. Company overview (what it does, segments, moat, promoters — 8–10 points)
2. One-line summary from latest concall
3. Guidance & Outlook (specific numbers — 8–10 points)
4. Strategic Updates (8–10 points)
5. Earnings Triggers (8–10 points)
6. Risks — management's own words (8–10 points)
7. Key Q&A — 8–10 most revealing exchanges
8. Management Consistency — compare vs prior guidance, ⭐ score 1–5
9. Investor Verdict — 3–5 sentences: tone, credibility, biggest risk

### Step 5 — Action recommendation per stock
TRACKING (weight ≤ 0.2%) | ✅ STRONG HOLD | HOLD | WATCH | TRIM | EXIT | ADD

### Step 6 — HTML report
Write a 4-tab dark-mode HTML report to `~/Desktop/portfolio-report-YYYY-MM-DD.html`.
Use 4 sequential Bash `cat` appends (never one giant string — token limit).
Open with: `open ~/Desktop/portfolio-report-YYYY-MM-DD.html`

Tabs: Overview (snapshot + holdings + allocation) | Performance (benchmarks) |
Stage Analysis (sidebar selector + stock cards) | Rebalancing (priority list)

---

## Data quality rules
- Only use these sources for concall/earnings: screener.in, trendlyne.com, tickertape.in, moneycontrol.com, economictimes.indiatimes.com, businessstandard.com, livemint.com, bseindia.com, nseindia.com
- MF returns: use Direct Plan only; cross-verify 2 sources; prefer valueresearchonline.com
- If data unavailable: state "No data found — check manually at [source URL]"

## Performance
- All historical data calls and WebSearches in ONE parallel batch
- Extract only 13 values per candle dataset (see Step 2 + Step 3) — do not reprocess arrays
- Stage 1 and Stage 2 capital tracked separately (Stage 1 = basing, NOT uptrend)
- `DAY_CHANGE` = `Σ (last_price × day_change_percentage/100 × quantity)` — API returns percentage, not absolute
