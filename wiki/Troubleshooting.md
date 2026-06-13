# Troubleshooting

Common issues and fixes.

---

## Authentication

### "Please log in first using the login tool"

The Kite session has expired. Claude will automatically call `mcp__kite__login()` and show a link.

```
[Login to Kite](https://kite.zerodha.com/connect/login?...)
```

Click the link, complete authorisation in your browser, return to Claude and say `continue`.

**Session duration:** 6–8 hours. Re-authenticate at the start of each Claude session.

---

### Login link not clickable

Copy the full URL from Claude's response and paste it into your browser manually.

---

## MCP server

### "kite MCP server not found" or MCP tools unavailable

1. Verify your MCP config file exists and has the correct format — see [Installation](Installation.md)
2. Restart Claude Code after adding the MCP config
3. Check `npx` is available: `npx --version`
4. If `npx` is not found, install Node.js from [nodejs.org](https://nodejs.org)

---

### "spawn npx ENOENT"

Node.js / npx is not in the PATH that Claude Code uses.

**Fix:**
```bash
which npx  # find the full path
```

Then use the full path in your MCP config:
```json
{
  "mcpServers": {
    "kite": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "@zerodha/kite-mcp"]
    }
  }
}
```

---

## Bridge server

### "Bridge not running" or report shows only loading spinner

Start the bridge server:
```bash
cd portfolio-bridge
npm install
npm start
```

Then open `http://localhost:7891/report`.

---

### Port 7891 already in use

Find and kill the existing process:
```bash
lsof -i :7891
kill -9 <PID>
```

Or change the port in `portfolio-bridge/server.js`:
```js
const PORT = 7892;  // or any free port
```

---

### Tab 5 shows "Bridge server not available"

The bridge is not running or the browser can't reach it. Start the bridge (`npm start` in `portfolio-bridge/`) and refresh the page.

---

## Stock analyser

### "Symbol not found" or "No instruments returned"

Use the exact NSE trading symbol. Check on [nseindia.com](https://nseindia.com/get-quotes/equity).

- ✅ `HDFCBANK` not `HDFC Bank` or `HDFC`
- ✅ `TATAELXSI` not `Tata Elxsi`
- ✅ `M&M` for Mahindra (some shells need quotes: `"/kite-portfolio:stock M&M"`)

If the stock is only on BSE and not NSE, the skill automatically tries BSE.

---

### Report shows empty sections or "[object Object]"

The analysis JSON has schema mismatches. Re-run the analysis to generate a fresh v3.0 JSON:

```
/kite-portfolio:stock TICKER
```

If the issue persists, delete the cached JSON and retry:
```bash
rm ~/.portfolio/stock-reports/TICKER/latest.json
```

---

### Analysis timed out after 120 seconds (Tab 5)

Tab 5 triggered background analysis via the bridge queue watcher, but it timed out. Run the analysis directly in Claude Code instead:

```
/kite-portfolio:stock TICKER
```

This runs in the active Claude session and is more reliable than the background queue.

---

### "analyse.mjs: spawn ETIMEDOUT"

The `analyse.mjs` script tries to spawn a Claude subprocess which times out. This is a known limitation — use `/kite-portfolio:stock TICKER` directly in Claude Code instead. The bridge queue watcher is a fallback only.

---

## Portfolio report

### "No portfolio data found. Run /portfolio in Claude Code."

The report has no JSON data to render. Run a portfolio analysis first:
```
/kite-portfolio:full
```

---

### Report shows data from a previous date

Use the date selector dropdown in the top nav to switch between available report dates. Or run a fresh analysis.

---

### Holdings table is empty

The Kite session may have expired between the profile fetch and holdings fetch. Re-authenticate and run again.

---

## Historical data

### "result exceeds maximum allowed tokens"

The candle data response is too large to return directly. The skill saves it to a temp file and processes it via Python — this is handled automatically. If you see this error in an unexpected context, check that the Python processing step completed successfully.

---

### Stock has fewer than 50 trading days of data

New listings or very recently listed stocks may not have enough history for stage classification. The skill labels these `INSUFFICIENT DATA` and skips MA classification. All other analysis sections still run.

---

## Data quality

### Concall section shows generic/empty content

The concall transcript may not be available on trendlyne.com yet (usually published 1–3 days after the call). Re-run after the transcript is available.

---

### Earnings figures differ from what I see on screener.in

The subagent aggregates from multiple sources and some figures may be estimates or trailing twelve months vs reported quarters. Check the References section of the stock report for the exact source URLs used.

---

## Getting help

If you encounter an issue not covered here:
1. Check [CHANGELOG.md](../CHANGELOG.md) for recent changes that may be relevant
2. Open an issue on [GitHub](https://github.com/iamurali/kite-portfolio-ai/issues) with the error message and what command you ran

---

## Related pages

- [Installation](Installation.md) — setup guide
- [Bridge Server](Bridge-Server.md) — bridge-specific configuration
- [Commands](Commands.md) — correct command syntax
