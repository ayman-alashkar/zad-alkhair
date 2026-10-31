const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../seo-pages.js','utf8');
function fixture(blocked=false){
  const root={dataset:{}},meta={},button={hidden:true,attrs:{},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},addEventListener(k,fn){this[k]=fn}},events={},store=new Map([['zad:qcf4:theme','dark']]);
  const ctx=vm.createContext({document:{documentElement:root,querySelector:()=>meta,getElementById:()=>button,addEventListener:(k,fn)=>events[k]=fn},window:{addEventListener:(k,fn)=>events[k]=fn},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return store.get(k)},setItem:(k,v)=>{if(blocked)throw Error('blocked');store.set(k,v)}}});
  vm.runInContext(source,ctx);return {root,meta,button,events,store};
}
test('guide restores reader preference before content and keeps toggles and cross-tab changes consistent',()=>{
  const f=fixture();assert.equal(f.root.dataset.theme,'dark');assert.equal(f.meta.content,'#061F1D');
  f.events.DOMContentLoaded();assert.equal(f.button.hidden,false);assert.equal(f.button.attrs['aria-pressed'],'true');
  f.button.click();assert.equal(f.root.dataset.theme,'light');assert.equal(f.meta.content,'#F5F0E4');assert.equal(f.store.get('zad:qcf4:theme'),'light');
  f.events.storage({key:'zad:qcf4:theme',newValue:'dark'});assert.equal(f.button.attrs['aria-pressed'],'true');
  f.events.storage({key:'unrelated',newValue:'light'});assert.equal(f.root.dataset.theme,'dark');
});
test('blocked storage still allows an accessible local theme toggle',()=>{
  const f=fixture(true);f.events.DOMContentLoaded();assert.equal(f.root.dataset.theme,'light');
  f.button.click();assert.equal(f.root.dataset.theme,'dark');assert.equal(f.button.attrs['aria-label'],'تفعيل الوضع النهاري');
});
