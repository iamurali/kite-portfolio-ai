# kite-portfolio-ai

> AI-powered portfolio analysis for Zerodha Kite — stage classification, benchmark comparison, concall AI summaries, and rebalancing recommendations — all in a dark-mode HTML report on your Desktop.

[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-6366f1)](https://claude.ai/code)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-22c55e)](https://modelcontextprotocol.io)
[![Cursor](https://img.shields.io/badge/Cursor-Rules-60a5fa)](https://cursor.sh)
[![Copilot](https://img.shields.io/badge/GitHub%20Copilot-Instructions-f59e0b)](https://github.com/features/copilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-muted)](LICENSE)

---

## What it does

Run `/portfolio` in Claude Code (or ask any supported AI tool to "analyse my portfolio") and get:

| Module | What you get |
|---|---|
| **Performance vs Benchmarks** | Your 1M/3M/6M/1Y returns vs Nifty 50, Nifty 500, Smallcap 250, Flexicap MF, Smallcap MF — all live from Kite |
| **Stage Analysis** | Weinstein Stage 1–4 classification for every holding using 50/150/200 MA computed from live daily candles |
| **Concall AI Summary** | Company overview, guidance, strategic updates, earnings triggers, risks, key Q&A, management consistency score — from whitelisted sources only |
| **Rebalancing Plan** | Prioritised action list with specific price levels, suggested weights, and capital reallocation table |
| **HTML Report** | A 4-tab dark-mode report saved to your Desktop — opens automatically |

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Zerodha Kite account** | Any account with CNC holdings |
| **Kite MCP server** | The `kite` MCP server must be configured (see [Setup](#setup)) |
| **AI tool** | Claude Code, Cursor, GitHub Copilot, or any MCP-compatible agent |

---

## Setup

### 1. Install Kite MCP server

Add the Kite MCP server to your AI tool's MCP config. The server is provided by [Zerodha's Kite MCP](https://kite.trade) and exposes your portfolio data as tools.

**Claude Code** — add to `~/.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "kite": {
      "command": "npx",
      "args": ["-y", "@zerodha/kite-mcp"],
      "env": {}
    }
  }
}
```

**Cursor** — add to `.cursor/mcp.json` in your project:
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

**VS Code (Copilot)** — add to `.vscode/mcp.json`:
```json
{
  "servers": {
    "kite": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@zerodha/kite-mcp"]
    }
  }
}
```

> **Note:** The exact MCP package name may differ. Check [Zerodha's official documentation](https://kite.trade/docs) for the current package.

### 2. Install the skill

Choose your AI tool:

#### Claude Code (recommended)
```bash
# Clone this repo
git clone https://github.com/YOUR_USERNAME/kite-portfolio-ai.git

# Copy skill files to Claude's skills directory
cp -r kite-portfolio-ai/claude-skill ~/.claude/skills/kite-portfolio

# Restart Claude Code — the skill auto-loads
```

#### Cursor
```bash
# Copy .cursor/rules to your project
cp -r kite-portfolio-ai/.cursor/rules/.  YOUR_PROJECT/.cursor/rules/
```

#### GitHub Copilot
```bash
# Copy instructions to your project
cp kite-portfolio-ai/.github/copilot-instructions.md YOUR_PROJECT/.github/
```

#### Any MCP-compatible tool
Use the files in `mcp/` — they follow the standard MCP tool definition schema.

### 3. Authenticate

On first use, you'll be asked to log in to Kite:
```
/portfolio
```
Click the login link, complete authentication in your browser, then say `continue`.

---

## Usage

### Claude Code
```
/portfolio              — asks which module you want
/portfolio performance  — Module 1 only (benchmarks)
/portfolio stage        — Module 2 only (stage + concall)
/portfolio full review  — both modules, full HTML report
```

### Any AI tool (natural language)
```
"analyse my portfolio"
"portfolio vs nifty"
"stage analysis of my holdings"
"how is my portfolio doing"
"portfolio review"
```

### Output

A file `~/Desktop/portfolio-report-YYYY-MM-DD.html` opens automatically with 4 tabs:
- **Overview** — snapshot, holdings table, allocation chart, top 3 action flags
- **Performance** — benchmark comparison table, visual bar chart, stock-wise returns
- **Stage Analysis** — sidebar stock selector, full concall AI summary per stock
- **Rebalancing** — priority list, capital reallocation table, health score

---

## Report Preview

Open [`examples/sample-report.html`](examples/sample-report.html) in your browser to see a full interactive preview with dummy Indian stock data.

> All screenshots use anonymised dummy data — not a real portfolio.

### Tab 1 — Overview
Snapshot banner with top priority actions · holdings table with stage badges and action badges · portfolio allocation bar chart · stat grid (Stage 2 capital, at-risk capital, tracking positions).

![Overview tab](assets/screenshot-overview.png)

---

### Tab 2 — Performance
Returns vs benchmarks table (1M / 3M / 6M / 1Y) · visual bar chart comparing portfolio vs Nifty 50/500/Smallcap 250/MF benchmarks · stock-wise return breakdown · key insights.

![Performance tab](assets/screenshot-performance.png)

---

### Tab 3 — Stage Analysis
Stage summary table with 50/150/200 MA columns · left sidebar stock selector · full per-stock card with: technical MAs, earnings (last 4Q), company overview, concall AI summary (guidance · triggers · risks · Q&A · management consistency ⭐ · investor verdict) · action block.

![Stage Analysis tab](assets/screenshot-stage-analysis.png)

---

### Tab 4 — Rebalancing
Priority action list (EXIT / TRIM / WATCH / ADD) · capital reallocation table (current vs target weight) · portfolio health score (Stage 2 capital, at-risk %, earnings accelerating, 1Y alpha).

![Rebalancing tab](assets/screenshot-rebalancing.png)

---

The sample uses these dummy Indian stocks as illustration:
`TATAELXSI` · `APOLLOHOSP` · `ASTRAL` · `PIIND` · `MUTHOOTFIN` · `DELHIVERY`
`PAYTM` · `GREAVESCOT` · `CHOLAFIN` · `RELAXO` · `KPIGREEN`

---

## How it works

```
User: /portfolio

Claude Code
  ├── mcp__kite__login()          ← authenticate
  ├── mcp__kite__get_profile()    ← get user info
  ├── mcp__kite__get_holdings()   ← live portfolio  ┐
  ├── mcp__kite__get_historical_data() × 14         ├─ parallel batch
  ├── WebSearch() × 4 (MF returns)                  │
  └── WebSearch() × 11 (concall data)               ┘

  ↓ compute
  ├── Portfolio period returns (1M/3M/6M/1Y)
  ├── Benchmark returns (Nifty 50/500/Smallcap 250)
  ├── MA50/MA150/MA200 + slope → Stage 1/2/3/4
  └── Concall AI summary (overview, guidance, risks, Q&A, consistency)

  ↓ write HTML in 4 Bash appends (< 32K tokens each)
  └── ~/Desktop/portfolio-report-YYYY-MM-DD.html  ← opens automatically
```

**Speed:** ~4–5 minutes for full review (all fetches are parallelised).

---

## Benchmark tokens (hardcoded)

| Index | Kite instrument_token |
|---|---|
| NIFTY 50 | `256265` |
| NIFTY 500 | `268041` |
| NIFTY SMLCAP 250 | `267273` |

---

## Trusted data sources

Concall and earnings data is fetched **only** from:
`screener.in` · `trendlyne.com` · `tickertape.in` · `moneycontrol.com` · `economictimes.indiatimes.com` · `businessstandard.com` · `livemint.com` · `bseindia.com` · `nseindia.com`

MF returns: `valueresearchonline.com` (primary) · `moneycontrol.com` (cross-verify)

---

## Tracking positions

Any holding with weight ≤ 0.2% of portfolio is automatically labelled **TRACKING** — the skill never recommends EXIT based on size alone. Full analysis still runs.

---

## File structure

```
kite-portfolio-ai/
├── README.md                    ← this file
├── LICENSE
│
├── claude-skill/                ← Claude Code skill (primary)
│   ├── SKILL.md                 ← skill entry point (YAML frontmatter + instructions)
│   ├── performance.md           ← Module 1: benchmark comparison
│   ├── stage-analysis.md        ← Module 2: stage + concall analysis
│   └── html-report.md           ← HTML generation instructions + UI standards
│
├── .cursor/
│   └── rules/
│       └── kite-portfolio.mdc   ← Cursor rules format
│
├── .github/
│   └── copilot-instructions.md  ← GitHub Copilot instructions
│
├── mcp/
│   └── tool-definitions.json    ← MCP-standard tool definitions (any MCP client)
│
├── docs/
│   ├── stage-framework.md       ← Weinstein stage classification reference
│   ├── mf-benchmarks.md         ← MF benchmark funds reference
│   └── html-ui-standards.md     ← UI colour palette + component standards
│
└── examples/
    └── sample-report.html       ← Example output (anonymised)
```

---

## Supported tools

| Tool | Format used | Location |
|---|---|---|
| **Claude Code** | SKILL.md (Anthropic format) | `claude-skill/` |
| **Cursor** | `.mdc` rules | `.cursor/rules/` |
| **GitHub Copilot** | `copilot-instructions.md` | `.github/` |
| **VS Code Copilot Chat** | `copilot-instructions.md` | `.github/` |
| **Any MCP client** | MCP tool definitions JSON | `mcp/` |
| **ChatGPT / OpenAI** | System prompt in `docs/` | `docs/system-prompt.md` |

---

## Contributing

PRs welcome for:
- Additional benchmarks (e.g. Midcap 150, BSE 500)
- New concall data sources
- Support for additional exchanges (BSE SME, NSE Emerge)
- Improvements to the HTML report UI

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting.

---

## Disclaimer

⚠️ **AI systems are unpredictable and non-deterministic. This tool is for informational purposes only and does not constitute financial advice. All investment decisions are your own responsibility. Past performance is not indicative of future results. Use at your own risk.**

This tool connects to your live Zerodha Kite account. Never share your API credentials. The tool is read-only — it cannot place, modify, or cancel orders.

---

## License

MIT © 2026 — see [LICENSE](LICENSE)
