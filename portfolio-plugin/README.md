# stock-researcher

Claude Code plugin for institutional-grade Zerodha Kite portfolio analysis and stock deep-dives.

## Install

```bash
claude plugin install github:kmurali1/kite-portfolio-ai/portfolio-plugin
```

## Commands

| Command | Description |
|---|---|
| `/stock-researcher` | Show menu |
| `/stock-researcher:performance` | Portfolio vs NIFTY 50/500/SMLCAP 250 benchmarks |
| `/stock-researcher:stage` | Weinstein stage + 0-100 fundamental scoring |
| `/stock-researcher:full` | Complete portfolio report |
| `/stock-researcher:stock TICKER` | 8-section stock deep-dive |

## Requirements

- Zerodha Kite account
- `npx` (Node.js)

## Documentation

See [EXPERIENCE.md](EXPERIENCE.md) for full installation guide, usage examples, and troubleshooting.

See the [repository](https://github.com/kmurali1/kite-portfolio-ai) for architecture details, JSON schema reference, and scoring rubric.
