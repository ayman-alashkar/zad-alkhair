/* الرواية المختارة في المصحف، وزرّها في منتصف رأس الصفحة، ونافذة اختيارها.
   حفص يرسمه محرّك QCF، وكل رواية أخرى محرّك DigitalKhatt على الصفحة نفسها.
   الاختيار محفوظ في المتصفح (zad:riwaya). */
import { onPageHeader, setActiveEngine, activeEngineId, refreshEngine, selectEngineAtBoot } from "./page-engine.mjs";
import { reading } from "./reader-state.mjs";

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
const CAT_LEGEND = [["farsh", "#D1203A", "فرش"], ["hamz", "#E86A00", "همز ونقل"], ["imala", "#6D28D9", "إمالة"], ["taqlil", "#C026D3", "تقليل"], ["silah", "#1D63ED", "صلة"], ["madd", "#0E9F8E", "مدّ"], ["idgham", "#15A34A", "إدغام"], ["sakt", "#8B5E34", "سكت"]];
const MARK_LEGEND = [["u", "أداء"], ["wu", "عند الوقف"], ["ap", "رأس آية زائد"], ["ag", "رأس آية عند حفص وحده"]];

/* دليل الألوان لصفحة المصحف الحالية (كما في النموذج): لكل نوع عدد كلماته في الصفحة، وعلامات
   الآي الزائدة والتي عند حفص وحده. لا يُذكر إلا ما في الصفحة. */
const pad3 = n => String(n).padStart(3, "0");
async function pageLegend(page, r) {
  if (r === "hafs") return '<div class="rs-hint">اختر رواية لإظهار ما تخالف فيه حفصًا</div>';
  let D = null;
  try { D = (await (await fetch(`/data/qiraat-mushaf/pages/${pad3(page)}.json`, { cache: "force-cache" })).json()).data; } catch {}
  if (!D) return "";
  const F = D.F[r] || [], S = D.S[r] || [], U = D.U[r] || [], W = D.W[r] || [], c = {};
  F.forEach(s => { if (s) new Set(s.map(x => (x[1] === "naql" ? "hamz" : x[1])).filter(Boolean)).forEach(k => (c[k] = (c[k] || 0) + 1)); });
  const am = Object.values(D.AM[r] || {}), n = {
    u: S.filter((v, i) => v && !F[i]).length, wu: W.filter(Boolean).length,
    ap: am.filter(a => a[2] === "+").length, ag: am.filter(a => a[2] === "-").length,
  };
  const other = U.filter((v, i) => v && !F[i]).length;
  const AR = x => String(x).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  const items = CAT_LEGEND.filter(([k]) => c[k]).map(([k, col, name]) => `<span><i style="background:${col}"></i>${name} ${AR(c[k])}</span>`)
    .concat(MARK_LEGEND.filter(([k]) => n[k]).map(([k, name]) => `<span><i class="${k}"></i>${name} ${AR(n[k])}</span>`));
  if (other) items.push(`<span><i style="background:#D1203A"></i>خلاف آخر ${AR(other)}</span>`);
  return items.length ? `<div class="rs-legend-h">في هذه الصفحة (${AR(page)})</div><div class="rs-legend">${items.join("")}</div>` : '<div class="rs-hint">لا خلاف في هذه الصفحة</div>';
}

/* «ألوان» أو «ألوان وتظليل» (الافتراضي كما في النموذج). */
const SHADE_KEY = "zad:qiraat-shade";
let shade = true;
try { shade = localStorage.getItem(SHADE_KEY) !== "0"; } catch {}
function setShade(on) {
  shade = on;
  document.documentElement.dataset.qshade = on ? "on" : "off";
  try { localStorage.setItem(SHADE_KEY, on ? "1" : "0"); } catch {}
}

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
  document.dispatchEvent(new CustomEvent("zad:riwaya", { detail: r }));
  if (activeEngineId() === engineFor(r)) await refreshEngine();
  else await setActiveEngine(engineFor(r));
}

/** يُستدعى عند الإقلاع بعد تسجيل المحرّكين. */
export function initRiwaya() {
  document.documentElement.dataset.riwaya = current;
  setShade(shade);
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
    <div class="rs-seg" role="group" aria-label="إظهار الخلاف">${[["0", "ألوان"], ["1", "ألوان وتظليل"]].map(([v, n]) => `<button type="button" data-shade="${v}" class="${(shade ? "1" : "0") === v ? "on" : ""}" aria-pressed="${(shade ? "1" : "0") === v}">${n}</button>`).join("")}</div>
    <div class="rs-legend-box"></div>`;
  pageLegend(reading.currentPage, current).then(html => { const box = sheet.querySelector(".rs-legend-box"); if (box) box.innerHTML = html; });
  const close = () => { scrim.remove(); sheet.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") close(); };
  scrim.addEventListener("click", close);
  sheet.addEventListener("click", e => {
    const sb = e.target.closest("[data-shade]");
    if (sb) {
      setShade(sb.dataset.shade === "1");
      for (const x of sheet.querySelectorAll("[data-shade]")) { const on = x === sb; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); }
      return;
    }
    const b = e.target.closest("[data-r]");
    if (!b) return;
    close();
    setRiwaya(b.dataset.r);
  });
  document.addEventListener("keydown", onKey);
  document.body.append(scrim, sheet);
  sheet.querySelector(".rs-r.on")?.focus();
}
