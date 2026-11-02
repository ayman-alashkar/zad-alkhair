// node validate-tafsir.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const root = process.argv[2] || new URL('./data/tafsir/al-wajeez/', import.meta.url).pathname;
const index = JSON.parse(fs.readFileSync(path.join(root,'index.json'),'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
if(index.surah_files.length!==114) throw new Error('Expected 114 surah files');
let total=0;
for (const [offset,item] of index.surah_files.entries()) {
  if(item.surah!==offset+1) throw new Error('Noncanonical surah order');
  const f=path.join(root,item.file);
  const bytes=fs.readFileSync(f);
  const obj=JSON.parse(bytes.toString('utf8'));
  const entry=manifest.files.find(record=>record.file===item.file);
  if(!entry||entry.bytes!==bytes.length||entry.sha256!==crypto.createHash('sha256').update(bytes).digest('hex')) throw new Error(`File SHA/size mismatch ${item.file}`);
  if (obj.schema_version!==1||obj.source_id!==index.source_id||obj.surah !== item.surah || Object.keys(obj.ayahs).length !== item.ayah_count) throw new Error(`Bad surah ${item.surah}`);
  if(Array.from({length:item.ayah_count},(_,i)=>String(i+1)).some(key=>!Object.hasOwn(obj.ayahs,key))) throw new Error(`Missing ayah in ${item.surah}`);
  for (const [a,v] of Object.entries(obj.ayahs)) {
    if(typeof v.text!=='string'||!v.text.trim()) throw new Error(`Empty tafsir ${item.surah}:${a}`);
    const h=crypto.createHash('sha256').update(v.text,'utf8').digest('hex');
    if (h!==v.sha256) throw new Error(`SHA mismatch ${item.surah}:${a}`);
    total++;
  }
}
if(total!==6236) throw new Error(`Expected 6236, got ${total}`);
const fadl=JSON.parse(fs.readFileSync(path.join(root,index.fadl_file),'utf8'));
if(fadl.records.length!==60) throw new Error(`Expected 60 fadl records`);
for(const r of fadl.records){const h=crypto.createHash('sha256').update(r.text,'utf8').digest('hex');if(h!==r.sha256)throw new Error(`Fadl SHA mismatch ${r.key}`)}
console.log('TAFSIR DATASET PASS', {ayah_records:total,fadl_records:fadl.records.length});
