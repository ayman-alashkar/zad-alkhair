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
const SHELL_STAGE_CACHE="zad-shell-stage-v190";
const QURAN_CACHE="zad-quran-core-v1";
const TAFSIR_CACHE="zad-tafsir-alwajeez-v1";
const AUDIO_CACHE="zad-audio-v1";
const RUNTIME_CACHE="zad-runtime-v145";
const LEGACY_QURAN_CACHE="zad-quran-v80";
const DIRECT_QURAN_PATHS=new Set(["/quran-read/","/quran-read/1/","/quran-read/2/","/quran-read/3/","/quran-read/4/","/quran-read/5/","/quran-read/6/","/quran-read/7/","/quran-read/8/","/quran-read/9/","/quran-read/10/","/quran-read/11/","/quran-read/12/","/quran-read/13/","/quran-read/14/","/quran-read/15/","/quran-read/16/","/quran-read/17/","/quran-read/18/","/quran-read/19/","/quran-read/20/","/quran-read/21/","/quran-read/22/","/quran-read/23/","/quran-read/24/","/quran-read/25/","/quran-read/26/","/quran-read/27/","/quran-read/28/","/quran-read/29/","/quran-read/30/","/quran-read/31/","/quran-read/32/","/quran-read/33/","/quran-read/34/","/quran-read/35/","/quran-read/36/","/quran-read/37/","/quran-read/38/","/quran-read/39/","/quran-read/40/","/quran-read/41/","/quran-read/42/","/quran-read/43/","/quran-read/44/","/quran-read/45/","/quran-read/46/","/quran-read/47/","/quran-read/48/","/quran-read/49/","/quran-read/50/","/quran-read/51/","/quran-read/52/","/quran-read/53/","/quran-read/54/","/quran-read/55/","/quran-read/56/","/quran-read/57/","/quran-read/58/","/quran-read/59/","/quran-read/60/","/quran-read/61/","/quran-read/62/","/quran-read/63/","/quran-read/64/","/quran-read/65/","/quran-read/66/","/quran-read/67/","/quran-read/68/","/quran-read/69/","/quran-read/70/","/quran-read/71/","/quran-read/72/","/quran-read/73/","/quran-read/74/","/quran-read/75/","/quran-read/76/","/quran-read/77/","/quran-read/78/","/quran-read/79/","/quran-read/80/","/quran-read/81/","/quran-read/82/","/quran-read/83/","/quran-read/84/","/quran-read/85/","/quran-read/86/","/quran-read/87/","/quran-read/88/","/quran-read/89/","/quran-read/90/","/quran-read/91/","/quran-read/92/","/quran-read/93/","/quran-read/94/","/quran-read/95/","/quran-read/96/","/quran-read/97/","/quran-read/98/","/quran-read/99/","/quran-read/100/","/quran-read/101/","/quran-read/102/","/quran-read/103/","/quran-read/104/","/quran-read/105/","/quran-read/106/","/quran-read/107/","/quran-read/108/","/quran-read/109/","/quran-read/110/","/quran-read/111/","/quran-read/112/","/quran-read/113/","/quran-read/114/","/quran-listen/","/quran-listen/1/","/quran-listen/2/","/quran-listen/3/","/quran-listen/4/","/quran-listen/5/","/quran-listen/6/","/quran-listen/7/","/quran-listen/8/","/quran-listen/9/","/quran-listen/10/","/quran-listen/11/","/quran-listen/12/","/quran-listen/13/","/quran-listen/14/","/quran-listen/15/","/quran-listen/16/","/quran-listen/17/","/quran-listen/18/","/quran-listen/19/","/quran-listen/20/","/quran-listen/21/","/quran-listen/22/","/quran-listen/23/","/quran-listen/24/","/quran-listen/25/","/quran-listen/26/","/quran-listen/27/","/quran-listen/28/","/quran-listen/29/","/quran-listen/30/","/quran-listen/31/","/quran-listen/32/","/quran-listen/33/","/quran-listen/34/","/quran-listen/35/","/quran-listen/36/","/quran-listen/37/","/quran-listen/38/","/quran-listen/39/","/quran-listen/40/","/quran-listen/41/","/quran-listen/42/","/quran-listen/43/","/quran-listen/44/","/quran-listen/45/","/quran-listen/46/","/quran-listen/47/","/quran-listen/48/","/quran-listen/49/","/quran-listen/50/","/quran-listen/51/","/quran-listen/52/","/quran-listen/53/","/quran-listen/54/","/quran-listen/55/","/quran-listen/56/","/quran-listen/57/","/quran-listen/58/","/quran-listen/59/","/quran-listen/60/","/quran-listen/61/","/quran-listen/62/","/quran-listen/63/","/quran-listen/64/","/quran-listen/65/","/quran-listen/66/","/quran-listen/67/","/quran-listen/68/","/quran-listen/69/","/quran-listen/70/","/quran-listen/71/","/quran-listen/72/","/quran-listen/73/","/quran-listen/74/","/quran-listen/75/","/quran-listen/76/","/quran-listen/77/","/quran-listen/78/","/quran-listen/79/","/quran-listen/80/","/quran-listen/81/","/quran-listen/82/","/quran-listen/83/","/quran-listen/84/","/quran-listen/85/","/quran-listen/86/","/quran-listen/87/","/quran-listen/88/","/quran-listen/89/","/quran-listen/90/","/quran-listen/91/","/quran-listen/92/","/quran-listen/93/","/quran-listen/94/","/quran-listen/95/","/quran-listen/96/","/quran-listen/97/","/quran-listen/98/","/quran-listen/99/","/quran-listen/100/","/quran-listen/101/","/quran-listen/102/","/quran-listen/103/","/quran-listen/104/","/quran-listen/105/","/quran-listen/106/","/quran-listen/107/","/quran-listen/108/","/quran-listen/109/","/quran-listen/110/","/quran-listen/111/","/quran-listen/112/","/quran-listen/113/","/quran-listen/114/"]);

