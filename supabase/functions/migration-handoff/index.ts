import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OLD_ORIGIN="https://ayman-alashkar.github.io";
const NEW_ORIGIN="https://zad-alkhair.net";
const TTL_MS=15*60*1000;
const MAX_PROFILES=12;
const MAX_PREFS_BYTES=90000;
const MAX_CREATES_PER_HOUR=20;
const encoder=new TextEncoder();
const decoder=new TextDecoder();
const SAFE_PREF_KEYS=new Set([
  "zad:prayer",
  "zad:qcf4:qari",
  "zad:qcf4:continuous",
  "zad:qcf4:recent-visits",
  "zad:qcf4:last-position",
  "zad:qcf4:last-surface-v1",
  "zad:qcf4:reader-parent-v1",
  "zad:qcf4:page-bookmarks",
  "zad:qcf4:ayah-bookmarks",
  "zad:qcf4:bookmarks",
  "zad:qcf4:theme"
]);

type ClientProfile={code:string;mid:string;orgCode:string};
type ValidProfile={code:string;viewer:{id:string;name:string};title:string;orgCode?:string};

function base64url(bytes:Uint8Array){
  let binary="";
  for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
  return btoa(binary).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"");
}

function fromBase64url(value:string){
  const normalized=value.replaceAll("-","+").replaceAll("_","/");
  const padded=normalized+"=".repeat((4-normalized.length%4)%4);
  const binary=atob(padded);const out=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
  return out;
}

async function hexHash(value:string|Uint8Array){
  const bytes=typeof value==="string"?encoder.encode(value):value;
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  return [...digest].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

async function encryptionKey(serviceRole:string){
  const digest=await crypto.subtle.digest("SHA-256",encoder.encode(serviceRole+"|zad-origin-migration-v1"));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}

async function encryptPayload(value:unknown,serviceRole:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await encryptionKey(serviceRole);
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(JSON.stringify(value)));
  return {payload:base64url(new Uint8Array(encrypted)),iv:base64url(iv)};
}

async function decryptPayload(payload:string,iv:string,serviceRole:string){
  const key=await encryptionKey(serviceRole);
  const decrypted=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64url(iv)},key,fromBase64url(payload));
  return JSON.parse(decoder.decode(decrypted));
}

function allowedOrigin(req:Request,action:string){
  const origin=req.headers.get("origin");
  if(!origin)return null; // Non-browser health checks and controlled verification.
  if(action==="create")return origin===OLD_ORIGIN?origin:false;
  return origin===NEW_ORIGIN?origin:false;
}

function cors(origin:string|null){
  return {
    "Access-Control-Allow-Origin":origin||OLD_ORIGIN,
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Max-Age":"600",
    "Vary":"Origin"
  };
}

function json(body:unknown,status=200,origin:string|null=null){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer"}
  });
}

function cleanCode(value:unknown){
  const code=String(value||"").trim().toUpperCase();
  return /^[A-Z0-9]{3,12}$/.test(code)?code:"";
}

function cleanProfiles(value:unknown):ClientProfile[]{
  if(!Array.isArray(value))return [];
  const seen=new Set<string>();const out:ClientProfile[]=[];
  for(const raw of value.slice(0,MAX_PROFILES)){
    const code=cleanCode(raw?.code),mid=String(raw?.mid||"").trim();
    if(!code||!mid||mid.length>200||seen.has(code))continue;
    seen.add(code);out.push({code,mid,orgCode:String(raw?.orgCode||"").slice(0,200)});
  }
  return out;
}

function cleanPrefs(value:unknown){
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const out:Record<string,string>={};let size=0;
  for(const [key,raw] of Object.entries(value as Record<string,unknown>)){
    if(!SAFE_PREF_KEYS.has(key)||typeof raw!=="string"||raw.length>24000)continue;
    size+=encoder.encode(key).length+encoder.encode(raw).length;
    if(size>MAX_PREFS_BYTES)break;
    out[key]=raw;
  }
  return out;
}

function safeDevice(value:unknown){
  const device=String(value||"").trim();
  if(device.length<8||device.length>128||/[\u0000-\u001f\u007f]/.test(device))return "";
  return device;
}

async function rest(supabaseUrl:string,serviceRole:string,path:string,init:RequestInit={}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{
    ...init,
    headers:{
      apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,
      "Content-Type":"application/json",...(init.headers||{})
    }
  });
  if(!response.ok)throw new Error(`database_${response.status}`);
  if(response.status===204)return null;
  const text=await response.text();return text?JSON.parse(text):null;
}

async function constantEqual(a:string,b:string){
  const [ah,bh]=await Promise.all([hexHash(a),hexHash(b)]);
  let diff=ah.length^bh.length;
  for(let i=0;i<Math.max(ah.length,bh.length);i++)diff|=(ah.charCodeAt(i)||0)^(bh.charCodeAt(i)||0);
  return diff===0;
}

