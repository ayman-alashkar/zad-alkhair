"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");

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
  const telegramTransfer=fs.readFileSync(path.join(root,"telegram-transfer/index.html"),"utf8");
  assert.match(telegramTransfer,/location\.replace\("https:\/\/zad-alkhair\.net\/"\)/,
    "saved Telegram transfer URLs redirect directly to the final site");
  assert.doesNotMatch(telegramTransfer,/telegram-migration|localStorage|sessionStorage|fetch\(/,
    "the retired Telegram transfer route cannot migrate or mutate identity");
}

test("retired migration routes cannot read, migrate or delete identity",sourceSecurityChecks);

test("legacy redirect preserves reader path, query and fragment without reading identity",()=>{
  let destination;
  const location={hostname:"ayman-alashkar.github.io",pathname:"/zad-alkhair/reader.html",search:"?juz=7&code=AB12",hash:"#legacy",replace:url=>destination=url};
  const forbidden=new Proxy({},{get(){throw Error("retired migration accessed browser storage")}});
  vm.runInNewContext(fs.readFileSync(path.join(root,"migration.js"),"utf8"),{location,localStorage:forbidden,sessionStorage:forbidden,caches:forbidden});
  assert.equal(destination,"https://zad-alkhair.net/reader.html?juz=7&code=AB12#legacy");
});

test("canonical origin does not redirect",()=>{
  const location={hostname:"zad-alkhair.net",origin:"https://zad-alkhair.net",replace(){throw Error("unexpected redirect")}};
  const hooks=[];
  vm.runInNewContext(fs.readFileSync(path.join(root,"migration.js"),"utf8"),{location,navigator:{storage:{}},window:{addEventListener:name=>hooks.push(name)}});
  assert.deepEqual(hooks,["appinstalled","pageshow","pointerdown"]);
});

test("saved transfer links only redirect and cannot mutate identity",()=>{
  for(const route of ["transfer","cleanup","telegram-transfer"]){
    const html=fs.readFileSync(path.join(root,route,"index.html"),"utf8");
    let destination;
    const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const forbidden=new Proxy({},{get(){throw Error("retired route accessed browser storage")}});
    vm.runInNewContext(source,{location:{replace:url=>destination=url},localStorage:forbidden,sessionStorage:forbidden,caches:forbidden});
    assert.equal(destination,"https://zad-alkhair.net/");
  }
});
