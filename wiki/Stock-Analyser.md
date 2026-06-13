# Stock Analyser

The stock analyser (`/kite-portfolio:stock TICKER`) produces an institutional-grade 13-section deep-dive on any NSE/BSE stock, rendered at `http://localhost:7891/report/stock/TICKER`.

---

## Verdict Banner

Every stock report opens with a verdict banner at the top — visible across all sections.

![Verdict Banner](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-verdict-banner.png)

**Banner contains:**
- **BUY / HOLD / WATCH / SELL** — mapped from score action (ADD→BUY, HOLD, TRIM/EXIT→SELL)
- **Score ring** — SVG arc showing 0-100 score with green/amber/red colouring
- **Upside %** — `((analyst_target_high - current_price) / current_price) × 100`
- **Downside %** — `((bear_target - current_price) / current_price) × 100`
- **Analyst count** — number of analysts covering the stock
- **Key insight** — one-line summary of the most important thing to know
- **Bull case pill** — first two assumptions from the bull scenario
- **Bear case pill** — first two assumptions from the bear scenario

---

## Section 1 — Summary

![Stock Summary](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-summary.png)

**4-quarter earnings table** with:
- Revenue (Actual vs Estimate) + Beat/Miss badge
- PAT (Actual vs Estimate) + Beat/Miss badge
- **QoQ Rev%** and **QoQ PAT%** — quarter-on-quarter growth
- **YoY Rev%** and **YoY PAT%** — year-on-year growth
- EPS, Market Reaction %, Analyst Sentiment

**Key ratio tiles:** TTM P/E · Sector P/E · D/E · ROE · ROCE · FCF · Earnings Trend

---

## Section 2 — Strategic Updates

Key corporate events with polarity chips (positive / neutral / negative):
- New contracts or partnerships signed
- Capacity additions or facility commissions
- Product launches or new market entries
- Order book milestones

---

## Section 3 — Guidance Outlook

Management guidance structured by time horizon:
- **Near Term (next 1–2 quarters)** — revenue/margin targets, specific deliverables
- **Medium Term (6–12 months)** — growth targets, expansion plans
- **Long Term (1+ years)** — aspirational revenue targets, new business lines

Each item has a polarity chip and timeline tag.

---

## Section 4 — Risk Analysis

Structured risk flags from the concall and analyst research:
- Operational risks (execution, supply chain, customer concentration)
- Financial risks (FCF, working capital, leverage)
- External risks (macro, regulatory, competitive threats)

Each risk is tagged with a negative polarity chip.

---

## Section 5 — Q&A Summary

Verbatim concall Q&A rated for management transparency:

| Rating | Meaning |
|---|---|
| **DIRECT** | Clear, specific answer with numbers or timelines |
| **PARTIALLY DIRECT** | Acknowledged the issue but incomplete answer |
| **EVASIVE** | Deflected, non-committal, or repeated prior talking points |

Each exchange shows the analyst question, management answer, and assessment reasoning.

---

## Section 6 — Earning Triggers

Sized catalysts with timeline and probability:

| Field | Values |
|---|---|
| Trigger | What needs to happen |
| Type | Contract / New Product / Customer / Balance Sheet / Macro |
| Revenue Impact | Estimated incremental revenue or margin effect |
| Timeline | When this trigger could materialise |
| Probability | HIGH / MEDIUM / LOW |

---

## Section 7 — Management Consistency

Promise vs delivery matrix — tracks what management said vs what they delivered:

- **Integrity grade** A / B+ / B / C+ / C / D
- **Delivery rate %** — % of guidance items delivered or beaten
- **Transparency** — how management handles misses
- **Tone consistency** — whether messaging changes when results are bad
- Per-quarter table: promise → delivered (BEAT / IN-LINE / MISSED / PENDING) → actual → flags

![Management Consistency](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-integrity.png)

---

## Section 8 — Financial Forensics

![Financial Forensics](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-forensics.png)

**3-Year P&L table:** Revenue · EBITDA Margin · PAT · PAT Margin · ROE · ROCE · EPS

**3-Year Cash Flow table:** CFO · Capex · FCF · CFO/PAT ratio

**Balance Sheet health:** Current Ratio · D/E · Cash · Total Debt · Working Capital Days · Intangibles flag

**Red Flags (traffic lights):**
- 🔴 RED — material concern requiring immediate attention
- 🟡 AMBER — watch item, not yet critical
- 🟢 GREEN — healthy, no concern

