/* يقسّم نص المصحف العثماني من مشروع تنزيل على السور: data/quran-uthmani/NNN.json.
   النص يُنقل كما هو حرفًا بحرف (رخصة تنزيل تمنع تغييره)، ومع كل ملف إشعار حقوقه كاملًا.
   ملف تنزيل يبدأ الآية الأولى من كل سورة بالبسملة، فيُحذف ذلك عند العرض والنسخ (uthmani.js). */
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "data", "quran-uthmani");
const lines = fs.readFileSync(path.join(dir, "tanzil-uthmani-1.1.txt"), "utf8").split("\n");
const notice = lines.filter(line => line.startsWith("#")).join("\n");
if (!/Tanzil Quran Text \(Uthmani, Version 1\.1\)/.test(notice)) throw Error("Tanzil copyright block not found");
const surahs = Array.from({ length: 114 }, () => []);
for (const line of lines) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [s, a, text] = line.split("|");
  const list = surahs[Number(s) - 1];
  if (!list || Number(a) !== list.length + 1 || !text) throw Error(`unexpected line: ${line.slice(0, 40)}`);
  list.push(text);
}
const total = surahs.reduce((n, list) => n + list.length, 0);
if (total !== 6236) throw Error(`expected 6236 verses, found ${total}`);
/* --check: لا يكتب شيئًا، ويفشل إن اختلف ملف عمّا يولّده المصدر. */
const check = process.argv.includes("--check");
const stale = [];
surahs.forEach((verses, i) => {
  const file = path.join(dir, `${String(i + 1).padStart(3, "0")}.json`);
  const body = JSON.stringify({ source: "Tanzil Quran Text (Uthmani, Version 1.1) — https://tanzil.net", notice, verses }) + "\n";
  if (!check) fs.writeFileSync(file, body);
  else if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== body) stale.push(path.basename(file));
});
if (stale.length) throw Error(`Uthmani files out of date (run npm run build): ${stale.slice(0, 5).join(", ")}`);
console.log(check ? "Uthmani surah files are up to date." : "Wrote 114 Uthmani surah files (6236 verses).");
