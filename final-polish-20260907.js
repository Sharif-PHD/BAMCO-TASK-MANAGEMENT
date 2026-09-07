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
    if(q('#bamcoFinalPolishStyle'))return;
    const style=document.createElement('style');
    style.id='bamcoFinalPolishStyle';
    style.textContent=`
      /* Top-level sidebar rows: no arrows, no separators, one optical icon system. */
      html body #appView #sidebar #nav>.nav-group{border:0!important;border-bottom:0!important;box-shadow:none!important}
      html body #appView #sidebar #nav>.nav-settings-root{border:0!important;border-top:0!important}
      html body #appView #sidebar #nav>.nav-login-root::after,
      html body #appView #sidebar #nav>.nav-settings-root::after,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle::after,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle::before{content:none!important;display:none!important}
      html body #appView #sidebar #nav .nav-chevron{display:none!important;width:0!important;min-width:0!important;margin:0!important;padding:0!important}
      html body #appView #sidebar #nav>.nav-login-root,
      html body #appView #sidebar #nav>.nav-settings-root,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle{
        display:grid!important;
        grid-template-columns:28px minmax(0,1fr)!important;
        gap:10px!important;
        width:100%!important;
        height:48px!important;
        min-height:48px!important;
        padding:7px 10px!important;
        margin:0!important;
        align-items:center!important;
        box-sizing:border-box!important;
        border:0!important;
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
        font-size:17px!important;
        line-height:1.25!important;
        font-weight:700!important;
        text-align:right!important;
      }
      html body #appView #sidebar #nav>.nav-login-root>b,
      html body #appView #sidebar #nav>.nav-settings-root>b,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle>.nav-group-icon{
        width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;
        display:flex!important;align-items:center!important;justify-content:center!important;
        margin:0!important;padding:0!important;font-size:0!important;line-height:1!important;color:currentColor!important
      }
      html body #appView #sidebar #nav .bamco-top-icon svg{
        width:20px!important;height:20px!important;display:block!important;overflow:visible!important;
        fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important
      }
      html body #appView #sidebar #nav>.nav-login-root .bamco-top-icon svg path:first-child{fill:none!important}
      html body #appView #sidebar #nav>.nav-group>.nav-group-items{border:0!important}

      /* Kanban/archive framed heading is fully visible inside the box. */
      html body #appView #kanbanView>.table-panel,
      html body #appView #archiveView>.table-panel{
        margin:12px 0 14px!important;
        padding:12px 16px 16px!important;
        overflow:visible!important;
      }
      html body #appView #kanbanView .table-panel>.panel-head,
      html body #appView #archiveView .table-panel>.panel-head{
        position:relative!important;display:flex!important;align-items:center!important;
        min-height:34px!important;height:34px!important;margin:0 0 10px!important;padding:0!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head>div:first-child,
      html body #appView #archiveView .table-panel>.panel-head>div:first-child{
        position:static!important;inset:auto!important;display:block!important;width:auto!important;max-width:none!important;
        margin:0!important;padding:0!important;background:transparent!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head h3,
      html body #appView #archiveView .table-panel>.panel-head h3{
        position:static!important;inset:auto!important;display:block!important;margin:0!important;padding:0!important;
        font-size:18px!important;line-height:1.8!important;white-space:nowrap!important;overflow:visible!important
      }

      /* Toolbar: fixed, even gaps and no phantom width from the closed search field. */
      html body #appView #kanbanView .task-toolbar,
      html body #appView #archiveView .task-toolbar{
        display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;
        gap:10px!important;column-gap:10px!important;row-gap:10px!important;margin:0 0 12px!important;padding:0!important;overflow-x:auto!important
      }
      html body #appView #kanbanView .task-toolbar>*,
      html body #appView #archiveView .task-toolbar>*{margin:0!important}
      html body #appView #kanbanView .task-toolbar button,
      html body #appView #archiveView .task-toolbar button{flex:0 0 auto!important}
      html body #appView #kanbanView .toolbar-search:not(.search-open),
      html body #appView #archiveView .toolbar-search:not(.search-open){
        flex:0 0 0!important;width:0!important;min-width:0!important;max-width:0!important;padding:0!important;border-width:0!important;opacity:0!important;pointer-events:none!important
      }
      html body #appView #kanbanView .toolbar-search.search-open,
      html body #appView #archiveView .toolbar-search.search-open{flex:0 0 270px!important;width:270px!important;min-width:270px!important;max-width:270px!important;opacity:1!important;pointer-events:auto!important}

      /* Exactly two header rows; compact but usable ID filter. */
      html body #appView #kanbanView thead>tr:not(:first-child):not(.column-filters),
      html body #appView #archiveView thead>tr:not(:first-child):not(.column-filters){display:none!important;height:0!important}
      html body #appView #kanbanView .column-filters,
      html body #appView #archiveView .column-filters{height:auto!important;min-height:0!important}
      html body #appView #kanbanView .column-filters>th,
      html body #appView #archiveView .column-filters>th{height:46px!important;padding:5px 6px!important;vertical-align:middle!important}
      html body #appView #kanbanView .column-filters>th:first-child,
      html body #appView #archiveView .column-filters>th:first-child{width:76px!important;min-width:76px!important;max-width:76px!important}
      html body #appView #kanbanView .column-filters>th:first-child select,
      html body #appView #archiveView .column-filters>th:first-child select{
        display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;
        padding-right:5px!important;padding-left:16px!important;font-size:13px!important;text-align:right!important;direction:rtl!important
      }
    `;
    document.head.appendChild(style);
  }

  function setIcon(el,svg){
    if(!el)return;
    el.classList.add('bamco-top-icon');
    el.innerHTML=svg;
  }

  function polishSidebar(){
    const nav=q('#nav');if(!nav)return;
    qa('.nav-chevron',nav).forEach(x=>x.remove());
    setIcon(q(':scope>.nav-login-root>b',nav),ICONS.login);
    const groups=qa(':scope>.nav-group',nav);
    for(const g of groups){
      const key=g.dataset.group||g.dataset.navGroup||'';
      const icon=q('.nav-group-toggle>.nav-group-icon',g);
      if(key==='tasks')setIcon(icon,ICONS.tasks);
      else if(key==='email')setIcon(icon,ICONS.email);
      else if(key==='vehicle')setIcon(icon,ICONS.vehicle);
    }
    setIcon(q(':scope>.nav-settings-root>b',nav),ICONS.settings);
  }

  function stripSelectionColumn(table){
    const header=q('thead>tr:first-child',table);if(!header)return;
    const heads=[...header.cells];
    const idx=heads.findIndex(th=>(th.childNodes[0]?.textContent||th.textContent||'').trim()==='انتخاب');
    if(idx<0)return;
    header.cells[idx]?.remove();
    const filter=q('thead>.column-filters',table);filter?.cells[idx]?.remove();
    qa('tbody>tr',table).forEach(row=>row.cells[idx]?.remove());
  }

  function sanitizeTable(scope){
    const view=q(`#${scope}View`),table=q('.table-wrap table',view);if(!table)return null;
    stripSelectionColumn(table);
    const thead=table.tHead||q('thead',table);if(!thead)return null;
    let header=thead.rows[0];if(!header)return null;
    let filter=q('tr.column-filters',thead);
    if(!filter){filter=document.createElement('tr');filter.className='column-filters'}
    [...thead.rows].forEach(row=>{if(row!==header&&row!==filter)row.remove()});
    if(filter.parentNode!==thead)thead.appendChild(filter);else if(thead.rows[1]!==filter)thead.appendChild(filter);
    const count=header.cells.length;
    while(filter.cells.length>count)filter.deleteCell(filter.cells.length-1);
    while(filter.cells.length<count){const th=document.createElement('th');th.innerHTML='<select><option value="">همه</option></select>';filter.appendChild(th)}
    [...filter.cells].forEach((th,i)=>{
      let sel=q('select',th);if(!sel){sel=document.createElement('select');th.appendChild(sel)}
      sel.disabled=false;sel.dataset.columnIndex=String(i);sel.title=`فیلتر ${(header.cells[i]?.textContent||'').trim()}`;
    });
    /* Give ID just enough room for an actual dropdown instead of an arrow-only control. */
    try{
      const key=`bamco-${scope}-column-widths-v5`,saved=JSON.parse(localStorage.getItem(key)||'{}')||{};
      if(Number(saved['شناسه']||0)<76){saved['شناسه']=76;localStorage.setItem(key,JSON.stringify(saved))}
    }catch{}
    const col=table.querySelector(':scope>colgroup>col:first-child');
    if(col){col.style.setProperty('width','76px','important');col.style.setProperty('min-width','76px','important');col.style.setProperty('max-width','76px','important')}
    return {table,header,filter,count};
  }

  function valuesForTask(t,archived){
    try{
      if(typeof taskColumnValues==='function')return taskColumnValues(t,archived);
    }catch{}
    return [];
  }

  function finalUpdateColumnFilters(scope,rows,archived){
    const meta=sanitizeTable(scope);if(!meta)return;
    let filters={};try{filters=tableFilters[scope]||{}}catch{}
    [...meta.filter.cells].forEach((th,i)=>{
      const sel=q('select',th);if(!sel)return;
      const current=String(filters[i]??'');
      const vals=[...new Set((rows||[]).map(t=>String(valuesForTask(t,archived)[i]??'')).filter(v=>v&&v!=='—'))];
      vals.sort(i===0?(a,b)=>toEn(a)-toEn(b):(a,b)=>a.localeCompare(b,'fa',{numeric:true,sensitivity:'base'}));
      sel.innerHTML='<option value="">همه</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
      sel.value=current;sel.disabled=false;
    });
  }

  function installFilterOverride(){
    try{window.updateColumnFilters=finalUpdateColumnFilters;updateColumnFilters=finalUpdateColumnFilters}catch{}
    for(const scope of ['kanban','archive'])sanitizeTable(scope);
    try{
      if(typeof state!=='undefined'&&Array.isArray(state.tasks)&&state.tasks.length){
        if(typeof renderTasks==='function'){renderTasks(false);renderTasks(true)}
      }
    }catch{}
  }

  function fixWording(){
    const add=q('#addTaskBtn');if(add)add.textContent='＋ افزودن وظیفه';
    const title=q('#taskDialogTitle');if(title&&title.textContent.includes('تسک'))title.textContent=title.textContent.replace(/تسک/g,'وظیفه');
    const save=q('#saveTaskBtn');if(save&&save.textContent.includes('تسک'))save.textContent=save.textContent.replace(/تسک/g,'وظیفه');
    const k=q('#kanbanView .panel-head h3');if(k)k.textContent='وظایف جاری';
    const a=q('#archiveView .panel-head h3');if(a)a.textContent='وظایف آرشیو شده';
  }

  function installObservers(){
    const nav=q('#nav');if(nav&&nav.dataset.finalPolishObserved!=='1'){
      nav.dataset.finalPolishObserved='1';
      let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polishSidebar()})}).observe(nav,{childList:true,subtree:true});
    }
    for(const scope of ['kanban','archive']){
      const view=q(`#${scope}View`);if(!view||view.dataset.finalTableObserved==='1')continue;
      view.dataset.finalTableObserved='1';
      let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sanitizeTable(scope)})}).observe(view,{childList:true,subtree:true});
    }
    const dialog=q('#taskDialog');if(dialog&&dialog.dataset.wordingObserved!=='1'){
      dialog.dataset.wordingObserved='1';
      new MutationObserver(fixWording).observe(dialog,{childList:true,subtree:true,characterData:true});
    }
  }

  function run(){injectStyle();polishSidebar();installFilterOverride();fixWording();installObservers()}
  function boot(){run();[120,400,900,1600,2600].forEach(ms=>setTimeout(run,ms))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
