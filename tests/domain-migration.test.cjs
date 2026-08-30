"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const token="T".repeat(43);

function sourceSecurityChecks(){
  const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.match(home,/<link rel="canonical" href="https:\/\/zad-alkhair\.net\/">/,"the final homepage declares the canonical production URL");
  assert.match(home,/migration\.js\?v=117/,"the retired legacy origin loads the current redirect immediately");
  const bridge=fs.readFileSync(path.join(root,"migration.js"),"utf8");
  assert.match(bridge,/location\.replace\(FINAL_ORIGIN\+path\+location\.search\+location\.hash\)/,
    "legacy URLs redirect directly while preserving path, query, and hash");
  assert.doesNotMatch(bridge,/migration-handoff|collectHandoff|zad-domain-migration/,
    "the legacy origin no longer migrates identity or displays a migration page");
  const edge=fs.readFileSync(path.join(root,"supabase/functions/migration-handoff/index.ts"),"utf8");
  assert.match(edge,/error:"migration_retired"/,"the server permanently rejects legacy migration");
  assert.match(edge,/status:410/,"retired migration requests receive Gone");
  assert.doesNotMatch(edge,/SUPABASE_SERVICE_ROLE_KEY|complete_origin_domain_migration|redeem\(/,
    "the retired endpoint cannot read or mutate migration data");
  const transfer=fs.readFileSync(path.join(root,"transfer/index.html"),"utf8");
  assert.match(transfer,/location\.replace\("https:\/\/zad-alkhair\.net\/"\)/,
    "the retired transfer page redirects directly to the final site");
  assert.doesNotMatch(transfer,/localStorage|sessionStorage|migration-handoff/,
    "the retired transfer page cannot change browser identity");
  const cleanup=fs.readFileSync(path.join(root,"cleanup/index.html"),"utf8");
  assert.match(cleanup,/location\.replace\("https:\/\/zad-alkhair\.net\/"\)/,
    "the retired cleanup page redirects directly to the final site");
  assert.doesNotMatch(cleanup,/localStorage|sessionStorage|caches|serviceWorker/,
    "the retired cleanup page cannot delete browser data");
  const worker=fs.readFileSync(path.join(root,"sw.js"),"utf8");
  assert.ok(worker.includes('const reader=/\\/reader(?:\\.html)?\\/?$/i.test(url.pathname);'),"offline navigation recognizes both reader.html and Cloudflare Pages' clean /reader URL");
}

function mime(file){
  if(file.endsWith(".html"))return "text/html; charset=utf-8";
  if(file.endsWith(".js"))return "text/javascript; charset=utf-8";
  if(file.endsWith(".svg"))return "image/svg+xml";
  if(file.endsWith(".png"))return "image/png";
  if(file.endsWith(".woff2"))return "font/woff2";
  return "application/octet-stream";
}

async function localUiChecks(browser){
  const page=await browser.newPage();
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#zk-launch.zk-home-ready");
  assert.equal(await page.locator("#zk-launch-install").isVisible(),true,"install CTA is visible in a normal browser tab");
  await page.close();

  const standalone=await browser.newContext();
  await standalone.addInitScript(()=>{
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>query==="(display-mode: standalone)"
      ?{matches:true,media:query,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}}
      :original(query);
  });
  const appPage=await standalone.newPage();
  await appPage.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded"});
  await appPage.waitForSelector("#zk-launch.zk-home-ready");
  assert.equal(await appPage.locator("#zk-launch-install").isHidden(),true,"install CTA is hidden in standalone mode");
  await standalone.close();
}

async function transferChecks(browser){
  const context=await browser.newContext({serviceWorkers:"block"});
  const page=await context.newPage();
  let confirmed=false;
  await context.route("https://webqpbcijjbawatykoxe.supabase.co/functions/v1/migration-handoff",async route=>{
    const body=route.request().postDataJSON();
    if(body.action==="redeem"){
      assert.equal(body.token,token);
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({payload:{
        v:1,device:"device-test-1234",active:"AB12",
        profiles:[{code:"AB12",viewer:{id:"member-test",name:"قارئ تجريبي"},title:"ختمة اختبار",orgCode:"admin-test"}],
        prefs:{"zad:qcf4:theme":"dark"}
      }})});
    }
    if(body.action==="confirm"){confirmed=true;return route.fulfill({status:200,contentType:"application/json",body:'{"ok":true}'})}
    return route.abort();
  });
  await context.route("https://zad-alkhair.net/**",async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==="/__migration_audit__")return route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>audit</title>"});
    let relative=url.pathname.replace(/^\//,"")||"index.html";if(relative.endsWith("/"))relative+="index.html";
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:"not found"});
    return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
  });
  await context.route("https://ayman-alashkar.github.io/zad-alkhair/**",async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith("/__migration_audit__"))return route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>audit</title>"});
    let relative=url.pathname.replace(/^\/zad-alkhair\/?/,"")||"index.html";if(relative.endsWith("/"))relative+="index.html";
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:"not found"});
    return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
  });
  await page.goto("https://ayman-alashkar.github.io/zad-alkhair/__migration_audit__",{waitUntil:"domcontentloaded"});
  await page.evaluate(async transferToken=>{
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(transferToken));
    const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
    localStorage.setItem("zad:migration-cleanup-proof-v1",hash);
    localStorage.setItem("zad:device","legacy-device");
    localStorage.setItem("other:keep","untouched");
    await (await caches.open("zad-quran-core-v1")).put(new Request(location.origin+"/quran-probe"),new Response("quran"));
    await (await caches.open("other-app-cache")).put(new Request(location.origin+"/other-probe"),new Response("other"));
  },token);
  const fragment=new URLSearchParams({token,next:"/"});
  await page.goto(`https://zad-alkhair.net/transfer/#${fragment}`,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#success:not([hidden])");
  assert.equal(new URL(page.url()).hash,"","token is removed from the address immediately");
  const stored=await page.evaluate(()=>({
    device:localStorage.getItem("zad:device"),last:localStorage.getItem("zad:last"),
    viewer:JSON.parse(localStorage.getItem("zad:viewer:AB12")),org:localStorage.getItem("zad:orgcode:AB12"),
    theme:localStorage.getItem("zad:qcf4:theme")
  }));
  assert.deepEqual(stored,{device:"device-test-1234",last:"AB12",viewer:{id:"member-test",name:"قارئ تجريبي"},org:"admin-test",theme:"dark"});
  const audit=await context.newPage();
  await audit.goto("https://ayman-alashkar.github.io/zad-alkhair/__migration_audit__",{waitUntil:"domcontentloaded"});
  const legacy=await audit.evaluate(async()=>({
    zadDevice:localStorage.getItem("zad:device"),proof:localStorage.getItem("zad:migration-cleanup-proof-v1"),
    cleaned:!!localStorage.getItem("zad:migration-cleaned-v1"),other:localStorage.getItem("other:keep"),caches:await caches.keys()
  }));
  assert.equal(legacy.zadDevice,null,"legacy Zad identity is removed after transfer");
  assert.equal(legacy.proof,null,"cleanup authorization proof is removed after use");
  assert.equal(legacy.cleaned,true,"a tiny marker prevents the old bridge from running again");
  assert.equal(legacy.other,"untouched","unrelated shared-origin local storage survives cleanup");
  assert.deepEqual(legacy.caches,["other-app-cache"],"unrelated shared-origin caches survive cleanup");
  await page.waitForTimeout(50);assert.equal(confirmed,true,"handoff is confirmed after local storage succeeds");
  await context.close();
}

