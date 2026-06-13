# Portfolio Report

The portfolio report is a 5-tab dark-mode web app served at `http://localhost:7891/report`. It renders entirely client-side from a compact JSON file written by Claude — no server-side processing, no page reloads.

---

## Tab 1 — Overview

**Snapshot stat grid:**
- Total current value
- Total invested
- Total P&L (₹ and %)
- Today's change (₹)
- Stage 2 capital %
- At-risk capital (Stage 3/4) %
- Number of tracking positions

**Priority action list** — top stocks requiring attention, ranked by urgency:
- HIGH (red) — EXIT or TRIM candidates
- MEDIUM (amber) — WATCH candidates
- ADD (green) — buying opportunities

**Holdings table** — full portfolio with:
- Stock · Qty · Avg Buy · LTP · Value · Weight · P&L · Return · Day Change · Stage badge · Action chip

**Portfolio allocation bars** — visual weight breakdown per stock with color-coded stage.

---

## Tab 2 — Performance

**Benchmark comparison table** — portfolio returns at 1M / 3M / 6M / 1Y vs:

| Benchmark | Type |
|---|---|
| NIFTY 50 | Index |
| NIFTY 500 | Index |
| NIFTY SMLCAP 250 | Index |
| Parag Parikh Flexi Cap | Mutual Fund (Direct Growth) |
| Nippon India Small Cap | Mutual Fund (Direct Growth) |

Green = portfolio beat the benchmark. Red = portfolio lagged.

**1-Year bar chart** — visual comparison of all benchmarks vs portfolio for the 1Y period.

**Stock-wise returns table** — per-stock performance at 1M / 3M / 6M / 1Y / Since Buy, with colour coding vs Nifty 50.

**Key insights** — auto-generated observations (e.g. "7 of 12 stocks beat Nifty 50 over 1Y").

---

## Tab 3 — Stage Analysis

**Stage summary table** — every holding with:
- Stage badge (1/2A/2B/3/4)
- Weight %
- Score chip (0-100, click to expand breakdown)
- Action badge
- Earnings trend
- Management ⭐ rating
- Valuation signal
- Key risk flag

**Per-stock detail cards** — click any stock in the sidebar to expand:
- MA50 / MA150 / MA200 levels with slope direction
- % above/below 200MA
- % from 52W high / low
- 4-quarter earnings grid
- Concall AI summary (13-section card)
- Action block with score and rationale

---

## Tab 4 — Rebalancing

**Priority list** — ranked action items across the full portfolio:
- Each item shows the stock, current weight, recommended action, score, and rationale
- Grouped by priority: EXIT → TRIM → WATCH → HOLD → ADD → STRONG ADD

**Score chips** — `[72/100]` — click to expand the full dimension breakdown:
```
Business Quality  28/40   Earnings:9 · Mgmt:8 · Moat:7 · BalSheet:4
Macro/Micro       24/30   Sector:9 · Competitive:8 · Valuation:7
Technical Stage   30/30   Stage 2B
```

**Capital reallocation table** — current % vs target %, action, and rationale per stock.

**Portfolio health metrics** — composite health score, concentration risk, stage distribution, % in uptrend vs downtrend.

---

## Tab 5 — Stock Analyser

The embedded stock analyser — type any NSE/BSE ticker to run an on-demand deep-dive inline.

**Empty state (before analysis):**
- Grid of your current holdings — click any to analyse
- "Recently Analysed" grid — previously run stocks with cached results
- Bulk analyse button — queues all holdings for background analysis

**After analysis loads:**
- Left sidebar nav with 13 section buttons
- Right content area rendering the selected section
- Verdict banner always visible at the top

> Tab 5's "Analyse" button triggers the bridge server to spawn analysis in the background. The panel polls every 5 seconds and auto-loads the result when ready. Alternatively, run `/kite-portfolio:stock TICKER` directly in Claude Code for faster results.

---

## JSON data file

The report reads from `~/.portfolio/data/latest.json` (symlink to the most recent `portfolio-YYYY-MM-DD.json`).

**Module 1** writes: `meta`, `portfolio` (partial), `benchmarks`, `holdings[].returns`
**Module 2** adds: `holdings[].technical`, `.fundamental_score`, `.earnings`, `.concall`, `.action`, `.risk_flags`
**Full run** writes both in sequence, merges, and saves once.

File size: ~15–20 KB. Token cost to write: ~2,500 tokens.

To switch between historical report dates, use the date selector dropdown in the top nav.

---

## Related pages

- [Stock Analyser](Stock-Analyser.md) — deep-dive sections in detail
- [Scoring Rubric](Scoring-Rubric.md) — how the 0-100 score is computed
- [Weinstein Stage Framework](Weinstein-Stage-Framework.md) — stage classification
- [Bridge Server](Bridge-Server.md) — how the report is served
