// يبني مصحف القراءات: صفحات المدينة الـ604 بكل الروايات، مرسومة بمحرّك DigitalKhatt.
//   node scripts/build-qiraat-mushaf.mjs                 الصفحات كلها إلى data/qiraat-mushaf/
//   node scripts/build-qiraat-mushaf.mjs 11 54 204       صفحات بعينها
//   --out=<مجلد>  --jobs=<عدد الخيوط>
//   pages/NNN.json   انظر scripts/qiraat/render.mjs
//   meta.json        الألوان، ومسارات المحارف كلها، وفروق رؤوس الآي في كل سورة، ووصف عدّ كل رواية
//   report.json      تقرير المراجعة: السطور المضغوطة مرتبةً من الأشد
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), "..");

if (!isMainThread) {
  const R = await import("./qiraat/render.mjs");
  await R.init();
  const out = workerData.out;
  parentPort.on("message", pg => {
    if (pg === null) { parentPort.postMessage({ glyphs: R.newGlyphs(), done: true }); return; }
    try {
      const p = R.renderPage(pg);
      fs.writeFileSync(path.join(out, "pages", String(pg).padStart(3, "0") + ".json"), JSON.stringify(p));
      parentPort.postMessage({ pg, qa: p.qa, glyphs: R.newGlyphs() });
    } catch (err) { parentPort.postMessage({ pg, error: String(err && err.stack || err) }); }
  });
} else {
  const args = process.argv.slice(2);
  const opt = (k, d) => (args.find(a => a.startsWith(`--${k}=`)) || "").split("=")[1] || d;
  const OUT = path.resolve(root, opt("out", "data/qiraat-mushaf"));
  const JOBS = Math.max(1, +opt("jobs", os.availableParallelism ? os.availableParallelism() : os.cpus().length));
  const pages = args.filter(a => /^\d+$/.test(a)).map(Number);
  const PAGES = pages.length ? pages : Array.from({ length: 604 }, (_, i) => i + 1);
  fs.mkdirSync(path.join(OUT, "pages"), { recursive: true });

  const t0 = Date.now();
  const glyphs = {}, qa = [], errors = [];
  const queue = [...PAGES];
  let doneCount = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, PAGES.length) }, () => new Promise((resolve, reject) => {
    const w = new Worker(self, { workerData: { out: OUT }, resourceLimits: { maxOldGenerationSizeMb: 3000 } });
    const next = () => w.postMessage(queue.length ? queue.shift() : null);
    w.on("message", m => {
      Object.assign(glyphs, m.glyphs || {});
      if (m.done) { w.terminate(); resolve(); return; }
      if (m.error) errors.push([m.pg, m.error]);
      else for (const q of m.qa) qa.push([m.pg, ...q]);
      if (++doneCount % 50 === 0) console.log(`  ${doneCount}/${PAGES.length}`);
      next();
    });
    w.on("error", reject);
    next();
  })));
  if (errors.length) { for (const [pg, e] of errors) console.error(`page ${pg}: ${e}`); process.exit(1); }

  // meta.json
  const R = await import("./qiraat/render.mjs");
  const { ayahNumbers, riwayaEnds, RIWAYA_COUNT, MADHHABS } = await import("./qiraat/ayah-count.mjs");
  const H = JSON.parse(fs.readFileSync(path.join(root, "data/mushaf-src/hafs.json"), "utf8"));
  const IDX = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat/index.json"), "utf8"));
  const AC = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat-src/ayah-count.json"), "utf8"));
  const AR = d => String(d).replace(/\d/g, c => "٠١٢٣٤٥٦٧٨٩"[c]);
  const hafsNums = ayahNumbers("hafs"), hafsEnds = riwayaEnds("hafs");
  const hafsAyahOf = w => { for (let x = w; x < H.words.length; x++) if (hafsNums.has(x)) return hafsNums.get(x); return 0; };
  const surahOf = gi => { let s = 0; while (s + 1 < H.surah_starts.length && H.surah_starts[s + 1] <= gi) s++; return s + 1; };
  // فروق رؤوس الآي عن حفص في كل سورة، لكل رواية: [رقم الكلمة، آية حفص، الكلمة، + أو -]
  const sdiff = {}, count = { hafs: `${MADHHABS.F} (${AR(6236)} آية)` };
  for (const r of IDX.riwayat) {
    if (r === "hafs") continue;
    const ends = riwayaEnds(r), spec = RIWAYA_COUNT[r];
    const base = spec.startsWith("print:") ? AC.prints[spec.slice(6)].base : spec;
    count[r] = `${MADHHABS[base]}${spec.startsWith("print:") ? "، كما في مصحف المجمع للرواية" : r === "qalun" || r === "warsh" || r === "shubah" ? "، وعليه مصحف المجمع للرواية" : ""} (${AR(ends.size)} آية)`;
    const d = {};
    for (const gi of new Set([...ends, ...hafsEnds])) {
      if (ends.has(gi) === hafsEnds.has(gi)) continue;
      (d[surahOf(gi)] ??= []).push([gi, hafsAyahOf(gi), H.words[gi], ends.has(gi) ? "+" : "-"]);
    }
    for (const s in d) d[s].sort((a, b) => a[0] - b[0]);
    sdiff[r] = d;
  }
  const { upem } = await R.init();
  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({
    format: 1, cats: R.CATS, lineUnits: R.LINE_UNITS, mk: R.MK, upem, riwayat: IDX.riwayat, count, sdiff,
    glyphs: Object.fromEntries(Object.entries(glyphs).sort((a, b) => a[0] - b[0])),
    source: "بيانات القراءات: مركز تفسير للدراسات القرآنية (CC BY 4.0) مع تصحيحات «القاعدة»؛ الخط: DigitalKhatt (madina.otf)",
  }));

  // report.json: كل سطر ضُغط، مرتبًا من الأشد (xScale الأصغر، ثم المسافة الأضيق)
  qa.sort((a, b) => a[3] - b[3] || a[4] - b[4]);
  const lines = PAGES.length * 15 * IDX.riwayat.length;
  const bucket = (lo, hi) => qa.filter(q => q[3] >= lo && q[3] < hi).length;
  const report = {
    pages: PAGES.length, seconds: Math.round((Date.now() - t0) / 1000), jobs: JOBS,
    squeezed: qa.length, of: lines,
    spaces_only: qa.filter(q => q[3] >= 0.999).length,
    xscale: { "0.97–1": bucket(0.97, 0.999), "0.94–0.97": bucket(0.94, 0.97), "0.90–0.94": bucket(0.90, 0.94), "<0.90": bucket(0, 0.90) },
    columns: ["page", "riwaya", "line", "xScale", "space"],
    lines: qa,
  };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report));
  const size = fs.readdirSync(path.join(OUT, "pages")).reduce((s, f) => s + fs.statSync(path.join(OUT, "pages", f)).size, 0);
  console.log(`build-qiraat-mushaf: ${PAGES.length} صفحة في ${report.seconds} ث بـ${JOBS} خيوط، ${(size / 2 ** 20).toFixed(1)}MB، ${Object.keys(glyphs).length} محرفًا`);
  console.log(`  سطور مضغوطة ${qa.length} من ${lines}: بالمسافات وحدها ${report.spaces_only}، وبتضييق الحروف`, report.xscale);
}
