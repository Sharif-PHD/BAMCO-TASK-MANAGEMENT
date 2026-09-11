(()=>{
'use strict';
if(window.__bamcoAdminRootFixes20260911V8)return;
window.__bamcoAdminRootFixes20260911V8=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const deadSelector='[data-view="templates"],[data-view="messageTemplates"],#templatesView,#messageTemplatesView,#desktopTemplateEditor,#openDesktopTemplateEditor,#templateBody,#templateState,#saveTemplateBtn,[data-message-text-section],.message-text-section,.message-custom-text,.custom-message-text';
function isMessageTextLabel(el){const t=(el?.textContent||'').replace(/\s+/g,' ').trim();return /(?:^|\s)(?:متن\s*پیام(?:‌|\s)*(?:ها)?|ویرایش\s*متن\s*پیام)(?:$|\s)/i.test(t)}
function purgeMessageTextUi(root=document){
 qa(deadSelector,root).forEach(x=>x.remove());
 qa('#nav button,#nav a,.nav-group-items>button,.nav-group-items>a',root===document?document:root).filter(isMessageTextLabel).forEach(x=>x.remove());
 const custom=q('#messageCustomText',root===document?document:root);if(custom){(custom.closest('[data-message-text-section],.message-text-section,.message-custom-text,.custom-message-text')||custom.closest('label')||custom).remove()}
 qa('#messageCenterView button,#messageCenterView a,#messageCenterView [role="tab"],#messageCenterView .tab',root===document?document:root).filter(isMessageTextLabel).forEach(x=>x.remove());
 if(typeof state!=='undefined'&&(state.view==='templates'||state.view==='messageTemplates')){if(typeof window.bamcoShowHome==='function')window.bamcoShowHome();else if(typeof showView==='function')showView('messageCenter')}
}
function addedNodeNeedsPurge(node){if(node?.nodeType!==1)return false;return node.matches?.(deadSelector)||node.querySelector?.(deadSelector)||isMessageTextLabel(node.matches?.('#nav button,#nav a,#messageCenterView button,#messageCenterView a,#messageCenterView [role="tab"],#messageCenterView .tab')?node:null)}
function installMessageTextPurge(){
 purgeMessageTextUi();
 if(document.body&&!document.body.dataset.messageTextPurge){document.body.dataset.messageTextPurge='2';let queued=false;new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(addedNodeNeedsPurge))||queued)return;queued=true;queueMicrotask(()=>{queued=false;purgeMessageTextUi()})}).observe(document.body,{childList:true,subtree:true})}
 document.addEventListener('click',e=>{const dead=e.target.closest?.('[data-view="templates"],[data-view="messageTemplates"],#openDesktopTemplateEditor,#saveTemplateBtn');if(!dead&&!isMessageTextLabel(e.target.closest?.('#nav button,#nav a,#messageCenterView button,#messageCenterView a,#messageCenterView [role="tab"],#messageCenterView .tab')))return;e.preventDefault();e.stopImmediatePropagation();purgeMessageTextUi()},true)
}
function normalizeRequestExport(){const b=q('#requestReportView [data-report-export]');if(b&&b.textContent!=='خروجی اکسل')b.textContent='خروجی اکسل'}
function installRequestGuard(){normalizeRequestExport();const view=q('#requestReportView');if(view&&!view.dataset.rootRequestWatch){view.dataset.rootRequestWatch='2';new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))normalizeRequestExport()}).observe(view,{childList:true,subtree:true})}document.addEventListener('click',e=>{if(e.target.closest('#nav [data-view="requestReport"]'))setTimeout(normalizeRequestExport,40)},true)}
function boot(){installRequestGuard();installMessageTextPurge();normalizeRequestExport()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
