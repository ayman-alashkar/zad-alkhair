#!/usr/bin/env node
/* وحدات الواجهة (.mjs) تستورد كل ما تستعمله. اسم غير معرّف فيها يعني اعتمادًا خفيًا على
   الأقسام القديمة الملصقة، ينكسر حين يتغير ترتيبها. يشغّل قاعدة no-undef في deno lint،
   ويتجاهل أسماء المتصفح التي لا يعرفها Deno (document وأمثاله). يحتاج deno في PATH. */
"use strict";
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const BROWSER_ONLY = new Set([
  "document", "HTMLElement", "Element", "Node", "NodeList", "getComputedStyle",
  "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "IntersectionObserver",
  "ResizeObserver", "MutationObserver", "Audio", "Image", "HTMLAudioElement",
  "HTMLInputElement", "HTMLCanvasElement", "MediaMetadata", "DOMParser", "FontFace",
  "visualViewport", "devicePixelRatio", "innerWidth", "innerHeight", "scrollY", "scrollX",
  "scrollTo", "screen", "history", "IDBKeyRange", "KeyboardEvent", "PointerEvent", "TouchEvent",
  "requestIdleCallback", "cancelIdleCallback", "getSelection", "Notification", "webkitAudioContext",
]);

const root = path.join(__dirname, "..");
const files = ["src/home", "src/shared", "src/reader"]
  .flatMap(dir => fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith(".mjs")).map(f => `${dir}/${f}`));
let out;
try {
  out = execFileSync("deno", ["lint", "--json", "--rules-tags=", "--rules-include=no-undef", ...files],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (error) {
  out = error.stdout; // deno يخرج برمز 1 حين يجد مشكلات، والتقرير في stdout
}
const report = JSON.parse(out);
const problems = report.diagnostics
  .map(d => ({ file: path.relative(root, d.filename.replace(/^file:\/\//, "")), line: d.range.start.line, name: (d.message.match(/^(\S+) is not defined/) || [])[1] }))
  .filter(d => d.name && !BROWSER_ONLY.has(d.name));
for (const p of problems) console.error(`${p.file}:${p.line}: ${p.name} is used but not imported`);
if (report.errors?.length) { console.error(report.errors); process.exit(1); }
if (problems.length) process.exit(1);
console.log(`Modules import everything they use: ${files.length} files.`);
