(()=>{
'use strict';
if(window.__bamcoAdminRootFixes20260911V3)return;
window.__bamcoAdminRootFixes20260911V3=true;
const q=(s,r=document)=>r.querySelector(s);

function removeTemplateHelp(){
 const view=q('#templatesView');if(!view)return;
 q('.template-help',view)?.remove();
 const btn=q('#openDesktopTemplateEditor',view);if(btn){btn.type='button';btn.textContent='ویرایش متن'}
}
function normalizeRequestExport(){const b=q('#requestReportView [data-report-export]');if(b)b.textContent='خروجی اکسل'}
function installTemplateGuard(){
 document.addEventListener('click',e=>{
  const nav=e.target.closest('#nav [data-view="templates"]');
  if(nav){setTimeout(()=>{window.bamcoTemplateEditor?.install?.();removeTemplateHelp()},0);setTimeout(removeTemplateHelp,100);return}
  const btn=e.target.closest('#templatesView #openDesktopTemplateEditor');
  if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(window.bamcoTemplateEditor?.open){window.bamcoTemplateEditor.open();return}
  let tries=0;const timer=setInterval(()=>{if(window.bamcoTemplateEditor?.open){clearInterval(timer);window.bamcoTemplateEditor.open()}else if(++tries>25){clearInterval(timer);if(typeof toast==='function')toast('ویرایشگر متن هنوز آماده نشده است؛ صفحه را تازه‌سازی کنید.',true)}},80);
 },true);
 const view=q('#templatesView');if(view&&!view.dataset.rootTemplateWatch){view.dataset.rootTemplateWatch='1';new MutationObserver(removeTemplateHelp).observe(view,{childList:true,subtree:true})}
}
function installRequestGuard(){
 normalizeRequestExport();
 const view=q('#requestReportView');if(view&&!view.dataset.rootRequestWatch){view.dataset.rootRequestWatch='1';new MutationObserver(normalizeRequestExport).observe(view,{childList:true,subtree:true,characterData:true})}
 document.addEventListener('click',e=>{if(e.target.closest('#nav [data-view="requestReport"]'))setTimeout(normalizeRequestExport,40)},true)
}
function boot(){installTemplateGuard();installRequestGuard();removeTemplateHelp();normalizeRequestExport()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
