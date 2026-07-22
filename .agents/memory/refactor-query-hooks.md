---
name: Refactoring inline queries into shared hooks
description: Pitfalls when extracting shared react-query hooks or shared label helpers
---

- When replacing inline `useQuery` calls with a shared hook, carry over per-call options (`staleTime`, `enabled`, etc.). **Why:** a settings screen silently lost its `staleTime: 30_000` during the CTL hook extraction, changing refetch behavior. **How to apply:** diff-grep for dropped option keys after each migration; give the shared hook an options param.
- Never pass a multi-arg helper directly to `.map` (e.g. `cars.map(carLabel)`): map's index leaks into the second parameter (a fallback string in carLabel's case). Wrap it: `cars.map((c) => carLabel(c))`.
- Metro can keep serving stale "duplicate declaration" transform errors after edits; restart the Expo workflow before trusting those errors.
