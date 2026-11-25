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
  const map=chapterMapFromMeta(reading.qcfMeta);
  if(!map)throw new Error("chapter metadata integrity");
  reading.chapterMap=map;
}
function buildPageShells(){
  track.innerHTML=Array.from({length:TOTAL_PAGES},(_,i)=>`<section class="page" data-page="${i+1}"></section>`).join("");
  track.style.width=(TOTAL_PAGES*100)+"vw";
}
async function loadQcfMeta(){
  if(reading.qcfMeta)return reading.qcfMeta;
  const cached=storageJsonGet(STORAGE_KEYS.meta,null),cachedMap=chapterMapFromMeta(cached);
  if(cachedMap){reading.qcfMeta=cached;reading.chapterMap=cachedMap;return reading.qcfMeta}
  const r=await fetch(INDEX_URL,{cache:"force-cache"});if(!r.ok)throw new Error("qcf index");
  const fresh=await r.json(),freshMap=chapterMapFromMeta(fresh);
  if(!freshMap)throw new Error("invalid qcf index");
  reading.qcfMeta=fresh;reading.chapterMap=freshMap;storageJsonSet(STORAGE_KEYS.meta,reading.qcfMeta);
  return reading.qcfMeta;
}
async function loadVerseIndex(){
  if(reading.verseIndex)return reading.verseIndex;
  const cached=storageJsonGet(STORAGE_KEYS.verseIndex,null);
  if(cached&&typeof cached==="object"&&!Array.isArray(cached)){reading.verseIndex=cached;return reading.verseIndex}
  const r=await fetch(VERSE_INDEX_URL,{cache:"force-cache"});if(!r.ok)throw new Error("verse index");
  const fresh=await r.json();
  if(!fresh||typeof fresh!=="object"||Array.isArray(fresh))throw new Error("invalid verse index");
  reading.verseIndex=fresh;storageJsonSet(STORAGE_KEYS.verseIndex,reading.verseIndex);
  return reading.verseIndex;
}
/* خط الصفحة: QCFV4_P005 ← /fonts/qcf-v4/p5.woff2 (الصفحة 328 وحدها بصيغة woff كما تنشرها QUL).
   الخط ملوّن، فلونه من مجموعة ألوانه لا من color: تُعرَّف مجموعات هذه الصفحة عند تحميل خطها. */
