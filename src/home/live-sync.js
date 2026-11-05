/* ═══════════ التحديث الفوري للختمة (Supabase Realtime) ═══════════
   قاعدة البيانات ترسل إشارة فارغة «changed» إلى القناة khatmah:<الرمز> عند أي تغيير
   في الختمة أو أعضائها أو أجزائها (ترحيل 20261105050000). نستمع لها هنا، ثم نطلب
   الحالة بـ get_state كما نفعل دائمًا. الإشارة لا تحمل بيانات.

   الاتصال WebSocket ببروتوكول Phoenix الذي تستعمله خدمة Realtime:
     - phx_join للاشتراك في القناة، ويرد الخادم phx_reply بالحالة ok.
     - heartbeat كل ٢٥ ثانية على الموضوع "phoenix"، وإلا أغلق الخادم الاتصال.
     - broadcast حين تصل إشارة.
   إن انقطع الاتصال يُعاد بفواصل متزايدة، ويبقى السؤال الدوري القديم احتياطًا. */
const ZL_URL=SUPABASE_URL.replace(/^http/,"ws")+"/realtime/v1/websocket?apikey="+encodeURIComponent(SUPABASE_KEY)+"&vsn=1.0.0";
const ZL_HEARTBEAT=25000;
const ZL_BACKOFF=[1000,2000,5000,10000,30000];
const ZL_DEBOUNCE=350;     /* بدء دورة جديدة يغيّر ثلاثين جزءًا: طلب واحد بعد آخرها */

let zlSocket=null,zlTopic="",zlJoined=false,zlRef=0,zlJoinRef="";
let zlHeartbeatTimer=null,zlRetryTimer=null,zlRetry=0,zlDebounceTimer=null,zlPendingTimer=null;

/* الختمة التي تهمّ الشاشة الآن: المفتوحة، أو النشطة على هذا الجهاز للرئيسية. */
function zlWantedCode(){
  const open=typeof code==="string"&&code&&typeof zkLaunchVisible==="function"&&!zkLaunchVisible()?code:"";
  return String(open||(typeof activeKhatmahGet==="function"?activeKhatmahGet():"")||"").trim().toUpperCase();
}
/* هل الاتصال الفوري سليم؟ يُبطئ السؤال الدوري حين يكون كذلك. */
function zlHealthy(){return zlJoined&&!!zlSocket&&zlSocket.readyState===1}

function zlSend(topic,event,payload,joinRef){
  if(!zlSocket||zlSocket.readyState!==1)return "";
  const ref=String(++zlRef);
  const msg={topic,event,payload:payload||{},ref};
  if(joinRef)msg.join_ref=joinRef;
  try{zlSocket.send(JSON.stringify(msg))}catch(_){return ""}
  return ref;
}
function zlJoin(){
  const wanted=zlWantedCode();
  if(!zlSocket||zlSocket.readyState!==1)return;
  if(zlTopic&&zlTopic!==wanted&&zlJoined)zlSend("realtime:khatmah:"+zlTopic,"phx_leave",{},zlJoinRef);
  zlJoined=false;zlTopic=wanted;
  if(!wanted)return;
  /* رسالة الاشتراك تحمل رقمها مرتين (ref وjoin_ref)، كما يفعل عميل Supabase نفسه. */
  zlJoinRef=String(++zlRef);
  try{zlSocket.send(JSON.stringify({topic:"realtime:khatmah:"+wanted,event:"phx_join",ref:zlJoinRef,join_ref:zlJoinRef,payload:{
    config:{broadcast:{self:false,ack:false},presence:{key:"",enabled:false},postgres_changes:[],private:false}
  }}))}catch(_){zlRestart()}
}
function zlOnMessage(event){
  let msg;try{msg=JSON.parse(event.data)}catch(_){return}
  if(!msg||typeof msg!=="object")return;
  const ours=msg.topic==="realtime:khatmah:"+zlTopic;
  if(msg.event==="phx_reply"&&ours&&msg.ref===zlJoinRef){
    if(msg.payload?.status==="ok"){
      zlJoined=true;zlRetry=0;
      /* ما تغيّر قبل الاشتراك لم تصلنا إشارته: نطلب الحالة مرة. */
      zlChanged();
    }else zlRestart();
    return;
  }
  if(ours&&(msg.event==="phx_error"||msg.event==="phx_close")){zlJoined=false;zlRestart();return}
  if(ours&&msg.event==="broadcast"&&msg.payload?.event==="changed")zlChanged();
}

