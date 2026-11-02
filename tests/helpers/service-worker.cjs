const vm=require("node:vm");
const fs=require("node:fs");
const source=fs.readFileSync(process.env.SW_PATH||__dirname+"/../../sw.js","utf8");

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
  const context=vm.createContext({self,caches,URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,console,
    fetch:async(...args)=>{calls.push(key(args[0]));return fetchImpl(...args)}});
  vm.runInContext(source,context);
  return {run:s=>vm.runInContext(s,context),stores,messages,calls,setFetch:f=>fetchImpl=f};
}

module.exports={setup};