const QCF_BASE="https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/";
const QUL_HEADER="https://static-cdn.tarteel.ai/qul/fonts/surah-names/surah-header/QCF_SurahHeader_COLOR-Regular.ttf";

const READER_SHELL="./quran-read/";
const REQUIRED_SHELL=["./index.html",READER_SHELL];
const SHELL_FETCH_URLS={"./index.html":"./",[READER_SHELL]:READER_SHELL};
const SHELL_ALIASES={
  "./":"./index.html",
  "./quran-read":READER_SHELL
};
const OPTIONAL_SHELL=[
  "./quran-index/",
  "./seo-pages.css?v=88e7bb5900","./seo-pages.js?v=88e7bb5900","./seo-install.js?v=88e7bb5900",
  "./manifest.json","./migration.js","./vendor/adhan-4.4.4.umd.min.js",
  "./fonts/alexandria-arabic-400-800.woff2","./fonts/alexandria-latin-400-800.woff2",
  "./fonts/amiri-arabic-400.woff2","./fonts/amiri-latin-400.woff2","./fonts/amiri-arabic-700.woff2","./fonts/amiri-latin-700.woff2",
  "./fonts/aref-ruqaa-arabic-400.woff2","./fonts/aref-ruqaa-arabic-700.woff2",
  "./icons/icon-32.png","./icons/icon-180.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-512-maskable.png","./icons/zad-mark.svg","./icons/zad-mark-reverse.svg","./icons/zad-rosette.svg","./icons/migration-ready-v115.svg"
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
    const hit=await caches.match(requestFor(url),{ignoreSearch:true})||
      (url===READER_SHELL&&await caches.match(requestFor("./reader.html"),{ignoreSearch:true}));
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
      const req=requestFor(SHELL_FETCH_URLS[url],{reload:true});
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

let shellPromise=null;
async function ensureOfflineShell(){
  if(shellPromise)return shellPromise;
  shellPromise=(async()=>{
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
  })();
  try{return await shellPromise}finally{shellPromise=null}
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

/* A historical export truncated 002.json. Repair only that invalid cached file;
   retain all valid Quran, Tafsir and audio downloads, including offline users. */
async function repairCachedBaqarah(){
  const cache=await caches.open(TAFSIR_CACHE);
  const request=requestFor("./data/tafsir/al-wajeez/002.json");
  const saved=await cache.match(request);
  if(!saved)return;
  async function valid(response){
    try{
      const data=await response.clone().json();
      return data.schema_version===1&&data.source_id==="wahba_al_zuhayli_al_wajeez"&&
        data.surah===2&&Object.keys(data.ayahs).length===286&&
        Array.from({length:286},(_,i)=>data.ayahs[i+1]).every(r=>typeof r?.text==="string"&&typeof r?.sha256==="string");
    }catch(_){return false}
  }
  if(await valid(saved))return;
  await cache.delete(request);
  await cache.delete(requestFor(TAFSIR_MARKER));
  try{
    const response=await fetch(request,{cache:"no-store"});
    if(response.ok&&await valid(response)){
      await cache.put(request,response);
      if(await allPresent(cache,TAFSIR_REQUIRED))await markReady(cache,TAFSIR_MARKER,"tafsir-alwajeez-v1");
    }
  }catch(_){/* The normal offline-library download can resume this one file. */}
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
    await repairCachedBaqarah();
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

function isDirectQuranPath(pathname){return DIRECT_QURAN_PATHS.has(pathname.endsWith("/")?pathname:pathname+"/")}
async function shellFallback(url){
  const key=shellKeyFor(url);
  if(!key)return null;
  for(const name of [SHELL_CACHE,SHELL_BACKUP_CACHE]){
    const cache=await caches.open(name);
    const hit=await cache.match(requestFor(key),{ignoreSearch:true});
    if(hit){
      // Older caches can contain a redirected response. Navigation requests
      // cannot use it directly, even when its final status is 200.
      if(hit.redirected)return new Response(hit.body,{status:hit.status,statusText:hit.statusText,headers:hit.headers});
      return hit;
    }
  }
  return null;
}
async function directQuranFallback(url){
  const reader=await shellFallback(new URL(READER_SHELL,self.registration.scope));
  if(!reader)return null;
  const supported=(await reader.clone().text()).match(/<meta name="zk-direct-reader" content="([\d,]*)">/);
  const surah=url.pathname.match(/\/(\d+)\/?$/)?.[1];
  return supported&&(!surah||supported[1].split(",").includes(surah))?reader:null;
}
async function cacheSuccessfulDocument(request,response){
  if(!cacheable(response))return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const key=shellKeyFor(url);
  if(key){
    const shell=await caches.open(SHELL_CACHE);
    await shell.put(requestFor(key),response.clone());
    await seedShellAliases(shell);
    return;
  }
  const runtime=await caches.open(RUNTIME_CACHE);
  await runtime.put(request,response.clone());
}
async function networkFirstDocument(request){
  const url=new URL(request.url);
  const isShell=!!shellKeyFor(url);
  const direct=!isShell&&url.origin===self.location.origin&&isDirectQuranPath(url.pathname);
  const fallback=()=>direct?directQuranFallback(url):shellFallback(url);
  const controller=isShell||direct?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),2000):null;
  try{
    const response=await fetch(request,controller?{signal:controller.signal}:undefined);
    if((isShell||direct)&&response.status>=500){
      const saved=await fallback();
      if(saved)return saved;
    }
    if(!direct)await cacheSuccessfulDocument(request,response);
    return response;
  }catch(error){
    const saved=await fallback();
    if(saved)return saved;
    const exact=await caches.match(request,{ignoreSearch:true});
    if(exact)return exact;
    throw error;
  }finally{
    if(timer)clearTimeout(timer);
  }
}

/* The app shell (index and reader) opens straight from the device; the server
   copy is checked in the background and used from the next opening on.
   Waiting for the network first made every move between the two pages pay a
   round trip, up to the 2 s timeout on a weak connection. The first visit,
   before anything is cached, still goes to the network. */
function shellKeyFor(url){
  if(url.origin!==self.location.origin)return null;
  if(url.pathname==="/quran-read/"||url.pathname==="/quran-read")return READER_SHELL;
  if(url.pathname==="/"||url.pathname==="/index.html")return "./index.html";
  return null;
}
async function revalidateShellDocument(key){
  const response=await fetch(requestFor(SHELL_FETCH_URLS[key]));
  // Only a complete page replaces the saved one: no errors, no redirects-in-flight.
  if(!response.ok||response.type==="opaqueredirect")return false;
  const shell=await caches.open(SHELL_CACHE);
  await shell.put(requestFor(key),response.clone());
  await seedShellAliases(shell);
  return true;
}
async function shellFirstDocument(request,event){
  // The user pressed Reload (the browser marks it "no-cache", or "reload" for a
  // hard reload): they asked for the latest page, so go to the network first,
  // with the saved copy still the fallback after 2 s or offline.
  if(request.cache==="no-cache"||request.cache==="reload")return networkFirstDocument(request);
  const url=new URL(request.url),key=shellKeyFor(url);
  const saved=key?await shellFallback(url):null;
  if(!saved)return networkFirstDocument(request);
  const update=revalidateShellDocument(key).catch(()=>false);
  if(event?.waitUntil)event.waitUntil(update);
  return saved;
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

  // Guide movies are streamed only: never read or write the offline caches.
  if(request.destination==="video"||/\.(?:mp4|webm)$/i.test(url.pathname)){
    event.respondWith(fetch(request,{cache:"no-store"}));
    return;
  }
  if(isAudioUrl(url,request)){
    event.respondWith(audioFetch(request));
    return;
  }
  if(request.mode==="navigate"||request.destination==="document"){
    event.respondWith(shellFirstDocument(request,event));
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
  /* تصحيحات التقويم الهجري: من الشبكة دائمًا، والصفحة تحفظ آخر نسخة بنفسها. */
  if(url.origin===self.location.origin&&/\/data\/hijri-adjustments\.json$/.test(url.pathname))return;
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
async function missingUrls(cache,urls){
  const missing=[];
  for(let i=0;i<urls.length;i+=32){
    const batch=urls.slice(i,i+32);
    const hits=await Promise.all(batch.map(url=>cache.match(requestFor(url))));
    batch.forEach((url,index)=>{if(!hits[index])missing.push(url)});
  }
  return missing;
}
async function cacheSet(cache,urls,kind,offset,total){
  let done=0,failed=0;
  for(let i=0;i<urls.length;i+=8){
    const batch=urls.slice(i,i+8);
    const results=await Promise.all(batch.map(url=>putOne(cache,url)));
    const batchFailed=results.filter(value=>!value).length;
    failed+=batchFailed;
    done+=batch.length-batchFailed;
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
    const [quran,tafsir]=await Promise.all([caches.open(QURAN_CACHE),caches.open(TAFSIR_CACHE)]);
    const [missingQuran,missingTafsir]=await Promise.all([
      initial.quranReady?[]:missingUrls(quran,QURAN_REQUIRED),
      initial.tafsirReady?[]:missingUrls(tafsir,TAFSIR_REQUIRED)
    ]);
    const total=missingQuran.length+missingTafsir.length;
    if(total)await notifyAll({type:"OFFLINE_LIBRARY_PROGRESS",kind:"library",done:0,total});
    let offset=0,failed=0;
    if(!initial.quranReady){
      const result=await cacheSet(quran,missingQuran,"quran",offset,total);
      failed+=result.failed;offset+=missingQuran.length-result.failed;
      if(result.failed===0&&await allPresent(result.cache,QURAN_REQUIRED))await markReady(result.cache,QURAN_MARKER,"quran-core-v1");
    }
    if(!initial.tafsirReady){
      const result=await cacheSet(tafsir,missingTafsir,"tafsir",offset,total);
      failed+=result.failed;offset+=missingTafsir.length-result.failed;
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


