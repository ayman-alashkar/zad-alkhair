const OUTBOX="zad:notification-outbox";
let outboxBusy=false;

function outboxGet(){
  try{
    const jobs=JSON.parse(localStorage.getItem(OUTBOX)||"[]");
    return Array.isArray(jobs)?jobs:[];
  }catch(e){ return []; }
}
function outboxPut(jobs){
  try{
    if(jobs.length) localStorage.setItem(OUTBOX,JSON.stringify(jobs));
    else localStorage.removeItem(OUTBOX);
  }catch(e){}
}
function enqueueEdge(fn,body,id){
  const jobs=outboxGet();
  if(!jobs.some(job=>job.id===id)){
    jobs.push({id,fn,body,createdAt:Date.now()});
    outboxPut(jobs);
  }
  flushOutbox();
}
const OUTBOX_TTL=7*864e5;             /* وبعد أسبوع يسقط العمل مهما كان */
const OUTBOX_BASE_DELAY=30000;
const OUTBOX_MAX_DELAY=6*3600000;

function outboxDrop(id){
  const rest=outboxGet().filter(j=>j.id!==id);
  outboxPut(rest);
}
function outboxRetryable(status){
  if(!Number.isFinite(status)) return true;       /* شبكة، مهلة، أو رفض منطقي */
  if(status>=500) return true;
  return status===408||status===409||status===425||status===429;
}
function outboxDelay(tries,retryAfter){
  const exp=Math.min(OUTBOX_MAX_DELAY,
    OUTBOX_BASE_DELAY*Math.pow(2,Math.min(Math.max(0,tries-1),10)));
  const jitter=Math.round(exp*(.85+Math.random()*.3));
  return Math.max(Number(retryAfter)||0,jitter);
}
function outboxPostpone(id,error){
  const list=outboxGet(),item=list.find(j=>j.id===id);
  if(!item) return;
  item.tries=(item.tries||0)+1;
  item.nextAttemptAt=Date.now()+outboxDelay(item.tries,error&&error.retryAfter);
  outboxPut(list);
}
async function flushOutbox(){
  if(outboxBusy||navigator.onLine===false) return;
  outboxBusy=true;
  try{
    const now=Date.now();
    let jobs=outboxGet();
    const fresh=jobs.filter(j=>now-(j.createdAt||now)<OUTBOX_TTL);
    if(fresh.length!==jobs.length) outboxPut(fresh);   /* أُسقط ما شاخ */

    for(const job of fresh){
      if((job.nextAttemptAt||0)>Date.now()) continue;
      try{
        const result=await edge(job.fn,job.body,
          {key:`outbox:${job.id}`,keepalive:true});
        /* وظائف Edge الحالية قد تعيد HTTP 200 مع ok:false؛
           نجاح النقل ليس نجاح العملية نفسها. */
        if(!result||result.ok!==true){
          const err=new Error((result&&result.error)||"Edge operation failed");
          if(result&&Number.isFinite(Number(result.status))) err.status=Number(result.status);
          throw err;
        }
        /* نجاح الطلب لا يكفي إذا بقي مستقبِل لم تصله الرسالة. */
        if(Number(result.failed)>0){
          const err=new Error("بقيت رسائل لم تصل");
          err.status=503;
          throw err;
        }
        outboxDrop(job.id);
      }catch(e){
        const status=Number(e&&e.status);
        if(!outboxRetryable(status)){ outboxDrop(job.id); continue; }
        outboxPostpone(job.id,e);
        /* انقطاع الشبكة غالبًا يصيب كل الأعمال؛ لا نطرقها كلها في النبضة نفسها. */
        if(!Number.isFinite(status)) break;
      }
    }
  }finally{ outboxBusy=false; }
}

/* عودة الشبكة سبب كافٍ لإسقاط تأجيل المحاولة السابق وإيقاظ الطابور فورًا. */
function outboxWake(){
  const list=outboxGet();
  if(list.length){
    list.forEach(job=>{job.nextAttemptAt=0;job.tries=0;});
    outboxPut(list);
  }
  flushOutbox();
}
