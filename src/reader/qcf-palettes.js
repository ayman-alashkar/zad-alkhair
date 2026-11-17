/* ---------- ألوان مصحف QCF V4 ----------
   خط كل صفحة ملوّن (COLR/CPAL)، فلون الحرف من مجموعة ألوان الخط لا من color.
   لكل صفحة تُعرَّف عند تحميل خطها ست مجموعات: التلاوة ولفظ الجلالة والتجويد، نهارًا وليلًا.
   كل مجموعة تكتب ألوان الفهارس الستة عشر كلها، فلا تعتمد على ألوان الخط الأصلية:
   0 الحبر، 1 و2 و15 ما لا يُلفظ، 3 مدّ لازم، 4 مدّ جائز، 5 مدّ حركتان، 6 غنّة، 7 تفخيم، 8 قلقلة،
   9 مدّ واجب، 10 إطار دائرة الآية، 11 تعبئة تاجيها، 12 تعبئتها، 13 رقم الآية، 14 مربعات الهامش (تُخفى).
   ألوان الحبر ورقم الآية ولفظ الجلالة هي --quran و--ayah-number و--red في styles.css. */
const QCF_INK={
  l:{ink:"#0B1611",ayah:"#634314",red:"#B95157"},
  d:{ink:"#FFF9EA",ayah:"#E4C980",red:"#D77B80"}
};
/* ألوان التجويد: ألوان دليل مصحف التجويد (دار المعرفة)، وفي الليل درجات متباعدة. */
const QCF_TAJWEED={
  l:{silent:"#9C9EA4",lazim:"#B2016B",jaiz:"#FD8014",madd2:"#FEB609",ghunna:"#05A54C",tafkhim:"#046D9C",qalqala:"#03ADF1",wajib:"#E8038C"},
  d:{silent:"rgba(255,249,234,.38)",lazim:"#C08CFF",jaiz:"#FF8838",madd2:"#FFE45C",ghunna:"#46D97F",tafkhim:"#6D9BFF",qalqala:"#5CE6F2",wajib:"#FF7AB8"}
};
/* mode: t تلاوة (لون واحد)، a لفظ الجلالة، j تجويد. */
function qcfPalette(theme,mode){
  const c=QCF_INK[theme],t=QCF_TAJWEED[theme];
  if(mode==="j")return [c.ink,t.silent,t.silent,t.lazim,t.jaiz,t.madd2,t.ghunna,t.tafkhim,t.qalqala,t.wajib,
    c.ayah,"transparent","transparent",c.ayah,"transparent",t.silent];
  const ink=mode==="a"?c.red:c.ink;
  return [...Array(10).fill(ink),c.ayah,"transparent","transparent",c.ayah,"transparent",ink];
}
const qcfPaletteStyle=document.createElement("style");
document.head.appendChild(qcfPaletteStyle);
function addQcfPalettes(fam){
  const n=fam.slice(7),page=`.page[data-qfont="${fam}"]`,css=[];
  for(const theme of ["l","d"])for(const mode of ["t","a","j"]){
    const colors=qcfPalette(theme,mode).map((x,i)=>i+" "+x).join(",");
    css.push(`@font-palette-values --q${n}${theme}${mode}{font-family:"${fam}";base-palette:0;override-colors:${colors}}`);
  }
  css.push(
    `${page} .word{font-palette:--q${n}lt}`,
    `${page} .word.allah{font-palette:--q${n}la}`,
    `html[data-theme="dark"] ${page} .word{font-palette:--q${n}dt}`,
    `html[data-theme="dark"] ${page} .word.allah{font-palette:--q${n}da}`,
    /* التجويد يغلب لون لفظ الجلالة، كما في مصحف التجويد. */
    `html[data-tajweed="on"] ${page} .word,html[data-tajweed="on"] ${page} .word.allah{font-palette:--q${n}lj}`,
    `html[data-theme="dark"][data-tajweed="on"] ${page} .word,html[data-theme="dark"][data-tajweed="on"] ${page} .word.allah{font-palette:--q${n}dj}`
  );
  qcfPaletteStyle.textContent+=css.join("\n")+"\n";
}

/* ---------- وضع التجويد ----------
   الإظهار صنف على <html> فقط: تتبدّل مجموعة الألوان، دون إعادة رسم ولا تحميل، ودون تغيّر الكلمات. */
const TAJWEED_KEY="zad:mushaf-tajweed";
/* دليل الأحكام: بطاقة تظهر مع أدوات القراءة ما دام التجويد ظاهرًا.
   المسمّيات والألوان كما في دليل مصحف التجويد (دار المعرفة)، عمودان: المدود، ثم أحكام الحروف. */
const TAJWEED_LEGEND=[
  ["المدود",[["tj8","مدّ ٦ حركات لزوماً"],["tj7","مدّ واجب ٤ أو ٥ حركات"],["tj6","مدّ ٢ أو ٤ أو ٦ جوازاً"],["tj5","مدّ حركتان"]]],
  ["أحكام الحروف",[["tj1","إخفاء، ومواقع الغنّة (حركتان)"],["tj3","إدغام، وما لا يُلفظ"],["tj2","تفخيم"],["tj4","قلقلة"]]]
];
function setTajweed(on,announce=false){
  document.documentElement.dataset.tajweed=on?"on":"off";
  storageSet(TAJWEED_KEY,on?"1":"0");
  const btn=document.getElementById("tajweedBtn");
  if(btn){btn.setAttribute("aria-pressed",String(on));btn.classList.toggle("active",on)}
  if(announce)showToast(on?"تم تفعيل وضع التجويد":"تم إيقاف وضع التجويد");
}
{
  const btn=document.getElementById("tajweedBtn");
  const strip=document.getElementById("tajweedStrip");
  if(strip)strip.innerHTML=TAJWEED_LEGEND.map(([title,items])=>`<div class="tj-col"><b>${title}</b>${items.map(([c,name])=>`<span><i class="tj-swatch ${c}"></i>${name}</span>`).join("")}</div>`).join("");
  if(btn){btn.hidden=false;btn.onclick=()=>setTajweed(document.documentElement.dataset.tajweed!=="on",true)}
  setTajweed(storageGet(TAJWEED_KEY,"0")==="1");
}
