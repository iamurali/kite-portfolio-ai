# Scoring Rubric

The 0–100 fundamental score drives all rebalancing actions. Technical stage is a **timing signal only** — not the primary driver.

---

## Scoring dimensions

### Business Quality (0–40 points)

#### A. Earnings Growth (0–10)

Measures 4-quarter PAT year-on-year trend.

| Score | Condition |
|---|---|
| 9–10 | PAT accelerating — YoY growth increasing for 3+ consecutive quarters |
| 6–8 | Stable growth — consistent 15–25% YoY PAT growth |
| 4–5 | Flat — PAT growth 0–15% or inconsistent |
| 0–3 | Declining — PAT falling YoY |

#### B. Management Credibility (0–10)

| Score | Condition |
|---|---|
| 9–10 | Consistently beats guidance, transparent on misses, promoter holding stable/rising |
| 6–8 | Usually delivers, minor misses explained well |
| 4–5 | Mixed track record, some guidance cuts |
| 0–3 | Frequent misses, opaque communication, promoter selling |

#### C. Moat Strength (0–10)

| Score | Condition |
|---|---|
| 9–10 | Deep moat — single-source supplier, IP/patent, pricing power, high switching costs |
| 6–8 | Moderate moat — brand, scale, or regulatory barriers |
| 4–5 | Narrow moat — some differentiation but easily challenged |
| 0–3 | No moat — commodity, price competition |

#### D. Balance Sheet (0–10)

| Score | Condition |
|---|---|
| 9–10 | Debt-free or low D/E (<0.3), FCF positive, ROE >20% |
| 6–8 | D/E 0.3–0.8, FCF breakeven or positive, ROE 15–20% |
| 4–5 | D/E 0.8–1.5, FCF neutral, ROE 10–15% |
| 0–3 | High leverage (D/E >1.5), negative FCF, ROE <10% |

---

### Macro / Micro (0–30 points)

#### E. Sector Tailwind (0–10)

| Score | Condition |
|---|---|
| 9–10 | Strong government policy support, early upcycle, structural demand growth |
| 6–8 | Neutral sector, mild positive policy backdrop |
| 4–5 | Mature sector, no meaningful tailwind |
| 0–3 | Regulatory headwind, sector downcycle, structural decline |

#### F. Competitive Position (0–10)

| Score | Condition |
|---|---|
| 9–10 | Gaining market share, new customer wins, expanding wallet share |
| 6–8 | Market share stable, holding position |
| 4–5 | Slight share loss, competition intensifying |
| 0–3 | Losing market share materially |

#### G. Valuation (0–10)

| Score | Condition |
|---|---|
| 8–10 | Cheap vs 3Y historical P/E avg — discount of 20%+ |
| 5–7 | Fair value — within ±20% of historical average |
| 0–4 | Expensive — trading 20%+ above historical P/E average |

> Valuation is always relative to the stock's own 3-year history, not absolute multiples.

---

### Technical Stage (0–30 points)

#### H. Weinstein Stage

| Stage | Score | Description |
|---|---|---|
| Stage 2B | 30 | Established uptrend — all MAs aligned bullishly |
| Stage 2A | 25 | Fresh breakout — early uptrend forming |
| Stage 1 | 15 | Basing — sideways, watching for breakout |
| Stage 3 | 8 | Topping — trend weakening |
| Stage 4 | 0 | Downtrend — capital destruction zone |

See [[Weinstein-Stage-Framework]] for full classification logic.

---

## Action thresholds

| Score | Action | Meaning |
|---|---|---|
| 85–100 | **STRONG ADD** | Exceptional business, technicals confirmed — size up |
| 70–84 | **ADD** | Strong fundamentals — add on pullbacks |
| 55–69 | **STRONG HOLD** | Solid business, neutral technicals — hold full position |
| 40–54 | **HOLD** | Steady — no new buying but no urgency to reduce |
| 30–39 | **WATCH** | Fundamentals weakening — monitor for deterioration |
| 15–29 | **TRIM** | Earnings slowing + overvalued — reduce position |
| 0–14 | **EXIT** | Thesis broken — exit regardless of price |

---

## Override rules

These rules take precedence over the raw score.

### TRACKING override
Weight ≤ 0.2% → label `TRACKING`. **Never recommend EXIT based on size alone.** Full analysis still runs; action is based on score.

### SME override
Tickers with `-SM` suffix (BSE SME, NSE Emerge) → **maximum action = TRIM** regardless of score. Liquidity risk and wide spreads make full exits impractical at scale.

### Stage 4 + weak balance sheet
Score 40–54 (HOLD) but Stage 4 + D/E > 1 → **downgrade to WATCH minimum**.

### Stage 4 + strong fundamentals
Score ≥ 55 but Stage 4 → keep action but **add note: "await Stage 1/2A base before adding"**.

### Stage 2 + overvalued
Score 70+ but valuation score 0–2 (P/E >2x historical average) → **ADD with note: "entry discipline — accumulate on dips, not at current price"**.

---

## Score vs stage — important distinction

| | Stage | Score |
|---|---|---|
| **What it is** | Timing signal | Business quality signal |
| **Drives** | When to enter/exit | Whether to own at all |
| **Changes** | Weekly (price-driven) | Quarterly (earnings-driven) |
| **Stage 4 + score 80** | Wait for base to form | Strong business — keep on watchlist |
| **Stage 2B + score 20** | Technically perfect | Bad business — don't buy just because it's rising |

---

## Related pages

- [[Weinstein-Stage-Framework]] — stage classification in detail
- [[Stock-Analyser]] — how the score is displayed in the stock report
- [[Portfolio-Report]] — how score chips appear in the rebalancing tab
