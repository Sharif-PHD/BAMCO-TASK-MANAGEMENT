(function(){
  'use strict';

  window.BAMCO_FAST_TASK_TABLES=true;

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];

  /* Keep the approved unified visual language, while this module alone owns task-table geometry. */
  setTimeout(()=>{
    if(!document.getElementById('bamcoUnifiedUi')){
      const link=document.createElement('link');
      link.id='bamcoUnifiedUi';
      link.rel='stylesheet';
      link.href='unified-ui-20260907.css?v=20260907-core1';
      document.head.appendChild(link);
    }
    if(!document.getElementById('bamcoTaskTableCoreStyle')){
      const style=document.createElement('style');
      style.id='bamcoTaskTableCoreStyle';
      style.textContent=`
        #appView #kanbanView,
        #appView #archiveView{
          height:calc(100dvh - 58px - var(--footer-h,34px))!important;
          max-height:calc(100dvh - 58px - var(--footer-h,34px))!important;
          overflow:hidden!important;
          box-sizing:border-box!important;
        }
        #appView #kanbanView>.table-panel,
        #appView #archiveView>.table-panel{
          height:calc(100% - 32px)!important;
          max-height:calc(100% - 32px)!important;
          min-height:0!important;
          display:flex!important;
          flex-direction:column!important;
          box-sizing:border-box!important;
        }
        #appView #kanbanView .table-wrap,
        #appView #archiveView .table-wrap{
          flex:1 1 auto!important;
          min-height:0!important;
          height:auto!important;
          max-height:none!important;
          overflow:auto!important;
          box-sizing:border-box!important;
          border:1px solid #b8c8c1!important;
          border-radius:10px!important;
          background:#fff!important;
        }
        #appView #kanbanView table.resizable-task-table,
        #appView #archiveView table.resizable-task-table{
          width:max-content!important;
          min-width:0!important;
          max-width:none!important;
          table-layout:fixed!important;
          border-collapse:collapse!important;
          border-spacing:0!important;
          direction:rtl!important;
          background:#fff!important;
        }
        #appView #kanbanView table.resizable-task-table thead,
        #appView #archiveView table.resizable-task-table thead{display:table-header-group!important}
        #appView #kanbanView table.resizable-task-table thead>tr,
        #appView #archiveView table.resizable-task-table thead>tr{display:table-row!important;height:auto!important;transform:none!important}
        #appView #kanbanView table.resizable-task-table thead>tr:not(:first-child):not(.column-filters),
        #appView #archiveView table.resizable-task-table thead>tr:not(:first-child):not(.column-filters){display:none!important}
        #appView #kanbanView table.resizable-task-table th,
        #appView #archiveView table.resizable-task-table th{
          position:relative!important;
          top:auto!important;
          min-width:0!important;
          max-width:none!important;
          white-space:nowrap!important;
          overflow:visible!important;
          text-overflow:clip!important;
          vertical-align:middle!important;
          box-sizing:border-box!important;
          font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
          font-size:15px!important;
          line-height:1.5!important;
          text-align:center!important;
          direction:rtl!important;
        }
        #appView #kanbanView table.resizable-task-table td,
        #appView #archiveView table.resizable-task-table td{
          min-width:0!important;
          max-width:none!important;
          white-space:normal!important;
          overflow:visible!important;
          text-overflow:clip!important;
          overflow-wrap:anywhere!important;
          word-break:normal!important;
          line-height:1.75!important;
          vertical-align:top!important;
          box-sizing:border-box!important;
          font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
          font-size:15px!important;
          direction:rtl!important;
          text-align:right!important;
        }
        #appView #kanbanView table.resizable-task-table th:first-child,
        #appView #archiveView table.resizable-task-table th:first-child{
          width:auto!important;min-width:0!important;max-width:none!important;
          padding-right:6px!important;padding-left:6px!important;
          font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
          font-size:15px!important;font-weight:700!important;text-align:center!important;direction:rtl!important
        }
        #appView #kanbanView table.resizable-task-table td:first-child,
        #appView #archiveView table.resizable-task-table td:first-child{
          width:auto!important;min-width:0!important;max-width:none!important;
          padding-right:8px!important;padding-left:5px!important;
          font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
          font-size:15px!important;text-align:right!important;direction:rtl!important;white-space:nowrap!important
        }
        #appView #kanbanView .column-filters>th,
        #appView #archiveView .column-filters>th{
          position:static!important;
          height:46px!important;
          padding:5px 6px!important;
          vertical-align:middle!important;
          background:#eef4f1!important;
          box-sizing:border-box!important
        }
        #appView #kanbanView .column-filters select,
        #appView #archiveView .column-filters select{
          display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;
          height:34px!important;min-height:34px!important;margin:0!important;
          padding:3px 22px 3px 6px!important;box-sizing:border-box!important;
          border:1px solid #b8c8c1!important;border-radius:7px!important;background-color:#fff!important;
          background-position:4px center!important;background-size:12px!important;
          font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
          font-size:14px!important;direction:rtl!important;text-align:right!important
        }
        #appView #kanbanView .column-filters>th:first-child select,
        #appView #archiveView .column-filters>th:first-child select{padding-right:5px!important;padding-left:18px!important;text-align:center!important}
        #appView #kanbanView .task-select-column,
        #appView #archiveView .task-select-column,
        #appView #kanbanView .task-pick,
        #appView #archiveView .task-pick{display:none!important}
        #appView table.resizable-task-table .column-resize-handle{
          position:absolute!important;top:0!important;bottom:0!important;left:-5px!important;width:10px!important;
          cursor:col-resize!important;z-index:40!important;touch-action:none!important;user-select:none!important;background:transparent!important
        }
        #appView table.resizable-task-table .column-resize-handle::after{
          content:"";position:absolute;top:7px;bottom:7px;left:4px;width:1px;background:transparent
        }
        #appView table.resizable-task-table .column-resize-handle:hover::after,
        #appView table.resizable-task-table .column-resize-handle.dragging::after{background:#4f8d77!important}
        #appView #kanbanView tbody tr[data-task-id],
        #appView #archiveView tbody tr[data-task-id]{cursor:pointer!important}
      `;
      document.head.appendChild(style);
    }
  },0);

  document.addEventListener('change',event=>{
    if(event.target?.id!=='dteFont')return;
    const body=qs('#dteBody');
    if(body)body.style.setProperty('font-family',`"${event.target.value}",sans-serif`,'important');
  });

  const WIDTHS={
    'شناسه':82,
    'عنوان فعالیت':220,
    'توضیحات':340,
    'متولی':175,
    'وضعیت':135,
    'اولویت':90,
    'تاریخ شروع':118,
    'تاریخ انجام':118,
    'تاریخ پایان':118,
    'یادآور':82,
    'آخرین به‌روزرسانی':165,
    'وضعیت دیرکرد':138,
    'توضیحات مدیر':285,
    'تأخیر':82,
    'تعجیل':82
  };
  const MIN_WIDTHS={
    'شناسه':56,'عنوان فعالیت':150,'توضیحات':190,'متولی':120,'وضعیت':100,'اولویت':72,
    'تاریخ شروع':96,'تاریخ انجام':96,'تاریخ پایان':96,'یادآور':68,'آخرین به‌روزرسانی':125,
    'وضعیت دیرکرد':105,'توضیحات مدیر':170,'تأخیر':64,'تعجیل':64
  };

  function removeSelectionHeader(scope){
    const table=qs(`#${scope}View table`);if(!table)return;
    const top=qsa('thead>tr:first-child>th',table);
    const idx=top.findIndex(th=>(th.childNodes[0]?.textContent||th.textContent||'').trim()==='انتخاب');
    if(idx<0)return;
    top[idx].remove();
    const filter=qs('thead .column-filters',table);
    if(filter?.children[idx])filter.children[idx].remove();
    qsa('tbody tr',table).forEach(row=>{if(row.children[idx])row.children[idx].remove()});
  }

  function normalizeHeaderRows(table){
    const thead=table.tHead||qs('thead',table);if(!thead)return;
    const header=[...thead.rows].find(row=>[...row.cells].some(c=>(c.childNodes[0]?.textContent||c.textContent||'').trim()==='شناسه'))||thead.rows[0];
    let filters=qs('tr.column-filters',thead);
    if(!header)return;
    if(!filters){filters=document.createElement('tr');filters.className='column-filters'}
    [...thead.rows].forEach(row=>{if(row!==header&&row!==filters)row.remove()});
    if(thead.rows[0]!==header)thead.insertBefore(header,thead.firstChild);
    if(filters.parentNode!==thead||thead.rows[1]!==filters)thead.appendChild(filters);
  }

  function installResizableTable(scope){
    const table=qs(`#${scope}View table`);if(!table)return;
    normalizeHeaderRows(table);
    removeSelectionHeader(scope);
    const heads=qsa('thead>tr:first-child>th',table);
    if(!heads.length)return;

    table.classList.add('resizable-task-table');
    table.style.direction='rtl';
    table.dataset.bamcoResized='core1';

    const key=`bamco-${scope}-column-widths-v6`;
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{saved={}}
    const widths=heads.map(head=>{
      const name=(head.childNodes[0]?.textContent||head.textContent||'').trim();
      if(name==='شناسه')return WIDTHS['شناسه'];
      const stored=Number(saved[name]);
      return Number.isFinite(stored)&&stored>0?stored:(WIDTHS[name]||140);
    });

    table.querySelector(':scope > colgroup')?.remove();
    const colgroup=document.createElement('colgroup');
    const cols=heads.map(()=>{const col=document.createElement('col');colgroup.appendChild(col);return col});
    table.insertBefore(colgroup,table.firstChild);

    const save=()=>{
      const next={};
      heads.forEach((h,i)=>next[(h.childNodes[0]?.textContent||h.textContent||'').trim()]=widths[i]);
      try{localStorage.setItem(key,JSON.stringify(next))}catch{}
    };

    const apply=()=>{
      let total=0;
      heads.forEach((head,index)=>{
        const name=(head.childNodes[0]?.textContent||head.textContent||'').trim();
        const min=MIN_WIDTHS[name]||70;
        widths[index]=Math.max(min,Math.min(700,Number(widths[index])||WIDTHS[name]||140));
        cols[index].style.setProperty('width',`${widths[index]}px`,'important');
        total+=widths[index];
      });
      table.style.setProperty('width',`${total}px`,'important');
      table.style.setProperty('min-width',`${total}px`,'important');
      table.style.setProperty('max-width','none','important');
    };
    apply();

    heads.forEach((head,index)=>{
      head.style.setProperty('position','relative','important');
      head.querySelectorAll('.column-resize-handle').forEach(x=>x.remove());
      const handle=document.createElement('span');
      handle.className='column-resize-handle';
      handle.title='برای تغییر عرض بکشید؛ برای بازنشانی دوبار کلیک کنید';
      head.appendChild(handle);
      handle.addEventListener('dblclick',event=>{
        event.preventDefault();event.stopPropagation();
        const name=(head.childNodes[0]?.textContent||head.textContent||'').trim();
        widths[index]=WIDTHS[name]||140;apply();save();
      });
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0&&event.pointerType!=='touch')return;
        event.preventDefault();event.stopPropagation();
        const name=(head.childNodes[0]?.textContent||head.textContent||'').trim();
        const min=MIN_WIDTHS[name]||70,startX=event.clientX,startWidth=widths[index];
        handle.classList.add('dragging');document.body.classList.add('column-resizing');
        const move=moveEvent=>{widths[index]=Math.max(min,Math.min(700,startWidth+startX-moveEvent.clientX));apply()};
        const up=()=>{
          handle.classList.remove('dragging');document.body.classList.remove('column-resizing');save();
          window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);
        };
        window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
      });
    });
  }

  removeSelectionHeader('kanban');
  removeSelectionHeader('archive');
  installResizableTable('kanban');
  installResizableTable('archive');

  if(typeof state==='undefined'||typeof tableFilters==='undefined'||typeof renderTasks!=='function')return;

  let dataVersion=0;
  const rendered={kanban:false,archive:false,dashboard:false};
  const latestRows={kanban:[],archive:[]};
  const latestArchived={kanban:false,archive:true};
  const optionCache={kanban:new Map(),archive:new Map()};
  let valueCache=new WeakMap();
  let idleToken=0;

  function resetRenderCaches(){
    rendered.kanban=false;rendered.archive=false;rendered.dashboard=false;
    optionCache.kanban.clear();optionCache.archive.clear();
    valueCache=new WeakMap();idleToken++;
  }

  if(typeof jalaliText==='function'&&!jalaliText.__bamcoCached){
    const originalJalaliText=jalaliText,cache=new Map();
    jalaliText=function(value){const key=String(value??'');if(cache.has(key))return cache.get(key);const out=originalJalaliText(value);if(cache.size>2048)cache.clear();cache.set(key,out);return out};
    jalaliText.__bamcoCached=true;
  }
  if(typeof jalaliDateTime==='function'&&!jalaliDateTime.__bamcoCached){
    const originalJalaliDateTime=jalaliDateTime,cache=new Map();
    jalaliDateTime=function(value){const key=String(value??'');if(cache.has(key))return cache.get(key);const out=originalJalaliDateTime(value);if(cache.size>2048)cache.clear();cache.set(key,out);return out};
    jalaliDateTime.__bamcoCached=true;
  }

  taskColumnValues=function(t,archived){
    let entry=valueCache.get(t);
    if(!entry||entry.version!==dataVersion){entry={version:dataVersion};valueCache.set(t,entry)}
    const key=archived?'archive':'kanban';
    if(entry[key])return entry[key];
    const waiting=norm(t.status)==='منتظر پاسخ',due=norm(t.due_state);
    const dueText=waiting?'فاقد شرایط دیرکرد':due==='دیرکرد'?'دیرکرد':due.includes('هشدار')?'دوره هشدار':'فاقد شرایط دیرکرد';
    const base=[fa(displayId(t)),t.title||'',t.description||'',ownerName(t),t.status||'',t.priority||'',jalaliText(t.start_date),jalaliText(t.done_date),jalaliText(waiting?null:t.due_date),fa(waiting?0:t.reminder_days),jalaliDateTime(t.last_updated_at),dueText,t.manager_notes||''];
    entry[key]=archived?[...base,fa(t.delay_days||0),fa(t.advance_days||0)]:base;
    return entry[key];
  };

  function filterValues(scope,index){
    const cache=optionCache[scope],cached=cache.get(index);
    if(cached?.version===dataVersion)return cached.values;
    const archived=latestArchived[scope];
    const values=[...new Set(latestRows[scope].map(t=>String(taskColumnValues(t,archived)[index]??'')).filter(v=>v&&v!=='—'))]
      .sort((a,b)=>a.localeCompare(b,'fa',{numeric:true,sensitivity:'base'}));
    cache.set(index,{version:dataVersion,values});
    return values;
  }

  function populateFilter(selectEl,scope,index){
    if(!selectEl||selectEl.dataset.bamcoPopulated===String(dataVersion))return;
    const current=tableFilters[scope][index]||selectEl.value||'';
    const values=filterValues(scope,index);
    selectEl.innerHTML='<option value="">همه</option>'+values.map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');
    selectEl.value=current;
    selectEl.dataset.bamcoPopulated=String(dataVersion);
  }

  function scheduleCommonFilterWarmup(scope){
    const token=idleToken;
    const work=()=>{
      if(token!==idleToken)return;
      const tr=qs(`#${scope}View .column-filters`);if(!tr)return;
      for(const index of [0,3,4,5,9,11]){
        const selectEl=tr.children[index]?.querySelector('select');
        if(selectEl)populateFilter(selectEl,scope,index);
      }
    };
    if('requestIdleCallback'in window)requestIdleCallback(work,{timeout:1200});else setTimeout(work,250);
  }

  updateColumnFilters=function(scope,rows,archived){
    latestRows[scope]=rows;latestArchived[scope]=archived;
    const table=qs(`#${scope}View table`);if(table)normalizeHeaderRows(table);
    const tr=qs(`#${scope}View .column-filters`);if(!tr)return;
    const filters=tableFilters[scope],count=archived?15:13;
    while(tr.children.length>count)tr.lastElementChild.remove();
    while(tr.children.length<count)tr.insertAdjacentHTML('beforeend','<th><select><option value="">همه</option></select></th>');
    [...tr.children].forEach((th,index)=>{
      const selectEl=th.querySelector('select');if(!selectEl)return;
      const current=filters[index]||'';
      if(selectEl.dataset.bamcoVersion!==String(dataVersion)){
        selectEl.innerHTML='<option value="">همه</option>'+(current?`<option value="${safe(current)}">${safe(current)}</option>`:'');
        selectEl.dataset.bamcoVersion=String(dataVersion);
        selectEl.dataset.bamcoPopulated='';
      }
      selectEl.value=current;
      selectEl.className=languageClass(current);
      selectEl.disabled=false;
      if(selectEl.dataset.bamcoLazyBound!=='1'){
        selectEl.dataset.bamcoLazyBound='1';
        const warm=()=>populateFilter(selectEl,scope,index);
        selectEl.addEventListener('pointerenter',warm,{passive:true});
        selectEl.addEventListener('focus',warm,{passive:true});
        selectEl.addEventListener('pointerdown',warm,{passive:true});
      }
    });
    scheduleCommonFilterWarmup(scope);
  };

  renderTasks=function(archived){
    const scope=archived?'archive':'kanban';
    const searchEl=archived?qs('#archiveSearch'):qs('#kanbanSearch');
    const query=(searchEl?.value||'').trim().toLowerCase();
    const allRows=state.tasks.filter(t=>!!t.archived===archived).sort((a,b)=>Number(displayId(a))-Number(displayId(b)));
    const filters=tableFilters[scope];
    updateColumnFilters(scope,allRows,archived);
    const rows=allRows.filter(t=>!query||[t.title,t.description,ownerName(t),t.status,t.priority,displayId(t)].some(v=>String(v??'').toLowerCase().includes(query)))
      .filter(t=>taskColumnValues(t,archived).every((v,index)=>!filters[index]||String(v??'')===filters[index]));
    const body=archived?qs('#archiveBody'):qs('#kanbanBody');if(!body)return;
    if(!rows.some(t=>String(t.id)===String(state.selected[scope])))state.selected[scope]=null;
    if(!rows.length){
      body.innerHTML=`<tr><td colspan="${archived?15:13}" class="empty">موردی برای نمایش وجود ندارد.</td></tr>`;
      updateTaskToolbar(scope);rendered[scope]=true;return;
    }
    body.innerHTML=rows.map(t=>{
      const due=norm(t.due_state),status=norm(t.status),rowClass=status==='منتظر پاسخ'?'row-waiting':due==='دیرکرد'?'row-overdue':due.includes('هشدار')?'row-warning':'row-normal';
      const values=taskColumnValues(t,archived);
      const selected=String(state.selected[scope])===String(t.id);
      return `<tr class="${rowClass}${selected?' task-selected':''}" data-task-id="${t.id}" data-scope="${scope}" aria-selected="${selected?'true':'false'}">${values.map(v=>cell(v)).join('')}</tr>`;
    }).join('');
    updateTaskToolbar(scope);rendered[scope]=true;
  };
  renderTasks.__ascendingWrapped=true;

  chooseTask=function(scope,id){
    state.selected[scope]=Number(id);
    const body=scope==='archive'?qs('#archiveBody'):qs('#kanbanBody');
    if(body){
      qsa('tr.task-selected',body).forEach(row=>{row.classList.remove('task-selected');row.setAttribute('aria-selected','false')});
      const row=qsa('tr[data-task-id]',body).find(r=>String(r.dataset.taskId)===String(id));
      if(row){row.classList.add('task-selected');row.setAttribute('aria-selected','true')}
    }
    updateTaskToolbar(scope);
  };

  renderAll=function(){
    const initial=qs('#appView')?.classList.contains('hidden');
    const target=initial?'kanban':state.view;
    if(target==='archive')renderTasks(true);
    else if(target==='dashboard'){window.renderDashboard?.();rendered.dashboard=true}
    else renderTasks(false);
    if(isManager())renderRequests();
  };

  refresh=async function(){
    try{
      const profilesPromise=isManager()?select('profiles','select=id,email,full_name,excel_name,role,active&active=eq.true&order=full_name'):Promise.resolve([state.profile]);
      const tasksPromise=select('task_status_view','select=*&order=id.desc');
      const requestsPromise=isManager()?select('change_requests','select=*&request_status=eq.pending&order=created_at.asc'):Promise.resolve([]);
      const [profiles,tasks,requests]=await Promise.all([profilesPromise,tasksPromise,requestsPromise]);
      state.profiles=profiles;state.tasks=tasks;state.requests=requests;
      dataVersion++;resetRenderCaches();
      renderAll();
      requestAnimationFrame(()=>{installResizableTable('kanban');installResizableTable('archive')});
    }catch(err){toast(err.message,true);throw err}
  };

  const originalShowView=showView;
  showView=function(view){
    const out=originalShowView(view);
    if(view==='kanban'&&!rendered.kanban)requestAnimationFrame(()=>renderTasks(false));
    else if(view==='archive'&&!rendered.archive)requestAnimationFrame(()=>renderTasks(true));
    else if(view==='dashboard'&&!rendered.dashboard)requestAnimationFrame(()=>{window.renderDashboard?.();rendered.dashboard=true});
    if(view==='kanban'||view==='archive')requestAnimationFrame(()=>installResizableTable(view));
    return out;
  };

  removeSelectionHeader('kanban');removeSelectionHeader('archive');
  requestAnimationFrame(()=>{installResizableTable('kanban');installResizableTable('archive')});
})();