/* ═══════════ شاشة مواقيت الصلاة ═══════════
   صفحة ثانية داخل طبقة الرئيسية (#zk-launch)، يفتحها تبويب «مواقيت الصلاة».
   المواقيت من حاسبة prayer.js، والتقويم الهجري من تقويم أم القرى في المتصفح
   مع تصحيحات الإعلانات الرسمية في data/hijri-adjustments.json، ثم تعديل
   القارئ نفسه (±يومين) إن اختاره. */
const ZP_DAY=864e5;
const ZP_ADJ_KEY="zad:hijri-adjust";
const ZP_OFFICIAL_KEY="zad:hijri-official-v1";
const ZP_OFFICIAL_URL="data/hijri-adjustments.json";
const ZP_MONTHS=["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
/* المناسبات: [الشهر، اليوم، الاسم، آخر يوم إن كانت أيامًا، ليلة؟]
   الليلة تبدأ بمغرب اليوم الذي قبلها، فتُعلَّم على ذلك اليوم: ليلة النصف من شعبان مساء ١٤ شعبان. */
const ZP_EVENTS=[
  [1,1,"رأس السنة الهجرية"],[1,9,"يوم تاسوعاء"],[1,10,"يوم عاشوراء"],
  [7,27,"الإسراء والمعراج"],
  [8,14,"ليلة النصف من شعبان",0,1],
  [9,1,"أول رمضان"],[9,21,"العشر الأواخر من رمضان",30],[9,26,"ليلة السابع والعشرين، تُرجى فيها ليلة القدر",0,1],
  [10,1,"عيد الفطر"],
  [12,1,"العشر الأوائل من ذي الحجة",10],[12,8,"يوم التروية"],[12,9,"يوم عرفة"],[12,10,"عيد الأضحى"],[12,11,"أيام التشريق",13]
];
/* مناسبات يوم هجري: تُقدَّم المحددة بيوم واحد على الممتدة. */
function zpEventsOn(h){
  return ZP_EVENTS.filter(e=>e[0]===h.m&&(e[3]?h.d>=e[1]&&h.d<=e[3]:h.d===e[1]))
    .sort((a,b)=>!!a[3]-!!b[3]);
}
const ZP_WEEKDAYS=["س","ح","ن","ث","ر","خ","ج"];   /* السبت … الجمعة */

/* ── التقويم الهجري ──
   التاريخ يُمثَّل بطابع الساعة ١٢ ظهرًا (UTC) من اليوم الميلادي المقصود. */
let zpOfficialMonths={};   /* {"1447-10":"2026-03-20"}: بداية الشهر كما أُعلنت */
function zpReadOfficialCache(){
  try{const v=JSON.parse(localStorage.getItem(ZP_OFFICIAL_KEY)||"null");if(v&&typeof v==="object")zpOfficialMonths=v}catch(_){}
}
function zpValidOfficial(data){
  const months=data&&data.months;
  if(!months||typeof months!=="object")return null;
  const out={};
  for(const [key,value] of Object.entries(months)){
    if(/^\d{4}-(?:[1-9]|1[0-2])$/.test(key)&&/^\d{4}-\d{2}-\d{2}$/.test(String(value))&&!Number.isNaN(Date.parse(value+"T12:00:00Z")))out[key]=String(value);
  }
  return out;
}
/* من الشبكة أولًا، وما حُفظ آخر مرة عند انقطاعها. */
async function zpLoadOfficial(){
  try{
    const response=await fetch(ZP_OFFICIAL_URL,{cache:"no-cache"});
    if(!response.ok)return;
    const months=zpValidOfficial(await response.json());
    if(!months)return;
    const changed=JSON.stringify(months)!==JSON.stringify(zpOfficialMonths);
    zpOfficialMonths=months;
    try{localStorage.setItem(ZP_OFFICIAL_KEY,JSON.stringify(months))}catch(_){}
    if(changed)ztRefresh();
  }catch(_){}
}
function zpAdj(){
  try{const n=Math.round(Number(localStorage.getItem(ZP_ADJ_KEY))||0);return Math.max(-2,Math.min(2,n))}catch(_){return 0}
}
function zpSetAdj(n){
  try{n?localStorage.setItem(ZP_ADJ_KEY,String(n)):localStorage.removeItem(ZP_ADJ_KEY)}catch(_){}
}
const zpUQFormat=(()=>{try{return new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"})}catch(_){return null}})();
function zpUQ(ts){
  const p=Object.fromEntries(zpUQFormat.formatToParts(new Date(ts)).filter(x=>x.type!=="literal").map(x=>[x.type,parseInt(x.value,10)]));
  return {y:p.year,m:p.month,d:p.day};
}
function zpOfficialStart(y,m){
  const value=zpOfficialMonths[`${y}-${m}`];
  return value?Date.parse(value+"T12:00:00Z"):null;
}
/* أم القرى، مصحّحًا ببدايات الشهور المعلنة (رؤية الهلال). */
function zpHijriOfficial(ts){
  const u=zpUQ(ts);
  const next=u.m===12?[u.y+1,1]:[u.y,u.m+1];
  const nextStart=zpOfficialStart(next[0],next[1]);
  if(nextStart!=null&&ts>=nextStart)return {y:next[0],m:next[1],d:Math.round((ts-nextStart)/ZP_DAY)+1};
  const start=zpOfficialStart(u.y,u.m);
  if(start==null||ts>=start)return start==null?u:{y:u.y,m:u.m,d:Math.round((ts-start)/ZP_DAY)+1};
  /* أُعلن الشهر متأخرًا عن أم القرى: هذا اليوم من الشهر السابق. */
  const prev=u.m===1?[u.y-1,12]:[u.y,u.m-1];
  const uqStart=ts-(u.d-1)*ZP_DAY;
  const prevStart=zpOfficialStart(prev[0],prev[1])??(uqStart-ZP_DAY-(zpUQ(uqStart-ZP_DAY).d-1)*ZP_DAY);
  return {y:prev[0],m:prev[1],d:Math.round((ts-prevStart)/ZP_DAY)+1};
}
function zpHijri(ts){return zpHijriOfficial(ts+zpAdj()*ZP_DAY)}
const zpHijriLong=ts=>{const h=zpHijri(ts);return `${ztArabic(h.d)} ${ZP_MONTHS[h.m-1]} ${ztArabic(h.y)}`};
const zpGreg=(ts,options)=>new Intl.DateTimeFormat("ar-EG",{timeZone:"UTC",...options}).format(new Date(ts));
/* ظهر اليوم الحالي، بتوقيت المدينة المختارة إن وُجدت، وإلا بتوقيت الجهاز. */
function zpTodayNoon(tz){
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:tz||undefined,year:"numeric",month:"numeric",day:"numeric"})
    .formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,parseInt(x.value,10)]));
  return Date.UTC(parts.year,parts.month-1,parts.day,12);
}

