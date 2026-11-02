function validateStaticData(){
  if(TAFSIR_DATASET.surahs!==114||TAFSIR_DATASET.ayahs!==6236||TAFSIR_DATASET.fadl!==60)throw new Error("tafsir config integrity");
  validateReciterConfig();
  if(SURAH_HEADER_GLYPHS.length!==115)throw new Error("surah header map integrity");
  if(JUZ_PAGES.length!==30)throw new Error("juz page map integrity");
  if(LOCAL_HIZB_QUARTERS.length!==240)throw new Error("rub al-hizb map integrity");
  let previousEnd=0;
  for(const [from,to] of JUZ_PAGES){
    if(from!==previousEnd+1||to<from||to>TOTAL_PAGES)throw new Error("juz page continuity");
    previousEnd=to;
  }
  if(previousEnd!==TOTAL_PAGES)throw new Error("juz page coverage");
  let previousPage=0,hizbStarts=0,hizbHalves=0;
  for(let i=0;i<LOCAL_HIZB_QUARTERS.length;i++){
    const [surah,ayah,page]=LOCAL_HIZB_QUARTERS[i];
    if(surah<1||surah>114||ayah<1||page<1||page>TOTAL_PAGES||page<previousPage)throw new Error("rub al-hizb data integrity");
    if(i%4===0)hizbStarts++;
    if(i%4===2)hizbHalves++;
    previousPage=page;
  }
  if(hizbStarts!==60||hizbHalves!==60)throw new Error("hizb milestone integrity");
}
function chapterMapFromMeta(meta){
  if(!Array.isArray(meta?.chapters)||meta.chapters.length!==114)return null;
  const map=new Map(meta.chapters.map(x=>[Number(x?.id),x]));
  if(map.size!==114)return null;
  for(let id=1;id<=114;id++){
    const ch=map.get(id),from=Number(ch?.pages?.[0]),to=Number(ch?.pages?.[1]),verses=Number(ch?.verses_count);
    if(Number(ch?.id)!==id||!ch?.name_arabic||from<1||to<from||to>TOTAL_PAGES||verses<1)return null;
  }
  for(const [surah,ayah] of LOCAL_HIZB_QUARTERS)if(ayah>Number(map.get(surah)?.verses_count||0))return null;
  return map;
}
function validateMetadataConsistency(){
  const map=chapterMapFromMeta(qcfMeta);
  if(!map)throw new Error("chapter metadata integrity");
  chapterMap=map;
}
function buildPageShells(){
  track.innerHTML=Array.from({length:TOTAL_PAGES},(_,i)=>`<section class="page" data-page="${i+1}"></section>`).join("");
  track.style.width=(TOTAL_PAGES*100)+"vw";
}
async function loadQcfMeta(){
  if(qcfMeta)return qcfMeta;
  const cached=storageJsonGet(STORAGE_KEYS.meta,null),cachedMap=chapterMapFromMeta(cached);
  if(cachedMap){qcfMeta=cached;chapterMap=cachedMap;return qcfMeta}
  const r=await fetch(INDEX_URL,{cache:"force-cache"});if(!r.ok)throw new Error("qcf index");
  const fresh=await r.json(),freshMap=chapterMapFromMeta(fresh);
  if(!freshMap)throw new Error("invalid qcf index");
  qcfMeta=fresh;chapterMap=freshMap;storageJsonSet(STORAGE_KEYS.meta,qcfMeta);
  return qcfMeta;
}
async function loadVerseIndex(){
  if(verseIndex)return verseIndex;
  const cached=storageJsonGet(STORAGE_KEYS.verseIndex,null);
  if(cached&&typeof cached==="object"&&!Array.isArray(cached)){verseIndex=cached;return verseIndex}
  const r=await fetch(VERSE_INDEX_URL,{cache:"force-cache"});if(!r.ok)throw new Error("verse index");
  const fresh=await r.json();
  if(!fresh||typeof fresh!=="object"||Array.isArray(fresh))throw new Error("invalid verse index");
  verseIndex=fresh;storageJsonSet(STORAGE_KEYS.verseIndex,verseIndex);
  return verseIndex;
}
async function ensureQcfFont(name){
  if(!name||name==="QCF4_QBSML")return;
  if(qcfFontLoads.has(name))return qcfFontLoads.get(name);
  // Do not use document.fonts.check() for undeclared QCF families:
  // browsers may report fallback availability as true and skip the real font.
  const job=(async()=>{
    const face=new FontFace(name,`url("${QCF_FONT_BASE}${name}_W.woff2") format("woff2")`);
    const loaded=await face.load();
    document.fonts.add(loaded);
    return loaded;
  })().catch(err=>{qcfFontLoads.delete(name);throw err});
  qcfFontLoads.set(name,job);
  return job;
}
function showToast(m){toast.textContent=m;toast.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove("show"),1450)}

