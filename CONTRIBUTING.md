# Contributing

Thank you for considering a contribution to kite-portfolio-ai.

## How to contribute

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Test with a real Kite account (anonymise any output before sharing)
5. Submit a pull request with a clear description

## Areas where help is welcome

- **Additional benchmarks:** Nifty Midcap 150, BSE 500, sector-specific indices
- **New concall sources:** Any whitelisted Indian financial data source
- **Exchange support:** BSE SME, NSE Emerge listings
- **HTML improvements:** New chart types, better mobile layout
- **New AI tool integrations:** Amazon Q, Gemini, Mistral
- **Tests:** Example portfolio fixtures for testing without a live account

## Code style

- Skill files (`.md`) use plain Markdown — no fancy formatting
- Keep instructions explicit and unambiguous — AI tools are literal
- Every MCP tool call must use the exact `mcp__<server>__<tool>()` format
- Always cite which file a change affects (`skill.md`, `performance.md`, etc.)

## Sensitive data

Never commit real portfolio data, API keys, or session tokens.
The `.gitignore` excludes common secrets but please double-check before pushing.

## Questions?

Open an issue with the `question` label.
