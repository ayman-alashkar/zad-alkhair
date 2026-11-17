import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const root="/home/claude/ayman-alashkar/zad-alkhair", PK="/tmp/qcfpkg/x/package";
const b=await chromium.launch({executablePath:"/usr/bin/google-chrome"});
const p=await b.newPage({viewport:{width:1240,height:1020},deviceScaleFactor:1});
await p.goto("file:///tmp/cmp604/page.html");
const fmap=JSON.parse(readFileSync(PK+"/font-map.json","utf8"));
const results=[];
for (let n=1;n<=604;n++){
  const pad=String(n).padStart(3,"0");
  const old=JSON.parse(readFileSync(`${PK}/pages/${pad}.json`,"utf8"));
  const neu=JSON.parse(readFileSync(`${root}/data/qcf-v4/pages/${pad}.json`,"utf8"));
  const oldFont=old.font, newFont=neu.font;
  const r=await p.evaluate(async ({old,neu,oldFont,newFont,n,PK,root})=>{
    const add=async(fam,url)=>{if([...document.fonts].some(f=>f.family===fam&&f.status==="loaded"))return;const f=new FontFace(fam,`url(${url})`);await f.load();document.fonts.add(f)};
    await add(oldFont,`file://${PK}/fonts-woff2/${oldFont}_W.woff2`);
    await add(newFont,`file://${root}/fonts/qcf-v4/p${n}.${n===328?"woff":"woff2"}`);
    let css=document.getElementById("pal"); if(!css){css=document.createElement("style");css.id="pal";document.head.append(css)}
    css.textContent=`@font-palette-values --m{font-family:"${newFont}";base-palette:0;override-colors:${[...Array(10).fill("#000"),"#000","transparent","transparent","#000","transparent","#000"].map((c,i)=>i+" "+c).join(",")}}`;
    const draw=(el,data,fam,pal)=>{el.innerHTML="";el.style.fontFamily=`"${fam}"`;el.style.fontPalette=pal||"normal";
      for(const L of data.lines){const d=document.createElement("div");d.className="ln";const ws=L.words.filter(w=>w.type==="word"||w.type==="end"||w.type==="quarter");
        if(!ws.length){el.append(d);continue}
        if(ws.length<4)d.classList.add("c");
        for(const w of ws){const s=document.createElement("span");s.textContent=w.char;d.append(s)}el.append(d)}};
    draw(document.getElementById("o"),old,oldFont);
    draw(document.getElementById("n"),neu,newFont,"--m");
    await document.fonts.ready;
    return true;
  },{old,neu,oldFont,newFont,n,PK,root});
  await p.screenshot({path:`/tmp/cmp604/${pad}.png`,clip:{x:0,y:0,width:1240,height:1020}});
}
await b.close();
