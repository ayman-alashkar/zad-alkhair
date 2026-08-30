import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TOKEN=Deno.env.get("TELEGRAM_BOT_TOKEN")??"";
const SB_URL=Deno.env.get("SUPABASE_URL")??"";
const SB_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const CRON_SECRET=Deno.env.get("CRON_SECRET")??"";
const FINAL_ORIGIN="https://zad-alkhair.net";
const CAMPAIGN_KEY="final-domain-v1";
const MAX_BODY_BYTES=12000;

const CAMPAIGN_TEXT=`🕌 <b>زاد الخير</b>

شكرًا لمساعدتنا في النسخة التجريبية من زاد الخير

أصبحت النسخة النهائية من زاد الخير متاحة الآن على:

<code>zad-alkhair.net</code>

إذا كان التطبيق مثبتًا لديك، افتح النسخة النهائية أولًا. وبعد تأكيد نجاح الانتقال يمكنك إزالة النسخة القديمة وتثبيت التطبيق الجديد.

نعتذر عن الإزعاج، ونشكرك على ثقتك.

لن نحذف أو نغيّر أي بيانات أثناء الانتقال.`;

const WELCOME_TEXT=`🕌 <b>زاد الخير</b>

أهلًا بك في النسخة النهائية من زاد الخير

تم ربط دخولك بختمتك بنجاح، وستصلك تذكيراتك من الآن عبر العنوان الجديد.

نسأل الله أن يتقبّل منك، وأن يجعل القرآن ربيع قلبك.`;

function cors(origin:string|null){
  return {
    "Access-Control-Allow-Origin":origin===FINAL_ORIGIN?origin:FINAL_ORIGIN,
    "Access-Control-Allow-Headers":"apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Max-Age":"600",
    "Vary":"Origin"
  };
}

function json(body:unknown,status=200,origin:string|null=null){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      ...cors(origin),
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store",
      "Referrer-Policy":"no-referrer"
    }
  });
}

