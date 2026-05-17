# Stage Classification Framework

This skill uses the **Weinstein / Wrap Stage** framework adapted for Indian equities.

## Moving Averages

| MA | Lookback | Role |
|---|---|---|
| 50 MA | Last 50 closes | Short-term trend |
| 150 MA | Last 150 closes | Medium-term trend |
| 200 MA | Last 200 closes | Primary stage divider |
| 200 MA slope | ma200[today] − ma200[30d ago] | Rising vs falling |

## Stage Definitions

### Stage 1 — Basing 🔵
- Price oscillating near 200 MA (within ±5%)
- 200 MA slope ≈ 0 (flat)
- No clear trend direction — neither uptrend nor downtrend
- **Signal:** Watch for breakout. Not an uptrend — do not include in "Stage 2 capital"

### Stage 2 — Uptrend ✅
- Price > 50 MA > 150 MA > 200 MA
- 200 MA slope > 0 (rising)
- Higher highs and higher lows
- **2A:** Fresh breakout — ma50 crossed above ma200 within last 20 candles
- **2B:** Established — all MAs aligned bullishly for 20+ candles consistently
- **Signal:** Best time to hold or add. Ride the trend.

### Stage 3 — Topping ⚠️
- Price choppy, crossing above/below 200 MA repeatedly
- 200 MA slope flattening or turning negative
- 50 MA may cross below 150 MA (death cross forming)
- **Signal:** Reduce position. Risk of transition to Stage 4.

### Stage 4 — Downtrend 🔴
- Price < 50 MA < 150 MA < 200 MA
- 200 MA slope < 0 (falling)
- Lower highs and lower lows
- **Signal:** Exit or avoid. Capital destruction zone.

## Classification Logic

```
if price > ma50 > ma150 > ma200 AND slope200 > 0:
    if ma50 crossed above ma200 within last 20 candles: Stage 2A
    else: Stage 2B

elif abs(pct_above_200ma) < 5 AND abs(slope200 / ma200) < 0.005:
    Stage 1

elif price oscillating around ma200 in last 20 candles AND slope200 ≤ 0:
    Stage 3

elif price < ma50 < ma150 < ma200 AND slope200 < 0:
    Stage 4

elif data < 50 trading days:
    INSUFFICIENT DATA
```

## Notes

- With 365-day data (~250 trading days), a proper 200 MA is computable for all stocks
- For stocks with <200 trading days, compute ma200 on all available closes and mark "approx"
- `pct_from_high = ((close_today − high_1y) / high_1y) × 100` — always negative or zero
  - Near 52W high trigger: `pct_from_high > −5` (within 5% below)
- Stage 1 capital is tracked separately from Stage 2 — they are NOT combined