**12-Ratio diagnostic:** P/E · EV/EBITDA · P/B · ROE · ROCE · D/E · EBITDA Margin · PAT Margin · Revenue Growth · CFO/PAT · Working Capital Days · FCF Yield

Each ratio shows value, trend arrow (improving / stable / deteriorating), and traffic light.

**Forensics verdict** — one-paragraph synthesis of financial health, cash quality, and key watchlist items.

---

## Section 9 — Moat & Peers

![Moat and Peers](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-moat.png)

**Peer comparison table:** Market cap · Revenue · PAT · EBITDA Margin · P/E · EV/Revenue · ROE

**Moat radar** — 6 dimensions rated 0–3:

| Dimension | What it measures |
|---|---|
| Switching Costs | How hard is it for customers to leave |
| Technical Barriers | Complexity / certification / IP required to compete |
| Customer Lock-in | Contractual, qualification, or relationship-based retention |
| IP / Processes | Proprietary know-how, patents, trade secrets |
| Scale / Cost Advantage | Unit economics at scale vs competitors |
| Brand / Reputation | Established trust with buyers, partners, or regulators |

---

## Section 10 — Sector

![Sector Intelligence](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-sector.png)

**Market overview:**
- Sector name and plain-English definition
- TAM (Total Addressable Market in USD Bn)
- India's current market share %
- Sector CAGR %
- Cycle position (Early Upcycle / Mid Cycle / Late Cycle / Downcycle)
- Cycle rationale — why the cycle is at this stage

**Positive triggers** — with timeline and HIGH/MEDIUM/LOW impact rating

**Negative triggers** — with timeline and impact rating

**Company's position in sector** — where they sit relative to peers and TAM

**Watchlist metrics** — sector-specific KPIs to monitor (e.g. Boeing delivery rates for aerospace)

---

## Section 11 — Verdict + Score

![Verdict and Score](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-verdict.png)

**Score ring** — full dimension breakdown:

| Dimension | Max | Color |
|---|---|---|
| Earnings Growth | 10 | Green / Amber / Red |
| Management Credibility | 10 | Green / Amber / Red |
| Moat Strength | 10 | Green / Amber / Red |
| Balance Sheet | 10 | Green / Amber / Red |
| Sector Tailwind | 10 | Green / Amber / Red |
| Competitive Position | 10 | Green / Amber / Red |
| Valuation | 10 | Green / Amber / Red |
| Technical Stage | 30 | Green / Amber / Red |

**Scenario analysis:** Bull / Base / Bear case each with probability %, price target, and assumptions list

**Price levels:** Entry Zone · Support · Resistance · Stop Loss

**Key monitorable** — the single most important thing to watch for a thesis change

**Valuation check** — current multiple vs fair value calculation

**Action rationale** — specific entry strategy (hold, add on dips, wait for pullback)

---

## Section 12 — Price Chart

**Interactive 2-year price chart powered by Chart.js:**

- **Range buttons:** 1M / 3M / 6M / 1Y / 2Y
- **DMA overlays:** toggleable 20 DMA / 50 DMA / 200 DMA
- **Volume sub-chart** below the price chart
- **Hover tooltip** showing exact price and date
- **Key stats row:** Current · 52W High · 52W Low · % from High · MA50 · MA200 · RSI14 · Stage

![Price Chart](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-chart.png)

> Chart data comes from the 2-year daily OHLCV candles fetched via Kite MCP during analysis.

---

## Section 13 — References

All data sources used during analysis, grouped by section with direct links.

![References](https://raw.githubusercontent.com/iamurali/kite-portfolio-ai/main/assets/screenshot-stock-references.png)

| Section | Typical sources |
|---|---|
| Earnings | screener.in, tickertape.in, bseindia.com |
| Concall | trendlyne.com, screener.in |
| Forensics | screener.in, valueresearchonline.com |
| Sector | economictimes.indiatimes.com, businessstandard.com, livemint.com |
| Competitive | tickertape.in, moneycontrol.com |
| Technical | Zerodha Kite (via MCP) |

Each entry shows source name, what was extracted, and an **Open ↗** link to the original URL.

---

## Related pages

- [Scoring Rubric](Scoring-Rubric.md) — how the 0-100 score is computed
- [Weinstein Stage Framework](Weinstein-Stage-Framework.md) — stage classification logic
- [Data Sources](Data-Sources.md) — full whitelist of trusted sources
- [Architecture](Architecture.md) — how the analysis pipeline works
