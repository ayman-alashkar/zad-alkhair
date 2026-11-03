/* ═══════════ الصفحة الرئيسية «اليوم» ═══════════
   بطاقة الصلاة القادمة من حاسبة المواقيت الموجودة (prayer.js)، وبطاقة القراءة
   من الختمة النشطة لهذا الجهاز أو من آخر صفحة في القارئ. لا تغيّر هذه الشاشة
   حالة الختمات العامة (code و viewer و state)؛ تقرأ بياناتها في متغيرات خاصة. */
const ZT_THEME_KEY="zad:qcf4:theme";
const ZT_KHATMAH_CACHE="zad:today-khatmah-v1";
const ZT_LAST_POSITION="zad:qcf4:last-position";
const ZT_JUZ_PROGRESS="zad:juz-progress-v1";   /* يكتبه القارئ */
const ztEl=id=>document.getElementById(id);
const ztArabic=value=>String(value).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);

/* ── المظهر: المفتاح نفسه الذي يستخدمه القارئ وصفحات الدليل ── */
function ztTheme(){
  try{return localStorage.getItem(ZT_THEME_KEY)==="dark"?"dark":"light"}catch(_){return "light"}
}
function ztApplyTheme(){
  const dark=ztTheme()==="dark";
  document.documentElement.dataset.zkTheme=dark?"dark":"light";
  const button=ztEl("zt-theme");
  if(button)button.setAttribute("aria-label",dark?"تفعيل الوضع النهاري":"تفعيل الوضع الليلي");
  ztPaintChrome();
}
/* لون شريط المتصفح: لون شاشة اليوم وهي مفتوحة، واللون الداكن للختمات. */
function ztPaintChrome(){
  const meta=document.querySelector('meta[name="theme-color"]');
  if(!meta)return;
  const open=document.body.classList.contains("zk-launch-open");
  meta.content=!open?"#082D29":ztTheme()==="dark"?"#061F1D":"#F5F0E4";
}

