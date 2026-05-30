---
name: kite-portfolio
subcommand: stage
description: >
  Module 2: Weinstein stage classification and 0-100 fundamental scoring for all holdings.
  Use when the user says "/kite-portfolio:stage", "stage analysis", "stock stages", "earnings analysis",
  "which stocks to trim", or "fundamental scoring". Writes stage/concall fields to JSON and opens report.
---

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

## Step 6 — Fundamental Scoring (0–100) Per Stock

Compute a score for every stock. This score drives action — **not stage alone**.

### Scoring Rubric

#### Priority 1: Business Quality (0–40 pts)

**A. Earnings Growth Trajectory (0–10 pts)**
- Last 4Q PAT YoY: all 4 accelerating → 10
- 3 of 4 growing → 8
- 2 of 4 growing → 5
- Flat → 3
- Declining 2+ quarters → 1
- Declining 3+ quarters → 0

**B. Management Credibility (0–10 pts)**
- ⭐⭐⭐⭐⭐ (beats own guidance 3+ consecutive quarters) → 10
- ⭐⭐⭐⭐ (mostly on track, minor misses) → 8
- ⭐⭐⭐ (mixed — some hits, some misses) → 5
- ⭐⭐ (frequent cuts, blame-shifting) → 2
- ⭐ (chronic over-promise, narrative changes) → 0
- No data available → 4 (neutral, no penalty)

**C. Moat / Business Quality (0–10 pts)**
From concall and search data, assess:
- Strong moat (pricing power + switching costs + market share gaining) → 9–10
- Moderate moat (1–2 moat dimensions, stable market share) → 5–8
- Weak moat (commoditised, price-driven, market share losing) → 1–4
- No moat (pure execution play, easy to replicate) → 0

**D. Balance Sheet Health (0–10 pts)**
- D/E < 0.3 AND FCF positive AND ROE > 20% → 10
- D/E < 0.5 AND FCF positive AND ROE > 15% → 8
- D/E < 1.0 AND FCF positive → 6
- D/E < 1.0 BUT FCF negative → 4
- D/E > 1.0 (non-financial) → 2
- D/E > 2.0 OR interest coverage < 2x → 0

#### Priority 2: Macro / Micro Context (0–30 pts)

**E. Sector Tailwind (0–10 pts)**
- Strong govt tailwind (PLI, capex cycle, policy push) + growing market → 9–10
- Moderate tailwind (steady sector growth, no adverse policy) → 6–8
- Neutral (no specific tailwind or headwind) → 4–5
- Sector headwind (regulatory tightening, demand slowdown, commodity squeeze) → 1–3
- Severe structural headwind (disruption, margin collapse, ban/policy reversal) → 0

**F. Competitive Position (0–10 pts)**
- Gaining market share + pricing power improving → 9–10
- Stable market share + holding margins → 6–8
- Slightly losing share but no major threat → 3–5
- Losing share + margin compression → 1–2
- Significant competitive threat or disruption → 0

**G. Valuation vs History & Peers (0–10 pts)**
- P/E > 40% below 3Y historical average AND below peer median → 9–10
- P/E at or below 3Y historical average → 7–8
- P/E 0–20% above 3Y historical average → 5–6
- P/E 20–40% above 3Y historical average → 3–4
- P/E > 40% above 3Y average OR > 60x on declining earnings → 0–2
- No PE data available → 5 (neutral)

#### Priority 3: Technical Stage (0–30 pts)

**H. Weinstein Stage (0–30 pts)**
- Stage 2B (established uptrend, all MAs rising) → 30
- Stage 2A (fresh breakout from Stage 1, last 20 candles) → 25
- Stage 1 (basing, flat 200MA, potential breakout) → 15
- Stage 3 (topping, 200MA flattening/negative, choppy) → 8
- Stage 4 (downtrend, all MAs declining) → 0
- Insufficient data → 15 (neutral)

---

### Total Score → Action

