---
name: lib/db schema change needs dist rebuild
description: Why api-server typecheck shows stale "property does not exist" after a lib/db schema edit, and how to fix.
---

After adding/changing a column in `lib/db/src/schema/*.ts`, api-server `tsc --noEmit` can report `Property 'X' does not exist on type PgTableWithColumns<...>` even though the source is correct.

**Why:** `artifacts/api-server/tsconfig.json` consumes `@workspace/db` via TypeScript project references (`references: [{ path: "../../lib/db" }]`). With `composite`, the referencing project type-checks against lib/db's emitted declarations in `lib/db/dist/**/*.d.ts`, NOT the live source. lib/db has no `build` npm script and its `dist` is a committed artifact, so it goes stale after a schema edit.

**How to apply:** after any lib/db schema change, regenerate declarations: `cd lib/db && npx tsc -p tsconfig.json` (emitDeclarationOnly). Then re-run api-server tsc; the phantom errors disappear. Runtime/dev (tsx) is unaffected — this only impacts type-checking.
