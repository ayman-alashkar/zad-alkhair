/* أنماط نوافذ الكلمة والآية. النافذة نفسها نافذة زاد الخير (.backdrop .sheet، ورأسها وزر إغلاقها
   ومصدرها وأزرار التنقل من أنماط القارئ)، وهنا ما يخص محتواها فقط، بمتغيرات القارئ --ui-*
   التي لها قيم في الوضع الليلي، فلا لون ثابتًا إلا ألوان الخلاف ولها قيم ليلية. */
const CSS = `
.zc-backdrop{transition:background .2s ease}
.zc-backdrop:not(.in){background:rgba(0,0,0,0)}
.zc-sheet{display:flex;flex-direction:column;max-height:82vh;transform:translateY(100%);transition:transform .24s cubic-bezier(.2,.8,.2,1);
  --c1:#6D28D9;--c2:#C026D3;--c3:#1D63ED;--c4:#0E9F8E;--c5:#E86A00;--c6:#15A34A;--c7:#8B5E34;--c8:#D1203A;--zc-diff:#C2185B}
.zc-backdrop.in .zc-sheet{transform:none}
html[data-theme="dark"] .zc-sheet{--c1:#B794F4;--c2:#F08AE6;--c3:#7FA8FF;--c4:#4FD1C5;--c5:#FFA05C;--c6:#5EDB8A;--c7:#D9A574;--c8:#FF7A8A;--zc-diff:#F48FB1}
.zc-sheet .sheethead{flex:none}
.zc-switch{flex:none;display:flex;flex-direction:column;gap:8px}
.zc-switch:not(:empty){padding-top:10px}
.zc-levels{background:var(--ui-surface-2);border:1px solid var(--ui-line);border-radius:14px;padding:3px;display:flex;gap:3px}
.zc-level{flex:1;min-height:38px;border:0;border-radius:11px;background:transparent;color:var(--ui-muted);font:500 12px Alexandria,system-ui,sans-serif;white-space:nowrap;padding:0 4px}
.zc-level.on{background:var(--ui-surface);color:var(--ui-accent);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.zc-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.zc-tab{flex:none;min-height:34px;border:1px solid var(--ui-line);border-radius:999px;background:transparent;color:var(--ui-text);padding:0 14px;font:500 12px Alexandria,system-ui,sans-serif;white-space:nowrap}
.zc-tab.on{background:var(--ui-accent);border-color:var(--ui-accent);color:#FFF9EA}
.zc-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:4px 0 2px}
.zc-stack{display:flex;flex-direction:column;gap:10px}
.zc-body p{margin:0;font-size:15px;line-height:1.95}
.zc-body p.tafsir{font-family:Amiri,serif;font-size:19px;line-height:2.05}
.zc-body .ref{margin:8px 0 0}
.zc-none{color:var(--ui-muted);text-align:center;padding:18px 0;font-size:13.5px}
.zc-note{font-size:11.5px;color:var(--ui-muted)}
.zc-hint{background:color-mix(in srgb,var(--ui-gold) 18%,transparent);color:var(--ui-text);border-radius:12px;padding:8px 12px;font-size:12px;margin:8px 0 4px}
.zc-h{font:400 18px/1.3 "Aref Ruqaa",serif;color:var(--ui-gold);margin-top:4px}
.zc-word{font:400 32px/1.4 Amiri,serif;color:var(--ui-accent);text-align:center}
.zc-chips+.zc-word{margin-top:10px}
.zc-form{display:flex;justify-content:center;padding-top:6px;color:var(--ui-accent)}
.zc-form-text{font:400 26px/1.6 Amiri,serif}
.zc-em{color:var(--ui-accent);font-weight:700}
.zc-grp{display:flex;align-items:center;gap:12px;padding:8px;border-top:1px solid var(--ui-line);color:var(--ui-text)}
.zc-grp.me{background:var(--ui-accent-soft);border-radius:14px;border-top-color:transparent}
.zc-grp.me+.zc-grp{border-top-color:transparent}
.zc-grp .q{flex:0 0 38%;display:flex;justify-content:center;color:var(--ui-text)}
.zc-grp .who{font-size:13.5px;line-height:1.65}.zc-grp .who b{font-weight:600}.zc-grp .who small{display:block;color:var(--ui-muted);font-size:12px}
.zc-fix{display:inline-block;font-size:10.5px;border:1px solid var(--ui-gold);color:var(--ui-gold);border-radius:8px;padding:0 6px;margin-inline-start:4px}
.zc-chips{display:flex}
.zc-chips{background:var(--ui-surface-2);border:1px solid var(--ui-line);border-radius:12px;padding:3px;gap:3px}
.zc-chip{flex:1;min-height:34px;border:0;border-radius:9px;background:transparent;color:var(--ui-muted);font:500 12px Alexandria,system-ui,sans-serif}
.zc-chip.on{background:var(--ui-surface);color:var(--ui-accent);font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.zc-occ{display:flex;flex-direction:column;gap:2px;color:var(--ui-text);border:1px solid var(--ui-line);background:var(--ui-surface-2);border-radius:14px;padding:7px 12px;font:inherit;text-align:start}
.zc-occ.here{background:var(--ui-accent-soft);border-color:color-mix(in srgb,var(--ui-accent) 40%,transparent)}
.zc-occ .r{display:flex;justify-content:space-between;font-size:11.5px;color:var(--ui-muted)}.zc-occ .r b{color:var(--ui-text);font-weight:600}
.zc-occ .t{font:400 20px/1.75 Amiri,serif}
.zc-diff{color:var(--zc-diff)}
.zc-irab b{color:var(--ui-accent);font-weight:600}
.zc-counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.zc-counts div{border:1px solid var(--ui-line);background:var(--ui-surface-2);border-radius:12px;padding:5px 4px;text-align:center;font-size:11px;color:var(--ui-muted);line-height:1.5}
.zc-counts div.on{border-color:var(--ui-accent);background:var(--ui-accent-soft)}
.zc-counts b{display:block;font-size:15px;color:var(--ui-text);font-weight:600}
.zc-fawaed{display:flex;flex-direction:column;gap:6px}
.zc-fawaed p{background:var(--ui-surface-2);border-radius:12px;padding:7px 12px;font-size:14px;line-height:1.85}
.zc-foot{flex:none}
.zc-foot .tafsir-nav{margin-top:12px}
.zc-source{display:flex;align-items:center;justify-content:space-between;gap:8px}
.zc-source .source-line{flex:1;min-width:0;line-height:1.6}
.zc-acts{display:flex;align-items:center;gap:4px;flex:none}
.zc-act{width:38px;height:38px;border:0;border-radius:12px;background:transparent;color:var(--ui-accent);display:inline-flex;align-items:center;justify-content:center}
.zc-act.on{background:color-mix(in srgb,#B3261E 14%,transparent);color:#C6413A}
.zc-more{height:34px;border:1px solid var(--ui-line);border-radius:999px;background:var(--ui-surface-2);color:var(--ui-accent);display:inline-flex;align-items:center;gap:5px;padding:0 12px;font:600 11px Alexandria,system-ui,sans-serif}
.zc-rep{width:26px;height:26px;border:0;border-radius:999px;background:var(--ui-surface-3);color:var(--ui-text);display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-inline-start:6px}
.zc-occ .zc-rep,.zc-grp .zc-rep,.zc-counts .zc-rep{align-self:flex-start}
.zc-rep.sent{background:var(--ui-accent);color:#FFF9EA}
.zc-repform{display:flex;flex-direction:column;gap:6px;margin-top:6px;font-size:12.5px;color:var(--ui-text)}.zc-repform textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;border:1px solid var(--ui-line);border-radius:12px;padding:8px;font:inherit;background:var(--ui-surface-2);color:inherit}.zc-repform button{align-self:flex-start;min-height:40px;border:0;border-radius:12px;background:var(--ui-accent);color:#FFF9EA;padding:0 16px;font:inherit}.zc-repdone{font-size:12.5px;color:var(--ui-accent);margin-top:4px}
@media (prefers-reduced-motion:reduce){.zc-sheet,.zc-backdrop{transition:none}}
`;
let done = false;
export function injectStyles() {
  if (done || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.id = "zad-card-styles";
  s.textContent = CSS;
  document.head.appendChild(s);
  done = true;
}
