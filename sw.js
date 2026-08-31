"use strict";

/*
  Zad Al-Khair service worker — durable offline architecture.

  The Quran, Tafsir and audio caches are independent from the application shell.
  The shell itself is stable and updated transactionally: a fresh index/reader pair
  is staged first, the last known-good pair is kept as backup, and only then is the
  live shell replaced. A failed deployment or transient network error therefore
  cannot remove the reader that was already available offline.
*/
const SHELL_CACHE="zad-shell-stable-v1";
const SHELL_BACKUP_CACHE="zad-shell-backup-v1";
const SHELL_STAGE_CACHE="zad-shell-stage-v129";
const QURAN_CACHE="zad-quran-core-v1";
const TAFSIR_CACHE="zad-tafsir-alwajeez-v1";
const AUDIO_CACHE="zad-audio-v1";
const RUNTIME_CACHE="zad-runtime-v129";
const LEGACY_QURAN_CACHE="zad-quran-v80";

const QCF_BASE="https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/";
const QUL_HEADER="https://static-cdn.tarteel.ai/qul/fonts/surah-names/surah-header/QCF_SurahHeader_COLOR-Regular.ttf";

const REQUIRED_SHELL=["./index.html","./reader.html"];
const SHELL_ALIASES={
  "./":"./index.html",
  "./reader":"./reader.html",
  "./reader.html?home=1&from=zad":"./reader.html"
};
const OPTIONAL_SHELL=[
  "./manifest.json","./migration.js","./vendor/adhan-4.4.4.umd.min.js",
  "./fonts/alexandria-arabic-400-800.woff2","./fonts/alexandria-latin-400-800.woff2",
  "./fonts/amiri-arabic-400.woff2","./fonts/amiri-latin-400.woff2","./fonts/amiri-arabic-700.woff2","./fonts/amiri-latin-700.woff2",
  "./fonts/aref-ruqaa-arabic-400.woff2","./fonts/aref-ruqaa-arabic-700.woff2",
  "./icons/icon-32.png","./icons/icon-180.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-512-maskable.png","./icons/zad-mark.svg","./icons/zad-mark-reverse.svg","./icons/migration-ready-v115.svg"
];

const QURAN_CORE=[QCF_BASE+"index.json",QCF_BASE+"verses.json",QCF_BASE+"fonts-woff2/QCF4_QBSML.woff2",QUL_HEADER];
const QURAN_FONTS=Array.from({length:47},(_,i)=>QCF_BASE+`fonts-woff2/QCF4_Hafs_${String(i+1).padStart(2,"0")}_W.woff2`);
const QURAN_PAGES=Array.from({length:604},(_,i)=>QCF_BASE+`pages/${String(i+1).padStart(3,"0")}.json`);
const QURAN_REQUIRED=[...QURAN_CORE,...QURAN_FONTS,...QURAN_PAGES];
const TAFSIR_REQUIRED=["./data/tafsir/al-wajeez/index.json","./data/tafsir/al-wajeez/fadl.json",...Array.from({length:114},(_,i)=>`./data/tafsir/al-wajeez/${String(i+1).padStart(3,"0")}.json`)];
const QURAN_MARKER="./__zad_quran_core_v1_ready__";
const TAFSIR_MARKER="./__zad_tafsir_alwajeez_v1_ready__";

function absoluteUrl(url){return new URL(url,self.registration.scope).href}
function requestFor(url,{reload=false}={}){
  const href=absoluteUrl(url);
  const sameOrigin=new URL(href).origin===self.location.origin;
  const init={credentials:sameOrigin?"same-origin":"omit"};
  if(reload&&sameOrigin)init.cache="reload";
  return new Request(href,init);
}
function cacheable(response){return !!response&&(response.ok||response.type==="opaque")}
async function allPresent(cache,urls){
  for(let i=0;i<urls.length;i+=32){
    const checks=await Promise.all(urls.slice(i,i+32).map(url=>cache.match(requestFor(url))));
    if(checks.some(item=>!item))return false;
  }
  return true;
}
async function notifyAll(message){
  const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  await Promise.all(clients.map(client=>client.postMessage(message)));
}
async function markReady(cache,marker,value){
  await cache.put(requestFor(marker),new Response(value,{headers:{"content-type":"text/plain"}}));
}

