/* ===================== البيانات ===================== */
let refreshSeq=0;
async function refresh(silent=false){
  const requestedCode=appState.code;
  if(!requestedCode) return false;
  const seq=++refreshSeq;
  let nextState;
  try{ nextState=await rpc("get_state",{p_code:requestedCode}); }
  catch(e){
    if(seq===refreshSeq&&appState.code===requestedCode&&!silent) toast("تعذّر الاتصال بقاعدة البيانات");
    return false;
  }
  /* تُهمل الاستجابة إذا بدأ جلب أحدث أو غادر المستخدم الختمة. */
  if(seq!==refreshSeq||appState.code!==requestedCode) return false;
  appState.state=nextState;
  if(!appState.state){ mineForget(appState.code); activeKhatmahForget(appState.code); khatmahStateForget(); appState.screen="notfound"; if(!silent) render(); return true; }
  if(appState.viewer && !memberOf(appState.viewer.id)){ /* حُذف أو دُمج */ appState.viewer=null; localStorage.removeItem(vKey()); }
  if(appState.screen!=="linking"){
    const me=appState.viewer?memberOf(appState.viewer.id):null;
    /* الربط شرط للدخول، ويُستثنى المنظّم ومن أُذن له */
    /* الربط شرط للدخول، ويلزم المشرف كما يلزم غيره */
    if(me && !me.linked && !me.exempt){
      /* في الختمة العامة لا يعرف القارئ مشرفها ليأذن له،
         فيُسأل بنفسه بدل أن يُساق إلى تلغرام سوقًا. */
      if(!silent){
        if(appState.state.accessType==="public" && !isOrganizer()) askReminder();
        else startLinking();
        return;
      }
      appState.screen="main";
    } else {
      appState.screen = appState.viewer ? "main" : "gate";
    }
  }
  if(appState.viewer&&appState.state) mineRemember();
  if(appState.viewer&&appState.state&&appState.screen==="main") khatmahStateSave();
  if(!silent) render();
  return true;
}

/* Last known state of the active khatmah, so its tab opens at once and the
   server answer only corrects it. Every action still goes to the server. */
const KHATMAH_STATE_KEY="zad:khatmah-state-v1";
function khatmahStateSave(){
  try{localStorage.setItem(KHATMAH_STATE_KEY,JSON.stringify({code: appState.code,state: appState.state}))}catch(_){}
}
function khatmahStateSaved(c){
  try{
    const saved=JSON.parse(localStorage.getItem(KHATMAH_STATE_KEY)||"null");
    return saved&&saved.code===c&&saved.state&&Array.isArray(saved.state.juz)?saved.state:null;
  }catch(_){return null}
}
function khatmahStateForget(){try{localStorage.removeItem(KHATMAH_STATE_KEY)}catch(_){}}

async function doSignIn(id,name,ocode){
  let r;
  try{ r=await rpc("sign_in",{p_code:appState.code,p_id:id,p_name:name,
        p_device:deviceId(),p_org_code:ocode}); }
  catch(e){ return toast("تعذّر الاتصال"); }
  if(!r||!r.ok){
    if(r&&r.needCode){ appState.gateName=name; appState.screen="gate"; render(); return; }
    if(r&&r.taken) return nameTaken(r.name,r.linked,id);
    return toast((r&&r.error)||"تعذّر الدخول");
  }
  appState.viewer={id:r.id,name:r.name};
  localStorage.setItem(vKey(),JSON.stringify(appState.viewer));
  activeKhatmahSet(appState.code,true);
  if(ocode) localStorage.setItem(cKey(),ocode);
  appState.gateName="";
  if(!await refresh(true)){
    appState.screen="gate"; render(); toast("تعذّر الاتصال بقاعدة البيانات"); return;
  }
  const me=memberOf(appState.viewer.id);
  if(me&&!me.linked&&!me.exempt){
    if(appState.state.accessType==="public"&&!isOrganizer()) askReminder();
    else startLinking();
    return;
  }
  render();
  toast("أهلًا بك");
}

/* الاسم مسجَّل من متصفح آخر. إن كان صاحبه مربوطًا بتيليغرام، يثبت أنه هو من هناك
   ويدخل فورًا؛ وإلا فالمنظّم وحده يفتحه له. */
