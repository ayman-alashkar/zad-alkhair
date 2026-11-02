"use strict";
const fs = require("node:fs");
const path = require("node:path");

// Expand explicit source sections at build time. They stay in the original
// lexical scope and order; browsers still receive one self-contained document.
function readAppScript(dir) {
  const used = new Set();
  const entry = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  const result = entry.replace(/\/\* @include ([a-z0-9-]+\.js) \*\/(?:\r?\n)?/g, (_, name) => {
    if (name === "app.js" || used.has(name)) throw Error(`Repeated source section: ${name}`);
    used.add(name);
    const source = fs.readFileSync(path.join(dir, name), "utf8");
    if (source.includes("@include")) throw Error(`Nested source section: ${name}`);
    return source;
  });
  if (result.includes("@include")) throw Error(`Invalid source section in ${dir}`);
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith(".js") && name !== "app.js" && !used.has(name)) {
      throw Error(`Unreferenced source section: ${name}`);
    }
  }
  return result;
}

module.exports = { readAppScript };
