(()=>{
'use strict';
if(window.__bamcoFinalTaskAvatarFixes20260911V3)return;
window.__bamcoFinalTaskAvatarFixes20260911V3=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
const digits=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const REPORT_TITLES={performanceReport:'گزارش عملکرد',responseReport:'گزارش پاسخ‌ها'};
let avatarUrl='',reportRepairing=false,rawShowView=null;

function optimisticResequence(tasks){
  const numbered=tasks.filter(t=>Number.isFinite(Number(t.legacy_id))).sort((a,b)=>Number(a.legacy_id)-Number(b.legacy_id)||Number(a.id)-Number(b.id));
  numbered.forEach((t,i)=>t.legacy_id=i+1);
}
async function instantDelete(scope){
  if(typeof isManager==='function'&&!isManager())return;
  const selector=scope==='kanban'?'#kanbanBody':'#archiveBody';
  const ids=[...new Set((window.bamcoSelection?.ids?.(selector)||[]).map(String))];
  if(!ids.length&&state.selected?.[scope]!=null)ids.push(String(state.selected[scope]));
  if(!ids.length)return;
  const tasks=ids.map(id=>state.tasks.find(t=>String(t.id)===id)).filter(Boolean);if(!tasks.length)return;
  const question=tasks.length===1?`وظیفه «${tasks[0].title}» برای همیشه حذف شود؟`:`${digits(tasks.length)} وظیفه انتخاب‌شده برای همیشه حذف شوند؟`;
  if(!await window.bamcoConfirm(question))return;
  const before=state.tasks.map(t=>({...t})),removed=new Set(ids);
  state.tasks=state.tasks.filter(t=>!removed.has(String(t.id)));optimisticResequence(state.tasks);
  if(state.selected)state.selected[scope]=null;window.bamcoSelection?.clear?.(selector);
  renderTasks(false);renderTasks(true);toast(tasks.length===1?'وظیفه حذف شد.':'وظایف انتخاب‌شده حذف شدند.');
  try{
    await rpc('delete_tasks_and_resequence',{p_task_ids:ids.map(Number)});
    selectAll('task_status_view','select=*&order=id.desc').then(rows=>{state.tasks=rows;renderTasks(false);renderTasks(true)}).catch(()=>{});
  }catch(err){state.tasks=before;renderTasks(false);renderTasks(true);toast('حذف روی سرور انجام نشد؛ وضعیت قبلی بازگردانده شد. '+err.message,true)}
}
async function fetchAvatar(path){
  const encoded=String(path).split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/avatars/${encoded}?v=${Date.now()}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'no-store'});
  if(!res.ok)throw Error(`avatar ${res.status}`);
  const next=URL.createObjectURL(await res.blob());if(avatarUrl)try{URL.revokeObjectURL(avatarUrl)}catch{}avatarUrl=next;return next;
}
function paintAvatar(src,path){
  const el=q('#avatar');if(!el||!src)return;
  const img=document.createElement('img');img.alt='تصویر پروفایل';img.dataset.finalTopAvatar='1';img.src=src;img.style.cssText='width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important';
  el.replaceChildren(img);el.classList.add('has-image');el.dataset.avatarLoaded=String(path||'');
}
async function forceAvatar(){
  if(!state?.token||!state?.user?.id)return false;
  try{
    const rows=await select('profiles',`id=eq.${encodeURIComponent(state.user.id)}&select=id,avatar_path,display_name,full_name,email`),p=rows?.[0];if(!p)return false;
    state.profile={...(state.profile||{}),...p};const path=String(p.avatar_path||'');
    if(!path){const el=q('#avatar');if(el&&!el.querySelector('img'))el.textContent=String(p.display_name||p.full_name||'ب').trim()[0]||'ب';return true}
    paintAvatar(await fetchAvatar(path),path);return true;
  }catch(err){console.warn('topbar avatar refresh failed',err?.message||err);return false}
}
function keepAvatar(){const path=String(state?.profile?.avatar_path||''),el=q('#avatar');if(path&&avatarUrl&&el&&!el.querySelector('img[data-final-top-avatar]'))paintAvatar(avatarUrl,path)}