function nameTaken(name,linked,id){
  if(linked){
    modal(`<div class="display" style="font-size:1.4rem">هذا الاسم مسجَّل</div>
      <p class="hint" style="margin:.7rem 0 1.1rem;line-height:2">
        اسم «${esc(name)}» مسجَّل من جهاز أو متصفح آخر.<br>
        إن كان اسمك، فادخل عبر تيليغرام المربوط به.<br>
        وإلا فادخل باسم يميّزك عنه.</p>
      <div class="actions">
        <button class="btn tg-login" id="nt-tg">${TG_ICON}<span>هذا اسمي، ادخل عبر تيليغرام</span></button>
        <button class="btn quiet" id="nt-ok">ليس اسمي</button></div>`);
    document.getElementById("nt-tg").onclick=()=>{closeLayer();tgLogin(id);};
    document.getElementById("nt-ok").onclick=closeLayer;
    return;
  }
  modal(`<div class="display" style="font-size:1.4rem">هذا الاسم لصاحبه</div>
    <p class="hint" style="margin:.7rem 0 1.1rem;line-height:2">
      اسم «${esc(name)}» مسجَّل من جهاز آخر، فلا يُدخل به من هنا.<br>
      إن كان اسمك أنت وغيّرت هاتفك، فاطلب من المنظّم فتحه لك.<br>
      وإلا فادخل باسم يميّزك عنه.</p>
    <div class="actions"><button class="btn gold" id="nt-ok">حسنًا</button></div>`);
  document.getElementById("nt-ok").onclick=closeLayer;
}

/* القارئ داخل الختمة باسمه، لكن هذا المتصفح غير مسجّل لهذا الاسم (فُتح الاسم ثم
   أُقفل، أو مُسح تخزين المتصفح جزئيًا). المربوط بتيليغرام يؤكد من هناك ثم يعيد
   ما كان يفعله؛ وغيره يحتاج المنظّم. */
function deviceNotRecognised(){
  if(tgLoginTimer||document.getElementById("nt-tg")||document.getElementById("dn-ok")) return;
  const me=appState.viewer?memberOf(appState.viewer.id):null;
  if(me&&me.linked){
    modal(`<div class="display" style="font-size:1.35rem">هذا المتصفح غير مسجَّل باسمك</div>
      <p class="hint" style="margin:.7rem 0 1.1rem;line-height:2">
        لتكمل باسم «${esc(me.name)}» من هنا، أكّد عبر تيليغرام المربوط به، ثم أعد ما كنت تفعله.</p>
      <div class="actions">
        <button class="btn tg-login" id="nt-tg">${TG_ICON}<span>تأكيد عبر تيليغرام</span></button>
        <button class="btn quiet" id="dn-ok">لاحقًا</button></div>`);
    document.getElementById("nt-tg").onclick=()=>{closeLayer();tgLogin(appState.viewer&&appState.viewer.id);};
    document.getElementById("dn-ok").onclick=closeLayer;
    return;
  }
  modal(`<div class="display" style="font-size:1.35rem">هذا المتصفح غير مسجَّل باسمك</div>
    <p class="hint" style="margin:.7rem 0 1.1rem;line-height:2">
      اسمك مسجَّل من جهاز آخر، فلا يُعدَّل من هنا. اطلب من المنظّم فتحه لك.</p>
    <div class="actions"><button class="btn gold" id="dn-ok">حسنًا</button></div>`);
  document.getElementById("dn-ok").onclick=closeLayer;
}

function askSimilar(list,typed){
  const rows=list.map(m=>{
    const n=appState.state.juz.filter(j=>j.ownerId===m.id).length;
    return `<button class="asg-row" data-pick="${esc(m.id)}">
      <span class="avatar">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <span class="asg-name">${esc(m.name)}</span>
      <span class="asg-n">${n?`${ar(n)} ${n===1?"جزء":"أجزاء"}`:"لم يحجز"}</span>
    </button>`;
  }).join("");

  modal(`<div class="display" style="font-size:1.35rem">هل أنت أحد هؤلاء؟</div>
    <p class="hint" style="margin:.6rem 0 1rem">
      كتبت «${esc(typed)}»، ويوجد في الختمة اسم يشبهه.
      إن كان أحدهم اسمك فاختره لتجد أجزاءك وتذكيرك كما تركتها.</p>
    <div class="asg-list">${rows}</div>
    <div class="actions" style="margin-top:1rem">
      <button class="btn quiet" id="sim-no">لا، أنا شخص آخر</button></div>`);

  document.querySelectorAll("[data-pick]").forEach(b=>b.onclick=async()=>{
    const m=list.find(x=>x.id===b.dataset.pick);
    closeLayer();
    if(m.id===appState.state.organizerId){ appState.gateName=m.name; appState.screen="gate"; render(); return; }
    await doSignIn(m.id,m.name,null);
  });

  document.getElementById("sim-no").onclick=async()=>{
    closeLayer();
    const id=keyOf(typed);
    if(id===appState.state.organizerId){ appState.gateName=typed; appState.screen="gate"; render(); return; }
    await doSignIn(id,typed,null);
  };
}
