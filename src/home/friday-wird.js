/* ═══════════ الجمعة وسورة الكهف، و«وردك اليوم» ═══════════
   كلاهما على الجهاز وحده: لا يُرسل شيء منهما إلى الخادم ولا يرتبط بالختمة. */

/* ── يوم الجمعة: من مغرب الخميس إلى مغرب الجمعة ──
   بمواقيت المدينة المختارة وتوقيتها. وإن لم تُختر مدينة فاليوم كله بساعة الجهاز. */
const ZF_KAHF_PAGES=[293,304];               /* سورة الكهف في مصحف المدينة */
const ZF_KAHF_KEY="zad:kahf-pages-v1";       /* يكتبه القارئ: {صفحة: وقت آخر زيارة} */
function zfWeekday(at,tz){
  try{return new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:tz||undefined}).format(new Date(at))}catch(_){return ""}
}
function zfFriday(now=Date.now()){
  const cfg=typeof ptGet==="function"&&typeof ptReady==="function"&&ptReady()?ptGet():null;
  if(cfg){
    try{
      const day=zfWeekday(now,cfg.tz),today=ptTimes(cfg,new Date(now)),DAY=864e5;
      if(day==="Fri"&&now<today.maghrib.getTime())
        return {active:true,start:ptTimes(cfg,new Date(now-DAY)).maghrib.getTime(),end:today.maghrib.getTime()};
      if(day==="Thu"&&now>=today.maghrib.getTime())
        return {active:true,start:today.maghrib.getTime(),end:ptTimes(cfg,new Date(now+DAY)).maghrib.getTime()};
      return {active:false};
    }catch(_){/* بلا مواقيت: اليوم كله أدناه */}
  }
  const d=new Date(now);
  if(d.getDay()!==5)return {active:false};
  const start=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
  return {active:true,start,end:start+864e5};
}

/* ── بطاقة الكهف ── */
function zfKahfState(win){
  let visits={};
  try{visits=JSON.parse(localStorage.getItem(ZF_KAHF_KEY)||"{}")||{}}catch(_){}
  const [first,last]=ZF_KAHF_PAGES,total=last-first+1;
  let read=0,next=null;
  for(let p=first;p<=last;p++){
    const at=Number(visits[p]);
    if(at>=win.start&&at<win.end)read++;
    else if(next===null)next=p;
  }
  return {read,total,next:next??first};
}
function zfKahfRender(){
  const host=ztEl("zt-kahf");
  if(!host)return;
  const win=zfFriday();
  let html="";
  if(win.active){
    const {read,total,next}=zfKahfState(win);
    const icon=`<span class="zf-kahf-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/></svg></span>`;
    const chevron=`<span class="zf-kahf-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></span>`;
    if(read>=total){
      html=`<div class="zf-kahf done" role="status">
        <span class="zf-kahf-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
        <span class="zt-card-text"><span class="zt-eyebrow">سورة الكهف</span><span class="zf-kahf-title">قرأتها اليوم، تقبّل الله منك</span></span></div>`;
    }else if(read===0){
      html=`<a class="zf-kahf" href="reader.html?page=${ZF_KAHF_PAGES[0]}&amp;from=zad">${icon}
        <span class="zt-card-text"><span class="zt-eyebrow">سنّة يوم الجمعة</span><span class="zf-kahf-title">هل قرأت سورة الكهف اليوم؟</span>
        <span class="zt-sub">${ztArabic(total)} صفحة · من الصفحة ${ztArabic(ZF_KAHF_PAGES[0])}</span></span>${chevron}</a>`;
    }else{
      html=`<a class="zf-kahf progress" href="reader.html?page=${next}&amp;from=zad">
        <span class="zt-card-row">${icon}
          <span class="zt-card-text"><span class="zt-eyebrow">سورة الكهف</span><span class="zf-kahf-title">تابع من الصفحة ${ztArabic(next)}</span></span>${chevron}</span>
        <span class="zt-progress"><span class="zt-progress-row"><span>قرأت ${ztArabic(read)} من ${ztArabic(total)} صفحة</span><span>بقي ${ztArabic(total-read)}</span></span>
          <span class="zt-bar"><i style="width:${(read/total*100).toFixed(1)}%"></i></span></span></a>`;
    }
  }
  if(host.dataset.zfHtml===html)return;
  host.dataset.zfHtml=html;
  host.innerHTML=html;
  host.hidden=!html;
}

/* ── «وردك اليوم» ──
   ثلاثة أذكار، مئة مرة لكلٍّ منها، ويتجدد العدّ بعد الفجر (أو منتصف الليل بلا مدينة). */
