const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const pages = require("../src/home/adhkar-pages.json");

test("every adhkar section has its link page, share image and the app's slug", () => {
  const app = fs.readFileSync(path.join(root, "src/home/adhkar.js"), "utf8");
  const slugs = Object.values(eval("(" + app.match(/const ZA_SLUGS=(\{[^}]*\})/)[1] + ")"));
  assert.deepEqual(pages.map(p => p.slug).filter(s => !["index", "wird"].includes(s)).sort(), slugs.sort());
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page.path.slice(1), "index.html"), "utf8");
    assert.match(html, new RegExp(`og:image" content="https://zad-alkhair\\.net/social/adhkar/${page.slug}\\.jpg"`));
    assert.match(html, new RegExp(`location\\.replace\\("/\\?adhkar=${page.slug}"\\)`));
    assert.ok(fs.statSync(path.join(root, "social/adhkar", `${page.slug}.jpg`)).size < 300 * 1024, "under WhatsApp's preview limit");
  }
});
