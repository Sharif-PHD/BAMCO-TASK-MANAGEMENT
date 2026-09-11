(()=>{
'use strict';
if(window.__bamcoReportStabilityFixes20260911V5)return;
window.__bamcoReportStabilityFixes20260911V5=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null,qa=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
let rawTabRender=null,warmKey='',warming=false,cleanFrame=0,navigationEpoch=0;

function installCss(){
  q('#bamcoReportStabilityCss')?.remove();
  const s=document.createElement('style');s.id='bamcoReportStabilityCss';s.textContent=`
#performanceReportView [data-performance-clear]{font-weight:400!important;font-family:BamcoPersian,"B Nazanin",BNazanin,Tahoma,sans-serif!important}
/* Tabs must never be covered by an intermediate loading page. */
.view.bamco-view-settling{position:static!important;min-height:0!important}
.view.bamco-view-settling>*{visibility:visible!important;pointer-events:auto!important}
.view.bamco-view-settling:after{content:none!important;display:none!important}
.workspace-loading{display:none!important}
`;
  document.head.append(s);
}

function reveal(id){const view=q('#'+id+'View');if(view){view.classList.remove('bamco-view-settling');view.dataset.bamcoSettled='1'}}
function begin(id){reveal(id)}

function retireTemplates(){
  const wasActive=typeof state!=='undefined'&&state?.view==='templates';
  qa('#nav [data-view="templates"],#templatesView,#desktopTemplateEditor').forEach(x=>x.remove());
  try{delete window.bamcoTemplateEditor}catch{}
  if(wasActive){try{window.bamcoShowHome?.()}catch{}}
}

function cleanTransientLoading(root=document){
  qa('.bamco-view-settling',root).forEach(v=>v.classList.remove('bamco-view-settling'));
  qa('.workspace-loading',root).forEach(x=>x.remove());
  qa('.prod-empty',root).forEach(x=>{if(/در حال\s+(?:بارگذاری|دریافت)/.test(x.textContent||''))x.remove()});
  qa('.sent-log-summary span',root).forEach(x=>{if(/در حال\s+دریافت/.test(x.textContent||''))x.remove()});
}

function patchTabs(){
  const tabs=window.bamcoTabs;if(!tabs?.render||tabs.__instantV5)return !!tabs;
  rawTabRender=tabs.render.bind(tabs);
  const instantRender=(id)=>{
    navigationEpoch++;
    const view=q('#'+id+'View');
    const p=Promise.resolve(rawTabRender(id,true));
    return p.finally(()=>{cleanTransientLoading(view||document);reveal(id)});
  };
  tabs.render=instantRender;
  tabs.prewarm=()=>warmTabs(true);
  tabs.__instantV5=true;
  return true;
}

async function warmTabs(force=false){
  if(warming||typeof state==='undefined'||!state?.token||typeof isManager!=='function'||!isManager())return;
  patchTabs();if(!rawTabRender)return;
  const key=(state.user?.id||state.profile?.id||'manager')+'|'+String(state.token).slice(-12);
  if(!force&&warmKey===key)return;
  warming=true;
  const startEpoch=navigationEpoch;
  try{
    // Message center keeps its rows in memory, so loading it while hidden makes its first open immediate.
    try{q('#refreshMessageCenter')?.click()}catch{}
    try{void window.bamcoConversations?.refresh?.()}catch{}
    // tab-workspace currently uses one request serial. Warm sequentially and stop
    // the instant a real navigation starts so background work can never cancel it.
    const order=['performanceReport','responseReport','requestReport','systemOptions','loginActivity','activeSessions'];
    for(const id of order){
      if(navigationEpoch!==startEpoch)break;
      if(!q('#'+id+'View'))continue;
      try{await rawTabRender(id,false)}catch{}
      cleanTransientLoading(q('#'+id+'View')||document);
      reveal(id);
      if(navigationEpoch!==startEpoch)break;
    }
    if(navigationEpoch===startEpoch)warmKey=key;
  }finally{warming=false}
}

function scheduleWarm(){
  if(typeof state==='undefined'||!state?.token)return;
  setTimeout(()=>warmTabs(false),80);
}

function boot(){
  document.documentElement.dataset.reportStability='instant';
  installCss();retireTemplates();cleanTransientLoading();patchTabs();
  document.addEventListener('click',e=>{
    const retired=e.target.closest?.('#nav [data-view="templates"]');
    if(retired){e.preventDefault();e.stopImmediatePropagation();retireTemplates();return}
    const refresh=e.target.closest?.('[data-tab-refresh]');
    const id=refresh?.dataset?.tabRefresh;
    if(refresh&&id&&window.bamcoTabs?.owns?.(id)&&rawTabRender){
      navigationEpoch++;
      e.preventDefault();e.stopImmediatePropagation();
      Promise.resolve(rawTabRender(id,true)).then(()=>{cleanTransientLoading(q('#'+id+'View')||document);reveal(id)}).catch(err=>{if(typeof toast==='function')toast(err?.message||'تازه‌سازی انجام نشد.',true)});
    }
  },true);

  const app=q('#appView');
  if(app){
    new MutationObserver(()=>{if(!app.classList.contains('hidden'))scheduleWarm()}).observe(app,{attributes:true,attributeFilter:['class']});
    if(!app.classList.contains('hidden'))scheduleWarm();
  }
  const observer=new MutationObserver(()=>{
    if(cleanFrame)return;
    cleanFrame=requestAnimationFrame(()=>{cleanFrame=0;retireTemplates();cleanTransientLoading();patchTabs()});
  });
  observer.observe(document.body,{childList:true,subtree:true});
  let tries=0;const poll=setInterval(()=>{if(typeof state!=='undefined'&&state?.token){clearInterval(poll);scheduleWarm()}else if(++tries>300)clearInterval(poll)},100);
}

window.bamcoViewSettling={begin,reveal};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