function closeReportMenu(){
  qa('#nav .nav-group.open').forEach(g=>{g.classList.remove('open');q('.nav-group-toggle',g)?.setAttribute('aria-expanded','false')});
  if(matchMedia('(max-width:760px)').matches)q('#sidebar')?.classList.add('collapsed');
}
function canonicalReportRender(id){
  const reports=window.bamcoCanonicalReports;
  try{
    const out=id==='performanceReport'?reports?.renderPerformance?.(false):reports?.renderResponse?.(false);
    if(out&&typeof out.catch==='function')out.catch(err=>typeof toast==='function'&&toast(err.message||String(err),true));
  }catch(err){if(typeof toast==='function')toast(err.message||String(err),true)}
}
function activateReport(id){
  if(!REPORT_TITLES[id]||typeof state==='undefined')return false;
  const view=q('#'+id+'View');if(!view)return false;
  state.view=id;
  document.body.classList.remove('welcome-active');q('#welcomeView')?.classList.add('hidden');
  qa('#appView .view,.workspace > .view').forEach(v=>v.classList.toggle('hidden',v!==view));
  view.classList.remove('hidden','bamco-view-settling');
  qa('#nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  const title=q('#viewTitle');if(title)title.textContent=REPORT_TITLES[id];
  q('#addTaskBtn')?.classList.add('hidden');closeReportMenu();canonicalReportRender(id);
  requestAnimationFrame(()=>{if(state.view===id)view.classList.remove('hidden','bamco-view-settling')});
  return true;
}
function installReportNavigation(){
  if(window.__bamcoCanonicalReportNavigationV1)return;window.__bamcoCanonicalReportNavigationV1=true;
  document.addEventListener('click',e=>{
    const nav=e.target.closest?.('#nav button[data-view="performanceReport"],#nav button[data-view="responseReport"]');
    if(!nav||nav.disabled)return;
    e.preventDefault();e.stopImmediatePropagation();activateReport(nav.dataset.view);
  },true);
  rawShowView=typeof window.showView==='function'?window.showView:null;
  if(rawShowView&&!rawShowView.__bamcoReportNavigation){
    const wrapped=function(view,...args){if(REPORT_TITLES[view])return activateReport(view);return rawShowView.call(this,view,...args)};
    wrapped.__bamcoReportNavigation=true;window.showView=wrapped;
  }
  for(const id of Object.keys(REPORT_TITLES)){
    const view=q('#'+id+'View');if(!view)continue;
    new MutationObserver(()=>{
      if(reportRepairing||typeof state==='undefined'||state.view!==id||!view.classList.contains('hidden'))return;
      reportRepairing=true;
      qa('#appView .view,.workspace > .view').forEach(v=>v.classList.toggle('hidden',v!==view));
      view.classList.remove('hidden','bamco-view-settling');
      queueMicrotask(()=>{reportRepairing=false});
    }).observe(view,{attributes:true,attributeFilter:['class']});
  }
  window.bamcoReportNavigation={open:activateReport};
}
function boot(){
  window.addEventListener('click',e=>{
    const del=e.target.closest?.('#kanbanDeleteBtn,#archiveDeleteBtn');if(!del)return;
    e.preventDefault();e.stopImmediatePropagation();void instantDelete(del.id.startsWith('archive')?'archive':'kanban');
  },true);
  installReportNavigation();
  const app=q('#appView');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))[0,180,700].forEach(ms=>setTimeout(()=>void forceAvatar(),ms))}).observe(app,{attributes:true,attributeFilter:['class']});
  const avatar=q('#avatar');if(avatar)new MutationObserver(()=>queueMicrotask(keepAvatar)).observe(avatar,{childList:true});
  let tries=0,t=setInterval(()=>{if(state?.token){clearInterval(t);[0,250,1000,3000].forEach(ms=>setTimeout(()=>void forceAvatar(),ms))}else if(++tries>240)clearInterval(t)},100);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state?.token)void forceAvatar()});window.addEventListener('pageshow',()=>{if(state?.token)void forceAvatar()});
  window.bamcoFinalTaskActions={instantDelete,refreshAvatar:forceAvatar};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
