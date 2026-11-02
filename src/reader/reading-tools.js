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
  document.querySelectorAll(".verse-segment.selected").forEach(x=>x.classList.remove("selected"));
  selectedKey=null;selectedAnchor=null;closeMenu();
}
function selectVerse(k,anchor,force=false){
  if(!force && selectedKey===k){
    clearVerseSelection();
    hideTools();
    return false;
  }
  selectedKey=k;selectedAnchor=anchor||selectedAnchor;
  document.querySelectorAll(".verse-segment.selected").forEach(x=>x.classList.remove("selected"));
  document.querySelectorAll(`.verse-segment[data-key="${k}"]`).forEach(x=>x.classList.add("selected"));
  const v=verseParts(k);showVerseContext(v);
  return true;
}

function bindSegment(seg){
  let sx=0,sy=0,moved=false;
  seg.addEventListener("pointerdown",e=>{
    sx=e.clientX;sy=e.clientY;moved=false;longTriggered=false;
    clearTimeout(longTimer);
    longTimer=setTimeout(()=>{
      if(moved)return;
      longTriggered=true;clearTimeout(toolsTimer);selectVerse(seg.dataset.key,seg,true);openPrimaryMenu(seg);
    },520);
  });
  seg.addEventListener("pointermove",e=>{
    if(Math.hypot(e.clientX-sx,e.clientY-sy)>10){moved=true;clearTimeout(longTimer)}
  });
  seg.addEventListener("pointerup",e=>{
    clearTimeout(longTimer);
    if(!moved&&!longTriggered){const on=selectVerse(seg.dataset.key,seg,false);if(on)showToolsFor(2800)}
  });
  seg.addEventListener("pointercancel",()=>clearTimeout(longTimer));
}

/* ---------- paging: exactly one page per gesture ---------- */
function loadList(key){
  const x=storageJsonGet(key,[]);return Array.isArray(x)?x:[];
}
function saveList(key,list){return storageJsonSet(key,list)}
function archivePreviousVisit(item){
  if(!item||!Number.isFinite(+item.page))return;
  const key=STORAGE_KEYS.recentVisits,list=loadList(key);
  list.unshift({page:+item.page,savedAt:+item.savedAt||Date.now()});
  saveList(key,list.slice(0,3));
}
function saveLastPosition(){
  storageJsonSet(STORAGE_KEYS.lastPosition,{page:currentPage,savedAt:Date.now()});
}
function saveReaderSurface(surface,extra={}){
  storageJsonSet(STORAGE_KEYS.lastSurface,{surface,page:currentPage,savedAt:Date.now(),...extra});
}
function cleanConsumedReaderTarget(){
  try{
    const url=new URL(location.href);
    for(const key of ["home","juz","page","surah","ayah"])url.searchParams.delete(key);
    if(/^#ayah=/i.test(url.hash))url.hash="";
    history.replaceState(history.state,"",url.href);
  }catch(_){ }
}
function enterReaderSurface({consumeTarget=true,fromHome=false}={}){
  saveLastPosition();
  saveReaderSurface("reader");
  if(fromHome){readerReturnToQuranHome=true;storageSet(STORAGE_KEYS.readerParent,"quran-home")}
  if(consumeTarget)cleanConsumedReaderTarget();
}
function updatePage(animate=true,savePosition=true){
  track.style.transition=animate?"transform .31s cubic-bezier(.2,.78,.2,1)":"none";
  track.style.transform=`translateX(${-(TOTAL_PAGES-currentPage)*100}vw)`;
  document.getElementById("prevBtn").disabled=currentPage===1;
  document.getElementById("nextBtn").disabled=currentPage===TOTAL_PAGES;
  document.getElementById("desktopPrevBtn").disabled=currentPage===1;
  document.getElementById("desktopNextBtn").disabled=currentPage===TOTAL_PAGES;
  closeMenu();
  if(savePosition)saveLastPosition();
  const milestone=pageMilestoneLabel(currentPage);
  if(milestone)showNotice(milestone);
}
async function go(p){
  const target=Math.max(1,Math.min(TOTAL_PAGES,Number(p)||1));
  if(navigationBusy||target===currentPage)return;
  navigationBusy=true;
  try{
    await ensurePage(target);
    clearVerseSelection();
    currentPage=target;updatePage(true);enterReaderSurface({consumeTarget:true});
    /* لا يعود التمرير معلّقًا على نوع المؤشّر: أي صفحة قد تصير قابلة للتمرير،
       فتُفتح من أعلاها دائمًا. وهو بلا أثر على الصفحات التي تكتمل. */
    requestAnimationFrame(()=>{
      const s=document.querySelector(`.page[data-page="${target}"] .page-stage`);
      if(s)s.scrollTop=0;
    });
    prefetchAround(target).then(()=>trimPageDom(target));
  }catch(e){console.error("QCF page load failed",target,e);showToast("تعذّر تحميل الصفحة "+ar(target))}
  finally{navigationBusy=false}
}
track.addEventListener("pointerdown",e=>{
  downX=e.clientX;downY=e.clientY;swipeActive=true;
});
track.addEventListener("pointerup",e=>{
  if(!swipeActive)return;swipeActive=false;
  const dx=e.clientX-downX,dy=e.clientY-downY;
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.15)return;
  // Arabic book: swipe RIGHT => next page enters from LEFT.
  if(dx>0)go(currentPage+1); else go(currentPage-1);
});
track.addEventListener("pointercancel",()=>swipeActive=false);
document.getElementById("prevBtn").onclick=()=>go(currentPage-1);
document.getElementById("nextBtn").onclick=()=>go(currentPage+1);
document.getElementById("desktopPrevBtn").onclick=()=>go(currentPage-1);
document.getElementById("desktopNextBtn").onclick=()=>go(currentPage+1);

