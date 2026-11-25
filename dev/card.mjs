/* صفحة تجربة بطاقة الكلمة وحدها، قبل تركيبها في القارئ. */
import { openCard } from "/src/reader/card/index.mjs";
const R = {qalun:"قالون",warsh:"ورش",bazzi:"البزي",qunbul:"قنبل",duri:"الدوري",susi:"السوسي",hisham:"هشام",dhakwan:"ابن ذكوان",shubah:"شعبة",hafs:"حفص",khalaf:"خلف",khallad:"خلاد",harith:"أبو الحارث",durik:"الدوري (الكسائي)",wardan:"ابن وردان",jammaz:"ابن جماز",ruwais:"رويس",rawh:"روح",ishaq:"إسحاق",idris:"إدريس"};
const sel = document.getElementById("riwaya");
for (const [k, v] of Object.entries(R)) sel.add(new Option(v, k, k === "hafs", k === "hafs"));
const pageIn = document.getElementById("page"), box = document.getElementById("words");
async function show(p) {
  const d = await (await fetch(`/data/words/pages/${String(p).padStart(3, "0")}.json`)).json();
  box.replaceChildren();
  for (const [gi, text] of d.words) {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = () => openCard({ page: p, gi, riwaya: sel.value }, {
      onTool: (kind, ctx) => alert(`${kind} — ${ctx.gi}`),
      onNavigate: (page, g) => { pageIn.value = page; show(page); },
    });
    box.append(b, " ");
  }
}
pageIn.onchange = () => show(+pageIn.value);
show(11);
