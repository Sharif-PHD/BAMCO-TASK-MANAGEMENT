(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const definitions=[
    ['loginActivity','ورود و خروج کاربران','مدیریت افراد','manager','فعالیت‌های ورود، خروج و آخرین حضور کاربران','♜'],
    ['activeSessions','نشست‌های فعال','مدیریت افراد','manager','نشست‌های باز و امکان پایان‌دادن نشست از راه دور','◉'],
    ['groupChat','چت گروهی','گفتگوها','all','کانال عمومی و گروه‌های خصوصی سازمان','♣'],
    ['directMessages','پیام مستقیم','گفتگوها','all','گفتگوی خصوصی میان کاربران سامانه','↔'],
    ['taskChats','گفتگوهای مرتبط با تسک','گفتگوها','all','رشته گفتگو و مستندات مرتبط با هر وظیفه','☷'],
    ['performanceReport','گزارش عملکرد','گزارش‌ها','manager','نمای تجمیعی عملکرد متولیان بر اساس اطلاعات زنده وظایف','▥'],
    ['messageReport','گزارش پیام‌ها','گزارش‌ها','manager','وضعیت تحویل پیام‌ها در کانال داخل سامانه و ایمیل','✉'],
    ['responseReport','گزارش پاسخ‌ها','گزارش‌ها','manager','نرخ پاسخ و پیام‌های نیازمند پیگیری','↩'],
    ['requestReport','گزارش درخواست‌ها','گزارش‌ها','manager','وضعیت درخواست‌های تعریف و تغییر وظیفه','✓'],
    ['loginReport','گزارش ورود و خروج','گزارش‌ها','manager','گزارش رخدادهای امنیتی و نشست‌های کاربران','⌁'],
    ['alertSettings','تنظیمات هشدار','تنظیمات','manager','سیاست هشدار، دیرکرد و فاصله یادآوری‌ها','⚠'],
    ['emailSettings','تنظیمات ایمیل','تنظیمات','manager','وضعیت اتصال امن سرویس ایمیل و صف ارسال','✉']
  ];
  const titles=Object.fromEntries(definitions.map(x=>[x[0],x[1]]));
  const groupSpecs=[
    ['tasks','مدیریت وظایف','☑',['kanban','archive','taskTimeline','approvals','requestHistory','approvalChains']],
    ['messages','مدیریت پیام','✉',['messageCenter','sentMessages','responseTracking','templates','stickers','messages']],
    ['people','مدیریت افراد','♙',['people','loginActivity','activeSessions']],
    ['conversations','گفتگوها','☵',['groupChat','directMessages','taskChats']],
    ['vehicle','مدیریت خودرو','◇',['vehiclePermanent','vehicleTemporary']],
    ['reports','گزارش‌ها','▦',['dashboard','performanceReport','messageReport','responseReport','requestReport','loginReport']],
    ['configuration','تنظیمات','⚙',['systemOptions','alertSettings','emailSettings','settings']]
  ];

  function table(headers,id,empty){return `<div class="table-wrap"><table class="manager-table"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody id="${id}"><tr><td colspan="${headers.length}" class="empty">${empty}</td></tr></tbody></table></div>`}
  function statusCards(items){return `<div class="completion-status-grid">${items.map(([icon,title,text])=>`<article><span>${icon}</span><div><b>${title}</b><p>${text}</p></div></article>`).join('')}</div>`}
  function contentFor(id){
    if(id==='loginActivity')return table(['کاربر','ورود','آخرین فعالیت','خروج','مدت نشست','مرورگر','IP','وضعیت'],'loginActivityBody','پس از فعال‌شدن ثبت نشست، رخدادهای کاربران در این جدول نمایش داده می‌شود.');
    if(id==='activeSessions')return table(['کاربر','شروع نشست','آخرین فعالیت','مرورگر','IP','وضعیت','عملیات'],'activeSessionsBody','در حال حاضر نشست فعالی برای نمایش ثبت نشده است.');
    if(id==='performanceReport')return `<div class="completion-report-cards" id="performanceReportCards"></div>${table(['متولی','کل وظایف','فعال','هشدار','دیرکرد','انجام‌شده','نرخ انجام'],'performanceReportBody','داده عملکردی برای نمایش وجود ندارد.')}`;
    if(id==='messageReport')return `<div class="completion-report-cards" id="messageReportCards"></div>${table(['کانال','آماده/صف','ارسال‌شده','تحویل‌شده','خطا'],'messageReportBody','هنوز ارسالی ثبت نشده است.')}`;
    if(id==='responseReport')return `<div class="completion-report-cards" id="responseReportCards"></div>${table(['وضعیت پاسخ','تعداد','سهم از کل'],'responseReportBody','هنوز پاسخی برای گزارش ثبت نشده است.')}`;
    if(id==='requestReport')return `<div class="completion-report-cards" id="requestReportCards"></div>${table(['وضعیت درخواست','تعداد','سهم از کل'],'requestReportBody','هنوز درخواستی برای گزارش ثبت نشده است.')}`;
    if(id==='loginReport')return statusCards([['◷','ثبت رخدادها','ورود موفق، ورود ناموفق، خروج و انقضای نشست در این گزارش یکپارچه می‌شوند.'],['◎','Heartbeat','آخرین فعالیت، بسته‌شدن مرورگر و پایان خودکار نشست قابل پایش خواهد بود.'],['⚑','کنترل امنیتی','IP، مرورگر و نشست‌های مشکوک در یک نمای مدیریتی قرار می‌گیرند.']]);
    if(id==='alertSettings')return `<div class="completion-settings-grid"><label>تعداد روز پیش از موعد برای هشدار<input type="number" min="0" value="3" disabled></label><label>فاصله مجاز بین دو یادآوری<input type="number" min="0" value="1" disabled></label><label>ساعت شروع مجاز ارسال<input type="time" value="08:00" disabled></label><label>ساعت پایان مجاز ارسال<input type="time" value="18:00" disabled></label></div><p class="completion-note">این صفحه برای اتصال سیاست‌های هشدار به تنظیمات مرکزی آماده شده است. تا زمان ایجاد جدول تنظیمات، مقادیر نمایشی روی محاسبات فعال سامانه اثر نمی‌گذارند.</p>`;
    if(id==='emailSettings')return statusCards([['✓','دامنه ارسال','دامنه ایمیل توسط مدیر سامانه تأیید شده است.'],['⚿','کلید محرمانه','کلید API فقط در تابع سرور نگهداری می‌شود و در مرورگر نمایش داده نمی‌شود.'],['↻','صف و تلاش مجدد','ارسال‌ها با وضعیت آماده، در صف، ارسال‌شده و خطا پایش می‌شوند.']]);
    return `<div class="conversation-placeholder"><div class="conversation-list"><div class="conversation-search">جست‌وجوی گفتگو…</div><div class="empty">هنوز گفتگویی در این بخش ایجاد نشده است.</div></div><div class="conversation-stage"><span>☵</span><h4>${esc(titles[id])}</h4><p>با ایجاد اولین گفتگو، پیام‌ها، پاسخ‌ها و وضعیت خوانده‌شدن در این قسمت نمایش داده می‌شوند.</p></div></div>`;
  }
  function ensureTabs(){
    const nav=q('#nav'),workspace=q('.workspace');if(!nav||!workspace)return;
    definitions.forEach(([id,label,,role,subtitle,icon])=>{
      if(!q(`#nav button[data-view="${id}"]`)){
        const button=document.createElement('button');button.type='button';button.dataset.view=id;button.dataset.completenessTab='1';if(role==='manager')button.className='manager-only';button.innerHTML=`<b>${icon}</b><span>${label}</span>`;nav.appendChild(button);
      }
      if(!q(`#${id}View`))workspace.insertAdjacentHTML('beforeend',`<section id="${id}View" class="view hidden ${role==='manager'?'manager-only':''}"><div class="panel table-panel completion-panel"><div class="panel-head"><div><h3>${label}</h3><small>${subtitle}</small></div></div>${contentFor(id)}</div></section>`);
    });
  }
  function createGroup(key,title,icon){
    const nav=q('#nav'),group=document.createElement('div');group.className='nav-group';group.dataset.group=key;
    group.innerHTML=`<button type="button" class="nav-group-toggle" title="${title}" aria-label="${title}" aria-expanded="false"><b class="nav-group-icon">${icon}</b><span>${title}</span><b class="nav-chevron">⌄</b></button><div class="nav-group-items"></div>`;
    nav.appendChild(group);const toggle=q('.nav-group-toggle',group);
    toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();qa('#nav .nav-group.open').filter(x=>x!==group).forEach(x=>{x.classList.remove('open');q('.nav-group-toggle',x)?.setAttribute('aria-expanded','false')});const open=!group.classList.contains('open');group.classList.toggle('open',open);toggle.setAttribute('aria-expanded',open?'true':'false')});
    q('.nav-group-items',group).addEventListener('click',()=>{group.classList.remove('open');toggle.setAttribute('aria-expanded','false')});return group;
  }
  function regroup(){
    const nav=q('#nav');if(!nav)return;
    if(typeof state!=='undefined'&&state.profile&&typeof isManager==='function')qa('.manager-only').forEach(el=>el.classList.toggle('hidden',!isManager()));
    groupSpecs.forEach(([key,title,icon,views])=>{
      let group=q(`#nav .nav-group[data-group="${key}"]`);if(!group)group=createGroup(key,title,icon);
      const items=q('.nav-group-items',group);views.forEach(view=>{const button=q(`#nav button[data-view="${view}"]`);if(button&&button.parentElement!==items)items.appendChild(button)});
      const visible=qa(':scope>button',items).some(b=>!b.classList.contains('hidden'));group.classList.toggle('hidden',!visible);
    });
    q('#nav button[data-view="settings"]')?.classList.remove('nav-settings-root');
  }
  function percent(part,total){return total?`${fa(Math.round(part*100/total))}٪`:'۰٪'}
  function summaryCards(target,items){const el=q(target);if(el)el.innerHTML=items.map(([label,value,tone])=>`<article class="${tone||''}"><span>${label}</span><b>${fa(value)}</b></article>`).join('')}
  function renderPerformance(){
    const tasks=Array.isArray(state?.tasks)?state.tasks:[],profiles=Array.isArray(state?.profiles)?state.profiles:[],names=Object.fromEntries(profiles.map(p=>[p.id,p.full_name||p.email]));
    const ids=[...new Set(tasks.map(t=>t.owner_id).filter(Boolean))],rows=ids.map(id=>{const mine=tasks.filter(t=>t.owner_id===id),done=mine.filter(t=>String(t.status).includes('انجام')).length,active=mine.filter(t=>!t.archived&&!String(t.status).includes('انجام')).length,warning=mine.filter(t=>String(t.due_state).includes('هشدار')).length,overdue=mine.filter(t=>String(t.due_state)==='دیرکرد').length;return{id,name:names[id]||'—',total:mine.length,done,active,warning,overdue}});
    const body=q('#performanceReportBody');if(body)body.innerHTML=rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${fa(x.total)}</td><td>${fa(x.active)}</td><td>${fa(x.warning)}</td><td>${fa(x.overdue)}</td><td>${fa(x.done)}</td><td>${percent(x.done,x.total)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">داده عملکردی برای نمایش وجود ندارد.</td></tr>';
    summaryCards('#performanceReportCards',[['کل وظایف',tasks.length],['فعال',tasks.filter(t=>!t.archived&&!String(t.status).includes('انجام')).length],['دیرکرد',tasks.filter(t=>String(t.due_state)==='دیرکرد').length,'danger'],['انجام‌شده',tasks.filter(t=>String(t.status).includes('انجام')).length,'success']]);
  }
  async function renderMessageReport(){try{const rows=await select('message_deliveries','select=channel,status');const channels=['portal','email'],labels={portal:'داخل سامانه',email:'ایمیل'};q('#messageReportBody').innerHTML=channels.map(channel=>{const mine=rows.filter(x=>x.channel===channel),n=s=>mine.filter(x=>s.includes(x.status)).length;return`<tr><td>${labels[channel]}</td><td>${fa(n(['ready','queued','processing']))}</td><td>${fa(n(['sent']))}</td><td>${fa(n(['delivered']))}</td><td>${fa(n(['failed']))}</td></tr>`}).join('');summaryCards('#messageReportCards',[['کل مسیرهای ارسال',rows.length],['ارسال‌شده',rows.filter(x=>['sent','delivered'].includes(x.status)).length,'success'],['در صف',rows.filter(x=>['ready','queued','processing'].includes(x.status)).length],['خطا',rows.filter(x=>x.status==='failed').length,'danger']])}catch(err){q('#messageReportBody').innerHTML='<tr><td colspan="5" class="empty">دریافت گزارش پیام‌ها انجام نشد.</td></tr>'}}
  async function renderResponseReport(){try{const rows=await select('message_response_tracking','select=response_status'),labels={replied:'پاسخ داده',awaiting:'بدون پاسخ',failed:'خطای ارسال',reminder_needed:'نیازمند یادآوری'},keys=['replied','awaiting','reminder_needed','failed'];q('#responseReportBody').innerHTML=keys.map(key=>{const n=rows.filter(x=>x.response_status===key).length;return`<tr><td>${labels[key]}</td><td>${fa(n)}</td><td>${percent(n,rows.length)}</td></tr>`}).join('');summaryCards('#responseReportCards',[['کل ارسال‌ها',rows.length],['پاسخ داده',rows.filter(x=>x.response_status==='replied').length,'success'],['بدون پاسخ',rows.filter(x=>x.response_status==='awaiting').length],['نیازمند یادآوری',rows.filter(x=>x.response_status==='reminder_needed').length,'danger']])}catch(err){q('#responseReportBody').innerHTML='<tr><td colspan="3" class="empty">دریافت گزارش پاسخ‌ها انجام نشد.</td></tr>'}}
  function renderRequestReport(){const rows=[...(state?.requests||[]),...(state?.requestHistory||[])],labels={pending:'در انتظار بررسی',in_review:'در زنجیره تأیید',needs_revision:'برگشت جهت اصلاح',approved:'تأییدشده',rejected:'ردشده',cancelled:'لغوشده'},keys=['pending','in_review','needs_revision','approved','rejected','cancelled'];q('#requestReportBody').innerHTML=keys.map(key=>{const n=rows.filter(x=>x.request_status===key).length;return`<tr><td>${labels[key]}</td><td>${fa(n)}</td><td>${percent(n,rows.length)}</td></tr>`}).join('');summaryCards('#requestReportCards',[['کل درخواست‌ها',rows.length],['جاری',rows.filter(x=>['pending','in_review','needs_revision'].includes(x.request_status)).length],['تأییدشده',rows.filter(x=>x.request_status==='approved').length,'success'],['ردشده',rows.filter(x=>x.request_status==='rejected').length,'danger']])}
  function open(view){if(typeof showView==='function')showView(view);const title=q('#viewTitle');if(title)title.textContent=titles[view]||title.textContent;if(view==='performanceReport')renderPerformance();if(view==='messageReport')renderMessageReport();if(view==='responseReport')renderResponseReport();if(view==='requestReport')renderRequestReport()}
  function install(){if(document.documentElement.dataset.navigationComplete==='1')return;document.documentElement.dataset.navigationComplete='1';ensureTabs();regroup();q('#nav')?.addEventListener('click',e=>{const button=e.target.closest('button[data-completeness-tab]');if(button)open(button.dataset.view)});[80,350,900,1600].forEach(ms=>setTimeout(()=>{ensureTabs();regroup()},ms));new MutationObserver(regroup).observe(q('#nav'),{subtree:true,attributes:true,attributeFilter:['class']})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
