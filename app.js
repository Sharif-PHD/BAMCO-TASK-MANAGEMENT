const SB_URL='https://zhhongjhhbvpmoquvkhl.supabase.co';
const SB_KEY='sb_publishable_OtVZC49dnnQarqPv3XLgDw_EUKC7FtD';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fa=n=>String(n??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const en=n=>String(n??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const norm=s=>String(s??'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim();
const state={token:'',user:null,profile:null,profiles:[],tasks:[],requests:[],requestHistory:[],view:'dashboard',editing:null,reviewing:null,reviewEdit:null,resubmitting:null,dateInput:null,selected:{kanban:null,archive:null}};

function apiErrorMessage(data,status){
  const code=data?.code||data?.error_code;
  const raw=[code,data?.msg,data?.message,data?.error_description,data?.error].filter(Boolean).join(' ').toLowerCase();
  if(code==='invalid_credentials'||raw.includes('invalid login credentials')||raw.includes('invalid credentials'))return 'نام کاربری یا رمز اشتباه است.';
  const messages={
    invalid_credentials:'نام کاربری یا رمز اشتباه است.',
    email_not_confirmed:'ایمیل این حساب هنوز تأیید نشده است.',
    user_banned:'دسترسی این حساب مسدود شده است؛ با مدیر سامانه تماس بگیرید.',
    over_request_rate_limit:'تعداد تلاش‌ها بیش از حد مجاز است؛ چند دقیقه دیگر دوباره امتحان کنید.',
    over_email_send_rate_limit:'تعداد درخواست‌های ایمیل بیش از حد مجاز است؛ کمی بعد دوباره امتحان کنید.'
  };
  if(messages[code])return messages[code];
  return data?.msg||data?.message||data?.error_description||data?.error||
    (status>=500?'سرویس پایگاه داده موقتاً در دسترس نیست.':'درخواست به پایگاه داده انجام نشد.');
}

async function api(path,{method='GET',body,auth=true,prefer}={}){
  const headers={apikey:SB_KEY,'Content-Type':'application/json',Accept:'application/json'};
  if(auth&&state.token) headers.Authorization=`Bearer ${state.token}`;
  if(prefer) headers.Prefer=prefer;
  const res=await fetch(SB_URL+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await res.text(); let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok) throw new Error(apiErrorMessage(data,res.status));
  return data;
}
const select=(table,q='select=*')=>api(`/rest/v1/${table}?${q}`);
async function selectAll(table,q='select=*',pageSize=1000){
  const rows=[];
  for(let from=0;;from+=pageSize){
    const page=await api(`/rest/v1/${table}?${q}&offset=${from}&limit=${pageSize}`);
    rows.push(...page);
    if(page.length<pageSize)return rows;
  }
}
const insert=(table,body)=>api(`/rest/v1/${table}`,{method:'POST',body,prefer:'return=representation'});
const update=(table,filter,body)=>api(`/rest/v1/${table}?${filter}`,{method:'PATCH',body,prefer:'return=representation'});
const rpc=(name,body)=>api(`/rest/v1/rpc/${name}`,{method:'POST',body});
const isManager=()=>state.profile?.role==='manager';
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.style.background=error?'#9b1c1c':'#123f33';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}
function safe(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function displayId(t){return t.legacy_id||t.id}
function ownerName(t){const p=state.profiles.find(x=>x.id===t.owner_id);return p?.full_name||p?.excel_name||t.legacy_owner_name||'—'}
function languageClass(value){return /[\u0600-\u06ff]/.test(String(value??''))?'fa-text':'en-text'}
function cell(value,formatted=value){return `<td class="${languageClass(value)}">${safe(formatted??'')}</td>`}
const tableFilters={kanban:{},archive:{}};

function persianParts(date){
  if(!date)return null;
  const d=typeof date==='string'?new Date(`${date}T12:00:00`):date;
  if(Number.isNaN(d.getTime()))return null;
  const parts=new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(d);
  const get=t=>Number(parts.find(p=>p.type===t)?.value);
  return {y:get('year'),m:get('month'),d:get('day')};
}
function jalaliText(iso){const p=persianParts(iso);return p?fa(`${p.y}/${String(p.m).padStart(2,'0')}/${String(p.d).padStart(2,'0')}`):'—'}
function jalaliDateTime(value){if(!value)return'—';const d=new Date(value);if(Number.isNaN(d.getTime()))return'—';const date=jalaliText(d);const time=new Intl.DateTimeFormat('fa-IR',{hour:'2-digit',minute:'2-digit'}).format(d);return `${date}، ${time}`}
function jalaliToISO(y,m,d){
  y=Number(en(y));m=Number(en(m));d=Number(en(d));
  if(!y||m<1||m>12||d<1||d>31)return null;
  const approx=new Date(Date.UTC(y+621,2,18,12));
  for(let i=0;i<370;i++){
    const x=new Date(approx.getTime()+i*86400000),p=persianParts(x);
    if(p&&p.y===y&&p.m===m&&p.d===d)return x.toISOString().slice(0,10);
  }
  return null;
}
function daysInJalaliMonth(y,m){for(let d=31;d>=29;d--)if(jalaliToISO(y,m,d))return d;return 29}
function setJalaliField(jName,iso){const f=$('#taskForm');const j=f.elements[jName], hidden=f.elements[j?.dataset?.isoTarget];if(!j||!hidden)return;j.value=iso?jalaliText(iso):'';hidden.value=iso||''}
function currentJalali(){return persianParts(new Date())||{y:1405,m:1,d:1}}
function fillCalendarDays(){const y=Number($('#calYear').value),m=Number($('#calMonth').value),current=Number($('#calDay').value)||1,max=daysInJalaliMonth(y,m);$('#calDay').innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}">${fa(i+1)}</option>`).join('');$('#calDay').value=String(Math.min(current,max))}
function openCalendar(inputName){
  state.dateInput=inputName;const f=$('#taskForm'),j=f.elements[inputName],hidden=f.elements[j.dataset.isoTarget],p=hidden.value?persianParts(hidden.value):currentJalali();
  $('#calendarLabel').textContent=j.closest('label')?.childNodes?.[0]?.textContent?.trim()||'تاریخ';
  const now=currentJalali();$('#calYear').innerHTML=Array.from({length:16},(_,i)=>now.y-5+i).map(y=>`<option value="${y}">${fa(y)}</option>`).join('');
  $('#calMonth').innerHTML=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');
  $('#calYear').value=String(p.y);$('#calMonth').value=String(p.m);fillCalendarDays();$('#calDay').value=String(p.d);$('#calendarDialog').showModal();
}
$$('.calendar-btn,.jalali-input').forEach(el=>el.addEventListener('click',()=>openCalendar(el.dataset.dateInput||el.name)));
$('#calYear').addEventListener('change',fillCalendarDays);$('#calMonth').addEventListener('change',fillCalendarDays);
$('#setDateBtn').addEventListener('click',()=>{const iso=jalaliToISO($('#calYear').value,$('#calMonth').value,$('#calDay').value);if(!iso)return toast('تاریخ انتخاب‌شده معتبر نیست.',true);setJalaliField(state.dateInput,iso);$('#calendarDialog').close()});
$('#clearDateBtn').addEventListener('click',()=>{setJalaliField(state.dateInput,'');$('#calendarDialog').close()});

function showLogin(){
  sessionStorage.removeItem('bamco_session');
  Object.assign(state,{token:'',user:null,profile:null,profiles:[],tasks:[],requests:[],view:'dashboard',editing:null,reviewing:null,dateInput:null,selected:{kanban:null,archive:null}});
  $('#appView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
}

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginError').textContent='';const submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;
  try{const data=await api('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email:$('#email').value.trim(),password:$('#password').value}});state.token=data.access_token;state.user=data.user;await enterApp()}
  catch(err){showLogin();$('#loginError').textContent=err.message}
  finally{submit.disabled=false}
});
async function enterApp(){
  const profiles=await select('profiles',`id=eq.${state.user.id}&select=*`);if(!profiles.length)throw new Error('پروفایل کاربر پیدا نشد.');state.profile=profiles[0];
  $('#userName').textContent=state.profile.display_name||state.profile.full_name||state.profile.email;$('#userRole').textContent=isManager()?'مدیر سامانه':'متولی';$('#avatar').textContent=(state.profile.display_name||state.profile.full_name||'ب').trim()[0];window.refreshProfileAvatar?.();
  $('#approvalsNav').classList.remove('hidden');$$('.manager-only').forEach(x=>x.classList.toggle('hidden',!isManager()));
  $('#viewSubtitle').textContent=isManager()?'نمای کلی وظایف و عملکرد همه متولیان':'فقط وظایف و عملکرد مربوط به شما';
  $('#kanbanScope').textContent=isManager()?'نمای همه متولیان':'فقط وظایف شما';$('#archiveScope').textContent=isManager()?'نمای همه متولیان':'فقط آرشیو شما';
  await refresh();
  if(window.matchMedia('(max-width:760px)').matches)$('#sidebar').classList.add('collapsed');
  $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
  if(state.profile.must_change_password){$('#cancelPasswordBtn').classList.add('hidden');$('#passwordDialog').showModal()}else showView('kanban');
}
async function refresh(){
  try{
    state.profiles=isManager()?await select('profiles','select=id,email,full_name,excel_name,role,active&active=eq.true&order=full_name'):[state.profile];
    state.tasks=await selectAll('task_status_view','select=*&order=id.desc');
    state.requests=await select('change_requests',isManager()?'select=*&request_status=eq.pending&order=created_at.asc':'select=*&request_status=in.(pending,needs_revision)&order=created_at.asc');
    state.requestHistory=await select('change_requests','select=*&request_status=in.(approved,rejected)&order=created_at.desc');
    renderAll();
  }catch(err){toast(err.message,true);throw err}
}
function renderAll(){window.renderDashboard?.();renderTasks(false);renderTasks(true);renderRequests();renderRequestHistory()}
function renderTasks(archived){
  const query=(archived?$('#archiveSearch'):$('#kanbanSearch')).value.trim().toLowerCase();
  const scope=archived?'archive':'kanban',allRows=state.tasks.filter(t=>!!t.archived===archived),filters=tableFilters[scope];
  updateColumnFilters(scope,allRows,archived);
  const rows=allRows.filter(t=>!query||[t.title,t.description,ownerName(t),t.status,t.priority,displayId(t)].some(v=>String(v??'').toLowerCase().includes(query))).filter(t=>taskColumnValues(t,archived).every((v,i)=>!filters[i]||String(v??'')===filters[i]));
  const body=archived?$('#archiveBody'):$('#kanbanBody');if(!rows.some(t=>String(t.id)===String(state.selected[scope])))state.selected[scope]=null;if(!rows.length){body.innerHTML=`<tr><td colspan="${archived?16:14}" class="empty">موردی برای نمایش وجود ندارد.</td></tr>`;updateTaskToolbar(scope);return}
  body.innerHTML=rows.map(t=>{const due=norm(t.due_state),status=norm(t.status),rowClass=status==='منتظر پاسخ'?'row-waiting':due==='دیرکرد'?'row-overdue':due.includes('هشدار')?'row-warning':'row-normal';
    const dueText=status==='منتظر پاسخ'?'فاقد شرایط دیرکرد':due==='دیرکرد'?'دیرکرد':due.includes('هشدار')?'دوره هشدار':'فاقد شرایط دیرکرد';
    const common=`${cell(displayId(t),fa(displayId(t)))}${cell(t.title)}${cell(t.description||'')}${cell(ownerName(t))}${cell(t.status)}${cell(t.priority)}${cell(jalaliText(t.start_date))}${cell(jalaliText(t.done_date))}${cell(jalaliText(status==='منتظر پاسخ'?null:t.due_date))}${cell(fa(status==='منتظر پاسخ'?0:t.reminder_days))}${cell(jalaliDateTime(t.last_updated_at))}${cell(dueText)}${cell(t.manager_notes||'')}`;
    const selected=String(state.selected[scope])===String(t.id),pick=`<td class="fa-text"><input class="task-pick" type="radio" name="${scope}Task" value="${t.id}" ${selected?'checked':''} aria-label="انتخاب وظیفه ${safe(displayId(t))}"></td>`;
    if(archived)return `<tr class="${rowClass} ${selected?'task-selected':''}" data-task-id="${t.id}" data-scope="archive">${common}${cell(fa(t.delay_days||0))}${cell(fa(t.advance_days||0))}${pick}</tr>`;
    return `<tr class="${rowClass} ${selected?'task-selected':''}" data-task-id="${t.id}" data-scope="kanban">${common}${pick}</tr>`}).join('');
  updateTaskToolbar(scope);
}
function taskColumnValues(t,archived){const waiting=norm(t.status)==='منتظر پاسخ',due=norm(t.due_state),dueText=waiting?'فاقد شرایط دیرکرد':due==='دیرکرد'?'دیرکرد':due.includes('هشدار')?'دوره هشدار':'فاقد شرایط دیرکرد',base=[displayId(t),t.title,t.description||'',ownerName(t),t.status,t.priority,jalaliText(t.start_date),jalaliText(t.done_date),jalaliText(waiting?null:t.due_date),fa(waiting?0:t.reminder_days),jalaliDateTime(t.last_updated_at),dueText,t.manager_notes||''];return archived?[...base,fa(t.delay_days||0),fa(t.advance_days||0),'']: [...base,'']}
function updateColumnFilters(scope,rows,archived){const tr=$(`#${scope}View .column-filters`);if(!tr)return;const filters=tableFilters[scope],count=archived?15:13;while(tr.children.length>count)tr.lastElementChild.remove();while(tr.children.length<count)tr.insertAdjacentHTML('beforeend','<th><select><option value="">همه</option></select></th>');[...tr.children].forEach((th,i)=>{const selectEl=th.querySelector('select'),current=filters[i]||'',values=[...new Set(rows.map(t=>String(taskColumnValues(t,archived)[i]??'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa'));selectEl.innerHTML='<option value="">همه</option>'+values.map(v=>`<option value="${safe(v)}" ${v===current?'selected':''}>${safe(v)}</option>`).join('');selectEl.className=languageClass(current)})}
$$('.column-filters').forEach(tr=>tr.addEventListener('change',e=>{if(e.target.tagName!=='SELECT')return;const scope=tr.closest('.view').id.startsWith('archive')?'archive':'kanban';tableFilters[scope][e.target.closest('th').cellIndex]=e.target.value;renderTasks(scope==='archive')}));
function selectedTask(scope){return state.tasks.find(t=>String(t.id)===String(state.selected[scope]))}
function updateTaskToolbar(scope){const picked=!!selectedTask(scope);for(const suffix of ['EditBtn','DeleteBtn'])$(`#${scope}${suffix}`)?.toggleAttribute('disabled',!picked);if(scope==='kanban')$('#kanbanArchiveBtn')?.toggleAttribute('disabled',!picked);else $('#archiveRestoreBtn')?.toggleAttribute('disabled',!picked)}
function chooseTask(scope,id){state.selected[scope]=Number(id);renderTasks(scope==='archive')}
for(const body of [$('#kanbanBody'),$('#archiveBody')])body.addEventListener('click',e=>{const row=e.target.closest('tr[data-task-id]');if(row)chooseTask(row.dataset.scope,row.dataset.taskId)});
function renderRequests(){const names=Object.fromEntries(state.profiles.map(p=>[p.id,p.full_name||p.email]));const types={create:'تعریف فعالیت جدید',update:'تغییر فعالیت',complete:'تکمیل فعالیت'},statuses={pending:'در حال بررسی',needs_revision:'نیاز به اصلاح'};$('#approvalBadge').textContent=fa(state.requests.length);$('#approvalBadge').classList.toggle('hidden',!state.requests.length);
  $('#approvalBody').innerHTML=state.requests.length?state.requests.map(r=>`<tr><td>${fa(r.id)}</td><td>${safe(names[r.requested_by]||state.profile.full_name||'—')}</td><td>${types[r.request_type]||r.request_type}</td><td>${safe(r.proposed_data?.title||state.tasks.find(t=>String(t.id)===String(r.task_id))?.title||'—')}</td><td>${jalaliDateTime(r.created_at)}</td><td>${statuses[r.request_status]||r.request_status}</td><td>${isManager()?`<button class="primary" onclick="openReview('${r.id}')">بررسی</button>`:r.request_status==='needs_revision'?`<button class="primary" onclick="reviseRequest('${r.id}')">اصلاح و ارسال مجدد</button>`:'در انتظار مدیر'}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">درخواست بازی وجود ندارد.</td></tr>';
}
function renderRequestHistory(){const names=Object.fromEntries(state.profiles.map(p=>[p.id,p.full_name||p.email])),types={create:'تعریف فعالیت جدید',update:'تغییر فعالیت',complete:'تکمیل فعالیت'},statuses={approved:'تأیید',rejected:'رد'};$('#requestHistoryBody').innerHTML=state.requestHistory.length?state.requestHistory.map(r=>`<tr><td>${fa(r.id)}</td><td>${safe(names[r.requested_by]||state.profile.full_name||'—')}</td><td>${types[r.request_type]||r.request_type}</td><td>${safe(r.proposed_data?.title||state.tasks.find(t=>String(t.id)===String(r.task_id))?.title||'—')}</td><td>${jalaliDateTime(r.reviewed_at||r.created_at)}</td><td>${statuses[r.request_status]||r.request_status}</td><td>${safe(r.manager_note||'—')}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">سابقه‌ای وجود ندارد.</td></tr>'}
const titles={dashboard:'داشبورد',kanban:'کانبان وظایف',archive:'آرشیو وظایف',approvals:'تأیید درخواست‌ها',requestHistory:'سوابق درخواست‌ها'};
function showView(view){state.view=view;$$('.view').forEach(x=>x.classList.add('hidden'));$(`#${view}View`)?.classList.remove('hidden');$$('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===view));$('#viewTitle').textContent=titles[view]||'';$('#addTaskBtn').classList.toggle('hidden',view!=='kanban')}
$$('#nav button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
$('#kanbanSearch').addEventListener('input',()=>renderTasks(false));$('#archiveSearch').addEventListener('input',()=>renderTasks(true));$('#collapseBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('collapsed'));
$('#nav').addEventListener('click',e=>{if(window.matchMedia('(max-width:760px)').matches&&e.target.closest('button[data-view]'))$('#sidebar').classList.add('collapsed')});
document.addEventListener('pointerdown',e=>{if(!window.matchMedia('(max-width:760px)').matches)return;const sidebar=$('#sidebar');if(!sidebar.classList.contains('collapsed')&&!sidebar.contains(e.target))sidebar.classList.add('collapsed')});
$('#logoutBtn').addEventListener('click',()=>{showLogin();$('#loginForm').reset();$('#email').focus()});$$('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));

function fillOwners(selected){const sel=$('#taskForm [name=owner_id]');const source=isManager()?state.profiles:[state.profile];sel.innerHTML=source.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${safe(p.full_name||p.email)}</option>`).join('');sel.disabled=!isManager()}
function openTask(task=null){
  state.editing=task;
  const f=$('#taskForm');
  f.reset();
  fillOwners(task?.owner_id||state.profile.id);
  $('#taskDialogTitle').textContent=state.reviewEdit?'اصلاح درخواست مدیر':state.resubmitting?'اصلاح و ارسال مجدد':task?(isManager()?'ویرایش وظیفه':'درخواست تغییر وظیفه'):(isManager()?'افزودن وظیفه':'درخواست وظیفه جدید');
  $('#taskDialogHint').textContent=state.reviewEdit?'اصلاحات همراه با تأیید درخواست اعمال می‌شود.':state.resubmitting?'موارد خواسته‌شده را اصلاح و دوباره ارسال کنید.':isManager()?'تغییرات مدیر بلافاصله اعمال می‌شود.':'درخواست شما پس از تأیید مدیر اعمال می‌شود.';
  $('#saveTaskBtn').textContent=state.reviewEdit?'ثبت اصلاحات و تأیید':state.resubmitting?'ارسال مجدد':isManager()?(task?'ثبت تغییرات':'ثبت وظیفه'):'ارسال برای تأیید مدیر';
  if(task){
    for(const key of ['title','description','status','priority','reminder_days','manager_notes'])if(f.elements[key])f.elements[key].value=task[key]??'';
    setJalaliField('start_date_j',task.start_date);setJalaliField('due_date_j',task.due_date);setJalaliField('done_date_j',task.done_date);
  }else{
    setJalaliField('start_date_j','');setJalaliField('due_date_j','');setJalaliField('done_date_j','');
  }
  const status=f.elements.status;
  status.dataset.previousStatus=status.value;
  status.dataset.archiveConfirmed=task?.archived?'1':'';
  $('#taskDialog').showModal();
}
$('#addTaskBtn').addEventListener('click',()=>openTask());window.openEdit=id=>openTask(state.tasks.find(t=>String(t.id)===String(id)));
$('#taskForm [name="status"]').addEventListener('change',e=>{
  const selectEl=e.target,value=norm(selectEl.value);
  if(value==='منتظر پاسخ')setJalaliField('due_date_j','');
  if(value==='انجام شده'&&!state.editing?.archived){
    const ok=confirm('از انتقال این وظیفه به آرشیو مطمئن هستید؟');
    if(!ok){selectEl.value=selectEl.dataset.previousStatus||state.editing?.status||'در حال انجام';selectEl.dataset.archiveConfirmed='';return}
    selectEl.dataset.archiveConfirmed='1';
    const f=$('#taskForm');
    if(!f.elements.done_date.value)setJalaliField('done_date_j',new Date().toISOString().slice(0,10));
  }else if(value!=='انجام شده')selectEl.dataset.archiveConfirmed='';
  selectEl.dataset.previousStatus=selectEl.value;
});
$('#taskForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.currentTarget;
  const data=Object.fromEntries(new FormData(f));
  delete data.start_date_j;delete data.done_date_j;delete data.due_date_j;
  for(const k of ['start_date','done_date','due_date'])if(!data[k])data[k]=null;
  data.reminder_days=Number(data.reminder_days||0);
  if(!isManager())data.owner_id=state.profile.id;
  if(norm(data.status)==='منتظر پاسخ'){data.due_date=null;data.reminder_days=0}

  const completing=norm(data.status)==='انجام شده';
  if(completing&&!state.editing?.archived&&f.elements.status.dataset.archiveConfirmed!=='1'){
    if(!confirm('از انتقال این وظیفه به آرشیو مطمئن هستید؟'))return;
    f.elements.status.dataset.archiveConfirmed='1';
  }
  if(completing&&!data.done_date)data.done_date=new Date().toISOString().slice(0,10);

  try{
    if(state.reviewEdit){
      await rpc('review_change_request',{p_request_id:state.reviewEdit.id,p_decision:'approved',p_manager_note:state.reviewEdit.managerNote||null,p_final_data:data});
    }else if(state.resubmitting){
      await rpc('resubmit_change_request',{p_request_id:state.resubmitting.id,p_proposed_data:data});
    }else if(isManager()){
      if(completing){data.archived=true;data.archived_at=new Date().toISOString()}
      if(state.editing)await update('tasks',`id=eq.${state.editing.id}`,data);
      else await insert('tasks',{...data,created_by:state.profile.id});
    }else{
      if(completing&&state.editing){
        await insert('change_requests',{task_id:state.editing.id,request_type:'complete',proposed_data:{done_date:data.done_date},requested_by:state.profile.id});
      }else{
        await insert('change_requests',{task_id:state.editing?.id||null,request_type:state.editing?'update':'create',proposed_data:data,requested_by:state.profile.id});
      }
    }
    $('#taskDialog').close();
    toast(state.reviewEdit?'درخواست با اصلاحات مدیر تأیید شد.':state.resubmitting?'درخواست اصلاح‌شده دوباره ارسال شد.':isManager()?(completing?'وظیفه انجام شد و به آرشیو منتقل شد.':'تغییرات ثبت شد.'):(completing?'درخواست تکمیل برای مدیر ارسال شد.':'درخواست برای تأیید مدیر ارسال شد.'));
    state.reviewEdit=null;state.resubmitting=null;
    await refresh();
  }catch(err){toast(err.message,true)}
});
window.archiveTask=async id=>{const task=state.tasks.find(t=>String(t.id)===String(id));if(!confirm(isManager()?`وظیفه «${task.title}» تکمیل و آرشیو شود؟`:`درخواست تکمیل وظیفه «${task.title}» برای مدیر ارسال شود؟`))return;try{if(isManager())await update('tasks',`id=eq.${id}`,{archived:true,archived_at:new Date().toISOString(),status:'انجام شده',done_date:task.done_date||new Date().toISOString().slice(0,10)});else await insert('change_requests',{task_id:Number(id),request_type:'complete',proposed_data:{done_date:new Date().toISOString().slice(0,10)},requested_by:state.profile.id});toast(isManager()?'وظیفه تکمیل و آرشیو شد.':'درخواست تکمیل برای مدیر ارسال شد.');await refresh()}catch(err){toast(err.message,true)}};
window.deleteTask=async id=>{if(!isManager())return;const task=state.tasks.find(t=>String(t.id)===String(id));if(!task||!confirm(`وظیفه «${task.title}» برای همیشه حذف شود؟`))return;try{await rpc('delete_task_and_resequence',{p_task_id:Number(id)});toast('وظیفه حذف و شناسه‌های نمایشی بازشماری شد.');await refresh()}catch(err){toast(err.message,true)}};
async function restoreTask(id){if(!isManager())return;const task=state.tasks.find(t=>String(t.id)===String(id));if(!task||!confirm(`وظیفه «${task.title}» به کانبان بازگردانده شود؟`))return;try{await update('tasks',`id=eq.${id}`,{archived:false,archived_at:null,status:'در حال انجام',done_date:null});state.selected.archive=null;toast('وظیفه به کانبان بازگردانده شد.');await refresh()}catch(err){toast(err.message,true)}}
$('#kanbanEditBtn').addEventListener('click',()=>{const t=selectedTask('kanban');if(t)openTask(t)});$('#archiveEditBtn').addEventListener('click',()=>{const t=selectedTask('archive');if(t)openTask(t)});
$('#kanbanArchiveBtn').addEventListener('click',()=>{const t=selectedTask('kanban');if(t)archiveTask(t.id)});$('#archiveRestoreBtn').addEventListener('click',()=>{const t=selectedTask('archive');if(t)restoreTask(t.id)});
$('#kanbanDeleteBtn').addEventListener('click',()=>{const t=selectedTask('kanban');if(t)deleteTask(t.id)});$('#archiveDeleteBtn').addEventListener('click',()=>{const t=selectedTask('archive');if(t)deleteTask(t.id)});
window.openReview=id=>{state.reviewing=state.requests.find(r=>String(r.id)===String(id));const r=state.reviewing,types={create:'تعریف فعالیت جدید',update:'تغییر فعالیت',complete:'تکمیل فعالیت'};const task=state.tasks.find(t=>String(t.id)===String(r.task_id));$('#reviewDetails').innerHTML=`<p><b>نوع درخواست:</b> ${types[r.request_type]}</p><p><b>عنوان:</b> ${safe(r.proposed_data?.title||task?.title||'—')}</p><p><b>متولی:</b> ${safe(state.profiles.find(p=>p.id===r.proposed_data?.owner_id)?.full_name||ownerName(task||{}))}</p><p><b>وضعیت پیشنهادی:</b> ${safe(r.proposed_data?.status||'—')}</p><p><b>اولویت پیشنهادی:</b> ${safe(r.proposed_data?.priority||'—')}</p><p><b>تاریخ شروع:</b> ${jalaliText(r.proposed_data?.start_date)}</p><p><b>تاریخ پایان:</b> ${jalaliText(r.proposed_data?.due_date)}</p><p><b>تاریخ انجام:</b> ${jalaliText(r.proposed_data?.done_date)}</p>`;$('#managerNote').value='';$('#reviewDialog').showModal()};
async function review(decision){try{await rpc('review_change_request',{p_request_id:state.reviewing.id,p_decision:decision,p_manager_note:$('#managerNote').value.trim()||null});$('#reviewDialog').close();toast(decision==='approved'?'درخواست تأیید و اعمال شد.':decision==='needs_revision'?'درخواست برای اصلاح به متولی برگشت.':'درخواست رد شد.');await refresh()}catch(err){toast(err.message,true)}}
window.reviseRequest=id=>{const r=state.requests.find(x=>String(x.id)===String(id));if(!r)return;state.resubmitting=r;const task=state.tasks.find(t=>String(t.id)===String(r.task_id))||{};openTask({...task,...r.proposed_data,owner_id:state.profile.id})};
$('#approveBtn').addEventListener('click',()=>review('approved'));$('#rejectBtn').addEventListener('click',()=>review('rejected'));$('#revisionBtn').addEventListener('click',()=>review('needs_revision'));$('#editRequestBtn').addEventListener('click',()=>{const r=state.reviewing,task=state.tasks.find(t=>String(t.id)===String(r.task_id))||{};state.reviewEdit={...r,managerNote:$('#managerNote').value.trim()};$('#reviewDialog').close();openTask({...task,...r.proposed_data,owner_id:r.proposed_data?.owner_id||task.owner_id||r.requested_by})});

$('#passwordForm').addEventListener('submit',async e=>{e.preventDefault();const p=$('#newPassword').value,c=$('#confirmPassword').value,wasRequired=!!state.profile.must_change_password;$('#passwordError').textContent='';if(p!==c){$('#passwordError').textContent='تکرار رمز عبور یکسان نیست.';return}const profileUpdate={must_change_password:false,updated_at:new Date().toISOString()};try{await update('profiles',`id=eq.${state.profile.id}`,profileUpdate);await api('/auth/v1/user',{method:'PUT',body:{password:p}});state.profile.must_change_password=false;e.currentTarget.reset();$('#passwordDialog').close();toast('رمز عبور با موفقیت تغییر کرد.');if(wasRequired)showView('kanban')}catch(err){if(wasRequired)try{await update('profiles',`id=eq.${state.profile.id}`,{must_change_password:true,updated_at:new Date().toISOString()})}catch{}const message=err.message==='New password should be different from the old password.'?'رمز جدید باید با رمز قبلی متفاوت باشد.':err.message;$('#passwordError').textContent=message}});

// ورود همیشه باید با تأیید رمز انجام شود؛ نشست قبلی عمداً بازیابی نمی‌شود.
showLogin();
