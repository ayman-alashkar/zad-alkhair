"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

/* بيئة صغيرة: مخزن محلي، ومؤقتات تُشغَّل يدويًا، وساعة يضبطها الاختبار، وfetch يسجّل الطلبات. */
function usageEnv({search="",now=Date.parse("2026-11-11T10:00:00Z"),fetchStatus=200,userAgent="Mozilla/5.0 (Linux; Android 14)",webdriver=false}={}){
  const store=new Map(),timers=[],sent=[],listeners={};
  const clock={now};
  const RealDate=Date;
  class FakeDate extends RealDate{constructor(...a){super(...(a.length?a:[clock.now]))}static now(){return clock.now}}
  const ctx={
    Intl:{DateTimeFormat:()=>({resolvedOptions:()=>({timeZone:"Asia/Damascus"})})},
    Date:FakeDate,JSON,Math,Number,String,Object,URLSearchParams,Uint8Array,Promise,
    crypto:{randomUUID:()=>"0b8f2c1e-1111-4222-8333-444455556666"},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    location:{search},
    navigator:{userAgent,webdriver,onLine:true,platform:"Linux armv8l",maxTouchPoints:5},
    document:{hidden:false,addEventListener:(t,f)=>(listeners[t]=listeners[t]||[]).push(f)},
    window:{matchMedia:()=>({matches:false}),addEventListener:(t,f)=>(listeners[t]=listeners[t]||[]).push(f)},
    setTimeout:(f,ms)=>{timers.push({f,ms});return timers.length},clearTimeout:id=>{if(timers[id-1])timers[id-1].f=null},
    setInterval:()=>0,
    fetch:async(url,opt)=>{sent.push({url,body:JSON.parse(opt.body)});return {ok:fetchStatus<300,status:fetchStatus}}
  };
  vm.createContext(ctx);
  vm.runInContext(read("src/shared/usage.js")+";this.api={zuDay,zuSurface,zuTrackAudio,zuFlush,zuRead,zuAdd,zuDeviceId};",ctx);
  const runTimers=()=>{const due=timers.splice(0);due.forEach(t=>t.f&&t.f())};
  return {api:ctx.api,store,sent,clock,runTimers};
}

test("usage days follow Makkah time (UTC+3)",()=>{
  const {api}=usageEnv();
  assert.equal(api.zuDay(Date.parse("2026-11-11T20:59:00Z")),"2026-11-11");
  assert.equal(api.zuDay(Date.parse("2026-11-11T21:00:00Z")),"2026-11-12");
});

test("a section counts once while it stays shown; passing states are not counted",()=>{
  const {api,runTimers}=usageEnv();
  api.zuSurface("home");api.zuSurface("prayer");runTimers();   // prayer replaced home before 600ms
  api.zuSurface("prayer");runTimers();                          // still prayer: no second count
  api.zuSurface("home");runTimers();
  api.zuSurface("unknown");runTimers();
  assert.deepEqual(JSON.parse(JSON.stringify(api.zuRead())),{"2026-11-11":{prayer:1,home:1}});
});

test("listening counts real playing time, keeps the remainder, and splits out ما تيسّر",()=>{
  const env=usageEnv(),handlers={};
  const audio={addEventListener:(t,f)=>(handlers[t]=handlers[t]||[]).push(f)};
  let tayassar=false;
  env.api.zuTrackAudio(audio,()=>tayassar);
  const fire=t=>handlers[t].forEach(f=>f());
  fire("playing");env.clock.now+=65500;fire("pause");            // 65.5 s
  tayassar=true;fire("playing");env.clock.now+=10600;fire("ended");// 10.6 s (+0.5 carried = 11)
  fire("pause");                                                  // pause without play adds nothing
  fire("playing");env.clock.now+=2*3600*1000;fire("pause");       // two hours with no event: dropped
  assert.deepEqual(JSON.parse(JSON.stringify(env.api.zuRead())),{"2026-11-11":{listen_seconds:76,tayassar_seconds:11}});
});

test("flush sends one request per day and keeps what arrived meanwhile",async()=>{
  const env=usageEnv();
  env.api.zuAdd({home:2,listen_seconds:30});
  env.clock.now+=86400000;env.api.zuAdd({reader:1});
  const flushing=env.api.zuFlush();
  env.api.zuAdd({reader:1});                                      // arrives while the request is in flight
  await flushing;
  assert.equal(env.sent.length,2);
  assert.match(env.sent[0].url,/\/rest\/v1\/rpc\/record_usage$/);
  assert.deepEqual(env.sent[0].body,{p_device:"0b8f2c1e-1111-4222-8333-444455556666",p_day:"2026-11-11",p_platform:"android",p_installed:false,p_tz:"Asia/Damascus",p_bot:null,p_counts:{home:2,listen_seconds:30}});
  assert.deepEqual(JSON.parse(JSON.stringify(env.api.zuRead())),{"2026-11-12":{reader:1}});
});

test("a server error keeps the counts for next time; ?nostats stops counting",async()=>{
  const failing=usageEnv({fetchStatus:503});
  failing.api.zuAdd({home:1});await failing.api.zuFlush();
  assert.deepEqual(JSON.parse(JSON.stringify(failing.api.zuRead())),{"2026-11-11":{home:1}});
  const off=usageEnv({search:"?nostats"});
  off.api.zuAdd({home:1});off.api.zuSurface("home");off.runTimers();await off.api.zuFlush();
  assert.deepEqual(JSON.parse(JSON.stringify(off.api.zuRead())),{});
  assert.equal(off.sent.length,0);
});

test("both apps carry the usage section, sharing the install analytics identity",()=>{
  assert.match(read("src/home/app.js"),/@include \.\.\/shared\/usage\.js/);
  assert.match(read("src/reader/app.js"),/@include \.\.\/shared\/usage\.js/);
  assert.match(read("index.html"),/record_usage/);
  assert.match(read("quran/runtime/reader.js"),/record_usage/);
  assert.match(read("src/home/install-navigation.js"),/function pwaInstallId\(\)\{return zuDeviceId\(\)\}/);
  // The analytics check must not end ما تيسّر: tayassurActive() clears the mode as a side effect.
  assert.doesNotMatch(read("src/reader/bootstrap.js"),/zuTrackAudio\(audio,tayassurActive\)/);
});

test("automated browsers are still counted, but flagged with the reason",async()=>{
  for(const [opts,reason] of [[{webdriver:true},"webdriver"],[{userAgent:"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0 Safari/537.36"},"ua:headless"],[{userAgent:"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},"ua:bot"],[{},null]]){
    const env=usageEnv(opts);
    env.api.zuAdd({home:1});await env.api.zuFlush();
    assert.equal(env.sent.length,1);
    assert.equal(env.sent[0].body.p_bot,reason);
  }
});
