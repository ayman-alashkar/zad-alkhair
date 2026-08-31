"use strict";

/*
  Canonical-origin bootstrap.

  1) The retired GitHub Pages origin only redirects to zad-alkhair.net.
  2) On the canonical origin, request persistent browser storage for the whole
     origin. This protects the service-worker registration, Cache Storage and
     IndexedDB together from automatic storage-pressure eviction when the
     browser grants persistence.
*/
(()=>{
  const LEGACY_HOST="ayman-alashkar.github.io";
  const LEGACY_PREFIX="/zad-alkhair";
  const FINAL_ORIGIN="https://zad-alkhair.net";
  const PERSISTENCE_KEY="zad:storage-persistent-v1";
  const PERSISTENCE_CHECK_KEY="zad:storage-persistence-checked-at-v1";

  if(location.hostname===LEGACY_HOST){
    let path=location.pathname||"/";
    if(path===LEGACY_PREFIX)path="/";
    else if(path.startsWith(LEGACY_PREFIX+"/"))path=path.slice(LEGACY_PREFIX.length)||"/";
    if(!path.startsWith("/"))path="/"+path;
    location.replace(FINAL_ORIGIN+path+location.search+location.hash);
    return;
  }

  if(location.origin!==FINAL_ORIGIN)return;

  let persistencePromise=null;
  async function requestDurableStorage(reason="load"){
    if(!navigator.storage?.persisted||!navigator.storage?.persist)return false;
    if(persistencePromise)return persistencePromise;

    persistencePromise=(async()=>{
      let persistent=false;
      try{
        persistent=await navigator.storage.persisted();
        if(!persistent)persistent=await navigator.storage.persist();
      }catch(_){persistent=false}

      try{
        localStorage.setItem(PERSISTENCE_KEY,persistent?"1":"0");
        localStorage.setItem(PERSISTENCE_CHECK_KEY,String(Date.now()));
      }catch(_){ }

      try{
        window.dispatchEvent(new CustomEvent("zad-storage-persistence",{
          detail:{persistent,reason}
        }));
      }catch(_){ }
      return persistent;
    })().finally(()=>{persistencePromise=null});

    return persistencePromise;
  }

  /* Ask on every canonical app/document start. Chromium decides silently from
     its own engagement/install heuristics, so a previous false result is never
     treated as permanent. */
  requestDurableStorage("load");

  /* Installation is an important Chromium persistence signal. Ask again as
     soon as installation completes, and once after the user's first interaction
     so a newly eligible origin does not have to wait for a later page load. */
  window.addEventListener("appinstalled",()=>requestDurableStorage("appinstalled"));
  window.addEventListener("pageshow",()=>requestDurableStorage("pageshow"),{once:true});
  window.addEventListener("pointerdown",()=>requestDurableStorage("interaction"),{once:true,capture:true,passive:true});
})();
