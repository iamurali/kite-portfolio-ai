# Changelog — stock-researcher plugin

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [1.0.0] — 2026-06-12

### Added
- Initial release as `stock-researcher` Claude Code plugin
- **Plugin manifest** (`.claude-plugin/plugin.json`) — installable via `claude plugin install`
- **Kite MCP auto-config** (`.mcp.json`) — Kite MCP server declared in plugin, no manual settings.json needed
- **Cursor IDE support** (`.cursor-plugin/plugin.json`)
- **`/stock-researcher`** — main orchestrator skill with sub-command menu
- **`/stock-researcher:performance`** — Module 1: portfolio benchmark comparison vs NIFTY 50/500/SMLCAP 250
- **`/stock-researcher:stage`** — Module 2: Weinstein stage classification + 0-100 fundamental scoring + 13-section concall card
- **`/stock-researcher:full`** — Module 1 + 2 sequential run
- **`/stock-researcher:stock <TICKER>`** — Module 3: inline 8-section institutional deep-dive (no subprocess, no bridge required)
  - Schema-enforced JSON output matching report.html's exact field contract
  - Eval gate: validates 14 required field paths, retries once if >3 missing
  - Deterministic technical scoring: MA50/150/200, RSI-14, stage, slope computed inline
  - Stage dimension score (H) always locked to deterministic computation — not LLM-scored
- **`eval.yaml`** — 11 skill routing test cases covering natural language and slash command invocations
- **`EXPERIENCE.md`** — Full user installation guide, command reference, scoring rubric, troubleshooting

### Architecture
- **Skill-only plugin** — no npm server, no Node subprocess required
- All Kite MCP calls run in-session (current Claude context) — no MCP session boundary issues
- JSON written to `~/.portfolio/stock-reports/<TICKER>/latest.json` — compatible with report.html Tab 5
- Shared assets (docs/, report/report.html) referenced from parent repo — not duplicated
- Token budget: Module 1 ≤1,500 | Module 2 ≤2,000 | Module 3 ~20-30K (single inference)
