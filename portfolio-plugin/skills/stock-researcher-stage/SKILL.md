---
name: stock-researcher
subcommand: stage
description: >
  Module 2: Weinstein stage classification and 0-100 fundamental scoring for all holdings.
  Use when the user says "/stock-researcher:stage", "stage analysis", "stock stages", "earnings analysis",
  "which stocks to trim", "fundamental scoring", or "rebalancing". Writes stage/concall fields to JSON.
---

# Module 2 — Stage & Earnings Analysis

## MCP Tools used
- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`

---

## Stage Framework — Weinstein Stages

Compute MAs from daily candle `close` values:

| MA | Lookback | Role |
|---|---|---|
| 50 MA | last 50 closes | Short-term trend |
| 150 MA | last 150 closes | Medium-term trend |
| 200 MA | last 200 closes | Stage divider |
| 200 MA slope | (200MA today) − (200MA 30 days ago) | Rising vs falling |

### Stage Rules

| Condition | Stage |
|---|---|
| close_today > ma50 > ma150 > ma200 AND slope200 > 0 | Stage 2 ✅ |
| — ma50 rose above ma200 within last 20 candles | → Stage 2A (fresh breakout) |
| — all 3 MAs aligned 20+ candles consistently | → Stage 2B (established) |
| abs(pct_above_200ma) < 5 AND slope flat | Stage 1 🔵 (basing) |
| Price crossing ma200 repeatedly, slope flattening | Stage 3 ⚠️ (topping) |
| close_today < ma50 < ma150 < ma200 AND slope200 < 0 | Stage 4 🔴 (downtrend) |
| < 50 trading days data | INSUFFICIENT DATA |

---

## Step 1 — Holdings (from Step 0)
Use data from `mcp__kite__get_holdings()` already called in SKILL.md Step 0.

## Step 2 — Fetch candles + WebSearches (parallel)

If Module 1 already ran, reuse its candle data. Otherwise fetch all stocks in one parallel batch:
```
mcp__kite__get_historical_data(instrument_token=<token>, from_date="<today-365d> 00:00:00", to_date="<today> 23:59:59", interval="day")
```

Fire all earnings + concall WebSearches simultaneously:
```
WebSearch("<STOCK_NAME> quarterly results revenue profit concall Q4 FY26 OR Q3 FY26 management guidance site:screener.in OR site:trendlyne.com OR site:moneycontrol.com")
```

**Trusted sources only:** screener.in, trendlyne.com, tickertape.in, moneycontrol.com, economictimes.indiatimes.com, businessstandard.com, bseindia.com, nseindia.com

---

## Step 3 — Concall AI Summary (13-section card per stock)

For each stock, produce:
1. Company Overview (8-10 bullets: business, revenue model, moat)
2. One-Line Summary (single most important investor takeaway)
3. Guidance & Outlook (8-10 points with specific numbers)
4. Strategic Updates (8-10 points: acquisitions, capex, new products)
5. Earnings Triggers (8-10 re-rating catalysts)
6. Risks (8-10 using management's own words where possible)
7. Key Q&A (8-10 most revealing analyst exchanges)
8. Management Consistency (compare last 3 calls: promise vs actual)
9. Investor Verdict (3-5 sentences: tone, guidance credibility, trust)

Management credibility rating: ⭐ to ⭐⭐⭐⭐⭐ based on guidance delivery track record.

---

## Step 4 — Risk Flags Per Stock

| Risk Type | Flag when |
|---|---|
| Valuation | PE > 50x |
| Concentration | Weight > 15% |
| Stage | Stage 3 or 4 |
| SME / Liquidity | Symbol ends with `-SM` |
| Earnings momentum | 2+ quarters declining PAT growth |
| Debt | D/E > 1 (non-financials) |
| Near 52W high | Within 5% — resistance zone |
| Near 52W low | Within 10% — structural weakness |

---

## Step 5 — Fundamental Scoring (0–100)

#### A. Earnings Growth (0–10)
4Q all accelerating→10 | 3of4 growing→8 | 2of4→5 | flat→3 | declining 2+Q→1 | declining 3+Q→0

#### B. Management Credibility (0–10)
⭐⭐⭐⭐⭐→10 | ⭐⭐⭐⭐→8 | ⭐⭐⭐→5 | ⭐⭐→2 | ⭐→0 | no data→4

#### C. Moat (0–10)
Strong (pricing power + switching costs + gaining share)→9-10 | Moderate→5-8 | Weak→1-4 | None→0

#### D. Balance Sheet (0–10)
D/E<0.3 + FCF+ + ROE>20%→10 | D/E<0.5 + FCF+→8 | D/E<1 + FCF+→6 | D/E<1 FCF-→4 | D/E>1→2 | D/E>2→0

#### E. Sector Tailwind (0–10)
Strong govt policy + growing market→9-10 | Moderate→6-8 | Neutral→4-5 | Headwind→1-3 | Structural decline→0

#### F. Competitive Position (0–10)
Gaining share + pricing power→9-10 | Stable→6-8 | Slightly losing→3-5 | Losing + margin squeeze→1-2 | Disrupted→0

#### G. Valuation vs History (0–10)
>40% below 3Y avg + below peers→9-10 | At/below avg→7-8 | 0-20% above→5-6 | 20-40% above→3-4 | >40% above→0-2 | no data→5

#### H. Technical Stage (0–30) — FIXED by stage computation
Stage 2B→30 | Stage 2A→25 | Stage 1→15 | Stage 3→8 | Stage 4→0 | Insufficient→15

### Total Score → Action

| Score | Action |
|---|---|
| 85–100 | STRONG ADD |
| 70–84 | ADD |
| 55–69 | STRONG HOLD |
| 40–54 | HOLD |
| 30–39 | WATCH |
| 15–29 | TRIM |
| 0–14 | EXIT |

**Overrides:**
- TRACKING (weight ≤ 0.2%): never EXIT on size alone
- SME (`-SM`): cap at TRIM regardless of score
- Score 40-54 + Stage 4 + D/E>1 → downgrade to WATCH minimum
- Score 70+ + Stage 4 → ADD/STRONG HOLD with "await Stage 1/2A base" note

---

## Step 6 — Stock Card Output (per holding)

```
[SYMBOL] | Stage X | Weight X.X% | Score X/100 → ACTION
Price ₹X,XXX | Avg Buy ₹X,XXX | P&L +X.X%
Business Quality [A+B+C+D]/40 | Macro/Micro [E+F+G]/30 | Stage [H]/30
[Concall AI summary — 13 sections]
[Risk flags]
```

---

## Step 7 — Stage Summary Table + Rebalancing Priority List

Stage summary footer: `Stage 1: XX% 🔵 | Stage 2: XX% ✅ | Stage 3: XX% ⚠️ | Stage 4: XX% 🔴`

Priority list driven by score:
- EXIT/TRIM (score <30)
- WATCH/REDUCE (score 30-54)
- HOLD/STRONG HOLD (score 55-69)
- STRONG ADD (score 70+) — deploy capital freed from exits here

---

## Step 8 — Write JSON Output

Write or merge into `~/.portfolio/data/portfolio-<YYYY-MM-DD>.json`.
Token budget: ≤ 2,000 tokens. Atomic write (`.tmp` → rename).

Populate: `meta.modules_run`, `portfolio.stage*_pct`, `portfolio.avg_mgmt_stars`, `portfolio.top_priority_actions`, `holdings[].technical`, `holdings[].fundamental_score`, `holdings[].earnings`, `holdings[].risk_flags`, `holdings[].concall`, `holdings[].action`

Schema: `../../docs/portfolio-data-schema.md`

After writing, open report:
```bash
open "$(dirname "$0")/../../../../report/report.html" 2>/dev/null \
  || echo "Report at ~/.portfolio/data/latest.json — open report/report.html"
```

---

## Notes
- **Fundamentals drive action, technicals drive timing.** Stage 4 + score≥55 = WATCH (not EXIT).
- **52W high proximity is NOT a sell signal** if earnings accelerating and score ≥70.
- SME stocks: factor in impact cost. Cap action at TRIM even with low score.
- If fundamental data unavailable: conservative defaults — Earnings=3, Mgmt=4, Moat=4, BS=5, Sector=4, Competitive=4, Valuation=5.