/* Android/PWA back policy. The first Back at the real app boundary removes
   the synthetic guard and shows the hint. We intentionally leave the guard
   removed for 2.2 s, so a second physical Back is handled natively by
   Android/Chrome instead of trying to close a PWA from JavaScript. */
const readerGuardToken=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
let readerBackGuardReady=false,readerExitPressedAt=0,readerReturnToQuranHome=false,readerNativeBack=false,readerExitRearmTimer=null;
function sameZadReferrer(){
  if(!document.referrer)return false;
  try{
    const ref=new URL(document.referrer),here=new URL(location.href);
    const base=here.pathname.replace(/[^/]*$/,"" );
    return ref.origin===here.origin&&ref.pathname.startsWith(base);
  }catch(_){return false}
}
const readerHasAppParent=sameZadReferrer();
function armReaderBackGuard(){
  clearTimeout(readerExitRearmTimer);
  try{
    if(history.state?.zadReaderGuard===readerGuardToken){readerBackGuardReady=true;return}
    history.pushState({...history.state,zadReaderGuard:readerGuardToken},"",location.href);
    readerBackGuardReady=true;
  }catch(_){ }
}
function closeTopReaderSurface(){
  const sheets=[...document.querySelectorAll(".backdrop")];
  if(sheets.length){sheets[sheets.length-1].remove();return true}
  if(menu?.classList?.contains("show")){closeMenu();return true}
  const panel=document.querySelector(".quran-index");
  if(panel&&panel.dataset.homeMode!=="1"){
    const resumeBtn=panel.querySelector('[data-hub-action="resume"]');
    if(resumeBtn)resumeBtn.click();else panel.remove();
    return true
  }
  return false;
}
function confirmReaderExitOrLeave(){
  readerExitPressedAt=Date.now();
  showToast("اضغط الرجوع مرة أخرى للخروج");
  clearTimeout(readerExitRearmTimer);
  readerExitRearmTimer=setTimeout(()=>{readerExitPressedAt=0;armReaderBackGuard()},2200);
}
window.addEventListener("popstate",()=>{
  if(readerNativeBack){readerNativeBack=false;return}
  readerBackGuardReady=false;
  if(closeTopReaderSurface()){armReaderBackGuard();return}
  const homePanel=document.querySelector('.quran-index[data-home-mode="1"]');
  if(homePanel){
    if(readerHasAppParent){readerNativeBack=true;history.back();return}
    if(readerEntryParams().fromZad){location.href=zadReturnUrl();return}
    confirmReaderExitOrLeave();return;
  }
  if(readerReturnToQuranHome){
    openQuranIndex("s",{home:true});
    armReaderBackGuard();return;
  }
  if(readerHasAppParent){readerNativeBack=true;history.back();return}
  confirmReaderExitOrLeave();
});
queueMicrotask(armReaderBackGuard);
function showNotice(m){notice.textContent=m;notice.classList.add("show");clearTimeout(notice._t);notice._t=setTimeout(()=>notice.classList.remove("show"),1500)}
function hideTools(){
  clearTimeout(toolsTimer);
  document.body.classList.add("hidden-tools");
}
function showToolsFor(ms=2800){
  clearTimeout(toolsTimer);
  document.body.classList.remove("hidden-tools");
  toolsTimer=setTimeout(()=>{
    if(!menu.classList.contains("show")&&!document.querySelector(".backdrop"))hideTools();
  },ms);
}
function normalizeArabic(s){return (s||"").replace(/[\u064B-\u065F\u0670\u06D6-\u06EDـ]/g,"")}
function isAllah(t){const n=normalizeArabic(t);return n.includes("الله")||n.includes("لله")}

