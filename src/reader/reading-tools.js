/* حالة السحب بين الصفحات: موضع بدء الإصبع. خاصة بهذا الملف.
   الضغطات على الكلمات في gestures.mjs. */
let downX=0,downY=0,swipeActive=false;

function clearVerseContext(){
  const context=document.getElementById("readerContext");if(!context)return;
  clearTimeout(context._t);context.classList.remove("show");context.replaceChildren();context.removeAttribute("title");
}
function showVerseContext(v){
  const context=document.getElementById("readerContext");if(!context)return;
  clearTimeout(context._t);
  context.innerHTML=`<span class="context-surah">سورة ${escapeHtml(v.sname)}</span> <span class="context-ayah">الآية ${ar(v.a)}</span>`;
  context.title=`سورة ${v.sname} · الآية ${ar(v.a)}`;
  context.classList.add("show");showToolsFor(5400);
  context._t=setTimeout(clearVerseContext,5000);
}
function clearVerseSelection(){
  clearVerseContext();
  clearAyahHighlight();
  reading.selectedKey=null;reading.selectedAnchor=null;pendingReveal=null;closeMenu();
}
/* Choose once per tap; do not move a control while that tap is in progress. */
function placeReaderToolbar(anchor=null,point=null){
  const toolbar=document.querySelector(".bottom"),header=document.querySelector(".topbar");
  document.body.classList.remove("reader-tools-top");
  if(!toolbar||!header)return;
  const rect=anchor?.getBoundingClientRect();
  const target=point||(rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null);
  if(!target)return;
  // offsetTop excludes the toolbar's hide/show translation. Measuring its
  // normal position also respects the phone, tablet and desktop dock sizes.
  const bounds=toolbar.getBoundingClientRect(),bottomTop=toolbar.offsetTop;
  const top=header.offsetTop+header.offsetHeight+4;
  const overlaps=target.x>=bounds.left-8&&target.x<=bounds.right+8&&
    target.y>=bottomTop-8&&target.y<=bottomTop+toolbar.offsetHeight+8;
  if(overlaps&&target.y>top+toolbar.offsetHeight+8){
    toolbar.style.setProperty("--reader-tools-top",top+"px");
    document.body.classList.add("reader-tools-top");
  }
}
/* When a page is taller than the screen (landscape, tablets), a verse chosen
   by a link, bookmark, index or the recitation may sit below the fold. Scroll
   its page so the verse rests in the upper third, clear of the bottom tools.
   A tapped verse is already on screen, so taps never scroll.
   The page is often still being fitted when the verse is chosen (it cannot
   scroll yet), so the request waits in pendingReveal; fitPage() applies it
   once the page has its final height. */
let pendingReveal=null;
function revealVerse(anchor){
  pendingReveal=anchor||null;
  applyPendingReveal();
}
function afterPageFit(root){
  if(pendingReveal&&root.contains(pendingReveal))applyPendingReveal();
}
function applyPendingReveal(){
  const anchor=pendingReveal;
  if(!anchor?.isConnected){pendingReveal=null;return}
  const stage=anchor.closest(".page-stage");
  if(!stage||!stage.classList.contains("scrolls"))return; // not fitted yet, or the page fits the screen
  pendingReveal=null;
  const header=document.querySelector(".topbar");
  const view=stage.getBoundingClientRect(),verse=anchor.getBoundingClientRect();
  const visibleTop=Math.max(view.top,header?header.getBoundingClientRect().bottom:view.top);
  const visibleBottom=view.bottom-(document.querySelector(".bottom")?.offsetHeight||0);
  if(verse.top>=visibleTop&&verse.bottom<=visibleBottom)return;
  // At the start of a surah, show its name banner and basmala above the verse
  // too, as long as the verse itself still fits on screen.
  let start=verse.top,line=anchor.closest(".line");
  for(let i=0;i<2&&(line=line?.previousElementSibling);i++){
    if(!line.querySelector(".surah-line,.bismillah-line"))break;
    start=line.getBoundingClientRect().top;
  }
  const room=visibleBottom-visibleTop;
  stage.scrollTop+=start<verse.top&&verse.bottom-start+8<=room
    ?start-visibleTop-4
    :verse.top-visibleTop-room/3;
  // The tools were placed against the verse's old position; place them again.
  if(reading.selectedAnchor===anchor)placeReaderToolbar(anchor);
}
function selectVerse(k,anchor,force=false,point=null){
  if(!force && reading.selectedKey===k){
    clearVerseSelection();
    hideTools();
    return false;
  }
  reading.selectedKey=k;reading.selectedAnchor=anchor||reading.selectedAnchor;
  uthmaniLoad(verseParts(k).s);
  clearAyahHighlight();
  highlightAyah(k);
  if(point)pendingReveal=null;else revealVerse(reading.selectedAnchor);
  placeReaderToolbar(reading.selectedAnchor,point);
  const v=verseParts(k);showVerseContext(v);
  return true;
}

