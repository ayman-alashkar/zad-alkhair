"use strict";

// Keep the two offline-critical documents self-contained. Source files are
// separate for editing; emitted HTML retains the original inline execution order.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");
let stale = false;

for (const [name, output] of [["home", "index.html"], ["reader", "reader.html"]]) {
  const dir = path.join(root, "src", name);
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  for (const file of ["styles.css", "app.js"]) {
    const marker = `<!-- @inline ${file} -->`;
    if (html.split(marker).length !== 2) throw Error(`Expected one ${marker} in ${name}`);
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    const closing = file.endsWith(".js") ? /<\/script[\s>]/i : /<\/style[\s>]/i;
    if (closing.test(source)) throw Error(`Unsafe inline closing tag in ${name}/${file}`);
    html = html.replace(marker, () => source);
  }
  const target = path.join(root, output);
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8") === html) continue;
  if (check) {
    console.error(`Stale generated file: ${output}; run npm run build`);
    stale = true;
  } else fs.writeFileSync(target, html);
}
if (stale) process.exitCode = 1;