| Score | Action | Intent |
|-------|--------|--------|
| 85–100 | **STRONG ADD** | Excellent fundamentals + technicals confirm. Increase position. |
| 70–84 | **ADD** | Strong fundamentals. Add on dips or Stage 2A breakout. |
| 55–69 | **STRONG HOLD** | Solid business, neutral technicals. Maintain position. |
| 40–54 | **HOLD** | Steady business. Watch for deterioration. No new buys. |
| 30–39 | **WATCH** | Fundamentals weakening OR poor stage. Reduce exposure on bounce. |
| 15–29 | **TRIM** | Earnings slowing + Stage 3 OR stretched valuation + Stage 3. Reduce 30–50%. |
| 0–14 | **EXIT** | Thesis broken — not just technical decline. Business deteriorating. |

**Overrides:**
- TRACKING positions (weight ≤ 0.2%): never EXIT purely on size. Score still drives thesis assessment.
- SME positions (`-SM`): cap action at TRIM even at low scores — liquidity impact cost is high.
- Score 40–54 (HOLD) but Stage 4 + D/E > 1 → downgrade to WATCH minimum.
- Score 70+ but Stage 4 → ADD/STRONG HOLD with note "await technical confirmation — do not add until Stage 1 or 2A base forms".

### Show Score in Output

For each stock display:
```
Fundamental Score: [TOTAL]/100
  Business Quality: [A+B+C+D]/40  (Earnings:[X] · Mgmt:[X] · Moat:[X] · BS:[X])
  Macro/Micro:      [E+F+G]/30    (Sector:[X] · Competitive:[X] · Valuation:[X])
  Technical Stage:  [H]/30        (Stage [N])
```

### Tracking Position Rule
If a stock's current value is **≤ 0.2% of total portfolio value**, classify it as a **TRACKING POSITION**:
- Do NOT recommend EXIT based on size alone
- Label it as `TRACKING` in the action badge
- Note: "Tracking position — held to monitor the thesis. Add meaningfully (to ≥2%) on confirmation or exit if thesis fails."
- Still perform full stage + concall analysis so the user can decide whether to build the position

| Action | CSS class | When |
|---|---|---|
| **TRACKING** | `action-tracking` | Weight ≤ 0.2% — monitoring position, not sized for impact |
| **STRONG ADD** | `action-add` (bold green) | Score 85–100 |
| **ADD** | `action-add` | Score 70–84 |
| **STRONG HOLD** | `action-strong` (✅ prefix) | Score 55–69 |
| **HOLD** | `action-hold` | Score 40–54 |
| **WATCH** | `action-watch` | Score 30–39 |
| **TRIM** | `action-trim` | Score 15–29 |
| **EXIT** | `action-exit` | Score 0–14 — thesis broken, NOT just technical |

---

## Step 7 — Full Stock Card Output

For each stock produce this card:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SYMBOL] ([EXCHANGE])  |  [STAGE BADGE]  |  Weight: X.X%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price: ₹X,XXX  |  Avg Buy: ₹X,XXX  |  P&L: +X.X%

── FUNDAMENTAL SCORE ─────────────────────────
[SCORE]/100  →  [ACTION]
  Business Quality [A+B+C+D]/40: Earnings [X] · Mgmt [X] · Moat [X] · BalSheet [X]
  Macro/Micro      [E+F+G]/30:   Sector [X] · Competitive [X] · Valuation [X]
  Technical Stage  [H]/30:       Stage [N]

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
[ACTION BADGE] [SCORE/100] — [1-line rationale with specific price levels]
Reason: [Why this score — key drivers in Business Quality / Macro / Stage]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 8 — Portfolio Stage Summary Table

| Stock | Stage | Weight | Score | Action | Earnings trend | Mgmt ⭐ | Valuation | Key Risk |
|---|---|---|---|---|---|---|---|---|

**Earnings trend** column values: `↑↑ Accelerating`, `↑ Growing`, `→ Flat`, `↓ Slowing`, `↓↓ Declining` — based on PAT YoY growth over last 2 quarters.

**Score** column: show as `[N]/100` with colour — green if ≥70, amber if 40–69, red if <40.

**Valuation** column: `Cheap` / `Fair` / `Rich` — based on P/E vs 3Y historical average.

Footer — show separately, do NOT combine Stage 1 and Stage 2:
`Stage 1 Capital: XX% 🔵 | Stage 2 Capital: XX% ✅ | Stage 3 Capital: XX% ⚠️ | Stage 4 Capital: XX% 🔴`

---

## Step 9 — Rebalancing Priority List