/* ضغطة قصيرة: تحدد الآية أو تلغي تحديدها؛ وعلى كلمة لها تعليق تفتح التعليق مباشرة.
   ضغطة مطوّلة: القائمة العائمة، وفيها سطر للآية (استماع، تفسير، مشاركة) وسطر للكلمة التي تحت
   الإصبع (القراءات، المعنى، تظليل، تعليق، والمتشابهات إن وُجدت). كل زر يفتح نافذة لموضوعه،
   وفي كل نافذة «المزيد» لبقية الأقسام (src/reader/card). */
onGesture("tap",({ayah,anchor,gi,point})=>{
  if(gi!=null&&markOf(gi)?.n){openNote(gi,anchor);return}
  const on=selectVerse(ayah,anchor,false,point);if(on)showToolsFor(2800);
});
onGesture("longPress",({ayah,anchor,gi,point})=>{
  clearTimeout(reading.toolsTimer);selectVerse(ayah,anchor,true,point);
  openPrimaryMenu(anchor,gi);
});
function pageOfElement(el){return Number(el?.closest?.(".page")?.dataset.page)||reading.currentPage}
function wordElement(page,gi){return document.querySelector(`.page[data-page="${page}"] [data-gi="${gi}"]`)}
function openWordCard(gi,anchor,section){
  closeMenu();
  return openCard({page:pageOfElement(anchor),gi,riwaya:riwaya()},{
    section,
    toast:showToast,
    onNavigate:(page,g)=>go(page).then(()=>{
      const el=wordElement(page,g),at=el&&ayahAt(el);
      if(at)selectVerse(at.ayah,at.anchor,true);
    }),
  });
}
/* التفسير (زر الشريط وقائمة الآية): نافذة التفسير للآية المختارة، أو أول آية في الصفحة. */
function openAyahCard(){
  const page=reading.currentPage,root=document.querySelector(`.page[data-page="${page}"]`);
  const el=reading.selectedKey?root?.querySelector(`[data-ayah="${reading.selectedKey}"][data-gi]`):root?.querySelector("[data-gi]");
  if(!el)return openTafsir();
  return openWordCard(Number(el.dataset.gi),el,"tafsir");
}
window.addEventListener("zad:tafsir-author",()=>openAuthorInfo());

/* ---------- تظليل الكلمة وتعليقها (hafiz.mjs) ---------- */
function openHighlightPicker(gi,anchor){
  const cur=markOf(gi)?.c||0;
  menu.classList.remove("word");
  menu.innerHTML=HIGHLIGHTS.map(h=>`<button type="button" class="menu-btn hz-pick${cur===h.id?" on":""}" data-hz="${h.id}" aria-label="تظليل ${h.name}"><i class="hz-sw hz-c${h.id}"></i><span class="menu-label">${h.name}</span></button>`).join("")+
    (cur?`<button type="button" class="menu-btn" data-hz="0"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg><span class="menu-label">إزالة</span></button>`:"");
  menu.querySelectorAll("[data-hz]").forEach(b=>b.onclick=()=>{setHighlight(gi,Number(b.dataset.hz));closeMenu()});
  placeMenu(anchor);
}
function openNote(gi,anchor){
  closeMenu();
  const page=pageOfElement(anchor);
  const cur=markOf(gi)?.n||"";
  const b=sheet("تعليق",`<div class="hz-note-view">
    <div class="hz-note-word"></div>
    <textarea class="hz-note-text" rows="5" maxlength="2000" placeholder="اكتب ملاحظتك على هذه الكلمة">${escapeHtml(cur)}</textarea>
    <div class="hz-note-actions"><button type="button" class="hz-note-save">حفظ</button>${cur?`<button type="button" class="hz-note-del">حذف التعليق</button>`:""}</div>
    <div class="hz-note-hint">التعليق محفوظ في هذا المتصفح، والضغط على الكلمة يفتحه.</div></div>`);
  wordText(page,gi).then(t=>{const w=b.querySelector(".hz-note-word");if(w)w.textContent=t});
  const ta=b.querySelector("textarea");
  b.querySelector(".hz-note-save").onclick=()=>{setNote(gi,ta.value);b.remove();showToast(ta.value.trim()?"حُفظ التعليق":"حُذف التعليق")};
  const del=b.querySelector(".hz-note-del");if(del)del.onclick=()=>{setNote(gi,"");b.remove();showToast("حُذف التعليق")};
  if(!cur)setTimeout(()=>ta.focus(),60);
}
window.addEventListener("online",()=>reportTarget.flush());
bindGestures(track);

