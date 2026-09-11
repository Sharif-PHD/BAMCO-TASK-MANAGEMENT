(()=>{
'use strict';
if(window.__bamcoAdminRootFixes20260911V5)return;
window.__bamcoAdminRootFixes20260911V5=true;
const q=(s,r=document)=>r.querySelector(s);

// Observer callbacks must reach a fixed point: assigning identical textContent
// still replaces a text node and would enqueue this observer indefinitely.
function removeTemplateHelp(){
 const view=q('#templatesView');if(!view)return;
 q('.template-help',view)?.remove();
 const btn=q('#openDesktopTemplateEditor',view);if(btn){if(btn.type!=='button')btn.type='button';if(btn.textContent!=='ویرایش متن')btn.textContent='ویرایش متن'}
}
function normalizeRequestExport(){const b=q('#requestReportView [data-report-export]');if(b&&b.textContent!=='خروجی اکسل')b.textContent='خروجی اکسل'}
function installRequestGuard(){
 normalizeRequestExport();
 const view=q('#requestReportView');if(view&&!view.dataset.rootRequestWatch){view.dataset.rootRequestWatch='1';new MutationObserver(normalizeRequestExport).observe(view,{childList:true,subtree:true,characterData:true})}
 document.addEventListener('click',e=>{if(e.target.closest('#nav [data-view="requestReport"]'))setTimeout(normalizeRequestExport,40)},true)
}
function boot(){installRequestGuard();removeTemplateHelp();normalizeRequestExport()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
