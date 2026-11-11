/* ═══════════ الأذكار ═══════════
   صفحة الأذكار وبطاقتها في الرئيسية، ورابط «أذكار بعد الصلاة» في بطاقة الصلاة.
   النصوص في adhkar-data.js، والعدّ على الجهاز وحده كـ«وردك اليوم». */
const ZA_KEY="zad:adhkar-v1";
const ZA_INDEX=["morning","evening","prayer","sleep","waking"];
const ZA_NAMES={morning:"أذكار الصباح",evening:"أذكار المساء",prayer:"أذكار بعد الصلاة",sleep:"أذكار النوم",waking:"أذكار الاستيقاظ"};
const ZA_SHORT={morning:"الصباح",evening:"المساء",prayer:"بعد الصلاة",sleep:"النوم",waking:"الاستيقاظ"};
const ZA_ICON_PATHS={
  morning:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  evening:'<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 6V3M5.6 10.6 4 9M18.4 10.6 20 9"/>',
  prayer:'<path d="M9.15 9C5.68 5.5 11.01 3.75 12.5 2c1.49 1.75 6.82 3.5 3.35 7Z"/><path d="M18.5 12v-1c0-1.5-.5-2-2-2h-8c-1.5 0-2 .5-2 2v1"/><path d="M17.5 12h-10c-2.5 0-3 .5-3 3v4c0 2.5.5 3 3 3h10c2.5 0 3-.5 3-3v-4c0-2.5-.5-3-3-3Z"/>',
  sleep:'<path d="M20.2 15.4A8.6 8.6 0 0 1 8.6 3.8a8.8 8.8 0 1 0 11.6 11.6Z"/>',
  waking:'<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 9V4M9.5 6.5 12 4l2.5 2.5"/>',
  wird:'<circle cx="12" cy="5" r="2"/><circle cx="6" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><circle cx="7.5" cy="16" r="2"/><circle cx="16.5" cy="16" r="2"/><path d="M12 18v4"/>'
};
const zaIcon=(name,cls="")=>`<svg${cls?` class="${cls}"`:""} viewBox="0 0 24 24" aria-hidden="true">${ZA_ICON_PATHS[name]}</svg>`;
const ZA_CHEVRON='<svg class="za-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const ZA_CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function zaCfg(){return typeof ptGet==="function"&&typeof ptReady==="function"&&ptReady()?ptGet():null}
/* الصلاة القائم وقتها (prayer.js): من أذانها إلى أذان التي بعدها، والفجر إلى الشروق فقط. */
function zaCurrentPrayer(){
  const cfg=zaCfg();
  if(!cfg)return null;
  try{return ptCurrent(cfg)}catch(_){return null}
}
function zaPrayerName(prayer){
  const cfg=zaCfg();
  try{if(cfg)return ptName(prayer,ptTimes(cfg)[prayer],cfg.tz)}catch(_){}
  return PT_NAMES[prayer]||"";
}
/* وقت البطاقة في الرئيسية: الصباح من الفجر إلى الظهر، والمساء من العصر إلى العشاء،
   والنوم من العشاء إلى الفجر. وبلا مدينة: بساعة الجهاز. بين الظهر والعصر لا أذكار وقتٍ. */
function zaPeriod(now=Date.now()){
  const cfg=zaCfg();
  if(cfg){
    try{
      const t=ptTimes(cfg,new Date(now));
      if(now<t.fajr.getTime())return "sleep";
      if(now<t.dhuhr.getTime())return "morning";
      if(now<t.asr.getTime())return null;
      if(now<t.isha.getTime())return "evening";
      return "sleep";
    }catch(_){}
  }
  const h=new Date(now).getHours();
  return h<4?"sleep":h<12?"morning":h<15?null:h<20?"evening":"sleep";
}

