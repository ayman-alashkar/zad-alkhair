"use strict";
/* بيانات البطاقة على مستوى الآية والصفحة والسورة (scripts/build-card-data.mjs). */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const ROOT=path.join(__dirname,"..");
const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),"utf8"));
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");

test("generated card data is up to date",()=>{
  execFileSync(process.execPath,[path.join(ROOT,"scripts/build-card-data.mjs"),"--check"],{stdio:"pipe"});
});

for(const dir of ["data/tafsir/al-mukhtasar","data/tafsir/al-saadi","data/i3rab/markaz-tafsir"]){
  test(`${dir}: 114 surahs, 6236 ayahs, every hash matches`,()=>{
    const index=read(`${dir}/index.json`),manifest=read(`${dir}/manifest.json`);
    assert.equal(index.surah_files.length,114);
    assert.equal(manifest.license,"CC BY 4.0");
    let n=0;
    for(const [i,f] of index.surah_files.entries()){
      const body=fs.readFileSync(path.join(ROOT,dir,f.file),"utf8"),obj=JSON.parse(body);
      assert.equal(obj.surah,i+1);
      assert.equal(manifest.files[i].sha256,sha(body));
      assert.equal(Object.keys(obj.ayahs).length,f.ayah_count);
      for(const [a,v] of Object.entries(obj.ayahs)){assert.ok(v.text.length>0);assert.equal(v.sha256,sha(v.text),`${f.surah}:${a}`);n++}
    }
    assert.equal(n,6236);
  });
}

test("spot checks: 2:74 mukhtasar, page 11 fawaed, al-Baqarah goals, nuzool for 2:89",()=>{
  assert.match(read("data/tafsir/al-mukhtasar/002.json").ayahs["74"].text,/^ثم قست قلوبكم/);
  assert.match(read("data/i3rab/markaz-tafsir/002.json").ayahs["74"].text,/قَسَتْ: فعل ماض/);
  const f=read("data/fawaed.json");assert.equal(Object.keys(f.pages).length,604);assert.equal(f.pages["11"].length,3);
  assert.match(read("data/surah-goals.json").surahs["2"],/الخلافة في الأرض/);
  const z=read("data/nuzool.json");assert.equal(Object.keys(z.ayahs).length,201);assert.ok(z.ayahs["2:89"]);
});
