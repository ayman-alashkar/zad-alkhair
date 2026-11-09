"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");

/* reader.html حُذف من الموقع، لكن رسائل تيليغرام المرسلة قبل توحيد الروابط
   ما زالت تحمله. الصفحة المتبقية تحويل فقط، ويجب أن تحفظ الجزء ورمز الختمة. */
const html=fs.readFileSync(path.join(root,"reader.html"),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

function redirect(href){
  const url=new URL(href);
  let destination=null;
  const location={search:url.search,hash:url.hash,replace:value=>{destination=value}};
  vm.runInNewContext(script,{location,URLSearchParams,Number});
  return destination;
}

test("old Telegram reader links open the unified reader with juz and khatmah code",()=>{
  const base="https://zad-alkhair.net/reader.html";
  assert.equal(redirect(base),"/quran-read/");
  assert.equal(redirect(`${base}?juz=7&code=AB12`),"/quran-read/?juz=7&code=AB12");
  assert.equal(redirect(`${base}?code=AB12`),"/quran-read/?code=AB12");
  assert.equal(redirect(`${base}?home=1&from=zad`),"/quran-read/?from=zad");
  assert.equal(redirect(`${base}?surah=18&ayah=10`),"/quran-read/18/?ayah=10");
  assert.equal(redirect(`${base}?surah=36&listen=1&qari=Husary_Nkbps`),"/quran-listen/36/?qari=Husary_Nkbps");
  assert.equal(redirect(`${base}?surah=999`),"/quran-read/");
  assert.equal(redirect(`${base}?page=5#ayah=2:255`),"/quran-read/?page=5#ayah=2:255");
});

test("the retired reader page is a redirect only, hidden from search and from the app",()=>{
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/name="zk-retired-reader"/);
  assert.doesNotMatch(html,/<link|src=/,"loads nothing of the app");
  const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
  assert.doesNotMatch(sitemap,/reader\.html/);
  for(const dir of ["src","quran-read","quran-listen","quran-index","juz"]){
    const files=fs.readdirSync(path.join(root,dir),{recursive:true}).filter(f=>/\.(html|js)$/.test(f));
    for(const f of files){
      assert.doesNotMatch(fs.readFileSync(path.join(root,dir,f),"utf8"),/["'`/]reader\.html/,`${dir}/${f} links to the retired page`);
    }
  }
});
