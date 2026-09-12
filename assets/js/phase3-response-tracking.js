(()=>{
'use strict';
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const labels={replied:'پاسخ داده',awaiting:'بدون پاسخ',failed:'خطای ارسال',reminder_needed:'نیازمند یادآوری'};
const channels={portal:'داخل سامانه',email:'ایمیل',both:'هر دو'};
let rows=[],selected=new Set(),sending=false,loading=false,dateTarget=null;

function currentMonthRange(){
  try{
    const p=currentJalali(),from=jalaliToISO(p.y,p.m,1),next=p.m===12?jalaliToISO(p.y+1,1,1):jalaliToISO(p.y,p.m+1,1);
    if(!from||!next)return{from:'',to:'',fromText:'',toText:''};
    const end=new Date(next+'T00:00:00Z');end.setUTCDate(end.getUTCDate()-1);
    const to=end.toISOString().slice(0,10);
    return{from,to,fromText:jalaliText(from),toText:jalaliText(to)};
  }catch{return{from:'',to:'',fromText:'',toText:''}}
}
function iso(value,end=false){
  const v=String(value||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)),p=v.match(/\d+/g)?.map(Number);
  if(!p||p.length!==3||p.some(Number.isNaN))return'';
  try{const out=jalaliToISO(p[0],p[1],p[2]);return out?out+(end?'T23:59:59':'T00:00:00'):''}catch{return''}
}
function filtered(){
  const from=iso(q('#responseFrom')?.value),to=iso(q('#responseTo')?.value,true),person=q('#responsePerson')?.value||'',channel=q('#responseChannel')?.value||'',status=q('#responseState')?.value||'';
  return rows.filter(x=>x.delivery_status!=='cancelled'&&(!from||String(x.sent_at||'')>=from)&&(!to||String(x.sent_at||'')<=to)&&(!person||String(x.recipient_id)===String(person))&&(!channel||x.channel===channel)&&(!status||x.response_status===status));
}
function ensureStyles(){
  if(q('#bamcoResponseTrackingRootCss'))return;
  const s=document.createElement('style');s.id='bamcoResponseTrackingRootCss';s.textContent=`
    #responseTrackingView .response-command-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 0;border-top:1px solid #d9e4de;border-bottom:1px solid #d9e4de;margin:0 0 12px}
    #responseTrackingView .response-command-row>*{flex:0 0 auto}
    #responseTrackingView .response-command-row button{font-weight:400!important}
    #responseTrackingView .response-date-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    #responseTrackingView .response-date-controls label{display:flex;align-items:center;gap:5px;margin:0;white-space:nowrap}
    #responseTrackingView .response-date-field{display:grid;grid-template-columns:minmax(126px,154px) 36px;gap:4px;align-items:center}
    #responseTrackingView .response-date-field input{height:38px;text-align:center}
    #responseTrackingView .response-date-field button{height:38px;width:36px;padding:0}
    #responseTrackingView [data-response-home]{order:1}
    #responseTrackingView .response-date-controls{order:2}
    #responseTrackingView [data-response-refresh]{order:3}
    #responseTrackingView [data-response-export]{order:4}
    #responseTrackingView #sendResponseReminder{order:5}
    #responseTrackingView .response-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
    #responseTrackingView .response-quick{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
    #responseTrackingView table{border-collapse:collapse;width:100%}
    #responseTrackingView table th,#responseTrackingView table td{border:1px solid #cbd9d3}
    #responseTrackingView tbody tr[data-delivery]{cursor:pointer}
    #responseTrackingView tbody tr.suite-selected>td{background:#e9f4ef!important}
    @media(max-width:760px){#responseTrackingView .response-date-controls{width:100%}.response-command-row{align-items:stretch!important}}
  `;document.head.append(s);
}
function install(){
  if(q('#responseTrackingView'))return;
  const workspace=q('.workspace'),anchor=q('#nav button[data-view="templates"]');if(!workspace)return;
  ensureStyles();
  const btn=document.createElement('button');btn.dataset.view='responseTracking';btn.className='manager-only';btn.innerHTML='<b>↩</b><span>پیگیری پاسخ</span>';(anchor?.parentElement||q('#nav'))?.insertBefore(btn,anchor||null);
  const range=currentMonthRange();
  workspace.insertAdjacentHTML('beforeend',`<section id="responseTrackingView" class="view hidden manager-only"><div class="panel table-panel response-tracking"><div class="panel-head"><div><h3>پیگیری پاسخ‌ها</h3><small>پاسخ هر فرد در کنار همان پیام ارسالی نمایش داده می‌شود.</small></div></div><div class="response-command-row"><button type="button" class="ghost" data-response-home>بازگشت به خانه</button><div class="response-date-controls"><label><span>از تاریخ</span><span class="response-date-field"><input id="responseFrom" class="jalali-input" readonly value="${esc(range.fromText)}"><button type="button" class="ghost" data-response-tracking-date="from" aria-label="انتخاب تاریخ شروع">▦</button></span></label><label><span>تا تاریخ</span><span class="response-date-field"><input id="responseTo" class="jalali-input" readonly value="${esc(range.toText)}"><button type="button" class="ghost" data-response-tracking-date="to" aria-label="انتخاب تاریخ پایان">▦</button></span></label></div><button type="button" class="ghost" data-response-refresh>تازه‌سازی</button><button type="button" class="ghost" data-response-export>خروجی اکسل</button><button id="sendResponseReminder" type="button" class="primary">ارسال یادآوری</button></div><div class="response-filters"><select id="reminderSendChannel" aria-label="کانال یادآوری"><option value="portal">داخل سامانه</option><option value="email">ایمیل</option><option value="both">هر دو</option></select><select id="responsePerson"><option value="">همه افراد</option></select><select id="responseChannel"><option value="">همه کانال‌ها</option><option value="portal">داخل سامانه</option><option value="email">ایمیل</option></select><select id="responseState"><option value="">همه وضعیت‌ها</option><option value="replied">پاسخ داده</option><option value="awaiting">بدون پاسخ</option><option value="failed">خطای ارسال</option><option value="reminder_needed">نیازمند یادآوری</option></select></div><div class="table-wrap"><table class="workspace-table"><thead><tr><th>شناسه</th><th>فرد</th><th>تاریخ ارسال</th><th>کانال</th><th>موضوع</th><th>پاسخ</th><th>تاریخ پاسخ</th><th>تعداد یادآوری</th></tr></thead><tbody id="responseTrackingBody"></tbody></table></div></div></section>`);
  btn.onclick=()=>{if(typeof showView==='function')showView('responseTracking');setTimeout(()=>void load(),0)};
  qa('#responseFrom,#responseTo,#responsePerson,#responseChannel,#responseState').forEach(x=>x.addEventListener(x.tagName==='SELECT'?'change':'input',()=>{selected.clear();render()}));
  q('#sendResponseReminder').onclick=sendReminder;
  q('[data-response-home]').onclick=()=>window.bamcoShowHome?.();
  q('[data-response-refresh]').onclick=()=>void load(true);
  q('[data-response-export]').onclick=exportVisible;
  q('#responseTrackingBody').onclick=e=>{if(e.target.closest('button,input,select'))return;const tr=e.target.closest('[data-delivery]');if(!tr)return;selected.has(tr.dataset.delivery)?selected.delete(tr.dataset.delivery):selected.add(tr.dataset.delivery);render()};
  qa('[data-response-tracking-date]').forEach(b=>b.onclick=e=>{e.preventDefault();openDate(b.dataset.responseTrackingDate)});
}
function render(){
  const list=filtered(),body=q('#responseTrackingBody');if(!body)return;
  const valid=new Set(list.map(x=>String(x.delivery_id)));selected=new Set([...selected].filter(id=>valid.has(id)));
  body.innerHTML=list.map(x=>`<tr data-delivery="${esc(x.delivery_id)}" class="${selected.has(String(x.delivery_id))?'suite-selected':''}" aria-selected="${selected.has(String(x.delivery_id))}"><td>${digits(x.delivery_id)}</td><td>${esc(x.recipient_name||x.recipient_email||'—')}</td><td>${esc(x.sent_at?jalaliDateTime(x.sent_at):'—')}</td><td>${esc(channels[x.channel]||x.channel||'—')}</td><td>${esc(x.subject||'—')}</td><td class="response-${esc(x.response_status||'')}">${esc(labels[x.response_status]||x.response_status||'—')}</td><td>${esc(x.replied_at?jalaliDateTime(x.replied_at):'—')}</td><td>${digits(x.reminder_count||0)}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">ارسالی مطابق فیلترها وجود ندارد.</td></tr>';
  const send=q('#sendResponseReminder');if(send)send.disabled=sending||![...selected].some(id=>{const r=rows.find(x=>String(x.delivery_id)===id);return r&&r.response_status!=='replied'});
}
async function load(force=false){
  if(!isManager()||loading&&!force)return;loading=true;const refresh=q('[data-response-refresh]');if(refresh)refresh.disabled=true;
  try{
    rows=await selectAll('message_response_tracking','select=*&order=sent_at.desc');
    const people=[...new Map(rows.filter(x=>x.recipient_id).map(x=>[String(x.recipient_id),x])).values()];
    const select=q('#responsePerson'),current=select?.value||'';if(select){select.innerHTML='<option value="">همه افراد</option>'+people.map(x=>`<option value="${esc(x.recipient_id)}">${esc(x.recipient_name||x.recipient_email||'—')}</option>`).join('');select.value=current}
    render();
  }catch(err){toast(err.message,true)}finally{loading=false;if(refresh)refresh.disabled=false}
}
async function exportVisible(){
  const button=q('[data-response-export]');if(button)button.disabled=true;
  try{
    const table=q('#responseTrackingView table');if(!table)return;
    if(typeof window.bamcoExportTable==='function'){await window.bamcoExportTable(table);return}
    const X=await window.ensureBamcoXLSX(),data=[...table.rows].map(r=>[...r.cells].map(c=>c.textContent.trim())),ws=X.utils.aoa_to_sheet(data),wb=X.utils.book_new();ws['!views']=[{rightToLeft:true}];ws['!autofilter']={ref:X.utils.encode_range({s:{r:0,c:0},e:{r:data.length-1,c:data[0].length-1}})};X.utils.book_append_sheet(wb,ws,'پیگیری پاسخ');wb.Workbook={Views:[{RTL:true}]};X.writeFile(wb,'پیگیری پاسخ.xlsx',{compression:true});
  }catch(err){toast(err.message,true)}finally{if(button)button.disabled=false}
}
async function sendReminder(){
  if(sending)return;const ids=[...selected].map(Number),items=rows.filter(x=>ids.includes(Number(x.delivery_id))&&x.response_status!=='replied'&&x.delivery_status!=='cancelled');
  if(!items.length)return toast('حداقل یک ارسال بدون پاسخ را انتخاب کنید.',true);
  const recipients=[...new Set(items.map(x=>x.recipient_id).filter(Boolean))],channel=q('#reminderSendChannel').value,channelMap=Object.fromEntries(recipients.map(id=>[id,channel]));
  sending=true;render();
  try{
    const bid=await rpc('prepare_workflow_messages',{p_recipient_ids:recipients,p_channels:channelMap,p_subject:'یادآوری پاسخ به پیام',p_template_text:null,p_kind:'reminder',p_report_date:new Intl.DateTimeFormat('fa-IR',{dateStyle:'full',timeZone:'Asia/Tehran'}).format(new Date())});
    await rpc('queue_message_batch',{p_batch_id:bid});
    if(['email','both'].includes(channel)){
      const response=await fetch(`${SB_URL}/functions/v1/send-message-queue`,{method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`,'Content-Type':'application/json'},body:JSON.stringify({batch_id:bid})}),result=await response.json().catch(()=>({}));
      if(!response.ok||result.failed||result.pending||result.errors?.length)throw new Error(result.error||result.errors?.map(x=>x.message).join('؛ ')||'ارسال ایمیل یادآوری ناموفق بود.');
    }
    await rpc('mark_message_reminders',{p_delivery_ids:items.map(x=>Number(x.delivery_id))});selected.clear();toast(`یادآوری برای ${digits(recipients.length)} نفر ثبت شد.`);await load(true);
  }catch(err){toast(err.message,true)}finally{sending=false;render()}
}
function openDate(kind){
  const input=q(kind==='from'?'#responseFrom':'#responseTo'),dialog=q('#calendarDialog');if(!input||!dialog)return;
  dateTarget={kind,input};const now=currentJalali(),raw=String(input.value||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)),m=raw.match(/\d+/g)?.map(Number),p=m?.length===3?{y:m[0],m:m[1],d:m[2]}:now;
  q('#calendarLabel').textContent=kind==='from'?'انتخاب تاریخ شروع':'انتخاب تاریخ پایان';q('#calYear').innerHTML=Array.from({length:16},(_,i)=>now.y-5+i).map(y=>`<option value="${y}">${digits(y)}</option>`).join('');q('#calMonth').innerHTML=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');q('#calYear').value=String(p.y);q('#calMonth').value=String(p.m);fillCalendarDays();q('#calDay').value=String(p.d);dialog.showModal();
}
function commitDate(clear=false){
  if(!dateTarget)return false;const input=dateTarget.input;input.value=clear?'':digits(`${q('#calYear').value}/${String(q('#calMonth').value).padStart(2,'0')}/${String(q('#calDay').value).padStart(2,'0')}`);dateTarget=null;q('#calendarDialog')?.close();selected.clear();render();return true;
}
document.addEventListener('click',e=>{if(!dateTarget)return;if(e.target.closest?.('#setDateBtn')){e.preventDefault();e.stopImmediatePropagation();commitDate(false)}else if(e.target.closest?.('#clearDateBtn')){e.preventDefault();e.stopImmediatePropagation();commitDate(true)}},true);
window.bamcoTableData=window.bamcoTableData||{};window.bamcoTableData.responseTrackingView=()=>filtered().map(x=>({id:String(x.delivery_id),values:[x.delivery_id,x.recipient_name||x.recipient_email,x.sent_at?jalaliDateTime(x.sent_at):'—',channels[x.channel]||x.channel,x.subject,labels[x.response_status]||x.response_status,x.replied_at?jalaliDateTime(x.replied_at):'—',x.reminder_count||0]}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();setTimeout(install,600);
})();
