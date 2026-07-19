---
name: expo-modules-jsi Xcode 26 Swift fixes
description: Three Swift 6 / Xcode 26 compile errors in expo-modules-jsi@57.0.3 plus a missing babel-preset-expo dependency — all fixed via Podfile post-install hook
---

## The three Swift bugs in expo-modules-jsi@57.0.3 (Xcode 26 / Swift 6.2)

### Bug 1: `weak let` stored properties
Swift 6 rejects `weak let`; all 16 occurrences across ~10 files changed to `weak var`.

### Bug 2: Mutable `var` in `Sendable`-conforming classes
After Bug 1, Swift 6 then complains that mutable `var` stored properties exist in `Sendable`-conforming classes.  
Fix: `@unchecked Sendable` on class/struct/enum conformance lines (NOT protocol inheritance lines — `@unchecked` is illegal there).  
Guard: skip any line containing `protocol `.

### Bug 3: `abs(milliseconds)` ambiguity — JavaScriptCodable+Date.swift:53
`abs(milliseconds)` is ambiguous between Swift stdlib's `abs<T: SignedNumeric>` and Darwin's C `fabs` under Xcode 26 strict concurrency mode.  
Fix: `Swift.abs(milliseconds)`.

**Why:** Bugs 2 and 3 were hidden — compilation stopped at Bug 1 first, then Bug 2, then Bug 3 was finally reached. Each appears only after the prior is fixed.

## Missing babel-preset-expo
`babel.config.js` references `babel-preset-expo` but the package was not in `package.json`.  
Added `"babel-preset-expo": "~57.0.3"` to devDependencies and ran `pnpm install`.  
This caused `Cannot find module 'babel-preset-expo'` / Metro transformer init failure during the iOS archive bundling step.

## All fixes implemented via Podfile post-install hook
Plugin: `artifacts/car-logbook/plugins/fix-expo-swift.js`  
Injects Ruby gsub into `react_native_post_install` block; runs `chflags nouchg` + `chmod u+w` before writing.  
Path resolution: `File.expand_path(srcroot_raw, podfile_dir)` + `File.realpath`.

**How to apply:** If upgrading expo-modules-jsi again or seeing similar errors in a Xcode 26 project, apply the same three gsub patches to the Podfile hook.
