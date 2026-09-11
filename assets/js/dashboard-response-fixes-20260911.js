(()=>{
'use strict';
if(window.__bamcoDashboardResponseFixes20260911)return;
window.__bamcoDashboardResponseFixes20260911=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const faNum=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);

function installCss(){
 if(q('#bamcoDashboardResponseFixesCss'))return;
 const s=document.createElement('style');s.id='bamcoDashboardResponseFixesCss';s.textContent=`
 html body #dashboardCards article{background:#fff!important;background-image:none!important;border:1px solid transparent!important;box-shadow:0 8px 22px rgba(28,67,54,.11)!important;overflow:hidden!important;position:relative!important}
 html body #dashboardCards article::before{content:"";position:absolute;inset:0;opacity:1;pointer-events:none;z-index:0}
 html body #dashboardCards article>*{position:relative;z-index:1}
 html body #dashboardCards article[data-key="total"]::before{background:linear-gradient(135deg,#d9f3e8,#f2fbf7)}
 html body #dashboardCards article[data-key="in_progress"]::before{background:linear-gradient(135deg,#dcecff,#f4f9ff)}
 html body #dashboardCards article[data-key="waiting"]::before{background:linear-gradient(135deg,#eee3ff,#faf6ff)}
 html body #dashboardCards article[data-key="overdue"]::before{background:linear-gradient(135deg,#ffd9d6,#fff3f2)}
 html body #dashboardCards article[data-key="warning"]::before{background:linear-gradient(135deg,#ffe9ad,#fff8e7)}
 html body #dashboardCards article[data-key="archive_total"]::before{background:linear-gradient(135deg,#e4eaed,#f7f9fa)}
 html body #dashboardCards article[data-key="pending_requests"]::before{background:linear-gradient(135deg,#ffe0c2,#fff5eb)}
 html body #dashboardCards article[data-key="create_requests"]::before{background:linear-gradient(135deg,#d7f1df,#f2fbf5)}
 html body #dashboardCards article[data-key="unscheduled"]::before{background:linear-gradient(135deg,#dfe9ed,#f5f9fa)}
 html body #dashboardCards article[data-key="total"]{border-color:#94c8b3!important;color:#155c45!important}
 html body #dashboardCards article[data-key="in_progress"]{border-color:#a8c7e9!important;color:#245f9b!important}
 html body #dashboardCards article[data-key="waiting"]{border-color:#c8b0eb!important;color:#69459a!important}
 html body #dashboardCards article[data-key="overdue"]{border-color:#efa8a2!important;color:#a43e36!important}
 html body #dashboardCards article[data-key="warning"]{border-color:#e5c264!important;color:#86600e!important}
 html body #dashboardCards article[data-key="archive_total"]{border-color:#c3cdd2!important;color:#53666e!important}
 html body #dashboardCards article[data-key="pending_requests"]{border-color:#e9b27f!important;color:#92551d!important}
 html body #dashboardCards article[data-key="create_requests"]{border-color:#9fceb0!important;color:#257044!important}
 html body #dashboardCards article[data-key="unscheduled"]{border-color:#b6c8cf!important;color:#486671!important}
 html body #dashboardCards article small,html body #dashboardCards article strong{color:inherit!important}
 html body .dashboard-chart-card:has(#workloadChart){min-height:490px!important;height:auto!important}
 html body #workloadChart{display:block!important;width:100%!important;height:445px!important;min-height:445px!important}
 html body #performanceReportView .report-definition{display:none!important}
 #responseReportView .workspace-report-tools{display:grid!important;grid-template-columns:auto auto minmax(280px,1fr)!important;align-items:end!important;gap:10px 12px!important}
 #responseReportView .response-primary-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
 #responseReportView .report-date-controls{display:flex;align-items:end;gap:8px;flex-wrap:wrap}
 #responseReportView [data-response-clear-dates]{color:#b54040!important;border-color:#e4b0b0!important;background:#fff5f5!important;font-weight:400!important}
 #responseReportView [data-report-export]{font-weight:400!important}
 #responseReportView [data-response-refresh]{font-weight:400!important}
 #responseReportView .response-delete{color:#b53d3d!important;border-color:#e4b0b0!important;background:#fff7f7!important;font-weight:400!important;padding:5px 10px!important;white-space:nowrap}
 #responseReportView th:last-child,#responseReportView td:last-child{width:92px;text-align:center!important}
 @media(max-width:980px){#responseReportView .workspace-report-tools{grid-template-columns:1fr!important}.response-primary-actions,.report-date-controls{width:100%}}
 `;document.head.append(s);
}

function dashboardFilterRows(){
 const rows=(state?.tasks||[]).filter(t=>!t.archived&&!window.bamcoOptions?.terminal(t));
 const owner=q('#dashOwner')?.value||'همه',priority=q('#dashPriority')?.value||'همه',status=q('#dashStatus')?.value||'همه',bucket=q('#dashBucket')?.value||'همه';
 return rows.filter(t=>{
  if(owner!=='همه'&&typeof ownerName==='function'&&norm(ownerName(t))!==norm(owner))return false;
  if(priority!=='همه'&&norm(t.priority)!==norm(priority))return false;
  if(status!=='همه'&&norm(t.status)!==norm(status))return false;
  if(bucket!=='همه'){
   const due=String(t.due_state||'');const b=due==='دیرکرد'?'دیرکرد':due.includes('هشدار')?'دوره هشدار':'فاقد شرایط دیرکرد';if(norm(b)!==norm(bucket))return false;
  }
  return true;
 });
}
function drawWorkload(){
 const canvas=q('#workloadChart');if(!canvas||q('#dashboardView')?.classList.contains('hidden'))return;
 const rows=dashboardFilterRows(),groups=new Map();
 for(const t of rows){const owner=typeof ownerName==='function'?(ownerName(t)||'—'):'—',p=String(t.priority||'بدون اولویت');if(!groups.has(owner))groups.set(owner,new Map());const m=groups.get(owner);m.set(p,(m.get(p)||0)+1)}
 const owners=[...groups.entries()].sort((a,b)=>[...b[1].values()].reduce((x,y)=>x+y,0)-[...a[1].values()].reduce((x,y)=>x+y,0)).slice(0,10);
 const priorities=[...new Set(rows.map(t=>String(t.priority||'بدون اولویت')))];
 const dpr=window.devicePixelRatio||1,w=Math.max(420,canvas.parentElement?.clientWidth||canvas.clientWidth||800),h=445;
 canvas.dataset.logicalHeight=String(h);canvas.setAttribute('height',String(h));canvas.style.height=h+'px';canvas.style.width=w+'px';canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.direction='rtl';ctx.textAlign='right';ctx.fillStyle='#173f35';ctx.font='bold 21px "B Nazanin",Tahoma,serif';ctx.fillText('حجم کار فعال به تفکیک متولی',w-18,31);
 if(!owners.length){ctx.textAlign='center';ctx.fillStyle='#7a8e85';ctx.font='18px "B Nazanin",Tahoma,serif';ctx.fillText('اطلاعاتی برای نمایش وجود ندارد',w/2,h/2);return}
 const left=60,right=Math.max(left+220,w-185),top=62,bottom=h-82,max=Math.max(1,...owners.map(([,m])=>[...m.values()].reduce((a,b)=>a+b,0))),gap=16,bw=Math.max(42,Math.min(78,((right-left)-gap*(owners.length+1))/owners.length)),scale=(bottom-top)/max;
 for(let step=0;step<=5;step++){const y=bottom-(bottom-top)*step/5;ctx.strokeStyle='#edf2f0';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillStyle='#879a91';ctx.textAlign='right';ctx.font='12px "B Nazanin",Tahoma,serif';ctx.fillText(faNum(Math.round(max*step/5)),left-8,y+4)}
 let x=left+Math.max(0,(right-left-(owners.length*bw+(owners.length+1)*gap))/2)+gap;
 for(const [owner,m] of owners){let y=bottom;for(const p of priorities){const value=m.get(p)||0;if(!value)continue;const height=value*scale;ctx.fillStyle=window.bamcoOptions?.color?.('priority',p)||'#76a68f';ctx.fillRect(x,y-height,bw,height);if(height>16){ctx.fillStyle='#20372f';ctx.textAlign='center';ctx.font='bold 12px "B Nazanin",Tahoma,serif';ctx.fillText(faNum(value),x+bw/2,y-height/2+4)}y-=height}ctx.fillStyle='#435b51';ctx.textAlign='center';ctx.font='12px "B Nazanin",Tahoma,serif';const short=String(owner).replace(/^(جناب آقای|سرکار خانم|مهندس|آقای|خانم)\s+/,'');ctx.fillText(short.length>16?short.slice(0,15)+'…':short,x+bw/2,bottom+20);x+=bw+gap}
 let ly=82;for(const p of priorities){ctx.fillStyle=window.bamcoOptions?.color?.('priority',p)||'#76a68f';ctx.fillRect(w-44,ly-10,16,16);ctx.fillStyle='#435b51';ctx.textAlign='right';ctx.font='14px "B Nazanin",Tahoma,serif';ctx.fillText(p,w-52,ly+2);ly+=27}
}
function paintDashboardCards(){
 qa('#dashboardCards article').forEach(card=>{card.style.removeProperty('background');card.style.removeProperty('background-image')});
}
function hookDashboard(){
 const apply=()=>{const original=window.renderDashboard;if(typeof original!=='function'||original.__bamcoWorkloadFix)return false;const wrapped=function(...args){const canvas=q('#workloadChart');if(canvas){canvas.dataset.logicalHeight='445';canvas.setAttribute('height','445')}const out=original.apply(this,args);paintDashboardCards();drawWorkload();return out};wrapped.__bamcoWorkloadFix=true;window.renderDashboard=wrapped;return true};
 if(!apply()){let n=0,t=setInterval(()=>{if(apply()||++n>50)clearInterval(t)},100)}
 document.addEventListener('change',e=>{if(e.target.matches('#dashOwner,#dashPriority,#dashStatus,#dashBucket'))requestAnimationFrame(drawWorkload)});
 document.addEventListener('click',e=>{if(e.target.closest('#resetDashFilters,#nav [data-view="dashboard"]'))requestAnimationFrame(()=>{paintDashboardCards();drawWorkload()})},true);
 addEventListener('resize',()=>{if(state?.view==='dashboard')requestAnimationFrame(drawWorkload)},{passive:true});
}
function removePerformanceDefinition(){q('#performanceReportView .report-definition')?.remove()}

let responseRowsCache=[];
function getResponseRows(){const source=window.__bamcoResponseRows||responseRowsCache;return Array.isArray(source)?source:responseRowsCache}
function responseDateIso(value,end=false){const bits=(typeof en==='function'?en(value||''):String(value||'')).match(/\d+/g)?.map(Number);if(!bits||bits.length!==3||typeof jalaliToISO!=='function')return'';const iso=jalaliToISO(bits[0],bits[1],bits[2]);return iso?iso+(end?'T23:59:59':'T00:00:00'):''}
function responseFiltered(rows){const view=q('#responseReportView'),from=responseDateIso(q('[data-response-from]',view)?.value),to=responseDateIso(q('[data-response-to]',view)?.value,true),term=(q('[data-response-search]',view)?.value||'').trim().toLocaleLowerCase();return rows.filter(x=>x.delivery_status!=='cancelled'&&(!from||String(x.sent_at||'')>=from)&&(!to||String(x.sent_at||'')<=to)&&(!term||[x.recipient_name,x.recipient_email,x.subject,x.reply_text,x.delivery_id].some(v=>String(v||'').toLocaleLowerCase().includes(term)))).sort((a,b)=>Number(b.delivery_id)-Number(a.delivery_id))}
function responseLabel(v){return({replied:'پاسخ داده',awaiting:'بدون پاسخ',failed:'خطای ارسال',reminder_needed:'نیازمند یادآوری'})[v]||v||'—'}
function channel(v){return v==='email'?'ایمیل':v==='portal'?'داخل سامانه':v==='both'?'هر دو':v||'—'}
function renderResponseTable(){
 const body=q('#responseReportBody');if(!body)return;const rows=responseFiltered(getResponseRows()),total=rows.length;
 body.innerHTML=rows.map((x,i)=>`<tr data-delivery-id="${esc(x.delivery_id)}"><td>${faNum(total-i)}</td><td>${esc(x.recipient_name||x.recipient_email||'—')}</td><td>${channel(x.channel)}</td><td>${esc(x.subject||'—')}</td><td>${x.sent_at&&typeof jalaliDateTime==='function'?jalaliDateTime(x.sent_at):'—'}</td><td>${responseLabel(x.response_status)}</td><td>${esc(x.reply_text||'—')}</td><td>${channel(x.reply_channel)}</td><td>${x.replied_at&&typeof jalaliDateTime==='function'?jalaliDateTime(x.replied_at):'—'}</td><td>${faNum(x.reminder_count||0)}</td><td><button type="button" class="ghost response-delete" data-response-delete="${esc(x.delivery_id)}">حذف</button></td></tr>`).join('')||'<tr><td colspan="11" class="empty">رکوردی مطابق فیلترها وجود ندارد.</td></tr>';
}
async function reloadResponseRows(){responseRowsCache=await selectAll('message_response_tracking','select=*&order=delivery_id.desc');window.__bamcoResponseRows=responseRowsCache;renderResponseTable()}
function enhanceResponseShell(){
 const view=q('#responseReportView'),table=q('table',view);if(!view||!table)return;
 const head=table.tHead?.rows?.[0];if(head&&![...head.cells].some(c=>c.textContent.trim()==='عملیات')){const th=document.createElement('th');th.textContent='عملیات';head.append(th)}
 const tools=q('.workspace-report-tools',view);if(tools&&!q('.response-primary-actions',tools)){
  const search=q('[data-response-search]',tools),exportBtn=q('[data-report-export]',tools),date=q('.report-date-controls',tools);
  const actions=document.createElement('div');actions.className='response-primary-actions';
  const refresh=q('[data-response-refresh]',view);if(refresh)actions.append(refresh);
  if(exportBtn){exportBtn.textContent='خروجی اکسل';actions.append(exportBtn)}
  if(date&&date.parentElement===tools)tools.removeChild(date);
  tools.innerHTML='';if(date)tools.append(date);tools.append(actions);if(search)tools.append(search);
 }
 q('[data-response-clear-dates]',view)?.classList.add('danger-soft');
 reloadResponseRows().catch(()=>{});
}
async function softDeleteResponse(deliveryId){
 if(!deliveryId)return;
 if(!confirm('این رکورد از گزارش پاسخ‌ها حذف شود؟'))return;
 await update('message_deliveries',`id=eq.${encodeURIComponent(deliveryId)}`,{status:'cancelled'});
 responseRowsCache=getResponseRows().filter(x=>String(x.delivery_id)!==String(deliveryId));window.__bamcoResponseRows=responseRowsCache;renderResponseTable();toast('رکورد حذف شد و شناسه‌های نمایشی به‌روزرسانی شدند.');
}
function hookResponse(){
 document.addEventListener('click',e=>{const del=e.target.closest('#responseReportView [data-response-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();del.disabled=true;softDeleteResponse(del.dataset.responseDelete).catch(err=>{del.disabled=false;toast(err.message,true)});return}if(e.target.closest('#nav [data-view="responseReport"]'))setTimeout(enhanceResponseShell,220)},true);
 document.addEventListener('input',e=>{if(e.target.matches('#responseReportView [data-response-search]'))setTimeout(renderResponseTable,0)});
 document.addEventListener('click',e=>{if(e.target.closest('#responseReportView [data-response-clear-dates],#responseReportView #setDateBtn,#responseReportView #clearDateBtn'))setTimeout(renderResponseTable,30)},true);
 const view=q('#responseReportView');if(view)new MutationObserver(()=>{if(q('table',view))setTimeout(enhanceResponseShell,30)}).observe(view,{childList:true});
 if(state?.view==='responseReport')setTimeout(enhanceResponseShell,250);
}
function boot(){installCss();hookDashboard();removePerformanceDefinition();hookResponse();const perf=q('#performanceReportView');if(perf)new MutationObserver(removePerformanceDefinition).observe(perf,{childList:true,subtree:true});setTimeout(()=>{paintDashboardCards();if(state?.view==='dashboard')drawWorkload()},350)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
