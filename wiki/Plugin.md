# Plugin

kite-portfolio-ai ships as an installable Claude Code plugin in `portfolio-plugin/`. Install it once and the skill, MCP config, and permissions are all set up automatically.

---

## Install

```bash
claude plugin install github:iamurali/kite-portfolio-ai/portfolio-plugin
```

This sets up:
- All 5 sub-skills (`stock-researcher`, `performance`, `stage`, `full`, `stock`)
- Kite MCP server (`mcp-remote` transport, auto-configured)
- Pre-approved permissions so you don't get prompts for every Kite tool call

---

## Plugin commands

The plugin uses the `stock-researcher` namespace:

| Command | Description |
|---|---|
| `/stock-researcher` | Show menu |
| `/stock-researcher:performance` | Portfolio vs benchmarks |
| `/stock-researcher:stage` | Stage + fundamental scoring |
| `/stock-researcher:full` | Complete portfolio report |
| `/stock-researcher:stock TICKER` | Stock deep-dive |

These are equivalent to the `kite-portfolio:*` commands in the manual install.

---

## Pre-configured permissions

The plugin's `.claude-plugin/settings.json` pre-approves all required permissions:

```json
{
  "permissions": {
    "allow": [
      "Bash(mkdir*)",
      "Bash(ls*)",
      "Bash(open*)",
      "Write(~/.portfolio/*)",
      "Read(~/.portfolio/*)",
      "Skill(stock-researcher:*)",
      "mcp__kite__login",
      "mcp__kite__get_profile",
      "mcp__kite__get_holdings",
      "mcp__kite__get_historical_data",
      "mcp__kite__search_instruments",
      "mcp__kite__get_ltp"
    ]
  }
}
```

Without this, Claude Code would prompt for permission on every MCP call and every `~/.portfolio/` write.

---

## MCP auto-configuration

The plugin's `.mcp.json` declares the Kite MCP server using the `mcp-remote` transport:

```json
{
  "mcpServers": {
    "kite": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.kite.trade/mcp"]
    }
  }
}
```

This is auto-applied when the plugin is installed — no manual MCP configuration needed.

---

## Cursor support

The plugin also ships a `.cursor-plugin/plugin.json` for Cursor IDE compatibility. The same sub-skills work in Cursor with the same MCP configuration.

---

## Local install (development)

To install from a local clone instead of GitHub:

```bash
git clone https://github.com/iamurali/kite-portfolio-ai.git
claude plugin install /path/to/kite-portfolio-ai/portfolio-plugin
```

---

## Manual install (no plugin)

If you prefer not to use the plugin system:

```bash
git clone https://github.com/iamurali/kite-portfolio-ai.git
cp -r claude-skill ~/.claude/skills/kite-portfolio
```

Then configure MCP and permissions manually — see [[Installation]].

---

## Plugin vs manual install

| | Plugin install | Manual install |
|---|---|---|
| MCP config | Auto | Manual |
| Permissions | Pre-approved | Prompted each time |
| Skill namespace | `stock-researcher:*` | `kite-portfolio:*` |
| Updates | `claude plugin update` | `git pull` + `cp` |
| Bridge server | Manual start | Manual start |

---

## Related pages

- [[Installation]] — manual install steps
- [[Commands]] — full command reference