const ZW_KEY="zad:wird-v1";
const ZW_GOAL=100;
const ZW_ITEMS=[
  {text:"أستغفر الله",tab:"أستغفر الله"},
  {text:"لا إله إلا الله",tab:"لا إله إلا الله"},
  {text:"اللهم صلّ على سيدنا محمد",tab:"الصلاة على النبي ﷺ"}
];
const ZW_RING=213.6,ZW_BIG=691.15;   /* محيط الحلقة الصغيرة (r=34) والكبيرة (r=110) */
let zwActive=0;
function zwDayKey(now=Date.now()){
  const cfg=typeof ptGet==="function"&&typeof ptReady==="function"&&ptReady()?ptGet():null;
  if(cfg){
    try{
      const fajr=ptTimes(cfg,new Date(now)).fajr.getTime();
      return dateISOInZone(new Date(now<fajr?now-864e5:now),cfg.tz);
    }catch(_){}
  }
  const d=new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function zwLoad(){
  const day=zwDayKey();
  try{
    const saved=JSON.parse(localStorage.getItem(ZW_KEY)||"null");
    if(saved&&saved.day===day&&Array.isArray(saved.counts)&&saved.counts.length===ZW_ITEMS.length)
      return {day,counts:saved.counts.map(n=>Math.max(0,Math.min(ZW_GOAL,Number(n)||0)))};
  }catch(_){}
  return {day,counts:ZW_ITEMS.map(()=>0)};
}
function zwSave(wird){try{localStorage.setItem(ZW_KEY,JSON.stringify(wird))}catch(_){}}

function zwCardRender(){
  const host=ztEl("zt-wird");
  if(!host)return;
  const {counts}=zwLoad();
  const html=`<section class="zw-card" aria-label="وردك اليوم">
    <div class="zw-card-head"><span class="zw-card-title">وردك اليوم</span><span class="zt-sub">يتجدّد بعد الفجر</span></div>
    <div class="zw-items">${ZW_ITEMS.map((it,i)=>{
      const n=counts[i],done=n>=ZW_GOAL;
      const ring=done
        ?`<svg viewBox="0 0 84 84" aria-hidden="true"><circle class="full" cx="42" cy="42" r="34"/></svg><span class="zw-mini-mid"><svg class="zw-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>`
        :`<svg viewBox="0 0 84 84" aria-hidden="true"><circle class="bg" cx="42" cy="42" r="34"/><circle class="fg" cx="42" cy="42" r="34" style="stroke-dashoffset:${(ZW_RING*(1-n/ZW_GOAL)).toFixed(1)}"/></svg><span class="zw-mini-mid"><b>${ztArabic(n)}</b><small>من ${ztArabic(ZW_GOAL)}</small></span>`;
      return `<button class="zw-item${done?" done":""}" type="button" data-zw-open="${i}" aria-label="${it.text}، ${done?"اكتمل":ztArabic(n)+" من "+ztArabic(ZW_GOAL)}">
        <span class="zw-mini">${ring}</span><span class="zw-name">${it.text}</span></button>`;
    }).join("")}</div></section>`;
  if(host.dataset.zwHtml!==html){host.dataset.zwHtml=html;host.innerHTML=html}
  host.querySelectorAll("[data-zw-open]").forEach(b=>b.onclick=()=>zwOpen(Number(b.dataset.zwOpen)));
}

/* ── شاشة العدّ ── */
function zwOpen(i){
  zwActive=Math.max(0,Math.min(ZW_ITEMS.length-1,Number(i)||0));
  const screen=ztEl("zw-screen");
  if(!screen)return;
  screen.hidden=false;
  document.body.classList.add("zw-open");
  zwPaint();
  if(typeof zkArmRootGuard==="function")zkArmRootGuard();
  ztEl("zw-tap")?.focus({preventScroll:true});
}
function zwClose(){
  const screen=ztEl("zw-screen");
  if(!screen||screen.hidden)return false;
  screen.hidden=true;
  document.body.classList.remove("zw-open");
  zwCardRender();
  return true;
}
function zwIsOpen(){return !!ztEl("zw-screen")&&!ztEl("zw-screen").hidden}
function zwPaint(){
  const {counts}=zwLoad(),n=counts[zwActive],done=n>=ZW_GOAL;
  const tabs=ztEl("zw-tabs");
  if(tabs)tabs.innerHTML=ZW_ITEMS.map((it,i)=>`<button type="button" role="tab" class="zw-tab" aria-selected="${i===zwActive}" data-zw-tab="${i}">
      <span>${it.tab}</span><small>${counts[i]>=ZW_GOAL?"اكتمل":ztArabic(counts[i])+" / "+ztArabic(ZW_GOAL)}</small></button>`).join("");
  tabs?.querySelectorAll("[data-zw-tab]").forEach(b=>b.onclick=()=>{zwActive=Number(b.dataset.zwTab);zwPaint()});
  ztEl("zw-text").textContent=ZW_ITEMS[zwActive].text;
  const tap=ztEl("zw-tap");
  tap.classList.toggle("done",done);
  tap.setAttribute("aria-label",done?"اكتمل الذكر مئة مرة":`اضغط للعدّ، ${ztArabic(n)} من ${ztArabic(ZW_GOAL)}`);
  ztEl("zw-arc").style.strokeDashoffset=(ZW_BIG*(1-n/ZW_GOAL)).toFixed(1);
  ztEl("zw-count").textContent=ztArabic(n);
  ztEl("zw-hint").textContent=done?"تقبّل الله منك":"اضغط في أي مكان من الدائرة";
}
function zwTap(){
  const wird=zwLoad(),n=wird.counts[zwActive];
  if(n>=ZW_GOAL)return;
  wird.counts[zwActive]=n+1;
  zwSave(wird);
  /* اهتزاز خفيف مع كل نقرة، وأوضح عند المئة (أندرويد؛ آيفون لا يتيحه للمواقع). */
  try{navigator.vibrate?.(n+1>=ZW_GOAL?[40,60,40]:8)}catch(_){}
  zwPaint();
}
function zwReset(){
  const wird=zwLoad();
  wird.counts[zwActive]=0;
  zwSave(wird);
  zwPaint();
}
(function zwInit(){
  ztEl("zw-tap")?.addEventListener("click",zwTap);
  ztEl("zw-reset")?.addEventListener("click",zwReset);
  ztEl("zw-back")?.addEventListener("click",()=>{if(zwClose()&&typeof zkArmRootGuard==="function")zkArmRootGuard()});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&zwIsOpen())zwClose()});
})();
