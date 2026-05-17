# HTML Report UI Standards

These standards ensure the report looks identical every run.
Follow them exactly — no deviations.

## Colour Palette

```css
:root {
  --bg:       #0f1117;   /* page background */
  --surface:  #1a1d27;   /* card background */
  --surface2: #22263a;   /* inner box / table hover */
  --border:   #2e3250;   /* all borders */
  --text:     #e2e8f0;   /* primary text */
  --muted:    #8892b0;   /* labels, secondary text */
  --green:    #22c55e;   /* positive, Stage 2, gains */
  --red:      #ef4444;   /* negative, Stage 4, losses */
  --yellow:   #f59e0b;   /* warning, Stage 3, watch */
  --blue:     #60a5fa;   /* neutral info, Stage 1 */
  --purple:   #a78bfa;   /* triggers, earnings triggers */
  --accent:   #6366f1;   /* nav active, section headings */
}
```

## Stage Badges

```css
.stage-2 { background: #14532d; color: #4ade80; border: 1px solid #16a34a; }
.stage-1 { background: #1e3a5f; color: #93c5fd; border: 1px solid #2563eb; }
.stage-3 { background: #451a03; color: #fcd34d; border: 1px solid #d97706; }
.stage-4 { background: #450a0a; color: #fca5a5; border: 1px solid #dc2626; }
```

## Action Badges

```css
.action-strong   { background: #0f2b1a; color: #4ade80; border: 1px solid #16a34a; }
.action-hold     { background: #1e3a5f; color: #93c5fd; }
.action-trim     { background: #451a03; color: #fcd34d; }
.action-exit     { background: #450a0a; color: #fca5a5; }
.action-add      { background: #14532d; color: #4ade80; }
.action-watch    { background: #1c1c40; color: #a78bfa; }
.action-tracking { background: #1a1a2e; color: #94a3b8; border: 1px solid #2e3250; }
```

## Concall Section Colours

```css
/* Company Overview */ { border-color: #60a5fa; background: #0d1b2a; }
/* One-liner */         { border-color: #6366f1; background: #12122a; }
/* Guidance */          { border-color: #22c55e; background: #0a1f0f; }
/* Strategic */         { border-color: #6366f1; background: #12122a; }
/* Triggers */          { border-color: #a78bfa; background: #130f2a; }
/* Risks */             { border-color: #ef4444; background: #1f0a0a; }
/* Q&A */               { border-color: #f59e0b; background: #1f1508; }
/* Consistency */       { border-color: #8892b0; background: #22263a; }
/* Verdict */           { border-color: #60a5fa; background: #0f1b2d; }
```

## Stock Colour Palette (by weight descending)

```
#6366f1  #22c55e  #f59e0b  #ef4444  #60a5fa
#a78bfa  #2dd4bf  #fb923c  #f472b6  #34d399  #94a3b8
```

If >11 stocks: cycle back with 60% opacity (append `99` to hex, e.g. `#6366f199`).

## Typography

| Element | Style |
|---|---|
| Card titles | `font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted)` |
| Section headings | `font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted)` |
| Body text | `font-size:13px; line-height:1.6` |
| Stat values | `font-size:22px; font-weight:700` |

## Layout

- Max content width: `1400px; margin: 0 auto`
- Card padding: `20px 24px`; border-radius: `12px`; gap between cards: `20px`
- Tab nav height: `56px`; sticky at top; `z-index: 100`

## JavaScript

Tab switching — always pass `this` explicitly, never use implicit `event.target`:
```html
<button onclick="showTab('overview', this)">Overview</button>

<script>
function showTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
}
</script>
```

Stock selector — scope `.stock-card` CSS to `.stock-detail-panel` to avoid conflicts:
```css
.stock-detail-panel .stock-card { display: none; }
.stock-detail-panel .stock-card.active { display: block; }
```

## 4-Part HTML Write Pattern

Never write the full HTML in one string — hits the output token limit.

```bash
# Part 1: head + styles + Tab 1
cat > ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
...
EOF

# Part 2: Tab 2 (Performance)
cat >> ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
...
EOF

# Part 3: Tab 3 (Stage Analysis)
cat >> ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
...
EOF

# Part 4: Tab 4 (Rebalancing) + closing
cat >> ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
...
<script>...</script></body></html>
EOF

open ~/Desktop/portfolio-report-YYYY-MM-DD.html
```

Keep each part under 200 lines.
If Tab 3 is large (many stocks): split Part 3a (first 6 stocks) + Part 3b (remaining).