/* ---------- paging: exactly one page per gesture ---------- */
function loadList(key){
  const x=storageJsonGet(key,[]);return Array.isArray(x)?x:[];
}
function saveList(key,list){return storageJsonSet(key,list)}
const RECENT_VISITS_LIMIT=5;
function archivePreviousVisit(item){
  if(!item||!Number.isFinite(+item.page))return;
  const key=STORAGE_KEYS.recentVisits,list=loadList(key);
  list.unshift({page:+item.page,savedAt:+item.savedAt||Date.now()});
  saveList(key,list.slice(0,RECENT_VISITS_LIMIT));
}
function saveLastPosition(){
  storageJsonSet(STORAGE_KEYS.lastPosition,{page:reading.currentPage,savedAt:Date.now()});
  recordJuzProgress(reading.currentPage);
  recordKahfVisit(reading.currentPage);
}
/* ── تقدّم المستخدم في أجزائه من الختمة ──
   الرئيسية تحفظ ملخص الختمة النشطة (رمزها وأجزاء المستخدم). هنا يُحفظ أبعد صفحة
   بلغها القارئ داخل كل جزء من أجزائه غير المكتملة؛ أي صفحة خارجها لا تؤثر.
   رابط الختمة (?code=…&juz=…) يُحسب أيضًا، لمن فتح جزءه قبل أن يمر بالرئيسية. */
const JUZ_PROGRESS_KEY="zad:juz-progress-v1";
const juzProgressEntry=(()=>{try{const e=readerEntryParams();return e.code&&e.juz?{code:e.code,juz:e.juz}:null}catch(_){return null}})();
/* صفحات سورة الكهف التي فُتحت، بوقت آخر فتح لكلٍّ منها. تعدّها بطاقة الجمعة في
   الرئيسية (friday-wird.js) لما بين مغرب الخميس ومغرب الجمعة. */