async function validateProfiles(supabaseUrl:string,serviceRole:string,device:string,profiles:ClientProfile[]){
  if(!device||!profiles.length)return [] as ValidProfile[];
  const validated:ValidProfile[]=[];
  for(const profile of profiles){
    const khatmahs=await rest(supabaseUrl,serviceRole,
      `khatmah?select=id,code,title,organizer_id,organizer_code&code=eq.${encodeURIComponent(profile.code)}&limit=1`);
    const khatmah=Array.isArray(khatmahs)?khatmahs[0]:null;if(!khatmah)continue;
    const members=await rest(supabaseUrl,serviceRole,
      `members?select=mid,name,device,devices&khatmah_id=eq.${encodeURIComponent(khatmah.id)}&mid=eq.${encodeURIComponent(profile.mid)}&left_at=is.null&limit=1`);
    const member=Array.isArray(members)?members[0]:null;if(!member)continue;
    const devices=Array.isArray(member.devices)?member.devices.map(String):[];
    if(String(member.device||"")!==device&&!devices.includes(device))continue;
    const valid:ValidProfile={
      code:String(khatmah.code),
      viewer:{id:String(member.mid),name:String(member.name||"").slice(0,200)},
      title:String(khatmah.title||"ختمة").slice(0,200)
    };
    if(String(khatmah.organizer_id||"")===String(member.mid)&&profile.orgCode&&
       await constantEqual(profile.orgCode,String(khatmah.organizer_code||"")))valid.orgCode=profile.orgCode;
    validated.push(valid);
  }
  return validated;
}

function requestFingerprint(req:Request){
  return String(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim().slice(0,128);
}

async function create(req:Request,body:any,supabaseUrl:string,serviceRole:string,origin:string|null){
  const device=safeDevice(body.device),profiles=cleanProfiles(body.profiles),prefs=cleanPrefs(body.prefs);
  const active=cleanCode(body.active);
  const clientHash=await hexHash(requestFingerprint(req)+"|zad-origin-migration-rate-v1");
  const cutoff=new Date(Date.now()-60*60*1000).toISOString();

  await rest(supabaseUrl,serviceRole,`origin_migration_handoffs?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
  const recent=await rest(supabaseUrl,serviceRole,
    `origin_migration_handoffs?select=token_hash&client_hash=eq.${clientHash}&created_at=gte.${encodeURIComponent(cutoff)}&limit=${MAX_CREATES_PER_HOUR+1}`);
  if(Array.isArray(recent)&&recent.length>=MAX_CREATES_PER_HOUR)return json({error:"rate_limited"},429,origin);

  const validProfiles=await validateProfiles(supabaseUrl,serviceRole,device,profiles);
  const validCodes=new Set(validProfiles.map(profile=>profile.code));
  const payload={v:1,device,profiles:validProfiles,active:validCodes.has(active)?active:validProfiles[0]?.code||"",prefs};
  const tokenBytes=crypto.getRandomValues(new Uint8Array(32));
  const token=base64url(tokenBytes),tokenHash=await hexHash(tokenBytes);
  const encrypted=await encryptPayload(payload,serviceRole);
  await rest(supabaseUrl,serviceRole,"origin_migration_handoffs",{
    method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({token_hash:tokenHash,payload:encrypted.payload,iv:encrypted.iv,client_hash:clientHash,expires_at:new Date(Date.now()+TTL_MS).toISOString()})
  });
  return json({token,expiresIn:TTL_MS/1000},201,origin);
}

function cleanToken(value:unknown){
  const token=String(value||"");
  return /^[A-Za-z0-9_-]{43}$/.test(token)?token:"";
}

async function redeem(body:any,supabaseUrl:string,serviceRole:string,origin:string|null){
  const token=cleanToken(body.token);if(!token)return json({error:"invalid_token"},400,origin);
  const tokenHash=await hexHash(fromBase64url(token));
  const rows=await rest(supabaseUrl,serviceRole,
    `origin_migration_handoffs?select=payload,iv,expires_at&token_hash=eq.${tokenHash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`);
  const row=Array.isArray(rows)?rows[0]:null;if(!row)return json({error:"expired_or_used"},410,origin);
  const payload=await decryptPayload(row.payload,row.iv,serviceRole);
  await rest(supabaseUrl,serviceRole,`origin_migration_handoffs?token_hash=eq.${tokenHash}`,{
    method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({redeemed_at:new Date().toISOString()})
  });
  return json({payload},200,origin);
}

async function confirm(body:any,supabaseUrl:string,serviceRole:string,origin:string|null){
  const token=cleanToken(body.token);if(!token)return json({error:"invalid_token"},400,origin);
  const tokenHash=await hexHash(fromBase64url(token));
  await rest(supabaseUrl,serviceRole,`origin_migration_handoffs?token_hash=eq.${tokenHash}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
  return json({ok:true},200,origin);
}

Deno.serve(async(req:Request)=>{
  const declared=Number(req.headers.get("content-length")||0);
  if(declared>130000)return json({error:"payload_too_large"},413,null);
  if(req.method==="OPTIONS"){
    const origin=req.headers.get("origin");
    if(origin!==OLD_ORIGIN&&origin!==NEW_ORIGIN)return json({error:"origin_not_allowed"},403,null);
    return new Response(null,{status:204,headers:cors(origin)});
  }
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,null);
  let body:any;
  try{body=await req.json()}catch(_){return json({error:"invalid_json"},400,null)}
  const action=String(body?.action||"");const origin=allowedOrigin(req,action);
  if(origin===false)return json({error:"origin_not_allowed"},403,null);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!supabaseUrl||!serviceRole)return json({error:"server_not_configured"},500,origin as string|null);
  try{
    if(action==="create")return await create(req,body,supabaseUrl,serviceRole,origin as string|null);
    if(action==="redeem")return await redeem(body,supabaseUrl,serviceRole,origin as string|null);
    if(action==="confirm")return await confirm(body,supabaseUrl,serviceRole,origin as string|null);
    return json({error:"unknown_action"},400,origin as string|null);
  }catch(error){
    console.error("migration-handoff",error instanceof Error?error.message:"unknown_error");
    return json({error:"temporary_failure"},500,origin as string|null);
  }
});
