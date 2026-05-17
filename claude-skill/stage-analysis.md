# Module 2 — Stage & Earnings Analysis

## MCP Tools used

- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`

---

## Stage Framework — Weinstein / Wrap Stages

Compute these MAs from daily candle `close` values:

| MA | Lookback | Role |
|---|---|---|
| 50 MA | last 50 closes | Short-term trend |
| 150 MA | last 150 closes | Medium-term trend |
| 200 MA | last 200 closes | Stage divider |
| 200 MA slope | (200MA today) − (200MA 30 days ago) | Rising vs falling |

### Stage Rules

**Stage 1 — Basing** 🔵
- Price oscillating near 200 MA (within ±5%)
- 200 MA slope ≈ 0 (flat)
- No clear trend direction
- Action: Watch for breakout

**Stage 2 — Uptrend** ✅
- Price > 50 MA > 150 MA > 200 MA
- 200 MA slope > 0 (rising)
- Higher highs and higher lows
- Sub-stages: 2A = fresh breakout from Stage 1; 2B = established uptrend
- Action: Hold / Add on dips to 50 MA

**Stage 3 — Topping** ⚠️
- Price choppy, crossing 200 MA repeatedly
- 200 MA slope flattening or turning negative
- 50 MA may cross below 150 MA
- Action: Reduce / Trim

**Stage 4 — Downtrend** 🔴
- Price < 50 MA < 150 MA < 200 MA
- 200 MA slope < 0 (falling)
- Lower highs and lower lows
- Action: Exit

---

## Step 1 — Holdings (already fetched in Step 0 of skill.md)

Use the holdings data from `mcp__kite__get_holdings()` already called in Step 0.

---

## Step 2 — Use existing candle data from Module 1 (do NOT re-fetch)

If Module 1 already ran, the 365-day daily candle data for all stocks is already in context.
Reuse it. Do NOT call `mcp__kite__get_historical_data` again for stocks.

If Module 2 runs alone (no prior Module 1 run), fetch all stocks in one parallel batch:
```
mcp__kite__get_historical_data(instrument_token=<token>, from_date="YYYY-MM-DD 00:00:00", to_date="YYYY-MM-DD 23:59:59", interval="day")
# one call per holding, all parallel; from_date = today minus 365 days
```

Fire ALL earnings + concall WebSearches in parallel simultaneously with (or immediately after) the candle fetches.
Use the current fiscal quarter in the search — derive it from today's date:
- If today is Apr–Jun: use "Q1 FY[current year+1]" or "Q4 FY[current year]"
- If today is Jul–Sep: use "Q1 FY[current year+1]" or "Q2 FY"
- Example for May 2026: search for "Q4 FY26 OR Q3 FY26"

```
WebSearch("<STOCK_NAME> quarterly results revenue profit concall Q4 FY26 OR Q3 FY26 management guidance site:screener.in OR site:trendlyne.com OR site:moneycontrol.com OR site:businessstandard.com")
# one query per stock, all in parallel
```

### Extract only these values from each candle dataset (Rule 5 from skill.md):
Use the canonical field names from skill.md Rule 5:
- `ma50`, `ma150`, `ma200`
- `slope200` = ma200[today] − ma200[30d ago]
- `high_1y` = max close in full dataset
- `low_1y` = min close in full dataset
- `pct_from_high` = ((close_today − high_1y) / high_1y) × 100 — this is always ≤ 0 (negative means below high). For risk flag "near 52W high": trigger when `pct_from_high > −5` (i.e., within 5% below)
- `pct_above_200ma` = ((close_today − ma200) / ma200) × 100

### Stage classification rules:
| Condition | Stage |
|---|---|
| close_today > ma50 > ma150 > ma200 AND slope200 > 0 | **Stage 2** ✅ |
| — close_today > ma50 but ma50 rose above ma200 within last 20 candles | → **Stage 2A** (fresh breakout) |
| — close_today > ma50 > ma150 > ma200 for 20+ candles consistently | → **Stage 2B** (established) |
| abs(pct_above_200ma) < 5 AND abs(slope200/ma200) < 0.005 | **Stage 1** 🔵 (basing) |
| close_today oscillating above/below ma200 in last 20 candles, slope200 flattening or negative | **Stage 3** ⚠️ (topping) |
| close_today < ma50 < ma150 < ma200 AND slope200 < 0 | **Stage 4** 🔴 (downtrend) |
| Insufficient data (<50 trading days) | **INSUFFICIENT DATA** — skip MA classification |

Note: if dataset has <200 trading days (common with 365-day window for newer listings), compute ma200 on all available closes and mark as "approx" in the output.

---

## Step 3 — Trusted Sources (whitelist — do NOT use others)

**Use ONLY:** `screener.in`, `trendlyne.com`, `tickertape.in`, `moneycontrol.com`, `economictimes.indiatimes.com`, `businessstandard.com`, `livemint.com`, `bseindia.com`, `nseindia.com`

**Do NOT use:** Reddit, Twitter/X, Substack, Telegram, Quora, random blogs, groww.in blog posts

From the parallel WebSearch results, extract per stock:
- Last 4 quarters: Revenue (₹ Cr), PAT (₹ Cr), YoY growth %
- TTM PE, D/E ratio, ROE
- Concall: guidance, risks, key Q&A, management consistency

---

## Step 4 — Company Overview + Concall AI Summary

### Output format per stock — Full Analysis Card

```
📞 CONCALL & COMPANY ANALYSIS — [STOCK] | [Quarter] | [Date if known]
Source: [URL of primary source used]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 COMPANY OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What the company does, its core business, revenue model, and market position.
Target: 8–10 points covering:
• Business description — what product/service, who are customers
• Revenue model — how it makes money (B2B/B2C, subscription, project-based, etc.)
• Key business segments and their revenue contribution %
• Market position — market share, rank in industry, key competitors
• Promoter background and ownership %
• Geographic presence — domestic vs export split
• Key clients or customer concentration
• Regulatory or licensing environment
• Growth track record — revenue/PAT CAGR over 3–5 years
• Any moat or differentiation (IP, brand, switching cost, network effect)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ONE-LINE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Single sentence: the single most important thing an investor needs to know from the latest concall.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 GUIDANCE & OUTLOOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: 8–10 points. Extract specific numbers — vague statements are not useful.
• Revenue guidance FY26: [₹ amount or % growth]
• EBITDA/PAT margin guidance: [range]
• Capex planned FY26–27: [₹ amount, purpose]
• Order book size and executable timeline
• Volume/capacity guidance (units, beds, MW, tonnes etc.)
• New geographies or segments management is targeting
• Headcount or hiring plans if relevant
• Dividend or buyback guidance if mentioned
• Working capital cycle expectations
• Any specific milestones or targets management committed to
(Flag any section where management avoided giving guidance as ⚠️)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STRATEGIC UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: 8–10 points covering genuine strategic moves, not routine operations.
• New product launches or R&D milestones
• Acquisitions, JVs, partnerships announced
• Capacity expansion plans and timelines
• New customer wins or contract announcements
• Entry into new markets or verticals
• Technology upgrades or platform investments
• Cost optimisation or margin improvement initiatives
• ESG or regulatory compliance updates if material
• Management changes (CEO, CFO, board)
• Any strategic pivot or business model change

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 EARNINGS TRIGGERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What specific events or milestones could cause the next stock re-rating. Target: 8–10 triggers.
• Order win announcement above a certain size threshold
• Capacity utilisation crossing a key %
• New product/segment reaching meaningful revenue contribution
• Export order (if currently domestic-only)
• Margin expansion from operating leverage
• Regulatory approval (DCGI, MoD, SEBI, etc.)
• Entry into index (Nifty 50, Nifty 500, Midcap 150)
• Analyst coverage initiation by a top brokerage
• Promoter buying in open market
• Quarterly result beat vs Street estimates by >10%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RISKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use management's own words where possible. Target: 8–10 risks.
• Exact risk phrased by management on the call
• Customer concentration risk (top N customers = X% revenue)
• Input cost / raw material / commodity exposure
• Regulatory or policy risk
• Competition from domestic or global players
• Execution risk on new projects or capacity
• Foreign exchange risk if applicable
• Debt levels and interest coverage
• Promoter pledge or governance concerns
• Macro risk specific to this industry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ KEY Q&A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pick the 8–10 most revealing analyst questions and management answers. Focus on questions that probe weaknesses, test guidance credibility, or reveal strategic intent.
• Q: [Analyst question] → A: [Management answer in 1–2 lines]
[repeat for each exchange]
Flag any question management deflected or answered vaguely.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 MANAGEMENT CONSISTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Compare this call vs previous 2–3 calls. Target: 8–10 comparison points.
• [Guidance given N quarters ago] → [Actual outcome: Beat / Met / Missed by X%]
• [Revenue guidance] → [Actual]
• [Margin guidance] → [Actual]
• [Capex guidance] → [Actual spend]
• [Order book guidance] → [Actual wins]
• [Any other specific commitment] → [Outcome]
• Tone change: more bullish / more cautious vs prior calls?
• Any narrative change — is management changing the story?
• Any blame-shifting on misses (external factors vs own execution)?
• Any instances of under-promising and over-delivering?

