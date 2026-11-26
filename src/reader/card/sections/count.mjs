/* عدّ الآي: يُفتح بالضغط على علامة آية مختلف فيها في مصحف الرواية (رأس آية زائد، أو موضع رأس
   آية عند حفص وحده). يبيّن من يعدّ الموضع من علماء العدد، ورقم الآية في الرواية وعند حفص. */
import { registerSection } from "../card.mjs";
import { headInfo, riwayaAudio } from "../data.mjs";
import { riwayaAyahNumber } from "../../riwaya-audio.mjs";
import { esc, node, para, AR, surahName, ayahLink, RIWAYA_NAMES } from "./util.mjs";

const SOURCE = "البيان في عدّ آي القرآن للداني، والموسوعة القرآنية، ومصاحف المجمع";
const join = list => list.length < 2 ? list.join("") : list.slice(0, -1).join("، ") + " و" + list[list.length - 1];

async function info(ctx) {
  const H = await headInfo(ctx.gi, ctx.riwaya, ctx.surah, ctx.ayah);
  if (!H) return null;
  const D = await riwayaAudio();
  const n = D && ctx.riwaya !== "hafs" ? riwayaAyahNumber(D, ctx.riwaya, ctx.surah, ctx.ayah) : ctx.ayah;
  return { ...H, n, name: RIWAYA_NAMES[ctx.riwaya] || ctx.riwaya };
}
function lines(H, ctx, sname) {
  const yes = H.madhhabs.filter(m => m.counts).map(m => m.name), no = H.madhhabs.filter(m => !m.counts).map(m => m.name);
  return {
    mine: H.counts ? `«${H.word}» رأس الآية ${AR(H.n)} من سورة ${sname} في رواية ${H.name}.` : `«${H.word}» ليست رأس آية في رواية ${H.name}، فتتصل بما بعدها.`,
    hafs: H.hafs ? `وهي عند حفص رأس الآية ${AR(ctx.ayah)}.` : "وليست رأس آية عند حفص.",
    why: `اختلف علماء العدد في هذا الموضع: يعدّه ${join(yes)}، ولا يعدّه ${join(no)}.`,
  };
}

registerSection({
  id: "ayah-count", level: "ayah", label: "عدّ الآي", title: "عدّ الآي", order: 50, nav: "ayah",
  async available(ctx) { return ctx.riwaya !== "hafs" && !!(await headInfo(ctx.gi, ctx.riwaya)); },
  source: () => SOURCE,
  async render(ctx) {
    const H = await info(ctx), sname = await surahName(ctx.surah), L = lines(H, ctx, sname);
    return node(`<div class="zc-stack">
      <div class="zc-word">${esc(H.word)}</div>
      ${para(esc(L.mine) + " " + esc(L.hafs), "عدّ الآي: الرواية")}
      ${para(esc(L.why), "عدّ الآي: المذاهب")}
      <div class="zc-counts">${H.madhhabs.map(m => `<div class="${m.mine ? "on" : ""}"><b>${m.counts ? "يعدّ" : "لا يعدّ"}</b>${esc(m.name)}</div>`).join("")}</div>
      <div class="ref">رواية ${esc(H.name)} على العدّ ${esc(H.madhhabs.find(m => m.mine).name)}${H.print ? "، كما في مصحف المجمع للرواية" : ""}.</div>
    </div>`);
  },
  async shareText(ctx) {
    const H = await info(ctx), sname = await surahName(ctx.surah), L = lines(H, ctx, sname);
    return `عدّ الآي (سورة ${sname})\n${L.mine} ${L.hafs}\n${L.why}\nالمصدر: ${SOURCE}\n${ayahLink(ctx.surah, ctx.ayah)}`;
  },
});
