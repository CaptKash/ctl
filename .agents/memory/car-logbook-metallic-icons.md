---
name: Car-logbook metallic icon tiles
description: Convention for colored icon "tiles" in the CTL Expo app — use the shared MetalIcon component, and which icon types are deliberately excluded.
---

# Metallic icon tiles (MetalIcon)

Colored icon **tiles** in the car-logbook app render through the shared component
`components/ui/MetalIcon.tsx` (gradient plate + thin border + darkened glyph, all
derived from one base `color`). Props: `icon` (Feather) OR `ionIcon` (Ionicons),
`color`, optional `bg` (defaults to `lighten(color, .82)`), `size`, `containerSize`,
`radius`, and `style`. Always pass the tile's existing style object via `style=` so
the original width/height/borderRadius are preserved (the array applies `style` last,
overriding MetalIcon's defaults).

**Why:** the app standardizes every colored icon plate on one metallic look. New
colored icon tiles should use MetalIcon, not a flat `<View backgroundColor>` wrapper.

**How to apply / scope:** Convert only colored icon **tiles** (a View whose only
child is a single icon, with a colored fill). Do NOT convert: already-metallic
LinearGradient tiles, text+icon badges/pills (status chips), avatars/initials, photo
thumbnails, bottom nav, and inline action/form glyphs (chevrons like `tileArrow`,
field icons, back arrows, close/X).

**Gotchas:**
- MetalIcon couples plate color and glyph color (both from `color`). For a neutral
  light-plate/dark-glyph button (e.g. home `calBtn`), base the `color` on the original
  *border* gray (`#9CA3AF`) so it reads metallic-gray instead of a dark gradient.
- A tile that conditionally renders a spinner (e.g. ActivityIndicator vs icon) can't
  be a single MetalIcon — convert only the icon branch and leave the loading branch a
  flat View.
- Tile backgrounds are sometimes inline (`backgroundColor` in the style array) and
  sometimes defined in the StyleSheet (e.g. `fleetIconWrap`, `suggestIconBox`,
  `heroIconWrap`). Scan for BOTH when hunting for unconverted tiles.
