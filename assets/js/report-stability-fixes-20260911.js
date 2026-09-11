(()=>{
'use strict';
if(window.__bamcoReportStabilityFixes20260911V3)return;window.__bamcoReportStabilityFixes20260911V3=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const timers=new Map(),observers=new Map();
function installCss(){if(q('#bamcoReportStabilityCss'))return;const s=document.createElement('style');s.id='bamcoReportStabilityCss';s.textContent=`
#performanceReportView [data-performance-clear]{font-weight:400!important;font-family:BamcoPersian,"B Nazanin",BNazanin,Tahoma,sans-serif!important}
.view.bamco-view-settling{position:relative!important;min-height:160px!important}.view.bamco-view-settling>*{visibility:hidden!important;pointer-events:none!important}.view.bamco-view-settling:after{content:'در حال دریافت اطلاعات…';visibility:visible!important;position:absolute;inset:10px 8px auto 8px;min-height:120px;display:grid;place-items:center;background:#fff;border:1px solid #d6e1dc;border-radius:14px;color:#60796f;font-family:BamcoPersian,"B Nazanin",BNazanin,Tahoma,sans-serif;font-size:15px;z-index:40}
`;document.head.append(s)}
function reveal(id){const view=q('#'+id+'View');if(!view)return;clearTimeout(timers.get(id));timers.delete(id);view.classList.remove('bamco-view-settling');view.dataset.bamcoSettled='1'}
function settleSoon(id,delay=170){clearTimeout(timers.get(id));timers.set(id,setTimeout(()=>{const view=q('#'+id+'View');if(!view)return;if(view.querySelector('.workspace-loading,[aria-busy="true"]'))return settleSoon(id,140);reveal(id)},delay))}
function begin(id){const view=q('#'+id+'View');if(!view)return;view.classList.add('bamco-view-settling');view.dataset.bamcoSettled='0';clearTimeout(timers.get(id));timers.set(id,setTimeout(()=>reveal(id),7000));let observer=observers.get(id);if(!observer){observer=new MutationObserver(()=>{if(view.classList.contains('bamco-view-settling'))settleSoon(id)});observer.observe(view,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});observers.set(id,observer)}settleSoon(id,220)}
function boot(){document.documentElement.dataset.reportStability='1';installCss();qa('.view:not(.hidden)').forEach(v=>{if(v.id?.endsWith('View'))settleSoon(v.id.replace(/View$/,''),40)});document.addEventListener('click',e=>{const nav=e.target.closest('#nav [data-view]');if(nav)begin(nav.dataset.view);const refresh=e.target.closest('[data-tab-refresh],[data-response-refresh],[data-sent-log-refresh]');if(refresh){const view=refresh.closest('.view');if(view?.id)begin(view.id.replace(/View$/,''))}},true);document.addEventListener('bamco-view-data-ready',e=>{const view=e.target.closest?.('.view')||e.target;if(view?.id)settleSoon(view.id.replace(/View$/,''),80)})}
window.bamcoViewSettling={begin,reveal};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();