/* ===================== البيانات ===================== */
let refreshSeq=0;
async function refresh(silent=false){
  if(!code) return false;
  const seq=++refreshSeq;
  let nextState;
  try{ nextState=await rpc("get_state",{p_code:code}); }
  catch(e){
    if(seq===refreshSeq&&!silent) toast("تعذّر الاتصال بقاعدة البيانات");
    return false;
  }
  /* لا تسمح لاستجابة أقدم أن تمحو حالة جلب أحدث. */
  if(seq!==refreshSeq) return false;
  state=nextState;
  if(!state){ mineForget(code); activeKhatmahForget(code); screen="notfound"; if(!silent) render(); return true; }
  if(viewer && !memberOf(viewer.id)){ /* حُذف أو دُمج */ viewer=null; localStorage.removeItem(vKey()); }
  if(screen!=="linking"){
    const me=viewer?memberOf(viewer.id):null;
    /* الربط شرط للدخول، ويُستثنى المنظّم ومن أُذن له */
    /* الربط شرط للدخول، ويلزم المشرف كما يلزم غيره */
    if(me && !me.linked && !me.exempt){
      /* في الختمة العامة لا يعرف القارئ مشرفها ليأذن له،
         فيُسأل بنفسه بدل أن يُساق إلى تلغرام سوقًا. */
      if(!silent){
        if(state.accessType==="public" && !isOrganizer()) askReminder();
        else startLinking();
        return;
      }
      screen="main";
    } else {
      screen = viewer ? "main" : "gate";
    }
  }
  if(viewer&&state) mineRemember();
  if(!silent) render();
  return true;
}

async function doSignIn(id,name,ocode){
  let r;
  try{ r=await rpc("sign_in",{p_code:code,p_id:id,p_name:name,
        p_device:deviceId(),p_org_code:ocode}); }
  catch(e){ return toast("تعذّر الاتصال"); }
  if(!r||!r.ok){
    if(r&&r.needCode){ gateName=name; screen="gate"; render(); return; }
    if(r&&r.taken) return nameTaken(r.name);
    return toast((r&&r.error)||"تعذّر الدخول");
  }
  viewer={id:r.id,name:r.name};
  localStorage.setItem(vKey(),JSON.stringify(viewer));
  activeKhatmahSet(code,true);
  if(ocode) localStorage.setItem(cKey(),ocode);
  gateName="";
  if(!await refresh(true)){
    screen="gate"; render(); toast("تعذّر الاتصال بقاعدة البيانات"); return;
  }
  const me=memberOf(viewer.id);
  if(me&&!me.linked&&!me.exempt){
    if(state.accessType==="public"&&!isOrganizer()) askReminder();
    else startLinking();
    return;
  }
  render();
  toast("أهلًا بك");
}

function nameTaken(name){
  modal(`<div class="display" style="font-size:1.4rem">هذا الاسم لصاحبه</div>
    <p class="hint" style="margin:.7rem 0 1.1rem;line-height:2">
      اسم «${esc(name)}» مسجَّل من جهاز آخر، فلا يُدخل به من هنا.<br>
      إن كان اسمك أنت وغيّرت هاتفك، فاطلب من المنظّم فتحه لك.<br>
      وإلا فادخل باسم يميّزك عنه.</p>
    <div class="actions"><button class="btn gold" id="nt-ok">حسنًا</button></div>`);
  document.getElementById("nt-ok").onclick=closeLayer;
}

function askSimilar(list,typed){
  const rows=list.map(m=>{
    const n=state.juz.filter(j=>j.ownerId===m.id).length;
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
    if(m.id===state.organizerId){ gateName=m.name; screen="gate"; render(); return; }
    await doSignIn(m.id,m.name,null);
  });

  document.getElementById("sim-no").onclick=async()=>{
    closeLayer();
    const id=keyOf(typed);
    if(id===state.organizerId){ gateName=typed; screen="gate"; render(); return; }
    await doSignIn(id,typed,null);
  };
}
