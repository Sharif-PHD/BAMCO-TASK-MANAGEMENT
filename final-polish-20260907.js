(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toEn=s=>Number(String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^0-9.-]/g,''))||0;

  const ICONS={
    login:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>`,
    tasks:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10l1.6 1.6L13 8.8M8.5 15l1.6 1.6L13 13.8M15 10h1.5M15 15h1.5"/></svg>`,
    email:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>`,
    vehicle:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14l-1.3-5.2A2.4 2.4 0 0 0 15.4 9H8.6a2.4 2.4 0 0 0-2.3 1.8L5 16Zm-1 0v2.2c0 .4.4.8.8.8H6m12 0h1.2c.4 0 .8-.4.8-.8V16M7 13h.01M17 13h.01"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3.8 10 2h4l.5 1.8 1.8.8 1.7-.9 2.8 2.8-.9 1.7.8 1.8 1.8.5v4l-1.8.5-.8 1.8.9 1.7-2.8 2.8-1.7-.9-1.8.8L14 22h-4l-.5-1.8-1.8-.8-1.7.9-2.8-2.8.9-1.7-.8-1.8-1.8-.5v-4l1.8-.5.8-1.8-.9-1.7L6 3.7l1.7.9 1.8-.8Z"/><circle cx="12" cy="12" r="3"/></svg>`
  };

  function injectStyle(){
    let style=q('#bamcoFinalPolishStyle');
    if(!style){style=document.createElement('style');style.id='bamcoFinalPolishStyle';document.head.appendChild(style)}
    style.textContent=`
      /* Sidebar: one icon system, no arrows and no section separator lines. */
      html body #appView #sidebar #nav>.nav-group,
      html body #appView #sidebar #nav>.nav-settings-root{border:0!important;border-top:0!important;border-bottom:0!important;box-shadow:none!important}
      html body #appView #sidebar #nav .nav-chevron{display:none!important;width:0!important;min-width:0!important;margin:0!important;padding:0!important}
      html body #appView #sidebar #nav>.nav-login-root::after,
      html body #appView #sidebar #nav>.nav-settings-root::after,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle::before,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle::after{content:none!important;display:none!important}
      html body #appView #sidebar #nav>.nav-login-root,
      html body #appView #sidebar #nav>.nav-settings-root,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle{
        display:grid!important;grid-template-columns:28px minmax(0,1fr)!important;gap:10px!important;
        width:100%!important;height:48px!important;min-height:48px!important;margin:0!important;padding:7px 10px!important;
        align-items:center!important;box-sizing:border-box!important;border:0!important;
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
        font-size:17px!important;line-height:1.25!important;font-weight:700!important;text-align:right!important
      }
      html body #appView #sidebar #nav>.nav-login-root>b,
      html body #appView #sidebar #nav>.nav-settings-root>b,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle>.nav-group-icon{
        width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;
        display:flex!important;align-items:center!important;justify-content:center!important;margin:0!important;padding:0!important;
        font-size:0!important;line-height:1!important;color:currentColor!important
      }
      html body #appView #sidebar #nav .bamco-top-icon svg{
        width:20px!important;height:20px!important;display:block!important;fill:none!important;stroke:currentColor!important;
        stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important
      }

      /* Kanban/archive section title: identical legend-on-border treatment to the other tabs. */
      html body #appView #kanbanView>.table-panel,
      html body #appView #archiveView>.table-panel{
        position:relative!important;margin:18px 0 14px!important;padding:28px 16px 16px!important;
        border:1px solid #b8c8c1!important;border-radius:10px!important;background:#f8faf9!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head,
      html body #appView #archiveView .table-panel>.panel-head{
        position:static!important;display:block!important;height:0!important;min-height:0!important;
        margin:0!important;padding:0!important;border:0!important;background:transparent!important;overflow:visible!important;flex:0 0 0!important
      }
      html body #appView #kanbanView .table-panel>.panel-head>div:first-child,
      html body #appView #archiveView .table-panel>.panel-head>div:first-child{
        position:absolute!important;top:-15px!important;right:18px!important;z-index:6!important;
        display:block!important;width:auto!important;max-width:calc(100% - 36px)!important;
        margin:0!important;padding:0 10px!important;background:#eef3f0!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head h3,
      html body #appView #archiveView .table-panel>.panel-head h3{
        position:static!important;margin:0!important;padding:0!important;color:#145741!important;
        font-size:18px!important;line-height:1.7!important;font-weight:700!important;white-space:nowrap!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head small,
      html body #appView #archiveView .table-panel>.panel-head small{display:none!important}

      /* Toolbar: closed search input occupies zero layout space, so every button has the same 10px gap. */
      html body #appView #kanbanView .task-toolbar,
      html body #appView #archiveView .task-toolbar{
        display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;
        gap:10px!important;column-gap:10px!important;row-gap:10px!important;margin:0 0 12px!important;padding:0!important;
        overflow-x:auto!important;background:transparent!important;border:0!important
      }
      html body #appView #kanbanView .task-toolbar>*,
      html body #appView #archiveView .task-toolbar>*{margin:0!important}
      html body #appView #kanbanView .task-toolbar button,
      html body #appView #archiveView .task-toolbar button{flex:0 0 auto!important}
      html body #appView #kanbanView .toolbar-search:not(.search-open),
      html body #appView #archiveView .toolbar-search:not(.search-open){display:none!important}
      html body #appView #kanbanView .toolbar-search.search-open,
      html body #appView #archiveView .toolbar-search.search-open{
        display:block!important;flex:0 0 270px!important;width:270px!important;min-width:270px!important;max-width:270px!important;
        opacity:1!important;pointer-events:auto!important
      }

      /* Task tables: exactly header + filter row. Remove sticky positioning that created the visual blank row. */
      html body #appView #kanbanView .table-wrap table,
      html body #appView #archiveView .table-wrap table{border-spacing:0!important;border-collapse:collapse!important}
      html body #appView #kanbanView thead,
      html body #appView #archiveView thead{display:table-header-group!important;position:static!important;height:auto!important}
      html body #appView #kanbanView thead>tr,
      html body #appView #archiveView thead>tr{position:static!important;transform:none!important}
      html body #appView #kanbanView thead>tr:first-child,
      html body #appView #archiveView thead>tr:first-child,
      html body #appView #kanbanView thead>tr.column-filters,
      html body #appView #archiveView thead>tr.column-filters{display:table-row!important;height:auto!important;min-height:0!important}
      html body #appView #kanbanView thead>tr:not(:first-child):not(.column-filters),
      html body #appView #archiveView thead>tr:not(:first-child):not(.column-filters){display:none!important;height:0!important;min-height:0!important}
      html body #appView #kanbanView thead th,
      html body #appView #archiveView thead th{
        position:static!important;top:auto!important;bottom:auto!important;transform:none!important;
        min-height:0!important;box-sizing:border-box!important
      }
      html body #appView #kanbanView thead>tr:first-child>th,
      html body #appView #archiveView thead>tr:first-child>th{height:52px!important;padding-top:8px!important;padding-bottom:8px!important;vertical-align:middle!important}
      html body #appView #kanbanView .column-filters>th,
      html body #appView #archiveView .column-filters>th{
        height:46px!important;padding:5px 6px!important;vertical-align:middle!important;background:#eef4f1!important
      }
      html body #appView #kanbanView table>colgroup>col:first-child,
      html body #appView #archiveView table>colgroup>col:first-child{width:82px!important;min-width:82px!important;max-width:82px!important}
      html body #appView #kanbanView thead th:first-child,
      html body #appView #kanbanView tbody td:first-child,
      html body #appView #archiveView thead th:first-child,
      html body #appView #archiveView tbody td:first-child{
        width:82px!important;min-width:82px!important;max-width:82px!important;
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;font-size:15px!important;
        text-align:right!important;direction:rtl!important;white-space:nowrap!important
      }
      html body #appView #kanbanView .column-filters>th:first-child select,
      html body #appView #archiveView .column-filters>th:first-child select{
        display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;height:34px!important;
        padding:3px 20px 3px 5px!important;font-size:14px!important;direction:rtl!important;text-align:right!important
      }
    `;
  }

  function setIcon(el,svg){if(!el)return;el.classList.add('bamco-top-icon');el.innerHTML=svg}
  function polishSidebar(){
    const nav=q('#nav');if(!nav)return;
    qa('.nav-chevron',nav).forEach(x=>x.remove());
    setIcon(q(':scope>.nav-login-root>b',nav),ICONS.login);
    qa(':scope>.nav-group',nav).forEach(g=>{
      const key=g.dataset.group||g.dataset.navGroup||'';
      const icon=q('.nav-group-toggle>.nav-group-icon',g);
      if(key==='tasks')setIcon(icon,ICONS.tasks);
      if(key==='email')setIcon(icon,ICONS.email);
      if(key==='vehicle')setIcon(icon,ICONS.vehicle);
    });
    setIcon(q(':scope>.nav-settings-root>b',nav),ICONS.settings);
  }

  function clearBadFiltersOnce(){
    if(window.__bamcoFilterMapReset20260907V3)return;
    window.__bamcoFilterMapReset20260907V3=true;
    try{
      for(const scope of ['kanban','archive']){
        const f=tableFilters?.[scope];if(!f)continue;
        Object.keys(f).forEach(k=>delete f[k]);
      }
    }catch{}
  }

  function stripSelection(table){
    const header=q('thead>tr:first-child',table);if(!header)return;
    const idx=[...header.cells].findIndex(th=>(th.childNodes[0]?.textContent||th.textContent||'').trim()==='انتخاب');
    if(idx<0)return;
    header.deleteCell(idx);
    const filter=q('thead>tr.column-filters',table);if(filter&&filter.cells[idx])filter.deleteCell(idx);
    qa('tbody>tr',table).forEach(row=>{if(row.cells[idx])row.deleteCell(idx)});
  }

  function sanitizeTable(scope){
    const view=q(`#${scope}View`),table=q('.table-wrap table',view);if(!table)return null;
    stripSelection(table);
    const thead=table.tHead||q('thead',table);if(!thead)return null;
    let header=[...thead.rows].find(row=>[...row.cells].some(c=>(c.textContent||'').trim()==='شناسه'))||thead.rows[0];
    if(!header)return null;
    let filter=q('tr.column-filters',thead);
    if(!filter){filter=document.createElement('tr');filter.className='column-filters'}
    [...thead.rows].forEach(row=>{if(row!==header&&row!==filter)row.remove()});
    if(thead.rows[0]!==header)thead.insertBefore(header,thead.firstChild);
    if(filter.parentNode!==thead||thead.rows[1]!==filter)thead.appendChild(filter);
    const count=header.cells.length;
    while(filter.cells.length>count)filter.deleteCell(filter.cells.length-1);
    while(filter.cells.length<count){const th=document.createElement('th');th.innerHTML='<select><option value="">همه</option></select>';filter.appendChild(th)}
    [...header.cells,...filter.cells].forEach(th=>{th.style.setProperty('position','static','important');th.style.setProperty('top','auto','important')});
    [...filter.cells].forEach((th,i)=>{
      let sel=q('select',th);if(!sel){sel=document.createElement('select');th.appendChild(sel)}
      sel.disabled=false;sel.dataset.columnIndex=String(i);sel.title=`فیلتر ${(header.cells[i]?.textContent||'').trim()}`;
    });
    const col=q(':scope>colgroup>col:first-child',table);
    if(col){col.style.setProperty('width','82px','important');col.style.setProperty('min-width','82px','important');col.style.setProperty('max-width','82px','important')}
    return {table,header,filter,count};
  }

  function valuesForTask(t,archived){
    try{if(typeof taskColumnValues==='function')return taskColumnValues(t,archived)}catch{}
    try{
      const waiting=String(t.status||'').trim()==='منتظر پاسخ';
      const due=String(t.due_state||'').trim();
      const dueText=waiting?'فاقد شرایط دیرکرد':due==='دیرکرد'?'دیرکرد':due.includes('هشدار')?'دوره هشدار':'فاقد شرایط دیرکرد';
      const base=[fa(displayId(t)),t.title||'',t.description||'',ownerName(t),t.status||'',t.priority||'',jalaliText(t.start_date),jalaliText(t.done_date),jalaliText(waiting?null:t.due_date),fa(waiting?0:t.reminder_days),jalaliDateTime(t.last_updated_at),dueText,t.manager_notes||''];
      return archived?[...base,fa(t.delay_days||0),fa(t.advance_days||0)]:base;
    }catch{return []}
  }

  function stableUpdateColumnFilters(scope,rows,archived){
    const meta=sanitizeTable(scope);if(!meta)return;
    let filters={};try{filters=tableFilters[scope]||{}}catch{}
    [...meta.filter.cells].forEach((th,i)=>{
      const sel=q('select',th);if(!sel)return;
      const vals=[...new Set((rows||[]).map(t=>String(valuesForTask(t,archived)[i]??'')).filter(v=>v&&v!=='—'))];
      vals.sort(i===0?(a,b)=>toEn(a)-toEn(b):(a,b)=>a.localeCompare(b,'fa',{numeric:true,sensitivity:'base'}));
      let current=String(filters[i]??'');
      if(current&&!vals.includes(current)){delete filters[i];current=''}
      const html='<option value="">همه</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
      if(sel.innerHTML!==html)sel.innerHTML=html;
      sel.value=current;sel.disabled=false;
    });
  }

  function installFilterOverride(){
    try{window.updateColumnFilters=stableUpdateColumnFilters;updateColumnFilters=stableUpdateColumnFilters}catch{}
    sanitizeTable('kanban');sanitizeTable('archive');
  }

  function fixWording(){
    const add=q('#addTaskBtn');if(add)add.textContent='＋ افزودن وظیفه';
    for(const el of [q('#taskDialogTitle'),q('#saveTaskBtn')]){
      if(el&&el.textContent.includes('تسک'))el.textContent=el.textContent.replace(/تسک/g,'وظیفه');
    }
    const k=q('#kanbanView .panel-head h3');if(k)k.textContent='وظایف جاری';
    const a=q('#archiveView .panel-head h3');if(a)a.textContent='وظایف آرشیو شده';
  }

  function rerenderOnce(){
    if(window.__bamcoRerenderAfterTableFixV3)return;
    try{
      if(typeof state==='undefined'||!Array.isArray(state.tasks)||!state.tasks.length||typeof renderTasks!=='function')return;
      window.__bamcoRerenderAfterTableFixV3=true;
      renderTasks(false);renderTasks(true);
    }catch{}
  }

  function run(){
    injectStyle();polishSidebar();clearBadFiltersOnce();installFilterOverride();fixWording();rerenderOnce();
  }

  function installObservers(){
    for(const scope of ['kanban','archive']){
      const thead=q(`#${scope}View thead`);if(thead&&!thead.dataset.bamcoFinalVerifyV3){
        thead.dataset.bamcoFinalVerifyV3='1';
        let queued=false;
        new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sanitizeTable(scope)})}).observe(thead,{childList:true});
      }
    }
    const dialog=q('#taskDialog');if(dialog&&!dialog.dataset.bamcoWordingVerifyV3){
      dialog.dataset.bamcoWordingVerifyV3='1';
      let queued=false;
      new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fixWording()})}).observe(dialog,{childList:true,subtree:true,characterData:true});
    }
    const nav=q('#nav');if(nav&&!nav.dataset.bamcoSidebarVerifyV3){
      nav.dataset.bamcoSidebarVerifyV3='1';
      let queued=false;
      new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polishSidebar()})}).observe(nav,{childList:true,subtree:true});
    }
  }

  function boot(){
    run();installObservers();
    [120,350,700,1200,1900,2800,4200].forEach(ms=>setTimeout(()=>{run();installObservers()},ms));
    document.addEventListener('click',e=>{
      if(e.target.closest('#nav button,[data-view="kanban"],[data-view="archive"],#addTaskBtn'))setTimeout(()=>{run();installObservers()},40);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();