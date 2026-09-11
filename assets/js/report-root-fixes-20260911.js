(()=>{
'use strict';
if(window.__bamcoReportRootFixes20260911)return;
window.__bamcoReportRootFixes20260911=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const faNum=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);

function installStyles(){
 if(q('#bamcoReportRootFixesCss'))return;
 const s=document.createElement('style');s.id='bamcoReportRootFixesCss';s.textContent=`
 #responseReportView tbody tr[data-delivery-id]{cursor:pointer!important}
 #responseReportView tbody tr.response-bulk-selected>td{background:#e2f2eb!important;box-shadow:inset 0 1px #8fbfa9,inset 0 -1px #8fbfa9!important}
 #responseReportView [data-response-bulk-delete]{color:#b54040!important;border-color:#e3aaaa!important;background:#fff5f5!important;font-weight:400!important;white-space:nowrap!important}
 #responseReportView [data-response-bulk-delete]:disabled{opacity:.45!important;cursor:not-allowed!important}
 #performanceReportView .workspace-report-tools{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important}
 #performanceReportView .performance-date-controls{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important}
 #performanceReportView .performance-date-controls label{display:flex!important;align-items:center!important;gap:6px!important;margin:0!important;white-space:nowrap!important}
 #performanceReportView .performance-date-field{display:grid!important;grid-template-columns:minmax(128px,158px) 38px!important;gap:5px!important;align-items:center!important}
 #performanceReportView .performance-date-field input{height:38px!important;border:1px solid #c7d5cf!important;border-radius:8px!important;background:#fff!important;padding:0 9px!important;text-align:center!important;font-family:"B Nazanin",BNazanin,Tahoma,sans-serif!important}
 #performanceReportView .performance-date-field button{height:38px!important;width:38px!important;padding:0!important}
 #performanceReportView .workspace-table{border-collapse:collapse!important;border-spacing:0!important}
 #performanceReportView .workspace-table th,#performanceReportView .workspace-table td{border:1px solid #cbd9d3!important}
 #performanceReportView .workspace-table th:last-child,#performanceReportView .workspace-table td:last-child{border-left:1px solid #cbd9d3!important}
 #performanceReportView .completion-cell{min-width:145px!important}
 @media(max-width:900px){#performanceReportView .performance-date-controls{width:100%!important}}
 `;document.head.append(s)
}

/* ---------- response report: reliable one/multi delete ---------- */
const selectedResponses=new Set();let responseDeleting=false;
function responseVisibleIds(){return new Set(qa('#responseReportView tbody tr[data-delivery-id]').map(r=>String(r.dataset.deliveryId)))}
function syncResponseSelection(){
 const visible=responseVisibleIds();for(const id of [...selectedResponses])if(!visible.has(id))selectedResponses.delete(id);
 qa('#responseReportView tbody tr[data-delivery-id]').forEach(r=>r.classList.toggle('response-bulk-selected',selectedResponses.has(String(r.dataset.deliveryId))));
 const b=q('#responseReportView [data-response-bulk-delete]');if(!b)return;const n=selectedResponses.size;b.disabled=responseDeleting||!n;const label=n>1?`حذف ${faNum(n)} رکورد`:'حذف رکورد';if(b.textContent!==label)b.textContent=label;b.title=n?'حذف ردیف‌های انتخاب‌شده':'برای انتخاب چند ردیف از Ctrl یا Shift استفاده کنید';
}
function ensureResponseBulkButton(){
 const view=q('#responseReportView');if(!view)return;
 let old=q('[data-response-delete-selected]',view),b=q('[data-response-bulk-delete]',view);
 if(old&&!b){old.removeAttribute('data-response-delete-selected');old.dataset.responseBulkDelete='1';old.disabled=true;old.textContent='حذف رکورد';b=old}
 if(!b){const clear=q('[data-response-clear-dates]',view);if(clear){b=document.createElement('button');b.type='button';b.className='ghost';b.dataset.responseBulkDelete='1';b.textContent='حذف رکورد';b.disabled=true;clear.insertAdjacentElement('afterend',b)}}
 syncResponseSelection();
}
async function deleteSelectedResponses(){
 const ids=[...selectedResponses].map(Number).filter(Number.isFinite);if(!ids.length)return;
 const question=ids.length===1?'رکورد انتخاب‌شده حذف شود؟':`${faNum(ids.length)} رکورد انتخاب‌شده حذف شوند؟`;
 if(!await window.bamcoConfirm(question))return;
 const changed=await rpc('cancel_message_deliveries',{p_ids:ids});
 if(Number(changed)!==ids.length)throw Error('حذف همه ردیف‌های انتخاب‌شده تأیید نشد؛ گزارش را تازه‌سازی کنید.');
 window.bamcoSelection?.clear('#responseReportView');
 const removed=new Set(ids.map(String));
 qa('#responseReportView tbody tr[data-delivery-id]').forEach(r=>{if(removed.has(String(r.dataset.deliveryId)))r.remove()});selectedResponses.clear();
 const rows=qa('#responseReportView tbody tr[data-delivery-id]'),total=rows.length;rows.forEach((r,i)=>{if(r.cells[0])r.cells[0].textContent=faNum(total-i)});syncResponseSelection();
 toast(`${faNum(Number(changed)||ids.length)} رکورد حذف شد.`);
 const refresh=q('#responseReportView [data-response-refresh],#responseReportView [data-tab-refresh="responseReport"]');if(refresh)setTimeout(()=>refresh.click(),40);
}
function installResponseDelete(){
 ensureResponseBulkButton();
 document.addEventListener('bamco-selection-change',e=>{
  if(!e.target.closest('#responseReportView'))return;
  selectedResponses.clear();
  for(const row of window.bamcoSelection?.rows('#responseReportView')||[]){
   if(row.dataset.deliveryId)selectedResponses.add(String(row.dataset.deliveryId));
  }
  syncResponseSelection();
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('#responseReportView [data-response-bulk-delete]');if(b){e.preventDefault();e.stopImmediatePropagation();if(b.disabled)return;responseDeleting=true;syncResponseSelection();deleteSelectedResponses().catch(err=>toast(err.message,true)).finally(()=>{responseDeleting=false;syncResponseSelection()});return}
  if(e.target.closest('#nav [data-view="responseReport"]'))setTimeout(ensureResponseBulkButton,100);
 },true);
 const view=q('#responseReportView');if(view){let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(ensureResponseBulkButton,30)}).observe(view,{childList:true,subtree:true})}
}

