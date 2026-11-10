const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "data", "quran-uthmani");

test("the Uthmani text is split into 114 surah files carrying Tanzil's notice, 6236 verses in all", () => {
  let total = 0;
  for (let s = 1; s <= 114; s++) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, `${String(s).padStart(3, "0")}.json`), "utf8"));
    assert.match(data.notice, /Tanzil Quran Text \(Uthmani, Version 1\.1\)/);
    assert.match(data.notice, /CHANGING IT IS NOT ALLOWED/);
    assert.ok(data.verses.every(v => typeof v === "string" && v.length));
    total += data.verses.length;
  }
  assert.equal(total, 6236);
});

test("the service worker keeps the Uthmani files with the offline Tafsir pack", () => {
  const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.match(sw, /data\/quran-uthmani\/\$\{String\(i\+1\)\.padStart\(3,"0"\)\}\.json/);
  assert.match(sw, /\.\.\.UTHMANI_REQUIRED\]/);
});

/* uthmani.js كما يعمل في القارئ، مع fetch من الملفات المحلية. */
function loadUthmani() {
  const vm = require("node:vm");
  const context = {
    pad3: n => String(n).padStart(3, "0"),
    verseParts: k => { const [s, a] = k.split(":").map(Number); return { s, a }; },
    fetch: async url => {
      const file = path.join(__dirname, "..", url.replace(/^\//, ""));
      return { ok: fs.existsSync(file), json: async () => JSON.parse(fs.readFileSync(file, "utf8")) };
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src/reader/uthmani.js"), "utf8") +
    "\n;Object.assign(globalThis,{uthmaniVerse,uthmaniVerseNow,cleanSimpleQuranText});", context);
  return context;
}

test("a surah's first ayah is copied without the basmala, which belongs to al-Fatiha alone", async () => {
  const u = loadUthmani();
  assert.equal((await u.uthmaniVerse("2:1")).split(" ").length, 1);
  const tin = JSON.parse(fs.readFileSync(path.join(dir, "095.json"), "utf8")).verses[0];
  assert.equal(await u.uthmaniVerse("95:1"), tin.split(" ").slice(4).join(" "), "even Tanzil's «بِّسْمِ» with a shadda");
  const verse = (s, a) => JSON.parse(fs.readFileSync(path.join(dir, `${String(s).padStart(3, "0")}.json`), "utf8")).verses[a - 1];
  assert.equal(await u.uthmaniVerse("1:1"), verse(1, 1), "al-Fatiha keeps its basmala");
  assert.equal(await u.uthmaniVerse("9:1"), verse(9, 1), "at-Tawbah has none to remove");
  assert.equal((await u.uthmaniVerse("1:1")).split(" ").length, 4);
  assert.equal(u.uthmaniVerseNow("2:2").startsWith("ذَٰلِكَ"), true, "the loaded surah answers without waiting");
  assert.equal(await u.uthmaniVerse("115:1"), null);
});

test("the simplified fallback decodes the leftover character codes and the sajda mark", () => {
  const u = loadUthmani();
  assert.equal(u.cleanSimpleQuranText("كَأَمْثَالِ اللُّؤْلُو&#1621;ِ الْمَكْنُونِ"), "كَأَمْثَالِ اللُّؤْلُوِٕ الْمَكْنُونِ");
  assert.equal(u.cleanSimpleQuranText("وَيَزِيدُهُمْ خُشُوعا #1969"), "وَيَزِيدُهُمْ خُشُوعا ۩");
});
