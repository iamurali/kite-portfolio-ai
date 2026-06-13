# Installation

Complete setup guide for kite-portfolio-ai.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Claude Code** | Latest | [claude.ai/code](https://claude.ai/code) — CLI or desktop app |
| **Node.js** | ≥ 18 | Required for the bridge server. `node --version` to check |
| **Zerodha Kite account** | Any | Free account with CNC holdings |
| **npx** | Comes with Node.js | Used to run the Kite MCP server |

---

## Step 1 — Configure the Kite MCP server

The Kite MCP server connects Claude to your Zerodha account. Configure it once for your AI tool.

### Claude Code

Add to `~/.claude/mcp.json` (create if it doesn't exist):

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

### Cursor

Add to `.cursor/mcp.json` in your project root:

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

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

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

> **Verify:** After restarting your AI tool, you should see `kite` in the MCP tools list. If `npx` is not found, install Node.js from [nodejs.org](https://nodejs.org).

---

## Step 2 — Install the skill

### Option A — Plugin install (recommended)

```bash
claude plugin install github:iamurali/kite-portfolio-ai/portfolio-plugin
```

This installs the skill, configures permissions, and sets up the MCP server automatically.

### Option B — Manual install

```bash
git clone https://github.com/iamurali/kite-portfolio-ai.git
cd kite-portfolio-ai
cp -r claude-skill ~/.claude/skills/kite-portfolio
```

---

## Step 3 — Start the bridge server

The bridge server runs locally at `http://localhost:7891`. It serves the report UI and enables the Tab 5 Stock Analyser.

```bash
cd portfolio-bridge
npm install
npm start
```

You should see:

```
Portfolio Bridge  http://localhost:7891

  Report:      http://localhost:7891/report  ✅ static
  Data:        http://localhost:7891/data/latest  ⚠️  no data yet — run /portfolio
  Health:      http://localhost:7891/health
```

> **Keep the bridge running** while using the report. You can run it in a background terminal or add it to your startup items.

> **Why is the bridge needed?** Browsers block `fetch()` from `file://` to `localhost` regardless of CORS headers. The bridge serves the report at `http://localhost:7891/report` so all API calls are same-origin and work. Without the bridge, all 4 portfolio tabs still work — only the Stock Analyser tab requires it.

---

## Step 4 — Authenticate with Kite

On first use, run any command:

```
/kite-portfolio:full
```

Claude will call `mcp__kite__login()` and show a login link like:

```
[Login to Kite](https://kite.zerodha.com/connect/login?api_key=kitemcp&...)
```

Click the link, authorise access in your browser, then return to Claude and say `continue`.

**Session duration:** The Kite session lasts 6–8 hours. You'll need to re-authenticate each new Claude session or after the session expires.

---

## Verify the installation

```
/kite-portfolio:performance
```

If everything is working, Claude will fetch your holdings and return a benchmark comparison table. The report opens at `http://localhost:7891/report`.

---

## Runtime directories

The bridge server auto-creates these directories on first start:

```
~/.portfolio/
  data/            ← portfolio JSON files (portfolio-YYYY-MM-DD.json)
  stock-reports/   ← per-stock deep-dive JSON (TICKER/latest.json)
  cache/           ← legacy 7-day cache metadata
  analyse-queue/   ← trigger files for background analysis
```

These directories are **outside the repo** and never committed to git — your portfolio data stays private.

---

## Updating

```bash
cd kite-portfolio-ai
git pull
cp -r claude-skill ~/.claude/skills/kite-portfolio
```

The bridge server picks up `report/report.html` changes automatically (no restart needed).

---

## Next steps

- [[Commands]] — full command reference
- [[Bridge-Server]] — advanced bridge configuration
- [[Troubleshooting]] — common setup issues