function recordKahfVisit(page){
  const p=Number(page);
  if(!(p>=293&&p<=304))return;
  const visits=storageJsonGet("zad:kahf-pages-v1",{})||{};
  visits[p]=Date.now();
  storageJsonSet("zad:kahf-pages-v1",visits);
}
function recordJuzProgress(page){
  const p=Number(page);
  if(!Number.isInteger(p))return;
  const tracked=[];
  const summary=storageJsonGet("zad:today-khatmah-v1",null);
  if(summary&&summary.code&&Array.isArray(summary.mine))
    for(const j of summary.mine)if(j&&!j.done)tracked.push([summary.code,Number(j.n)]);
  if(juzProgressEntry)tracked.push([juzProgressEntry.code,juzProgressEntry.juz]);
  if(!tracked.length)return;
  const progress=storageJsonGet(JUZ_PROGRESS_KEY,{})||{};
  let changed=false;
  for(const [code,n] of tracked){
    const range=JUZ_PAGES[n-1];
    if(!range||p<range[0]||p>range[1])continue;
    const byCode=progress[code]||(progress[code]={});
    if(!(Number(byCode[n])>=p)){byCode[n]=p;changed=true}
  }
  if(!changed)return;
  /* Only the khatmahs still in play are kept, so the record never grows without bound. */
  const keep=new Set(tracked.map(([code])=>code));
  for(const code of Object.keys(progress))if(!keep.has(code))delete progress[code];
  storageJsonSet(JUZ_PROGRESS_KEY,progress);
}
function saveReaderSurface(surface,extra={}){
  storageJsonSet(STORAGE_KEYS.lastSurface,{surface,page:reading.currentPage,savedAt:Date.now(),...extra});
}
function cleanConsumedReaderTarget(){
  try{
    const url=new URL(location.href);
    for(const key of ["home","listen","juz","page","surah","ayah"])url.searchParams.delete(key);
    const direct=directQuranPath();
    if(direct?.mode==="read"&&!direct.surah)url.searchParams.set("page",String(reading.currentPage));
    if(/^#ayah=/i.test(url.hash))url.hash="";
    history.replaceState(history.state,"",url.href);
  }catch(_){ }
}
function enterReaderSurface({consumeTarget=true,fromHome=false}={}){
  saveLastPosition();
  saveReaderSurface("reader");
  /* go() يمرّ هنا مع كل صفحة، والتلاوة تقلب الصفحات وحدها؛ فلا يُنسى أن المصحف فُتح من
     مشغّل التلاوة إلا إذا فُتح من الفهرس. */
  if(fromHome){readerReturnToListen=false;readerReturnToQuranHome=true;storageSet(STORAGE_KEYS.readerParent,"quran-home")}
  if(consumeTarget)cleanConsumedReaderTarget();
}
function updatePage(animate=true,savePosition=true){
  track.style.transition=animate?"transform .31s cubic-bezier(.2,.78,.2,1)":"none";
  track.style.transform=`translateX(${-(TOTAL_PAGES-reading.currentPage)*100}vw)`;
  document.getElementById("prevBtn").disabled=reading.currentPage===1;
  document.getElementById("nextBtn").disabled=reading.currentPage===TOTAL_PAGES;
  document.getElementById("desktopPrevBtn").disabled=reading.currentPage===1;
  document.getElementById("desktopNextBtn").disabled=reading.currentPage===TOTAL_PAGES;
  closeMenu();
  syncPageBookmarkButton();
  if(savePosition)saveLastPosition();
  const milestone=pageMilestoneLabel(reading.currentPage);
  if(milestone)showNotice(milestone);
}
async function go(p){
  /* لا ننتقل قبل اكتمال الإقلاع وخطوطه؛ وتبقى شاشة التحميل حتى نبلغ الصفحة المطلوبة. */
  if(!readerBooted){readerGoPending=true;await readerBootReady}
  const target=Math.max(1,Math.min(TOTAL_PAGES,Number(p)||1));
  if(reading.navigationBusy||target===reading.currentPage){if(readerGoPending){readerGoPending=false;loading.classList.add("hide")}return}
  reading.navigationBusy=true;
  try{
    await ensurePage(target);
    clearVerseSelection();
    reading.currentPage=target;updatePage(true);enterReaderSurface({consumeTarget:true});
    /* لا يعود التمرير معلّقًا على نوع المؤشّر: أي صفحة قد تصير قابلة للتمرير،
       فتُفتح من أعلاها دائمًا. وهو بلا أثر على الصفحات التي تكتمل. */
    requestAnimationFrame(()=>{
      const s=document.querySelector(`.page[data-page="${target}"] .page-stage`);
      if(s)s.scrollTop=0;
    });
    prefetchAround(target).then(()=>trimPageDom(target));
  }catch(e){console.error("QCF page load failed",target,e);showToast("تعذّر تحميل الصفحة "+ar(target))}
  finally{reading.navigationBusy=false;if(readerGoPending){readerGoPending=false;loading.classList.add("hide")}}
}
track.addEventListener("pointerdown",e=>{
  downX=e.clientX;downY=e.clientY;swipeActive=true;
});
track.addEventListener("pointerup",e=>{
  if(!swipeActive)return;swipeActive=false;
  const dx=e.clientX-downX,dy=e.clientY-downY;
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.15)return;
  // Arabic book: swipe RIGHT => next page enters from LEFT.
  if(dx>0)go(reading.currentPage+1); else go(reading.currentPage-1);
});
track.addEventListener("pointercancel",()=>swipeActive=false);
document.getElementById("prevBtn").onclick=()=>go(reading.currentPage-1);
document.getElementById("nextBtn").onclick=()=>go(reading.currentPage+1);
document.getElementById("desktopPrevBtn").onclick=()=>go(reading.currentPage-1);
document.getElementById("desktopNextBtn").onclick=()=>go(reading.currentPage+1);

