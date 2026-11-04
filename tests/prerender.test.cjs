const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

/* The storage gateway of the reader, run alone against a fake page. */
function gateway(prerendering){
  const src=fs.readFileSync(path.join(root,'src/reader/state.js'),'utf8');
  const start=src.indexOf('const prerenderWrites='),end=src.indexOf('const track=document.getElementById("track")');
  const store=new Map(),listeners={};
  const document={prerendering,addEventListener:(t,f)=>{listeners[t]=f}};
  const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const ctx=vm.createContext({document,localStorage,JSON});
  vm.runInContext(src.slice(start,end)+';this.api={storageGet,storageSet,storageJsonGet,storageJsonSet}',ctx);
  return {api:ctx.api,store,document,activate(){document.prerendering=false;listeners.prerenderingchange?.()}};
}

test('a reader prepared in the background writes nothing until it is opened',()=>{
  const g=gateway(true);
  g.store.set('zad:qcf4:last-position','{"page":3}');
  g.api.storageJsonSet('zad:qcf4:last-position',{page:50});
  g.api.storageSet('zad:qcf4:theme','light');
  assert.equal(g.store.get('zad:qcf4:last-position'),'{"page":3}');
  assert.equal(g.store.has('zad:qcf4:theme'),false);
  // The prepared page still reads its own pending values.
  assert.deepEqual({...g.api.storageJsonGet('zad:qcf4:last-position')},{page:50});
  g.activate();
  assert.equal(g.store.get('zad:qcf4:last-position'),'{"page":50}');
});

test('a value changed on home while the reader was prepared is kept',()=>{
  const g=gateway(true);
  g.store.set('zad:qcf4:theme','light');
  g.api.storageSet('zad:qcf4:theme','light');
  g.store.set('zad:qcf4:theme','dark'); // the user switched theme on home
  g.activate();
  assert.equal(g.store.get('zad:qcf4:theme'),'dark');
});

test('a normally opened reader writes immediately',()=>{
  const g=gateway(false);
  g.api.storageSet('k','v');
  assert.equal(g.store.get('k'),'v');
});

test('home asks the browser to prepare only the reading-card links',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const m=html.match(/<script type="speculationrules">([\s\S]*?)<\/script>/);
  assert.ok(m,'speculation rules present');
  const rule=JSON.parse(m[1]).prerender[0];
  assert.match(rule.where.selector_matches,/zt-continue\[href\*='page='\]/);
  assert.match(rule.where.selector_matches,/\.zt-card a\.zt-btn/);
});

test('the offline download waits until a prepared reader is opened',()=>{
  const src=fs.readFileSync(path.join(root,'src/reader/offline.js'),'utf8');
  assert.match(src,/if\(document\.prerendering\)document\.addEventListener\("prerenderingchange",prepareReaderServiceWorker,\{once:true\}\);/);
});