async function rpc(name:string,args:Record<string,unknown>={}){
  const response=await fetch(`${SB_URL}/rest/v1/rpc/${name}`,{
    method:"POST",
    headers:{
      apikey:SB_KEY,
      Authorization:`Bearer ${SB_KEY}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(args)
  });
  const text=await response.text();
  if(!response.ok)throw new Error(`${name}:${response.status}:${text.slice(0,200)}`);
  return text?JSON.parse(text):null;
}

function migrationUrl(token:string,next="/"){
  const url=new URL("/telegram-transfer/",FINAL_ORIGIN);
  if(next&&next!=="/")url.searchParams.set("next",next);
  url.hash=new URLSearchParams({token}).toString();
  return url.href;
}

type TelegramResult={ok:boolean;blocked:boolean;error?:string};

async function sendTelegram(chat:number,kind:string,token=""):Promise<TelegramResult>{
  const campaign=kind==="campaign";
  const body:Record<string,unknown>={
    chat_id:chat,
    text:campaign?CAMPAIGN_TEXT:WELCOME_TEXT,
    parse_mode:"HTML",
    disable_web_page_preview:true,
    reply_markup:{inline_keyboard:[[
      campaign
        ?{text:"الانتقال بأمان إلى النسخة النهائية",url:migrationUrl(token)}
        :{text:"فتح زاد الخير",url:`${FINAL_ORIGIN}/`}
    ]]}
  };
  const response=await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  if(response.ok)return {ok:true,blocked:false};
  const result=await response.json().catch(()=>({}));
  const description=String(result?.description??response.status);
  return {
    ok:false,
    blocked:response.status===403||/blocked|deactivated|chat not found/i.test(description),
    error:description
  };
}

type Delivery={
  id:string;
  kind:"campaign"|"welcome";
  campaignKey:string;
  chatId:number;
  attempts:number;
};

async function finish(delivery:Delivery,ok:boolean,permanent=false){
  await rpc("finish_telegram_migration_delivery",{
    p_delivery:delivery.id,
    p_ok:ok,
    p_permanent:permanent
  });
}

async function dispatchPending(limit=20,chatId:number|null=null){
  const claimed=await rpc("claim_telegram_migration_deliveries",{
    p_limit:Math.max(1,Math.min(limit,50)),
    p_chat:chatId
  }) as Delivery[];
  let sent=0,blocked=0,failed=0;

  for(const delivery of claimed??[]){
    try{
      let linkToken="";
      if(delivery.kind==="campaign"){
        const issued=await rpc("issue_telegram_migration_token",{
          p_chat:delivery.chatId,
          p_lifetime_seconds:2678400,
          p_campaign_key:delivery.campaignKey||CAMPAIGN_KEY
        });
        if(issued?.ok&&issued.needed===false){
          await finish(delivery,true,false);
          continue;
        }
        if(!issued?.ok||typeof issued.token!=="string")throw new Error("token_issue_failed");
        linkToken=issued.token;
      }

      const result=await sendTelegram(delivery.chatId,delivery.kind,linkToken);
      if(result.ok){
        sent++;
        await finish(delivery,true,false);
      }else if(result.blocked){
        blocked++;
        await finish(delivery,false,true);
        await rpc("unlink_by_chat",{p_chat:delivery.chatId}).catch(()=>null);
      }else{
        failed++;
        await finish(delivery,false,Number(delivery.attempts||0)>=96);
      }
    }catch(error){
      failed++;
      await finish(delivery,false,Number(delivery.attempts||0)>=96).catch(()=>null);
      console.error("telegram-migration-delivery",delivery.kind,
        error instanceof Error?error.message:"unknown_error");
    }
    await new Promise(resolve=>setTimeout(resolve,60));
  }
  return {ok:failed===0,sent,blocked,failed,claimed:claimed?.length??0};
}

function safeToken(value:unknown){
  const token=String(value??"");
  return /^[A-Za-z0-9_-]{43}$/.test(token)?token:"";
}

function safeDevice(value:unknown){
  const device=String(value??"").trim();
  return device.length>=8&&device.length<=128&&!/[\u0000-\u001f\u007f]/.test(device)?device:"";
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS"){
    if(origin!==FINAL_ORIGIN)return json({error:"origin_not_allowed"},403,origin);
    return new Response(null,{status:204,headers:cors(origin)});
  }
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,origin);
  if(Number(req.headers.get("content-length")||0)>MAX_BODY_BYTES)
    return json({error:"payload_too_large"},413,origin);
  if(!TOKEN||!SB_URL||!SB_KEY)return json({error:"server_not_configured"},500,origin);

  let body:Record<string,unknown>;
  try{body=await req.json()}catch(_){return json({error:"invalid_json"},400,origin)}
  const action=String(body.action??"");

  try{
    if(action==="dispatch"){
      if(!CRON_SECRET||req.headers.get("x-cron-secret")!==CRON_SECRET)
        return json({error:"forbidden"},403,origin);
      const requestedChat=Number(body.chatId);
      const chatId=Number.isSafeInteger(requestedChat)?requestedChat:null;
      return json(await dispatchPending(25,chatId),200,origin);
    }

    if(origin!==FINAL_ORIGIN)return json({error:"origin_not_allowed"},403,origin);
    const token=safeToken(body.token),device=safeDevice(body.device);
    if(!token||!device)return json({error:"invalid_request"},400,origin);

    if(action==="redeem"){
      const result=await rpc("redeem_telegram_migration_token",{
        p_token:token,
        p_device:device
      });
      if(!result?.ok){
        const gone=result?.error==="expired"||result?.error==="already_claimed";
        return json({error:result?.error??"invalid_migration"},gone?410:403,origin);
      }
      return json({payload:result.payload},200,origin);
    }

    if(action==="confirm"){
      const result=await rpc("confirm_telegram_migration_token",{
        p_token:token,
        p_device:device
      });
      if(!result?.ok)return json({error:result?.error??"confirmation_failed"},409,origin);
      if(result.chatId)await dispatchPending(4,Number(result.chatId)).catch(()=>null);
      return json({ok:true,already:!!result.already},200,origin);
    }

    return json({error:"unknown_action"},400,origin);
  }catch(error){
    console.error("telegram-migration",action,
      error instanceof Error?error.message:"unknown_error");
    return json({error:"temporary_failure"},503,origin);
  }
});
