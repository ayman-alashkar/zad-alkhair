/* محرّك QCF V4 لرواية حفص: يبني أسطر الصفحة من بيانات data/qcf-v4، كل كلمة محرف
   من خط الصفحة. واجهة المحرّكات في page-engine.mjs؛ هذا الملف يبني الأسطر فقط.
   env يمرّره المصحف: surahName، وheaderGlyph، وwordGi (اختياري).
   علامات العناصر كما تطلبها ayah-marks.mjs: data-ayah على جامع كلمات الآية في السطر
   (.verse-segment) وعلى كل كلمة، وdata-gi على الكلمة حين يعيد env.wordGi(page, line, word)
   رقمها الثابت في الفهرس الموحّد. */

/* لفظ الجلالة يُلوَّن بصنف allah */
const normalize=s=>(s||"").replace(/[\u064B-\u065F\u0670\u06D6-\u06EDـ]/g,"");
function isAllah(t){const n=normalize(t);return n.includes("الله")||n.includes("لله")}

function groupLineWords(words){
  const groups=[];let g=null;
  for(const w of words){
    const key=w.verse_key||null;
    if(key && g && g.key===key){g.words.push(w)}
    else {g={key,words:[w]};groups.push(g)}
  }
  return groups;
}

function makeWord(w,key,gi){
  const s=document.createElement("span");
  if(key)s.dataset.ayah=key;
  if(Number.isInteger(gi))s.dataset.gi=String(gi);
  s.className="word"+(w.type==="end"?" end":"")+(isAllah(w.text)?" allah":"");
  s.textContent=w.char;
  s.dataset.text=w.text||"";
  return s;
}

function makeVerseSegment(group,env,page,lineNo){
  const seg=document.createElement("span");
  seg.className="verse-segment";
  if(group.key)seg.dataset.ayah=group.key;
  for(const w of group.words)seg.appendChild(makeWord(w,group.key,env.wordGi?.(page,lineNo,w)));
  return seg;
}

function surahIdForHeader(data,lineIndex){
  for(let i=lineIndex+1;i<(data.lines||[]).length;i++){
    for(const w of (data.lines[i].words||[])){
      if(w.verse_key){const n=Number(String(w.verse_key).split(":")[0]);if(n)return n}
    }
  }
  const fallback=Number(data.lines?.[lineIndex]?.words?.[0]?.sura||data.lines?.[lineIndex]?.words?.[0]?.surah||0);
  return fallback||Number(data.surahs?.[0]?.id||0);
}

/* يملأ host (عنصر .mushaf) بأسطر الصفحة */
export function qcfRenderLines(host,data,env){
  for(let lineIndex=0;lineIndex<data.lines.length;lineIndex++){
    const line=data.lines[lineIndex];
    const lineEl=document.createElement("div");
    lineEl.className="line";
    const inner=document.createElement("div");
    inner.className="line-inner";

    const first=line.words[0];
    inner.style.fontFamily=`"${data.font||"QCF4_Hafs_01"}"`;
    if(first?.type==="surah_header"){
      const sid=surahIdForHeader(data,lineIndex);
      inner.classList.add("surah-line");
      inner.style.fontFamily='"QCF4_QBSML"';
      const glyph=env.headerGlyph(sid);  /* null حتى يجهز خط العناوين */
      if(glyph){
        inner.classList.add("banner-ready");
        const metric=document.createElement("span");
        metric.className="surah-metric";metric.textContent=first.char;
        const banner=document.createElement("canvas");
        banner.className="surah-banner";banner.dataset.glyph=glyph;
        inner.append(metric,banner);
      }else{
        inner.textContent=first.char;
      }
      inner.setAttribute("aria-label",`سورة ${env.surahName(sid)}`);
      lineEl.appendChild(inner);host.appendChild(lineEl);continue;
    }
    if(first?.type==="bismillah"){
      inner.classList.add("bismillah-line");
      // QCF4 encodes the Bismillah with the dedicated Hafs_01 glyph font.
      // Do not inherit the current page font (e.g. Hafs_47), otherwise the
      // glyph becomes blank on later pages. The source data itself omits the
      // Bismillah before At-Tawbah, so the Mushaf convention is preserved.
      inner.style.fontFamily=`"${first.font||"QCF4_Hafs_01"}"`;
      const originalBasm=document.createElement("span");
      originalBasm.className="bismillah-original";
      originalBasm.textContent=first.char;
      const desktopBasm=document.createElement("span");
      desktopBasm.className="bismillah-desktop";
      /* محرف مثبّت من منطقة الاستعمال الخاص، فيلزمه خطّه صراحةً. لو ورث خط
         الصفحة (Hafs_47 مثلًا) لخرج فارغًا، وهي العلّة التي عولجت أعلاه
         للبسملة الأصلية ولم تُعالَج لهذه. */
      desktopBasm.style.fontFamily='"QCF4_Hafs_01"';
      desktopBasm.textContent="";
      inner.append(originalBasm,desktopBasm);
      lineEl.appendChild(inner);host.appendChild(lineEl);continue;
    }

    for(const group of groupLineWords(line.words)) inner.appendChild(makeVerseSegment(group,env,data.page,lineIndex+1));
    lineEl.appendChild(inner);host.appendChild(lineEl);
  }
}
