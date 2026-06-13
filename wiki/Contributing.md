# Contributing

PRs are welcome. This page covers the conventions you need to follow to keep the codebase consistent.

---

## Areas where help is especially welcome

- **Additional benchmark indices** — Midcap 150, BSE 500, sector ETFs (Nifty IT, Nifty Bank, Nifty Pharma)
- **New concall / earnings sources** — alternative transcripts, SEBI filings
- **BSE SME / NSE Emerge support** — `-SM` suffix stocks have liquidity constraints, better handling needed
- **Chart enhancements** — candlestick mode, relative strength vs index overlay
- **New AI tool integrations** — Amazon Q, Gemini, OpenAI Assistants
- **Report UI improvements** — mobile responsiveness, dark/light mode toggle

---

## What to update with every skill change

| Changed | Also update |
|---|---|
| Any `claude-skill/*.md` | `CHANGELOG.md` under `[Unreleased]` |
| Any tab in `report/report.html` | `assets/screenshot-*.png` for that tab |
| Any new JSON field | `docs/portfolio-data-schema.md` |
| New command or trigger | `wiki/Commands.md`, `README.md` |
| New data source | `wiki/Data-Sources.md`, `claude-skill/SKILL.md` whitelist |

---

## CHANGELOG discipline

Every change to a skill file or the report gets an entry under `[Unreleased]`:

```markdown
## [Unreleased]

### Added
- **`report/report.html`** — Added X feature to Y section.

### Changed
- **`claude-skill/SKILL.md`** — Updated Z step to do W instead of V.

### Fixed
- **`portfolio-bridge/server.js`** — Fixed race condition in queue watcher.
```

When tagging a release, move `[Unreleased]` entries to a versioned section:
```markdown
## [4.0.0] — 2026-07-01
```

---

## Screenshot discipline

Every change that affects the visual output of a tab or section needs a fresh screenshot.

| Section affected | Screenshot file |
|---|---|
| Portfolio Overview | `assets/screenshot-overview.png` |
| Performance tab | `assets/screenshot-performance.png` |
| Stage Analysis tab | `assets/screenshot-stage-analysis.png` |
| Rebalancing tab | `assets/screenshot-rebalancing.png` |
| Verdict banner | `assets/screenshot-verdict-banner.png` |
| Stock Summary | `assets/screenshot-stock-summary.png` |
| Price Chart | `assets/screenshot-stock-chart.png` |
| Forensics | `assets/screenshot-stock-forensics.png` |
| Sector | `assets/screenshot-stock-sector.png` |
| Verdict + Score | `assets/screenshot-stock-verdict.png` |
| Management Integrity | `assets/screenshot-stock-integrity.png` |
| Moat & Peers | `assets/screenshot-stock-moat.png` |
| References | `assets/screenshot-stock-references.png` |

**How to take screenshots:**
1. Start the bridge: `cd portfolio-bridge && npm start`
2. Run `/kite-portfolio:stock AZAD` (or any stock with fresh data)
3. Open `http://localhost:7891/report/stock/AZAD`
4. Use the Puppeteer script at `/tmp/screenshot-full.mjs` (see below) or take manually
5. Save to `assets/` at ≤ 500 KB per file

```bash
node /tmp/screenshot-full.mjs  # takes all 9 stock analyser screenshots automatically
```

---

## Sample data discipline

Any file under `docs/` committed to the repo must use anonymised data only.

**Before committing sample data files:**
- `meta.user_name` → `"Demo User"` (never a real name)
- Holdings symbols → real tickers are OK (public), but quantities and buy prices should be illustrative
- No account IDs, profile IDs, or broker credentials

```bash
grep -rE "(your-real-name|profile_id|account_id)" docs/
```

---

## CSS variables — never change these

```css
--bg: #0f1117       --surface: #1a1d27    --surface2: #22263a
--border: #2e3250   --text: #e2e8f0       --muted: #8892b0
--green: #22c55e    --red: #ef4444        --yellow: #f59e0b
--blue: #60a5fa     --purple: #a78bfa     --accent: #6366f1
```

These are used everywhere in `report/report.html`. Changing them breaks visual consistency.

---

## Commit message format

```
feat(scope): short description

Longer explanation if needed.

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>
```

Scopes: `skill`, `report`, `bridge`, `docs`, `plugin`, `chore`

---

## Hardcoded paths — use `~` not absolute paths

Never hardcode `/Users/username/` in committed files. Use:
- `~/.portfolio/` in shell commands
- `os.path.expanduser('~/.portfolio/')` in Python
- `path.join(os.homedir(), '.portfolio')` in Node.js

---

## Related pages

- [Architecture](Architecture.md) — understand the codebase before contributing
- [Data Sources](Data-Sources.md) — how to propose new trusted sources
