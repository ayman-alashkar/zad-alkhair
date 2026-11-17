#!/usr/bin/env node
/* يبني صفحات المصحف بخط QCF V4 (مصحف المدينة ١٤٤١هـ، مجمع الملك فهد ودار المعرفة، كما تنشره QUL).
   لكل صفحة ملف خطها: fonts/qcf-v4/p<N>.woff2، والكلمة فيه محرف أو أكثر من منطقة الاستعمال الخاص.
   الخط ملوّن (COLR/CPAL): القارئ يختار مجموعة الألوان (لون واحد للتلاوة، أو ألوان التجويد).

   المصادر (data/qcf-v4-src، انظر README.md هناك):
   - qpc-v4-glyphs.json: محارف كل كلمة بترتيب أرقام QUL (الكلمة 1 هي 1:1:1، وعلامة الآية آخر كلماتها).
   - layout-15-lines.json: سطور المصحف: [صفحة، سطر، نوع، توسيط، أول كلمة، آخر كلمة، سورة].
     توزيع السطور يطابق طبعة ١٤٤١ في كل سطور الصفحات الـ604 (فُحص مقابل نص المجمع).
   - qcf4-text.json: من quran-qcf4@1.0.3 (MIT): نص كل كلمة ومفتاح آيتها، ومحارف العناوين والبسملة.
     هذا النص هو ما يعتمد عليه البحث والنسخ والمقتطفات اليوم، فيبقى كما هو.

   المطابقة كلمةً كلمة، آيةً آية:
   - علامة الربع وعلامة السجدة في QCF4 كلمتان مستقلتان، وفي QCF V4 هما جزء من شكل الكلمة: تُتركان.
   - «إِلۡ يَاسِينَ» (37:130) كلمتان في QCF4 وكلمة واحدة في QCF V4: يُجمع نصّهما.
   - غير ذلك: أي اختلاف في عدد الكلمات أو موضع علامة الآية يوقف البناء.

   المخرجات (data/qcf-v4):
   - pages/NNN.json بالشكل الذي يعرفه القارئ (lines[].words[]).
   - verses.json: صفحة كل آية.
   الاستعمال: node scripts/build-qcf-v4.mjs [--check] */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = p => JSON.parse(readFileSync(path.join(root, "data/qcf-v4-src", p), "utf8"));
const check = process.argv.includes("--check");
const fail = m => { throw new Error(m); };

const glyphs = src("qpc-v4-glyphs.json");
const layout = src("layout-15-lines.json");
const qcf4 = src("qcf4-text.json");
const MERGE = { "37:130": [2, 3] };

/* ---- كلمات QCF4 لكل آية ---- */
const qWords = new Map();
for (const page of qcf4) for (const line of page.lines) for (const [type, text, key] of line) {
  if (type !== "word" && type !== "end") continue;
  if (type === "word" && text.startsWith("#")) continue;               // علامة السجدة
  if (!qWords.has(key)) qWords.set(key, []);
  qWords.get(key).push({ type, text, verse_key: key });
}
for (const [key, [a, b]] of Object.entries(MERGE)) {
  const ws = qWords.get(key);
  if (!ws || ws[a].type !== "word" || ws[b].type !== "word") fail(`merge ${key}: unexpected words`);
  ws.splice(a, 2, { type: "word", text: ws[a].text + " " + ws[b].text, verse_key: key });
}

/* ---- ترقيم QUL: الكلمة n في مصحف V4 تقابل الكلمة نفسها في QCF4 ---- */
const byId = [null];
for (const ws of qWords.values()) for (const w of ws) byId.push(w);
if (byId.length - 1 !== glyphs.length) fail(`QCF4 has ${byId.length - 1} words, QCF V4 has ${glyphs.length}`);
for (const ws of qWords.values()) {
  ws.forEach((w, i) => { if ((w.type === "end") !== (i === ws.length - 1)) fail(`ayah ${w.verse_key}: misplaced ayah marker`); });
}

/* ---- الصفحات ---- */
const rowsByPage = new Map();
for (const row of layout) {
  if (!rowsByPage.has(row[0])) rowsByPage.set(row[0], []);
  rowsByPage.get(row[0]).push(row);
}
if (qcf4.length !== 604 || rowsByPage.size !== 604) fail("expected 604 pages");

const outDir = path.join(root, "data/qcf-v4/pages");
if (!check) mkdirSync(outDir, { recursive: true });
const outputs = [];
const versePage = {};

for (const page of qcf4) {
  const p = page.page;
  const special = page.lines.map(l => l[0]).filter(w => w[0] === "surah_header" || w[0] === "bismillah");
  const lines = rowsByPage.get(p).map(([, lineNo, type, , first, last]) => {
    if (type === "surah_name" || type === "basmallah") {
      const want = type === "surah_name" ? "surah_header" : "bismillah";
      const s = special.shift();
      if (!s || s[0] !== want) fail(`page ${p} line ${lineNo}: expected ${want} in QCF4`);
      const [t, char, font, sura] = s;
      return { words: [{ type: t, char, font, sura }] };
    }
    if (type !== "ayah") fail(`page ${p} line ${lineNo}: unknown line type ${type}`);
    const words = [];
    for (let id = first; id <= last; id++) {
      const w = byId[id];
      words.push({ type: w.type, char: glyphs[id - 1], text: w.text, verse_key: w.verse_key });
      versePage[w.verse_key] ??= { page: p };
    }
    return { words };
  });
  if (special.length) fail(`page ${p}: unused QCF4 header lines`);
  const font = "QCFV4_P" + String(p).padStart(3, "0");
  outputs.push([`pages/${String(p).padStart(3, "0")}.json`, JSON.stringify({ page: p, font, surahs: page.surahs, lines }) + "\n"]);
}
if (Object.keys(versePage).length !== 6236) fail("expected 6236 verses");
outputs.push(["verses.json", JSON.stringify(versePage) + "\n"]);

let stale = 0;
for (const [rel, json] of outputs) {
  const file = path.join(root, "data/qcf-v4", rel);
  if (check) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== json) { stale++; if (stale <= 5) console.error("stale: data/qcf-v4/" + rel); }
  } else writeFileSync(file, json);
}
if (check && stale) { console.error(`${stale} QCF V4 data files are out of date; run node scripts/build-qcf-v4.mjs`); process.exit(1); }
console.log(check ? "QCF V4 data up to date" : `QCF V4 data built: ${outputs.length} files`);
