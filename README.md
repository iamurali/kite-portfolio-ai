# kite-portfolio-ai

> **Institutional-grade AI stock analysis inside Claude Code** — connect your Zerodha Kite account and get AI-powered portfolio reviews, on-demand deep-dives, concall summaries, financial forensics, and interactive price charts. All self-hosted, all local.

<p align="center">
  <img src="assets/screenshot-verdict-banner.png" alt="Stock Analyser — Verdict Banner" width="900"/>
</p>

<p align="center">
  <a href="https://github.com/iamurali/kite-portfolio-ai/stargazers"><img src="https://img.shields.io/github/stars/iamurali/kite-portfolio-ai?style=social" alt="GitHub Stars"/></a>
</p>

<p align="center">
  <a href="https://claude.ai/code"><img src="https://img.shields.io/badge/Claude%20Code-Skill-6366f1?logo=anthropic&logoColor=white" alt="Claude Code Skill"/></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Kite%20Compatible-22c55e?logo=zerodha&logoColor=white" alt="MCP Compatible"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-f59e0b" alt="MIT License"/></a>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white" alt="Node.js ≥18"/>
  <img src="https://img.shields.io/badge/India%20Markets-NSE%20%2F%20BSE-1d4ed8" alt="NSE / BSE"/>
  <img src="https://img.shields.io/badge/Zerodha%20Kite-Live%20Data-ef4444?logo=zerodha" alt="Zerodha Kite"/>
</p>

<p align="center">
  If this is useful, a ⭐ helps others find it.
</p>

---

## What it does

**kite-portfolio-ai** is a Claude Code skill that connects to your live Zerodha Kite account via the [Kite MCP server](https://github.com/zerodha/kite-mcp). It runs AI analysis across three modules and renders everything in a dark-mode web app at `http://localhost:7891`.

**Two main flows:**

```
/kite-portfolio:full              → 5-tab portfolio report
/kite-portfolio:stock AZAD        → 13-section stock deep-dive
```

No cloud. No API keys. Your portfolio data stays on your machine.

---

## Screenshots

<table>
<tr>
<td><img src="assets/screenshot-stock-summary.png" alt="Earnings — QoQ + YoY" width="430"/><br><sub>4Q earnings with QoQ + YoY growth columns</sub></td>
<td><img src="assets/screenshot-stock-chart.png" alt="Interactive Price Chart" width="430"/><br><sub>Interactive 2Y chart with 20/50/200 DMA overlays</sub></td>
</tr>
<tr>
<td><img src="assets/screenshot-stock-sector.png" alt="Sector Intelligence" width="430"/><br><sub>Structured sector analysis with triggers + TAM</sub></td>
<td><img src="assets/screenshot-stock-forensics.png" alt="Financial Forensics" width="430"/><br><sub>3-year P&L, cash flow, 12-ratio diagnostic + red flags</sub></td>
</tr>
<tr>
<td><img src="assets/screenshot-stock-verdict.png" alt="Verdict + Score" width="430"/><br><sub>Bull/base/bear cases + price levels</sub></td>
<td><img src="assets/screenshot-stock-references.png" alt="References" width="430"/><br><sub>All source links grouped by section</sub></td>
</tr>
</table>

---

## Quick start

### 1. Configure Kite MCP

Add to `~/.claude/mcp.json`:
```json
{
  "mcpServers": {
    "kite": {
      "command": "npx",
      "args": ["-y", "@zerodha/kite-mcp"]
    }
  }
}
```

### 2. Install the skill

```bash
# Plugin install (recommended — auto-configures permissions)
claude plugin install github:iamurali/kite-portfolio-ai/portfolio-plugin

# Or manual install
git clone https://github.com/iamurali/kite-portfolio-ai.git
cp -r claude-skill ~/.claude/skills/kite-portfolio
```

### 3. Start the bridge server

```bash
cd portfolio-bridge && npm install && npm start
```

Serves the report at `http://localhost:7891/report`.

### 4. Run

```
/kite-portfolio:full              ← full portfolio report
/kite-portfolio:stock HDFCBANK   ← deep-dive on any stock
```

On first run, Claude shows a Kite login link. Click it, authorise, then say `continue`.

---

## Commands

| Command | What you get |
|---|---|
| `/kite-portfolio:performance` | Portfolio vs Nifty 50/500/Smallcap 250 + MF benchmarks |
| `/kite-portfolio:stage` | Weinstein stage + 0-100 fundamental score per holding |
| `/kite-portfolio:full` | Both modules — complete 5-tab report |
| `/kite-portfolio:stock TICKER` | 13-section deep-dive on any NSE/BSE stock |

---

## Scoring (0–100)

| Dimensions | Max |
|---|---|
| Earnings Growth · Management · Moat · Balance Sheet | 40 |
| Sector Tailwind · Competitive Position · Valuation | 30 |
| Weinstein Stage (2B=30 · 2A=25 · 1=15 · 3=8 · 4=0) | 30 |

**Actions:** 85+ STRONG ADD · 70+ ADD · 55+ STRONG HOLD · 40+ HOLD · 30+ WATCH · 15+ TRIM · <15 EXIT

---

## Documentation

Full documentation is in the [`wiki/`](wiki/) folder — readable directly on GitHub:

| Page | What's covered |
|---|---|
| [Installation](wiki/Installation.md) | MCP setup, bridge server, first run |
| [Commands](wiki/Commands.md) | All commands, natural language triggers |
| [Stock Analyser](wiki/Stock-Analyser.md) | 13 sections explained with screenshots |
| [Portfolio Report](wiki/Portfolio-Report.md) | 5 tabs — Overview, Performance, Stage, Rebalancing |
| [Scoring Rubric](wiki/Scoring-Rubric.md) | Dimension-by-dimension scoring guide |
| [Weinstein Stage Framework](wiki/Weinstein-Stage-Framework.md) | Stage 1/2/3/4 definitions and classification logic |
| [Architecture](wiki/Architecture.md) | Data flows, token costs, repo structure |
| [Bridge Server](wiki/Bridge-Server.md) | Endpoints, cache, queue watcher |
| [Data Sources](wiki/Data-Sources.md) | Trusted source whitelist, MF benchmarks |
| [Plugin](wiki/Plugin.md) | Plugin install, Cursor support, permissions |
| [Troubleshooting](wiki/Troubleshooting.md) | Common errors and fixes |
| [Contributing](wiki/Contributing.md) | PR guide, changelog discipline |

---

## Disclaimer

⚠️ **For informational purposes only. Not financial advice. All investment decisions are your sole responsibility. Use at your own risk.**

This tool connects to your Zerodha Kite account in **read-only mode** — it cannot place, modify, or cancel orders.

---

## License

MIT © 2026 — see [LICENSE](LICENSE)
