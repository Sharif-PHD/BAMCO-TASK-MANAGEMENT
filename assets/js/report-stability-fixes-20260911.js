(()=>{
'use strict';
if(window.__bamcoCanonicalReportsLiveSyncV1)return;
window.__bamcoCanonicalReportsLiveSyncV1=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
let responseRows=[],dateTarget=null,renderEpoch=0,syncBusy=false,rawTabRender=null;

function installCss(){
  q('#bamcoCanonicalReportCss')?.remove();
  const s=document.createElement('style');s.id='bamcoCanonicalReportCss';s.textContent=`
  #performanceReportView .canonical-report,#responseReportView .canonical-report{min-height:160px}
  .canonical-report-tools{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important;margin:0 0 12px}
  .canonical-report-tools>input[type=search]{min-width:220px;flex:1 1 260px}
  .canonical-date-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
  .canonical-date-controls label{display:flex;align-items:center;gap:6px;margin:0;white-space:nowrap}
  .canonical-date-field{display:grid;grid-template-columns:minmax(128px,158px) 38px;gap:5px;align-items:center}
  .canonical-date-field input{height:38px;border:1px solid #c7d5cf;border-radius:8px;background:#fff;padding:0 9px;text-align:center;font-family:"B Nazanin",BNazanin,Tahoma,sans-serif}
  .canonical-date-field button{height:38px;width:38px;padding:0}
  .canonical-report .workspace-table{border-collapse:collapse!important;border-spacing:0!important;width:100%}
  .canonical-report .workspace-table th,.canonical-report .workspace-table td{border:1px solid #cbd9d3!important}
  .canonical-report .empty{text-align:center!important;padding:28px!important;color:#71867d}
  .canonical-report .completion-cell{min-width:145px}
  .workspace-loading{display:none!important}
  @media(max-width:900px){.canonical-date-controls{width:100%}.canonical-report-tools>input[type=search]{width:100%;flex-basis:100%}}
  `;document.head.append(s);
}
function retireTemplates(){
  const active=typeof state!=='undefined'&&state?.view==='templates';
  qa('#nav [data-view="templates"],#templatesView,#desktopTemplateEditor').forEach(x=>x.remove());
  try{delete window.bamcoTemplateEditor}catch{}
  if(active)try{window.bamcoShowHome?.()}catch{}
}
function detachLegacyReportOwners(){
  for(const id of ['performanceReportView','responseReportView']){
    const old=q('#'+id);if(!old||old.dataset.canonicalReportOwner==='1')continue;
    const fresh=old.cloneNode(false);fresh.dataset.canonicalReportOwner='1';old.replaceWith(fresh);
  }
}
function activate(id,title){
  if(typeof state==='undefined')return false;
  state.view=id;
  const target=q('#'+id+'View');if(!target)return false;
  qa('#appView .view').forEach(v=>v.classList.toggle('hidden',v!==target));
  qa('#nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  const h=q('#viewTitle');if(h)h.textContent=title;
  q('#addTaskBtn')?.classList.add('hidden');
  target.classList.remove('bamco-view-settling');
  return true;
}
function panel(view,title,tools,table){
  view.innerHTML=`<div class="panel workspace-panel canonical-report"><div class="panel-head"><h3>${esc(title)}</h3></div>${tools||''}${table||''}</div>`;
}
function currentMonthRange(){
  try{const p=currentJalali(),from=jalaliToISO(p.y,p.m,1),next=p.m===12?jalaliToISO(p.y+1,1,1):jalaliToISO(p.y,p.m+1,1);if(!from||!next)return null;const d=new Date(next+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);const to=d.toISOString().slice(0,10);return{from,to,fromText:jalaliText(from),toText:jalaliText(to)}}catch{return null}
}
function inputIso(input){const raw=typeof en==='function'?en(input?.value||''):String(input?.value||''),m=raw.match(/\d+/g)?.map(Number);return m?.length===3?jalaliToISO(m[0],m[1],m[2])||'':''}
function personName(id){const p=(state.profiles||[]).find(x=>String(x.id)===String(id));return p?.display_name||p?.full_name||p?.email||String(id||'—')}
function temporal(t){try{return window.bamcoTaskPresentation?.(t)?.temporal||String(t?.due_state||'')}catch{return String(t?.due_state||'')}}
function terminal(t){try{return !!window.bamcoOptions?.terminal?.(t)}catch{return false}}
function completed(t){try{return !!window.bamcoOptions?.completed?.(t)}catch{return false}}
function perfShell(){
  const range=currentMonthRange();
  return {range,tools:`<div class="canonical-report-tools"><div class="canonical-date-controls"><label><span>تاریخ شروع</span><span class="canonical-date-field"><input id="canonicalPerfFrom" class="jalali-input" readonly value="${esc(range?.fromText||'')}"><button type="button" class="ghost" data-canonical-date="perf-from">▦</button></span></label><label><span>تاریخ پایان</span><span class="canonical-date-field"><input id="canonicalPerfTo" class="jalali-input" readonly value="${esc(range?.toText||'')}"><button type="button" class="ghost" data-canonical-date="perf-to">▦</button></span></label><button type="button" class="ghost" data-canonical-perf-clear>حذف بازه</button></div><input id="canonicalPerfSearch" type="search" placeholder="جست‌وجو در گزارش…"><button type="button" class="ghost" data-canonical-refresh="performanceReport">تازه‌سازی</button><button type="button" class="ghost" data-canonical-export="performance">خروجی اکسل</button></div>`};
}
async function renderPerformance(force=false){
  const epoch=++renderEpoch,view=q('#performanceReportView');if(!view)return;
  let range=currentMonthRange();
  if(force||!q('.canonical-report',view)){
    const shell=perfShell();range=shell.range;panel(view,'گزارش عملکرد',shell.tools,'<div class="table-wrap"><table class="workspace-table"><thead></thead><tbody><tr><td class="empty">در حال دریافت اطلاعات…</td></tr></tbody></table></div>');
  }
  const from=inputIso(q('#canonicalPerfFrom')),to=inputIso(q('#canonicalPerfTo'));
  let query='select=requested_by,request_type,created_at&request_type=eq.create&order=created_at.desc';
  if(from)query+=`&created_at=gte.${from}T00:00:00`;if(to)query+=`&created_at=lte.${to}T23:59:59`;
  let requests=[];
  try{requests=await selectAll('change_requests',query)}catch(err){if(epoch===renderEpoch&&state.view==='performanceReport')showReportError(view,err);return}
  if(epoch!==renderEpoch||state.view!=='performanceReport')return;
  const table=q('table',view);if(!table)return;
  const tasks=state.tasks||[],ids=[...new Set([...tasks.map(t=>t.owner_id),...requests.map(r=>r.requested_by)])].filter(Boolean),defaultRange=!!range&&from===range.from&&to===range.to;
  const headers=['شناسه متولی','متولی','کل واگذارشده','فعال','هشدار','دیرکرد',defaultRange?'محول‌شده در این ماه':'محول‌شده در بازه',defaultRange?'انجام‌شده در این ماه':'انجام‌شده در بازه','درصد تکمیل',defaultRange?'درخواست تعریف وظیفه این ماه':'درخواست تعریف وظیفه در بازه'];
  table.tHead.innerHTML='<tr>'+headers.map(h=>`<th>${esc(h)}</th>`).join('')+'</tr>';
  table.tBodies[0].innerHTML=ids.map((id,i)=>{const all=tasks.filter(t=>String(t.owner_id)===String(id)),active=all.filter(t=>!t.archived&&!terminal(t)),due=all.filter(t=>t.due_date&&(!from||String(t.due_date).slice(0,10)>=from)&&(!to||String(t.due_date).slice(0,10)<=to)),done=due.filter(completed),pct=due.length?Math.round(done.length/due.length*100):0,req=requests.filter(r=>String(r.requested_by)===String(id)).length;return `<tr data-canonical-row="1" data-workspace-index="${i}"><td>${esc(id)}</td><td>${esc(personName(id))}</td><td>${digits(all.length)}</td><td>${digits(active.length)}</td><td>${digits(active.filter(t=>temporal(t)==='دوره هشدار').length)}</td><td>${digits(active.filter(t=>temporal(t)==='دیرکرد').length)}</td><td>${digits(due.length)}</td><td>${digits(done.length)}</td><td class="completion-cell">${digits(pct)}٪</td><td>${digits(req)}</td></tr>`}).join('')||'<tr><td colspan="10" class="empty">رکوردی ثبت نشده است.</td></tr>';
  bindSearch('#canonicalPerfSearch','#performanceReportView');
}
function responseLabel(v){return({replied:'پاسخ داده',awaiting:'بدون پاسخ',failed:'خطای ارسال',reminder_needed:'نیازمند یادآوری'})[v]||v||'—'}
function channel(v){return v==='email'?'ایمیل':v==='portal'?'داخل سامانه':v==='both'?'هر دو':v||'—'}
function renderResponseRows(){
  const body=q('#canonicalResponseBody');if(!body)return;
  const term=(q('#canonicalResponseSearch')?.value||'').trim().toLocaleLowerCase(),from=inputIso(q('#canonicalResponseFrom')),to=inputIso(q('#canonicalResponseTo'));
  const rows=responseRows.filter(x=>x.delivery_status!=='cancelled'&&(!from||String(x.sent_at||'').slice(0,10)>=from)&&(!to||String(x.sent_at||'').slice(0,10)<=to)&&(!term||[x.recipient_name,x.recipient_email,x.subject,x.reply_text,x.delivery_id].some(v=>String(v||'').toLocaleLowerCase().includes(term))));
  const total=rows.length;body.innerHTML=rows.map((x,i)=>`<tr data-canonical-row="1" data-delivery-id="${esc(x.delivery_id)}"><td>${digits(total-i)}</td><td>${esc(x.recipient_name||x.recipient_email||'—')}</td><td>${esc(channel(x.channel))}</td><td>${esc(x.subject||'—')}</td><td>${esc(x.sent_at?jalaliDateTime(x.sent_at):'—')}</td><td>${esc(responseLabel(x.response_status))}</td><td>${esc(x.reply_text||'—')}</td><td>${esc(channel(x.reply_channel))}</td><td>${esc(x.replied_at?jalaliDateTime(x.replied_at):'—')}</td><td>${digits(x.reminder_count||0)}</td></tr>`).join('')||'<tr><td colspan="10" class="empty">رکوردی مطابق فیلترها وجود ندارد.</td></tr>';
}
async function renderResponse(force=false){
  const epoch=++renderEpoch,view=q('#responseReportView');if(!view)return;
  if(force||!q('.canonical-report',view))panel(view,'گزارش پاسخ‌ها',`<div class="canonical-report-tools"><div class="canonical-date-controls"><label><span>از تاریخ</span><span class="canonical-date-field"><input id="canonicalResponseFrom" class="jalali-input" readonly><button type="button" class="ghost" data-canonical-date="response-from">▦</button></span></label><label><span>تا تاریخ</span><span class="canonical-date-field"><input id="canonicalResponseTo" class="jalali-input" readonly><button type="button" class="ghost" data-canonical-date="response-to">▦</button></span></label><button type="button" class="ghost" data-canonical-response-clear>حذف بازه</button></div><input id="canonicalResponseSearch" type="search" placeholder="جست‌وجو در گزارش…"><button type="button" class="ghost" data-canonical-refresh="responseReport">تازه‌سازی</button><button type="button" class="ghost" data-canonical-export="response">خروجی اکسل</button></div>`,`<div class="table-wrap"><table class="workspace-table"><thead><tr><th>ردیف</th><th>فرد</th><th>کانال</th><th>موضوع</th><th>ارسال</th><th>وضعیت پاسخ</th><th>پاسخ</th><th>کانال پاسخ</th><th>تاریخ پاسخ</th><th>تعداد یادآوری</th></tr></thead><tbody id="canonicalResponseBody"><tr><td colspan="10" class="empty">در حال دریافت اطلاعات…</td></tr></tbody></table></div>`);
  try{responseRows=await selectAll('message_response_tracking','select=*&order=delivery_id.desc');window.__bamcoResponseRows=responseRows}catch(err){if(epoch===renderEpoch&&state.view==='responseReport')showReportError(view,err);return}
  if(epoch!==renderEpoch||state.view!=='responseReport')return;renderResponseRows();q('#canonicalResponseSearch').oninput=renderResponseRows;
}
function showReportError(view,err){const box=q('.canonical-report',view);if(box)box.innerHTML=`<div class="workspace-error" role="alert"><b>اطلاعات گزارش دریافت نشد.</b><p>${esc(err?.message||'خطای نامشخص')}</p><button type="button" class="ghost" data-canonical-refresh="${view.id==='performanceReportView'?'performanceReport':'responseReport'}">تلاش مجدد</button></div>`}
function bindSearch(inputSel,viewSel){const input=q(inputSel);if(!input||input.dataset.canonicalSearch)return;input.dataset.canonicalSearch='1';input.addEventListener('input',()=>{const term=input.value.trim().toLocaleLowerCase();qa(`${viewSel} tbody tr[data-canonical-row]`).forEach(r=>r.hidden=!!term&&!r.textContent.toLocaleLowerCase().includes(term))})}
async function exportReport(kind){const view=q(kind==='performance'?'#performanceReportView':'#responseReportView'),table=q('table',view);if(!table)return;const rows=[...table.rows].filter(r=>!r.hidden).map(r=>[...r.cells].map(c=>c.textContent.trim())),X=await window.ensureBamcoXLSX(),ws=X.utils.aoa_to_sheet(rows),wb=X.utils.book_new();ws['!views']=[{rightToLeft:true}];wb.Workbook={Views:[{RTL:true}]};X.utils.book_append_sheet(wb,ws,kind==='performance'?'گزارش عملکرد':'گزارش پاسخ‌ها');X.writeFile(wb,(kind==='performance'?'گزارش عملکرد':'گزارش پاسخ‌ها')+'.xlsx',{compression:true})}
function openCalendar(kind){const input=q(kind==='perf-from'?'#canonicalPerfFrom':kind==='perf-to'?'#canonicalPerfTo':kind==='response-from'?'#canonicalResponseFrom':'#canonicalResponseTo');if(!input)return;dateTarget={kind,input};const now=currentJalali(),raw=typeof en==='function'?en(input.value||''):String(input.value||''),m=raw.match(/\d+/g)?.map(Number),p=m?.length===3?{y:m[0],m:m[1],d:m[2]}:now;q('#calendarLabel').textContent=kind.includes('from')?'انتخاب تاریخ شروع':'انتخاب تاریخ پایان';q('#calYear').innerHTML=Array.from({length:16},(_,i)=>now.y-5+i).map(y=>`<option value="${y}">${digits(y)}</option>`).join('');q('#calMonth').innerHTML=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');q('#calYear').value=String(p.y);q('#calMonth').value=String(p.m);fillCalendarDays();q('#calDay').value=String(p.d);q('#calendarDialog').showModal()}
function commitDate(clear=false){if(!dateTarget)return;const {kind,input}=dateTarget;input.value=clear?'':digits(`${q('#calYear').value}/${String(q('#calMonth').value).padStart(2,'0')}/${String(q('#calDay').value).padStart(2,'0')}`);dateTarget=null;q('#calendarDialog')?.close();if(kind.startsWith('perf'))void renderPerformance(false);else renderResponseRows()}
function patchTabs(){const tabs=window.bamcoTabs;if(!tabs?.render)return false;if(!rawTabRender)rawTabRender=tabs.render.bind(tabs);if(tabs.__canonicalReportsV1)return true;tabs.render=(id,...args)=>id==='performanceReport'?renderPerformance(false):id==='responseReport'?renderResponse(false):rawTabRender(id,...args);tabs.__canonicalReportsV1=true;return true}

async function syncCore(){
  if(syncBusy||typeof state==='undefined'||!state?.token||!state?.profile||document.hidden)return;
  syncBusy=true;const userId=state.user?.id,token=state.token;
  try{
    const taskPromise=selectAll('task_status_view','select=*&order=id.desc');
    const reqPromise=window.bamcoRequestSync?.refresh?.();
    const inboxPromise=window.bamcoInbox?.load?.();
    const convPromise=window.bamcoConversations?.refresh?.();
    const [tasks]=await Promise.allSettled([taskPromise,reqPromise,inboxPromise,convPromise]);
    if(userId!==state.user?.id||token!==state.token)return;
    if(tasks.status==='fulfilled'){
      state.tasks=tasks.value;
      if(state.view==='kanban')renderTasks(false);else if(state.view==='archive')renderTasks(true);else if(state.view==='dashboard')window.renderDashboard?.();
    }
    if(state.view==='performanceReport')await renderPerformance(false);
    else if(state.view==='responseReport')await renderResponse(false);
    else if(state.view==='sentMessages')q('#sentMessagesView [data-sent-log-refresh],#sentMessagesView [data-tab-refresh="sentMessages"]')?.click();
    document.dispatchEvent(new CustomEvent('bamco-live-sync',{detail:{at:Date.now()}}));
  }catch(err){console.warn('15-second live sync',err?.message||err)}finally{syncBusy=false}
}
function immediateSync(){if(typeof state!=='undefined'&&state?.token&&!document.hidden)void syncCore()}
function boot(){
  installCss();retireTemplates();detachLegacyReportOwners();patchTabs();
  window.addEventListener('click',e=>{
    const nav=e.target.closest?.('#nav [data-view]');
    if(nav&&nav.dataset.view==='performanceReport'){
      e.preventDefault();e.stopImmediatePropagation();activate('performanceReport','گزارش عملکرد');void renderPerformance(true);return;
    }
    if(nav&&nav.dataset.view==='responseReport'){
      e.preventDefault();e.stopImmediatePropagation();activate('responseReport','گزارش پاسخ‌ها');void renderResponse(true);return;
    }
    const refresh=e.target.closest?.('[data-canonical-refresh]');if(refresh){e.preventDefault();e.stopImmediatePropagation();refresh.dataset.canonicalRefresh==='performanceReport'?void renderPerformance(false):void renderResponse(false);return}
    const date=e.target.closest?.('[data-canonical-date]');if(date){e.preventDefault();e.stopImmediatePropagation();openCalendar(date.dataset.canonicalDate);return}
    if(dateTarget&&e.target.closest?.('#setDateBtn')){e.preventDefault();e.stopImmediatePropagation();commitDate(false);return}
    if(dateTarget&&e.target.closest?.('#clearDateBtn')){e.preventDefault();e.stopImmediatePropagation();commitDate(true);return}
    if(e.target.closest?.('[data-canonical-perf-clear]')){e.preventDefault();q('#canonicalPerfFrom').value='';q('#canonicalPerfTo').value='';void renderPerformance(false);return}
    if(e.target.closest?.('[data-canonical-response-clear]')){e.preventDefault();q('#canonicalResponseFrom').value='';q('#canonicalResponseTo').value='';renderResponseRows();return}
    const exp=e.target.closest?.('[data-canonical-export]');if(exp){e.preventDefault();e.stopImmediatePropagation();void exportReport(exp.dataset.canonicalExport);return}
  },true);
  setInterval(immediateSync,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)immediateSync()});
  window.addEventListener('focus',immediateSync);
  const app=q('#appView');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden')){patchTabs();setTimeout(immediateSync,500)}}).observe(app,{attributes:true,attributeFilter:['class']});
  let tries=0,t=setInterval(()=>{if(patchTabs()&&typeof state!=='undefined'&&state?.token){clearInterval(t);setTimeout(immediateSync,1000)}else if(++tries>200)clearInterval(t)},100);
  window.bamcoLiveSync={refresh:syncCore,interval:15000};
  window.bamcoCanonicalReports={renderPerformance,renderResponse,refreshCurrent:()=>state.view==='performanceReport'?renderPerformance(false):state.view==='responseReport'?renderResponse(false):Promise.resolve()};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
