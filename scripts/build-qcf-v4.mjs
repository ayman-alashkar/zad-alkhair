#!/usr/bin/env node
/* يبني صفحات المصحف بخط QCF V4 (مصحف المدينة ١٤٤١هـ، مجمع الملك فهد ودار المعرفة، كما تنشره QUL).
   لكل صفحة ملف خطها: fonts/qcf-v4/p<N>.woff2، والكلمة فيه محرف أو أكثر من منطقة الاستعمال الخاص.
   الخط ملوّن (COLR/CPAL): القارئ يختار مجموعة الألوان (لون واحد للتلاوة، أو ألوان التجويد).

   المصادر (data/qcf-v4-src، انظر README.md هناك):
   - qpc-v4-glyphs.json: محارف كل كلمة بترتيب أرقام QUL (الكلمة 1 هي 1:1:1، وعلامة الآية آخر كلماتها).
   - layout-15-lines.json: سطور المصحف في QUL: [صفحة، سطر، نوع، توسيط، أول كلمة، آخر كلمة، سورة].
     يُستعمل للتحقق من نوع كل سطر. كلمات كل سطر تؤخذ من QCF4، لأن توزيع QUL يخالف طبعة ١٤٤١
     في موضعين (الصفحة 92 السطر 12، والصفحة 254 السطر 6).
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

let nextId = 1, pendingTail = null;                                    // الكلمة التالية بترقيم QUL
for (const page of qcf4) {
  const p = page.page;
  const rows = rowsByPage.get(p);
  if (rows.length !== page.lines.length) fail(`page ${p}: ${page.lines.length} lines in QCF4, ${rows.length} in QCF V4`);
  /* السطور وكلماتها من QCF4، لأنها تطابق طبعة ١٤٤١ الرسمية. توزيع QUL يخالفها في صفحتين
     (92 و254: كلمة «مَا» على السطر المجاور)، فيُستعمل للتحقق من نوع كل سطر فقط. */
  const lines = page.lines.map((items, i) => {
    const [, lineNo, type] = rows[i];
    const head = items[0][0];
    if (head === "surah_header" || head === "bismillah") {
      if (type !== (head === "surah_header" ? "surah_name" : "basmallah")) fail(`page ${p} line ${lineNo}: ${head} in QCF4, ${type} in QCF V4`);
      const [t, char, font, sura] = items[0];
      return { words: [{ type: t, char, font, sura }] };
    }
    if (type !== "ayah") fail(`page ${p} line ${lineNo}: text in QCF4, ${type} in QCF V4`);
    const words = [];
    for (const [t, text, key] of items) {
      if (t === "quarter" || (t === "word" && text.startsWith("#"))) continue;   // جزء من شكل الكلمة في V4
      const prev = byId[nextId - 1];
      if (prev && prev.verse_key === key && prev.text.endsWith(" " + text) && pendingTail === text) { pendingTail = null; continue; } // الجزء الثاني من كلمة مجموعة
      const w = byId[nextId];
      if (!w || w.verse_key !== key) fail(`page ${p} line ${lineNo}: word ${nextId} out of step (${key})`);
      if (w.text !== text) {
        if (!w.text.startsWith(text + " ")) fail(`page ${p} line ${lineNo}: «${text}» ≠ «${w.text}»`);
        pendingTail = w.text.slice(text.length + 1);
      }
      words.push({ type: w.type, char: glyphs[nextId - 1], text: w.text, verse_key: key });
      versePage[key] ??= { page: p };
      nextId++;
    }
    return { words };
  });
  const font = "QCFV4_P" + String(p).padStart(3, "0");
  outputs.push([`pages/${String(p).padStart(3, "0")}.json`, JSON.stringify({ page: p, font, surahs: page.surahs, lines }) + "\n"]);
}
if (pendingTail || nextId !== glyphs.length + 1) fail(`used ${nextId - 1} of ${glyphs.length} QCF V4 words`);
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