/* ---------- floating ayah menu ---------- */
function placeMenu(anchor){
  const r=anchor.getBoundingClientRect();
  menu.classList.add("show");
  const half=Math.max(128,menu.offsetWidth/2+8),tall=Math.max(100,menu.offsetHeight+24);
  const x=Math.max(half,Math.min(innerWidth-half,r.left+r.width/2));
  const y=Math.max(tall,r.top);
  menu.style.left=x+"px";menu.style.top=y+"px";
}
function closeMenu(){menu.classList.remove("show","word");if(!document.body.classList.contains("hidden-tools"))showToolsFor(2800)}
const WORD_ICONS={
  qiraat:'<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/>',
  meaning:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  mutashabihat:'<rect x="3" y="5" width="10" height="6" rx="1.5"/><rect x="11" y="13" width="10" height="6" rx="1.5"/>',
  highlight:'<path d="M9 15l-4 4h6l1-1"/><path d="M8.5 14.5l8-8 3 3-8 8z"/>',
  note:'<path d="M5 5h14v10H9l-4 4z"/>',
};
function openPrimaryMenu(anchor,gi=null){
  const ayahRow=`<div class="menu-row">
    <button type="button" class="menu-btn play" data-act="listen"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg><span class="menu-label">${isSurahOnly()?"استماع للسورة":"استماع"}</span></button>
    <button type="button" class="menu-btn" data-act="tafsir"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M5.333 3c2.46-.003 4.836.887 6.667 2.5V21a10.07 10.07 0 0 0-6.667-2.5c-1.562 0-2.343 0-2.688-.22a1.160 1.160 0 0 1-.424-.425C2 17.51 2 16.895 2 15.663v-9.26c0-1.428 0-2.141.549-2.72c.548-.579 1.11-.609 2.234-.668Q5.056 3 5.333 3m13.334 0A10.07 10.07 0 0 0 12 5.5V21a10.07 10.07 0 0 1 6.667-2.5c1.562 0 2.343 0 2.688-.22c.207-.133.291-.218.424-.425c.221-.345.221-.96.221-2.192v-9.26c0-1.428 0-2.141-.549-2.72s-1.11-.609-2.234-.668Q18.944 3 18.667 3"/></g></svg><span class="menu-label">التفسير</span></button>
    <button type="button" class="menu-btn" data-act="share"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.7M8.2 13.1l7.6 4.7"/></svg><span class="menu-label">مشاركة</span></button></div>`;
  const wordBtn=(k,label)=>`<button type="button" class="menu-btn" data-word="${k}"><svg viewBox="0 0 24 24">${WORD_ICONS[k]}</svg><span class="menu-label">${label}</span></button>`;
  const wordRow=gi==null?"":`<div class="menu-row word-row">${wordBtn("qiraat","القراءات")}${wordBtn("meaning","المعنى")}${wordBtn("highlight","تظليل")}${wordBtn("note","تعليق")}</div>`;
  menu.classList.toggle("word",gi!=null);
  menu.innerHTML=ayahRow+wordRow;
  bindPrimaryMenu();
  menu.querySelectorAll("[data-word]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.word;
    if(k==="highlight")return openHighlightPicker(gi,anchor);
    if(k==="note")return openNote(gi,anchor);
    openWordCard(gi,anchor,k);
  });
  placeMenu(anchor);
  /* المتشابهات زر خامس حين تكون الكلمة في عبارة متشابهة. */
  if(gi!=null)hasMutashabihat(gi).then(yes=>{
    const row=menu.querySelector(".word-row");
    if(!yes||!row||!menu.classList.contains("show"))return;
    row.querySelector('[data-word="meaning"]').insertAdjacentHTML("afterend",wordBtn("mutashabihat","متشابهات"));
    const nb=row.querySelector('[data-word="mutashabihat"]');nb.onclick=()=>openWordCard(gi,anchor,"mutashabihat");
  });
}
function openShareMenu(){
  menu.classList.remove("word");
  menu.innerHTML=`
    <button type="button" class="menu-btn" data-share="share"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg><span class="menu-label">رابط</span></button>
    <button type="button" class="menu-btn" data-share="copy"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span class="menu-label">نسخ</span></button>`;
  menu.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>doShare(b.dataset.share));
  if(reading.selectedAnchor)placeMenu(reading.selectedAnchor);
}
function bindPrimaryMenu(){
  menu.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==="share"){openShareMenu();return}
    closeMenu();
    if(a==="listen")startSelected();
    if(a==="tafsir")openAyahCard();
  });
}