async function putOne(cache,url,{refresh=false}={}){
  const req=requestFor(url,{reload:refresh});
  if(!refresh){
    const hit=await cache.match(req);
    if(hit)return true;
  }
  try{
    const response=await fetch(req);
    if(!cacheable(response))return !!await cache.match(requestFor(url));
    await cache.put(requestFor(url),response.clone());
    return true;
  }catch(_){
    return !!await cache.match(requestFor(url));
  }
}

async function seedShellAliases(cache){
  for(const [alias,canonical] of Object.entries(SHELL_ALIASES)){
    const source=await cache.match(requestFor(canonical));
    if(source)await cache.put(requestFor(alias),source.clone());
  }
}
async function copyRequiredShell(source,target){
  for(const url of REQUIRED_SHELL){
    const hit=await source.match(requestFor(url));
    if(!hit)return false;
    await target.put(requestFor(url),hit.clone());
  }
  await seedShellAliases(target);
  return true;
}
async function restoreShellBackup(){
  const backup=await caches.open(SHELL_BACKUP_CACHE);
  if(!await allPresent(backup,REQUIRED_SHELL))return false;
  const stable=await caches.open(SHELL_CACHE);
  return copyRequiredShell(backup,stable);
}
async function migrateLegacyShell(){
  const stable=await caches.open(SHELL_CACHE);
  if(await allPresent(stable,REQUIRED_SHELL)){
    await seedShellAliases(stable);
    return true;
  }
  if(await restoreShellBackup())return true;

  for(const url of REQUIRED_SHELL){
    if(await stable.match(requestFor(url)))continue;
    const hit=await caches.match(requestFor(url),{ignoreSearch:true});
    if(hit)await stable.put(requestFor(url),hit.clone());
  }
  const ready=await allPresent(stable,REQUIRED_SHELL);
  if(ready)await seedShellAliases(stable);
  return ready;
}

/* Fetch the critical documents into a temporary cache. Nothing in the live
   shell is changed unless both documents were fetched successfully. */
async function refreshRequiredShellAtomically(){
  await caches.delete(SHELL_STAGE_CACHE);
  const stage=await caches.open(SHELL_STAGE_CACHE);
  let staged=false;
  try{
    const results=await Promise.all(REQUIRED_SHELL.map(async url=>{
      const req=requestFor(url,{reload:true});
      try{
        const response=await fetch(req);
        if(!cacheable(response))return false;
        await stage.put(requestFor(url),response.clone());
        return true;
      }catch(_){return false}
    }));
    staged=results.every(Boolean)&&await allPresent(stage,REQUIRED_SHELL);
    if(!staged)return false;

    const stable=await caches.open(SHELL_CACHE);
    if(await allPresent(stable,REQUIRED_SHELL)){
      const backup=await caches.open(SHELL_BACKUP_CACHE);
      await copyRequiredShell(stable,backup);
    }

    try{
      await copyRequiredShell(stage,stable);
      if(!await allPresent(stable,REQUIRED_SHELL))throw new Error("shell promotion incomplete");
      return true;
    }catch(error){
      await restoreShellBackup();
      throw error;
    }
  }finally{
    await caches.delete(SHELL_STAGE_CACHE);
  }
}

async function refreshOptionalShell(){
  const shell=await caches.open(SHELL_CACHE);
  const results=await Promise.all(OPTIONAL_SHELL.map(url=>putOne(shell,url,{refresh:true})));
  return results.filter(value=>!value).length;
}

async function ensureOfflineShell(){
  await migrateLegacyShell();
  let refreshed=false;
  try{refreshed=await refreshRequiredShellAtomically()}catch(_){refreshed=false}

  const shell=await caches.open(SHELL_CACHE);
  let requiredReady=await allPresent(shell,REQUIRED_SHELL);
  if(!requiredReady){
    requiredReady=await restoreShellBackup();
  }
  if(!requiredReady){
    await notifyAll({type:"OFFLINE_SHELL_INCOMPLETE",required:true});
    return false;
  }

  await seedShellAliases(shell);
  const optionalFailed=await refreshOptionalShell();
  await notifyAll({type:"OFFLINE_SHELL_READY",optionalFailed,refreshed});
  return true;
}