async function fetchPage(p){
  const r=await fetch(PAGE_BASE+String(p).padStart(3,"0")+".json",{cache:"force-cache"});
  if(!r.ok)throw new Error("page "+p);
  const data=await r.json();
  if(Number(data?.page)!==Number(p)||!Array.isArray(data?.lines))throw new Error("invalid page "+p);
  return data;
}
function touchPageData(p,data){
  pages.delete(p);pages.set(p,data);
  return data;
}
function prunePageDataCache(center=currentPage){
  if(pages.size<=PAGE_DATA_CACHE_LIMIT)return;
  const protectedPages=new Set([center-2,center-1,center,center+1,center+2].filter(x=>x>=1&&x<=TOTAL_PAGES));
  for(const p of [...pages.keys()]){
    if(pages.size<=PAGE_DATA_CACHE_LIMIT)break;
    if(!protectedPages.has(p))pages.delete(p);
  }
}
async function getPageData(p){
  p=Number(p);if(!Number.isFinite(p)||p<1||p>TOTAL_PAGES)return null;
  if(pages.has(p))return touchPageData(p,pages.get(p));
  if(pageDataLoads.has(p))return pageDataLoads.get(p);
  const job=fetchPage(p).then(data=>{touchPageData(p,data);prunePageDataCache();return data}).finally(()=>pageDataLoads.delete(p));
  pageDataLoads.set(p,job);return job;
}
function surahIdFromPageData(data){
  const direct=Number(data?.surahs?.[0]?.id||data?.surahs?.[0]?.number||data?.surahs?.[0]?.surah_number);
  if(direct)return direct;
  const name=data?.surahs?.[0]?.name_arabic;
  if(name){for(const [id,ch] of chapterMap)if(ch?.name_arabic===name)return Number(id)}
  for(const line of data?.lines||[])for(const w of line.words||[])if(w.verse_key)return Number(w.verse_key.split(":")[0]);
  return 1;
}
function surahIdFromMetaPage(p){
  p=Number(p);let best=1,bestStart=0;
  for(const [id,ch] of chapterMap){
    const from=Number(ch?.pages?.[0]),to=Number(ch?.pages?.[1]);
    if(from<=p&&p<=to&&from>=bestStart){best=Number(id);bestStart=from}
  }
  return best;
}
async function pageDisplayInfo(p){
  p=Number(p);let data=pages.get(p)||null;
  if(!data)try{data=await getPageData(p)}catch(_){}
  const sid=data?surahIdFromPageData(data):surahIdFromMetaPage(p);
  return {page:p,juz:juzForPage(p),surah:sid,sname:chapterMap.get(sid)?.name_arabic||data?.surahs?.[0]?.name_arabic||""};
}
async function ensurePage(p){
  p=Number(p);if(!Number.isFinite(p)||p<1||p>TOTAL_PAGES)return null;
  const root=document.querySelector(`.page[data-page="${p}"]`);
  if(root?.dataset.loaded==="1"&&pages.has(p))return touchPageData(p,pages.get(p));
  if(pageLoads.has(p))return pageLoads.get(p);
  const job=(async()=>{
    const data=await getPageData(p);
    await ensureQcfFont(data.font);renderPage(data);return data;
  })().finally(()=>pageLoads.delete(p));
  pageLoads.set(p,job);return job;
}
async function prefetchAround(p){
  const jobs=[p-1,p+1].filter(x=>x>=1&&x<=TOTAL_PAGES).map(x=>ensurePage(x).catch(()=>null));
  await Promise.all(jobs);
}
function trimPageDom(center){
  document.querySelectorAll('.page[data-loaded="1"]').forEach(root=>{
    const p=Number(root.dataset.page);
    if(Math.abs(p-center)>2){root.innerHTML="";delete root.dataset.loaded;}
  });
  prunePageDataCache(center);
}
async function getVersePage(k){
  try{
    const idx=await loadVerseIndex(),p=Number(idx?.[k]?.page);
    return p>=1&&p<=TOTAL_PAGES?p:null;
  }catch(_){return null}
}

function groupLineWords(words){
  const groups=[];let g=null;
  for(const w of words){
    const key=w.verse_key||null;
    if(key && g && g.key===key){g.words.push(w)}
    else {g={key,words:[w]};groups.push(g)}
  }
  return groups;
}

function makeWord(w){
  const s=document.createElement("span");
  s.className="word"+(w.type==="end"?" end":"")+(isAllah(w.text)?" allah":"");
  s.textContent=w.char;
  s.dataset.text=w.text||"";
  return s;
}

function makeVerseSegment(group){
  const seg=document.createElement("span");
  seg.className="verse-segment";
  if(group.key)seg.dataset.key=group.key;
  for(const w of group.words)seg.appendChild(makeWord(w));
  if(group.key)bindSegment(seg);
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

function renderPage(data){
  const root=document.querySelector(`.page[data-page="${data.page}"]`);
  const surahId=surahIdFromPageData(data),juz=juzForPage(data.page);
  root.dataset.loaded="1";
  root.innerHTML=`<div class="page-meta"><button class="page-meta-link" type="button" data-index-tab="s" aria-label="فتح فهرس السور">سورة ${escapeHtml(chapterMap.get(surahId)?.name_arabic||data.surahs[0]?.name_arabic||"")}</button><button class="page-meta-link" type="button" data-index-tab="j" aria-label="فتح فهرس الأجزاء">الجزء ${ar(juz)}</button></div>
    <div class="page-stage ${data.page<=2?"special":"full"}"><div class="mushaf" id="mushaf-${data.page}"></div></div>
    <div class="page-no">${ar(data.page)}</div><div class="qcf-mark">QCF4 · 1441هـ</div>`;
  root.querySelectorAll(".page-meta-link").forEach(btn=>btn.addEventListener("click",e=>{
    e.stopPropagation();
    openQuranIndex(btn.dataset.indexTab||"s");
  }));

  const host=root.querySelector(".mushaf");
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
      const glyph=SURAH_HEADER_GLYPHS[sid];
      if(surahHeaderReady&&glyph){
        inner.classList.add("banner-ready");
        const metric=document.createElement("span");
        metric.className="surah-metric";metric.textContent=first.char;
        const banner=document.createElement("canvas");
        banner.className="surah-banner";banner.dataset.glyph=glyph;
        inner.append(metric,banner);
      }else{
        inner.textContent=first.char;
      }
      inner.setAttribute("aria-label",`سورة ${chapterMap.get(sid)?.name_arabic||""}`);
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

    for(const group of groupLineWords(line.words)) inner.appendChild(makeVerseSegment(group));
    lineEl.appendChild(inner);host.appendChild(lineEl);
  }

  if(selectedKey)root.querySelectorAll(`.verse-segment[data-key="${selectedKey}"]`).forEach(x=>x.classList.add("selected"));
  requestAnimationFrame(()=>fitPage(data.page));
}

