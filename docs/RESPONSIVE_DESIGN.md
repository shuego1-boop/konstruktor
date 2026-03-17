# Responsive Design

Konstruktor must work across a wide range of screen sizes and input methods. This document defines the rules and implementation patterns.

---

## Target Contexts

| Context | Resolution | Orientation | Input | Priority |
|---|---|---|---|---|
| Tablet portrait | 768×1024 | Portrait | Touch | Highest |
| Tablet landscape | 1024×768 | Landscape | Touch | Highest |
| Interactive panel 1080p | 1920×1080 | Landscape | Touch | High |
| Interactive panel 4K | 3840×2160 | Landscape | Touch | Medium |
| Desktop / laptop | 1280×800 – 1920×1080 | Landscape | Mouse | High |

---

## Breakpoints (Tailwind)

```
sm  → 640px   (large phone, small tablet)
md  → 768px   (tablet portrait)
lg  → 1024px  (tablet landscape, small desktop)
xl  → 1280px  (desktop, interactive panel)
2xl → 1536px  (large desktop)
```

For interactive panels at 1920px+, use `xl:` and `2xl:` prefixes.

---

## Typography Rules

**Rule: Never use fixed `px` font sizes on quiz content.**

Use `clamp()` for fluid typography:

```css
/* Question text */
font-size: clamp(1.125rem, 2.5vw, 2rem);    /* 18px → 32px */

/* Answer option text */
font-size: clamp(1rem, 2vw, 1.75rem);       /* 16px → 28px */

/* Timer / score */
font-size: clamp(1.5rem, 4vw, 3.5rem);     /* 24px → 56px */

/* Quiz title */
font-size: clamp(1.25rem, 3vw, 2.5rem);    /* 20px → 40px */
```

Tailwind equivalent using CSS variables:

```tsx
// tailwind.config.ts - add to theme.fontSize
'quiz-question': 'clamp(1.125rem, 2.5vw, 2rem)',
'quiz-option':   'clamp(1rem, 2vw, 1.75rem)',
'quiz-timer':    'clamp(1.5rem, 4vw, 3.5rem)',
```

---

## Touch Targets

**Minimum size: 44×44px** (Apple HIG + WCAG 2.5.5).

For interactive panels, increase to **56×56px** minimum:

```tsx
// Answer option button
<button className="min-h-[44px] min-w-[44px] lg:min-h-[56px] lg:min-w-[56px] touch-manipulation">
```

The `touch-manipulation` class disables double-tap zoom delay on mobile.

---

## Quiz Card Layout

**Rule: Never use fixed pixel widths on quiz cards.**

```tsx
// Quiz question container — fluid, never overflows
<div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

// Answer grid — 1 column on mobile, 2 on tablet+
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
```

---

## Container Queries

For components that need to respond to their *container* size (not viewport), use CSS container queries. This is critical for the player which can be embedded in different layouts:

```css
/* In the component */
.quiz-card {
  container-type: inline-size;
  container-name: quiz-card;
}

@container quiz-card (min-width: 480px) {
  .answer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container quiz-card (min-width: 800px) {
  .answer-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}
```

Tailwind `@container` support (v3.2+):
```tsx
<div className="@container">
  <div className="@md:grid-cols-2 grid grid-cols-1 gap-3">
```

---

## Animations & `prefers-reduced-motion`

All Framer Motion animations must respect the user's motion preference:

```tsx
import { useReducedMotion } from 'framer-motion'

function AnswerFeedback({ isCorrect }: { isCorrect: boolean }) {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      animate={shouldReduce ? {} : { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
      transition={{ duration: 0.4 }}
    >
      {isCorrect ? '✓' : '✗'}
    </motion.div>
  )
}
```

---

## Interactive Panel Specific

Interactive panels (65–85 inch, 1920×1080 or 4K) require:

1. **Extra large touch targets** — `2xl:min-h-[72px]`
2. **High contrast** — ensure 7:1 contrast ratio (WCAG AAA) for classroom visibility
3. **No hover-only interactions** — all interactions must work on touch
4. **Large cursor zone** — icons and buttons need extra padding: `p-6 2xl:p-8`

---

## Testing Checklist

Before marking any quiz UI feature complete, verify at:

- [ ] 375×667 (small phone) — not a target, but must not break
- [ ] 768×1024 (tablet portrait) — **primary**
- [ ] 1024×768 (tablet landscape) — **primary**
- [ ] 1280×800 (desktop)
- [ ] 1920×1080 (interactive panel / desktop widescreen)

In Chrome DevTools: **Device Toolbar** or custom viewport with touch emulation.

In Playwright E2E tests:

```typescript
// playwright.config.ts
projects: [
  { name: 'tablet-portrait', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
  { name: 'tablet-landscape', use: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
  { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  { name: 'panel', use: { viewport: { width: 1920, height: 1080 }, hasTouch: true } },
]
```
