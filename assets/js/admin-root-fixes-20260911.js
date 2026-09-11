(()=>{
'use strict';
if(window.__bamcoAdminRootFixes20260911V4)return;
window.__bamcoAdminRootFixes20260911V4=true;
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
let stickerWarmStarted=false;
async function warmActiveStickers(){
 if(stickerWarmStarted||!state?.token||state?.profile?.role!=='manager')return false;stickerWarmStarted=true;
 try{
  const sets=await select('sticker_sets','select=id&active=eq.true&order=id.desc&limit=1'),id=sets[0]?.id;if(!id)return true;
  const rows=await select('stickers',`select=storage_path&set_id=eq.${id}&order=state_key,gender`);
  await Promise.all(rows.map(async row=>{const path=String(row.storage_path||'');if(!path)return;const encoded=path.split('/').map(encodeURIComponent).join('/');const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/stickers/${encoded}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'force-cache'});if(res.ok)await res.blob()}));
  return true;
 }catch{stickerWarmStarted=false;return false}
}
function startStickerWarmup(){let tries=0;const timer=setInterval(()=>{if(state?.token&&state?.profile?.role==='manager'){clearInterval(timer);warmActiveStickers()}else if(++tries>120)clearInterval(timer)},100);document.addEventListener('visibilitychange',()=>{if(!document.hidden)warmActiveStickers()},{passive:true})}
function boot(){installTemplateGuard();installRequestGuard();removeTemplateHelp();normalizeRequestExport();startStickerWarmup()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