/* ── التاريخ ── */
function ztPaintDates(){
  const now=new Date();
  try{ztEl("zt-hijri").textContent=new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long",year:"numeric"}).format(now)}catch(_){}
  try{ztEl("zt-greg").textContent=new Intl.DateTimeFormat("ar-EG",{weekday:"long",day:"numeric",month:"long"}).format(now)}catch(_){}
}

/* ── بطاقة الصلاة ── */
const ZT_PRAYERS=["fajr","dhuhr","asr","maghrib","isha"];
let ztPrayerTimes=null;   /* {prevAt,next:{key,at}} للعدّاد الذي يتحدث كل ثانية */

function ztPrayerRender(){
  const host=ztEl("zt-prayer");
  if(!host)return;
  if(typeof ptReady!=="function"||!ptReady()){host.hidden=true;ztPrayerTimes=null;return}
  host.hidden=false;
  const cfg=ptGet();
  if(!cfg){
    ztPrayerTimes=null;
    host.innerHTML=`<div class="zt-prayer-empty">
      <h3>اختر مدينتك لعرض المواقيت</h3>
      <button class="zt-btn-gold" type="button" id="zt-pick-city">اختر مدينتك</button></div>`;
    ztEl("zt-pick-city").onclick=()=>{document.body.classList.add("zk-launch-prayer");ptSetupDialog()};
    return;
  }
  let today,next,prevAt;
  try{
    today=ptTimes(cfg);
    next=ptNext(cfg);
    const now=Date.now();
    const passed=ZT_PRAYERS.filter(k=>today[k].getTime()<=now);
    prevAt=passed.length?today[passed[passed.length-1]].getTime()
      :ptTimes(cfg,new Date(now-864e5)).isha.getTime();
  }catch(_){host.hidden=true;ztPrayerTimes=null;return}
  ztPrayerTimes={prevAt,tz:cfg.tz,next:{key:next.key,at:next.at.getTime()}};
  const items=ZT_PRAYERS.map(k=>{
    const isNext=k===next.key;
    return `<li class="${isNext?"is-next":""}"><span>${PT_NAMES[k]}</span><span class="t"><bdi>${ptFmt(today[k],cfg.tz)}</bdi></span></li>`;
  }).join("");
  host.innerHTML=`<div class="zt-prayer-top"><span>الصلاة القادمة في ${esc(cfg.city)}</span><span class="zt-clock" id="zt-clock"></span></div>
    <div class="zt-arc">
      <svg viewBox="-8 -2 236 124" aria-hidden="true">
        <path class="zt-arc-track" d="M 206 110 A 96 96 0 0 0 14 110"/>
        <path class="zt-arc-fill" id="zt-arc-fill" d="M 206 110 A 96 96 0 0 0 14 110"/>
        <g class="zt-sun-dot" id="zt-sun-dot"><circle r="9" fill="#E4C980" opacity=".25"/><circle r="5" fill="#FFF4CD"/></g>
      </svg>
      <div class="zt-arc-label">
        <div class="zt-next-name">${PT_NAMES[next.key]}</div>
        <div class="zt-countdown" id="zt-countdown"></div>
      </div>
    </div>
    <ol class="zt-prayers">${items}</ol>`;
  host.onclick=null;
  ztPrayerTick();
}
/* العدّ التنازلي والقوس والشمس، دون إعادة رسم البطاقة */
function ztPrayerTick(){
  if(!ztPrayerTimes)return;
  const now=Date.now(),{prevAt,next}=ztPrayerTimes;
  const left=next.at-now;
  if(left<=0){ztPrayerRender();return}
  const s=Math.floor(left/1000),two=n=>String(n).padStart(2,"0");
  const countdown=ztEl("zt-countdown");
  if(countdown)countdown.innerHTML='بعد <bdi dir="ltr">'+ztArabic(Math.floor(s/3600)+":"+two(Math.floor(s/60)%60)+":"+two(s%60))+"</bdi>";
  /* الوقت الحالي بتوقيت المدينة المختارة، كالمواقيت نفسها، لا بتوقيت الجهاز. */
  const clock=ztEl("zt-clock");
  if(clock&&ztPrayerTimes.tz)clock.textContent="الآن "+ptFmt(new Date(),ztPrayerTimes.tz);
  const elapsed=Math.min(1,Math.max(0,(now-prevAt)/Math.max(1,next.at-prevAt)));
  const fill=ztEl("zt-arc-fill");
  if(fill)fill.style.strokeDashoffset=(301.6*(1-elapsed)).toFixed(1);
  const sun=ztEl("zt-sun-dot");
  if(sun){const a=Math.PI*elapsed;sun.style.transform=`translate(${(110+96*Math.cos(a)).toFixed(1)}px,${(110-96*Math.sin(a)).toFixed(1)}px)`}
}

/* ── بطاقة القراءة: جزؤك في الختمة، أو تابع القراءة ── */
function ztReadJson(key){try{return JSON.parse(localStorage.getItem(key)||"null")}catch(_){return null}}
function ztKhatmahSummary(khatmahCode,me,remote){
  const juz=Array.isArray(remote&&remote.juz)?remote.juz:[];
  return {
    code:khatmahCode,title:String(remote.title||""),
    groupDone:juz.filter(j=>j.status==="done").length,
    mine:juz.map((j,i)=>({n:i+1,owner:j.ownerId,done:j.status==="done"})).filter(j=>j.owner===me.id).map(({n,done})=>({n,done})),
    at:Date.now()
  };
}
function ztReadingCard(summary){
  const host=ztEl("zt-reading");
  if(!host)return;
  if(summary){
    const pending=summary.mine.filter(j=>!j.done);
    const ring=`<div class="zt-ring" role="img" aria-label="أُتمّ ${ztArabic(summary.groupDone)} من ${ztArabic(30)} جزءًا في الختمة"><svg viewBox="0 0 84 84" aria-hidden="true"><circle class="bg" cx="42" cy="42" r="30"/><circle class="fg" cx="42" cy="42" r="30" style="stroke-dashoffset:${(188.5*(1-summary.groupDone/30)).toFixed(1)}"/></svg>
      <div class="zt-ring-label"><b>${ztArabic(summary.groupDone)}</b><small>من ${ztArabic(30)}</small></div><span class="zt-ring-cap">أُتمّ</span></div>`;
    /* الاسم كما كتبه المنظّم، كما يعرضه التطبيق في كل مكان آخر. */
    const where=summary.title?`«${esc(summary.title)}»`:"ختمتك";
    if(pending.length){
      const j=pending[0].n,more=summary.mine.length>1?`<span class="zt-sub zt-order">${ztJuzOrder(summary.mine.filter(x=>x.done).length+1,summary.mine.length)}</span>`:"";
      /* أبعد صفحة بلغها القارئ داخل هذا الجزء، يحفظها القارئ نفسه (recordJuzProgress). */
      const [first,last]=JUZ_PAGES[j-1],total=last-first+1;
      const reached=Number((ztReadJson(ZT_JUZ_PROGRESS)||{})[summary.code]?.[j]);
      const started=reached>=first&&reached<=last;
      const read=started?reached-first:0,atEnd=started&&reached===last;
      const progress=started?`<div class="zt-progress">
          <div class="zt-progress-row"><span>${atEnd?"وصلت إلى آخر صفحة في جزئك":`قرأت ${ztArabic(read)} من ${ztArabic(total)} صفحة`}</span><span>${started?`الصفحة ${ztArabic(reached)}`:""}</span></div>
          <span class="zt-bar"><i style="width:${(atEnd?100:read/total*100).toFixed(1)}%"></i></span></div>`:"";
      const readHref=started?`reader.html?page=${reached}&amp;code=${encodeURIComponent(summary.code)}`:readerLink(j,summary.code);
      const readLabel=!started?"اقرأ جزءك":atEnd?"راجع جزءك":"تابع القراءة";
      host.innerHTML=`<section class="zt-card" aria-label="جزؤك في الختمة">
        <div class="zt-card-row"><div class="zt-card-text">
          <span class="zt-eyebrow">جزؤك في ${where}</span>
          <span class="zt-title">الجزء ${ztArabic(j)}</span>
          <span class="zt-sub">${esc(JUZ[j-1]||"")}</span>${more}
        </div>${ring}</div>
        ${progress}
        <div class="zt-actions">
          <a class="zt-btn${atEnd?" quiet":""}" href="${readHref}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/></svg><span>${readLabel}</span></a>
          <button class="zt-btn${atEnd?" gold":" quiet"}" type="button" data-zt-complete="${j}">أتممت الجزء</button>
        </div></section>`;
    }else if(summary.mine.length){
      host.innerHTML=`<section class="zt-card" aria-label="ختمتك"><div class="zt-card-row"><div class="zt-card-text">
          <span class="zt-eyebrow">${where}</span><span class="zt-title">أتممت أجزاءك، تقبّل الله منك</span></div>${ring}</div>
        <div class="zt-actions"><button class="zt-btn quiet" type="button" data-zt-open-khatmah>افتح الختمة</button></div></section>`;
    }else{
      host.innerHTML=`<section class="zt-card" aria-label="ختمتك"><div class="zt-card-row"><div class="zt-card-text">
          <span class="zt-eyebrow">${where}</span><span class="zt-title">لم تحجز جزءًا بعد</span></div>${ring}</div>
        <div class="zt-actions"><button class="zt-btn" type="button" data-zt-open-khatmah>احجز جزءًا</button></div></section>`;
    }
    host.querySelectorAll("[data-zt-open-khatmah]").forEach(b=>b.onclick=()=>{zkHideLaunch();boot()});
    host.querySelectorAll("[data-zt-complete]").forEach(b=>b.onclick=()=>ztCompleteJuz(summary.code,Number(b.dataset.ztComplete)));
    return;
  }
  /* بلا ختمة: من آخر صفحة في القارئ */
  const last=ztReadJson(ZT_LAST_POSITION),page=Number(last&&last.page);
  if(page>=1&&page<=604){
    const s=surahForPage(page);
    host.innerHTML=`<a class="zt-continue" href="reader.html?page=${page}&amp;from=zad">
      <span class="zt-card-text"><span class="zt-eyebrow">تابع القراءة</span><span class="zt-title">سورة ${esc(s.name)}</span>
      <span class="zt-sub">من حيث توقفت · الصفحة ${ztArabic(page)}</span></span>
      <span class="zt-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/></svg></span></a>`;
  }else{
    host.innerHTML=`<a class="zt-continue" href="reader.html?home=1&amp;from=zad">
      <span class="zt-card-text"><span class="zt-eyebrow">القرآن العظيم</span><span class="zt-title">ابدأ القراءة</span>
      <span class="zt-sub">المصحف الشريف مع التفسير الوجيز</span></span>
      <span class="zt-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/></svg></span></a>`;
  }
}
/* «أتممت الجزء»: يفتح الختمة ثم يستعمل الإتمام الموجود نفسه (act)، فيُبلَّغ الأعضاء
   ويُعلَن الختم عند اكتماله وتُحفظ الرسائل إن انقطع الاتصال، كما من داخل الختمة. */
async function ztCompleteJuz(khatmahCode,n){
  if(activeKhatmahGet()!==khatmahCode)return;
  zkHideLaunch();
  await boot();
  if(!state||!viewer||code!==khatmahCode)return;
  const j=state.juz[n-1];
  if(!j||j.ownerId!==viewer.id||j.status==="done")return;
  if(!await appConfirm(`هل أتممت قراءة الجزء ${ar(n)}؟ سيُبلَّغ أعضاء الختمة بذلك.`,{title:"إتمام الجزء",ok:"نعم، أتممته"}))return;
  await act("done",n-1);
}
let ztReadingSeq=0;
/* «جزؤك الثاني من ٣ أجزاء»: ترتيب الجزء الحالي بين أجزاء القارئ في الختمة. */
const ZT_ORDINALS=["الأول","الثاني","الثالث","الرابع","الخامس","السادس","السابع","الثامن","التاسع","العاشر"];
function ztJuzOrder(k,n){
  const count=n===2?"جزأين":n<=10?`${ztArabic(n)} أجزاء`:`${ztArabic(n)} جزءًا`;
  return k<=10?`جزؤك ${ZT_ORDINALS[k-1]} من ${count}`:`جزؤك رقم ${ztArabic(k)} من ${count}`;
}
async function ztReadingRender(){
  const seq=++ztReadingSeq;
  const khatmahCode=activeKhatmahGet();
  const me=khatmahCode?ztReadJson("zad:viewer:"+khatmahCode):null;
  if(!khatmahCode||!me||!me.id){ztReadingCard(null);return}
  /* ما حُفظ آخر مرة يظهر فورًا، ويعمل دون اتصال؛ ثم يُحدَّث من الخادم. */
  const cached=ztReadJson(ZT_KHATMAH_CACHE);
  const fresh=cached&&cached.code===khatmahCode?cached:null;
  if(fresh)ztReadingCard(fresh);
  else if(!ztEl("zt-reading").firstChild)ztEl("zt-reading").innerHTML='<div class="zt-skeleton" aria-hidden="true"></div>';
  if(!navigator.onLine){if(!fresh)ztReadingCard(null);return}
  try{
    const remote=await rpc("get_state",{p_code:khatmahCode});
    if(seq!==ztReadingSeq)return;
    if(!remote){try{localStorage.removeItem(ZT_KHATMAH_CACHE)}catch(_){}ztReadingCard(null);return}
    const summary=ztKhatmahSummary(khatmahCode,me,remote);
    try{localStorage.setItem(ZT_KHATMAH_CACHE,JSON.stringify(summary))}catch(_){}
    ztReadingCard(summary);
  }catch(_){
    if(seq===ztReadingSeq&&!fresh)ztReadingCard(null);
  }
}

/* ── التبويبات ── */
function ztPaintTabs(){
  const tabs=ztEl("zk-tabs");
  if(!tabs)return;
  const onHome=document.body.classList.contains("zk-launch-open");
  const current=onHome?"zk-tab-home":"zk-launch-zad";
  ["zk-tab-home","zk-launch-quran","zk-launch-zad","zk-launch-prayer"].forEach((id,i)=>{
    const el=ztEl(id);if(!el)return;
    if(id===current){el.setAttribute("aria-current","page");tabs.style.setProperty("--zk-tab",String(i))}
    else el.removeAttribute("aria-current");
  });
}
/* تُستدعى من zkShowLaunch و zkHideLaunch */
function ztOnLaunchChange(){
  ztPaintTabs();ztPaintChrome();ztMenu(false);
  if(document.body.classList.contains("zk-launch-open"))ztRefresh();
}
function ztRefresh(){ztPaintDates();ztPrayerRender();ztReadingRender()}

/* ── قائمة «المزيد» ── */
function ztMenu(open){
  const menu=ztEl("zt-menu"),button=ztEl("zt-menu-btn");
  if(!menu||!button)return;
  menu.hidden=!open;
  button.setAttribute("aria-expanded",String(!!open));
}

(function ztInit(){
  ztApplyTheme();
  ztEl("zt-theme")?.addEventListener("click",()=>{
    try{localStorage.setItem(ZT_THEME_KEY,ztTheme()==="dark"?"light":"dark")}catch(_){}
    ztApplyTheme();
  });
  window.addEventListener("storage",event=>{if(event.key===ZT_THEME_KEY)ztApplyTheme()});
  ztEl("zt-menu-btn")?.addEventListener("click",event=>{event.stopPropagation();ztMenu(ztEl("zt-menu").hidden)});
  document.addEventListener("click",event=>{if(!event.target.closest(".zt-menu-wrap"))ztMenu(false)});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")ztMenu(false)});
  ztEl("zt-help")?.addEventListener("click",()=>{ztMenu(false);document.body.classList.add("zk-launch-prayer");helpDialog()});
  ztEl("zk-tab-home")?.addEventListener("click",()=>{zkShowLaunch();zkArmRootGuard()});
  /* بعد إغلاق أي نافذة (كاختيار المدينة) تُحدَّث البطاقات. */
  const layer=ztEl("layer");
  if(layer&&"MutationObserver" in window){
    new MutationObserver(()=>{if(!layer.firstChild&&document.body.classList.contains("zk-launch-open"))ztPrayerRender()})
      .observe(layer,{childList:true});
  }
  setInterval(()=>{if(!document.hidden&&document.body.classList.contains("zk-launch-open"))ztPrayerTick()},1000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&document.body.classList.contains("zk-launch-open"))ztRefresh()});
  window.addEventListener("online",()=>{if(document.body.classList.contains("zk-launch-open"))ztReadingRender()});
})();
