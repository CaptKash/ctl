#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const PNPM_STORE = path.join(__dirname, "..", "node_modules", ".pnpm");

const TARGETS = [
  {
    relPath: path.join(
      "node_modules",
      "expo-modules-core",
      "ios",
      "Core",
      "Events",
      "EventEmitter.swift"
    ),
    replacements: [
      [
        "nonisolated(unsafe) weak let emitter = self",
        "nonisolated(unsafe) weak var emitter = self",
      ],
    ],
  },
  {
    relPath: path.join(
      "node_modules",
      "expo-modules-core",
      "ios",
      "Core",
      "SharedObjects",
      "SharedObjectRegistry.swift"
    ),
    replacements: [
      [
        "private weak let appContext: AppContext?",
        "private weak var appContext: AppContext?",
      ],
    ],
  },
];

let entries;
try {
  entries = fs.readdirSync(PNPM_STORE);
} catch {
  console.log("No pnpm store found, skipping Swift fix");
  process.exit(0);
}

const expoEntries = entries.filter((e) => e.startsWith("expo-modules-core@57.0.6"));

let patchedCount = 0;

for (const entry of expoEntries) {
  for (const { relPath, replacements } of TARGETS) {
    const filePath = path.join(PNPM_STORE, entry, relPath);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;

    for (const [from, to] of replacements) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log("Patched:", filePath);
      patchedCount++;
    }
  }
}

console.log("Swift weak-let fix: patched " + patchedCount + " file(s).");
