---
name: Car-logbook rounded-card corner gap
description: Why a colored left accent bar leaves a white crescent at a bordered, rounded card's corners, and how to fix it.
---

# Rounded card + border + edge accent bar = white corner crescent

When a card has `borderRadius` + `borderWidth` + `overflow: "hidden"` and a full-height
child sits flush against an edge (e.g. the gradient `urgencyBar` on the dashboard
"upcoming events" cards in `app/home.tsx`), a white/light crescent appears at the
card's corners on that edge.

**Why:** `overflow: "hidden"` clips children to the *outer* border radius, but the
`borderWidth` makes the card's own filled interior round at the *inner* radius
(`outerRadius - borderWidth`). The bar gets clipped more aggressively (outer radius)
than the white interior recedes (inner radius), exposing the card background in the gap.

**How to apply:** Don't rely on `overflow: "hidden"` to round the accent bar. Instead
remove `overflow: "hidden"` from the card and give the bar its own leading-corner radius
equal to the inner radius (`borderRadius - borderWidth`, e.g. 14 - 1.5 = 12.5). Make it
RTL-aware: round the right corners (`borderTopRightRadius`/`borderBottomRightRadius`) in
RTL, left corners in LTR. Just rounding the bar while keeping `overflow: "hidden"` does
NOT fix it — the outer-radius clip still wins.