Credibility: ⭐⭐⭐⭐⭐
⭐⭐⭐⭐⭐ Beats own guidance 3+ consecutive quarters
⭐⭐⭐⭐  Mostly on track, minor misses with explanation
⭐⭐⭐   Mixed — some hits, some misses
⭐⭐    Frequent cuts, poor visibility, blame-shifting
⭐     Chronic over-promise, changed narrative repeatedly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧭 INVESTOR VERDICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3–5 sentences synthesising everything above:
• Is the management tone bullish or cautious?
• Is guidance conservative (likely to beat) or aggressive (execution risk)?
• Is the business executing on its stated strategy?
• What is the biggest risk that could break the thesis?
• Would you trust this management team with your capital? Why/why not?
```

If no data found after all whitelisted searches:
```
📞 ANALYSIS — [STOCK]
⚠️ No data found from trusted sources. Check manually:
   → trendlyne.com/[symbol]/concall
   → screener.in/company/[symbol]
   → bseindia.com (Investor Presentations section)
   → nseindia.com (Corporate Filings)
```

---

## Step 5 — Risk Assessment Per Stock

| Risk Type | Flag when |
|---|---|
| Valuation | PE > 50x |
| Concentration | Weight > 15% of portfolio |
| Stage | Stage 3 or Stage 4 |
| SME / Liquidity | Tradingsymbol ends with `-SM` |
| Earnings momentum | 2+ quarters of declining PAT growth |
| Debt | D/E > 1 (non-financials) |
| Near 52W high | Within 5% — resistance zone |
| Near 52W low | Within 10% — structural weakness |

---

## Step 6 — Action Per Stock

### Tracking Position Rule
If a stock's current value is **≤ 0.2% of total portfolio value**, classify it as a **TRACKING POSITION**:
- Do NOT recommend EXIT based on size alone
- Label it as `TRACKING` in the action badge
- Note: "Tracking position — held to monitor the thesis. Add meaningfully (to ≥2%) on confirmation or exit if thesis fails."
- Still perform full stage + concall analysis so the user can decide whether to build the position

| Action | CSS class | When |
|---|---|---|
| **TRACKING** | `action-tracking` | Weight ≤ 0.2% — monitoring position, not sized for impact |
| **STRONG HOLD** | `action-strong` (use same style as `action-hold` but add ✅ prefix) | Stage 2B, earnings accelerating 2+ quarters, valuation reasonable |
| **HOLD** | `action-hold` | Stage 2, earnings steady, no major flags |
| **WATCH** | `action-watch` | Stage 1 (basing, waiting for breakout) or mixed signals |
| **TRIM** | `action-trim` | Stage 3, earnings slowing, or weight >15%, or SME with low liquidity |
| **EXIT** | `action-exit` | Stage 4, declining earnings, thesis broken — NOT triggered by small size alone |
| **ADD** | `action-add` | Stage 2A fresh breakout + earnings confirmation |

---

## Step 7 — Full Stock Card Output

For each stock produce this card:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SYMBOL] ([EXCHANGE])  |  [STAGE BADGE]  |  Weight: X.X%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price: ₹X,XXX  |  Avg Buy: ₹X,XXX  |  P&L: +X.X%

── TECHNICAL ─────────────────────────────────
50MA ₹X,XXX | 150MA ₹X,XXX | 200MA ₹X,XXX | Slope: Rising/Falling
52W High ₹X,XXX (X.X% away) | 52W Low ₹X,XXX (+X.X% above)

── EARNINGS (last 4Q) ────────────────────────
Q1FY25: Rev ₹XXX Cr | PAT ₹XX Cr
Q2FY25: Rev ₹XXX Cr | PAT ₹XX Cr
Q3FY25: Rev ₹XXX Cr | PAT ₹XX Cr (+X% YoY)
Q4FY25: Rev ₹XXX Cr | PAT ₹XX Cr (+X% YoY)  ← latest
PE: Xx | D/E: X.Xx

── CONCALL AI SUMMARY ────────────────────────
[Full concall card from Step 4]

── RISKS ─────────────────────────────────────
[Risk tags]

── ACTION ────────────────────────────────────
[ACTION] — [1-line rationale with specific price levels]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 8 — Portfolio Stage Summary Table

| Stock | Stage | Weight | Action | Earnings trend | Mgmt ⭐ | Key Risk |
|---|---|---|---|---|---|---|

**Earnings trend** column values: `↑↑ Accelerating`, `↑ Growing`, `→ Flat`, `↓ Slowing`, `↓↓ Declining` — based on PAT YoY growth over last 2 quarters.

Footer — show separately, do NOT combine Stage 1 and Stage 2:
`Stage 1 Capital: XX% 🔵 | Stage 2 Capital: XX% ✅ | Stage 3 Capital: XX% ⚠️ | Stage 4 Capital: XX% 🔴`

---

## Step 9 — Rebalancing Priority List

```
HIGH PRIORITY (act within 1-2 weeks):
1. [STOCK] — [reason: stage + earnings + weight]

