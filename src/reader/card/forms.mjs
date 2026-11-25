/* شكل الكلمة بالرواية كما في مصحف القراءات المرسوم (DigitalKhatt)، صورة SVG.
   الأشكال مرسومة مسبقًا في ملف الصفحة (cards)، ومسارات الحروف في meta.json.
   إن لم تتوفر (قبل تنزيل حزمة القراءات) يُكتب الشكل نصًّا بخط Amiri، والحرف المختلف ملوّن. */
import { drawnPage, drawnMeta } from "./data.mjs";

export const CAT_COLORS = { imala: "#6D28D9", taqlil: "#C026D3", silah: "#1D63ED", madd: "#0E9F8E", hamz: "#E86A00", naql: "#E86A00", idgham: "#15A34A", sakt: "#8B5E34", farsh: "#D1203A" };
const COL_BY_INDEX = [null, "#6D28D9", "#C026D3", "#1D63ED", "#0E9F8E", "#E86A00", "#15A34A", "#8B5E34", "#D1203A"];
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
      path.setAttribute("fill", COL_BY_INDEX[shaped.c[j]] || ink);
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
