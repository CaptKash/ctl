---
name: RTL row-reverse + flexWrap quirk (Expo/Yoga)
description: Why Arabic RTL rows misalign when combining flexDirection row-reverse with flexWrap wrap, and the fix.
---

In the car-logbook Expo app, a meta row that used `flexDirection: "row-reverse"` (for `isRTL`) together with `flexWrap: "wrap"` rendered its content left-aligned in Arabic instead of hugging the right edge — the shop name appeared on the left.

**Why:** Yoga's `row-reverse` + `wrap` combination does not pack items to the main-start (right) edge the way plain `row-reverse` does. The wrap breaks the reverse packing.

**How to apply:** For single-line RTL rows, drop `flexWrap` and instead give the long/truncatable child `flexShrink: 1` (plus `numberOfLines={1}`) so it shrinks/truncates rather than wrapping. Reserve `row-reverse` for non-wrapping rows. This is the established pattern in the app's card footers, which already work.
