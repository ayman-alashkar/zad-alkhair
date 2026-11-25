/* أدوات الواجهة العامة: الطبقة والحوارات والتأكيد والتنبيه والأيقونات. لا تعرف شيئًا عن الختمة. */
import { appState } from "./app-state.mjs";
import { esc } from "./format.mjs";

export function closeLayer(){document.getElementById("layer").innerHTML="";document.body.classList.remove("zk-launch-prayer");appState.selected=null;}

export function modal(html,kind=""){
  document.getElementById("layer").innerHTML=`<div class="modal${kind?` ${kind}`:""}" id="m-back"><div class="frame">${html}</div></div>`;
  document.getElementById("m-back").onclick=e=>{if(e.target.id==="m-back")closeLayer();};
}

/* نافذة تأكيد موحّدة: نفس modal/frame والعناوين والأزرار المستعملة في التطبيق. */
export function appConfirm(message,{title="تأكيد",ok="متابعة",cancel="إلغاء",danger=false}={}){
  return new Promise(resolve=>{
    const host=document.createElement("div");
    host.className="modal app-confirm-overlay";
    host.setAttribute("role","presentation");
    host.innerHTML=`<div class="frame app-confirm-card" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title">
      <div class="display" id="app-confirm-title" style="font-size:1.4rem">${esc(title)}</div>
      <p class="hint app-confirm-copy" style="margin:.7rem 0 1.1rem;line-height:2">${esc(message)}</p>
      <div class="actions">
        <button class="btn ${danger?"danger":"gold"}" data-confirm-ok>${esc(ok)}</button>
        <button class="btn quiet" data-confirm-cancel>${esc(cancel)}</button>
      </div>
    </div>`;
    document.body.appendChild(host);
    const okBtn=host.querySelector("[data-confirm-ok]");
    const cancelBtn=host.querySelector("[data-confirm-cancel]");
    let settled=false;
    const done=value=>{
      if(settled) return;
      settled=true;
      document.removeEventListener("keydown",onKey,true);
      host.remove();
      resolve(value);
    };
    const onKey=e=>{
      if(e.key==="Escape"){e.preventDefault();done(false);}
    };
    okBtn.onclick=()=>done(true);
    cancelBtn.onclick=()=>done(false);
    host.onclick=e=>{if(e.target===host)done(false);};
    document.addEventListener("keydown",onKey,true);
    requestAnimationFrame(()=>okBtn.focus({preventScroll:true}));
  });
}

/* بديل داخلي لـ prompt، بنفس نافذة التطبيق القياسية. */
export function appCopyFallback(title,value){
  return new Promise(resolve=>{
    const host=document.createElement("div");
    host.className="modal app-confirm-overlay";
    host.innerHTML=`<div class="frame app-confirm-card" role="dialog" aria-modal="true" aria-labelledby="app-copy-title">
      <div class="display" id="app-copy-title" style="font-size:1.4rem">${esc(title)}</div>
      <p class="hint" style="margin:.7rem 0 .9rem;line-height:2">تعذّر النسخ التلقائي. حدّد النص وانسخه من هنا.</p>
      <textarea class="app-copy-box" readonly>${esc(value)}</textarea>
      <div class="actions" style="margin-top:1rem">
        <button class="btn gold" data-copy-close>حسنًا</button>
      </div>
    </div>`;
    document.body.appendChild(host);
    const ta=host.querySelector("textarea");
    const close=()=>{host.remove();resolve();};
    host.querySelector("[data-copy-close]").onclick=close;
    host.onclick=e=>{if(e.target===host)close();};
    requestAnimationFrame(()=>{ta.focus({preventScroll:true});ta.select();});
  });
}

export function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),3000);}

export const BOOK_ICON=`<svg class="zk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 6.25C10.15 4.85 7.95 4.2 5.15 4.2v12.65c2.75.02 5.08.78 6.85 2.25 1.77-1.47 4.1-2.23 6.85-2.25V4.2c-2.8 0-5 .65-6.85 2.05Z"/>
  <path d="M12 6.25V19.1"/><path d="M7.25 7.55c1.2.1 2.15.38 2.9.84M16.75 7.55c-1.2.1-2.15.38-2.9.84"/>
  <path d="M4 6.25v12.8c3.15-.15 5.82.55 8 2 2.18-1.45 4.85-2.15 8-2V6.25"/>
</svg>`;

export const TG_ICON=`<svg class="tgicon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M21.35 3.32 18.2 18.18c-.24 1.05-.86 1.31-1.75.82l-4.8-3.54-2.31 2.23c-.26.25-.47.46-.97.46l.34-4.89 8.9-8.04c.39-.34-.08-.54-.6-.2L6.02 11.95l-4.73-1.48c-1.03-.32-1.05-1.03.22-1.52L19.99 1.83c.86-.32 1.61.2 1.36 1.49Z"/>
</svg>`;

export const rule=()=>`<div class="rule"><i>◆ ◆ ◆</i></div>`;