/* أذكار القسم. بعد الصلاة: للفجر والمغرب زيادات، ومن فتحها والوقت لا فريضة فيه يرى الأذكار المشتركة. */
function zaItems(section,prayer){
  const fm=prayer==="fajr"||prayer==="maghrib";
  return ZA_LISTS[section].filter(([,,ex])=>!ex||!ex.only||(ex.only==="f"?prayer==="fajr":fm))
    .map(([i,n,ex])=>({text:ZA_TEXT[i],count:ex&&ex.fm&&fm?ex.fm:n,note:ex&&ex.note||""}));
}
function zaTitle(section,prayer){
  return section==="prayer"&&prayer?`أذكار بعد صلاة ${zaPrayerName(prayer)}`:ZA_NAMES[section];
}
/* يتجدد العدّ بعد الفجر كـ«وردك اليوم»، وأذكار الصلاة مع كل صلاة. */
function zaKey(section,prayer){return zwDayKey()+(section==="prayer"?":"+(prayer||"any"):"")}
function zaAll(){try{return JSON.parse(localStorage.getItem(ZA_KEY)||"{}")||{}}catch(_){return {}}}
function zaLoad(section,prayer){
  const key=zaKey(section,prayer),items=zaItems(section,prayer),saved=zaAll()[section];
  const counts=saved&&saved.key===key&&Array.isArray(saved.counts)&&saved.counts.length===items.length
    ?saved.counts.map((n,i)=>Math.max(0,Math.min(items[i].count,Number(n)||0)))
    :items.map(()=>0);
  return {key,items,counts};
}
function zaSave(section,st){
  const all=zaAll();
  all[section]={key:st.key,counts:st.counts};
  try{localStorage.setItem(ZA_KEY,JSON.stringify(all))}catch(_){}
}
const zaDoneCount=st=>st.items.filter((it,i)=>st.counts[i]>=it.count).length;
const zaFirstOpen=st=>{const i=st.items.findIndex((it,k)=>st.counts[k]<it.count);return i<0?0:i};
const zaCountWord=n=>n<=10?`${ztArabic(n)} أذكار`:`${ztArabic(n)} ذكرًا`;
const zaProgressText=(done,total)=>done?`أتممت ${ztArabic(done)} من ${ztArabic(total)}`:zaCountWord(total);

/* ── البطاقة في الرئيسية ── */
function zaCardRender(){
  const host=ztEl("zt-adhkar");
  if(!host)return;
  const period=zaPeriod();
  let html;
  if(!period){
    html=`<button class="zw-done za-line" type="button" data-za-index><span class="zt-card-text"><span class="zw-done-title">الأذكار</span></span>${ZA_CHEVRON}</button>`;
  }else{
    const st=zaLoad(period),done=zaDoneCount(st),total=st.items.length;
    html=done>=total
      ?`<button class="zw-done" type="button" data-za-index>
        <span class="zw-done-badge" aria-hidden="true">${ZA_CHECK}</span>
        <span class="zt-card-text"><span class="zt-eyebrow">${ZA_NAMES[period]}</span><span class="zw-done-title">أتممتها، تقبّل الله منك</span></span>
        <span class="zt-sub">كل الأذكار</span></button>`
      :`<section class="za-card" aria-label="${ZA_NAMES[period]}">
        <button class="za-card-main" type="button" data-za-open="${period}">
          <span class="zt-card-text"><span class="zt-eyebrow">وقتها الآن</span><span class="zt-title">${ZA_NAMES[period]}</span>
          <span class="zt-sub">${zaProgressText(done,total)}</span></span>
          <span class="zt-badge">${zaIcon(period)}</span></button>
        ${done?`<span class="zt-bar za-bar" aria-hidden="true"><i style="width:${(done/total*100).toFixed(1)}%"></i></span>`:""}
        <button class="za-card-all" type="button" data-za-index><span>كل الأذكار</span>${ZA_CHEVRON}</button></section>`;
  }
  if(host.dataset.zaHtml!==html){host.dataset.zaHtml=html;host.innerHTML=html}
  host.querySelectorAll("[data-za-open]").forEach(b=>b.onclick=()=>zaOpen(b.dataset.zaOpen,{direct:true}));
  host.querySelectorAll("[data-za-index]").forEach(b=>b.onclick=zaOpenIndex);
}