/* ---------- floating ayah menu ---------- */
function placeMenu(anchor){
  const r=anchor.getBoundingClientRect();
  const x=Math.max(128,Math.min(innerWidth-128,r.left+r.width/2));
  const y=Math.max(100,r.top);
  menu.style.left=x+"px";menu.style.top=y+"px";menu.classList.add("show");
}
function closeMenu(){menu.classList.remove("show");if(!document.body.classList.contains("hidden-tools"))showToolsFor(2800)}
function openPrimaryMenu(anchor){
  menu.innerHTML=`
    <button type="button" class="menu-btn play" data-act="listen"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg><span class="menu-label">${isSurahOnly()?"استماع للسورة":"استماع"}</span></button>
    <button type="button" class="menu-btn" data-act="tafsir"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M5.333 3c2.46-.003 4.836.887 6.667 2.5V21a10.07 10.07 0 0 0-6.667-2.5c-1.562 0-2.343 0-2.688-.22a1.16 1.16 0 0 1-.424-.425C2 17.51 2 16.895 2 15.663v-9.26c0-1.428 0-2.141.549-2.72c.548-.579 1.11-.609 2.234-.668Q5.056 3 5.333 3m13.334 0A10.07 10.07 0 0 0 12 5.5V21a10.07 10.07 0 0 1 6.667-2.5c1.562 0 2.343 0 2.688-.22c.207-.133.291-.218.424-.425c.221-.345.221-.96.221-2.192v-9.26c0-1.428 0-2.141-.549-2.72s-1.11-.609-2.234-.668Q18.944 3 18.667 3"/><path d="M19 7.326a10.4 10.4 0 0 0-2 .13m2 3.55q-.166-.005-.333-.005a10.1 10.1 0 0 0-3.667.681m4 2.819q-.166-.005-.333-.005a10.1 10.1 0 0 0-3.667.68M5 7.326a10.4 10.4 0 0 1 2 .13m-2 3.55q.166-.005.333-.005A10.1 10.1 0 0 1 9 11.682m-4 2.819q.166-.005.333-.005a10.1 10.1 0 0 1 3.667.68"/></g></svg><span class="menu-label">التفسير</span></button>
    <button type="button" class="menu-btn" data-act="share"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.7M8.2 13.1l7.6 4.7"/></svg><span class="menu-label">مشاركة</span></button>
    <button type="button" class="menu-btn" data-act="bookmark"><svg viewBox="0 0 24 24"><path d="M5 3h12l2 2v16H5Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg><span class="menu-label">حفظ</span></button>`;
  bindPrimaryMenu();placeMenu(anchor);
}
function openShareMenu(){
  menu.innerHTML=`
    <button type="button" class="menu-btn" data-share="app"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.7M8.2 13.1l7.6 4.7"/></svg><span class="menu-label">تطبيق</span></button>
    <button type="button" class="menu-btn" data-share="copy"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span class="menu-label">نسخ</span></button>
    <button type="button" class="menu-btn" data-share="link"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg><span class="menu-label">الرابط</span></button>`;
  menu.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>doShare(b.dataset.share));
  if(selectedAnchor)placeMenu(selectedAnchor);
}
function openSaveMenu(){
  menu.innerHTML=`
    <button type="button" class="menu-btn wide" data-save="page"><svg viewBox="0 0 24 24"><path d="M6 3h12v19l-6-4-6 4Z"/><path d="M9 7h6"/></svg><span class="menu-label">صفحة مرجعية</span></button>
    <button type="button" class="menu-btn wide" data-save="ayah"><svg viewBox="0 0 24 24"><path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V22L12 18.5 6.5 22Z"/><path d="M9 8h6M9 12h4"/></svg><span class="menu-label">آية مرجعية</span></button>`;
  menu.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{
    const kind=b.dataset.save;closeMenu();
    if(kind==="page")savePageBookmark();else saveAyahBookmark();
  });
  if(selectedAnchor)placeMenu(selectedAnchor);
}
function bindPrimaryMenu(){
  menu.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==="share"){openShareMenu();return}
    if(a==="bookmark"){openSaveMenu();return}
    closeMenu();
    if(a==="listen")startSelected();
    if(a==="tafsir")openTafsir();
  });
}

