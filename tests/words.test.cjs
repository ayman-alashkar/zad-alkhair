"use strict";
/* الفهرس الموحّد للكلمات وطبقة المعنى والإعراب والتصريف (scripts/build-words.mjs). */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const ROOT=path.join(__dirname,"..");
const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),"utf8"));
const H=read("data/mushaf-src/hafs.json");
const idx=read("data/words/index.json");
const gi=(su,a,k)=>H.ayah_starts[H.surahs[su-1].first_ayah+a-1]+k; // k من 0
const page=p=>read(`data/words/pages/${String(p).padStart(3,"0")}.json`);

test("generated word files are up to date",()=>{
  execFileSync(process.execPath,[path.join(ROOT,"scripts/build-words.mjs"),"--check"],{stdio:"pipe"});
});

test("every word appears exactly once across the 604 layer pages, with meaning, irab and sarf",()=>{
  const seen=new Uint8Array(H.words.length);
  for(let p=1;p<=604;p++){
    const d=page(p);
    assert.equal(d.license,"CC BY 4.0");
    assert.deepEqual(d.columns,["gi","meaning","irab","sarf"]);
    for(const [g,m,i,s] of d.words){
      assert.equal(seen[g],0,`gi ${g} twice`);seen[g]=1;
      assert.ok(m&&i&&s,`gi ${g} missing text`);
      assert.ok(g>=idx.page_starts[p-1]&&(p===604||g<idx.page_starts[p]),`gi ${g} on wrong page ${p}`);
    }
  }
  assert.equal(seen.reduce((a,b)=>a+b,0),H.words.length);
});

test("index arrays cover every word; known mapping exceptions are kept",()=>{
  assert.equal(idx.count,77432);
  assert.equal(idx.qcf_line.length,idx.count);
  assert.equal(idx.qcf_word.length,idx.count);
  assert.deepEqual(idx.center_wno,{"29":5}); // 2:1 «الٓمٓ» رقمها 5 عند المركز
  const lawma=gi(15,7,0);
  assert.ok(idx.qcf_extra[lawma],"15:7 لوما: second QCF glyph recorded");
  const ilyasin=gi(37,130,3);
  assert.equal(idx.qcf_line[ilyasin],idx.qcf_line[ilyasin-1]);
  assert.equal(idx.qcf_word[ilyasin],idx.qcf_word[ilyasin-1],"37:130 إل ياسين: one QCF glyph for two words");
});

test("spot checks: words line up with their meanings",()=>{
  const at=g=>{let p=1;while(p<604&&idx.page_starts[p]<=g)p++;return page(p).words.find(w=>w[0]===g)};
  assert.match(at(29)[3],/\{الم\}/);
  assert.match(at(H.words.length-1)[1],/بنو آدم/);
  assert.match(at(gi(15,7,0))[3],/لَوْمَا/);
});

test("mutashabihat: every QUL occurrence maps to words inside its own ayah",()=>{
  const M=read("data/words/mutashabihat.json").phrases;
  const P=read("data/words-src/qul-mutashabihat/phrases.json");
  assert.equal(Object.keys(M).length,814);
  const ayahStart=new Map();H.surahs.forEach(s=>{for(let a=1;a<=s.ayah_count;a++)ayahStart.set(`${s.number}:${a}`,H.ayah_starts[s.first_ayah+a-1])});
  const ayahOf=g=>{let lo=0,hi=H.ayah_starts.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(H.ayah_starts[m]<=g)lo=m;else hi=m-1}return lo};
  let n=0;
  for(const [id,occ] of Object.entries(M)){
    const want=Object.values(P[id].ayah).reduce((s,x)=>s+x.length,0);
    assert.equal(occ.length,want,`phrase ${id}`);
    for(const [a,b] of occ){n++;assert.ok(a<=b&&ayahOf(a)===ayahOf(b),`phrase ${id} [${a},${b}] crosses an ayah`)}
  }
  assert.equal(n,3558);
  const text=([a,b])=>H.words.slice(a,b+1).join(" ");
  assert.ok(M["16318"].map(text).filter(t=>t==="إِن كُنتَ مِنَ ٱلصَّٰدِقِينَ").length>=3,"15:7 offset handled via QCF split");
  assert.ok(M["4970"].some(o=>text(o)==="فَسَيُؤۡتِيهِ أَجۡرًا عَظِيمࣰا"),"48:10 QUL fix");
});
