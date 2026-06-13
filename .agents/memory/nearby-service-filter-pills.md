---
name: Nearby-service filter pill text clipping
description: Why the Service Centers type-filter pills rendered with blank/clipped text on iOS and the fix
---

Symptom: On the car-logbook Service Centers (`nearby-service.tsx`) screen, the
type-filter pills at the top rendered with their labels invisible — only the very
top sliver of the glyphs showed, the rest clipped. User described them as "empty"
/ "masked". The card subtitles used the identical `t()` call and rendered fine.

Root cause: the pills were laid out inside a `<ScrollView horizontal>`. On iOS a
horizontal ScrollView placed in a flex-column parent without an explicit height can
collapse its cross-axis (vertical) frame and clip child content. Adding `lineHeight`
to the Text and centering the pill did NOT fix it (the clip is at the scroll
container, not the text box).

Fix that worked: replace the horizontal `ScrollView` with a plain `<View>` using
`flexDirection: "row", flexWrap: "wrap"`. The filter set is small (≤ ~7 short type
pills) so wrapping is fine and removes the fragile horizontal-scroll height behavior.

**Why:** vertical ScrollView (the main results list) renders the same text fine — only
the horizontal ScrollView clips. The differentiator is horizontal scroll + no explicit height.
**How to apply:** for short pill/chip filter rows in this app, prefer a wrapping row View over
a horizontal ScrollView. If horizontal scroll is truly needed, give the ScrollView an explicit height.