Prioritise by **fundamental score**, not stage alone. A stock in Stage 4 with score 72 gets WATCH (not EXIT). A stock in Stage 2 with score 18 gets TRIM/EXIT.

```
HIGH PRIORITY — EXIT / TRIM (score <30, thesis deteriorating):
1. [STOCK] [Score: X/100] — [reason: which fundamentals are broken]
   Current: X% → Target: Y% (reduce by ₹Z)

MEDIUM PRIORITY — WATCH / REDUCE (score 30–54, mixed signals):
2. [STOCK] [Score: X/100] — [reason]
   Await: [specific catalyst or condition to re-assess]

LOW PRIORITY — HOLD / STRONG HOLD (score 55–69, steady):
3. [STOCK] [Score: X/100] — [reason]
   Next check: [quarterly result date or specific monitorable]

STRONG ADDS (score 70+, deploy capital here):
- [STOCK] [Score: X/100] — [reason: what's driving high score]
  Entry zone: [price level] | Add zone: [price range]
  Capital freed from exits → redeploy here
```

**Capital redeployment map:** List stocks to exit/trim → total capital freed → which STRONG ADD / ADD stocks to increase.

Suggested target weights for the rebalancing table:
- EXIT stocks → target 0%
- TRIM stocks → target current_weight / 2 (rounded to nearest 0.5%)
- WATCH stocks → maintain but no new buys
- HOLD / STRONG HOLD → maintain current weight
- ADD → suggest +1–2% if capital available
- STRONG ADD → suggest +3–5% (up to max single-stock weight of 15%)
- TRACKING → leave as-is

---

## Step 10 — Write JSON Output

**No HTML generation.** Write or merge into the JSON file following `docs/portfolio-data-schema.md`.

Populate / overwrite these JSON sections from Module 2 data:
- `meta.modules_run` — set to `["performance","stage"]` if Module 1 ran first, else `["stage"]`
- `portfolio.stage1_pct`, `stage2_pct`, `stage3_pct`, `stage4_pct`, `atrisk_pct`
- `portfolio.accel_pct` — % of portfolio weight where earnings_trend = "accelerating"
- `portfolio.avg_mgmt_stars` — average of mgmt_stars across holdings (1dp)
- `portfolio.top_priority_actions` — top 3 items from rebalancing priority list
- Per `holdings[]` entry: `technical`, `fundamental_score`, `earnings`, `risk_flags`, `concall`, `action`

**If full review (Module 1 already wrote the JSON):** read existing file, merge Module 2 fields, rewrite.
**If Module 2 alone:** write the full JSON; omit `returns`, `benchmarks` (leave absent, not null).

```bash
mkdir -p ~/.portfolio/data

# Read existing JSON if present, merge, then write atomically
# If starting fresh (Module 2 alone), write complete JSON without returns/benchmarks

cat > ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json << 'EOF'
{...complete merged JSON with all available fields...}
EOF
mv ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json \
   ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json

ln -sf ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json \
        ~/.portfolio/data/latest.json
```

**Token budget: target ≤ 2,000 tokens for the JSON write** (compact output, no extra whitespace).

After writing, open the report:
```bash
curl -s --max-time 1 http://localhost:7891/health > /dev/null 2>&1 && open http://localhost:7891/report || open ~/Desktop/portfolio-report-$(date +%Y-%m-%d).html
```

In chat show only: stage summary table + top 3 rebalancing actions (score, action, 1-line reason).

---

## Notes
- **Fundamentals drive action, technicals drive timing.** A quality business in Stage 4 is a WATCH (buy the dip), not an EXIT. A poor business in Stage 2 near 52W high is a TRIM.
- **52W high proximity is NOT a sell signal.** A stock near 52W high with accelerating earnings and expanding moat is a STRONG HOLD or ADD on dips. Trim only if valuation is >40% above 3Y average AND score drops below 55.
- SME stocks (`-SM`) have wide spreads — factor in impact cost when trimming. Cap action at TRIM even with low score.
- Stage analysis requires at least 200 trading days of data (~10 months). If less history, note it and skip MA-based classification; use score = 15 for Technical component.
- When fundamental data is unavailable (no search results), apply conservative defaults: Earnings=3, Mgmt=4, Moat=4, BS=5, Sector=4, Competitive=4, Valuation=5. Note "Insufficient data — score based on conservative defaults."
