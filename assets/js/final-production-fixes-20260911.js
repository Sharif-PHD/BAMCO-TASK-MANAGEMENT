(()=>{
'use strict';
if(window.__bamcoFinalProductionFixes20260911V1)return;
window.__bamcoFinalProductionFixes20260911V1=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null,qa=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const statusLabel={ready:'آماده',queued:'در صف',processing:'در حال ارسال',sent:'ارسال‌شده',delivered:'تحویل‌شده',failed:'خطا',cancelled:'لغوشده'};
let perfReqCache={key:'',rows:[],at:0},responseCache=[],sentCache=[],dateTarget=null,avatarUrl='';

function showFinalView(id,title){
  if(typeof showView==='function')showView(id);else{state.view=id;qa('#appView .view').forEach(v=>v.classList.toggle('hidden',v.id!==id+'View'))}
  state.view=id;const h=q('#viewTitle');if(h)h.textContent=title;const add=q('#addTaskBtn');if(add)add.classList.add('hidden');
}
function finalPanel(view,title,tools,table){view.innerHTML=`<div class="panel workspace-panel bamco-final-report"><div class="panel-head"><h3>${esc(title)}</h3></div>${tools||''}${table||''}</div>`}
function currentMonthRange(){
  try{const p=currentJalali(),from=jalaliToISO(p.y,p.m,1),next=p.m===12?jalaliToISO(p.y+1,1,1):jalaliToISO(p.y,p.m+1,1);if(!from||!next)return null;const d=new Date(next+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);const to=d.toISOString().slice(0,10);return{from,to,fromText:jalaliText(from),toText:jalaliText(to)}}catch{return null}
}
function jalaliInputIso(input){const raw=typeof en==='function'?en(input?.value||''):String(input?.value||''),m=raw.match(/\d+/g)?.map(Number);return m?.length===3?jalaliToISO(m[0],m[1],m[2])||'':''}
function taskTemporal(t){try{return window.bamcoTaskPresentation?.(t)?.temporal||''}catch{return String(t?.due_state||'')}}
function taskDone(t){return !!window.bamcoOptions?.completed?.(t)}
function taskTerminal(t){return !!window.bamcoOptions?.terminal?.(t)}
function personName(id){const p=(state.profiles||[]).find(x=>String(x.id)===String(id));return p?.display_name||p?.full_name||p?.email||String(id||'—')}

async function loadPerfRequests(from,to){
  const key=`${from}|${to}`;if(perfReqCache.key===key&&Date.now()-perfReqCache.at<30000)return perfReqCache.rows;
  let query='select=requested_by,request_type,created_at&request_type=eq.create&order=created_at.desc';
  if(from)query+=`&created_at=gte.${from}T00:00:00`;if(to)query+=`&created_at=lte.${to}T23:59:59`;
  const rows=await selectAll('change_requests',query);perfReqCache={key,rows,at:Date.now()};return rows;
}
function perfTools(range){return `<div class="workspace-report-tools final-report-tools"><div class="performance-date-controls"><label><span>تاریخ شروع</span><span class="performance-date-field"><input id="finalPerfFrom" class="jalali-input" readonly value="${esc(range?.fromText||'')}"><button type="button" class="ghost" data-final-date="perf-from">▦</button></span></label><label><span>تاریخ پایان</span><span class="performance-date-field"><input id="finalPerfTo" class="jalali-input" readonly value="${esc(range?.toText||'')}"><button type="button" class="ghost" data-final-date="perf-to">▦</button></span></label><button type="button" class="ghost" data-final-perf-clear>حذف بازه</button></div><input id="finalPerfSearch" type="search" placeholder="جست‌وجو در گزارش…"><button type="button" class="ghost" data-final-perf-refresh>تازه‌سازی</button><button type="button" class="ghost" data-final-export="performance">خروجی اکسل</button></div>`}
async function renderPerformance(force=false){
  const view=q('#performanceReportView');if(!view)return;const range=currentMonthRange();
  if(force||!q('.bamco-final-report',view))finalPanel(view,'گزارش عملکرد',perfTools(range),'<div class="table-wrap"><table class="workspace-table"><thead></thead><tbody><tr><td class="empty">در حال دریافت اطلاعات…</td></tr></tbody></table></div>');
  const from=jalaliInputIso(q('#finalPerfFrom')),to=jalaliInputIso(q('#finalPerfTo'));let requests=[];try{requests=await loadPerfRequests(from,to)}catch{}
  if(state.view!=='performanceReport')return;const table=q('#performanceReportView table');if(!table)return;
  const tasks=state.tasks||[],ids=[...new Set([...tasks.map(t=>t.owner_id),...requests.map(r=>r.requested_by)])].filter(Boolean),defaultRange=!!range&&from===range.from&&to===range.to;
  const headers=['شناسه متولی','متولی','کل واگذارشده','فعال','هشدار','دیرکرد',defaultRange?'محول‌شده در این ماه':'محول‌شده در بازه',defaultRange?'انجام‌شده در این ماه':'انجام‌شده در بازه','درصد تکمیل',defaultRange?'درخواست تعریف وظیفه این ماه':'درخواست تعریف وظیفه در بازه'];
  table.tHead.innerHTML='<tr>'+headers.map(h=>`<th>${esc(h)}</th>`).join('')+'</tr>';
  table.tBodies[0].innerHTML=ids.map((id,i)=>{const all=tasks.filter(t=>String(t.owner_id)===String(id)),active=all.filter(t=>!t.archived&&!taskTerminal(t)),due=all.filter(t=>t.due_date&&(!from||t.due_date.slice(0,10)>=from)&&(!to||t.due_date.slice(0,10)<=to)),done=due.filter(taskDone),pct=due.length?Math.round(done.length/due.length*100):0,level=pct>=80?'high':pct>=50?'medium':'low',req=requests.filter(r=>String(r.requested_by)===String(id)).length;return `<tr data-final-row="1" data-workspace-index="${i}"><td>${esc(id)}</td><td>${esc(personName(id))}</td><td>${digits(all.length)}</td><td>${digits(active.length)}</td><td>${digits(active.filter(t=>taskTemporal(t)==='دوره هشدار').length)}</td><td>${digits(active.filter(t=>taskTemporal(t)==='دیرکرد').length)}</td><td>${digits(due.length)}</td><td>${digits(done.length)}</td><td class="completion-cell"><div class="performance-progress ${level}" style="--p:${Math.max(0,Math.min(100,pct))}%"><i></i><span>${digits(pct)}٪</span></div></td><td>${digits(req)}</td></tr>`}).join('')||'<tr><td colspan="10" class="empty">رکوردی ثبت نشده است.</td></tr>';
  bindSearch('#finalPerfSearch','#performanceReportView');
}

function responseLabel(v){return({replied:'پاسخ داده',awaiting:'بدون پاسخ',failed:'خطای ارسال',reminder_needed:'نیازمند یادآوری'})[v]||v||'—'}
function channel(v){return v==='email'?'ایمیل':v==='portal'?'داخل سامانه':v==='both'?'هر دو':v||'—'}
function responseFiltered(){const term=(q('#finalResponseSearch')?.value||'').trim().toLocaleLowerCase(),from=jalaliInputIso(q('#finalResponseFrom')),to=jalaliInputIso(q('#finalResponseTo'));return responseCache.filter(x=>x.delivery_status!=='cancelled'&&(!from||String(x.sent_at||'').slice(0,10)>=from)&&(!to||String(x.sent_at||'').slice(0,10)<=to)&&(!term||[x.recipient_name,x.recipient_email,x.subject,x.reply_text,x.delivery_id].some(v=>String(v||'').toLocaleLowerCase().includes(term))))}
function renderResponseRows(){const body=q('#finalResponseBody');if(!body)return;const rows=responseFiltered(),total=rows.length;body.innerHTML=rows.map((x,i)=>`<tr data-final-row="1" data-delivery-id="${esc(x.delivery_id)}"><td>${digits(total-i)}</td><td>${esc(x.recipient_name||x.recipient_email||'—')}</td><td>${esc(channel(x.channel))}</td><td>${esc(x.subject||'—')}</td><td>${esc(x.sent_at?jalaliDateTime(x.sent_at):'—')}</td><td>${esc(responseLabel(x.response_status))}</td><td>${esc(x.reply_text||'—')}</td><td>${esc(channel(x.reply_channel))}</td><td>${esc(x.replied_at?jalaliDateTime(x.replied_at):'—')}</td><td>${digits(x.reminder_count||0)}</td></tr>`).join('')||'<tr><td colspan="10" class="empty">رکوردی مطابق فیلترها وجود ندارد.</td></tr>'}
async function renderResponse(force=false){
  const view=q('#responseReportView');if(!view)return;if(force||!q('.bamco-final-report',view))finalPanel(view,'گزارش پاسخ‌ها',`<div class="workspace-report-tools final-report-tools"><div class="report-date-controls"><label><span class="response-date-caption">از تاریخ</span><span class="report-date-field"><input id="finalResponseFrom" class="jalali-input" readonly><button type="button" class="ghost" data-final-date="response-from">▦</button></span></label><label><span class="response-date-caption">تا تاریخ</span><span class="report-date-field"><input id="finalResponseTo" class="jalali-input" readonly><button type="button" class="ghost" data-final-date="response-to">▦</button></span></label><button type="button" class="ghost" data-final-response-clear>حذف بازه</button></div><input id="finalResponseSearch" type="search" placeholder="جست‌وجو در گزارش…"><button type="button" class="ghost" data-final-response-refresh>تازه‌سازی</button><button type="button" class="ghost" data-final-export="response">خروجی اکسل</button></div>`,`<div class="table-wrap"><table class="workspace-table"><thead><tr><th>ردیف</th><th>فرد</th><th>کانال</th><th>موضوع</th><th>ارسال</th><th>وضعیت پاسخ</th><th>پاسخ</th><th>کانال پاسخ</th><th>تاریخ پاسخ</th><th>تعداد یادآوری</th></tr></thead><tbody id="finalResponseBody"><tr><td colspan="10" class="empty">در حال دریافت اطلاعات…</td></tr></tbody></table></div>`);
  try{responseCache=await selectAll('message_response_tracking','select=*&order=delivery_id.desc');window.__bamcoResponseRows=responseCache}catch(err){toast(err.message,true);return}if(state.view!=='responseReport')return;renderResponseRows();q('#finalResponseSearch').oninput=renderResponseRows;
}

function renderSentRows(){const body=q('#finalSentBody');if(!body)return;const term=(q('#finalSentSearch')?.value||'').trim().toLocaleLowerCase(),rows=sentCache.filter(x=>x.delivery_status!=='cancelled'&&(!term||[x.sender_name,x.recipient_name,x.subject,x.channel,x.delivery_status,x.error_message,x.source_type].some(v=>String(v||'').toLocaleLowerCase().includes(term))));body.innerHTML=rows.map(x=>`<tr data-final-row="1"><td>${esc(x.sender_name||'سامانه')}</td><td>${esc(x.recipient_name||'—')}</td><td>${esc(x.subject||'پیام خودکار سامانه')}</td><td>${esc(channel(x.channel))}</td><td>${esc(statusLabel[x.delivery_status]||x.delivery_status||'—')}</td><td>${esc(x.sent_at?jalaliDateTime(x.sent_at):'—')}</td><td>${digits(x.attempt_count||0)}</td><td>${esc(x.error_message||'—')}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">پیامی مطابق جست‌وجو وجود ندارد.</td></tr>';const summary=q('#finalSentSummary');if(summary){const ok=rows.filter(x=>['sent','delivered'].includes(x.delivery_status)).length,fail=rows.filter(x=>x.delivery_status==='failed').length;summary.innerHTML=`<span>کل: ${digits(rows.length)}</span><span>موفق: ${digits(ok)}</span><span>خطا: ${digits(fail)}</span>`}}
async function renderSent(force=false){
  const view=q('#sentMessagesView');if(!view)return;if(force||!q('.bamco-final-report',view))finalPanel(view,'پیام‌های ارسال‌شده',`<div class="workspace-report-tools final-report-tools"><input id="finalSentSearch" type="search" placeholder="جست‌وجو در فرستنده، گیرنده، موضوع…"><button type="button" class="ghost" data-final-sent-refresh>تازه‌سازی</button></div><div id="finalSentSummary" class="sent-log-summary"><span>در حال دریافت…</span></div>`,`<div class="table-wrap"><table class="workspace-table"><thead><tr><th>فرستنده</th><th>گیرنده</th><th>موضوع</th><th>کانال</th><th>وضعیت</th><th>زمان ارسال</th><th>تلاش</th><th>خطا</th></tr></thead><tbody id="finalSentBody"><tr><td colspan="8" class="empty">در حال دریافت اطلاعات…</td></tr></tbody></table></div>`);
  try{sentCache=await selectAll('sent_message_log','select=*&order=sent_at.desc')}catch(err){toast(err.message,true);return}if(state.view!=='sentMessages')return;renderSentRows();q('#finalSentSearch').oninput=renderSentRows;
}

function bindSearch(inputSel,viewSel){const input=q(inputSel);if(!input||input.dataset.boundFinalSearch)return;input.dataset.boundFinalSearch='1';input.addEventListener('input',()=>{const term=input.value.trim().toLocaleLowerCase();qa(`${viewSel} tbody tr[data-final-row]`).forEach(r=>r.hidden=!!term&&!r.textContent.toLocaleLowerCase().includes(term))})}
async function exportFinal(kind){const view=q(kind==='performance'?'#performanceReportView':'#responseReportView'),table=q('table',view);if(!table)return;const rows=[...table.rows].filter(r=>!r.hidden).map(r=>[...r.cells].map(c=>c.textContent.trim()));const X=await window.ensureBamcoXLSX(),ws=X.utils.aoa_to_sheet(rows),wb=X.utils.book_new();ws['!views']=[{rightToLeft:true}];wb.Workbook={Views:[{RTL:true}]};X.utils.book_append_sheet(wb,ws,kind==='performance'?'گزارش عملکرد':'گزارش پاسخ‌ها');X.writeFile(wb,(kind==='performance'?'گزارش عملکرد':'گزارش پاسخ‌ها')+'.xlsx',{compression:true})}

function openFinalCalendar(kind){
 const input=q(kind==='perf-from'?'#finalPerfFrom':kind==='perf-to'?'#finalPerfTo':kind==='response-from'?'#finalResponseFrom':'#finalResponseTo');if(!input)return;dateTarget={kind,input};
 const now=currentJalali(),raw=typeof en==='function'?en(input.value||''):String(input.value||''),m=raw.match(/\d+/g)?.map(Number),p=m?.length===3?{y:m[0],m:m[1],d:m[2]}:now;
 q('#calendarLabel').textContent=kind.includes('from')?'انتخاب تاریخ شروع':'انتخاب تاریخ پایان';q('#calYear').innerHTML=Array.from({length:16},(_,i)=>now.y-5+i).map(y=>`<option value="${y}">${digits(y)}</option>`).join('');q('#calMonth').innerHTML=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');q('#calYear').value=String(p.y);q('#calMonth').value=String(p.m);fillCalendarDays();q('#calDay').value=String(p.d);q('#calendarDialog').showModal();
}
function commitFinalDate(clear=false){if(!dateTarget)return false;const {kind,input}=dateTarget;if(clear)input.value='';else input.value=digits(`${q('#calYear').value}/${String(q('#calMonth').value).padStart(2,'0')}/${String(q('#calDay').value).padStart(2,'0')}`);dateTarget=null;q('#calendarDialog')?.close();if(kind.startsWith('perf'))void renderPerformance(false);else renderResponseRows();return true}

function optimisticResequence(tasks){const numbered=tasks.filter(t=>Number.isFinite(Number(t.legacy_id))).sort((a,b)=>Number(a.legacy_id)-Number(b.legacy_id)||Number(a.id)-Number(b.id));numbered.forEach((t,i)=>t.legacy_id=i+1)}
async function instantDelete(scope){
 if(typeof isManager==='function'&&!isManager())return;const ids=[...new Set((window.bamcoSelection?.ids?.(scope==='kanban'?'#kanbanBody':'#archiveBody')||[]).map(String))];if(!ids.length&&state.selected?.[scope]!=null)ids.push(String(state.selected[scope]));if(!ids.length)return;
 const tasks=ids.map(id=>state.tasks.find(t=>String(t.id)===id)).filter(Boolean);if(!tasks.length)return;const question=tasks.length===1?`وظیفه «${tasks[0].title}» برای همیشه حذف شود؟`:`${digits(tasks.length)} وظیفه انتخاب‌شده برای همیشه حذف شوند؟`;if(!await window.bamcoConfirm(question))return;
 const before=state.tasks.map(t=>({...t}));const removed=new Set(ids);state.tasks=state.tasks.filter(t=>!removed.has(String(t.id)));optimisticResequence(state.tasks);if(state.selected)state.selected[scope]=null;window.bamcoSelection?.clear?.(scope==='kanban'?'#kanbanBody':'#archiveBody');renderTasks(false);renderTasks(true);toast(tasks.length===1?'وظیفه حذف شد.':'وظایف انتخاب‌شده حذف شدند.');
 try{await rpc('delete_tasks_and_resequence',{p_task_ids:ids.map(Number)});selectAll('task_status_view','select=*&order=id.desc').then(rows=>{state.tasks=rows;renderTasks(false);renderTasks(true)}).catch(()=>{})}
 catch(err){state.tasks=before;renderTasks(false);renderTasks(true);toast('حذف روی سرور انجام نشد؛ وضعیت قبلی بازگردانده شد. '+err.message,true)}
}

async function fetchAvatarSource(path){const encoded=String(path).split('/').map(encodeURIComponent).join('/'),res=await fetch(`${SB_URL}/storage/v1/object/authenticated/avatars/${encoded}?v=${Date.now()}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'no-store'});if(!res.ok)throw Error(`avatar ${res.status}`);const next=URL.createObjectURL(await res.blob());if(avatarUrl)try{URL.revokeObjectURL(avatarUrl)}catch{}avatarUrl=next;return next}
function paintAvatar(src,path){const el=q('#avatar');if(!el||!src)return;const img=document.createElement('img');img.alt='تصویر پروفایل';img.dataset.finalTopAvatar='1';img.src=src;img.style.cssText='width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important';el.replaceChildren(img);el.classList.add('has-image');el.dataset.avatarLoaded=String(path||'')}
async function forceAvatar(){
 if(!state?.token||!state?.user?.id)return false;try{const rows=await select('profiles',`id=eq.${encodeURIComponent(state.user.id)}&select=id,avatar_path,display_name,full_name,email`),p=rows?.[0];if(!p)return false;state.profile={...(state.profile||{}),...p};const path=String(p.avatar_path||'');if(!path){const el=q('#avatar');if(el&&!el.querySelector('img'))el.textContent=String(p.display_name||p.full_name||'ب').trim()[0]||'ب';return true}const src=await fetchAvatarSource(path);paintAvatar(src,path);return true}catch(err){console.warn('topbar avatar refresh failed',err.message);return false}
}
function keepAvatar(){const path=String(state?.profile?.avatar_path||''),el=q('#avatar');if(path&&avatarUrl&&el&&!el.querySelector('img[data-final-top-avatar]'))paintAvatar(avatarUrl,path)}

function detachLegacyReportObservers(){for(const id of ['performanceReportView','responseReportView','sentMessagesView']){const old=q('#'+id);if(!old||old.dataset.finalDetached)return;const fresh=old.cloneNode(false);fresh.dataset.finalDetached='1';old.replaceWith(fresh)}}
function patchTabs(){const tabs=window.bamcoTabs;if(!tabs?.render||tabs.__finalCanonicalV1)return false;const raw=tabs.render.bind(tabs);tabs.render=(id,...args)=>id==='performanceReport'?renderPerformance(true):id==='responseReport'?renderResponse(true):id==='sentMessages'?renderSent(true):raw(id,...args);tabs.__finalCanonicalV1=true;return true}
function installCss(){const s=document.createElement('style');s.id='bamcoFinalProductionFixCss';s.textContent=`.final-report-tools{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important}.final-report-tools>input[type=search]{min-width:220px;flex:1}.bamco-final-report .workspace-table{border-collapse:collapse!important}.bamco-final-report .workspace-table th,.bamco-final-report .workspace-table td{border:1px solid #cbd9d3!important}.bamco-final-report .empty{text-align:center!important}.sent-log-summary{display:flex;gap:9px;flex-wrap:wrap;margin:8px 0 12px}.sent-log-summary span{background:#f3f8f5;border:1px solid #d4e2da;border-radius:999px;padding:5px 12px}`;document.head.append(s)}

function boot(){
 installCss();detachLegacyReportObservers();patchTabs();
 window.addEventListener('click',e=>{
  const nav=e.target.closest?.('#nav [data-view]');if(nav&&['performanceReport','responseReport','sentMessages'].includes(nav.dataset.view)){e.preventDefault();e.stopImmediatePropagation();const id=nav.dataset.view;if(id==='performanceReport'){showFinalView(id,'گزارش عملکرد');void renderPerformance(true)}else if(id==='responseReport'){showFinalView(id,'گزارش پاسخ‌ها');void renderResponse(true)}else{showFinalView(id,'پیام‌های ارسال‌شده');void renderSent(true)}return}
  const del=e.target.closest?.('#kanbanDeleteBtn,#archiveDeleteBtn');if(del){e.preventDefault();e.stopImmediatePropagation();void instantDelete(del.id.startsWith('archive')?'archive':'kanban');return}
  const date=e.target.closest?.('[data-final-date]');if(date){e.preventDefault();e.stopImmediatePropagation();openFinalCalendar(date.dataset.finalDate);return}
  if(dateTarget&&e.target.closest?.('#setDateBtn')){e.preventDefault();e.stopImmediatePropagation();commitFinalDate(false);return}
  if(dateTarget&&e.target.closest?.('#clearDateBtn')){e.preventDefault();e.stopImmediatePropagation();commitFinalDate(true);return}
  if(e.target.closest?.('[data-final-perf-clear]')){e.preventDefault();e.stopImmediatePropagation();q('#finalPerfFrom').value='';q('#finalPerfTo').value='';void renderPerformance(false);return}
  if(e.target.closest?.('[data-final-response-clear]')){e.preventDefault();e.stopImmediatePropagation();q('#finalResponseFrom').value='';q('#finalResponseTo').value='';renderResponseRows();return}
  if(e.target.closest?.('[data-final-perf-refresh]')){e.preventDefault();e.stopImmediatePropagation();perfReqCache={key:'',rows:[],at:0};void renderPerformance(false);return}
  if(e.target.closest?.('[data-final-response-refresh]')){e.preventDefault();e.stopImmediatePropagation();void renderResponse(false);return}
  if(e.target.closest?.('[data-final-sent-refresh]')){e.preventDefault();e.stopImmediatePropagation();void renderSent(false);return}
  const exp=e.target.closest?.('[data-final-export]');if(exp){e.preventDefault();e.stopImmediatePropagation();void exportFinal(exp.dataset.finalExport);return}
 },true);
 document.addEventListener('bamco-messages-changed',()=>{sentCache=[];if(state?.view==='sentMessages')void renderSent(false)});
 const app=q('#appView');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))[0,180,700].forEach(ms=>setTimeout(()=>void forceAvatar(),ms))}).observe(app,{attributes:true,attributeFilter:['class']});
 const avatar=q('#avatar');if(avatar)new MutationObserver(()=>queueMicrotask(keepAvatar)).observe(avatar,{childList:true});
 let tries=0,t=setInterval(()=>{patchTabs();if(state?.token){clearInterval(t);[0,250,1000,3000].forEach(ms=>setTimeout(()=>void forceAvatar(),ms))}else if(++tries>240)clearInterval(t)},100);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state?.token)void forceAvatar()});addEventListener('pageshow',()=>{if(state?.token)void forceAvatar()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
