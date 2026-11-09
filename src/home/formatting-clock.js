/* ===================== أدوات ===================== */
const AR="٠١٢٣٤٥٦٧٨٩";
const ar=n=>String(n).replace(/\d/g,d=>AR[+d]);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=s=>String(s||"").normalize("NFC").trim().replace(/\s+/g," ");
/* تطبيع الحروف مع إبقاء المسافات، ليمكن تفكيك الاسم إلى كلمات.
   المدى \u064B-\u0652 للتشكيل وحده ولا يمسّ الحروف. */
const araNorm=s=>norm(s)
  .replace(/[\u064B-\u0652\u0670\u0640]/g,"")   /* تشكيل وتطويل */
  .replace(/[أإآٱ]/g,"ا")                        /* الهمزات على الألف */
  .replace(/ؤ/g,"و").replace(/ئ/g,"ي")           /* تُبدَّل لا تُحذف، فلا يقصر الاسم */
  .replace(/ء/g,"")
  .replace(/ى/g,"ي").replace(/ة/g,"ه")
  .toLowerCase();

/* مفتاح الهوية: بلا مسافات */
const keyOf=s=>araNorm(s).replace(/\s+/g,"");
const MONTHS=["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
const daysLeft=e=>Math.max(0,Math.ceil((new Date(e+"T23:59:59")-new Date())/864e5));
const isoParts=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayISO=()=>isoParts(new Date());
const plusDays=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return isoParts(d);};
const fmtG=iso=>{const d=new Date(iso+"T12:00:00");return `${ar(d.getDate())} ${MONTHS[d.getMonth()]}`;};
/* withPeriod=false يحذف «صباحًا/ظهرًا/…» حيث يغني عنها اسم الصلاة. */
const fmtTime=(h,m,withPeriod=true)=>{
  const per = h<12 ? "صباحًا" : h<15 ? "ظهرًا" : h<17 ? "عصرًا" : "مساءً";
  const h12 = h%12===0 ? 12 : h%12;
  const clock=`${ar(h12)}:${ar(String(m).padStart(2,"0"))}`;
  return withPeriod ? `${clock} ${per}` : clock;
};
const hourOptions=sel=>Array.from({length:24},(_,h)=>
  `<option value="${h}" ${h===sel?"selected":""}>${fmtTime(h,0)}</option>`).join("");
const fmtH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long"});}catch(e){return "";}};

/* ═══════════ موعد الختمة والوقت المتبقّي ═══════════ */
const WEEKDAYS=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const fmtClockG=iso=>{const d=new Date(iso+"T12:00:00");return `${WEEKDAYS[d.getDay()]} ${ar(d.getDate())} ${MONTHS[d.getMonth()]} ${ar(d.getFullYear())}`;};
const fmtClockH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long",year:"numeric"});}catch(e){return "";}};

function deadlineDialog(){
  if(!state||!state.endDate) return;
  modal(`<div class="deadline-dialog" role="dialog" aria-modal="true" aria-label="موعد انتهاء الختمة">
    <p class="deadline-copy">التاريخ المتفق عليه للانتهاء من القراءة الجماعية لهذه الختمة هو:</p>
    <div class="deadline-date-field">
      <span class="deadline-date-g">${esc(fmtClockG(state.endDate))}</span>
      <span class="deadline-date-h">${esc(fmtClockH(state.endDate))}</span>
    </div>
    <button class="btn gold" id="deadline-close">إغلاق</button>
  </div>`);
  document.getElementById("deadline-close").onclick=closeLayer;
}

/* الوقت المتبقّي حتى نهاية يوم الموعد، في لوحة التقدّم (khatmahProgress). */
const dayWord=n=>n===1?"يوم":n===2?"يومان":n<=10?`${ar(n)} أيام`:`${ar(n)} يومًا`;
function zTick(){
  const hms=document.getElementById("cd-hms");
  if(!hms||!state||!state.endDate) return;
  const days=document.getElementById("cd-days"), lab=document.getElementById("cd-lab");
  const left=new Date(state.endDate+"T23:59:59").getTime()-Date.now();
  if(left<=0){
    if(lab) lab.textContent="انقضى وقت الختمة";
    if(days) days.textContent="";
    hms.textContent=ar("00:00:00");
    return;
  }
  const t=Math.floor(left/1000), p=v=>String(v).padStart(2,"0"), d=Math.floor(t/86400);
  if(days) days.textContent=d?dayWord(d):"";
  hms.textContent=ar(`${p(Math.floor(t/3600)%24)}:${p(Math.floor(t/60)%60)}:${p(t%60)}`);
}
/* حلقة تُصحّح انحرافها، فتقع كل نبضة على رأس الثانية */
function zLoop(){ zTick(); setTimeout(zLoop, 1000-(Date.now()%1000)); }
