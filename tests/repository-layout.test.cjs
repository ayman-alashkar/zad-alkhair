"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

test("public image compatibility redirects resolve directly to existing image files", () => {
  const rules = fs.readFileSync(path.join(root, "_redirects"), "utf8")
    .split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"))
    .map(line => line.split(/\s+/));
  const required = ["/zad-alkhair-share.png", "/zad-alkhair-share.svg", "/zad-alkhair-install-share.png", "/zad-alkhair-install-share.svg"];
  for (const oldUrl of required) assert.ok(rules.some(([source]) => source === oldUrl), oldUrl);
  assert.equal(new Set(rules.map(([source]) => source)).size, rules.length);
  for (const [source, destination, code] of rules) {
    assert.equal(code, "301");
    assert.notEqual(source, destination);
    assert.ok(destination.startsWith("/"));
    assert.ok(fs.statSync(path.join(root, destination.slice(1))).isFile(), destination);
    assert.ok(!rules.some(([next]) => next === destination), "avoid redirect chains");
  }
});