function zlConnect(){
  clearTimeout(zlRetryTimer);zlRetryTimer=null;
  if(!zlWantedCode()||!("WebSocket" in window)||navigator.onLine===false)return;
  if(zlSocket&&(zlSocket.readyState===0||zlSocket.readyState===1)){if(zlTopic!==zlWantedCode())zlJoin();return}
  let socket;
  try{socket=new WebSocket(ZL_URL)}catch(_){zlScheduleRetry();return}
  zlSocket=socket;zlJoined=false;zlTopic="";
  socket.onopen=()=>{
    if(zlSocket!==socket)return;
    clearInterval(zlHeartbeatTimer);
    zlHeartbeatTimer=setInterval(()=>zlSend("phoenix","heartbeat",{}),ZL_HEARTBEAT);
    zlJoin();
  };
  socket.onmessage=zlOnMessage;
  socket.onclose=()=>{
    if(zlSocket!==socket)return;
    clearInterval(zlHeartbeatTimer);zlHeartbeatTimer=null;
    zlSocket=null;zlJoined=false;
    zlScheduleRetry();
  };
  socket.onerror=()=>{try{socket.close()}catch(_){}};
}
function zlScheduleRetry(){
  clearTimeout(zlRetryTimer);
  if(document.hidden||!zlWantedCode())return;   /* يُستأنف عند العودة إلى التطبيق */
  const wait=ZL_BACKOFF[Math.min(zlRetry,ZL_BACKOFF.length-1)];
  zlRetry++;
  zlRetryTimer=setTimeout(zlConnect,wait);
}
function zlRestart(){
  const socket=zlSocket;
  zlSocket=null;zlJoined=false;
  clearInterval(zlHeartbeatTimer);zlHeartbeatTimer=null;
  try{socket?.close()}catch(_){}
  zlScheduleRetry();
}
/* تُستدعى حين تتغير الختمة المهمّة أو يعود الاتصال أو التطبيق إلى الواجهة. */
function zlEnsure(){
  if(!zlWantedCode()){
    if(zlSocket&&zlTopic&&zlJoined)zlSend("realtime:khatmah:"+zlTopic,"phx_leave",{},zlJoinRef);
    zlJoined=false;zlTopic="";
    return;
  }
  zlConnect();
}

/* ── إشارة وصلت: تحديث ما يظهر الآن ── */
function zlChanged(){
  clearTimeout(zlDebounceTimer);
  zlDebounceTimer=setTimeout(zlApply,ZL_DEBOUNCE);
}
async function zlApply(){
  clearTimeout(zlPendingTimer);zlPendingTimer=null;
  if(document.hidden)return;   /* التحديث عند العودة يتولاه visibilitychange */
  const launch=typeof zkLaunchVisible==="function"&&zkLaunchVisible();
  if(launch){
    if(typeof ztView==="undefined"||ztView==="today")ztReadingRender();
    return;
  }
  if(typeof screen!=="undefined"&&screen==="main"){
    /* مع نافذة مفتوحة أو جزء محدد لا يُعاد الرسم تحت يد المستخدم؛ نعيد المحاولة بعد قليل. */
    if(selected!==null||document.getElementById("layer")?.innerHTML){zlPendingTimer=setTimeout(zlApply,1500);return}
    await syncState();
  }
}

(function zlInit(){
  window.addEventListener("online",zlEnsure);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){zlRetry=0;zlEnsure()}});
})();