function renderSurahHeaderCanvas(canvas,glyph){
  if(!canvas||!glyph)return;
  const sample=260;
  const probe=document.createElement("canvas").getContext("2d");
  probe.font=`${sample}px "QUL_SurahHeader"`;
  probe.textAlign="left";probe.textBaseline="alphabetic";
  const m=probe.measureText(glyph);
  const left=Number.isFinite(m.actualBoundingBoxLeft)?m.actualBoundingBoxLeft:0;
  const right=Number.isFinite(m.actualBoundingBoxRight)?m.actualBoundingBoxRight:m.width;
  const asc=Number.isFinite(m.actualBoundingBoxAscent)?m.actualBoundingBoxAscent:sample*.72;
  const desc=Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:sample*.18;
  const inkW=Math.max(1,left+right),inkH=Math.max(1,asc+desc);
  const pad=Math.max(5,Math.round(sample*.025));
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const cssW=inkW+pad*2,cssH=inkH+pad*2;
  canvas.width=Math.ceil(cssW*dpr);canvas.height=Math.ceil(cssH*dpr);
  canvas.style.aspectRatio=`${cssW}/${cssH}`;
  const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.font=`${sample}px "QUL_SurahHeader"`;
  ctx.textAlign="left";ctx.textBaseline="alphabetic";
  // Draw the ready-made color glyph first, then tint only its visible pixels
  // to a calm theme-aware tone. This keeps the professional artwork while
  // avoiding the bright turquoise look in dark mode.
  ctx.fillText(glyph,pad+left,pad+asc);
  ctx.globalCompositeOperation="source-in";
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--surah-banner").trim()||"#55766D";
  ctx.fillRect(0,0,cssW,cssH);
  ctx.globalCompositeOperation="source-over";
}

/* نسبةُ الإطار الزخرفي للسورة، تُقاس من الخط لا من الرسم، فتُعرف قبل الملاءمة.
   الرسم نفسه يقع بعد تحديد المقياس، ولا يصلح مصدرًا لقرارٍ يسبقه. */
const surahAspectCache=new Map();
function surahGlyphAspect(glyph){
  if(surahAspectCache.has(glyph))return surahAspectCache.get(glyph);
  const sample=260;
  const probe=document.createElement("canvas").getContext("2d");
  probe.font=`${sample}px "QUL_SurahHeader"`;
  probe.textAlign="left";probe.textBaseline="alphabetic";
  const m=probe.measureText(glyph);
  const left=Number.isFinite(m.actualBoundingBoxLeft)?m.actualBoundingBoxLeft:0;
  const right=Number.isFinite(m.actualBoundingBoxRight)?m.actualBoundingBoxRight:m.width;
  const asc=Number.isFinite(m.actualBoundingBoxAscent)?m.actualBoundingBoxAscent:sample*.72;
  const desc=Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:sample*.18;
  const pad=Math.max(5,Math.round(sample*.025));
  const w=Math.max(1,left+right)+pad*2,h=Math.max(1,asc+desc)+pad*2;
  const aspect=w/h;
  /* لا يُخزَّن قياسٌ أُخذ قبل وصول الخط، وإلا ثبت الخطأ إلى آخر الجلسة.
     ويُسأل عن المحرف نفسه: الفحص بلا نصّ يجرّب محارف لاتينية لا وجود لها
     في خطّ العناوين، فيأتي الجواب بالنفي ولو كان الخط حاضرًا. */
  let ready=surahHeaderReady;
  try{if(ready&&document.fonts)ready=document.fonts.check(`${sample}px "QUL_SurahHeader"`,glyph)}catch(e){}
  if(ready&&aspect>0)surahAspectCache.set(glyph,aspect);
  return aspect;
}
