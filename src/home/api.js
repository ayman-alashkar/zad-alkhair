/* ===================== نداء قاعدة البيانات ===================== */
const pendingRequests=new Map();

async function postJSON(url,payload,options={}){
  const key=options.key||"";
  if(key&&pendingRequests.has(key)) return pendingRequests.get(key);

  const task=(async()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),options.timeout||15000);
    try{
      const r=await fetch(url,{
        method:"POST",
        headers:{"Content-Type":"application/json",...(options.headers||{})},
        body:JSON.stringify(payload||{}),
        signal:controller.signal,
        keepalive:!!options.keepalive
      });
      const text=await r.text();
      let data=null;
      if(text){
        try{ data=JSON.parse(text); }
        catch(e){ if(r.ok) throw new Error("Invalid JSON"); }
      }
      if(!r.ok){
        const err=new Error((data&&data.error)||text||("HTTP "+r.status));
        err.status=r.status;
        /* إن طلب الخادم الانتظار (خصوصًا 429) نحترم Retry-After. */
        const retryAfter=r.headers&&r.headers.get?r.headers.get("Retry-After"):null;
        if(retryAfter){
          const seconds=Number(retryAfter),at=Date.parse(retryAfter);
          err.retryAfter=Number.isFinite(seconds)
            ?Math.max(0,seconds*1000)
            :Number.isFinite(at)?Math.max(0,at-Date.now()):0;
        }
        throw err;
      }
      return data;
    }finally{ clearTimeout(timer); }
  })();

  if(key) pendingRequests.set(key,task);
  try{ return await task; }
  finally{ if(key&&pendingRequests.get(key)===task) pendingRequests.delete(key); }
}

const RPC_HEADERS={apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY};
const DEVICE_LOCK_ERRS=["مقفول على جهاز صاحبه","هذا السجل لصاحب الحساب فقط"];
let rebinding=null;

/* من دخل قبل ترحيل قفل الجهاز يبقى جهازه غير مسجَّل في القاعدة،
   فتُردّ أفعاله كلّها. نربط الجهاز مرّة ثم نعيد الفعل، فلا يُضطرّ
   القارئ إلى الخروج والعودة. وإن كان الاسم مقفولًا على جهاز آخر
   حقًّا، أخفق التسجيل وبقي الرفض على حاله. */
async function rebindDevice(){
  if(rebinding) return rebinding;
  rebinding=(async()=>{
    try{
      const r=await postJSON(`${SUPABASE_URL}/rest/v1/rpc/sign_in`,
        {p_code:code,p_id:viewer.id,p_name:viewer.name,
         p_device:deviceId(),p_org_code:orgCode()},
        {headers:RPC_HEADERS});
      return !!(r&&r.ok);
    }catch(e){ return false; }
  })();
  const out=await rebinding;
  rebinding=null;
  return out;
}

async function rpc(fn, args){
  const body=args||{};
  const call=()=>postJSON(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,body,{
    headers:RPC_HEADERS,
    key:`rpc:${fn}:${JSON.stringify(body)}`
  });
  const r=await call();
  const locked=r&&r.ok===false&&typeof r.error==="string"
    &&DEVICE_LOCK_ERRS.some(m=>r.error.indexOf(m)!==-1);
  if(locked&&fn!=="sign_in"&&viewer&&code&&await rebindDevice()) return call();
  return r;
}

const edge=(fn,body,options={})=>postJSON(
  `${SUPABASE_URL}/functions/v1/${fn}`,body,
  {...options,key:options.key||`edge:${fn}:${JSON.stringify(body||{})}`});
