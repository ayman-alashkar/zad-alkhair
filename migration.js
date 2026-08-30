"use strict";

/*
  The legacy GitHub Pages origin is retired. It no longer migrates, copies,
  clears, or rewrites any local identity. Every legacy URL is forwarded to the
  identical path on the canonical domain, preserving its query and hash.
*/
(()=>{
  const LEGACY_HOST="ayman-alashkar.github.io";
  const LEGACY_PREFIX="/zad-alkhair";
  const FINAL_ORIGIN="https://zad-alkhair.net";

  if(location.hostname!==LEGACY_HOST)return;

  let path=location.pathname||"/";
  if(path===LEGACY_PREFIX)path="/";
  else if(path.startsWith(LEGACY_PREFIX+"/"))path=path.slice(LEGACY_PREFIX.length)||"/";
  if(!path.startsWith("/"))path="/"+path;

  location.replace(FINAL_ORIGIN+path+location.search+location.hash);
})();