/* ---------- Quran text from page JSON ---------- */
function verseTextCached(k){
  const out=[];
  for(const data of pages.values())for(const line of data.lines||[])for(const w of line.words||[])
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
async function verseTextFull(k,pageHint=null){
  const out=[];
  const hinted=Number(pageHint);
  let start=null;
  if(hinted>=1&&hinted<=TOTAL_PAGES)start=Math.max(1,hinted-1);
  else{
    const indexedStart=await getVersePage(k).catch(()=>null);
    start=indexedStart||Math.max(1,currentPage-1);
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
function publicSurahUrl(s,ayah=null){
  const n=Number(s),u=new URL(`surah/${n}/`,new URL("./",location.href));
  const a=Number(ayah);
  if(Number.isInteger(a)&&a>=1)u.searchParams.set("ayah",String(a));
  return u.href;
}
function publicJuzUrl(j){
  const n=Number(j);
  return new URL(`juz/${n}/`,new URL("./",location.href)).href;
}
function linkFor(k){
  const [s,a]=String(k||"").split(":").map(Number);
  return publicSurahUrl(s,a);
}
function ayahFromHash(){
  const m=location.hash.match(/^#ayah=(\d{1,3}):(\d{1,3})$/);
  if(!m)return null;
  const s=Number(m[1]),a=Number(m[2]),max=Number(chapterMap.get(s)?.verses_count||0);
  return s>=1&&s<=114&&a>=1&&a<=max?`${s}:${a}`:null;
}
function readerEntryParams(){
  const q=new URLSearchParams(location.search);
  const rawCode=String(q.get("code")||"").trim().toUpperCase();
  const code=rawCode.slice(0,4);
  const juz=Number(q.get("juz")),page=Number(q.get("page"));
  const surah=Number(q.get("surah")),ayah=Number(q.get("ayah")),home=q.get("home")==="1",fromZad=q.get("from")==="zad";
  const qari=String(q.get("qari")||"").trim();
  return {
    code,
    juz:Number.isInteger(juz)&&juz>=1&&juz<=30?juz:null,
    page:Number.isInteger(page)&&page>=1&&page<=TOTAL_PAGES?page:null,
    surah:Number.isInteger(surah)&&surah>=1&&surah<=114?surah:null,
    ayah:Number.isInteger(ayah)&&ayah>=1?ayah:null,
    qari:RECITERS.some(r=>r.id===qari)?qari:null,
    autoplay:q.get("play")==="1",
    home,fromZad
  };
}
function zadReturnUrl(){
  const {code}=readerEntryParams();
  return code?`./#${encodeURIComponent(code)}`:"./?zad=1";
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
async function doShare(kind){
  if(!selectedKey)return;
  const v=verseParts(selectedKey),text=await verseTextFull(selectedKey,currentPage),url=linkFor(selectedKey);
  try{
    if(kind==="copy"){await copyText(text);closeMenu();return}
    if(navigator.share){
      if(kind==="app")await navigator.share({title:`سورة ${v.sname} · الآية ${v.a}`,text:`${text}\n— سورة ${v.sname}، الآية ${v.a}`,url});
      else await navigator.share({title:`سورة ${v.sname} · الآية ${v.a}`,url});
    }else await copyText(kind==="app"?`${text}\n${url}`:url,"تم نسخ المحتوى للمشاركة");
  }catch(e){if(e?.name!=="AbortError")showToast("تعذّرت المشاركة الآن")}
  closeMenu();
}
function loadPageBookmarks(){return loadList(STORAGE_KEYS.pageBookmarks)}
function loadAyahBookmarks(){
  let list=loadList(STORAGE_KEYS.ayahBookmarks);
  if(!list.length){
    const legacy=loadList(STORAGE_KEYS.legacyBookmarks).filter(x=>x&&x.verse);
    if(legacy.length){list=legacy;saveList(STORAGE_KEYS.ayahBookmarks,list)}
  }
  return list;
}
function savePageBookmark(){
  const item={page:currentPage,savedAt:Date.now()};
  const list=loadPageBookmarks().filter(x=>x.page!==currentPage);
  list.unshift(item);saveList(STORAGE_KEYS.pageBookmarks,list);
  showToast(`حُفظت الصفحة ${ar(currentPage)} كصفحة مرجعية`);
}
function saveAyahBookmark(){
  if(!selectedKey){showToast("اختر آية أولًا");return}
  const item={page:currentPage,verse:selectedKey,excerpt:firstFourWords(verseTextCached(selectedKey)),savedAt:Date.now()};
  const list=loadAyahBookmarks().filter(x=>x.verse!==selectedKey);
  list.unshift(item);saveList(STORAGE_KEYS.ayahBookmarks,list);
  showToast("حُفظت الآية كآية مرجعية");
}
function firstFourWords(text){
  const words=String(text||"").trim().split(/\s+/).filter(Boolean).slice(0,4);
  return words.length?words.join(" ")+"…":"الآية المحفوظة";
}
async function bookmarkAyahExcerpt(item){
  if(item?.excerpt)return String(item.excerpt);
  const p=Number(item?.page)||await getVersePage(item?.verse);
  try{
    if(p)await getPageData(p);
    return firstFourWords(await verseTextFull(item?.verse,p));
  }catch(_){return firstFourWords(verseTextCached(item?.verse))}
}
function openBookmarks(){
  const b=sheet("العلامات المرجعية",`<div class="bookmark-sections">
    <section class="bookmark-section ref-recent"><div class="bookmark-title"><h4>آخر المتصفحات</h4><small>آخر ٣ زيارات</small></div><div class="bookmark-list" id="recentList"></div></section>
    <section class="bookmark-section ref-pages"><div class="bookmark-title"><h4>مرجعيات الصفحات</h4></div><div class="bookmark-list" id="pageBookmarkList"></div></section>
    <section class="bookmark-section ref-ayahs"><div class="bookmark-title"><h4>مرجعيات الآيات</h4></div><div class="bookmark-list" id="ayahBookmarkList"></div></section>
  </div>`);
  const recentHost=b.querySelector("#recentList"),pageHost=b.querySelector("#pageBookmarkList"),ayahHost=b.querySelector("#ayahBookmarkList");

  async function drawRecent(){
    const list=loadList(STORAGE_KEYS.recentVisits).slice(0,3);
    if(!list.length){recentHost.innerHTML='<div class="empty-state">ستظهر هنا مواضع آخر زياراتك.</div>';return}
    recentHost.innerHTML='<div class="empty-state">تحميل المواضع…</div>';
    const rows=await Promise.all(list.map(async(x,i)=>{const info=await pageDisplayInfo(x.page);return `<div class="bookmark-row recent"><button type="button" class="bookmark-main" data-recent="${i}"><b>سورة ${escapeHtml(info.sname)}</b><small>الصفحة ${ar(info.page)} · الجزء ${ar(info.juz)}</small></button></div>`}));
    recentHost.innerHTML=rows.join("");
    recentHost.querySelectorAll("[data-recent]").forEach(btn=>btn.onclick=()=>{const x=loadList(STORAGE_KEYS.recentVisits)[+btn.dataset.recent];if(!x)return;b.remove();go(x.page)});
  }
  async function drawPages(){
    const list=loadPageBookmarks();
    if(!list.length){pageHost.innerHTML='<div class="empty-state">لا توجد صفحات مرجعية محفوظة بعد.</div>';return}
    pageHost.innerHTML='<div class="empty-state">تحميل المرجعيات…</div>';
    const rows=await Promise.all(list.map(async(x,i)=>{const info=await pageDisplayInfo(x.page);return `<div class="bookmark-row"><button type="button" class="bookmark-main" data-page-open="${i}"><b>سورة ${escapeHtml(info.sname)}</b><small>الصفحة ${ar(info.page)} · الجزء ${ar(info.juz)}</small></button><button type="button" class="bookmark-delete" data-page-del="${i}" aria-label="حذف الصفحة المرجعية">×</button></div>`}));
    pageHost.innerHTML=rows.join("");
    pageHost.querySelectorAll("[data-page-open]").forEach(btn=>btn.onclick=()=>{const x=loadPageBookmarks()[+btn.dataset.pageOpen];if(!x)return;b.remove();go(x.page)});
    pageHost.querySelectorAll("[data-page-del]").forEach(btn=>btn.onclick=e=>{e.stopPropagation();const list=loadPageBookmarks();list.splice(+btn.dataset.pageDel,1);saveList(STORAGE_KEYS.pageBookmarks,list);drawPages();showToast("حُذفت الصفحة المرجعية")});
  }
  async function drawAyahs(){
    const list=loadAyahBookmarks();
    if(!list.length){ayahHost.innerHTML='<div class="empty-state">لا توجد آيات مرجعية محفوظة بعد.</div>';return}
    ayahHost.innerHTML='<div class="empty-state">تحميل المرجعيات…</div>';
    const rows=await Promise.all(list.map(async(x,i)=>{
      const v=verseParts(x.verse),excerpt=await bookmarkAyahExcerpt(x),p=Number(x.page)||await getVersePage(x.verse),j=juzForPage(p||1);
      return `<div class="bookmark-row"><button type="button" class="bookmark-main" data-ayah-open="${i}"><b class="ayah-excerpt">${escapeHtml(excerpt)}</b><small>سورة ${escapeHtml(v.sname)} · الآية ${ar(v.a)} · الجزء ${ar(j)}</small></button><button type="button" class="bookmark-delete" data-ayah-del="${i}" aria-label="حذف الآية المرجعية">×</button></div>`;
    }));
    ayahHost.innerHTML=rows.join("");
    ayahHost.querySelectorAll("[data-ayah-open]").forEach(btn=>btn.onclick=async()=>{const x=loadAyahBookmarks()[+btn.dataset.ayahOpen];if(!x)return;b.remove();await go(x.page);const a=document.querySelector(`.page[data-page="${x.page}"] .verse-segment[data-key="${x.verse}"]`);if(a)selectVerse(x.verse,a)});
    ayahHost.querySelectorAll("[data-ayah-del]").forEach(btn=>btn.onclick=e=>{e.stopPropagation();const list=loadAyahBookmarks();list.splice(+btn.dataset.ayahDel,1);saveList(STORAGE_KEYS.ayahBookmarks,list);drawAyahs();showToast("حُذفت الآية المرجعية")});
  }
  drawRecent().catch(console.error);drawPages().catch(console.error);drawAyahs().catch(console.error);
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
  </div><div class="author-note">اعتمدنا في إعداد هذا النص على النسخة المصوَّرة المتاحة من الكتاب، إذ لا تتوفر نسخة رقمية رسمية منشورة على الإنترنت. وقد نُقِّح النص بعناية قدر الإمكان، لكن الخطأ وارد، وجلَّ من لا يخطئ؛ فإذا لاحظت أي خطأ أو اختلاف بين النص هنا ونص كتاب «التفسير الوجيز»، فنرجو تنبيهنا إلى ذلك.</div>`);
}
async function focusVerseForTafsir(key){
  const p=await getVersePage(key).catch(()=>null);
  if(p){
    await ensurePage(p);
    if(p!==currentPage){
      currentPage=p;updatePage(true);
      prefetchAround(p).then(()=>trimPageDom(p));
    }
  }
  let matches=[...document.querySelectorAll(`.page[data-page="${p||currentPage}"] .verse-segment[data-key="${key}"]`)];
  if(!matches.length)matches=[...document.querySelectorAll(`.verse-segment[data-key="${key}"]`)];
  document.querySelectorAll(".verse-segment.selected").forEach(x=>x.classList.remove("selected"));
  matches.forEach(x=>x.classList.add("selected"));
  selectedKey=key;selectedAnchor=matches[0]||null;
}
async function openTafsir(){
  if(!selectedKey){showToast("اختر آية أولًا");return}
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

  await render(selectedKey);
}
document.getElementById("tafsirBtn").onclick=openTafsir;
document.getElementById("bookmarkBtn").onclick=openBookmarks;
const zadReturnBtn=document.getElementById("backBtn");
let zadReturnHoldTimer=null,zadReturnHeld=false;
function cancelZadReturnHold(){clearTimeout(zadReturnHoldTimer);zadReturnHoldTimer=null}
zadReturnBtn.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  zadReturnHeld=false;cancelZadReturnHold();
  zadReturnHoldTimer=setTimeout(()=>{zadReturnHeld=true;showToast("العودة إلى زاد الخير");try{navigator.vibrate?.(18)}catch(_){ }},560);
});
["pointercancel","pointerleave"].forEach(type=>zadReturnBtn.addEventListener(type,cancelZadReturnHold));
zadReturnBtn.addEventListener("pointerup",e=>{
  cancelZadReturnHold();
  if(zadReturnHeld){zadReturnHeld=false;e.preventDefault();return}
  location.href=zadReturnUrl();
});
zadReturnBtn.addEventListener("contextmenu",e=>e.preventDefault());