/* ---------- Quran text from page JSON ---------- */
function verseTextCached(k){
  const out=[];
  for(const data of reading.pages.values())for(const line of data.lines||[])for(const w of line.words||[])
    if(w.verse_key===k&&w.type==="word"&&w.text)out.push(w.text);
  return out.join(" ");
}
function collectVerseWords(data,k,out){
  let found=false;
  for(const line of data?.lines||[])for(const w of line.words||[]){
    if(w.verse_key===k&&w.type==="word"&&w.text){out.push(w.text);found=true}
  }
  return found;
}
/* نص الآية للنسخ والمشاركة: بالرسم العثماني (uthmani.js)، ومن صفحات المصحف إن تعذّر. */
async function verseTextFull(k,pageHint=null){
  const uthmani=uthmaniVerseNow(k)||await uthmaniVerse(k);
  if(uthmani)return uthmani;
  return cleanSimpleQuranText(await verseTextFromPages(k,pageHint));
}
async function verseTextFromPages(k,pageHint=null){
  const out=[];
  const hinted=Number(pageHint);
  let start=null;
  if(hinted>=1&&hinted<=TOTAL_PAGES)start=Math.max(1,hinted-1);
  else{
    const indexedStart=await getVersePage(k).catch(()=>null);
    start=indexedStart||Math.max(1,reading.currentPage-1);
  }
  // A verse can cross a Mushaf page boundary. With a page hint we also inspect
  // the previous page so copying/bookmarks still work if the selected segment
  // is a continuation and the global verse index is unavailable offline.
  let seen=false;
  for(let p=start;p<=Math.min(TOTAL_PAGES,start+3);p++){
    try{
      const data=await getPageData(p),found=collectVerseWords(data,k,out);
      if(seen&&!found)break;
      seen=seen||found;
    }catch(_){break}
  }
  return out.length?out.join(" "):verseTextCached(k);
}
function directQuranSurah(s){
  return (document.querySelector('meta[name="zk-direct-reader"]')?.content||"").split(",").includes(String(s));
}
function directQuranPath(){
  const m=/^\/quran-(read|listen)(?:\/([1-9]\d{0,2}))?\/?$/.exec(location.pathname);
  if(!m||m[2]&&!directQuranSurah(m[2]))return null;
  return {mode:m[1],surah:m[2]?Number(m[2]):null};
}
function publicSurahUrl(s,ayah=null){
  const n=Number(s),u=new URL(`/quran-read/${n}/`,location.origin);
  const a=Number(ayah);
  if(Number.isInteger(a)&&a>=1)u.searchParams.set("ayah",String(a));
  return u.href;
}
function publicJuzUrl(j){
  const n=Number(j);
  return new URL(`/quran-read/?juz=${n}`,location.origin).href;
}
function linkFor(k){
  const [s,a]=String(k||"").split(":").map(Number);
  return publicSurahUrl(s,a);
}
function ayahFromHash(){
  const m=location.hash.match(/^#ayah=(\d{1,3}):(\d{1,3})$/);
  if(!m)return null;
  const s=Number(m[1]),a=Number(m[2]),max=Number(reading.chapterMap.get(s)?.verses_count||0);
  return s>=1&&s<=114&&a>=1&&a<=max?`${s}:${a}`:null;
}
function readerEntryParams(){
  const q=new URLSearchParams(location.search);
  const direct=directQuranPath();
  const rawCode=String(q.get("code")||"").trim().toUpperCase();
  const code=rawCode.slice(0,4);
  const rawJuz=Number(q.get("juz")),rawPage=Number(q.get("page"));
  const juz=Number.isInteger(rawJuz)&&rawJuz>=1&&rawJuz<=30?rawJuz:null;
  const page=Number.isInteger(rawPage)&&rawPage>=1&&rawPage<=TOTAL_PAGES?rawPage:null;
  const surah=direct?direct.surah:Number(q.get("surah")),ayah=Number(q.get("ayah")),fromZad=q.get("from")==="zad";
  const home=direct?direct.mode==="read"&&!surah&&!page&&!juz:q.get("home")==="1";
  const listen=direct?direct.mode==="listen":q.get("listen")==="1";
  const qari=String(q.get("qari")||"").trim();
  return {
    code,
    juz,page,
    surah:Number.isInteger(surah)&&surah>=1&&surah<=114?surah:null,
    ayah:Number.isInteger(ayah)&&ayah>=1?ayah:null,
    qari:RECITERS.some(r=>r.id===qari)?qari:null,
    autoplay:q.get("play")==="1",
    home,listen,fromZad,direct:direct?.mode||""
  };
}
function zadReturnUrl(){
  const {code}=readerEntryParams();
  return code?`/#${encodeURIComponent(code)}`:"/?zad=1";
}
async function copyText(t,msg="تم النسخ"){
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(t);
    else{
      const box=document.createElement("textarea");box.value=t;box.setAttribute("readonly","");box.style.cssText="position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(box);box.select();const ok=document.execCommand("copy");box.remove();if(!ok)throw new Error("copy unavailable");
    }
    showToast(msg);
  }catch(_){showToast("تعذّر النسخ من هذا المتصفح")}
}
/* Copy and share use one text format:
   ﴿نص الآية﴾
   سورة …، الآية …
   (+ the surah link on its own line when sharing)
   The link lives inside `text`, not in `url`, because receiving apps place a
   separate url wherever they like (before, after, or instead of the text). */
