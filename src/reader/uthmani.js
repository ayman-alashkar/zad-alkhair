/* ---------- نص المصحف بالرسم العثماني للنسخ ونتائج البحث ----------
   الخطوط تعرض الصفحة كما في المصحف، لكن النص المرافق لكلماتها إملاء مبسّط، وفي بعضه
   بقايا رموز (&#1621; و#1969). فما يُنسخ أو يُقرأ نصًّا يُؤخذ من نص مشروع تنزيل العثماني
   (data/quran-uthmani/، يولّده scripts/build-quran-uthmani.cjs)، وتبقى مطابقة البحث على المبسّط.
   يُحمَّل ملف السورة عند الضغط على آية، فيكون جاهزًا عند «نسخ»، ويُحفظ مع حزمة التفسير دون اتصال. */
const UTHMANI_BASE="/data/quran-uthmani/";
const uthmaniSurahs=new Map(),uthmaniReady=new Map();
function uthmaniLoad(s){
  s=Number(s);
  if(!Number.isInteger(s)||s<1||s>114)return Promise.resolve(null);
  if(!uthmaniSurahs.has(s)){
    const job=fetch(`${UTHMANI_BASE}${pad3(s)}.json`,{cache:"force-cache"})
      .then(response=>response.ok?response.json():null)
      .then(data=>Array.isArray(data?.verses)?data.verses:null)
      .catch(()=>null)
      .then(verses=>{
        if(verses)uthmaniReady.set(s,verses);
        else uthmaniSurahs.delete(s);
        return verses;
      });
    uthmaniSurahs.set(s,job);
  }
  return uthmaniSurahs.get(s);
}
/* ملف تنزيل يبدأ الآية الأولى من كل سورة بالبسملة، والبسملة آية من الفاتحة وحدها. */
function uthmaniPick(verses,s,a){
  const text=verses?.[a-1];
  if(!text)return null;
  if(a!==1||s===1||s===9)return text;
  const words=text.split(" ");
  return words[0].replace(/[ً-ْ]/g,"")==="بسم"?words.slice(4).join(" "):text;
}
/* الآية إن كان ملف سورتها قد وصل، وإلا null (لا ينتظر). */
function uthmaniVerseNow(k){
  const v=verseParts(k);
  return uthmaniPick(uthmaniReady.get(v.s),v.s,v.a);
}
async function uthmaniVerse(k){
  const v=verseParts(k);
  return uthmaniPick(await uthmaniLoad(v.s),v.s,v.a);
}
/* النص المبسّط حين لا يتوفر العثماني: تُفكّ الرموز الرقمية، و#1969 علامة السجدة. */
function cleanSimpleQuranText(text){
  return String(text||"").replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code))).replace(/\s*#1969\b/g," ۩").replace(/\s{2,}/g," ").trim();
}