function qcfFontUrl(name){
  const n=Number(String(name).slice(7));
  return QCF_FONT_BASE+"p"+n+(n===328?".woff":".woff2")+MUSHAF_Q;
}
async function ensureQcfFont(name){
  if(!name||!/^QCFV4_P\d{3}$/.test(name))return;
  if(qcfFontLoads.has(name))return qcfFontLoads.get(name);
  // Do not use document.fonts.check() for undeclared QCF families:
  // browsers may report fallback availability as true and skip the real font.
  const job=(async()=>{
    const face=new FontFace(name,`url("${qcfFontUrl(name)}") format("${name==="QCFV4_P328"?"woff":"woff2"}")`);
    const loaded=await face.load();
    document.fonts.add(loaded);
    addQcfPalettes(name);
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
    return new URL(document.referrer).origin===location.origin;
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
  const homePanel=document.querySelector('.quran-index[data-home-mode="1"],.zad-listen');
  if(homePanel){
    if(readerHasAppParent){readerNativeBack=true;history.back();return}
    if(readerEntryParams().fromZad){location.href=zadReturnUrl();return}
    confirmReaderExitOrLeave();return;
  }
  if(readerReturnToListen){
    openListenPage();
    armReaderBackGuard();return;
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
  clearTimeout(reading.toolsTimer);
  document.body.classList.add("hidden-tools");
}
function showToolsFor(ms=2800){
  clearTimeout(reading.toolsTimer);
  document.body.classList.remove("hidden-tools");
  reading.toolsTimer=setTimeout(()=>{
    if(!menu.classList.contains("show")&&!document.querySelector(".backdrop"))hideTools();
  },ms);
}
function normalizeArabic(s){return (s||"").replace(/[\u064B-\u065F\u0670\u06D6-\u06EDـ]/g,"")}

async function fetchPage(p){
  const r=await fetch(PAGE_BASE+String(p).padStart(3,"0")+PAGE_SUFFIX,{cache:"force-cache"});
  if(!r.ok)throw new Error("page "+p);
  const data=await r.json();
  if(Number(data?.page)!==Number(p)||!Array.isArray(data?.lines))throw new Error("invalid page "+p);
  return data;
}
function touchPageData(p,data){
  reading.pages.delete(p);reading.pages.set(p,data);
  return data;
}
function prunePageDataCache(center=reading.currentPage){
  if(reading.pages.size<=PAGE_DATA_CACHE_LIMIT)return;
  const protectedPages=new Set([center-2,center-1,center,center+1,center+2].filter(x=>x>=1&&x<=TOTAL_PAGES));
  for(const p of [...reading.pages.keys()]){
    if(reading.pages.size<=PAGE_DATA_CACHE_LIMIT)break;
    if(!protectedPages.has(p))reading.pages.delete(p);
  }
}
async function getPageData(p){
  p=Number(p);if(!Number.isFinite(p)||p<1||p>TOTAL_PAGES)return null;
  if(reading.pages.has(p))return touchPageData(p,reading.pages.get(p));
  if(pageDataLoads.has(p))return pageDataLoads.get(p);
  const job=fetchPage(p).then(data=>{touchPageData(p,data);prunePageDataCache();return data}).finally(()=>pageDataLoads.delete(p));
  pageDataLoads.set(p,job);return job;
}
function surahIdFromPageData(data){
  const direct=Number(data?.surahs?.[0]?.id||data?.surahs?.[0]?.number||data?.surahs?.[0]?.surah_number);
  if(direct)return direct;
  const name=data?.surahs?.[0]?.name_arabic;
  if(name){for(const [id,ch] of reading.chapterMap)if(ch?.name_arabic===name)return Number(id)}
  for(const line of data?.lines||[])for(const w of line.words||[])if(w.verse_key)return Number(w.verse_key.split(":")[0]);
  return 1;
}
function surahIdFromMetaPage(p){
  p=Number(p);let best=1,bestStart=0;
  for(const [id,ch] of reading.chapterMap){
    const from=Number(ch?.pages?.[0]),to=Number(ch?.pages?.[1]);
    if(from<=p&&p<=to&&from>=bestStart){best=Number(id);bestStart=from}
  }
  return best;
}
async function pageDisplayInfo(p){
  p=Number(p);let data=reading.pages.get(p)||null;
  if(!data)try{data=await getPageData(p)}catch(_){}
  const sid=data?surahIdFromPageData(data):surahIdFromMetaPage(p);
  return {page:p,juz:juzForPage(p),surah:sid,sname:reading.chapterMap.get(sid)?.name_arabic||data?.surahs?.[0]?.name_arabic||""};
}
async function ensurePage(p){
  p=Number(p);if(!Number.isFinite(p)||p<1||p>TOTAL_PAGES)return null;
  const root=document.querySelector(`.page[data-page="${p}"]`);
  if(root?.dataset.loaded==="1"&&reading.pages.has(p))return touchPageData(p,reading.pages.get(p));
  if(pageLoads.has(p))return pageLoads.get(p);
  const job=(async()=>{
    const data=await getPageData(p);
    const engine=activeEngine();
    const prepared=await engine.prepare(p,data);
    renderPage(data,engine,prepared);return data;
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

function renderPage(data,engine,prepared){
  const root=document.querySelector(`.page[data-page="${data.page}"]`);
  const surahId=surahIdFromPageData(data),juz=juzForPage(data.page);
  root.dataset.loaded="1";
  root.dataset.qfont=data.font||"";
  root.innerHTML=`<div class="page-stage ${data.page<=2?"special":"full"}">
    <div class="page-meta"><button class="page-meta-link" type="button" data-index-tab="s" aria-label="فتح فهرس السور">سورة ${escapeHtml(reading.chapterMap.get(surahId)?.name_arabic||data.surahs[0]?.name_arabic||"")}</button><button class="page-meta-link" type="button" data-index-tab="j" aria-label="فتح فهرس الأجزاء">الجزء ${ar(juz)}</button></div>
    <div class="mushaf" id="mushaf-${data.page}"></div>
    <div class="page-footer"><div class="page-no">${ar(data.page)}</div></div>
  </div>`;
  root.querySelectorAll(".page-meta-link").forEach(btn=>btn.addEventListener("click",e=>{
    e.stopPropagation();
    openQuranIndex(btn.dataset.indexTab||"s");
  }));
  decoratePageHeader(root.querySelector(".page-meta"),data.page);

  const host=root.querySelector(".mushaf");
  engine.renderLines(host,prepared,data);

  if(reading.selectedKey)highlightAyah(reading.selectedKey,root);
  renderPageBookmark(root);
  requestAnimationFrame(()=>fitPage(data.page));
}

/* محرّك QCF (حفص): بيانات الصفحة هي بيانات QCF نفسها، والتحضير تحميل خط الصفحة.
   الأسطر يبنيها engines/qcf.mjs؛ ما يحتاجه من هذا الملف يُمرَّر إليه. رقم الكلمة الثابت
   (wordGi) من الفهرس الموحّد data/words/index.json عبر word-gi.mjs. */
const qcfLineEnv={
  surahName:sid=>reading.chapterMap.get(sid)?.name_arabic||"",
  headerGlyph:sid=>surahHeaderReady?SURAH_HEADER_GLYPHS[sid]:null,
};
registerEngine({
  id:"qcf",
  prepare:async(p,data)=>{await Promise.all([ensureQcfFont(data.font),loadWordIndex()]);return data},
  renderLines:(host,prepared)=>qcfRenderLines(host,prepared,{...qcfLineEnv,
    wordGi:(page,lineNo,w)=>wordGiAt(page,lineNo-1,prepared.lines[lineNo-1].words.indexOf(w))}),
});
/* محرّك DigitalKhatt (الروايات غير حفص): يرسم QCF أولًا لعنوان السورة والبسملة، ثم يستبدل أسطر النص. */
registerEngine(createDigitalKhattEngine({
  qcfPrepare:(p,data)=>Promise.all([ensureQcfFont(data.font),loadWordIndex()]),
  qcfRender:(host,data)=>qcfRenderLines(host,data,qcfLineEnv),
  riwaya,
}));
initRiwaya();
/* حين يتغيّر المحرّك (رواية أخرى) تُرسم الصفحات المحمّلة من جديد بالمحرّك الجديد. */
onEngineChange(()=>{
  document.querySelectorAll('.page[data-loaded="1"]').forEach(root=>{root.innerHTML="";delete root.dataset.loaded});
  return ensurePage(reading.currentPage).then(()=>prefetchAround(reading.currentPage));
});

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
