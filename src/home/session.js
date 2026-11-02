function zkReplaceHash(value=""){
  try{
    const url=new URL(location.href);url.hash=value?String(value):"";
    history.replaceState(history.state,"",url.href);
  }catch(_){location.hash=value?String(value):""}
}
/* الختمة النشطة:
   - LAST: آخر ختمة مؤكدة لهذا الجهاز، وتبقى بعد إغلاق التطبيق.
   - ACTIVE_SESSION: سياق الرابط/الاختيار الحالي في هذا التبويب.
   عند وجود الاثنين، سياق الجلسة هو الأحدث والأولى بالفتح. */
const LAST="zad:last";
const ACTIVE_SESSION="zad:active-khatmah-session";
function cleanKhatmahCode(value){
  return String(value||"").trim().toUpperCase().slice(0,4);
}
function activeSessionGet(){
  try{return cleanKhatmahCode(sessionStorage.getItem(ACTIVE_SESSION));}catch(_){return ""}
}
function activeKhatmahGet(){
  const session=activeSessionGet();
  if(session)return session;
  try{return cleanKhatmahCode(localStorage.getItem(LAST));}catch(_){return ""}
}
function activeKhatmahSet(value,persist=false){
  const c=cleanKhatmahCode(value);if(!c)return "";
  try{sessionStorage.setItem(ACTIVE_SESSION,c);}catch(_){ }
  if(persist){try{localStorage.setItem(LAST,c);}catch(_){ }}
  return c;
}
function activeKhatmahForget(value=""){
  const c=cleanKhatmahCode(value),session=activeSessionGet();
  try{if(!c||session===c)sessionStorage.removeItem(ACTIVE_SESSION);}catch(_){ }
  try{const last=cleanKhatmahCode(localStorage.getItem(LAST));if(!c||last===c)localStorage.removeItem(LAST);}catch(_){ }
}
const linkFor=c=>location.origin+location.pathname+"#"+c;
const vKey=()=>"zad:viewer:"+code;

/* ختمات هذا الجهاز: يُبنى منها شريط «ختماتي» في الرئيسية،
   فيعود القارئ إلى ختمته بضغطة، بلا رمز ولا اسم. */
const MINE="zad:mine";
function mineGet(){
  try{ const v=JSON.parse(localStorage.getItem(MINE)); return Array.isArray(v)?v:[]; }
  catch(e){ return []; }
}
function minePut(list){
  try{ localStorage.setItem(MINE,JSON.stringify(list.slice(0,12))); }catch(e){}
}
function mineRemember(){
  if(!code||!viewer||!state) return;
  activeKhatmahSet(code,true);
  const rest=mineGet().filter(x=>x.code!==code);
  rest.unshift({code,name:viewer.name,title:state.title||"",
                publicId:state.publicId||null,at:Date.now()});
  minePut(rest);
}
function mineForget(c){ minePut(mineGet().filter(x=>x.code!==c)); }

/* Remove legacy entries whose khatmahs were cancelled on another session.
   A network/RPC failure always keeps the entry; only an authoritative null
   response from get_state is allowed to remove it. */
let minePrunePromise=null;
function minePruneMissing(){
  if(minePrunePromise||!navigator.onLine) return minePrunePromise||Promise.resolve(false);
  const snapshot=mineGet();
  if(!snapshot.length) return Promise.resolve(false);
  minePrunePromise=(async()=>{
    const checks=await Promise.all(snapshot.map(async item=>{
      try{
        const remote=await rpc("get_state",{p_code:item.code});
        return {code:item.code,missing:remote===null};
      }catch(_){ return {code:item.code,missing:false}; }
    }));
    const missing=new Set(checks.filter(x=>x.missing).map(x=>x.code));
    if(!missing.size) return false;
    minePut(mineGet().filter(item=>!missing.has(item.code)));
    if(screen==="home") render();
    return true;
  })().finally(()=>{minePrunePromise=null});
  return minePrunePromise;
}
const cKey=()=>"zad:orgcode:"+code;
const orgCode=()=>localStorage.getItem(cKey())||null;
