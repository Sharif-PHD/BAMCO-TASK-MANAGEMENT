(()=>{
'use strict';
const q=(s,r=document)=>r?.querySelector(s)||null,qa=(s,r=document)=>[...(r?.querySelectorAll(s)||[])];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const mgr=()=>typeof isManager==='function'&&isManager();
const NEW=[['loginActivity','ورود و خروج','people',true],['activeSessions','نشست‌های فعال','people',true],['groupChat','گفت‌وگوی عمومی و گروه‌ها','conversations',false],['directMessages','گفت‌وگوی خصوصی','conversations',false],['taskChats','گفت‌وگوی مرتبط با وظیفه','conversations',false],['performanceReport','گزارش عملکرد','reports',true],['responseReport','گزارش پاسخ‌ها','reports',true],['requestReport','گزارش درخواست‌ها','reports',true],['systemOptions','وضعیت‌ها و اولویت‌ها','configuration',true],];
const ORDER={tasks:['kanban','archive','taskTimeline','approvals','requestHistory','approvalChains'],messages:['messageCenter','sentMessages','responseTracking','templates','stickers'],people:['people','loginActivity','activeSessions'],conversations:['groupChat','directMessages','taskChats'],vehicle:['vehiclePermanent','vehicleTemporary'],reports:['dashboard','performanceReport','responseReport','requestReport'],configuration:['systemOptions','settings']};
const REPORTS=new Set(['performanceReport','responseReport']);
let installed=false;
function ensureGroup(key,title,icon){let g=q(`#nav .nav-group[data-group="${key}"]`);if(g)return g;const nav=q('#nav');if(!nav)return null;g=document.createElement('div');g.className='nav-group';g.dataset.group=key;g.innerHTML=`<button type="button" class="nav-group-toggle" aria-expanded="false"><b class="nav-group-icon">${icon}</b><span>${title}</span><b class="nav-chevron">⌄</b></button><div class="nav-group-items"></div>`;q('.nav-group-toggle',g).onclick=e=>{e.preventDefault();e.stopPropagation();const open=g.classList.toggle('open');q('.nav-group-toggle',g).setAttribute('aria-expanded',open?'true':'false')};nav.appendChild(g);return g}
function groupFor(key){const labels={people:['مدیریت افراد','♙'],messages:['مدیریت پیام','✉'],reports:['گزارش‌ها','▦'],configuration:['تنظیمات','⚙'],tasks:['مدیریت وظایف','☑'],vehicle:['مدیریت خودرو','◇'],conversations:['گفتگوها','☵']};return labels[key]?ensureGroup(key,...labels[key]):null}
function ensureView(id,managerOnly){let v=q(`#${id}View`);if(v)return v;const w=q('.workspace');if(!w)return null;v=document.createElement('section');v.id=id+'View';v.className='view hidden'+(managerOnly?' manager-only':'');v.innerHTML='<div class="panel"><div class="prod-empty">در حال بارگذاری…</div></div>';w.appendChild(v);return v}
function navigate(id){
  if(typeof showView==='function')showView(id);
  const result=render(id);
  if(REPORTS.has(id))requestAnimationFrame(()=>{
    if(typeof state!=='undefined'&&state.view===id){
      const view=q('#'+id+'View');
      qa('#appView .view,.workspace > .view').forEach(v=>v.classList.toggle('hidden',v!==view));
      view?.classList.remove('hidden','bamco-view-settling');
      const title=q('#viewTitle');if(title)title.textContent=id==='performanceReport'?'گزارش عملکرد':'گزارش پاسخ‌ها';
    }
  });
  return result;
}
function ensureButton(id,label,group,managerOnly){let b=q(`#nav button[data-view="${id}"]`);if(!b){b=document.createElement('button');b.type='button';b.dataset.view=id;b.innerHTML=`<b>•</b><span>${esc(label)}</span>`;}if(!b.dataset.runtimeBound){b.dataset.runtimeBound='1';b.addEventListener('click',()=>{void navigate(id)})}if(managerOnly)b.classList.add('manager-only');b.classList.toggle('hidden',managerOnly&&!mgr());const g=groupFor(group),box=q('.nav-group-items',g);if(box&&b.parentElement!==box)box.appendChild(b);return b}
function syncOrder(){Object.entries(ORDER).forEach(([key,ids])=>{const g=groupFor(key),box=q('.nav-group-items',g);if(!box)return;ids.forEach(id=>{const b=q(`#nav button[data-view="${id}"]`);if(b)box.appendChild(b)});g.classList.toggle('hidden',!qa(':scope>button',box).some(b=>!b.classList.contains('hidden')))})}
function panel(id,title,subtitle,html,managerOnly=true){const v=ensureView(id,managerOnly);v.innerHTML=`<div class="panel table-panel"><div class="panel-head"><div><h3>${esc(title)}</h3><small>${esc(subtitle)}</small></div></div>${html}</div>`}
async function render(id){
 try{
  if(window.bamcoTabs?.owns(id))return await window.bamcoTabs.render(id);
  if(window.bamcoConversations?.owns(id))return await window.bamcoConversations.render(id);
 }catch(err){panel(id,'اطلاعات دریافت نشد','',`<div class="prod-empty" role="alert">${esc(err.message||'ارتباط با سامانه برقرار نشد.')}<p><button type="button" class="ghost" data-runtime-retry="${esc(id)}">تلاش دوباره</button></p></div>`,false)}
}
function bind(){document.addEventListener('click',e=>{const retry=e.target.closest('[data-runtime-retry]');if(retry){if(typeof showView==='function')showView(retry.dataset.runtimeRetry);render(retry.dataset.runtimeRetry)}})}
function install(){if(installed)return;installed=true;NEW.forEach(([id,label,group,m])=>{ensureView(id,m);ensureButton(id,label,group,m)});syncOrder();bind();window.bamcoProductionRuntime={navigate,render}}
// Sidebar groups and phase modules must exist before their buttons are placed.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