/* ── حالة الشاشة ── */
/* zpAnimate: الحركة عند فتح الشاشة فقط، لا عند كل نقرة داخلها. */
let zpDayOff=0,zpMonthOff=0,zpAdjOpen=false,zpHero=null,zpAnimate=true;

function zpSafeCfg(){
  if(typeof ptReady!=="function"||!ptReady())return null;
  const cfg=ptGet();
  if(!cfg)return null;
  try{ptTimes(cfg);return cfg}catch(_){return null}
}
function zpPickCity(){document.body.classList.add("zk-launch-prayer");ptSetupDialog()}

function zpDayHtml(cfg){
  const now=Date.now(),todayNoon=zpTodayNoon(cfg.tz),dayNoon=todayNoon+zpDayOff*ZP_DAY;
  const weekday=zpGreg(dayNoon,{weekday:"long"});
  const title=zpDayOff===0?`اليوم، ${weekday}`:zpDayOff===1?`غدًا، ${weekday}`:zpDayOff===-1?`أمس، ${weekday}`:weekday;
  const times=ptTimes(cfg,new Date(now+zpDayOff*ZP_DAY));
  const isToday=zpDayOff===0;
  const cur=isToday?ptCurrent(cfg):null,next=isToday?ptNext(cfg):null;
  const rows=PT_ORDER.map(k=>{
    const at=times[k].getTime(),isNow=k===cur,isNext=!!next&&next.today&&next.key===k;
    const cls=[k==="sunrise"&&"sun",isNow&&"now",isToday&&at<=now&&!isNow&&"past"].filter(Boolean).join(" ");
    return `<li class="${cls}"><span class="zp-name">${PT_NAMES[k]}${isNow?'<span class="zp-tag">وقتها الآن</span>':""}${isNext?`<span class="zp-left">بعد ${arDur((at-now)/6e4,true)}</span>`:""}</span><span class="zp-time"><bdi>${ptFmt(times[k],cfg.tz)}</bdi></span></li>`;
  }).join("");
  let hero="";
  zpHero=null;
  if(isToday){
    const prayers=["fajr","dhuhr","asr","maghrib","isha"];
    const passed=prayers.filter(k=>times[k].getTime()<=now);
    const prevAt=passed.length?times[passed[passed.length-1]].getTime():ptTimes(cfg,new Date(now-ZP_DAY)).isha.getTime();
    zpHero={prevAt,tz:cfg.tz,at:next.at.getTime()};
    hero=`<section class="zt-prayer zp-hero" aria-label="الصلاة القادمة">
      <div class="zt-prayer-top"><span>${cur?`وقت ${PT_NAMES[cur]} الآن`:"مواقيت اليوم"}</span><span class="zt-clock" id="zp-clock"></span></div>
      <div class="zt-arc">
        <svg viewBox="-8 -2 236 124" aria-hidden="true">
          <path class="zt-arc-track" d="M 206 110 A 96 96 0 0 0 14 110"/>
          <path class="zt-arc-fill" id="zp-arc-fill" d="M 206 110 A 96 96 0 0 0 14 110"/>
          <g class="zt-sun-dot" id="zp-sun"><circle r="9" fill="#E4C980" opacity=".25"/><circle r="5" fill="#FFF4CD"/></g>
        </svg>
        <div class="zt-arc-label"><div class="zp-hero-cap">الصلاة القادمة</div><div class="zt-next-name">${PT_NAMES[next.key]}</div><div class="zt-countdown" id="zp-countdown"></div></div>
      </div></section>`;
  }
  return `<div class="zp-daynav">
      <button class="zp-step" type="button" data-zp-day="-1" aria-label="اليوم السابق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>
      <div class="zp-daytitle"><b>${title}</b><span><span class="zt-hijri">${zpHijriLong(dayNoon)}</span> · ${zpGreg(dayNoon,{day:"numeric",month:"long",year:"numeric"})}</span></div>
      <button class="zp-step" type="button" data-zp-day="1" aria-label="اليوم التالي"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button>
    </div>
    ${hero}
    <section class="zp-table" aria-label="جدول المواقيت"><ol>${rows}</ol></section>`;
}

