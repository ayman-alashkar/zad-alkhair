/* شكل الكلمة بالرواية كما في مصحف القراءات المرسوم (DigitalKhatt)، صورة SVG.
   الأشكال مرسومة مسبقًا في ملف الصفحة (cards)، ومسارات الحروف في meta.json.
   إن لم تتوفر (قبل تنزيل حزمة القراءات) يُكتب الشكل نصًّا بخط Amiri، والحرف المختلف ملوّن. */
import { drawnPage, drawnMeta } from "./data.mjs";

/* ألوان الخلاف من متغيرات --c1…--c8 (نفس ألوان المصحف، ولكل منها قيمة للوضع الليلي في style.mjs). */
const CAT_INDEX = { imala: 1, taqlil: 2, silah: 3, madd: 4, hamz: 5, naql: 5, idgham: 6, sakt: 7, farsh: 8 };
export const CAT_COLORS = Object.fromEntries(Object.entries(CAT_INDEX).map(([k, i]) => [k, `var(--c${i})`]));
const SVGNS = "http://www.w3.org/2000/svg";

/** segs: [[نص، فئة أو null]…] كما في بيانات القراءات بعد فكّها. */
export async function formElement(page, segs, { ink = "currentColor", height = 40 } = {}) {
  const [P, M] = await Promise.all([drawnPage(page), drawnMeta()]);
  const shaped = P && P.cards && P.cards[JSON.stringify(segs)];
  if (shaped && M) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `${-shaped.n - 150} -1050 ${shaped.n + 300} 1500`);
    svg.setAttribute("aria-hidden", "true");
    svg.style.height = height + "px"; svg.style.width = "auto"; svg.style.overflow = "visible";
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("transform", "scale(1,-1)");
    for (let j = 0; j < shaped.t.length; j++) {
      const path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", M.glyphs[shaped.g[3 * j]] || "");
      path.setAttribute("transform", `translate(${shaped.g[3 * j + 1]},${shaped.g[3 * j + 2]})`);
      path.style.fill = shaped.c[j] ? `var(--c${shaped.c[j]})` : ink;
      g.appendChild(path);
    }
    svg.appendChild(g);
    return svg;
  }
  const span = document.createElement("span");
  span.className = "zc-form-text";
  for (const [text, cat] of segs) {
    const s = document.createElement("span");
    s.textContent = text;
    if (cat) s.style.color = CAT_COLORS[cat] || "";
    span.appendChild(s);
  }
  return span;
}
