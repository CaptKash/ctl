const fs = require("fs");
const path = require("path");

// Fixes Xcode 26 / Swift 6 errors in expo-modules-jsi@57.0.3:
//
// Problem 1: `weak let` stored properties are rejected in Swift 6.
//   Fix: `weak let` -> `weak var`
//
// Problem 2: After Fix 1, classes that conform to Sendable (directly or via the
//   JavaScriptType: Sendable protocol) now have mutable `var` stored properties,
//   which also fail: "stored property of Sendable-conforming class is mutable".
//
//   Fix A: In lines NOT containing `protocol `, replace `: Sendable {` with
//          `: @unchecked Sendable {` and `, Sendable {` with
//          `, @unchecked Sendable {`.
//          `@unchecked` is ONLY valid in inheritance clauses of concrete types
//          (class/struct/enum/extension) — NOT in protocol inheritance lists.
//
//   Fix B: `final class X: ... JavaScriptType ...` adds `, @unchecked Sendable`
//          so classes inheriting Sendable transitively via the JavaScriptType
//          protocol use the lenient conformance.
//
// Path resolution: pod_target_srcroot is RELATIVE to the ios/ directory; must
// use File.expand_path(srcroot, podfile_dir) to get the absolute path inside
// the workspace root's node_modules/.pnpm/.

const RUBY_INSERT = `
    begin
      require 'shellwords'
      _podfile_dir = File.dirname(File.expand_path(__FILE__))
      _found = 0
      _patched_count = 0
      _failed_count = 0

      installer.pod_targets.each do |_pt|
        begin
          _srcroot_raw = _pt.pod_target_srcroot.to_s
          _srcroot = File.expand_path(_srcroot_raw, _podfile_dir)
          next unless Dir.exist?(_srcroot)

          Dir.glob(File.join(_srcroot, '**', '*.swift')) do |_f|
            begin
              _real = File.realpath(_f) rescue _f
              _content = File.read(_real) rescue nil
              next unless _content

              _needs_patch = _content.include?('weak let ') ||
                _content.include?(': Sendable ') ||
                _content.include?(', Sendable ') ||
                (_content.include?('JavaScriptType') && _content.include?('final class ')) ||
                _content.include?('abs(milliseconds)')
              next unless _needs_patch

              _new_content = _content.dup

              # Fix 1: weak let -> weak var
              _new_content.gsub!(/\\bweak let\\b/, 'weak var')

              # Fix 3: abs(milliseconds) is ambiguous between Swift.abs and Darwin C abs
              # under Xcode 26 / Swift 6.2. Qualify with Swift. to resolve.
              _new_content.gsub!('abs(milliseconds)', 'Swift.abs(milliseconds)')

              # Fix 2A/2B: Add @unchecked to Sendable conformances on concrete types.
              # Process LINE BY LINE to skip protocol declarations (protocols cannot
              # use @unchecked in their inheritance clause — compiler error).
              _new_content = _new_content.each_line.map do |_line|
                if !_line.include?('protocol ') && !_line.include?('@unchecked')
                  _line = _line.gsub(': Sendable {', ': @unchecked Sendable {')
                  _line = _line.gsub(', Sendable {', ', @unchecked Sendable {')
                end
                _line
              end.join('')

              # Fix 2C: final class X: ... JavaScriptType ... { -> add @unchecked Sendable
              # Targets classes whose Sendable comes transitively from JavaScriptType.
              _new_content.gsub!(/(final class \\w+:[^{\\n]*JavaScriptType[^{\\n]*)\\s*\\{/) do |_m|
                if _m.include?('@unchecked Sendable')
                  _m
                else
                  "#{$1}, @unchecked Sendable {"
                end
              end

              next if _new_content == _content
              _found += 1

              system("chflags nouchg #{_real.shellescape} 2>/dev/null")
              system("chmod u+w #{_real.shellescape} 2>/dev/null")
              File.write(_real, _new_content)

              _verify = File.read(_real) rescue nil
              if _verify && !_verify.include?('weak let ')
                _patched_count += 1
                puts "[fix-expo-swift] patched #{File.basename(_real)} (#{_pt.name})"
              else
                _failed_count += 1
                puts "[fix-expo-swift] VERIFY_FAIL #{File.basename(_real)}"
              end
            rescue => _fe
              _failed_count += 1
              puts "[fix-expo-swift] FILE_ERR #{File.basename(_f)}: #{_fe.message}"
            end
          end
        rescue => _pte
          puts "[fix-expo-swift] TARGET_ERR #{_pt.name rescue '?'}: #{_pte.message}"
        end
      end

      puts "[fix-expo-swift] result: found=#{_found} patched=#{_patched_count} failed=#{_failed_count} total_targets=#{installer.pod_targets.size}"
    rescue => _e
      puts "[fix-expo-swift] OUTER_ERR: #{_e.message}"
      puts _e.backtrace.first(5).join('\\n') if _e.backtrace
    end`;

function injectPodfileHook(platformProjectRoot) {
  const podfilePath = path.join(platformProjectRoot, "Podfile");
  try {
    let podfile = fs.readFileSync(podfilePath, "utf8");
    if (podfile.includes("fix-expo-swift")) {
      console.log("[fix-expo-swift] Podfile already patched");
      return;
    }
    const callStart = podfile.indexOf("react_native_post_install(");
    if (callStart === -1) {
      console.log("[fix-expo-swift] react_native_post_install not found");
      return;
    }
    let depth = 0;
    let i = callStart;
    while (i < podfile.length) {
      if (podfile[i] === "(") depth++;
      else if (podfile[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    if (depth !== 0) {
      console.log("[fix-expo-swift] unbalanced parens");
      return;
    }
    const insertPos = i + 1;
    const patched =
      podfile.slice(0, insertPos) + RUBY_INSERT + podfile.slice(insertPos);
    fs.writeFileSync(podfilePath, patched, "utf8");
    console.log("[fix-expo-swift] Podfile hook injected");
  } catch (e) {
    console.log("[fix-expo-swift] Podfile inject error:", e.message);
  }
}

module.exports = function fixExpoSwiftPlugin(config) {
  const { withDangerousMod } = require("expo/config-plugins");
  return withDangerousMod(config, [
    "ios",
    (c) => {
      try {
        injectPodfileHook(c.modRequest.platformProjectRoot);
      } catch (e) {
        console.log("[fix-expo-swift] plugin error:", e.message);
      }
      return c;
    },
  ]);
};
