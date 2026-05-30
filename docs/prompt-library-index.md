# Prompt Library Index

Maps prompt IDs from `ai_prompt_library_llm_indexed.md` to skill sections in `stock-analyser.md`.

---

## prompt: `quarterly-earnings-analysis-engine`

**Used in:** Section A — Quarterly Earnings  
**Pages:** 987–1036  
**Output structure:**
1. Quarter verification (most recent fiscal quarter)
2. Earnings summary (beat/miss vs estimates, headline numbers)
3. P&L analysis — Revenue, EBITDA, EBIT, PAT, EPS with YoY% and QoQ%
4. Segment-wise performance (revenue mix, margin per segment)
5. Balance sheet & cash flow quality (working capital, FCF, debt)
6. Management commentary & guidance (revenue, margin, capex, order book)
7. Valuation impact (P/E, EV/EBITDA re-rating direction)
8. Risks & monitorables (management's own words)
9. Quick verdict (1-line: Buy/Hold/Trim + key reason)

**Data sources required:** screener.in, moneycontrol.com, trendlyne.com, bseindia.com  
**Search query pattern:** `"[Company] Q[N] FY[YY] results revenue PAT EBITDA site:screener.in OR site:moneycontrol.com"`

**Key framing instruction:**
> "Generate an institutional quarterly earnings update for [Company]. Cover actual vs estimate for Revenue, EBITDA, PAT, EPS with YoY and QoQ growth. Include segment performance, balance sheet quality check, cash flow conversion, management guidance track record, and a quick verdict on thesis implications."

---

## prompt: `concall-intelligence-report`

**Used in:** Section B — Concall Analysis (the existing 13-section card in stage-analysis.md)  
**Pages:** 1296–1334  
**Output structure:**
1. Growth & Strategy — management's narrative + credibility check vs trends
2. Risks & Market Dynamics — stated risks vs hidden risks
3. Financial Consistency — guidance vs actual across last 3 calls
4. Management Quality & Red Flags — tone, evasion, blame-shifting
5. Investment Thesis Update — does this call strengthen or weaken the thesis?
6. Follow-up Questions — 3–5 questions a sharp investor would ask next quarter

**Special focus:**
- Management tone: direct/factual vs evasive/vague
- Quality of earnings: one-time items, normalised PAT
- Guidance conservatism vs aggression
- Consistency: compare Q-to-Q narrative for any story changes

**Data sources required:** trendlyne.com/concalls, screener.in, moneycontrol.com concall transcripts  
**Search query pattern:** `"[Company] concall transcript Q[N] FY[YY] management commentary site:trendlyne.com OR site:screener.in"`

**Key framing instruction:**
> "Analyse the earnings concall for [Company] for [Quarter]. Extract management credibility signals, growth narrative vs reality, risk commentary, guidance track record, red flags, and investment thesis implications. Rate management credibility ⭐–⭐⭐⭐⭐⭐."

---

## prompt: `3-statement-financial-forensics`

**Used in:** Section C — Financial Forensics  
**Pages:** 1101–1150  
**Output structure:**
1. Company overview (8–10 bullets: business, revenue model, moat)
2. Income statement analysis — 3-year Revenue, EBITDA, PAT, EPS trend + margin trend
3. Balance sheet analysis — asset quality, debt trend, working capital health
4. Cash flow analysis — OCF, FCF, PAT-to-cash conversion ratio
5. Working capital analysis — receivables days, payable days, inventory days
6. Capital allocation analysis — ROE, ROCE, capex intensity, dividend history
7. Red flags — rising receivables, weak cash conversion, high debt, falling margins, negative FCF
8. Quick verdict — financially healthy / watch / avoid

**Data sources required:** screener.in (5-year financials), annual reports from bseindia.com  
**Search query pattern:** `"[Company] annual report balance sheet cash flow 5 years site:screener.in"`

**Key framing instruction:**
> "Perform a 3-statement financial forensics analysis for [Company] across 3–5 years. Cover income statement margin trends, balance sheet strength (D/E, working capital), cash flow quality (OCF vs PAT), capital allocation (ROE/ROCE/capex), and identify any red flags. Give a financial health verdict."

---

## prompt: `competitive-landscape-decoder`

**Used in:** Section D — Competitive Landscape & Moat  
**Pages:** 1041–1095  
**Output structure:**
1. Industry overview (size, growth, structure)
2. Company positioning (market share, rank)
3. Competitor identification (top 3–5 peers)
4. Peer comparison table (Revenue, PAT margin, ROE, D/E, P/E, EV/EBITDA)
5. Business model comparison (product/service, distribution, pricing power)
6. Market share dynamics (gaining/losing/stable)
7. Moat analysis — rate each of 10 moat types (0=none, 1=weak, 2=moderate, 3=strong):
   - Brand Strength
   - Distribution Network
   - Scale Advantage
   - Manufacturing Capability
   - Technology/R&D
   - Customer Relationships / Switching Costs
   - Regulatory Advantage / Licensing
   - Cost Leadership
   - Network Effects
   - Pricing Power
8. Strategic risks (disruption, new entrants, substitute products)
9. Valuation vs peers (P/E premium/discount — justified?)
10. Quick verdict (competitive position: strengthening/stable/weakening)

**Data sources required:** tickertape.in (peer comparison), screener.in, businessstandard.com  
**Search query pattern:** `"[Company] vs peers comparison market share moat valuation site:tickertape.in OR site:screener.in"`

**Key framing instruction:**
> "Decode the competitive landscape for [Company]. Identify top 3–5 peers, build a peer comparison table (revenue, margins, valuation), rate 10 moat dimensions (0–3), assess market share trend, and give a verdict on whether the current valuation premium/discount vs peers is justified."

---

## prompt: `institutional-sector-intelligence-report`

**Used in:** Section E — Sector Intelligence  
**Pages:** 16–17  
**Output structure:**
1. Sector overview (size, growth rate, stage in cycle)
2. Value chain (upstream → midstream → downstream players)
3. Growth drivers (structural + cyclical tailwinds)
4. Risks (structural headwinds, regulatory, global)
5. Competitive landscape (fragmented vs consolidated, leaders)
6. Peer comparison (top 3–5 listed companies in sector)
7. Regulatory context (relevant govt policies, PLI schemes, import duties)
8. Valuation (sector P/E range, where in cycle)
9. Outlook (1–3 year view: bullish/neutral/bearish)
10. Trigger map (positive triggers → upside; negative triggers → downside)
11. Key monitorable (the ONE metric that matters most for this sector)

**Data sources required:** economictimes.indiatimes.com, businessstandard.com, livemint.com, bseindia.com sector reports  
**Search query pattern:** `"[Sector] India outlook 2025 growth drivers regulatory tailwinds site:economictimes.indiatimes.com OR site:businessstandard.com"`

**Key framing instruction:**
> "Generate an institutional sector intelligence report for the [Sector] industry in India. Cover market size/growth, value chain, structural growth drivers, regulatory context (PLI, govt schemes), competitive landscape, valuation range, 1–3 year outlook, and a trigger map (bull/bear catalysts)."

---

## prompt: `red-flag-detector-early-warning-system`

**Used in:** Section C (Financial Forensics) — Red Flag subsection  
**Pages:** 1481–1535  
**Output structure — 5 categories with traffic light (🟢/🟡/🔴):**

1. **Accounting quality red flags**
   - Revenue recognition timing (channel stuffing, early booking)
   - Inventory write-offs or unusually rising inventory
   - One-off items inflating PAT
   - Accounting policy changes (depreciation method, revenue recognition standard)
   - Related-party transactions at non-arm's-length

2. **Cash flow quality red flags**
   - Working capital deterioration (receivables days rising, payables shrinking)
   - OCF consistently below PAT (>15% gap = yellow; consistent = red)
   - FCF negative for 2+ years with no clear investment rationale
   - Rising other income as % of PAT (inflating profits)

3. **Balance sheet stress**
   - Rising debt with declining profitability (D/E > 1 for non-financials)
   - Interest coverage < 2x
   - Contingent liabilities > 10% of net worth
   - Large goodwill/intangibles relative to net worth (post-acquisition risk)
   - Liquidity crunch (current ratio < 1)

4. **Business momentum red flags**
   - Revenue growth deceleration for 3+ consecutive quarters
   - Market share loss to peers
   - Margin compression without volume recovery
   - Customer concentration > 30% to single customer
   - Significant competition/disruption entering the market

5. **Management & governance**
   - Key management departures (CEO, CFO, COO within 12 months)
   - Significant insider selling during guidance of strong outlook
   - Guidance miss track record (3+ consecutive misses)
   - Auditor qualifications or change of auditor
   - Regulatory scrutiny (SEBI, ED, CBI, tax notices)
   - Promoter pledge > 40%

**Key framing instruction:**
> "Run the red flag detector for [Company]. Systematically check all 5 categories: accounting quality, cash flow quality, balance sheet stress, business momentum, and management/governance. Rate each category 🟢/🟡/🔴 with specific evidence. Give an overall early warning score (Low/Medium/High risk)."

---

## prompt: `financial-health-check-12-ratio-diagnostic`

**Used in:** Section C (Financial Forensics) — Ratio Dashboard subsection  
**Pages:** 1385–1431  
**12 ratios to compute and interpret:**

| Category | Ratio | Healthy Range (Indian context) |
|----------|-------|-------------------------------|
| Profitability | Gross Margin % | >30% (products), >50% (software) |
| Profitability | EBITDA Margin % | >15% (mfg), >25% (tech) |
| Profitability | PAT Margin % | >8% |
| Profitability | ROE | >15% (3-year avg) |
| Profitability | ROCE | >15% |
| Liquidity | Current Ratio | >1.5 |
| Liquidity | Quick Ratio | >1.0 |
| Leverage | D/E Ratio | <1.0 (non-financials) |
| Leverage | Interest Coverage | >3x |
| Efficiency | Asset Turnover | Varies by sector |
| Efficiency | Receivables Days | <60 (B2B), <30 (B2C) |
| Efficiency | Inventory Days | <90 (mfg) |

**Output:** Ratio table + trend (3 years) + traffic light per ratio + peer benchmark + overall health score (Excellent/Good/Fair/Weak)

**Key framing instruction:**
> "Compute the 12-ratio financial health diagnostic for [Company]. Show 3-year trend for each ratio, compare vs industry peers, apply traffic light system (🟢/🟡/🔴), and give an overall financial health score."

---

## prompt: `mega-stock-research-framework` (Parts 8, 11, 12)

**Used in:** Section G (Management Integrity), Section F (Growth Triggers), Section H (Final Verdict)  
**Pages:** 1596–1683

### Part 8 — Management Integrity Score
**Output:** 12-quarter matrix
- Columns: Quarter | Key Promise | Actual Outcome | Status (✅/⚠️/❌)
- Red flag incidents (broken promises, blame-shifting)
- Management tone trend (more bullish → more cautious or vice versa)
- Overall integrity score: A (highly trustworthy) / B (mostly reliable) / C (mixed) / D (poor track record)

**Key framing instruction:**
> "Build a management integrity score for [Company] across the last 12 quarters. Track key promises (revenue, margin, capex, order book, milestones) vs actual delivery. Flag incidents of over-promise, blame-shifting, or narrative change. Assign an integrity grade A–D."

### Part 11 — Growth Trigger Analysis
**Output:** Sized triggers with timelines
- Operating leverage potential: at what capacity utilisation does margin expand significantly?
- Capex utilisation upside: newly commissioned capacity → revenue ramp timeline
- New product/segment revenue: when does it become >5% of revenue?
- Export order / geographic expansion: timeline + size
- Acquisition integration revenue
- Regulatory approval (drug, defence, telecom)
- Visible triggers with: Name | Type | Potential Revenue Impact | Timeline | Probability

**Key framing instruction:**
> "Identify and size the growth triggers for [Company]. For each trigger, specify: trigger name, type (operational/strategic/regulatory/macro), estimated revenue/margin impact, timeline to materialise (months), and probability (High/Medium/Low). Total up the upside scenario from all triggers firing."

### Part 12 — Final Assessment & Valuation
**Output:**
- Current P/E vs 3-year and 5-year historical average
- Current EV/EBITDA vs historical range
- Price-to-Sales, Price-to-Book
- Valuation verdict: Overvalued / Fairly valued / Undervalued (with reason)
- Bull case: assumptions + target price + timeline
- Base case: assumptions + target price + timeline
- Bear case: assumptions + target price + timeline
- Key monitorable: the ONE number/event to watch
- Suggested action + price levels (buy zone, add zone, trim zone, stop-loss)

**Key framing instruction:**
> "Complete a final assessment for [Company]. Check current valuation vs historical P/E and EV/EBITDA ranges. Build bull/base/bear cases with specific assumptions and target prices. Identify the single most important monitorable. Give a suggested action with price levels."

---

## Usage in stock-analyser.md

When invoking each section, Claude should:
1. **Read the relevant framing instruction** from this index
2. **Search using the exact query pattern** (adapting ticker/company/sector)
3. **Structure output exactly** as described in the output structure
4. **Cross-reference** with data from other sections (e.g., earnings data from Section A feeds into Section C's cash flow quality check)

The `mega-stock-research-framework` is the master framework — when running a full deep-dive, sections from this framework supersede equivalent standalone prompts where there is overlap.
