import { appState } from "./app-state.mjs";

/* موضع بدء كل جزء: رقم السورة ورقم الآية.
   منه يُبنى رابط القراءة، فيفتح المصحف عند أول الجزء لا أول السورة. */
const JUZ_START=[
  [1,1],   [2,142], [2,253], [3,93],  [4,24],  [4,148], [5,82],  [6,111],
  [7,88],  [8,41],  [9,93],  [11,6],  [12,53], [15,1],  [17,1],  [18,75],
  [21,1],  [23,1],  [25,21], [27,56], [29,46], [33,31], [36,28], [39,32],
  [41,47], [46,1],  [51,31], [58,1],  [67,1],  [78,1],
];
export function readerLink(j=null,khatmahCode=appState.code,page=null){
  const q=new URLSearchParams();
  const n=Number(j);
  if(Number.isInteger(page)&&page>=1&&page<=604) q.set("page",String(page));
  else if(Number.isInteger(n)&&n>=1&&n<=30) q.set("juz",String(n));
  const c=String(khatmahCode||"").trim().toUpperCase();
  if(c) q.set("code",c);
  const tail=q.toString();
  return "/quran-read/"+(tail?"?"+tail:"");
}
