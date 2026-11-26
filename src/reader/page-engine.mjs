/* واجهة رسم صفحة المصحف: محرّك لكل طريقة رسم، ومحرّك واحد نشط.
   المحرّك كائن فيه:
     id                          اسمه ("qcf" لحفص، و"digitalkhatt" للروايات لاحقًا)
     prepare(page, qcfData)      يحضّر ما يلزم (خطًا أو بيانات) ويعيد ما ترسمه renderLines
     renderLines(host, prepared, qcfData)  يملأ عنصر .mushaf بأسطر الصفحة
   إطار الصفحة (رأسها وتذييلها والتحديد والعلامة والملاءمة) يبقى في mushaf.js ويُبنى من
   بيانات QCF أيًّا كان المحرّك، فرأس الصفحة واحد لكل الروايات. */

const engines=new Map();
let activeId="qcf";
const engineListeners=[];
const headerDecorators=[];

export function registerEngine(engine){ engines.set(engine.id,engine); }

export function activeEngine(){ return engines.get(activeId)||engines.get("qcf"); }

export function activeEngineId(){ return activeId; }

/* يبدّل المحرّك ويطلب إعادة رسم الصفحات المحمّلة */
export async function setActiveEngine(id){
  if(!engines.has(id)||id===activeId)return;
  activeId=id;
  for(const listener of engineListeners)await listener(id);
}

export function onEngineChange(listener){ engineListeners.push(listener); }

/* يختار المحرّك عند الإقلاع قبل رسم أي صفحة، دون إعادة رسم */
export function selectEngineAtBoot(id){ if(engines.has(id))activeId=id; }

/* يعيد رسم الصفحات المحمّلة بالمحرّك نفسه (حين تتغيّر الرواية بين روايتين يرسمهما محرّك واحد) */
export async function refreshEngine(){
  for(const listener of engineListeners)await listener(activeId);
}

/* يضيف عنصرًا إلى رأس كل صفحة حين تُرسم (اختيار الرواية في منتصفه مثلًا).
   decorator(metaEl, page) يُستدعى بعد بناء رأس الصفحة. */
export function onPageHeader(decorator){ headerDecorators.push(decorator); }

export function decoratePageHeader(metaEl,page){
  if(!metaEl)return;
  for(const decorate of headerDecorators)decorate(metaEl,page);
}
