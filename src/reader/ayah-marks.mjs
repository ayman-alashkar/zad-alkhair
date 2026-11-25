/* علامات الآيات والكلمات في الصفحة المرسومة، أيًّا كان المحرّك.
   كل محرّك يضع على عناصر كلماته في renderLines:
     data-ayah="سورة:آية"  على الكلمة، وعلى أي عنصر يجمع كلمات الآية في السطر
     data-gi="رقم"          رقم الكلمة الثابت في الفهرس الموحّد (data/words/index.json)
   التحديد والتظليل والضغطات تعتمد على هذه العلامات وحدها، لا على بنية عناصر محرّك بعينه. */

const outermost=(el,k)=>!el.parentElement?.closest(`[data-ayah="${k}"]`);

/* عناصر الآية k: أبعد عنصر يحمل علامتها في كل موضع (جامع كلماتها في السطر إن وُجد،
   وإلا الكلمة نفسها). root: صفحة بعينها أو المستند كله. */
export function ayahElements(k,root=document){
  if(!k)return [];
  return [...root.querySelectorAll(`[data-ayah="${k}"]`)].filter(el=>outermost(el,k));
}

/* العنصر الذي يمثّل الآية عند الكلمة المضغوطة، ورقم الكلمة إن عُرف */
export function ayahAt(node){
  const word=node?.closest?.("[data-ayah]");
  if(!word)return null;
  const k=word.dataset.ayah;
  let anchor=word;
  while(anchor.parentElement?.closest(`[data-ayah="${k}"]`))anchor=anchor.parentElement.closest(`[data-ayah="${k}"]`);
  const gi=node.closest("[data-gi]");
  return {ayah:k,gi:gi?Number(gi.dataset.gi):null,anchor,word:gi||word};
}

export function clearAyahHighlight(root=document){
  root.querySelectorAll("[data-ayah].selected").forEach(x=>x.classList.remove("selected"));
}

export function highlightAyah(k,root=document){
  for(const el of ayahElements(k,root))el.classList.add("selected");
}