/* ---------- performance report ---------- */
let perfTarget=null,perfBusy=false,perfObserverBusy=false;
function currentMonth(){
 const p=typeof currentJalali==='function'?currentJalali():null;if(!p)return null;
 const start=jalaliToISO(p.y,p.m,1),next=p.m===12?jalaliToISO(p.y+1,1,1):jalaliToISO(p.y,p.m+1,1);if(!start||!next)return null;
 const d=new Date(next+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);const end=d.toISOString().slice(0,10);
 const startText=typeof jalaliText==='function'?jalaliText(start):faNum(`${p.y}/${String(p.m).padStart(2,'0')}/01`),endText=typeof jalaliText==='function'?jalaliText(end):'';
 return{start,end,startText,endText};
}
function inputIso(input){const raw=typeof en==='function'?en(input?.value||''):String(input?.value||''),bits=raw.match(/\d+/g)?.map(Number);if(!bits||bits.length!==3)return'';return jalaliToISO(bits[0],bits[1],bits[2])||''}
function profileName(id){const p=(state.profiles||[]).find(x=>String(x.id)===String(id));return p?.display_name||p?.full_name||p?.email||String(id||'—')}
function temporal(task){try{const p=window.bamcoTaskPresentation?.(task);if(p?.temporal)return p.temporal}catch{}const v=String(task?.due_state||'');if(v==='دیرکرد')return'دیرکرد';if(v.includes('هشدار'))return'دوره هشدار';return'فاقد شرایط دیرکرد'}
function completed(task){return !!window.bamcoOptions?.completed?.(task)}
function terminal(task){return !!window.bamcoOptions?.terminal?.(task)}
function ensurePerformanceControls(){
 const view=q('#performanceReportView'),tools=q('.workspace-report-tools',view);if(!view||!tools)return null;
 let box=q('.performance-date-controls',tools);if(!box){box=document.createElement('div');box.className='performance-date-controls';box.innerHTML='<label><span>تاریخ شروع</span><span class="performance-date-field"><input data-performance-from class="jalali-input" readonly><button type="button" class="ghost" data-performance-date="from" aria-label="انتخاب تاریخ شروع">▦</button></span></label><label><span>تاریخ پایان</span><span class="performance-date-field"><input data-performance-to class="jalali-input" readonly><button type="button" class="ghost" data-performance-date="to" aria-label="انتخاب تاریخ پایان">▦</button></span></label><button type="button" class="ghost" data-performance-clear>حذف بازه</button>';tools.insertBefore(box,tools.firstChild);const m=currentMonth();if(m){q('[data-performance-from]',box).value=m.startText;q('[data-performance-to]',box).value=m.endText;box.dataset.defaultFrom=m.start;box.dataset.defaultTo=m.end}}
 return box;
}
async function renderPerformanceRoot(){
 if(perfBusy)return;const view=q('#performanceReportView'),table=q('table',view);if(!view||!table||view.classList.contains('hidden'))return;const box=ensurePerformanceControls();if(!box)return;perfBusy=true;
 try{
  const from=inputIso(q('[data-performance-from]',box)),to=inputIso(q('[data-performance-to]',box));
  const defaultRange=box.dataset.defaultFrom&&from===box.dataset.defaultFrom&&to===box.dataset.defaultTo;
  let requestQuery='select=requested_by,request_type,created_at&request_type=eq.create&order=created_at.desc';if(from)requestQuery+=`&created_at=gte.${from}T00:00:00`;if(to)requestQuery+=`&created_at=lte.${to}T23:59:59`;
  const requests=await selectAll('change_requests',requestQuery),tasks=state.tasks||[];
  const ids=[...new Set([...tasks.map(t=>t.owner_id),...requests.map(r=>r.requested_by)])].filter(Boolean);
  const headers=['شناسه متولی','متولی','کل واگذارشده','فعال','هشدار','دیرکرد',defaultRange?'محول‌شده در این ماه':'محول‌شده در بازه',defaultRange?'انجام‌شده در این ماه':'انجام‌شده در بازه','درصد تکمیل',defaultRange?'درخواست تعریف وظیفه این ماه':'درخواست تعریف وظیفه در بازه'];
  table.tHead.innerHTML='<tr>'+headers.map(h=>`<th>${esc(h)}</th>`).join('')+'</tr>';
  const html=ids.map((id,i)=>{const a=tasks.filter(t=>String(t.owner_id)===String(id)),active=a.filter(t=>!t.archived&&!terminal(t)),due=a.filter(t=>t.due_date&&(!from||t.due_date.slice(0,10)>=from)&&(!to||t.due_date.slice(0,10)<=to)),done=due.filter(completed),pct=due.length?Math.round(done.length/due.length*100):0,level=pct>=80?'high':pct>=50?'medium':'low',req=requests.filter(r=>String(r.requested_by)===String(id)).length;return `<tr data-workspace-index="${i}"><td>${esc(id)}</td><td>${esc(profileName(id))}</td><td>${faNum(a.length)}</td><td>${faNum(active.length)}</td><td>${faNum(active.filter(t=>temporal(t)==='دوره هشدار').length)}</td><td>${faNum(active.filter(t=>temporal(t)==='دیرکرد').length)}</td><td>${faNum(due.length)}</td><td>${faNum(done.length)}</td><td class="completion-cell"><div class="performance-progress ${level}" style="--p:${Math.max(0,Math.min(100,pct))}%"><i></i><span>${faNum(pct)}٪</span></div></td><td>${faNum(req)}</td></tr>`}).join('');
  table.tBodies[0].innerHTML=html||'<tr><td colspan="10" class="empty">رکوردی ثبت نشده است.</td></tr>';
  q('.report-definition',view)?.remove();
 }catch(err){console.warn('Performance report enhancement failed',err)}finally{perfBusy=false}
}
function openPerformanceCalendar(kind){
 const box=q('#performanceReportView .performance-date-controls'),input=q(kind==='from'?'[data-performance-from]':'[data-performance-to]',box);if(!input)return;perfTarget=input;const bits=(typeof en==='function'?en(input.value||''):String(input.value||'')).match(/\d+/g)?.map(Number),now=currentJalali(),p=bits?.length===3?{y:bits[0],m:bits[1],d:bits[2]}:now;q('#calendarLabel').textContent=kind==='from'?'تاریخ شروع گزارش عملکرد':'تاریخ پایان گزارش عملکرد';q('#calYear').innerHTML=Array.from({length:16},(_,i)=>now.y-5+i).map(y=>`<option value="${y}">${faNum(y)}</option>`).join('');q('#calMonth').innerHTML=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');q('#calYear').value=String(p.y);q('#calMonth').value=String(p.m);fillCalendarDays();q('#calDay').value=String(p.d);q('#calendarDialog').showModal()
}
async function exportVisiblePerformance(){
 const view=q('#performanceReportView'),table=q('table',view);if(!table)return;const headers=[...(table.tHead?.rows?.[0]?.cells||[])].map(c=>c.textContent.trim()),rows=qa('tbody tr',table).filter(r=>!r.hidden&&!r.querySelector('.empty')).map(r=>[...r.cells].map(c=>c.textContent.trim())),data=[headers,...rows];const X=await window.ensureBamcoXLSX(),ws=X.utils.aoa_to_sheet(data),wb=X.utils.book_new();ws['!views']=[{rightToLeft:true}];ws['!autofilter']={ref:X.utils.encode_range({s:{r:0,c:0},e:{r:data.length-1,c:Math.max(0,headers.length-1)}})};wb.Workbook={Views:[{RTL:true}]};X.utils.book_append_sheet(wb,ws,'گزارش عملکرد');X.writeFile(wb,'گزارش عملکرد.xlsx',{compression:true});toast('فایل Excel گزارش عملکرد آماده شد.')
}
function installPerformance(){
 document.addEventListener('click',e=>{
  const date=e.target.closest('#performanceReportView [data-performance-date]');if(date){e.preventDefault();e.stopImmediatePropagation();openPerformanceCalendar(date.dataset.performanceDate);return}
  const clear=e.target.closest('#performanceReportView [data-performance-clear]');if(clear){const box=q('#performanceReportView .performance-date-controls');q('[data-performance-from]',box).value='';q('[data-performance-to]',box).value='';renderPerformanceRoot();return}
  const exp=e.target.closest('#performanceReportView [data-report-export]');if(exp){e.preventDefault();e.stopImmediatePropagation();exportVisiblePerformance().catch(err=>toast(err.message,true));return}
  if(perfTarget&&e.target.closest('#setDateBtn')){e.preventDefault();e.stopImmediatePropagation();perfTarget.value=faNum(`${q('#calYear').value}/${String(q('#calMonth').value).padStart(2,'0')}/${String(q('#calDay').value).padStart(2,'0')}`);perfTarget=null;q('#calendarDialog').close();renderPerformanceRoot();return}
  if(perfTarget&&e.target.closest('#clearDateBtn')){e.preventDefault();e.stopImmediatePropagation();perfTarget.value='';perfTarget=null;q('#calendarDialog').close();renderPerformanceRoot();return}
  if(e.target.closest('#nav [data-view="performanceReport"],#performanceReportView [data-tab-refresh="performanceReport"]'))setTimeout(renderPerformanceRoot,120)
 },true);
 const view=q('#performanceReportView');if(view){let t=0;new MutationObserver(()=>{if(perfObserverBusy)return;clearTimeout(t);t=setTimeout(()=>{perfObserverBusy=true;Promise.resolve(renderPerformanceRoot()).finally(()=>{perfObserverBusy=false})},50)}).observe(view,{childList:true,subtree:false})}
 if(state?.view==='performanceReport')setTimeout(renderPerformanceRoot,120)
}

function boot(){installStyles();installResponseDelete();installPerformance()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