/* ── صفحة الأذكار: الفهرس ثم الأذكار واحدًا واحدًا ── */
let zaView=null,zaFromIndex=false,zaSection=null,zaPrayer=null,zaPos=0,zaAdvance=0;
function zaIsOpen(){return !!ztEl("za-screen")&&!ztEl("za-screen").hidden}
function zaShow(){
  const screen=ztEl("za-screen");
  if(!screen)return false;
  if(screen.hidden){
    screen.hidden=false;
    document.body.classList.add("za-open");
    if(typeof zkArmRootGuard==="function")zkArmRootGuard();
  }
  return true;
}
function zaClose(){
  const screen=ztEl("za-screen");
  if(!screen||screen.hidden)return false;
  clearTimeout(zaAdvance);
  screen.hidden=true;
  zaView=null;
  document.body.classList.remove("za-open");
  zaCardRender();
  return true;
}
/* الرجوع: من ذكرٍ فُتح من الفهرس إلى الفهرس، وإلا تُغلق الصفحة. */
function zaBack(){
  if(!zaIsOpen())return false;
  if(zaView==="reader"&&zaFromIndex){zaOpenIndex();return true}
  zaClose();
  return true;
}
function zaOpenIndex(){
  if(!zaShow())return;
  clearTimeout(zaAdvance);
  zaView="index";zaFromIndex=false;
  ztEl("za-title").textContent="الأذكار";
  const period=zaPeriod(),current=zaCurrentPrayer();
  const tileState=(section,prayer)=>{
    const st=zaLoad(section,prayer),done=zaDoneCount(st),total=st.items.length;
    return {done:done>=total,text:done&&done<total?`أتممت ${ztArabic(done)} من ${ztArabic(total)}`:""};
  };
  let hero="";
  if(period){
    const st=zaLoad(period),done=zaDoneCount(st),total=st.items.length;
    if(done<total)hero=`<button class="za-hero" type="button" data-za-open="${period}">
      <span class="zt-card-text"><span class="zt-eyebrow">وقتها الآن</span><span class="zt-title">${ZA_NAMES[period]}</span>
      <span class="zt-sub">${zaProgressText(done,total)}</span>
      ${done?`<span class="zt-bar" aria-hidden="true"><i style="width:${(done/total*100).toFixed(1)}%"></i></span>`:""}</span>
      <span class="zt-badge">${zaIcon(period)}</span></button>`;
  }
  const tiles=ZA_INDEX.map(section=>{
    const prayer=section==="prayer"?current:null,s=tileState(section,prayer);
    return `<button class="za-tile" type="button" data-za-open="${section}"${prayer?` data-za-prayer="${prayer}"`:""}>
      ${zaIcon(section,"za-tile-icon")}<span class="za-tile-name">${ZA_SHORT[section]}</span>
      ${s.text?`<span class="za-tile-state">${s.text}</span>`:""}${s.done?`<span class="za-tile-check" aria-label="أتممتها">${ZA_CHECK}</span>`:""}</button>`;
  });
  const wirdDone=zwLoad().counts.every(n=>n>=ZW_GOAL);
  tiles.push(`<button class="za-tile" type="button" data-za-wird>${zaIcon("wird","za-tile-icon")}<span class="za-tile-name">وردك اليوم</span>
    ${wirdDone?`<span class="za-tile-check" aria-label="أتممته">${ZA_CHECK}</span>`:""}</button>`);
  const body=ztEl("za-body");
  body.innerHTML=`<div class="za-index">${hero}<div class="za-tiles">${tiles.join("")}</div>
    <p class="za-credit">من كتاب «حصن المسلم» للشيخ سعيد بن علي بن وهف القحطاني</p></div>`;
  body.scrollTop=0;
  body.querySelectorAll("[data-za-open]").forEach(b=>b.onclick=()=>zaOpen(b.dataset.zaOpen,{prayer:b.dataset.zaPrayer||null}));
  body.querySelector("[data-za-wird]").onclick=()=>zwOpen(0);
}
function zaOpen(section,{direct=false,prayer=null}={}){
  if(!ZA_LISTS[section]||!zaShow())return;
  zaFromIndex=!direct&&zaView==="index";
  zaView="reader";zaSection=section;zaPrayer=section==="prayer"?prayer:null;
  const st=zaLoad(zaSection,zaPrayer);
  zaPos=zaDoneCount(st)>=st.items.length?st.items.length:zaFirstOpen(st);
  ztEl("za-title").textContent=zaTitle(zaSection,zaPrayer);
  zaRenderReader();
}
function zaRenderReader(){
  clearTimeout(zaAdvance);
  const st=zaLoad(zaSection,zaPrayer),total=st.items.length,done=zaDoneCount(st);
  const body=ztEl("za-body");
  if(done>=total&&zaPos>=total){
    body.innerHTML=`<div class="za-done">
      <span class="za-done-badge" aria-hidden="true">${ZA_CHECK}</span>
      <span class="za-done-title">أتممت ${zaTitle(zaSection,zaPrayer)}</span>
      <span class="za-done-sub">تقبّل الله منك</span>
      <button class="zw-reset" type="button" id="za-restart">إعادة من البداية</button></div>`;
    ztEl("za-restart").onclick=()=>{st.counts=st.items.map(()=>0);zaSave(zaSection,st);zaPos=0;zaRenderReader()};
    return;
  }
  zaPos=Math.max(0,Math.min(total-1,zaPos));
  const it=st.items[zaPos];
  body.innerHTML=`<div class="za-reader">
    <div class="za-progress">
      <div class="za-progress-row"><span>الذكر ${ztArabic(zaPos+1)} من ${ztArabic(total)}</span><span id="za-done-count">${done?`أتممت ${ztArabic(done)}`:""}</span></div>
      <span class="zt-bar" aria-hidden="true"><i id="za-bar" style="width:${(done/total*100).toFixed(1)}%"></i></span></div>
    <div class="za-text-card"><div class="za-inner">
      ${it.note?`<p class="za-note">${esc(it.note)}</p>`:""}
      <p class="za-text${it.text.length<40?" short":""}">${esc(it.text)}</p></div></div>
    <button class="zw-tap za-tap" id="za-tap" type="button" data-rapid>
      <span class="zw-ring">
        <svg viewBox="0 0 260 260" aria-hidden="true"><circle class="disc" cx="130" cy="130" r="110"/><circle class="bg" cx="130" cy="130" r="110"/><circle class="arc" id="za-arc" cx="130" cy="130" r="110"/></svg>
        <span class="zw-ring-mid">
          <span class="zw-live"><b id="za-count"></b><small>من ${ztArabic(it.count)}</small></span>
          <span class="zw-full">${ZA_CHECK}</span>
        </span>
      </span>
      <span class="zw-hint" id="za-hint"></span>
    </button>
    <div class="za-nav">
      <button type="button" id="za-prev"${zaPos===0?" disabled":""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><span>السابق</span></button>
      <button type="button" id="za-next"><span>التالي</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
    </div></div>`;
  ztEl("za-tap").onclick=zaTap;
  ztEl("za-prev").onclick=()=>{if(zaPos>0){zaPos--;zaRenderReader()}};
  ztEl("za-next").onclick=zaNext;
  zaPaintCount(st);
}
/* العدّ والدائرة دون إعادة رسم الذكر */
function zaPaintCount(st){
  const it=st.items[zaPos],n=st.counts[zaPos],full=n>=it.count,done=zaDoneCount(st),total=st.items.length;
  const tap=ztEl("za-tap");
  if(!tap)return;
  tap.classList.toggle("done",full);
  tap.setAttribute("aria-label",full?"اكتمل هذا الذكر":`اضغط للعدّ، ${ztArabic(n)} من ${ztArabic(it.count)}`);
  ztEl("za-arc").style.strokeDashoffset=(ZW_BIG*(1-n/it.count)).toFixed(1);
  ztEl("za-count").textContent=ztArabic(n);
  ztEl("za-hint").textContent=full?(done>=total?"أتممتها كلها":"اكتمل، اضغط «التالي»"):"اضغط على الدائرة للعدّ";
  ztEl("za-done-count").textContent=done?`أتممت ${ztArabic(done)}`:"";
  ztEl("za-bar").style.width=(done/total*100).toFixed(1)+"%";
}
function zaTap(){
  const st=zaLoad(zaSection,zaPrayer),it=st.items[zaPos],n=st.counts[zaPos];
  if(!it||n>=it.count)return;
  st.counts[zaPos]=n+1;
  zaSave(zaSection,st);
  const full=n+1>=it.count;
  try{navigator.vibrate?.(full?[40,60,40]:8)}catch(_){}
  zaPaintCount(st);
  /* اكتمل الذكر: ينتقل وحده إلى الذي بعده بعد لحظة، أو إلى «أتممت» عند آخرها. */
  if(full){
    clearTimeout(zaAdvance);
    zaAdvance=setTimeout(()=>{if(zaView==="reader")zaNext()},450);
  }
}
function zaNext(){
  const st=zaLoad(zaSection,zaPrayer),total=st.items.length;
  if(zaPos<total-1){zaPos++;zaRenderReader();return}
  /* بعد آخر ذكر: إلى أول ذكر لم يكتمل، فإن اكتملت كلها فـ«أتممت». */
  zaPos=zaDoneCount(st)>=total?total:zaFirstOpen(st);
  zaRenderReader();
}
/* ── الروابط: لكل قسم رابط بصورة مشاركة ووصف (adhkar-pages.json، يولّدها build-seo-pages.cjs).
   الرابط يفتح الرئيسية بـ?adhkar=، فتُفتح الصفحة عليه، ويشارك زر الترأس رابط ما هو مفتوح. ── */
