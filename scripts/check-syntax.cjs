"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const { stripTypeScriptTypes } = require("node:module");
const root = path.resolve(__dirname, "..");
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    const relative = path.relative(root, file);
    if (file.endsWith(".ts")) {
      const stripped = stripTypeScriptTypes(fs.readFileSync(file, "utf8"));
      const result = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: stripped, encoding: "utf8" });
      if (result.status !== 0) throw Error(result.stderr || `TypeScript syntax check failed: ${relative}`);
      count++;
    } else if (/\.(?:js|cjs|mjs)$/.test(file)) {
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      if (result.status !== 0) throw Error(result.stderr || `Syntax check failed: ${relative}`);
      count++;
    } else if (file.endsWith(".html") && !relative.startsWith("src" + path.sep)) {
      const html = fs.readFileSync(file, "utf8");
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=/.test(match[1])) continue;
        if (/application\/ld\+json/.test(match[1])) JSON.parse(match[2]);
        else new vm.Script(match[2], { filename: relative });
        count++;
      }
    } else if (file.endsWith(".json")) {
      JSON.parse(fs.readFileSync(file, "utf8"));
      count++;
    }
  }
}
walk(root);
console.log(`Syntax and JSON checks passed: ${count} blocks/files.`);
