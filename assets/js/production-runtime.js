(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isMgr=()=>typeof isManager==='function'&&isManager();
  const loggedIn=()=>typeof state!=='undefined'&&state?.token&&state?.user&&!q('#appView')?.classList.contains('hidden');
  let installed=false;

  const GROUPS=[
    ['tasks','مدیریت وظایف','☑',[
      ['kanban','کانبان',false],['archive','آرشیو',false],['taskTimeline','تقویم / گانت',false],['approvals','تأیید درخواست‌ها',true],['requestHistory','تاریخچه درخواست‌ها',false],['approvalChains','تأیید سلسله‌مراتبی',true]
    ]],
    ['messages','مدیریت پیام','✉',[
      ['messageCenter','ارسال پیام',true],['sentMessages','پیام‌های ارسال‌شده',true],['responseTracking','پیگیری پاسخ',true],['templates','متن پیام‌ها',true],['stickers','مدیریت استیکر',true]
    ]],
    ['people','مدیریت افراد','♙',[
      ['people','افراد و نقش‌ها',true],['loginActivity','ورود و خروج',true],['activeSessions','نشست‌های فعال',true]
    ]],
    ['conversations','گفتگوها','☵',[
      ['groupChat','چت گروهی',false],['directMessages','پیام مستقیم',false],['taskChats','گفتگوهای مرتبط با تسک',false]
    ]],
    ['vehicle','مدیریت خودرو','◇',[
      ['vehiclePermanent','دائم',true],['vehicleTemporary','موقت',true]
    ]],
    ['reports','گزارش‌ها','▦',[
      ['dashboard','داشبورد',false],['performanceReport','عملکرد',true],['messageReport','پیام‌ها',true],['responseReport','پاسخ‌ها',true],['requestReport','درخواست‌ها',true],['loginReport','ورود و خروج',true]
    ]],
    ['configuration','تنظیمات','⚙',[
      ['systemOptions','وضعیت‌ها و اولویت‌ها',true],['alertSettings','هشدار',true],['emailSettings','ایمیل',true],['settings','تنظیمات کاربر',false]
    ]]
  ];

  function ensureStyles(){
    if(q('#bamcoProdRuntimeStyle'))return;
    const s=document.createElement('style');s.id='bamcoProdRuntimeStyle';s.textContent=`
      .prod-chat{display:grid;grid-template-columns:minmax(230px,30%) 1fr;gap:12px;min-height:470px}.prod-chat-list,.prod-chat-stage{border:1px solid #dce7e2;border-radius:14px;background:#fff;overflow:hidden}.prod-chat-head{padding:11px 13px;border-bottom:1px solid #e5ece9;background:#f6faf8}.prod-chat-list-body{max-height:430px;overflow:auto}.prod-thread{display:block;width:100%;border:0;border-bottom:1px solid #edf2f0;background:#fff;padding:11px;text-align:right;font-family:inherit;cursor:pointer}.prod-thread:hover,.prod-thread.active{background:#eef7f3}.prod-messages{height:350px;overflow:auto;padding:12px;background:#fbfdfc}.prod-msg{max-width:78%;margin:7px 0;padding:9px 11px;border-radius:12px;background:#edf4f1}.prod-msg.mine{margin-right:auto;background:#e7f0ff}.prod-msg small{display:block;color:#71817b;margin-top:4px}.prod-compose{display:flex;gap:8px;padding:10px;border-top:1px solid #e5ece9}.prod-compose textarea{flex:1;min-height:56px;border:1px solid #cad9d3;border-radius:10px;padding:8px;font-family:inherit}.prod-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0}.prod-card{border:1px solid #dce7e2;border-radius:12px;background:#fff;padding:12px}.prod-table-wrap{max-height:480px;overflow:auto;border:1px solid #dfe9e5;border-radius:12px}.prod-table{width:100%;border-collapse:collapse}.prod-table th,.prod-table td{padding:9px;border-bottom:1px solid #edf2f0;text-align:right}.prod-table th{position:sticky;top:0;background:#f3f8f6}.prod-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.prod-toolbar input,.prod-toolbar select{min-height:36px;border:1px solid #cbdad4;border-radius:9px;padding:7px 9px;font-family:inherit}.prod-empty{padding:24px;text-align:center;color:#71817b}@media(max-width:760px){.prod-chat{grid-template-columns:1fr}.prod-chat-list{max-height:230px}}
    `;document.head.appendChild(s);
  }

  function ensureView(id,managerOnly=false){
    let v=q(`#${id}View`); if(v)return v;
    const workspace=q('.workspace'); if(!workspace)return null;
    v=document.createElement('section');v.id=`${id}View`;v.className=`view hidden${managerOnly?' manager-only':''}`;workspace.appendChild(v);return v;
  }

  function buttonFor(id,label,managerOnly){
    let b=q(`#nav button[data-view="${id}"]`);
    if(!b){b=document.createElement('button');b.type='button';b.dataset.view=id;b.innerHTML=`<b>•</b><span>${esc(label)}</span>`;}
    if(managerOnly)b.classList.add('manager-only'); else b.classList.remove('manager-only');
    b.classList.toggle('hidden',managerOnly&&!isMgr());
    return b;
  }

  function buildNavigation(){
    const nav=q('#nav'); if(!nav)return;
    qa('#nav>.nav-group').forEach(x=>x.remove());
    GROUPS.forEach(([key,title,icon,items])=>{
      const g=document.createElement('div');g.className='nav-group';g.dataset.group=key;
      g.innerHTML=`<button type="button" class="nav-group-toggle" aria-expanded="false"><b class="nav-group-icon">${icon}</b><span>${title}</span><b class="nav-chevron">⌄</b></button><div class="nav-group-items"></div>`;
      const box=q('.nav-group-items',g),toggle=q('.nav-group-toggle',g);
      items.forEach(([id,label,managerOnly])=>box.appendChild(buttonFor(id,label,managerOnly)));
      const visible=qa(':scope>button',box).some(b=>!b.classList.contains('hidden'));g.classList.toggle('hidden',!visible);
      toggle.addEventListener('click',()=>{const open=g.classList.toggle('open');toggle.setAttribute('aria-expanded',open?'true':'false')});
      nav.appendChild(g);
    });
  }

  function panel(id,title,subtitle,html){
    const v=ensureView(id,true);if(!v)return;v.innerHTML=`<div class="panel table-panel"><div class="panel-head"><div><h3>${esc(title)}</h3><small>${esc(subtitle)}</small></div></div>${html}</div>`;
  }

  async function directory(){try{return await rpc('chat_directory',{})}catch{return []}}
  const pname=p=>p.display_name||p.full_name||'کاربر';
  let chatThread=null;

  function chatLayout(side){return `<div class="prod-chat"><div class="prod-chat-list"><div class="prod-chat-head">${side.head||''}</div><div class="prod-chat-list-body">${side.body||'<div class="prod-empty">موردی وجود ندارد.</div>'}</div></div><div class="prod-chat-stage"><div class="prod-chat-head"><b id="prodChatTitle">یک گفتگو را انتخاب کنید</b></div><div id="prodChatMessages" class="prod-messages"><div class="prod-empty">پیام‌ها اینجا نمایش داده می‌شوند.</div></div><form id="prodChatCompose" class="prod-compose"><textarea name="body" placeholder="پیام بنویسید…" required disabled></textarea><button class="primary" disabled>ارسال</button></form></div></div>`}

  async function openThread(id,title){
    chatThread=id;q('#prodChatTitle').textContent=title;
    const [msgs,people]=await Promise.all([select('chat_messages',`select=id,sender_id,body,created_at&thread_id=eq.${id}&deleted_at=is.null&order=created_at.asc&limit=200`),directory()]);
    const names=Object.fromEntries(people.map(p=>[p.id,pname(p)])),box=q('#prodChatMessages');
    box.innerHTML=msgs.length?msgs.map(m=>`<div class="prod-msg ${m.sender_id===state.user.id?'mine':''}"><b>${esc(names[m.sender_id]||'کاربر')}</b><div>${esc(m.body).replace(/\n/g,'<br>')}</div><small>${new Date(m.created_at).toLocaleString('fa-IR')}</small></div>`).join(''):'<div class="prod-empty">هنوز پیامی ثبت نشده است.</div>';
    const f=q('#prodChatCompose');f.querySelector('textarea').disabled=false;f.querySelector('button').disabled=false;await rpc('chat_mark_read',{p_thread_id:id});box.scrollTop=box.scrollHeight;
  }

  async function renderGroupChat(){
    ensureView('groupChat',false);await rpc('chat_ensure_public',{});
    const threads=await select('chat_threads','select=id,thread_type,title,updated_at&thread_type=in.(public,group)&is_active=eq.true&order=updated_at.desc');
    const people=isMgr()?await directory():[];
    const create=isMgr()?`<details><summary>گروه خصوصی جدید</summary><form id="prodGroupForm" class="prod-toolbar"><input name="title" placeholder="نام گروه" required><select name="members" multiple size="4">${people.filter(p=>p.id!==state.user.id).map(p=>`<option value="${p.id}">${esc(pname(p))}</option>`).join('')}</select><button class="primary">ایجاد گروه</button></form></details>`:'';
    q('#groupChatView').innerHTML=`<div class="panel"><div class="panel-head"><div><h3>چت گروهی</h3><small>گفتگوی عمومی و گروه‌های خصوصی</small></div></div>${create}${chatLayout({head:'گفتگوها',body:threads.map(t=>`<button class="prod-thread" data-thread="${t.id}" data-title="${esc(t.title)}">${esc(t.title)} <small>${t.thread_type==='public'?'عمومی':'خصوصی'}</small></button>`).join('')})}</div>`;
  }

  async function renderDirect(){
    ensureView('directMessages',false);const people=(await directory()).filter(p=>p.id!==state.user.id);
    q('#directMessagesView').innerHTML=`<div class="panel"><div class="panel-head"><div><h3>پیام مستقیم</h3><small>گفتگوی خصوصی میان کاربران</small></div></div>${chatLayout({head:'افراد',body:people.map(p=>`<button class="prod-thread prod-direct" data-user="${p.id}" data-name="${esc(pname(p))}">${esc(pname(p))}</button>`).join('')})}</div>`;
  }

  async function renderTaskChats(){
    ensureView('taskChats',false);const tasks=(state.tasks||[]).filter(t=>!t.archived);
    q('#taskChatsView').innerHTML=`<div class="panel"><div class="panel-head"><div><h3>گفتگوهای مرتبط با تسک</h3><small>گفتگوی مستقل برای هر وظیفه فعال</small></div></div>${chatLayout({head:'وظایف',body:tasks.map(t=>`<button class="prod-thread prod-task" data-task="${t.id}" data-name="${esc((t.display_id||t.id)+' — '+t.title)}">${esc((t.display_id||t.id)+' — '+t.title)}</button>`).join('')})}</div>`;
  }

  async function renderSessions(active=false){
    const rows=await select(active?'active_user_sessions':'user_sessions',active?'select=*&is_active=eq.true&order=last_activity_at.desc&limit=300':'select=*&order=login_at.desc&limit=500');
    const people=await select('profiles','select=id,full_name,display_name');const names=Object.fromEntries(people.map(p=>[p.id,p.display_name||p.full_name]));
    panel(active?'activeSessions':'loginActivity',active?'نشست‌های فعال':'ورود و خروج',active?'نشست‌های باز کاربران':'سوابق ورود، خروج و آخرین فعالیت',`<div class="prod-table-wrap"><table class="prod-table"><thead><tr><th>کاربر</th><th>ورود</th><th>آخرین فعالیت</th><th>خروج</th><th>وضعیت</th>${active?'<th>عملیات</th>':''}</tr></thead><tbody>${rows.length?rows.map(s=>`<tr><td>${esc(names[s.user_id]||'—')}</td><td>${new Date(s.login_at).toLocaleString('fa-IR')}</td><td>${new Date(s.last_activity_at).toLocaleString('fa-IR')}</td><td>${s.logout_at?new Date(s.logout_at).toLocaleString('fa-IR'):'—'}</td><td>${s.revoked_at?'لغوشده':s.logout_at?'خارج‌شده':'فعال'}</td>${active?`<td><button class="ghost prod-revoke" data-id="${s.id}">پایان نشست</button></td>`:''}</tr>`).join(''):'<tr><td colspan="6" class="prod-empty">نشستی برای نمایش وجود ندارد.</td></tr>'}</tbody></table></div>`);
  }

  async function renderSystemOptions(){
    const [statuses,priorities]=await Promise.all([select('task_statuses','select=*&order=sort_order'),select('priorities','select=*&order=sort_order')]);
    panel('systemOptions','وضعیت‌ها و اولویت‌ها','تعریف و فعال‌سازی مقادیر مورد استفاده در وظایف',`<div class="prod-grid"><div class="prod-card"><h4>وضعیت‌ها</h4>${statuses.map(x=>`<div class="prod-toolbar"><input value="${esc(x.label)}" data-status="${esc(x.key)}"><label><input type="checkbox" data-status-active="${esc(x.key)}" ${x.active?'checked':''}> فعال</label><button class="ghost prod-save-status" data-key="${esc(x.key)}">ذخیره</button></div>`).join('')}</div><div class="prod-card"><h4>اولویت‌ها</h4>${priorities.map(x=>`<div class="prod-toolbar"><input value="${esc(x.label)}" data-priority="${esc(x.key)}"><label><input type="checkbox" data-priority-active="${esc(x.key)}" ${x.active?'checked':''}> فعال</label><button class="ghost prod-save-priority" data-key="${esc(x.key)}">ذخیره</button></div>`).join('')}</div></div>`);
  }

  async function renderPerformance(){
    const tasks=state.tasks||[], profiles=state.profiles||[];const names=Object.fromEntries(profiles.map(p=>[p.id,p.display_name||p.full_name||p.email]));
    const ids=[...new Set(tasks.map(t=>t.owner_id).filter(Boolean))];
    panel('performanceReport','گزارش عملکرد','تجمیع وضعیت وظایف به تفکیک متولی',`<div class="prod-table-wrap"><table class="prod-table"><thead><tr><th>متولی</th><th>کل</th><th>فعال</th><th>دیرکرد</th><th>انجام‌شده</th></tr></thead><tbody>${ids.map(id=>{const a=tasks.filter(t=>t.owner_id===id),done=a.filter(t=>t.archived||String(t.status).includes('انجام')).length,active=a.filter(t=>!t.archived).length,late=a.filter(t=>String(t.due_state)==='دیرکرد').length;return`<tr><td>${esc(names[id]||'—')}</td><td>${a.length}</td><td>${active}</td><td>${late}</td><td>${done}</td></tr>`}).join('')||'<tr><td colspan="5" class="prod-empty">داده‌ای وجود ندارد.</td></tr>'}</tbody></table></div>`);
  }

  async function renderSimpleReport(id,title,table,field){
    let rows=[];try{rows=await select(table,`select=${field}`)}catch{}
    const counts={};rows.forEach(r=>counts[r[field]??'نامشخص']=(counts[r[field]??'نامشخص']||0)+1);
    panel(id,title,'گزارش زنده از داده‌های سامانه',`<div class="prod-grid">${Object.entries(counts).map(([k,v])=>`<div class="prod-card"><span>${esc(k)}</span><b>${v}</b></div>`).join('')||'<div class="prod-card">هنوز داده‌ای ثبت نشده است.</div>'}</div>`);
  }

  async function renderAlertSettings(){
    panel('alertSettings','تنظیمات هشدار','هشدار هر وظیفه از ستون «یادآور» همان وظیفه محاسبه می‌شود',`<div class="prod-card"><b>سیاست فعال</b><p>عدد یادآور هر تسک، تعداد روز قبل از تاریخ پایان است. مقدار صفر یعنی هشدار پیش از موعد ندارد. «منتظر پاسخ» بدون تاریخ پایان و بدون هشدار دیرکرد محاسبه می‌شود.</p></div>`);
  }

  async function renderEmailSettings(){
    panel('emailSettings','تنظیمات ایمیل','وضعیت فعلی سرویس ارسال',`<div class="prod-grid"><div class="prod-card"><span>نام نمایشی</span><b>BAMCO TASK REMINDER</b></div><div class="prod-card"><span>Reply-To</span><b class="en-text">bamco.task.reminder@outlook.com</b></div><div class="prod-card"><span>ارسال امن</span><b>از تابع سرور</b></div></div>`);
  }

  async function renderView(id){
    try{
      if(id==='groupChat')return renderGroupChat();if(id==='directMessages')return renderDirect();if(id==='taskChats')return renderTaskChats();
      if(id==='loginActivity')return renderSessions(false);if(id==='activeSessions')return renderSessions(true);if(id==='systemOptions')return renderSystemOptions();
      if(id==='performanceReport')return renderPerformance();if(id==='messageReport')return renderSimpleReport(id,'گزارش پیام‌ها','message_deliveries','status');if(id==='responseReport')return renderSimpleReport(id,'گزارش پاسخ‌ها','message_response_tracking','response_status');if(id==='requestReport')return renderSimpleReport(id,'گزارش درخواست‌ها','change_requests','request_status');if(id==='loginReport')return renderSessions(false);if(id==='alertSettings')return renderAlertSettings();if(id==='emailSettings')return renderEmailSettings();
    }catch(err){const v=ensureView(id,id!=='groupChat'&&id!=='directMessages'&&id!=='taskChats');if(v)v.innerHTML=`<div class="panel"><div class="prod-empty">${esc(err.message||'بارگذاری این بخش انجام نشد.')}</div></div>`;}
  }

  function bind(){
    const nav=q('#nav');nav?.addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(!b)return;const id=b.dataset.view;if(['groupChat','directMessages','taskChats','loginActivity','activeSessions','systemOptions','performanceReport','messageReport','responseReport','requestReport','loginReport','alertSettings','emailSettings'].includes(id))setTimeout(()=>renderView(id),0)},true);
    document.addEventListener('click',async e=>{
      const t=e.target.closest('.prod-thread[data-thread]');if(t)return openThread(t.dataset.thread,t.dataset.title);
      const d=e.target.closest('.prod-direct');if(d){const id=await rpc('chat_ensure_direct',{p_other_user:d.dataset.user});return openThread(id,d.dataset.name)}
      const tt=e.target.closest('.prod-task');if(tt){const id=await rpc('chat_ensure_task',{p_task_id:Number(tt.dataset.task)});return openThread(id,tt.dataset.name)}
      const rv=e.target.closest('.prod-revoke');if(rv){await rpc('revoke_user_session',{p_session_id:rv.dataset.id});toast('نشست پایان داده شد.');return renderSessions(true)}
      const ss=e.target.closest('.prod-save-status');if(ss){const key=ss.dataset.key,label=q(`[data-status="${CSS.escape(key)}"]`).value.trim(),active=q(`[data-status-active="${CSS.escape(key)}"]`).checked;await update('task_statuses',`key=eq.${encodeURIComponent(key)}`,{label,active});toast('وضعیت ذخیره شد.');return}
      const sp=e.target.closest('.prod-save-priority');if(sp){const key=sp.dataset.key,label=q(`[data-priority="${CSS.escape(key)}"]`).value.trim(),active=q(`[data-priority-active="${CSS.escape(key)}"]`).checked;await update('priorities',`key=eq.${encodeURIComponent(key)}`,{label,active});toast('اولویت ذخیره شد.');return}
    });
    document.addEventListener('submit',async e=>{
      if(e.target.id==='prodChatCompose'){e.preventDefault();if(!chatThread)return;const body=e.target.elements.body.value.trim();if(!body)return;await rpc('chat_send_message',{p_thread_id:chatThread,p_body:body,p_reply_to:null});e.target.reset();return openThread(chatThread,q('#prodChatTitle').textContent)}
      if(e.target.id==='prodGroupForm'){e.preventDefault();const fd=new FormData(e.target),members=[...e.target.elements.members.selectedOptions].map(o=>o.value);await rpc('chat_create_group',{p_title:fd.get('title'),p_member_ids:members});toast('گروه ساخته شد.');return renderGroupChat()}
    });
  }

  function install(){if(installed||!loggedIn())return;installed=true;ensureStyles();
    [['groupChat',false],['directMessages',false],['taskChats',false],['loginActivity',true],['activeSessions',true],['performanceReport',true],['messageReport',true],['responseReport',true],['requestReport',true],['loginReport',true],['systemOptions',true],['alertSettings',true],['emailSettings',true]].forEach(([id,m])=>ensureView(id,m));
    buildNavigation();bind();
  }
  function watch(){const app=q('#appView');if(!app)return;const run=()=>{if(!app.classList.contains('hidden'))install()};new MutationObserver(run).observe(app,{attributes:true,attributeFilter:['class']});run();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
