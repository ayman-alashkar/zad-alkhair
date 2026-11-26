#!/usr/bin/env node
/* يبني data/riwaya-audio.json: قارئ كل رواية من قرآنبيديا (ملف لكل آية)، ومذهب العدّ الذي
   رُقّمت عليه ملفاته، وفروق كل مذهب عن عدّ حفص لكل سورة، من data/qiraat-src/ayah-count.json.
   الاستعمال: node scripts/build-riwaya-audio.mjs [--check] */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { surahFiles } from "../src/reader/riwaya-audio.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat-src/ayah-count.json"), "utf8"));
const OUT = path.join(root, "data/riwaya-audio.json");

/* قارئ واحد لكل رواية. count: المذهب الذي رُقّمت عليه ملفات التلاوة في فحص قرآنبيديا
   (2026-11-23)، وهو غير عدّ العرض أحيانًا: قالون على المدني الأول، والدوري والسوسي على البصري،
   والبزي وقنبل على المكي. */
const RECITERS = {
  qalun:   { id: 257, name: "محمود خليل الحصري", count: "A" },
  warsh:   { id: 261, name: "محمود خليل الحصري", count: "B" },
  bazzi:   { id: 268, name: "محمد عبد الحكيم", count: "K", missing: [64] },
  qunbul:  { id: 269, name: "محمد عبد الحكيم", count: "K" },
  duri:    { id: 271, name: "عبد الرشيد صوفي", count: "S" },
  susi:    { id: 272, name: "عبد الرشيد صوفي", count: "S" },
  hisham:  { id: 273, name: "مفتاح السلطني", count: "D" },
  dhakwan: { id: 274, name: "مفتاح السلطني", count: "D" },
  shubah:  { id: 275, name: "عبد الرشيد صوفي", count: "F" },
  khalaf:  { id: 277, name: "عبد الرشيد صوفي", count: "F" },
  khallad: { id: 278, name: "مفتاح السلطني", count: "F" },
  harith:  { id: 279, name: "عبد الرشيد صوفي", count: "F" },
  durik:   { id: 280, name: "عبد الرشيد صوفي", count: "F" },
  wardan:  { id: 282, name: "مفتاح السلطني", count: "A" },
  jammaz:  { id: 283, name: "مفتاح السلطني", count: "A" },
  ruwais:  { id: 284, name: "ياسر المزروعي", count: "S" },
  rawh:    { id: 286, name: "ياسر المزروعي", count: "S" },
  ishaq:   { id: 287, name: "مفتاح السلطني", count: "F" },
  idris:   { id: 288, name: "مفتاح السلطني", count: "F" },
};

const order = src.surah_totals.order; // "ABKFSD"
const hafs = Array.from({ length: 114 }, (_, i) => src.surah_totals.by_surah[i + 1][order.indexOf("F")]);
const events = {};
for (const M of order) {
  events[M] = {};
  for (const [, set, ref] of src.boundaries) {
    const [s, a] = ref.split(":").map(Number);
    const hafsHead = set.includes("F"), mHead = set.includes(M);
    if (hafsHead === mHead) continue;
    const e = (events[M][s] ||= {});
    if (hafsHead) (e.d ||= []).push(a);          // حفص يعدّها والمذهب لا
    else (e.i ||= {})[a] = ((e.i || {})[a] || 0) + 1; // رأس داخل آية حفص
  }
}
const data = { format: 1, about: "تلاوة كل رواية: قارئها في قرآنبيديا ومذهب ترقيم ملفاتها، وفروق كل مذهب عن عدّ حفص. انظر src/reader/riwaya-audio.mjs", source: "قرآنبيديا quranpedia.net، ملف لكل آية: files.quranpedia.net/recitations/{id}/{SSS}{AAA}.mp3", reciters: RECITERS, hafs, events };

// التحقق: آخر ملف في كل سورة يساوي عدد آيها في المذهب.
for (const M of order) for (let s = 1; s <= 114; s++) {
  const f = surahFiles(data, M, s).flat();
  const want = src.surah_totals.by_surah[s][order.indexOf(M)];
  if (f[f.length - 1] !== want || f.length !== want) throw new Error(`${M} سورة ${s}: ${f[f.length - 1]}/${f.length} والمتوقع ${want}`);
}

const text = JSON.stringify(data) + "\n";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== text) { console.error("data/riwaya-audio.json قديم؛ شغّل node scripts/build-riwaya-audio.mjs"); process.exit(1); }
} else fs.writeFileSync(OUT, text);
console.log("riwaya-audio: " + Object.keys(RECITERS).length + " روايات، " + (text.length / 1024).toFixed(1) + "KB");
