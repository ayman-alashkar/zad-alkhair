// يبني بيانات بطاقة الكلمة على مستوى الآية والصفحة والسورة، من لقطة مركز تفسير.
//   node scripts/build-card-data.mjs           يكتب الملفات
//   node scripts/build-card-data.mjs --check   يفشل إن لم تكن الملفات المكتوبة مطابقة
//
// المصدر: data/tafsir-src/center-ayah.json.gz (جداول quran.db كما هي، بصمتها فيه).
// الناتج، على نمط data/tafsir/al-wajeez (ملف لكل سورة، ومعه index.json وmanifest.json):
//   data/tafsir/al-mukhtasar/   المختصر في تفسير القرآن الكريم
//   data/tafsir/al-saadi/       تيسير الكريم الرحمن (السعدي)
//   data/i3rab/markaz-tafsir/   إعراب الآية كاملة
// وملفات صغيرة كاملة:
//   data/nuzool.json            أسباب النزول، للآيات التي لها سبب (201 آية)
//   data/fawaed.json            فوائد كل صفحة من المختصر
//   data/surah-goals.json       مقاصد كل سورة
// النص كما هو حرفًا. التغيير الوحيد: \r\n تصير \n، وتُحذف المسافات في طرفي النص.
// في المختصر علامات _…_ حول الكلمات التي يفسّرها؛ تبقى كما هي، والعرض يحوّلها إلى إبراز.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const fail = m => { console.error("build-card-data: " + m); process.exit(1); };
const sha = s => crypto.createHash("sha256").update(s).digest("hex");
const pad = n => String(n).padStart(3, "0");
const clean = t => String(t ?? "").replace(/\r\n?/g, "\n").trim();

const SRC = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "data/tafsir-src/center-ayah.json.gz"))));
const H = JSON.parse(fs.readFileSync(path.join(ROOT, "data/mushaf-src/hafs.json"), "utf8"));
const SURAHS = H.surahs.map(s => ({ number: s.number, name: s.name_ar, ayahs: s.ayah_count }));
const ATTR = { source: "مركز تفسير للدراسات القرآنية — قاعدة بيانات القرآن الكريم (quran.db)", license: "CC BY 4.0", source_sha256: SRC.sha256 };
const files = new Map();
const json = o => JSON.stringify(o) + "\n";

function perSurah(dir, table, source_id, title) {
  const T = SRC.tables[table];
  const by = new Map();
  for (const [s, a, t] of T.rows) { if (!by.has(s)) by.set(s, {}); by.get(s)[a] = clean(t); }
  const surah_files = [], manifestFiles = [];
  let total = 0;
  for (const S of SURAHS) {
    const got = by.get(S.number) || {};
    const ayahs = {};
    for (let a = 1; a <= S.ayahs; a++) {
      const text = got[a];
      if (!text) fail(`${table} ${S.number}:${a} فارغ أو ناقص`);
      ayahs[a] = { text, sha256: sha(text) };
      total++;
    }
    if (Object.keys(got).length !== S.ayahs) fail(`${table} سورة ${S.number}: ${Object.keys(got).length} آية لا ${S.ayahs}`);
    const body = json({ schema_version: 1, source_id, surah: S.number, surah_name: S.name, ayah_count: S.ayahs, ayahs });
    const file = pad(S.number) + ".json";
    files.set(`${dir}/${file}`, body);
    surah_files.push({ surah: S.number, name: S.name, file, ayah_count: S.ayahs });
    manifestFiles.push({ surah: S.number, file, ayah_count: S.ayahs, sha256: sha(body), bytes: Buffer.byteLength(body) });
  }
  if (total !== 6236) fail(`${table}: ${total} آية`);
  files.set(`${dir}/index.json`, json({ schema_version: 1, source_id, title, total_ayah_records: total, surah_files }));
  files.set(`${dir}/manifest.json`, json({ dataset: `زاد الخير — ${title}`, schema_version: 1, ...ATTR, from: T.from, counts: { surahs: 114, ayah_records: total }, files: manifestFiles }));
}

perSurah("data/tafsir/al-mukhtasar", "mukhtasar", "markaz_tafsir_al_mukhtasar", "المختصر في تفسير القرآن الكريم");
perSurah("data/tafsir/al-saadi", "saadi", "al_saadi_taysir", "تيسير الكريم الرحمن في تفسير كلام المنان (السعدي)");
perSurah("data/i3rab/markaz-tafsir", "irab", "markaz_tafsir_i3rab", "إعراب القرآن الكريم (مركز تفسير)");

// أسباب النزول: {"س:آ": النص}
{
  const T = SRC.tables.nuzool, o = {};
  for (const [s, a, t] of T.rows) {
    const S = SURAHS[s - 1];
    if (!S || a < 1 || a > S.ayahs) fail(`أسباب النزول: ${s}:${a} خارج المصحف`);
    if (clean(t)) o[`${s}:${a}`] = clean(t);
  }
  files.set("data/nuzool.json", json({ schema_version: 1, title: "أسباب النزول", ...ATTR, from: T.from, ayahs: o }));
}
// الفوائد: {الصفحة: [فائدة…]}، بترتيبها في المصدر
{
  const T = SRC.tables.fawaed, o = {};
  for (const [p, t] of T.rows) {
    if (p < 1 || p > 604) fail(`الفوائد: صفحة ${p}`);
    const x = clean(t).replace(/^•\s*/, "");
    if (x) (o[p] ??= []).push(x);
  }
  if (Object.keys(o).length !== 604) fail(`الفوائد: ${Object.keys(o).length} صفحة لا 604`);
  files.set("data/fawaed.json", json({ schema_version: 1, title: "من فوائد الآيات — المختصر في تفسير القرآن الكريم", ...ATTR, from: T.from, pages: o }));
}
// مقاصد السور: {السورة: النص}
{
  const T = SRC.tables.goals, o = {};
  for (const [s, t] of T.rows) { if (!clean(t)) fail(`المقاصد: سورة ${s} فارغة`); o[s] = clean(t); }
  if (Object.keys(o).length !== 114) fail("المقاصد: ناقصة");
  files.set("data/surah-goals.json", json({ schema_version: 1, title: "مقاصد السور", ...ATTR, from: T.from, surahs: o }));
}

if (CHECK) {
  const stale = [...files].filter(([f, d]) => { const p = path.join(ROOT, f); return !fs.existsSync(p) || fs.readFileSync(p, "utf8") !== d; }).map(([f]) => f);
  if (stale.length) fail(`ملفات غير محدّثة (${stale.length}): ${stale.slice(0, 4).join(", ")} — شغّل node scripts/build-card-data.mjs`);
  console.log(`build-card-data: ${files.size} ملفًا مطابقًا`);
} else {
  for (const [f, d] of files) { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), d); }
  console.log(`build-card-data: ${files.size} ملفًا`);
}