function ayahShareText(k,text,withLink=false){
  const v=verseParts(k),lines=[`﴿${text}﴾`,`سورة ${v.sname}، الآية ${ar(v.a)}`];
  if(withLink)lines.push(linkFor(k));
  return lines.join("\n");
}
async function doShare(kind){
  if(!reading.selectedKey)return;
  const key=reading.selectedKey,text=await verseTextFull(key,reading.currentPage);
  try{
    if(kind==="copy"){await copyText(ayahShareText(key,text));closeMenu();return}
    const message=ayahShareText(key,text,true);
    if(navigator.share)await navigator.share({text:message});
    else await copyText(message,"تم نسخ المحتوى للمشاركة");
  }catch(e){if(e?.name!=="AbortError")showToast("تعذّرت المشاركة الآن")}
  closeMenu();
}
function loadPageBookmarks(){
  const list=loadList(STORAGE_KEYS.pageBookmarks);
  let mark=null;
  for(const item of list){
    const page=Number(item?.page);
    if(!Number.isInteger(page)||page<1||page>TOTAL_PAGES)continue;
    if(!mark||(Number(item.savedAt)||0)>(Number(mark.savedAt)||0))mark=item;
  }
  const result=mark?[mark]:[];
  // Upgrade older lists to one stopping mark, keeping the newest saved page.
  if(list.length!==result.length)saveList(STORAGE_KEYS.pageBookmarks,result);
  return result;
}
function hasPageBookmark(page=reading.currentPage){
  return loadPageBookmarks().some(x=>Number(x?.page)===Number(page));
}
function syncPageBookmarkButton(){
  const btn=document.getElementById("bookmarkBtn"),marked=hasPageBookmark();
  btn.classList.toggle("marked",marked);
  btn.setAttribute("aria-pressed",String(marked));
  btn.setAttribute("aria-label",marked?"إزالة العلامة":"أضف علامة");
  btn.title=marked?"إزالة العلامة":"أضف علامة";
  btn.querySelector(".bookmark-label").textContent=btn.title;
}
function setPageBookmark(page,marked){
  const p=Number(page);
  if(!Number.isInteger(p)||p<1||p>TOTAL_PAGES)return false;
  const list=marked?[{page:p,savedAt:Date.now()}]:loadPageBookmarks().filter(x=>Number(x.page)!==p);
  if(!saveList(STORAGE_KEYS.pageBookmarks,list)){showToast("تعذّر حفظ التغيير على هذا الجهاز");return false}
  refreshPageBookmarks();return true;
}
function togglePageBookmark(){
  const marked=!hasPageBookmark();
  if(setPageBookmark(reading.currentPage,marked))showToast(marked?`أُضيفت علامة للصفحة ${ar(reading.currentPage)}`:"أُزيلت العلامة");
}
/* One stopping mark uses the existing storage key. */
function renderPageBookmark(root){
  let pin=root.querySelector(".page-bookmark");
  if(!hasPageBookmark(root.dataset.page)){pin?.remove();return}
  if(!pin){
    pin=document.createElement("span");pin.className="page-bookmark";pin.setAttribute("role","img");
    pin.innerHTML='<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M3 0h18v30l-9-6-9 6Z"/></svg>';
    root.querySelector(".page-meta").appendChild(pin);
  }
  pin.setAttribute("aria-label",`علامة الصفحة ${ar(root.dataset.page)}`);
}
function refreshPageBookmarks(){
  document.querySelectorAll('.page[data-loaded="1"]').forEach(renderPageBookmark);
  syncPageBookmarkButton();
}
window.addEventListener("storage",e=>{if(e.key===STORAGE_KEYS.pageBookmarks||e.key===null)refreshPageBookmarks()});
async function jumpToPageBookmark(){
  const mark=loadPageBookmarks()[0];
  if(!mark){showToast("لحفظ موضعك، اضغط «أضف علامة» من أدوات القراءة");return}
  await go(mark.page);
  showToolsFor(5400);
}