async function legacyBridgeChecks(browser){
  const context=await browser.newContext({serviceWorkers:"block"});
  await context.route("https://ayman-alashkar.github.io/zad-alkhair/**",async route=>{
    const url=new URL(route.request().url());
    let relative=url.pathname.replace(/^\/zad-alkhair\/?/,"")||"index.html";
    if(relative.endsWith("/"))relative+="index.html";
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:"not found"});
    return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
  });
  await context.route("https://zad-alkhair.net/**",route=>
    route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>final</title>"}));
  const page=await context.newPage();
  await page.goto("https://ayman-alashkar.github.io/zad-alkhair/?source=old#87VE",{waitUntil:"domcontentloaded"});
  await page.waitForURL("https://zad-alkhair.net/?source=old#87VE");
  assert.equal(page.url(),"https://zad-alkhair.net/?source=old#87VE");
  await context.close();
}

async function telegramTransferChecks(browser){
  const context=await browser.newContext({serviceWorkers:"block"});
  await context.addInitScript(()=>localStorage.setItem("zad:device","telegram-device-test-1234"));
  let confirmed=false;
  await context.route("https://webqpbcijjbawatykoxe.supabase.co/functions/v1/telegram-migration",async route=>{
    const body=route.request().postDataJSON();
    assert.equal(body.device,"telegram-device-test-1234");
    assert.equal(body.token,token);
    if(body.action==="redeem")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({payload:{
      v:1,device:body.device,active:"AB12",prefs:{},
      profiles:[{code:"AB12",viewer:{id:"telegram-member",name:"قارئ تلغرام"},title:"ختمة تلغرام",orgCode:"telegram-organizer"}]
    }})});
    if(body.action==="confirm"){
      confirmed=true;
      return route.fulfill({status:200,contentType:"application/json",body:'{"ok":true}'});
    }
    return route.abort();
  });
  await context.route("https://zad-alkhair.net/**",async route=>{
    const url=new URL(route.request().url());
    let relative=url.pathname.replace(/^\//,"")||"index.html";if(relative.endsWith("/"))relative+="index.html";
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:"not found"});
    return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
  });
  const page=await context.newPage();
  const next="/juz/7/?code=AB12";
  await page.goto(`https://zad-alkhair.net/telegram-transfer/?next=${encodeURIComponent(next)}#token=${token}`,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#success:not([hidden])");
  assert.equal(new URL(page.url()).hash,"","the Telegram token is removed from the URL immediately");
  assert.equal(confirmed,true,"Telegram success waits for server confirmation");
  const state=await page.evaluate(()=>({
    device:localStorage.getItem("zad:device"),
    last:localStorage.getItem("zad:last"),
    viewer:JSON.parse(localStorage.getItem("zad:viewer:AB12")),
    org:localStorage.getItem("zad:orgcode:AB12")
  }));
  assert.deepEqual(state,{device:"telegram-device-test-1234",last:"AB12",viewer:{id:"telegram-member",name:"قارئ تلغرام"},org:"telegram-organizer"});
  assert.equal(await page.locator("#open-app").getAttribute("href"),next);
  assert.match(await page.locator("#success").innerText(),/وإذا كان التطبيق القديم مثبتًا لديك، فيرجى حذفه وتثبيت التطبيق الجديد/);
  await context.close();
}

(async()=>{
  sourceSecurityChecks();
  if(process.argv.includes("--static")){
    console.log("DOMAIN MIGRATION STATIC TESTS PASS");
    return;
  }
  const {chromium}=require("playwright");
  const browser=await chromium.launch({headless:true});
  try{
    await localUiChecks(browser);
    await legacyBridgeChecks(browser);
    await telegramTransferChecks(browser);
    console.log("DOMAIN MIGRATION TESTS PASS");
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
