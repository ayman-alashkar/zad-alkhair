"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const token="T".repeat(43);

function sourceSecurityChecks(){
  const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.match(home,/<link rel="canonical" href="https:\/\/zad-alkhair\.net\/">/,"the final homepage declares the canonical production URL");
  const edge=fs.readFileSync(path.join(root,"supabase/functions/migration-handoff/index.ts"),"utf8");
  assert.match(edge,/redeemed_at=is\.null/,"redemption only accepts unused handoffs");
  assert.match(edge,/method:\"PATCH\",headers:\{Prefer:\"return=representation\"\}/,"redemption claims and returns the handoff atomically");
  const transfer=fs.readFileSync(path.join(root,"transfer/index.html"),"utf8");
  assert.match(transfer,/zad:migration-package-v1/,"the redeemed package is retained for an in-session retry");
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
  const context=await browser.newContext();
  const page=await context.newPage();
  let confirmed=false;
  await page.route("https://webqpbcijjbawatykoxe.supabase.co/functions/v1/migration-handoff",async route=>{
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
  const fragment=new URLSearchParams({token,next:"/"});
  await page.goto(`http://127.0.0.1:4173/transfer/#${fragment}`,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#success:not([hidden])");
  assert.equal(new URL(page.url()).hash,"","token is removed from the address immediately");
  const stored=await page.evaluate(()=>({
    device:localStorage.getItem("zad:device"),last:localStorage.getItem("zad:last"),
    viewer:JSON.parse(localStorage.getItem("zad:viewer:AB12")),org:localStorage.getItem("zad:orgcode:AB12"),
    theme:localStorage.getItem("zad:qcf4:theme")
  }));
  assert.deepEqual(stored,{device:"device-test-1234",last:"AB12",viewer:{id:"member-test",name:"قارئ تجريبي"},org:"admin-test",theme:"dark"});
  await page.waitForTimeout(50);assert.equal(confirmed,true,"handoff is confirmed after local storage succeeds");
  await context.close();
}

async function legacyBridgeChecks(browser){
  const context=await browser.newContext();
  let createBody=null;
  await context.addInitScript(()=>{
    localStorage.setItem("zad:device","device-synthetic-1234");
    localStorage.setItem("zad:last","AB12");
    localStorage.setItem("zad:mine",JSON.stringify([{code:"AB12",name:"قديم",title:"تجريبي"}]));
    localStorage.setItem("zad:viewer:AB12",JSON.stringify({id:"member-test",name:"قديم"}));
    localStorage.setItem("zad:orgcode:AB12","admin-synthetic-secret");
    localStorage.setItem("zad:qcf4:theme","dark");
    localStorage.setItem("zad:notification-outbox","must-not-transfer");
    localStorage.setItem("zad:offline-library-v1","must-not-transfer");
    localStorage.setItem("zad:pwa-install-id","must-not-transfer");
  });
  await context.route("https://zad-alkhair.net/icons/migration-ready-v113.svg**",route=>route.fulfill({status:200,contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
  await context.route("https://zad-alkhair.net/transfer/**",route=>route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>وصل</title>"}));
  await context.route("https://webqpbcijjbawatykoxe.supabase.co/functions/v1/migration-handoff",async route=>{
    if(route.request().method()==="OPTIONS")return route.fulfill({status:204,headers:{"access-control-allow-origin":"https://ayman-alashkar.github.io","access-control-allow-headers":"authorization,apikey,content-type"}});
    createBody=route.request().postDataJSON();
    return route.fulfill({status:201,contentType:"application/json",headers:{"access-control-allow-origin":"https://ayman-alashkar.github.io"},body:JSON.stringify({token})});
  });
  await context.route("https://ayman-alashkar.github.io/zad-alkhair/**",async route=>{
    const url=new URL(route.request().url());
    let relative=url.pathname.replace(/^\/zad-alkhair\/?/,"")||"index.html";
    if(relative.endsWith("/"))relative+="index.html";
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:"not found"});
    return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
  });
  const page=await context.newPage();
  await page.goto("https://ayman-alashkar.github.io/zad-alkhair/",{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#zad-domain-migration");
  assert.equal(await page.locator("#zad-domain-migration .zad-migration-action").count(),1);
  assert.equal(await page.locator("#zad-domain-migration a").count(),0,"there is no bypass link to the old interface");
  await page.locator("#zad-domain-migration .zad-migration-action").click();
  await page.waitForURL(/zad-alkhair\.net\/transfer\//);
  assert.equal(createBody.action,"create");
  assert.equal(createBody.profiles[0].code,"AB12");
  assert.equal(createBody.prefs["zad:qcf4:theme"],"dark");
  assert.equal("zad:notification-outbox" in createBody.prefs,false);
  assert.equal("zad:offline-library-v1" in createBody.prefs,false);
  assert.equal("zad:pwa-install-id" in createBody.prefs,false);
  assert.equal(page.url().includes("device-synthetic-1234"),false,"device credential never enters the destination URL");
  assert.equal(page.url().includes("admin-synthetic-secret"),false,"organizer credential never enters the destination URL");
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
    await transferChecks(browser);
    await legacyBridgeChecks(browser);
    console.log("DOMAIN MIGRATION TESTS PASS");
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
