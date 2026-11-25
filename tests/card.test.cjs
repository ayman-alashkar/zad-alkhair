"use strict";
/* بيانات بطاقة الكلمة (src/reader/card/data.mjs) على ملفات المستودع نفسها. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.join(__dirname,"..");

globalThis.fetch=async url=>{
  const f=path.join(ROOT,decodeURIComponent(String(url)));
  if(!fs.existsSync(f))return {ok:false,json:async()=>null};
  return {ok:true,json:async()=>JSON.parse(fs.readFileSync(f,"utf8"))};
};
const load=()=>import(path.join(ROOT,"src/reader/card/data.mjs"));

test("locate and word layers: تعملون in 2:74 (page 11)",async()=>{
  const D=await load();
  const loc=await D.locate({page:11,gi:1195});
  assert.equal(loc.surah,2);assert.equal(loc.ayah,74);
  const L=await D.wordLayers(11,1195);
  assert.equal(L.text,"تَعۡمَلُونَ");
  assert.match(L.meaning,/^العمل/);assert.match(L.sarf,/تَفْعَلُ/);
});

test("ayah words span pages, mutashabihat, tafsir, irab",async()=>{
  const D=await load();
  const w=await D.ayahWords(11,2,74);
  assert.equal(w.length,37);
  const m=await D.mutashabihatFor(1195);
  assert.ok(m.some(p=>p.occ.length===6));
  assert.match(await D.tafsir("al-mukhtasar",2,74),/^ثم قست/);
  assert.match(await D.tafsir("al-wajeez",2,74),/صَلُبَتْ/);
  assert.match(await D.ayahIrab(2,74),/قَسَتْ/);
  assert.equal((await D.fawaed(11)).length,3);
});

test("ayah counts follow each riwaya, prints included",async()=>{
  const D=await load();
  assert.equal((await D.ayahCounts(2,"hafs")).riwaya.count,286);
  assert.equal((await D.ayahCounts(2,"bazzi")).riwaya.count,285);
  const duri3=await D.ayahCounts(3,"duri");   // المطبوع يعدّ «تحبون» ولا يعدّ «إبراهيم»: 200 كالمدني الأول
  assert.equal(duri3.riwaya.code,"A");assert.equal(duri3.riwaya.count,200);
  assert.equal((await D.ayahCounts(78,"bazzi")).riwaya.count,41);   // «قريبا» في مطبوع البزي
});
