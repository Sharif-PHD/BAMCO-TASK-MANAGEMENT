(()=>{
  'use strict';
  if(window.__bamcoTaskTimeline)return;
  window.__bamcoTaskTimeline=true;
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const faNum=n=>typeof fa==='function'?fa(n):String(n??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
  const monthNames=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const weekNames=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  const priorityColors={'فوری':'#ef5350','متوسط':'#f2a93b','کم':'#39a96b'};
  let mode='calendar',month=null,filters={owner:'',status:'',priority:'',search:''};

  function appState(){try{return typeof state!=='undefined'?state:null}catch{return null}}
  function currentMonth(){const p=typeof currentJalali==='function'?currentJalali():null;return p||{y:1405,m:6,d:1}}
  function activeTasks(){const s=appState();return (s?.tasks||[]).filter(t=>!t.archived)}
  function ownerNameLocal(t){try{return typeof ownerName==='function'?ownerName(t):(appState()?.profiles||[]).find(p=>p.id===t.owner_id)?.full_name||'—'}catch{return'—'}}
  function taskId(t){try{return typeof displayId==='function'?displayId(t):(t.legacy_id||t.id)}catch{return t.legacy_id||t.id}}
  function colorFor(t){return priorityColors[String(t.priority||'').trim()]||'#6f8f84'}
  function toParts(iso){try{return typeof persianParts==='function'?persianParts(iso):null}catch{return null}}
  function isoFor(y,m,d){try{return typeof jalaliToISO==='function'?jalaliToISO(y,m,d):null}catch{return null}}
  function daysInMonth(y,m){try{return typeof daysInJalaliMonth==='function'?daysInJalaliMonth(y,m):(m<=6?31:m<=11?30:29)}catch{return m<=6?31:m<=11?30:29}}
  function sameMonth(iso,y,m){const p=toParts(iso);return !!p&&p.y===y&&p.m===m}
  function dateIndex(iso,y,m){const p=toParts(iso);return p&&p.y===y&&p.m===m?p.d:null}
  function monthIsoRange(){const max=daysInMonth(month.y,month.m);return {start:isoFor(month.y,month.m,1),end:isoFor(month.y,month.m,max),max}}
  function filtered(){
    const term=filters.search.trim().toLowerCase();
    return activeTasks().filter(t=>(!filters.owner||t.owner_id===filters.owner)&&(!filters.status||String(t.status)===filters.status)&&(!filters.priority||String(t.priority)===filters.priority)&&(!term||[taskId(t),t.title,t.description,ownerNameLocal(t),t.status,t.priority].some(v=>String(v??'').toLowerCase().includes(term))));
  }
  function openKanban(t){
    const s=appState();if(s?.selected)s.selected.kanban=t.id;
    const btn=q('#nav button[data-view="kanban"]');if(btn)btn.click();
    try{if(typeof renderTasks==='function')renderTasks(false)}catch{}
    setTimeout(()=>q(`#kanbanBody tr[data-task-id="${t.id}"]`)?.scrollIntoView({block:'center',behavior:'smooth'}),80);
  }

  function ensure(){
    if(q('#taskTimelineView'))return;
    const archive=q('#nav button[data-view="archive"]'),nav=q('#nav'),workspace=q('.workspace');if(!nav||!workspace)return;
    const btn=document.createElement('button');btn.dataset.view='taskTimeline';btn.className=archive?.className||'';btn.innerHTML='<b>▦</b><span>تقویم و گانت</span>';
    archive?.parentNode?archive.insertAdjacentElement('afterend',btn):nav.appendChild(btn);
    workspace.insertAdjacentHTML('beforeend',`<section id="taskTimelineView" class="view hidden"><div class="task-timeline-shell"><div class="tt-head"><div><h3>تقویم و گانت وظایف</h3><small>نمایش زمان‌بندی وظایف جاری بر اساس تقویم شمسی و اولویت</small></div><div class="tt-switch"><button type="button" class="tt-mode active" data-mode="calendar">▦ نمای تقویمی</button><button type="button" class="tt-mode" data-mode="gantt">▥ نمای گانت</button></div></div><div class="tt-toolbar"><div class="tt-month"><button type="button" id="ttPrev" class="ghost">‹</button><button type="button" id="ttToday" class="ghost">امروز</button><strong id="ttMonthLabel"></strong><button type="button" id="ttNext" class="ghost">›</button></div><div class="tt-filters"><select id="ttOwner"><option value="">همه متولیان</option></select><select id="ttStatus"><option value="">همه وضعیت‌ها</option></select><select id="ttPriority"><option value="">همه اولویت‌ها</option></select><input id="ttSearch" class="search" placeholder="جست‌وجو در وظایف…"></div></div><div id="ttBody"></div><div class="tt-legend"><span><i style="--c:#ef5350"></i>فوری</span><span><i style="--c:#f2a93b"></i>متوسط</span><span><i style="--c:#39a96b"></i>کم</span><span><i style="--c:#6f8f84"></i>سایر</span></div></div></section>`);
    const st=document.createElement('style');st.id='taskTimelineStyles';st.textContent=`
#taskTimelineView{height:calc(100dvh - 58px - var(--footer-h,34px))!important;overflow:auto!important;padding:4px 0!important;box-sizing:border-box!important}
.task-timeline-shell{margin:0 14px 10px!important;padding:22px!important;border:1px solid #c8d7d1!important;border-radius:15px!important;background:#f8fbf9!important;box-shadow:0 7px 24px #123f3308!important;min-height:calc(100% - 12px)!important;box-sizing:border-box!important}
.tt-head,.tt-toolbar,.tt-switch,.tt-month,.tt-filters,.tt-legend{display:flex!important;align-items:center!important}.tt-head{justify-content:space-between!important;gap:16px!important;margin-bottom:18px!important}.tt-head h3{margin:0!important;color:#145741!important;font-size:24px!important}.tt-head small{display:block!important;margin-top:4px!important;color:#61766f!important}.tt-switch{gap:8px!important}.tt-mode{border:1px solid #a9c8bc!important;background:#fff!important;color:#174f3e!important;border-radius:10px!important;padding:9px 16px!important;cursor:pointer!important;font-family:inherit!important}.tt-mode.active{background:#176b4d!important;color:#fff!important;border-color:#176b4d!important}.tt-toolbar{justify-content:space-between!important;gap:12px!important;flex-wrap:wrap!important;margin-bottom:14px!important}.tt-month{gap:7px!important}.tt-month strong{min-width:150px!important;text-align:center!important;color:#174f3e!important;font-size:17px!important}.tt-filters{gap:8px!important;flex-wrap:wrap!important}.tt-filters select,.tt-filters input{height:39px!important;min-width:160px!important;border:1px solid #cad8d3!important;border-radius:9px!important;background:#fff!important;padding:0 10px!important;font-family:"B Nazanin",BNazanin,Tahoma,sans-serif!important;direction:rtl!important}.tt-filters input{min-width:220px!important}
.tt-calendar{display:grid!important;grid-template-columns:repeat(7,minmax(110px,1fr))!important;border:1px solid #cddbd6!important;border-radius:13px!important;overflow:hidden!important;background:#fff!important}.tt-week{padding:9px!important;background:#e7f0ec!important;text-align:center!important;font-weight:700!important;color:#214b3e!important;border-left:1px solid #d5e1dd!important}.tt-day{min-height:126px!important;padding:8px!important;border-left:1px solid #e0e8e5!important;border-top:1px solid #e0e8e5!important;position:relative!important;background:#fff!important}.tt-day.other{background:#f8faf9!important}.tt-day.today{box-shadow:inset 0 0 0 2px #2b8a68!important;background:#f0f8f4!important}.tt-day-num{font-weight:700!important;color:#314f46!important;margin-bottom:7px!important}.tt-dots{display:flex!important;gap:5px!important;flex-wrap:wrap!important;align-content:flex-start!important}.tt-dot{width:34px!important;height:34px!important;border:0!important;border-radius:50%!important;background:var(--c)!important;color:white!important;font-size:11px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;box-shadow:0 2px 6px #0002!important;font-family:inherit!important}.tt-dot:hover{transform:translateY(-1px) scale(1.05)!important}.tt-more{font-size:12px!important;color:#557269!important;align-self:center!important}
.tt-gantt-wrap{overflow:auto!important;border:1px solid #cddbd6!important;border-radius:13px!important;background:#fff!important}.tt-gantt{min-width:1280px!important}.tt-gantt-head,.tt-gantt-row{display:grid!important;grid-template-columns:70px 280px 180px 1fr!important;min-height:48px!important}.tt-gantt-head{position:sticky!important;top:0!important;z-index:5!important;background:#e7f0ec!important;font-weight:700!important;color:#214b3e!important}.tt-gantt-head>div,.tt-gantt-row>div{border-left:1px solid #dce6e2!important;border-bottom:1px solid #e1e9e6!important;padding:9px!important;box-sizing:border-box!important}.tt-gantt-row{background:#fff!important}.tt-gantt-row:hover{background:#f6faf8!important}.tt-timeline-head,.tt-track{padding:0!important;position:relative!important;direction:rtl!important}.tt-days{display:grid!important;height:100%!important}.tt-dayhead{font-size:11px!important;text-align:center!important;border-left:1px solid #d6e1dd!important;padding-top:12px!important}.tt-track{min-height:48px!important;background-image:linear-gradient(to left,#e5ece9 1px,transparent 1px)!important;background-size:32px 100%!important;overflow:hidden!important}.tt-bar{position:absolute!important;top:12px!important;height:24px!important;border:0!important;border-radius:8px!important;background:var(--c)!important;color:#fff!important;font-family:inherit!important;font-size:11px!important;cursor:pointer!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;padding:2px 8px!important;box-sizing:border-box!important;box-shadow:0 2px 6px #0002!important}.tt-today-line{position:absolute!important;top:0!important;bottom:0!important;width:2px!important;background:#176b4d!important;z-index:2!important;pointer-events:none!important}.tt-empty{padding:50px 20px!important;text-align:center!important;color:#6b7e77!important;border:1px dashed #cbd8d3!important;border-radius:12px!important;background:#fff!important}.tt-legend{justify-content:flex-start!important;gap:22px!important;flex-wrap:wrap!important;margin-top:13px!important;padding:10px 12px!important;border:1px solid #d5e1dd!important;border-radius:10px!important;background:#fff!important}.tt-legend span{display:inline-flex!important;align-items:center!important;gap:7px!important}.tt-legend i{width:12px!important;height:12px!important;border-radius:50%!important;background:var(--c)!important;display:inline-block!important}
@media(max-width:900px){.tt-head{align-items:flex-start!important;flex-direction:column!important}.tt-calendar{grid-template-columns:repeat(7,minmax(92px,1fr))!important}.tt-day{min-height:105px!important}.tt-toolbar{align-items:stretch!important;flex-direction:column!important}.tt-filters>*{flex:1 1 180px!important}}
`;document.head.appendChild(st);
    btn.addEventListener('click',openView);
    q('#ttPrev').onclick=()=>shiftMonth(-1);q('#ttNext').onclick=()=>shiftMonth(1);q('#ttToday').onclick=()=>{month=currentMonth();render()};
    qa('.tt-mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;qa('.tt-mode').forEach(x=>x.classList.toggle('active',x===b));renderBody()});
    q('#ttOwner').onchange=e=>{filters.owner=e.target.value;renderBody()};q('#ttStatus').onchange=e=>{filters.status=e.target.value;renderBody()};q('#ttPriority').onchange=e=>{filters.priority=e.target.value;renderBody()};q('#ttSearch').oninput=e=>{filters.search=e.target.value;renderBody()};
  }
  function shiftMonth(delta){month={...month};month.m+=delta;if(month.m<1){month.m=12;month.y--}if(month.m>12){month.m=1;month.y++}render()}
  function fillFilters(){
    const s=appState(),tasks=activeTasks();
    const owners=(s?.profiles||[]).filter(p=>tasks.some(t=>t.owner_id===p.id));
    const owner=q('#ttOwner'),status=q('#ttStatus'),priority=q('#ttPriority');
    owner.innerHTML='<option value="">همه متولیان</option>'+owners.map(p=>`<option value="${esc(p.id)}">${esc(p.full_name||p.email)}</option>`).join('');owner.value=filters.owner;
    const statuses=[...new Set(tasks.map(t=>String(t.status||'')).filter(Boolean))];status.innerHTML='<option value="">همه وضعیت‌ها</option>'+statuses.map(v=>`<option>${esc(v)}</option>`).join('');status.value=filters.status;
    const priorities=[...new Set(tasks.map(t=>String(t.priority||'')).filter(Boolean))];priority.innerHTML='<option value="">همه اولویت‌ها</option>'+priorities.map(v=>`<option>${esc(v)}</option>`).join('');priority.value=filters.priority;
  }
  function openView(){
    ensure();const view=q('#taskTimelineView');if(!view)return;
    qa('.view').forEach(v=>v.classList.add('hidden'));view.classList.remove('hidden');
    qa('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view==='taskTimeline'));
    const title=q('#viewTitle'),sub=q('#viewSubtitle'),add=q('#addTaskBtn');if(title)title.textContent='تقویم و گانت';if(sub)sub.textContent='نمای زمان‌بندی وظایف جاری';if(add)add.classList.add('hidden');
    if(!month)month=currentMonth();fillFilters();render();
  }
  function render(){if(!month)month=currentMonth();q('#ttMonthLabel').textContent=`${monthNames[month.m-1]} ${faNum(month.y)}`;renderBody()}
  function renderBody(){mode==='gantt'?renderGantt():renderCalendar()}
  function renderCalendar(){
    const body=q('#ttBody'),tasks=filtered(),max=daysInMonth(month.y,month.m),firstIso=isoFor(month.y,month.m,1),firstDay=firstIso?new Date(firstIso+'T12:00:00').getDay():6,offset=(firstDay+1)%7,today=currentMonth();
    const byDay={};tasks.forEach(t=>{const iso=t.due_date||t.start_date;if(!iso)return;const d=dateIndex(iso,month.y,month.m);if(d)(byDay[d]||(byDay[d]=[])).push(t)});
    let html='<div class="tt-calendar">'+weekNames.map(x=>`<div class="tt-week">${x}</div>`).join('');
    for(let i=0;i<offset;i++)html+='<div class="tt-day other"></div>';
    for(let d=1;d<=max;d++){
      const arr=byDay[d]||[],todayClass=today.y===month.y&&today.m===month.m&&today.d===d?' today':'';
      html+=`<div class="tt-day${todayClass}"><div class="tt-day-num">${faNum(d)}</div><div class="tt-dots">${arr.slice(0,7).map(t=>`<button class="tt-dot" style="--c:${colorFor(t)}" data-task="${t.id}" title="#${esc(taskId(t))} — ${esc(t.title)}\nمتولی: ${esc(ownerNameLocal(t))}\nاولویت: ${esc(t.priority)}">${faNum(taskId(t))}</button>`).join('')}${arr.length>7?`<span class="tt-more">+${faNum(arr.length-7)}</span>`:''}</div></div>`;
    }
    while((offset+max)%7!==0){html+='<div class="tt-day other"></div>';max===0; if((++max)>40)break}
    html+='</div>';body.innerHTML=html;qa('.tt-dot',body).forEach(b=>b.onclick=()=>{const t=activeTasks().find(x=>String(x.id)===b.dataset.task);if(t)openKanban(t)});
  }
  function renderGantt(){
    const body=q('#ttBody'),tasks=filtered(),range=monthIsoRange(),max=range.max,dayW=32,startMs=range.start?new Date(range.start+'T12:00:00').getTime():0,endMs=range.end?new Date(range.end+'T12:00:00').getTime():0;
    const rows=tasks.filter(t=>{const a=t.start_date||t.due_date,b=t.due_date||t.start_date;if(!a||!b)return false;const am=new Date(a+'T12:00:00').getTime(),bm=new Date(b+'T12:00:00').getTime();return bm>=startMs&&am<=endMs}).sort((a,b)=>String(a.due_date||a.start_date).localeCompare(String(b.due_date||b.start_date)));
    if(!rows.length){body.innerHTML='<div class="tt-empty">در این ماه وظیفه زمان‌دار مطابق فیلترها وجود ندارد.</div>';return}
    const today=currentMonth(),todayIndex=today.y===month.y&&today.m===month.m?today.d-1:null,days=Array.from({length:max},(_,i)=>i+1);
    let html=`<div class="tt-gantt-wrap"><div class="tt-gantt"><div class="tt-gantt-head"><div>شناسه</div><div>عنوان فعالیت</div><div>متولی</div><div class="tt-timeline-head"><div class="tt-days" style="grid-template-columns:repeat(${max},${dayW}px)">${days.map(d=>`<div class="tt-dayhead">${faNum(d)}</div>`).join('')}</div></div></div>`;
    for(const t of rows){
      const a=t.start_date||t.due_date,b=t.due_date||t.start_date,as=Math.max(startMs,new Date(a+'T12:00:00').getTime()),bs=Math.min(endMs,new Date(b+'T12:00:00').getTime()),start=Math.max(0,Math.round((as-startMs)/86400000)),span=Math.max(1,Math.round((bs-as)/86400000)+1);
      html+=`<div class="tt-gantt-row"><div>${faNum(taskId(t))}</div><div title="${esc(t.title)}">${esc(t.title)}</div><div>${esc(ownerNameLocal(t))}</div><div class="tt-track" style="width:${max*dayW}px">${todayIndex!==null?`<i class="tt-today-line" style="right:${todayIndex*dayW+dayW/2}px"></i>`:''}<button class="tt-bar" data-task="${t.id}" style="--c:${colorFor(t)};right:${start*dayW+2}px;width:${Math.max(28,span*dayW-4)}px" title="#${esc(taskId(t))} — ${esc(t.title)}\n${esc(t.priority)}">${faNum(taskId(t))}</button></div></div>`;
    }
    html+='</div></div>';body.innerHTML=html;qa('.tt-bar',body).forEach(b=>b.onclick=()=>{const t=activeTasks().find(x=>String(x.id)===b.dataset.task);if(t)openKanban(t)});
  }
  function boot(){ensure();month=currentMonth()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,30),{once:true});else setTimeout(boot,30);
})();