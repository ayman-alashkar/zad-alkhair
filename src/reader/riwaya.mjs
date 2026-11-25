/* الرواية المختارة في المصحف، وزرّها في منتصف رأس الصفحة، ونافذة اختيارها.
   حفص يرسمه محرّك QCF، وكل رواية أخرى محرّك DigitalKhatt على الصفحة نفسها.
   الاختيار محفوظ في المتصفح (zad:riwaya). */
import { onPageHeader, setActiveEngine, activeEngineId, refreshEngine, selectEngineAtBoot } from "./page-engine.mjs";

const KEY = "zad:riwaya";
export const IMAMS = [
  ["نافع", [["qalun", "قالون"], ["warsh", "ورش"]]],
  ["ابن كثير", [["bazzi", "البزي"], ["qunbul", "قنبل"]]],
  ["أبو عمرو", [["duri", "الدوري"], ["susi", "السوسي"]]],
  ["ابن عامر", [["hisham", "هشام"], ["dhakwan", "ابن ذكوان"]]],
  ["عاصم", [["shubah", "شعبة"], ["hafs", "حفص"]]],
  ["حمزة", [["khalaf", "خلف"], ["khallad", "خلاد"]]],
  ["الكسائي", [["harith", "أبو الحارث"], ["durik", "الدوري"]]],
  ["أبو جعفر", [["wardan", "ابن وردان"], ["jammaz", "ابن جماز"]]],
  ["يعقوب", [["ruwais", "رويس"], ["rawh", "روح"]]],
  ["خلف العاشر", [["ishaq", "إسحاق"], ["idris", "إدريس"]]],
];
const NAMES = Object.fromEntries(IMAMS.flatMap(([, rs]) => rs));
export const riwayaName = r => NAMES[r] || "حفص";
const CAT_LEGEND = [["#D1203A", "فرش"], ["#E86A00", "همز ونقل"], ["#6D28D9", "إمالة"], ["#C026D3", "تقليل"], ["#1D63ED", "صلة"], ["#0E9F8E", "مدّ"], ["#15A34A", "إدغام"], ["#8B5E34", "سكت"]];

let current = "hafs";
try { const v = localStorage.getItem(KEY); if (v && NAMES[v]) current = v; } catch {}
export const riwaya = () => current;
const engineFor = r => (r === "hafs" ? "qcf" : "digitalkhatt");

export async function setRiwaya(r) {
  if (!NAMES[r] || r === current) return;
  current = r;
  try { localStorage.setItem(KEY, r); } catch {}
  document.documentElement.dataset.riwaya = r;
  for (const b of document.querySelectorAll(".riwaya-btn")) b.innerHTML = label(r);
  if (activeEngineId() === engineFor(r)) await refreshEngine();
  else await setActiveEngine(engineFor(r));
}

/** يُستدعى عند الإقلاع بعد تسجيل المحرّكين. */
export function initRiwaya() {
  document.documentElement.dataset.riwaya = current;
  selectEngineAtBoot(engineFor(current));
}

const label = r => `برواية ${riwayaName(r)}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;

onPageHeader(meta => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "riwaya-btn";
  b.setAttribute("aria-label", "اختيار الرواية");
  b.innerHTML = label(current);
  b.addEventListener("click", e => { e.stopPropagation(); openPicker(); });
  // بين اسم السورة والجزء
  const links = meta.querySelectorAll(".page-meta-link");
  if (links.length >= 2) meta.insertBefore(b, links[1]); else meta.appendChild(b);
});

function openPicker() {
  if (document.querySelector(".riwaya-sheet")) return;
  const scrim = document.createElement("div");
  scrim.className = "riwaya-scrim";
  const sheet = document.createElement("div");
  sheet.className = "riwaya-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "القراءات العشر");
  sheet.innerHTML = `<div class="rs-grip"></div><div class="rs-head"><h2>القراءات العشر</h2><span>الإمام وراوياه</span></div>
    ${IMAMS.map(([imam, rs]) => `<div class="rs-row"><span class="rs-imam">${imam}</span>${rs.map(([k, n]) => `<button type="button" class="rs-r${k === current ? " on" : ""}" data-r="${k}">${n}</button>`).join("")}</div>`).join("")}
    <div class="rs-legend">${CAT_LEGEND.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join("")}</div>`;
  const close = () => { scrim.remove(); sheet.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") close(); };
  scrim.addEventListener("click", close);
  sheet.addEventListener("click", e => {
    const b = e.target.closest("[data-r]");
    if (!b) return;
    close();
    setRiwaya(b.dataset.r);
  });
  document.addEventListener("keydown", onKey);
  document.body.append(scrim, sheet);
  sheet.querySelector(".rs-r.on")?.focus();
}