function zpCalendarHtml(todayNoon){
  /* الشهر المعروض: نتحرك من اليوم شهرًا بعد شهر. */
  let anchor=todayNoon;
  for(let i=0;i<Math.abs(zpMonthOff);i++){
    anchor=zpMonthOff>0?anchor+(31-zpHijri(anchor).d)*ZP_DAY:anchor-zpHijri(anchor).d*ZP_DAY;
  }
  const first=anchor-(zpHijri(anchor).d-1)*ZP_DAY,m0=zpHijri(first);
  const days=[];
  for(let ts=first;zpHijri(ts).m===m0.m&&days.length<31;ts+=ZP_DAY)days.push(ts);
  const lead=(new Date(first).getUTCDay()+1)%7;
  const selected=todayNoon+zpDayOff*ZP_DAY;
  const cells=Array.from({length:lead},()=>"<span></span>");
  const legend=[];
  for(const ts of days){
    const h=zpHijri(ts),events=zpEventsOn(h);
    /* النقطة للأيام المحددة؛ الأيام الممتدة (كالعشر) تُذكر في القائمة وحدها كي لا يزدحم التقويم. */
    const ev=events.some(e=>!e[3]||e[1]===h.d||e[2]==="أيام التشريق");
    /* الأيام البيض ١٣–١٥، إلا الثالث عشر من ذي الحجة فهو من أيام التشريق. */
    const white=h.d>=13&&h.d<=15&&!(h.m===12&&h.d===13);
    const names=events.map(e=>e[4]?`مساؤه ${e[2]}`:e[2]);
    if(white)names.push("من الأيام البيض");
    const label=zpHijriLong(ts)+(names.length?`، ${names.join("، ")}`:"");
    const cls=[ts===selected&&"sel",ts===todayNoon&&"today"].filter(Boolean).join(" ");
    cells.push(`<button type="button" class="${cls}" data-zp-pick="${Math.round((ts-todayNoon)/ZP_DAY)}" aria-label="${label}" aria-pressed="${ts===selected}">
      <b>${ztArabic(h.d)}</b><small>${zpGreg(ts,{day:"numeric"})}</small>${ev?'<i class="ev" aria-hidden="true"></i>':white?'<i class="wh" aria-hidden="true"></i>':""}</button>`);
    for(const e of events){
      if(e[3]&&e[1]!==h.d)continue;   /* الممتدة تُذكر مرة واحدة، في أول أيامها */
      const span=e[3]===30?`من ${ztArabic(e[1])} ${ZP_MONTHS[h.m-1]} إلى آخره`:e[3]?`${ztArabic(e[1])}–${ztArabic(e[3])} ${ZP_MONTHS[h.m-1]}`:zpHijriLong(ts);
      legend.push(`<li><i class="ev" aria-hidden="true"></i><span>${e[2]}</span><small>${e[4]?"مساء ":""}${span} · ${zpGreg(ts,{day:"numeric",month:"long"})}</small></li>`);
    }
  }
  const month=ZP_MONTHS[m0.m-1];
  legend.push(`<li><i class="wh" aria-hidden="true"></i><span>الأيام البيض</span><small>${m0.m===12?`${ztArabic(14)}–${ztArabic(15)} ${month}، والثالث عشر من أيام التشريق`:`${ztArabic(13)}–${ztArabic(15)} ${month}`}</small></li>`);
  const last=days[days.length-1],g1=zpGreg(first,{month:"long"}),g2=zpGreg(last,{month:"long"});
  const greg=`${g1===g2?g1:`${g1} – ${g2}`} ${zpGreg(last,{year:"numeric"})}`;
  const adj=zpAdj();
  const adjNote=adj?`، معدّل ${adj>0?"+":"−"}${ztArabic(Math.abs(adj))}`:"";
  const adjLabel=!adj?"بلا تعديل":`${adj>0?"متقدّم":"متأخّر"} ${Math.abs(adj)===1?"يومًا":"يومين"}`;
  return `<section class="zp-cal" aria-label="التقويم الهجري">
    <div class="zp-cal-head">
      <button class="zp-step flat" type="button" data-zp-month="-1" aria-label="الشهر السابق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>
      <div><h3>${month} ${ztArabic(m0.y)}</h3><span>${greg}</span></div>
      <button class="zp-step flat" type="button" data-zp-month="1" aria-label="الشهر التالي"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button>
    </div>
    <div class="zp-week" aria-hidden="true">${ZP_WEEKDAYS.map(d=>`<span>${d}</span>`).join("")}</div>
    <div class="zp-days">${cells.join("")}</div>
    <ul class="zp-legend">${legend.join("")}</ul>
    <div class="zp-adj-row"><span>وفق التقويم المعتمد في السعودية${adjNote}</span>
      <button type="button" class="zp-adj-toggle" data-zp-adj-toggle aria-expanded="${zpAdjOpen}">تعديل</button></div>
    ${zpAdjOpen?`<div class="zp-adj" role="group" aria-label="تعديل التاريخ الهجري">
      <button type="button" data-zp-adj="-1" aria-label="يوم إلى الخلف"${adj<=-2?" disabled":""}>−</button>
      <span aria-live="polite">${adjLabel}</span>
      <button type="button" data-zp-adj="1" aria-label="يوم إلى الأمام"${adj>=2?" disabled":""}>+</button></div>`:""}
  </section>`;
}

