# kite-portfolio-ai Wiki

> Institutional-grade AI portfolio analysis for Zerodha Kite — built as a Claude Code skill with a self-hosted dark-mode web app.

---

## What is kite-portfolio-ai?

**kite-portfolio-ai** connects your live Zerodha Kite account to Claude Code via the [Kite MCP server](https://github.com/zerodha/kite-mcp). It fetches your real holdings and 2-year price history, runs AI analysis across three modules, and renders everything in an interactive dark-mode report served locally at `http://localhost:7891`.

No cloud. No API keys. Your portfolio data never leaves your machine.

---

## Two main flows

### Portfolio Review
Run once to analyse your entire portfolio — benchmarks, stage classification, fundamental scoring, and a rebalancing plan.

```
/kite-portfolio:full
```

Opens `http://localhost:7891/report` with a 5-tab report.

### On-Demand Stock Deep-Dive
Research any NSE/BSE stock in depth — earnings, concall intelligence, forensics, moat, sector, verdict.

```
/kite-portfolio:stock AZAD
```

Opens `http://localhost:7891/report/stock/AZAD` with a 13-section interactive report.

---

## Wiki Pages

| Page | What's covered |
|---|---|
| [Installation](Installation.md) | Prerequisites, Kite MCP setup, bridge server, first run |
| [Commands](Commands.md) | All commands, natural language triggers, examples |
| [Portfolio Report](Portfolio-Report.md) | 5 tabs explained — Overview, Performance, Stage, Rebalancing, Stock Analyser |
| [Stock Analyser](Stock-Analyser.md) | 13 sections, verdict banner, interactive chart, references tab |
| [Scoring Rubric](Scoring-Rubric.md) | 0–100 scoring dimensions, action thresholds, override rules |
| [Weinstein Stage Framework](Weinstein-Stage-Framework.md) | Stage 1/2/3/4 definitions, MA logic, classification algorithm |
| [Architecture](Architecture.md) | How it works — data flow, token costs, repo structure, JSON schema |
| [Data Sources](Data-Sources.md) | Whitelisted sources, MF benchmarks, cross-verification rules |
| [Bridge Server](Bridge-Server.md) | Port 7891, endpoints, cache, queue watcher |
| [Plugin](Plugin.md) | Claude Code plugin install, Cursor support, permissions |
| [Contributing](Contributing.md) | PR guide, changelog discipline, screenshot rules |
| [Troubleshooting](Troubleshooting.md) | Common errors and fixes |

---

## Quick reference

| Command | What you get |
|---|---|
| `/kite-portfolio:performance` | Portfolio vs Nifty 50/500/Smallcap + MF benchmarks |
| `/kite-portfolio:stage` | Weinstein stage + 0-100 fundamental score per holding |
| `/kite-portfolio:full` | Both modules — complete 5-tab report |
| `/kite-portfolio:stock TICKER` | 13-section deep-dive on any NSE/BSE stock |

---

## Report preview

![Verdict Banner](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-verdict-banner.png)

![Stock Summary](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-summary.png)
