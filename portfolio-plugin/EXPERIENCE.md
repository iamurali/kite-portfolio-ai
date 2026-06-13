# Stock Researcher — Installation & Usage Guide

Institutional-grade Zerodha Kite portfolio analyser and stock deep-dive tool for Claude Code.

---

## Prerequisites

- Zerodha Kite account (free)
- Claude Code CLI or Claude desktop app
- `npx` available (comes with Node.js — `node --version` to verify)

The Kite MCP server (`mcp-remote`) is declared in the plugin's `.mcp.json` and auto-configured when the plugin is installed.

---

## Install

```bash
# From GitHub (once the repo is public)
claude plugin install github:kmurali1/kite-portfolio-ai/portfolio-plugin

# Or install locally from this repo
claude plugin install /path/to/portfolio/portfolio-plugin
```

---

## First Run — Kite Login

The plugin uses the Zerodha Kite MCP server to access your holdings and historical data. On first use:

```
/stock-researcher
```

Claude will call `mcp__kite__login()` and show you a login link. Click it, authorise access in your browser, then confirm back to Claude. The session lasts until you close Claude or it expires (usually 6–8 hours).

---

## Commands

### `/stock-researcher` — Menu
Shows all available sub-commands. Use when you want to choose.

### `/stock-researcher:performance` — Module 1
Compares your portfolio returns against NIFTY 50, NIFTY 500, and NIFTY SMLCAP 250 over 1M/3M/6M/1Y.
Also compares against Parag Parikh Flexi Cap and Nippon India Small Cap MF categories.

```
/stock-researcher:performance
→ "how does my portfolio compare to nifty"
→ "benchmark comparison"
```

### `/stock-researcher:stage` — Module 2
Runs Weinstein stage classification and 0-100 fundamental scoring for every holding.
Generates a full rebalancing priority list driven by fundamentals (not just stage).

```
/stock-researcher:stage
→ "stage analysis"
→ "which stocks should I trim"
→ "fundamental scoring"
```

### `/stock-researcher:full` — Full Portfolio Report
Runs Module 1 then Module 2. Complete analysis of your entire portfolio.

```
/stock-researcher:full
→ "analyse my portfolio"
→ "full portfolio review"
→ "complete analysis"
```

### `/stock-researcher:stock <TICKER>` — Stock Deep-Dive
8-section institutional analysis of any NSE/BSE stock. Does NOT require the stock to be in your portfolio.

```
/stock-researcher:stock KMEW
→ "deep dive on NETWEB"
→ "research TATAMOTORS fundamentals"
→ "analyse HDFCBANK"
```

**8 sections generated:**
1. Quarterly Earnings Analysis (4Q table, beat/miss, momentum)
2. Concall Intelligence (13-section card: guidance, risks, Q&A, consistency)
3. Financial Forensics (3-year P&L, cash flow, red flags, 12-ratio diagnostic)
4. Competitive Landscape & Moat (peer table, 10-dimension moat radar)
5. Sector Intelligence (growth drivers, regulatory context, trigger map)
6. Growth Triggers (sized triggers with timeline and probability)
7. Management Integrity Score (promise vs delivery matrix, grade A–D)
8. Final Verdict (bull/base/bear cases, entry zone, stop-loss, key monitorable)

---

## View the Report

After any analysis run, Claude writes JSON to `~/.portfolio/` and tells you to open the report:

```bash
# Open the bundled report UI
open /path/to/portfolio/report/report.html

# Or after the analysis, Claude will show the direct path
```

The report is a dark-mode 5-tab HTML file that renders all data client-side from the JSON.

**Tab 5 — Stock Analyser:** type any ticker → click Analyse → full 8-section render.
Note: Tab 5's "Analyse" button requires the portfolio-bridge server to trigger background analysis. Without it, use `/stock-researcher:stock TICKER` directly from Claude and then open the report to view results.

---

## Cache

Analysis results are cached for 7 days in `~/.portfolio/cache/<TICKER>-<date>.json`.

To force a fresh re-analysis:
```
/stock-researcher:stock KMEW --refresh
```
(or ask Claude: "re-analyse KMEW with fresh data")

---

## Scoring Rubric (Quick Reference)

| Dimension | Max | What it measures |
|---|---|---|
| A. Earnings Growth | 10 | 4Q PAT YoY trend |
| B. Mgmt Credibility | 10 | Guidance delivery track record |
| C. Moat Strength | 10 | Pricing power, switching costs, share |
| D. Balance Sheet | 10 | D/E, FCF, ROE |
| E. Sector Tailwind | 10 | Govt policy, cycle stage |
| F. Competitive Position | 10 | Market share gaining/stable/losing |
| G. Valuation | 10 | P/E vs 3Y average and peers |
| H. Technical Stage | 30 | Weinstein stage (2B=30, 4=0) |
| **Total** | **100** | |

| Score | Action |
|---|---|
| 85–100 | STRONG ADD |
| 70–84 | ADD |
| 55–69 | STRONG HOLD |
| 40–54 | HOLD |
| 30–39 | WATCH |
| 15–29 | TRIM |
| 0–14 | EXIT |

---

## Troubleshooting

**"Symbol not found"** — Use the exact NSE symbol. Check on nseindia.com. Example: `HDFCBANK` not `HDFC Bank`.

**"No data available" in report sections** — The analysis JSON was written but some fields are missing. Re-run the stock analysis: `/stock-researcher:stock TICKER`. The skill will retry with an explicit fill instruction.

**Kite session expired** — Claude will show a login link. Click it and re-authorise.

**Report shows old data** — Cache is 7 days. Use `--refresh` to force fresh analysis.

---

## Data Privacy

- No portfolio data is ever sent to Zerodha or any third party beyond what the Kite MCP API requires for your own account
- Analysis JSON is stored locally at `~/.portfolio/` on your machine only
- WebSearches use public financial data sources (screener.in, trendlyne.com, etc.)