/* ---------- sheets ---------- */
function sheet(title,inner){
  const b=document.createElement("div");b.className="backdrop";
  b.innerHTML=`<section class="sheet"><div class="sheethead"><h3>${escapeHtml(title)}</h3><button type="button" class="close-sheet">إغلاق</button></div>${inner}</section>`;
  b.onclick=e=>{if(e.target===b||e.target.closest(".close-sheet"))b.remove()};
  document.body.appendChild(b);return b;
}
function openAuthorInfo(){
  sheet("عن د. وهبة الزحيلي",`<div class="author-bio">
    د. وهبة الزحيلي عالم وفقيه سوري وأستاذ جامعي، عُرف بمؤلفاته في الفقه وأصوله والتفسير. ومن كتبه «التفسير الوجيز»، الذي يقدّم معاني الآيات بأسلوب مختصر وواضح.
  </div><div class="author-note">اعتمدنا في إعداد هذا النص على النسخة المصوَّرة المتاحة من الكتاب، إذ لا تتوفر نسخة رقمية رسمية منشورة على الإنترنت. وقد نُقِّح النص بعناية قدر الإمكان، لكن الخطأ وارد، وجلَّ من لا يخطئ.</div>`);
}
async function focusVerseForTafsir(key){
  const p=await getVersePage(key).catch(()=>null);
  if(p){
    await ensurePage(p);
    if(p!==reading.currentPage){
      reading.currentPage=p;updatePage(true);
      prefetchAround(p).then(()=>trimPageDom(p));
    }
  }
  const pageRoot=document.querySelector(`.page[data-page="${p||reading.currentPage}"]`);
  let matches=pageRoot?ayahElements(key,pageRoot):[];
  if(!matches.length)matches=ayahElements(key);
  clearAyahHighlight();
  matches.forEach(x=>x.classList.add("selected"));
  reading.selectedKey=key;reading.selectedAnchor=matches[0]||null;
}
async function openTafsir(){
  if(!reading.selectedKey){showToast("اختر آية أولًا");return}
  const b=sheet("التفسير الوجيز",`<div class="tafsir-view"></div>`);
  const view=b.querySelector(".tafsir-view");
  let renderRequest=0;

  async function render(key){
    const request=++renderRequest,v=verseParts(key);
    try{
      const record=await tafsirAyahRecord(key);
      if(request!==renderRequest||!b.isConnected)return;
      if(!record){showToast("لم يُعثر على تفسير هذه الآية");return}
      let fadl=null;try{fadl=await tafsirFadlForSurah(v.s)}catch(fadlErr){console.warn("tafsir fadl unavailable",fadlErr)}
      if(request!==renderRequest||!b.isConnected)return;
      const fadlHtml=fadl?`<details class="tafsir-fadl">
        <summary>${escapeHtml("فضل سورة "+v.sname)}</summary>
        <div class="tafsir-fadl-text">${escapeHtml(fadl.text||"")}</div>
      </details>`:"";
      const prev=previousAyahRef(v.s,v.a),next=nextAyahRef(v.s,v.a);
      view.innerHTML=`<div class="ref">سورة ${escapeHtml(v.sname)} · الآية ${ar(v.a)}</div>
        <div class="tafsir">${escapeHtml(record.text)}</div>
        ${fadlHtml}
        <div class="tafsir-nav">
          <button class="tafsir-nav-btn" type="button" data-tafsir-nav="prev" ${prev?"":"disabled"}>‹ الآية السابقة</button>
          <button class="tafsir-nav-btn" type="button" data-tafsir-nav="next" ${next?"":"disabled"}>الآية التالية ›</button>
        </div>
        <div class="source"><div class="source-line"><span>د. وهبة الزحيلي</span><button class="tafsir-more" type="button">اقرأ المزيد</button></div></div>`;
      const sheetEl=b.querySelector(".sheet");if(sheetEl)sheetEl.scrollTop=0;
      view.querySelector(".tafsir-more").onclick=()=>{b.remove();openAuthorInfo()};
      view.querySelectorAll("[data-tafsir-nav]").forEach(btn=>btn.onclick=async()=>{
        const ref=btn.dataset.tafsirNav==="prev"?previousAyahRef(v.s,v.a):nextAyahRef(v.s,v.a);
        if(!ref||!b.isConnected)return;
        const nextKey=`${ref.s}:${ref.a}`;
        view.querySelectorAll("[data-tafsir-nav]").forEach(x=>x.disabled=true);
        try{
          await focusVerseForTafsir(nextKey);
          if(b.isConnected)await render(nextKey);
        }catch(err){console.error(err);showToast("تعذر الانتقال إلى الآية")}
      });
    }catch(err){
      console.error(err);
      if(b.isConnected)showToast("تعذر فتح التفسير");
    }
  }

  await render(reading.selectedKey);
}
document.getElementById("tafsirBtn").onclick=openAyahCard;
document.getElementById("bookmarkBtn").onclick=togglePageBookmark;
document.getElementById("readerSearchBtn").onclick=()=>openQuranSearch();
document.getElementById("jumpBookmarkBtn").onclick=jumpToPageBookmark;
const zadReturnBtn=document.getElementById("backBtn");
let zadReturnHoldTimer=null,zadReturnHeld=false;
function cancelZadReturnHold(){clearTimeout(zadReturnHoldTimer);zadReturnHoldTimer=null}
zadReturnBtn.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  zadReturnHeld=false;cancelZadReturnHold();
  zadReturnHoldTimer=setTimeout(()=>{zadReturnHeld=true;showToast("الصفحة الرئيسية");try{navigator.vibrate?.(18)}catch(_){ }},560);
});
["pointercancel","pointerleave"].forEach(type=>zadReturnBtn.addEventListener(type,cancelZadReturnHold));
zadReturnBtn.addEventListener("pointerup",e=>{
  cancelZadReturnHold();
  if(zadReturnHeld){zadReturnHeld=false;e.preventDefault();return}
  /* سهم العودة يقود دائمًا إلى الصفحة الرئيسية لزاد الخير، حتى لو فُتح القارئ من ختمة. */
  location.href="/";
});
zadReturnBtn.addEventListener("contextmenu",e=>e.preventDefault());
