# Weinstein Stage Framework

kite-portfolio-ai uses the **Weinstein stage analysis** framework (from Stan Weinstein's *Secrets for Profiting in Bull and Bear Markets*) adapted for Indian equities with 2-year daily data from Kite.

---

## Moving averages used

| MA | Lookback | Purpose |
|---|---|---|
| MA20 | Last 20 closes | Short-term momentum (chart only) |
| MA50 | Last 50 closes | Short-term trend |
| MA150 | Last 150 closes | Medium-term trend |
| MA200 | Last 200 closes | Primary stage divider |
| MA200 slope | `ma200[today] − ma200[30d ago]` | Rising vs falling 200MA |

---

## Stage definitions

### Stage 1 — Basing 🔵

The stock is in a sideways consolidation after a downtrend. Accumulation by smart money may be occurring.

**Criteria:**
- Price oscillating near the 200 MA (within ±5%)
- 200 MA slope ≈ 0 (flat — change < 0.5% over 30 days)
- No clear higher highs or lower lows

**What it means:** The stock has stopped falling but hasn't broken out yet. It is building a base.

**Action signal:** Watch for breakout. Do **not** include in "Stage 2 capital" — it is not yet an uptrend.

---

### Stage 2 — Uptrend ✅

The stock is in a confirmed uptrend. This is the optimal time to hold or add.

**Criteria:**
- Price > MA50 > MA150 > MA200 (full bullish alignment)
- 200 MA slope > 0 (rising)
- Higher highs and higher lows

**Stage 2A** — Fresh breakout:
- MA50 has recently crossed above MA200 (within last 20 candles)
- Uptrend is still early; may retest the breakout level

**Stage 2B** — Established uptrend:
- Full MA alignment has been in place for 20+ candles
- Uptrend is mature and confirmed
- Maximum score: **30/30**

**Action signal:** Ride the trend. Add on pullbacks to MA50. Only exit on fundamental deterioration or stage change.

---

### Stage 3 — Topping ⚠️

The uptrend is losing momentum. Distribution by smart money may be occurring.

**Criteria:**
- Price choppy, crossing above and below the 200 MA
- 200 MA slope flattening or turning negative
- MA50 may be crossing below MA150 (death cross forming)

**What it means:** The easy money has been made. Risk/reward is deteriorating.

**Action signal:** Reduce position. Do not add. Prepare for potential Stage 4 transition.

---

### Stage 4 — Downtrend 🔴

The stock is in a confirmed downtrend. Capital destruction zone.

**Criteria:**
- Price < MA50 < MA150 < MA200 (full bearish alignment)
- 200 MA slope < 0 (falling)
- Lower highs and lower lows

**What it means:** The trend is down. Even fundamentally strong companies can fall further in Stage 4.

**Action signal:** Exit or avoid. If fundamental score is high (≥55), keep on watchlist for Stage 1/2A re-entry. **Stage 4 alone is not an EXIT signal** if the business is excellent — the fundamental score drives the action.

---

## Classification algorithm

```python
if ma50 > ma150 > ma200 and close > ma50 and slope200 > 0:
    if ma50_recently_crossed_ma200:  # within last 20 candles
        stage = 'Stage 2A'
    else:
        stage = 'Stage 2B'

elif close > ma200 and slope200 > 0:
    stage = 'Stage 2A'  # price above 200MA, rising slope, MAs not fully aligned

elif close > ma200 and abs(slope200) < 0.5:
    stage = 'Stage 1'  # near 200MA, flat slope

elif close < ma200 and slope200 > 0:
    stage = 'Stage 3'  # below 200MA but slope still positive (topping)

else:
    stage = 'Stage 4'  # below all MAs, falling slope

# Edge case
if trading_days < 50:
    stage = 'INSUFFICIENT DATA'
```

---

## Technical stage score

| Stage | Score (out of 30) |
|---|---|
| Stage 2B | 30 |
| Stage 2A | 25 |
| Stage 1 | 15 |
| Stage 3 | 8 |
| Stage 4 | 0 |

---

## Key derived metrics

| Metric | Formula | Interpretation |
|---|---|---|
| `pct_from_high` | `(close − high_1y) / high_1y × 100` | Always ≤ 0. Near 52W high = within −5% |
| `pct_above_200ma` | `(close − ma200) / ma200 × 100` | Positive = above 200MA |
| `slope200` | `ma200[today] − ma200[30d ago]` | Positive = rising 200MA |
| `volume_ratio` | `volume_today / avg_volume_30d` | >1.5 = above-average volume |
| `rsi_14` | 14-period RSI | >70 = overbought, <30 = oversold |

---

## Stage tracking rules

- Stage 1 and Stage 2 capital are tracked **separately** — never combined into "uptrend capital"
- A stock moving from Stage 4 to Stage 1 is not yet Stage 2 — it must form a proper base first
- TRACKING positions (weight ≤ 0.2%) still go through full stage classification — stage never drives EXIT on a tracking position

---

## Data requirements

- **Minimum:** 50 trading days (~2.5 months) to compute MA50
- **Ideal:** 250+ trading days (1 year) for a reliable MA200
- **This skill uses:** 2 years of daily data (~494 candles) for all computations
- Stocks with < 50 trading days: labelled `INSUFFICIENT DATA`, no stage assigned

---

## Related pages

- [Scoring Rubric](Scoring-Rubric.md) — how stage feeds into the 0-100 score
- [Stock Analyser](Stock-Analyser.md) — where stage appears in the deep-dive report
- [Architecture](Architecture.md) — how candles are fetched and technicals computed
