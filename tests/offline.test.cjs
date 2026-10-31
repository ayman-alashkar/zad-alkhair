const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(process.env.SW_PATH||__dirname+'/../sw.js','utf8');

function setup(){
  const stores=new Map(),messages=[],calls=[];
  const key=r=>typeof r==='string'?r:r.url;
  class Cache {
    constructor(){this.items=new Map()}
    async match(r,opts={}) {
      const url=key(r);
      if(this.items.has(url))return this.items.get(url).clone();
      if(opts.ignoreSearch){
        const u=new URL(url);u.search='';
        for(const [k,v] of this.items){const vurl=new URL(k);vurl.search='';if(vurl.href===u.href)return v.clone()}
      }
    }
    async put(r,v){this.items.set(key(r),v.clone())}
    async delete(r){return this.items.delete(key(r))}
  }
  const caches={
    async open(name){if(!stores.has(name))stores.set(name,new Cache());return stores.get(name)},
    async keys(){return [...stores.keys()]},
    async delete(name){return stores.delete(name)},
    async match(r,opts){for(const cache of stores.values()){const hit=await cache.match(r,opts);if(hit)return hit}}
  };
  const self={location:new URL('https://example.test/'),registration:{scope:'https://example.test/'},clients:{matchAll:async()=>[{postMessage:m=>messages.push(m)}]},addEventListener(){},skipWaiting:async()=>{}};
  let fetchImpl=async r=>new Response('ok:'+key(r));
  const context=vm.createContext({self,caches,URL,Request,Response,AbortController,setTimeout,clearTimeout,console,
    fetch:async(...args)=>{calls.push(key(args[0]));return fetchImpl(...args)}});
  vm.runInContext(source,context);
  return {run:s=>vm.runInContext(s,context),stores,messages,calls,setFetch:f=>fetchImpl=f};
}

test('shell survives offline startup and query-string reader navigation',async()=>{
  const e=setup();
  assert.equal(await e.run('ensureOfflineShell()'),true);
  e.setFetch(async()=>{throw Error('offline')});
  const root=await e.run("networkFirstDocument(new Request('https://example.test/'))");
  const reader=await e.run("networkFirstDocument(new Request('https://example.test/reader.html?home=1&from=zad'))");
  assert.match(await root.text(),/ok:https:\/\/example\.test\/$/);
  assert.match(await reader.text(),/ok:https:\/\/example\.test\/reader$/);
  await assert.rejects(e.run("networkFirstDocument(new Request('https://example.test/other/'))"),/offline/);
});

test('known shell falls back on server error or a stalled network',async()=>{
  const e=setup();await e.run('ensureOfflineShell()');
  e.setFetch(async()=>new Response('server error',{status:503}));
  assert.match(await (await e.run("networkFirstDocument(new Request('https://example.test/'))")).text(),/ok:https:\/\/example\.test\/$/);
  e.setFetch((r,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('timeout')))));
  assert.match(await (await e.run("networkFirstDocument(new Request('https://example.test/reader'))")).text(),/ok:https:\/\/example\.test\/reader$/);
});

test('failed shell refresh retains last good pages',async()=>{
  const e=setup();await e.run('ensureOfflineShell()');
  e.setFetch(async r=>r.url.endsWith('/reader')?new Response('failure',{status:503}):new Response('new index'));
  await e.run('ensureOfflineShell()');
  e.setFetch(async()=>{throw Error('offline')});
  assert.match(await (await e.run("networkFirstDocument(new Request('https://example.test/'))")).text(),/ok:https:\/\/example\.test\/$/);
});

test('offline library resumes only missing files and restores readiness markers',async()=>{
  const e=setup();await e.run('ensureOfflineLibrary()');
  assert.equal((await e.run('packState()')).ready,true);
  const q=e.stores.get('zad-quran-core-v1'), t=e.stores.get('zad-tafsir-alwajeez-v1');
  const page='https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/pages/003.json';
  await q.delete(page); await t.delete('https://example.test/__zad_tafsir_alwajeez_v1_ready__');
  e.calls.length=0;e.messages.length=0;
  await e.run('ensureOfflineLibrary()');
  assert.deepEqual(e.calls,[page]);
  assert.equal((await e.run('packState()')).ready,true);
  const progress=e.messages.filter(m=>m.type==='OFFLINE_LIBRARY_PROGRESS');
  assert.ok(progress.length>0&&progress.every(m=>m.total===1));
});

test('failed download remains incomplete and can resume',async()=>{
  const e=setup();const missing='https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/pages/001.json';
  e.setFetch(async r=>r.url===missing?new Response('fail',{status:503}):new Response('ok'));
  assert.equal((await e.run('ensureOfflineLibrary()')).ready,false);
  const progress=e.messages.filter(m=>m.type==='OFFLINE_LIBRARY_PROGRESS');
  assert.ok(progress.at(-1).done<progress.at(-1).total);
  e.calls.length=0;e.setFetch(async()=>new Response('ok'));
  assert.equal((await e.run('ensureOfflineLibrary()')).ready,true);
  assert.deepEqual(e.calls,[missing]);
});

test('concurrent shell refreshes share one staging operation',async()=>{
  const e=setup();
  const result=await e.run('Promise.all([ensureOfflineShell(),ensureOfflineShell(),ensureOfflineShell()])');
  assert.deepEqual(Array.from(result),[true,true,true]);
  assert.equal(e.calls.filter(u=>u==='https://example.test/').length,1);
  assert.equal(e.calls.filter(u=>u==='https://example.test/reader').length,1);
});

test('existing redirected shell responses remain usable for offline navigation',async()=>{
  const http=require('node:http');
  const server=http.createServer((req,res)=>{
    if(req.url==='/redirect'){res.writeHead(302,{Location:'/page'});res.end();return}
    res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Saved page</h1>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const redirected=await fetch('http://127.0.0.1:'+server.address().port+'/redirect');
    assert.equal(redirected.redirected,true);
    const e=setup(),cache=await e.run('caches.open("zad-shell-stable-v1")');
    await cache.put(new Request('https://example.test/index.html'),redirected.clone());
    await cache.put(new Request('https://example.test/reader.html'),redirected.clone());
    e.setFetch(async()=>{throw Error('offline')});
    const home=await e.run("networkFirstDocument(new Request('https://example.test/',{redirect:'manual'}))");
    const reader=await e.run("networkFirstDocument(new Request('https://example.test/reader',{redirect:'manual'}))");
    for(const response of [home,reader]){
      assert.equal(response.redirected,false);
      assert.equal(response.headers.get('content-type'),'text/html');
      assert.equal(await response.text(),'<h1>Saved page</h1>');
    }
  }finally{await new Promise(resolve=>server.close(resolve))}
});