MEDIUM PRIORITY (review this month):
2. [STOCK] — [reason]

LOW PRIORITY (monitor):
3. [STOCK] — [reason]

POTENTIAL ADDS (if capital freed up):
- [STOCK] — [condition to add e.g. "on dip to 50MA"]
```

---

## Step 10 — Generate HTML Report

Follow `html-report.md` chunked write pattern and HTML assembly rules from `skill.md`.

**If full review (Module 1 already wrote Parts 1–2):** append Parts 3 and 4 only.
**If Module 2 alone:** write all 4 parts; Tab 2 = placeholder (see skill.md HTML Assembly section).

Suggested weights for the Rebalancing tab:
- EXIT stocks → target 0%
- TRIM stocks → target current_weight / 2 (rounded to nearest 0.5%)
- STRONG HOLD / HOLD → maintain current weight
- ADD → suggest +2–3% if capital is available from exits/trims
- TRACKING → leave as-is
- WATCH → leave as-is until breakout confirmed

Save and open:
```
Bash: open ~/Desktop/portfolio-report-YYYY-MM-DD.html
```

In chat show only: stage summary table + top 3 rebalancing actions.

---

## Notes
- Stage is technical only — always cross-check with earnings
- SME stocks (`-SM`) have wide spreads — factor in impact cost when trimming
- Stage analysis requires at least 200 trading days of data (~10 months). If a stock has less history, note it and skip MA-based classification
