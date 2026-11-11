/* ═══════════ إحصاءات الاستعمال المجهولة ═══════════
   تُعدّ على الجهاز مرات فتح كل قسم وثواني الاستماع، وتُرسل مجمّعة لكل يوم إلى
   record_usage في Supabase مع المنطقة الزمنية للجهاز. لا يُرسل اسم ولا نص ولا سورة ولا قارئ؛ المعرّف عشوائي،
   وهو نفسه معرّف عدّ التثبيتات (zad:pwa-install-id)، لا معرّف الختمات.
   القياس لا يؤخر الإقلاع، ولا يعطّل شيئًا إن فشل أو انقطعت الشبكة.
   ?nostats يوقف الإرسال من هذا الجهاز نهائيًا، و?stats يعيده. */
const ZU_ENDPOINT="https://webqpbcijjbawatykoxe.supabase.co/rest/v1/rpc/record_usage";
const ZU_KEY="sb_publishable_51JPJ2XgwWW5l66bwqHN3Q_CJrEtyZv";
const ZU_STORE="zad:usage-v1";
const ZU_OFF="zad:usage-off";
const ZU_ID_KEY="zad:pwa-install-id";
const ZU_LOCK="zad:usage-flush-at";
const ZU_SURFACES=["home","prayer","khatmahs","adhkar","quran","reader","listen"];
const ZU_KEYS=ZU_SURFACES.concat("listen_seconds","tayassar_seconds");
const ZU_KEEP_DAYS=6;          /* الخادم يقبل أيام الأسبوع الأخير فقط */
const ZU_REOPEN_MS=30*60*1000; /* العودة إلى التطبيق بعد نصف ساعة في الخلفية تُعدّ فتحًا جديدًا */

(function zuReadSwitch(){
  try{
    const q=new URLSearchParams(location.search);
    if(q.has("nostats")){localStorage.setItem(ZU_OFF,"1");localStorage.removeItem(ZU_STORE)}
    else if(q.has("stats"))localStorage.removeItem(ZU_OFF);
  }catch(_){ }
})();
function zuOff(){try{return localStorage.getItem(ZU_OFF)==="1"}catch(_){return true}}

/* اليوم بتوقيت مكة (UTC+3، ولا توقيت صيفي فيه)، ليوافق أغلب المستخدمين والتقويم الهجري. */
function zuDay(t=Date.now()){return new Date(t+3*3600*1000).toISOString().slice(0,10)}

