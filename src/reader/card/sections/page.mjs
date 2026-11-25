/* مستوى الصفحة والسورة: فوائد الصفحة، ومقاصد السورة، وعدد آياتها في المذاهب الستة. */
import { registerSection } from "../card.mjs";
import { fawaed, surahGoals, ayahCounts } from "../data.mjs";
import { esc, node, para, src, AR, surahName, RIWAYA_NAMES, SOURCE_CENTER } from "./util.mjs";

registerSection({
  id: "page-surah", level: "page", label: "الفوائد والمقاصد", order: 10,
  available: () => true,
  async render(ctx) {
    const [F, G, C, name] = await Promise.all([fawaed(ctx.page), surahGoals(ctx.surah), ayahCounts(ctx.surah, ctx.riwaya), surahName(ctx.surah)]);
    let html = "";
    if (F.length) html += `<div class="zc-h">من فوائد الصفحة ${AR(ctx.page)}</div><div class="zc-fawaed" style="display:flex;flex-direction:column;gap:6px">${F.map(f => para(esc(f), "فوائد الصفحة")).join("")}</div>`;
    if (G) html += `<div class="zc-h">مقاصد سورة ${esc(name)}</div>${para(esc(G), "مقاصد السورة")}`;
    if (C) {
      html += `<div class="zc-h">عدد آياتها</div><div class="zc-counts">${C.rows.map(r => `<div class="${r.code === C.riwaya.code ? "on" : ""}"><b>${AR(r.count)}</b>${esc(r.name)}</div>`).join("")}</div>`;
      html += `<div class="zc-sub" style="text-align:start">${esc(RIWAYA_NAMES[ctx.riwaya] || ctx.riwaya)} على العدّ ${esc(C.riwaya.name)}${C.riwaya.print ? "، كما في مصحف المجمع للرواية" : ""}: ${AR(C.riwaya.count)} آية</div>`;
    }
    html += src(`الفوائد والمقاصد من ${SOURCE_CENTER}، وعدد الآي من الموسوعة القرآنية ومصاحف المجمع`);
    return node(`<div style="display:contents">${html}</div>`);
  },
});
