(()=>{
'use strict';
if(window.__bamcoAdminRootFixes20260911V7)return;
window.__bamcoAdminRootFixes20260911V7=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];

function isMessageTextLabel(el){
  const t=(el?.textContent||'').replace(/\s+/g,' ').trim();
  return /(?:^|\s)(?:متن\s*پیام(?:‌|\s)*(?:ها)?|ویرایش\s*متن\s*پیام)(?:$|\s)/i.test(t);
}
function purgeMessageTextUi(){
  qa('#nav button[data-view="templates"],#nav [data-view="templates"],#nav button[data-view="messageTemplates"],#nav [data-view="messageTemplates"]').forEach(x=>x.remove());
  qa('#nav button,#nav a,.nav-group-items>button,.nav-group-items>a').filter(isMessageTextLabel).forEach(x=>x.remove());
  qa('#templatesView,#messageTemplatesView,#desktopTemplateEditor,#openDesktopTemplateEditor,#templateBody,#templateState,#saveTemplateBtn').forEach(x=>x.remove());
  const custom=q('#messageCustomText');
  if(custom){
    const host=custom.closest('[data-message-text-section],.message-text-section,.message-custom-text,.custom-message-text')||custom.closest('label')||custom;
    host.remove();
  }
  qa('#messageCenterView button,#messageCenterView a,#messageCenterView [role="tab"],#messageCenterView .tab').filter(isMessageTextLabel).forEach(x=>x.remove());
  qa('[data-view="templates"],[data-view="messageTemplates"],[data-message-text-section],.message-text-section,.message-custom-text,.custom-message-text').forEach(x=>x.remove());
  if(typeof state!=='undefined'&&(state.view==='templates'||state.view==='messageTemplates')){
    if(typeof window.bamcoShowHome==='function')window.bamcoShowHome();
    else if(typeof showView==='function')showView('messageCenter');
  }
}
function installMessageTextPurge(){
  purgeMessageTextUi();
  if(document.body&&!document.body.dataset.messageTextPurge){
    document.body.dataset.messageTextPurge='1';
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;queued=true;
      queueMicrotask(()=>{queued=false;purgeMessageTextUi()});
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  document.addEventListener('click',e=>{
    const dead=e.target.closest?.('[data-view="templates"],[data-view="messageTemplates"],#openDesktopTemplateEditor,#saveTemplateBtn');
    if(!dead&&!isMessageTextLabel(e.target.closest?.('#nav button,#nav a,#messageCenterView button,#messageCenterView a,#messageCenterView [role="tab"],#messageCenterView .tab')))return;
    e.preventDefault();e.stopImmediatePropagation();purgeMessageTextUi();
  },true);
}
function normalizeRequestExport(){const b=q('#requestReportView [data-report-export]');if(b&&b.textContent!=='خروجی اکسل')b.textContent='خروجی اکسل'}
function installRequestGuard(){
 normalizeRequestExport();
 const view=q('#requestReportView');if(view&&!view.dataset.rootRequestWatch){view.dataset.rootRequestWatch='1';new MutationObserver(normalizeRequestExport).observe(view,{childList:true,subtree:true,characterData:true})}
 document.addEventListener('click',e=>{if(e.target.closest('#nav [data-view="requestReport"]'))setTimeout(normalizeRequestExport,40)},true)
}
function boot(){installRequestGuard();installMessageTextPurge();normalizeRequestExport()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
