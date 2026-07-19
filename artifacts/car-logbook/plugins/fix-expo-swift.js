const fs = require("fs");
const path = require("path");

// Ruby snippet appended to Podfile — runs after pod install, patches files
// that Xcode actually compiles (in Pods/ not node_modules).
// Fixes Xcode 26+ error: weak let must be weak var
const RUBY_HOOK = `
# fix-expo-swift: weak let to weak var for Xcode 26+ (expo-modules-core@57.0.6)
post_install do |installer|
  targets = [
    ['EventEmitter.swift',        'nonisolated(unsafe) weak let emitter = self',    'nonisolated(unsafe) weak var emitter = self'],
    ['SharedObjectRegistry.swift','private weak let appContext: AppContext?',        'private weak var appContext: AppContext?'],
  ]
  search_paths = [
    'Pods/expo-modules-core/ios/Core/Events',
    'Pods/expo-modules-core/ios/Core/SharedObjects',
    '../node_modules/expo-modules-core/ios/Core/Events',
    '../node_modules/expo-modules-core/ios/Core/SharedObjects',
  ]
  done = {}
  search_paths.each do |dir|
    targets.each do |fname, from, to|
      fp = File.join(dir, fname)
      next if done[fname] || !File.exist?(fp)
      src = File.read(fp)
      if src.include?(from)
        src = src.gsub(from, to)
        File.open(fp, 'w') { |f| f.write(src) }
        puts "[fix-expo-swift] Patched #{fp}"
        done[fname] = true
      end
    end
  end
end
`;

// Fallback: patch Swift files directly in the pnpm virtual store.
// Works when withDangerousMod is unavailable.
function patchNodeModules(projectRoot) {
  const candidates = [
    path.join(projectRoot, "node_modules", ".pnpm"),
    path.join(projectRoot, "..", "..", "node_modules", ".pnpm"),
    path.join(projectRoot, "..", "node_modules", ".pnpm"),
  ];
  let pnpmStore = null;
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) { pnpmStore = c; break; }
    } catch (_) {}
  }
  if (!pnpmStore) { console.log("[fix-expo-swift] fallback: pnpm store not found"); return; }

  const TARGETS = [
    {
      rel: path.join("node_modules","expo-modules-core","ios","Core","Events","EventEmitter.swift"),
      pairs: [["nonisolated(unsafe) weak let emitter = self","nonisolated(unsafe) weak var emitter = self"]],
    },
    {
      rel: path.join("node_modules","expo-modules-core","ios","Core","SharedObjects","SharedObjectRegistry.swift"),
      pairs: [["private weak let appContext: AppContext?","private weak var appContext: AppContext?"]],
    },
  ];

  const entries = fs.readdirSync(pnpmStore).filter(e => e.startsWith("expo-modules-core@57.0.6"));
  let count = 0;
  for (const entry of entries) {
    for (const { rel, pairs } of TARGETS) {
      const fp = path.join(pnpmStore, entry, rel);
      try {
        if (!fs.existsSync(fp)) continue;
        let src = fs.readFileSync(fp, "utf8");
        let changed = false;
        for (const [from, to] of pairs) {
          if (src.includes(from)) { src = src.split(from).join(to); changed = true; }
        }
        if (changed) {
          try {
            fs.writeFileSync(fp, src, "utf8");
          } catch (_) {
            // hard-link may be read-only; unlink first then write
            fs.unlinkSync(fp);
            fs.writeFileSync(fp, src, "utf8");
          }
          console.log("[fix-expo-swift] fallback patched:", path.basename(fp));
          count++;
        }
      } catch (e) {
        console.log("[fix-expo-swift] fallback error:", e.message);
      }
    }
  }
  console.log("[fix-expo-swift] fallback done, patched", count, "file(s)");
}

module.exports = function fixExpoSwiftPlugin(config) {
  try {
    // expo re-exports @expo/config-plugins; expo IS a direct dep of car-logbook
    const { withDangerousMod } = require("expo/config-plugins");
    return withDangerousMod(config, ["ios", (c) => {
      const podfilePath = path.join(c.modRequest.platformProjectRoot, "Podfile");
      try {
        if (fs.existsSync(podfilePath)) {
          const content = fs.readFileSync(podfilePath, "utf8");
          if (!content.includes("fix-expo-swift")) {
            fs.appendFileSync(podfilePath, RUBY_HOOK);
            console.log("[fix-expo-swift] Added post_install hook to Podfile");
          } else {
            console.log("[fix-expo-swift] Podfile already has hook, skipping");
          }
        } else {
          console.log("[fix-expo-swift] Podfile not found at", podfilePath);
          patchNodeModules(c.modRequest.projectRoot);
        }
      } catch (inner) {
        console.log("[fix-expo-swift] Podfile error:", inner.message);
        patchNodeModules(c.modRequest.projectRoot);
      }
      return c;
    }]);
  } catch (e) {
    // expo/config-plugins not available in this context (e.g. EAS CLI validation)
    console.log("[fix-expo-swift] withDangerousMod unavailable, using fallback:", e.message);
    try {
      patchNodeModules(
        (config && config.modRequest && config.modRequest.projectRoot) || process.cwd()
      );
    } catch (e2) {
      console.log("[fix-expo-swift] fallback also failed:", e2.message);
    }
    return config;
  }
};
