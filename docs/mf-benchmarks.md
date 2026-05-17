# MF Benchmark Reference

These funds are used as category benchmarks for performance comparison.
They represent the user's portfolio against what a passive investor would get.

## Benchmarks Used

| Category | Fund | Plan | AMFI Code |
|---|---|---|---|
| Flexicap | Parag Parikh Flexi Cap Fund | Direct Growth | INF879O01027 |
| Smallcap | Nippon India Small Cap Fund | Direct Growth | INF204K01K15 |

These are **category representatives** — not personalised to the user's MF holdings.

## Data Sources

Fetch return figures from 3 sources and cross-verify:

```
WebSearch("Parag Parikh Flexi Cap Fund direct plan 1 year 6 month 3 month returns site:valueresearchonline.com")
WebSearch("Nippon India Small Cap Fund direct plan 1 year 6 month returns site:valueresearchonline.com")
```

### Cross-Verification Rule

| Condition | Action |
|---|---|
| 2+ sources agree within ±0.5% | Use that figure. Mark ✅ Verified |
| Sources diverge >1% | Use `valueresearchonline.com` figure. Mark ⚠️ Sources diverge |
| Only 1 source | Use it. Mark ⚠️ Single source |
| No data | Mark N/A |

**Always use Direct Plan figures only.** State the as-of date shown by the source.

## Why these funds?

- **PPFAS Flexi Cap:** Most closely mirrors a diversified stock-picker's approach.
  Holds Indian + international stocks. Good benchmark for portfolios that mix large/mid/small.
- **Nippon Small Cap:** India's largest smallcap fund by AUM. Good benchmark for
  portfolios with significant smallcap/midcap exposure.

## Alternative benchmarks to consider

If the user's portfolio skews heavily toward a specific sector, consider also searching:
- **Midcap:** Motilal Oswal Midcap 150 ETF or Nippon India Growth Fund
- **Defence/Industrial:** HDFC Defence Fund (if available)
- **Healthcare:** Mirae Asset Healthcare Fund
