"use strict";
/* وحدة الاتصال api.mjs: تكرار الطلب نفسه، ورمز المنظّم القديم، وقفل الجهاز. */
const test=require("node:test");
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.join(__dirname,"..");

const store=new Map();
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
let replies=[];const calls=[];
globalThis.fetch=async(url,init)=>{
  calls.push({fn:String(url).split("/").pop(),body:JSON.parse(init.body)});
  const reply=replies.shift();
  return new Response(JSON.stringify(reply),{status:200,headers:{"Content-Type":"application/json"}});
};
const load=async()=>({
  api:await import(path.join(root,"src/home/api.mjs")),
  appState:(await import(path.join(root,"src/home/app-state.mjs"))).appState,
});
const reset=()=>{store.clear();calls.length=0;replies=[];};

test("the same rpc in flight is sent once",async()=>{
  const {api}=await load();reset();
  replies=[{ok:true}];
  const [a,b]=await Promise.all([api.rpc("get_state",{p_code:"ABCD"}),api.rpc("get_state",{p_code:"ABCD"})]);
  assert.deepEqual(a,{ok:true});assert.equal(a,b);assert.equal(calls.length,1);
});

test("a rejected organizer code is forgotten so it is asked for again",async()=>{
  const {api,appState}=await load();reset();
  Object.assign(appState,{code:"ABCD",viewer:{id:"me",name:"أنا"},state:{organizerId:"me"}});
  store.set("zad:orgcode:ABCD","old");
  replies=[{ok:false,error:"الرمز أو الجهاز غير صحيح"}];
  await api.rpc("update_settings",{p_code:"ABCD"});
  assert.equal(store.has("zad:orgcode:ABCD"),false);
});

test("a device lock re-binds this browser once and retries",async()=>{
  const {api,appState}=await load();reset();
  Object.assign(appState,{code:"ABCD",viewer:{id:"me",name:"أنا"},state:{organizerId:"x"}});
  replies=[{ok:false,error:"هذا الحساب مقفول على جهاز صاحبه"},{ok:true},{ok:true,done:1}];
  assert.deepEqual(await api.rpc("claim_juz",{p_num:1}),{ok:true,done:1});
  assert.deepEqual(calls.map(c=>c.fn),["claim_juz","sign_in","claim_juz"]);
});

test("when re-binding fails the interface is told, and the reply is marked handled",async()=>{
  const {api,appState}=await load();reset();
  Object.assign(appState,{code:"ABCD",viewer:{id:"me",name:"أنا"},state:{organizerId:"x"}});
  let told=0;api.onDeviceNotRecognised(()=>told++);
  replies=[{ok:false,error:"هذا الحساب مقفول على جهاز صاحبه"},{ok:false}];
  const r=await api.rpc("claim_juz",{p_num:2});
  assert.equal(told,1);assert.equal(r.handled,true);
});