const ZA_SLUGS={morning:"morning",evening:"evening",prayer:"after-prayer",sleep:"sleep",waking:"wake-up"};
function zaSharePath(){
  if(zwIsOpen())return "/adhkar/wird/";
  return zaView==="reader"&&ZA_SLUGS[zaSection]?`/adhkar/${ZA_SLUGS[zaSection]}/`:"/adhkar/";
}
async function zaShare(){
  const url=new URL(zaSharePath(),location.origin).href;
  const title=zwIsOpen()?"وردك اليوم":zaView==="reader"?ZA_NAMES[zaSection]:"الأذكار";
  if(navigator.share){
    try{await navigator.share({title:`${title} — زاد الخير`,url});return}
    catch(error){if(error&&error.name==="AbortError")return}
  }
  try{await navigator.clipboard.writeText(url);toast("نُسخ الرابط")}
  catch(_){appCopyFallback("نسخ الرابط",url)}
}
/* يُقرأ ?adhkar= ويُحذف من العنوان فورًا، قبل أن يضيف bootstrap.js خطوة الرجوع،
   فلا يعود إليه الرجوع ولا إعادة التحميل. */
const zaLinkSlug=(()=>{
  let slug=null;
  try{slug=new URLSearchParams(location.search).get("adhkar")}catch(_){}
  if(slug!==null)try{history.replaceState(history.state,"",location.pathname+location.hash)}catch(_){}
  return slug;
})();
function zaOpenFromLink(){
  const slug=zaLinkSlug;
  if(slug===null)return;
  zaOpenIndex();
  const section=Object.keys(ZA_SLUGS).find(key=>ZA_SLUGS[key]===slug);
  if(section)zaOpen(section,{prayer:section==="prayer"?zaCurrentPrayer():null});
  else if(slug==="wird")zwOpen(0);
}

/* بعد إغلاق شاشة الورد فوق صفحة الأذكار */
function zaOnWirdClose(){if(zaIsOpen()&&zaView==="index")zaOpenIndex()}
(function zaInit(){
  ztEl("za-back")?.addEventListener("click",()=>{if(zaBack()&&typeof zkArmRootGuard==="function")zkArmRootGuard()});
  ztEl("za-share")?.addEventListener("click",zaShare);
  ztEl("zw-share")?.addEventListener("click",zaShare);
  /* بعد اكتمال الإقلاع (bootstrap.js يأتي بعد هذا الملف). */
  setTimeout(zaOpenFromLink,0);
  /* في طور الالتقاط، قبل أن تُغلق شاشة الورد نفسها، فلا يُغلق المفتاح الشاشتين معًا. */
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&zaIsOpen()&&!zwIsOpen())zaBack()},true);
})();