function zuDeviceId(){
  try{
    let id=localStorage.getItem(ZU_ID_KEY);
    const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(id&&valid.test(id))return id;
    if(crypto.randomUUID)id=crypto.randomUUID();
    else{
      const b=new Uint8Array(16);crypto.getRandomValues(b);
      b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
      const h=[...b].map(v=>v.toString(16).padStart(2,"0")).join("");
      id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    }
    localStorage.setItem(ZU_ID_KEY,id);
    return id;
  }catch(_){return null}
}
function zuPlatform(){
  const ua=navigator.userAgent||"";
  const uaPlatform=navigator.userAgentData&&navigator.userAgentData.platform||"";
  if(/Android/i.test(ua)||/Android/i.test(uaPlatform))return "android";
  if(/iPad|iPhone|iPod/i.test(ua)||
     /iPad|iPhone|iPod|iOS/i.test(uaPlatform)||
     (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1))return "ios";
  if(/Windows|Macintosh|MacIntel|Linux|CrOS/i.test(`${ua} ${uaPlatform} ${navigator.platform||""}`))return "desktop";
  return "other";
}
/* المنطقة الزمنية للجهاز (مثل Asia/Damascus) تدل على البلد في الغالب، دون عنوان IP. */
function zuTimeZone(){
  try{return String(Intl.DateTimeFormat().resolvedOptions().timeZone||"").slice(0,64)||null}catch(_){return null}
}
function zuInstalled(){
  try{return window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(_){return false}
}

/* ── المخزن المحلي: { "2026-11-11": { home: 2, listen_seconds: 340, … }, … } ── */
function zuRead(){
  try{const v=JSON.parse(localStorage.getItem(ZU_STORE)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
  catch(_){return {}}
}
function zuWrite(store){try{localStorage.setItem(ZU_STORE,JSON.stringify(store))}catch(_){}}
function zuAdd(counts){
  if(zuOff())return;
  const store=zuRead(),day=zuDay(),oldest=zuDay(Date.now()-ZU_KEEP_DAYS*86400000);
  for(const d of Object.keys(store))if(d<oldest)delete store[d];
  const row=store[day]||(store[day]={});
  for(const [key,n] of Object.entries(counts)){
    if(!ZU_KEYS.includes(key)||!(n>0))continue;
    row[key]=(row[key]||0)+Math.round(n);
  }
  if(!Object.keys(row).length)delete store[day];
  zuWrite(store);
}
/* بعد الإرسال يُطرح ما أُرسل فقط، فلا يضيع ما أُضيف أثناء الطلب. */
function zuSubtract(day,sent){
  const store=zuRead(),row=store[day];
  if(!row)return;
  for(const [key,n] of Object.entries(sent)){
    row[key]=(row[key]||0)-n;
    if(row[key]<=0)delete row[key];
  }
  if(!Object.keys(row).length)delete store[day];
  zuWrite(store);
}

/* ── الأقسام: يُعدّ القسم حين يبقى ظاهرًا ٦٠٠ ملّي ثانية، فلا تُعدّ المراحل العابرة. ── */
let zuShown=null,zuWanted=null,zuSurfaceTimer=0,zuHiddenAt=0;
function zuSurface(name){
  if(!ZU_SURFACES.includes(name))return;
  zuWanted=name;
  clearTimeout(zuSurfaceTimer);
  zuSurfaceTimer=setTimeout(()=>{
    if(document.hidden||zuWanted===zuShown)return;
    zuShown=zuWanted;
    zuAdd({[zuShown]:1});
  },600);
}

/* ── الاستماع: الثواني التي كان الصوت يعمل فيها فعلًا. ── */
let zuAudioFrom=0,zuAudioCarry=0,zuAudioTayassar=()=>false;
function zuCommitAudio(keepGoing){
  if(!zuAudioFrom)return;
  const now=Date.now(),ms=now-zuAudioFrom;
  zuAudioFrom=keepGoing?now:0;
  /* أكثر من ساعة بين حدثين لا يكون استماعًا متصلًا (نوم الجهاز أو تغيّر ساعته). */
  if(ms<=0||ms>3600*1000)return;
  const total=ms+zuAudioCarry,secs=Math.floor(total/1000);
  zuAudioCarry=total-secs*1000;
  if(!secs)return;
  let tayassar=false;try{tayassar=!!zuAudioTayassar()}catch(_){}
  zuAdd(tayassar?{listen_seconds:secs,tayassar_seconds:secs}:{listen_seconds:secs});
}
function zuTrackAudio(el,isTayassar){
  if(!el)return;
  if(typeof isTayassar==="function")zuAudioTayassar=isTayassar;
  el.addEventListener("playing",()=>{if(!zuAudioFrom)zuAudioFrom=Date.now()});
  for(const type of ["pause","ended","waiting","emptied","error"])el.addEventListener(type,()=>zuCommitAudio(false));
  /* يُحفظ ما سُمع كل نصف دقيقة، فلا يضيع إن أُغلق التطبيق من الخلفية فجأة. */
  setInterval(()=>zuCommitAudio(true),30000);
}

/* ── الإرسال: طلب واحد لكل يوم فيه أرقام، ومن نافذة واحدة في كل مرة. ── */
let zuFlushing=false;
async function zuFlush(){
  zuCommitAudio(true);
  if(zuFlushing||zuOff()||navigator.onLine===false)return;
  const store=zuRead(),days=Object.keys(store).sort();
  if(!days.length)return;
  try{
    if(Date.now()-(Number(localStorage.getItem(ZU_LOCK))||0)<15000)return;
    localStorage.setItem(ZU_LOCK,String(Date.now()));
  }catch(_){return}
  const id=zuDeviceId();
  if(!id)return;
  zuFlushing=true;
  try{
    for(const day of days){
      const counts=store[day];
      const r=await fetch(ZU_ENDPOINT,{
        method:"POST",keepalive:true,
        headers:{"Content-Type":"application/json",apikey:ZU_KEY,Authorization:"Bearer "+ZU_KEY},
        body:JSON.stringify({p_device:id,p_day:day,p_platform:zuPlatform(),p_installed:zuInstalled(),p_tz:zuTimeZone(),p_counts:counts})
      });
      /* رفض الخادم (يوم أقدم من المسموح مثلًا) يُسقط هذا اليوم؛ عطل الخادم يُبقيه للمرة القادمة. */
      if(r.ok||(r.status>=400&&r.status<500))zuSubtract(day,counts);
      else break;
    }
  }catch(_){
    /* الإحصاءات لا تتدخل في عمل التطبيق أو عمله دون اتصال. */
  }finally{
    zuFlushing=false;
    try{localStorage.removeItem(ZU_LOCK)}catch(_){}
  }
}

document.addEventListener("visibilitychange",()=>{
  if(document.hidden){zuHiddenAt=Date.now();zuFlush();return}
  if(zuHiddenAt&&Date.now()-zuHiddenAt>ZU_REOPEN_MS)zuShown=null;
  zuHiddenAt=0;
  if(zuWanted)zuSurface(zuWanted);
});
window.addEventListener("pagehide",()=>zuFlush());
/* الرجوع إلى صفحة من ذاكرة المتصفح فتح جديد لها. */
window.addEventListener("pageshow",event=>{if(event.persisted){zuShown=null;if(zuWanted)zuSurface(zuWanted)}});
window.addEventListener("online",()=>zuFlush());
setTimeout(()=>zuFlush(),4000);
setInterval(()=>zuFlush(),15*60*1000);