function zpRender(){
  const host=ztEl("zt-prayer-page");
  if(!host)return;
  const cfg=zpSafeCfg();
  const todayNoon=zpTodayNoon(cfg&&cfg.tz);
  const head=`<header class="zp-head zt-rise">
      <div><h2>مواقيت الصلاة</h2>${cfg?`<p>${esc(cfg.city)}، ${esc(cfg.land)}</p>`:""}</div>
      ${cfg?`<button class="zp-change" type="button" data-zp-city><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg><span>تغيير</span></button>`:""}
    </header>`;
  const day=cfg?zpDayHtml(cfg):(zpHero=null,`<section class="zt-prayer zp-empty"><div class="zt-prayer-empty">
      <span class="zp-pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg></span>
      <h3>اختر مدينتك لعرض المواقيت</h3>
      <button class="zt-btn-gold" type="button" data-zp-city>اختر مدينتك</button></div></section>`);
  const back=zpDayOff||zpMonthOff?`<button class="zp-today" type="button" data-zp-today>العودة إلى اليوم</button>`:"";
  host.classList.toggle("zp-still",!zpAnimate);zpAnimate=false;
  host.innerHTML=`${head}<div class="zp-grid"><div class="zp-col zt-rise">${day}${back}</div><div class="zp-col zt-rise">${zpCalendarHtml(todayNoon)}</div></div>`;
  zpTick();
}
function zpTick(){
  if(!zpHero)return;
  const now=Date.now(),left=zpHero.at-now;
  if(left<=0){zpRender();return}
  const s=Math.floor(left/1000),two=n=>String(n).padStart(2,"0");
  const countdown=ztEl("zp-countdown");
  if(countdown)countdown.innerHTML='بعد <bdi dir="ltr">'+ztArabic(Math.floor(s/3600)+":"+two(Math.floor(s/60)%60)+":"+two(s%60))+"</bdi>";
  const clock=ztEl("zp-clock");
  if(clock)clock.textContent="الآن "+ptFmt(new Date(),zpHero.tz);
  const elapsed=Math.min(1,Math.max(0,(now-zpHero.prevAt)/Math.max(1,zpHero.at-zpHero.prevAt)));
  const fill=ztEl("zp-arc-fill");
  if(fill)fill.style.strokeDashoffset=(301.6*(1-elapsed)).toFixed(1);
  const sun=ztEl("zp-sun");
  if(sun){const a=Math.PI*elapsed;sun.style.transform=`translate(${(110+96*Math.cos(a)).toFixed(1)}px,${(110-96*Math.sin(a)).toFixed(1)}px)`}
}
function zpReset(){zpDayOff=0;zpMonthOff=0;zpAdjOpen=false;zpAnimate=true}

(function zpInit(){
  zpReadOfficialCache();
  zpLoadOfficial();
  const host=ztEl("zt-prayer-page");
  if(!host)return;
  host.addEventListener("click",event=>{
    const el=event.target.closest("button");
    if(!el||!host.contains(el))return;
    if(el.hasAttribute("data-zp-city"))return zpPickCity();
    if(el.hasAttribute("data-zp-today")){zpReset();return zpRender()}
    if(el.hasAttribute("data-zp-adj-toggle")){zpAdjOpen=!zpAdjOpen;return zpRender()}
    if(el.dataset.zpDay){zpDayOff+=Number(el.dataset.zpDay);zpMonthOff=0;return zpRender()}
    if(el.dataset.zpMonth){zpMonthOff+=Number(el.dataset.zpMonth);return zpRender()}
    if(el.dataset.zpPick!=null){zpDayOff=Number(el.dataset.zpPick);return zpRender()}
    if(el.dataset.zpAdj){zpSetAdj(Math.max(-2,Math.min(2,zpAdj()+Number(el.dataset.zpAdj))));ztPaintDates();return zpRender()}
  });
})();