async function migrateLegacyOfflinePack(){
  const names=await caches.keys();
  if(!names.includes(LEGACY_QURAN_CACHE))return;
  const legacy=await caches.open(LEGACY_QURAN_CACHE);
  const quran=await caches.open(QURAN_CACHE),tafsir=await caches.open(TAFSIR_CACHE);
  async function copySet(urls,target){
    for(let i=0;i<urls.length;i+=32){
      await Promise.all(urls.slice(i,i+32).map(async url=>{
        const req=requestFor(url);
        if(await target.match(req))return;
        const hit=await legacy.match(req);
        if(hit)await target.put(req,hit.clone());
      }));
    }
  }
  await Promise.all([copySet(QURAN_REQUIRED,quran),copySet(TAFSIR_REQUIRED,tafsir)]);
  if(await allPresent(quran,QURAN_REQUIRED))await markReady(quran,QURAN_MARKER,"quran-core-v1");
  if(await allPresent(tafsir,TAFSIR_REQUIRED))await markReady(tafsir,TAFSIR_MARKER,"tafsir-alwajeez-v1");
}

async function cleanupOldCaches(){
  const keep=new Set([SHELL_CACHE,SHELL_BACKUP_CACHE,QURAN_CACHE,TAFSIR_CACHE,AUDIO_CACHE,RUNTIME_CACHE]);
  for(const key of await caches.keys()){
    if(keep.has(key))continue;
    if(key===LEGACY_QURAN_CACHE||key.startsWith("zad-shell-v")||key.startsWith("zad-shell-stage-")||key.startsWith("zad-runtime-v")){
      await caches.delete(key);
    }
  }
}

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    await migrateLegacyShell();
    if(!await ensureOfflineShell())throw new Error("Zad shell unavailable");
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    await migrateLegacyShell();
    await migrateLegacyOfflinePack();
    await cleanupOldCaches();
    await self.clients.claim();
  })());
});

async function cacheFirst(request,primaryCache){
  const hit=await caches.match(request);
  if(hit)return hit;
  const response=await fetch(request);
  if(cacheable(response)){
    const cache=await caches.open(primaryCache);
    await cache.put(request,response.clone());
  }
  return response;
}

function isReaderPath(pathname){return /\/reader(?:\.html)?\/?$/i.test(pathname)}
function isIndexPath(pathname){return pathname==="/"||/\/index\.html$/i.test(pathname)}
async function shellFallback(url){
  const key=isReaderPath(url.pathname)?"./reader.html":"./index.html";
  for(const name of [SHELL_CACHE,SHELL_BACKUP_CACHE]){
    const cache=await caches.open(name);
    const hit=await cache.match(requestFor(key),{ignoreSearch:true});
    if(hit)return hit;
  }
  return null;
}
async function cacheSuccessfulDocument(request,response){
  if(!cacheable(response))return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(isReaderPath(url.pathname)||isIndexPath(url.pathname)){
    const shell=await caches.open(SHELL_CACHE);
    const key=isReaderPath(url.pathname)?"./reader.html":"./index.html";
    await shell.put(requestFor(key),response.clone());
    await seedShellAliases(shell);
    return;
  }
  const runtime=await caches.open(RUNTIME_CACHE);
  await runtime.put(request,response.clone());
}
async function networkFirstDocument(request){
  try{
    const response=await fetch(request);
    await cacheSuccessfulDocument(request,response);
    return response;
  }catch(error){
    const url=new URL(request.url);
    const fallback=await shellFallback(url);
    if(fallback)return fallback;
    const exact=await caches.match(request,{ignoreSearch:true});
    if(exact)return exact;
    throw error;
  }
}

