(()=>{
'use strict';
if(window.__bamcoReportStabilityFixes20260911)return;
window.__bamcoReportStabilityFixes20260911=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const reportIds=new Set(['performanceReport','responseReport','requestReport','messageReport','sentMessages','loginActivity','activeSessions','loginReport']);
function installCss(){if(q('#bamcoReportStabilityCss'))return;const s=document.createElement('style');s.id='bamcoReportStabilityCss';s.textContent=`
#performanceReportView [data-performance-clear]{font-weight:400!important;font-family:BamcoPersian,"B Nazanin",BNazanin,Tahoma,sans-serif!important}
.view.bamco-report-settling{position:relative!important;min-height:180px!important}
.view.bamco-report-settling>.workspace-panel{visibility:hidden!important;pointer-events:none!important}
.view.bamco-report-settling:after{content:'در حال دریافت اطلاعات…';position:absolute;inset:12px 0 auto 0;min-height:120px;display:grid;place-items:center;background:#fff;border:1px solid #d6e1dc;border-radius:14px;color:#60796f;font-family:BamcoPersian,"B Nazanin",BNazanin,Tahoma,sans-serif;font-size:15px;z-index:5}
`;document.head.append(s)}
function canReveal(id,view){
 if(!view||view.classList.contains('hidden')||view.querySelector('.workspace-loading'))return false;
 if(view.querySelector('.workspace-error'))return true;
 if(id==='responseReport')return !!view.querySelector('[data-response-custom="1"]');
 if(id==='performanceReport')return !!view.querySelector('[data-performance-from]')&&!!view.querySelector('table tbody');
 if(id==='requestReport')return !!view.querySelector('table tbody')&&!view.querySelector('.workspace-metrics');
 return !!view.querySelector('table tbody');
}
const timers=new WeakMap();
function begin(id){const view=q('#'+id+'View');if(!view)return;view.classList.add('bamco-report-settling');clearTimeout(timers.get(view));const fallback=setTimeout(()=>view.classList.remove('bamco-report-settling'),8000);timers.set(view,fallback)}
function consider(id,view){if(!view.classList.contains('bamco-report-settling')||!canReveal(id,view))return;clearTimeout(timers.get(view));const t=setTimeout(()=>view.classList.remove('bamco-report-settling'),140);timers.set(view,t)}
function watch(){for(const id of reportIds){const view=q('#'+id+'View');if(!view)continue;new MutationObserver(()=>consider(id,view)).observe(view,{childList:true,subtree:true});consider(id,view)}}
function purgeSystemThreads(){qa('.conversation-list [data-kind="system"],.conversation-item[data-kind="system"]').forEach(x=>x.remove())}
function boot(){document.documentElement.dataset.reportStability='1';installCss();watch();purgeSystemThreads();new MutationObserver(purgeSystemThreads).observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{const nav=e.target.closest('#nav [data-view]');if(nav&&reportIds.has(nav.dataset.view))begin(nav.dataset.view);const refresh=e.target.closest('[data-tab-refresh]');if(refresh&&reportIds.has(refresh.dataset.tabRefresh))begin(refresh.dataset.tabRefresh)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
