/* علامة الآية (كما في نموذج القراءات): تُفتح بالضغط المطوّل على أي علامة آية.
   رقم الآية في عدّ الرواية ورقمها عند حفص إن اختلف، وجملة تشرح العلامة الزائدة أو الباهتة،
   والمواضع قبلها في السورة التي غيّرت الرقم، وعدّ الرواية ومجموعه.
   بيانات العلامة على العلامة نفسها في المصحف (ctx.marker = {nr, nh, ty})، والمواضع وعدّ كل رواية
   في meta.json لمصحف القراءات (sdiff وcount). */
import { registerSection } from "../card.mjs";
import { drawnMeta } from "../data.mjs";
import { esc, node, para, AR, surahName, ayahLink, RIWAYA_NAMES } from "./util.mjs";

const SOURCE = "الموسوعة القرآنية عن «البيان» للداني و«الفرائد الحسان»، ومصاحف مجمع الملك فهد";
const clean = w => String(w).replace(/[ۖۗۚۛۙۘ]/g, "");

/* الجمل نفسها للعرض والمشاركة */
async function lines(ctx) {
  const { nr, nh, ty } = ctx.marker, r = ctx.riwaya;
  const M = r === "hafs" ? null : await drawnMeta();   // في حفص لا حاجة إلى ملف مصحف القراءات
  const nm = r === "hafs" ? "حفص" : (RIWAYA_NAMES[r] || r);
  const head = `سورة ${await surahName(ctx.surah)} · ${nr ? `الآية ${AR(nr)}` : "ليست رأس آية"}`;
  const out = [], prev = [];
  if (r === "hafs") out.push("عدّ حفص: الكوفي (٦٢٣٦ آية).");
  else {
    if (ty === "+") out.push(`هنا رأس آية عند ${nm}، وليس رأس آية عند حفص.`);
    else if (ty === "-") out.push(`هنا رأس الآية ${AR(nh)} عند حفص، وليس رأس آية عند ${nm}؛ الآية عنده تكمل بعده.`);
    else if (nr !== nh) out.push(`هي الآية ${AR(nh)} عند حفص.`);
    else out.push(`رقمها عند ${nm} وحفص واحد.`);
    const diffs = ((M && M.sdiff[r] || {})[ctx.surah] || []).filter(d => d[0] < ctx.gi);
    if (nr && nr !== nh) for (const [, h, w, t] of diffs) prev.push(`«${clean(w)}» (الآية ${AR(h)} عند حفص): ${t === "+" ? "رأس آية عنده" : "ليست رأس آية عنده"}`);
    out.push(`عدّ ${nm}: ${M ? M.count[r] : ""}.`);
  }
  return { head, out, prev };
}

registerSection({
  id: "ayah-count", level: "ayah", label: "علامة الآية", title: "علامة الآية", order: 50, nav: "none",
  available: ctx => !!ctx.marker,
  source: () => SOURCE,
  async render(ctx) {
    const L = await lines(ctx);
    const [first, ...rest] = L.out, last = rest.pop();
    let html = `<div class="ref">${esc(L.head)}</div>${para(esc(first), "علامة الآية")}`;
    for (const t of rest) html += para(esc(t), "علامة الآية");
    if (L.prev.length) html += `<div class="zc-h">سبب اختلاف الرقم عن حفص في السورة قبل هذا الموضع</div><ul class="zc-list" data-report="علامة الآية: مواضع الخلاف قبلها">${L.prev.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
    if (last) html += para(esc(last), "علامة الآية: عدّ الرواية");
    return node(`<div class="zc-stack">${html}</div>`);
  },
  async shareText(ctx) {
    const L = await lines(ctx);
    return [L.head, ...L.out.slice(0, -1), ...L.prev.map(t => "• " + t), ...L.out.slice(-1), `المصدر: ${SOURCE}`, ayahLink(ctx.surah, ctx.ayah)].filter(Boolean).join("\n");
  },
});