function isAudioUrl(url,request){
  return request.destination==="audio"||/\.(?:mp3|m4a|ogg|aac)(?:$|\?)/i.test(url.pathname);
}
function isAudioSupportUrl(url){
  return (url.hostname==="mp3quran.net"&&/^\/api\/v3\/ayat_timing(?:\/reads)?$/.test(url.pathname))||
    (url.hostname==="cdn.jsdelivr.net"&&/\/audio\/maher\/timestamps\/\d+\.json$/i.test(url.pathname));
}
function fullAudioRequest(request){
  return new Request(request.url,{method:"GET",mode:request.mode,credentials:request.credentials,redirect:"follow"});
}
async function rangedResponse(response,rangeHeader){
  if(!rangeHeader||response.type==="opaque")return response;
  const match=/bytes=(\d*)-(\d*)/i.exec(rangeHeader);
  if(!match)return response;
  const buffer=await response.arrayBuffer();
  const size=buffer.byteLength;
  let start=match[1]?Number(match[1]):0;
  let end=match[2]?Number(match[2]):size-1;
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||start>=size||end<start){
    return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`}});
  }
  end=Math.min(end,size-1);
  const headers=new Headers(response.headers);
  headers.set("Accept-Ranges","bytes");
  headers.set("Content-Range",`bytes ${start}-${end}/${size}`);
  headers.set("Content-Length",String(end-start+1));
  return new Response(buffer.slice(start,end+1),{status:206,statusText:"Partial Content",headers});
}
async function audioFetch(request){
  const cache=await caches.open(AUDIO_CACHE);
  const full=fullAudioRequest(request);
  const hit=await cache.match(request.url,{ignoreVary:true})||await cache.match(full,{ignoreVary:true});
  if(hit)return rangedResponse(hit,request.headers.get("range"));
  return fetch(request);
}
async function audioSupportFetch(request){
  const cache=await caches.open(AUDIO_CACHE);
  const hit=await cache.match(request.url,{ignoreVary:true});
  if(hit)return hit;
  return cacheFirst(request,RUNTIME_CACHE);
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);

  if(isAudioUrl(url,request)){
    event.respondWith(audioFetch(request));
    return;
  }
  if(request.mode==="navigate"||request.destination==="document"){
    event.respondWith(networkFirstDocument(request));
    return;
  }
  if(url.href.startsWith(QCF_BASE)||url.href===QUL_HEADER){
    event.respondWith(cacheFirst(request,QURAN_CACHE));
    return;
  }
  if(isAudioSupportUrl(url)){
    event.respondWith(audioSupportFetch(request));
    return;
  }
  if(url.origin===self.location.origin&&/\/data\/tafsir\/al-wajeez\//.test(url.pathname)){
    event.respondWith(cacheFirst(request,TAFSIR_CACHE));
    return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(cacheFirst(request,RUNTIME_CACHE));
    return;
  }
  if(/mp3quran\.net|facilitator999|tarteel\.ai|jsdelivr\.net/.test(url.hostname)){
    event.respondWith(cacheFirst(request,RUNTIME_CACHE));
  }
});

async function packState(){
  const [quran,tafsir]=await Promise.all([caches.open(QURAN_CACHE),caches.open(TAFSIR_CACHE)]);
  const [qm,tm]=await Promise.all([quran.match(requestFor(QURAN_MARKER)),tafsir.match(requestFor(TAFSIR_MARKER))]);
  const quranReady=!!qm&&await allPresent(quran,QURAN_REQUIRED);
  const tafsirReady=!!tm&&await allPresent(tafsir,TAFSIR_REQUIRED);
  if(!quranReady&&qm)await quran.delete(requestFor(QURAN_MARKER));
  if(!tafsirReady&&tm)await tafsir.delete(requestFor(TAFSIR_MARKER));
  return {quranReady,tafsirReady,ready:quranReady&&tafsirReady};
}

let libraryPromise=null;
async function cacheSet(cacheName,urls,kind,offset,total){
  const cache=await caches.open(cacheName);
  let done=0,failed=0;
  for(let i=0;i<urls.length;i+=8){
    const batch=urls.slice(i,i+8);
    const results=await Promise.all(batch.map(url=>putOne(cache,url)));
    failed+=results.filter(value=>!value).length;
    done+=batch.length;
    await notifyAll({type:"OFFLINE_LIBRARY_PROGRESS",kind,done:offset+done,total});
  }
  return {cache,failed};
}
async function ensureOfflineLibrary(){
  if(libraryPromise)return libraryPromise;
  libraryPromise=(async()=>{
    const initial=await packState();
    if(initial.ready){
      await notifyAll({type:"OFFLINE_LIBRARY_READY",quran:true,tafsir:true});
      return initial;
    }
    const total=(initial.quranReady?0:QURAN_REQUIRED.length)+(initial.tafsirReady?0:TAFSIR_REQUIRED.length);
    await notifyAll({type:"OFFLINE_LIBRARY_PROGRESS",kind:"library",done:0,total});
    let offset=0,failed=0;
    if(!initial.quranReady){
      const result=await cacheSet(QURAN_CACHE,QURAN_REQUIRED,"quran",offset,total);
      failed+=result.failed;offset+=QURAN_REQUIRED.length;
      if(result.failed===0&&await allPresent(result.cache,QURAN_REQUIRED))await markReady(result.cache,QURAN_MARKER,"quran-core-v1");
    }
    if(!initial.tafsirReady){
      const result=await cacheSet(TAFSIR_CACHE,TAFSIR_REQUIRED,"tafsir",offset,total);
      failed+=result.failed;offset+=TAFSIR_REQUIRED.length;
      if(result.failed===0&&await allPresent(result.cache,TAFSIR_REQUIRED))await markReady(result.cache,TAFSIR_MARKER,"tafsir-alwajeez-v1");
    }
    const final=await packState();
    if(final.ready)await notifyAll({type:"OFFLINE_LIBRARY_READY",quran:true,tafsir:true});
    else await notifyAll({type:"OFFLINE_LIBRARY_INCOMPLETE",...final,failed});
    return final;
  })().finally(()=>{libraryPromise=null});
  return libraryPromise;
}
async function checkOfflineLibrary(){
  const state=await packState();
  await notifyAll(state.ready
    ?{type:"OFFLINE_LIBRARY_READY",quran:true,tafsir:true}
    :{type:"OFFLINE_LIBRARY_INCOMPLETE",...state,failed:0});
  return state;
}

let audioPackPromise=null;
function cleanAudioResources(resources){
  const out=[],seen=new Set();
  for(const item of Array.isArray(resources)?resources:[]){
    const url=String(typeof item==="string"?item:item?.url||"");
    const kind=typeof item==="object"&&item?.kind==="support"?"support":"audio";
    if(!/^https:\/\//i.test(url)||seen.has(url))continue;
    seen.add(url);out.push({url,kind});
  }
  return out;
}
async function fetchExplicitAudioResource(item){
  if(item.kind==="support"){
    const req=new Request(item.url,{method:"GET",mode:"cors",credentials:"omit",redirect:"follow"});
    const response=await fetch(req);
    if(!cacheable(response))throw new Error("support response");
    return {req,response};
  }
  try{
    const req=new Request(item.url,{method:"GET",mode:"cors",credentials:"omit",redirect:"follow"});
    const response=await fetch(req);
    if(cacheable(response))return {req,response};
  }catch(_){ }
  const req=new Request(item.url,{method:"GET",mode:"no-cors",credentials:"omit",redirect:"follow"});
  const response=await fetch(req);
  if(!cacheable(response))throw new Error("audio response");
  return {req,response};
}
async function cacheAudioResources(resources,tag=""){
  const clean=cleanAudioResources(resources);
  if(!clean.length)return {done:0,failed:0};
  if(audioPackPromise)return audioPackPromise;
  audioPackPromise=(async()=>{
    const cache=await caches.open(AUDIO_CACHE);let done=0,failed=0;
    for(const item of clean){
      try{
        const hit=await cache.match(item.url,{ignoreVary:true});
        if(!hit){
          const {req,response}=await fetchExplicitAudioResource(item);
          await cache.put(req,response.clone());
        }
      }catch(_){failed++}
      done++;
      await notifyAll({type:"AUDIO_OFFLINE_PROGRESS",tag,done,total:clean.length,failed});
    }
    await notifyAll({type:"AUDIO_OFFLINE_DONE",tag,done,total:clean.length,failed});
    return {done,failed};
  })().finally(()=>{audioPackPromise=null});
  return audioPackPromise;
}

self.addEventListener("message",event=>{
  const data=event.data||{};
  if(data.type==="ENSURE_OFFLINE_SHELL")event.waitUntil(ensureOfflineShell());
  if(data.type==="CHECK_OFFLINE_LIBRARY"||data.type==="CHECK_QURAN_OFFLINE")event.waitUntil(checkOfflineLibrary());
  if(data.type==="ENSURE_OFFLINE_LIBRARY"||data.type==="CACHE_QURAN_OFFLINE")event.waitUntil(ensureOfflineLibrary());
  if(data.type==="CACHE_AUDIO_PACKAGE")event.waitUntil(cacheAudioResources(data.resources,data.tag));
  if(data.type==="CACHE_AUDIO_URLS")event.waitUntil(cacheAudioResources((data.urls||[]).map(url=>({url,kind:"audio"})),data.tag));
});
