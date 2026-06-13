# Data Sources

All web research is restricted to a curated whitelist of trusted Indian financial data sources. The skill never fetches data from unverified domains.

---

## Whitelisted sources

| Source | Domain | Used for |
|---|---|---|
| **Screener** | `screener.in` | Quarterly P&L, balance sheet, ratio history, 5-year financials |
| **Trendlyne** | `trendlyne.com` | Concall transcripts, analyst estimates, earnings calendar |
| **Tickertape** | `tickertape.in` | Analyst consensus, earnings estimates, sector classification |
| **Moneycontrol** | `moneycontrol.com` | News, management commentary, event coverage |
| **Economic Times** | `economictimes.indiatimes.com` | Sector news, corporate filings, macro context |
| **Business Standard** | `businessstandard.com` | Competitive landscape, industry analysis |
| **Livemint** | `livemint.com` | Sector policy, regulatory news, macro trends |
| **BSE India** | `bseindia.com` | Exchange announcements, corporate filings, shareholding |
| **NSE India** | `nseindia.com` | Exchange data, F&O chain, promoter disclosures |
| **Value Research** | `valueresearchonline.com` | Valuation ratios, peer comparison, MF returns |

**Red flag / governance research** additionally uses:

| Source | Domain | Used for |
|---|---|---|
| **Capitalmind** | `capitalmind.in` | Deep forensic research, accounting quality analysis |
| **ValuePickr** | `valuepickr.com` | Community research, red flag discussions |

---

## MF benchmark sources

For Module 1 (performance comparison), MF returns are fetched and cross-verified from:

1. `valueresearchonline.com` — primary source
2. `moneycontrol.com` — secondary verification
3. `screener.in` — tertiary check

**Cross-verification rule:**

| Condition | Action |
|---|---|
| 2+ sources agree within ±0.5% | Use that figure — mark ✅ Verified |
| Sources diverge >1% | Use `valueresearchonline.com` — mark ⚠️ Sources diverge |
| Only 1 source found | Use it — mark ⚠️ Single source |
| No data found | Mark N/A |

Always use **Direct Plan** figures. State the as-of date shown by the source.

**MF benchmarks used:**

| Fund | Plan | Purpose |
|---|---|---|
| Parag Parikh Flexi Cap Fund | Direct Growth | Category benchmark — diversified stock-picker |
| Nippon India Small Cap Fund | Direct Growth | Category benchmark — smallcap/midcap exposure |

---

## Price data

All OHLCV price data comes exclusively from **Zerodha Kite** via the Kite MCP server:

- `mcp__kite__get_holdings()` — live portfolio with last prices
- `mcp__kite__get_historical_data()` — 2-year daily candles per stock
- `mcp__kite__get_ltp()` — current prices for stock analyser

No price data is fetched from web sources — Kite is the authoritative source for all Indian market data.

**Benchmark tokens (hardcoded):**

| Index | `instrument_token` | Why hardcoded |
|---|---|---|
| NIFTY 50 | `256265` | Avoids `search_instruments` call — saves tokens |
| NIFTY 500 | `268041` | Same reason |
| NIFTY SMLCAP 250 | `267273` | Same reason |

---

## Data freshness

| Data type | Freshness | Source |
|---|---|---|
| Portfolio holdings | Real-time (live from Kite) | Kite MCP |
| Historical prices | Up to previous close | Kite MCP |
| Quarterly earnings | Updated after results | screener.in, trendlyne.com |
| Concall transcripts | 1–3 days after call | trendlyne.com |
| Analyst estimates | Weekly | tickertape.in |
| MF returns | Daily | valueresearchonline.com |

---

## Data privacy

- No portfolio data is ever sent to any third party
- WebSearches use only publicly available financial information
- Analysis JSON is stored locally at `~/.portfolio/` on your machine
- The bridge server only serves data locally — never exposes it externally

---

## Adding sources

To add a new trusted source:
1. Add the domain to the whitelist in `claude-skill/SKILL.md` under "Data sources — whitelist only"
2. Update `claude-skill/SKILL.md` Step D subagent prompt to include the new domain
3. Update this wiki page
4. Add a `CHANGELOG.md` entry

---

## Related pages

- [Architecture](Architecture.md) — how web searches fit into the analysis pipeline
- [Contributing](Contributing.md) — guidelines for proposing new sources
