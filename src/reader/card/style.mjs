/* أنماط البطاقة، تُضاف مرة واحدة. الألوان من متغيرات القارئ مع قيم احتياطية. */
const CSS = `
.zc-backdrop{position:fixed;inset:0;z-index:60;background:rgba(8,45,41,.42);display:flex;align-items:stretch;justify-content:center;padding:calc(10px + env(safe-area-inset-top)) 10px calc(14px + env(safe-area-inset-bottom));font-family:Alexandria,system-ui,sans-serif;direction:rtl}
.zc-card{width:min(640px,100%);background:var(--chrome,#FFFCF4);color:var(--chrome-text,#18362F);border-radius:22px;box-shadow:0 12px 40px rgba(8,45,41,.3);display:flex;flex-direction:column;overflow:hidden}
.zc-levels{margin:12px 12px 0;background:#EDE6D6;border-radius:14px;padding:3px;display:flex;gap:3px}
.zc-level{flex:1;min-height:40px;border:0;border-radius:12px;background:transparent;color:#6E6656;font:inherit;font-size:13px;white-space:nowrap;padding:0 4px}
.zc-level.on{background:var(--chrome,#FFFCF4);color:inherit;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.zc-tabs{display:flex;gap:4px;padding:4px 10px 0;border-bottom:1px solid var(--border,#DED3BD);overflow-x:auto;scrollbar-width:none}
.zc-tab{flex:none;border:0;background:transparent;padding:10px 6px;font:inherit;font-size:13px;color:#7D8C70;border-bottom:3px solid transparent;white-space:nowrap}
.zc-tab.on{color:var(--brand,#0F5C50);font-weight:600;border-bottom-color:var(--brand,#0F5C50)}
.zc-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px;font-size:15px;line-height:1.95}
.zc-body p{margin:0}
.zc-loading,.zc-none{color:#6E6656;text-align:center;padding:24px 0;font-size:13.5px}
.zc-sub{font-size:12px;color:#6E6656;text-align:center}
.zc-h{font:400 17px/1.3 "Aref Ruqaa",serif;color:#8E6A28}
.zc-src{margin-top:auto;font-size:10.5px;color:#6E6656;line-height:1.6}
.zc-word{font:400 30px/1.4 Amiri,serif;color:var(--brand,#0F5C50);text-align:center}
.zc-form{display:flex;justify-content:center}
.zc-form-text{font:400 26px/1.6 Amiri,serif}
.zc-em{color:var(--brand,#0F5C50);font-weight:600}
.zc-grp{display:flex;align-items:center;gap:12px;padding:8px;border-top:1px solid var(--border,#DED3BD)}
.zc-grp.me{background:#F4E8CA;border-radius:14px;border-top-color:transparent}
.zc-grp .q{flex:0 0 38%;display:flex;justify-content:center}
.zc-grp .who{font-size:13.5px;line-height:1.65}.zc-grp .who b{font-weight:600}.zc-grp .who small{display:block;color:#6E6656;font-size:12px}
.zc-fix{display:inline-block;font-size:10.5px;border:1px solid #C59A4A;color:#8a6a2a;border-radius:8px;padding:0 6px;margin-inline-start:4px}
.zc-chips{display:flex;gap:8px}
.zc-chip{flex:1;min-height:40px;border:1px solid var(--border,#DED3BD);border-radius:999px;background:var(--chrome,#FFFCF4);color:var(--brand,#0F5C50);font:inherit;font-size:13px}
.zc-chip.on{background:var(--brand,#0F5C50);border-color:var(--brand,#0F5C50);color:#FFF9EA}
.zc-occ{display:flex;flex-direction:column;gap:2px;text-decoration:none;color:inherit;border:1px solid var(--border,#DED3BD);background:var(--paper,#F5F0E4);border-radius:12px;padding:6px 12px;font:inherit;text-align:start}
.zc-occ.here{background:#F4E8CA;border-color:#D9C48E}
.zc-occ .r{display:flex;justify-content:space-between;font-size:12px}.zc-occ .t{font:400 19px/1.7 Amiri,serif}
.zc-irab b{color:var(--brand,#0F5C50);font-weight:600}
.zc-counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.zc-counts div{border:1px solid var(--border,#DED3BD);background:var(--paper,#F5F0E4);border-radius:10px;padding:5px 4px;text-align:center;font-size:11px;color:#6E6656;line-height:1.5}
.zc-counts div.on{border-color:var(--brand,#0F5C50);background:#DDF1EA}
.zc-counts b{display:block;font-size:15px;color:var(--chrome-text,#18362F);font-weight:600}
.zc-fawaed p{background:var(--paper,#F5F0E4);border-radius:12px;padding:7px 12px;font-size:14px;line-height:1.85}
.zc-nav{display:flex;justify-content:space-between;padding:0 12px}
.zc-icon{width:44px;height:44px;border:0;background:transparent;color:var(--brand,#0F5C50);display:flex;align-items:center;justify-content:center;border-radius:12px}
.zc-icon.on{color:#B3261E;background:#F8E1DF}
.zc-tools{display:flex;border-top:1px solid var(--border,#DED3BD);background:#F1EADB}
.zc-tool{flex:1;min-height:58px;border:0;background:transparent;color:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:inherit;font-size:11px}
.zc-toast{margin:0 16px 10px;background:#8E6A28;color:#FFF9EA;border-radius:999px;padding:9px 14px;font-size:12.5px;text-align:center}
.zc-rep{width:26px;height:26px;border:0;border-radius:999px;background:#C9C1B0;color:#fff;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-inline-start:6px}
.zc-rep.sent{background:#278573}
.zc-repform{display:flex;flex-direction:column;gap:6px;margin-top:6px;font-size:12.5px}.zc-repform textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;border:1px solid var(--border,#DED3BD);border-radius:10px;padding:8px;font:inherit;background:var(--paper,#F5F0E4);color:inherit}.zc-repform button{align-self:flex-start;min-height:40px;border:0;border-radius:12px;background:var(--brand,#0F5C50);color:#FFF9EA;padding:0 16px;font:inherit}.zc-repdone{font-size:12.5px;color:#278573;margin-top:4px}
html[data-theme="dark"] .zc-card{background:#0A2B26;color:#FFF5DC}
html[data-theme="dark"] .zc-levels{background:#12403A}
html[data-theme="dark"] .zc-grp.me,html[data-theme="dark"] .zc-occ.here{background:rgba(228,201,128,.14)}
html[data-theme="dark"] .zc-tools{background:#082D29}
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
