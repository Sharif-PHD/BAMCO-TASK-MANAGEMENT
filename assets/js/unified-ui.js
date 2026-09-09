(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const picked={kanban:new Set(),archive:new Set()};
  const faNumber=value=>String(value).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);

  function scopeInfo(scope){return {view:q(`#${scope}View`),body:q(`#${scope}Body`),archived:scope==='archive'}}
  function cleanup(scope){
    const {view}=scopeInfo(scope);if(!view)return;
    q('.unified-select-head',view)?.remove();q('.unified-select-filter',view)?.remove();
    qa('.unified-select-cell',view).forEach(x=>x.remove());
  }
  function syncToolbar(scope){
    const count=picked[scope].size,single=count===1;
    q(`#${scope}EditBtn`)?.toggleAttribute('disabled',!single);
    q(`#${scope}DeleteBtn`)?.toggleAttribute('disabled',!count);
    q(scope==='kanban'?'#kanbanArchiveBtn':'#archiveRestoreBtn')?.toggleAttribute('disabled',!count);
  }
  function decorate(scope){
    const {view,body}=scopeInfo(scope);if(!view||!body)return;
    const header=q('thead tr:first-child',view),filters=q('thead .column-filters',view);if(!header||!filters)return;
    const rows=qa('tr[data-task-id]',body),visible=new Set(rows.map(r=>String(r.dataset.taskId)));
    picked[scope]=new Set([...picked[scope]].filter(id=>visible.has(id)||state.tasks.some(t=>String(t.id)===id)));
    const head=document.createElement('th');head.className='unified-select-head';head.innerHTML='<input type="checkbox" aria-label="انتخاب همه ردیف‌های نمایش‌داده‌شده">';header.prepend(head);
    const filter=document.createElement('th');filter.className='unified-select-filter';filter.setAttribute('aria-label','ستون انتخاب');filters.prepend(filter);
    rows.forEach(row=>{const id=String(row.dataset.taskId),td=document.createElement('td');td.className='unified-select-cell';td.innerHTML=`<input type="checkbox" value="${id}" ${picked[scope].has(id)?'checked':''} aria-label="انتخاب این وظیفه">`;row.prepend(td);row.classList.toggle('task-selected',picked[scope].has(id));row.setAttribute('aria-selected',picked[scope].has(id)?'true':'false')});
    const empty=q('tbody .empty',view);if(empty)empty.colSpan=header.cells.length;
    const activeRows=rows.filter(r=>!r.hidden),all=activeRows.length&&activeRows.every(r=>picked[scope].has(String(r.dataset.taskId))),some=activeRows.some(r=>picked[scope].has(String(r.dataset.taskId))),box=q('input',head);box.checked=!!all;box.indeterminate=!all&&some;
    syncToolbar(scope);
  }
  function installTaskSelection(){
    if(typeof renderTasks!=='function'||typeof tableFilters==='undefined')return;
    const base=renderTasks;
    renderTasks=function(archived){const scope=archived?'archive':'kanban';cleanup(scope);const out=base(archived);decorate(scope);return out};
    chooseTask=function(scope,id){id=String(id);if(picked[scope].has(id))picked[scope].delete(id);else picked[scope].add(id);state.selected[scope]=picked[scope].size===1?Number([...picked[scope]][0]):null;renderTasks(scope==='archive')};
    document.addEventListener('click',e=>{
      const all=e.target.closest('.unified-select-head input');if(all){e.stopImmediatePropagation();const view=all.closest('.view'),scope=view.id.startsWith('archive')?'archive':'kanban';qa('tbody tr[data-task-id]',view).filter(r=>!r.hidden).forEach(r=>all.checked?picked[scope].add(String(r.dataset.taskId)):picked[scope].delete(String(r.dataset.taskId)));state.selected[scope]=picked[scope].size===1?Number([...picked[scope]][0]):null;renderTasks(scope==='archive');return}
      const box=e.target.closest('.unified-select-cell input');if(box){e.preventDefault();e.stopImmediatePropagation();const row=box.closest('tr[data-task-id]');chooseTask(row.dataset.scope,row.dataset.taskId)}
    },true);
    document.addEventListener('change',e=>{const select=e.target.closest('.column-filters select');if(!select)return;const tr=select.closest('.column-filters');if(!tr?.querySelector('.unified-select-filter'))return;e.stopImmediatePropagation();const scope=tr.closest('.view').id.startsWith('archive')?'archive':'kanban';tableFilters[scope][select.closest('th').cellIndex-1]=select.value;renderTasks(scope==='archive')},true);
    renderTasks(false);renderTasks(true);
  }
  async function bulkAction(scope,kind){
    const ids=[...picked[scope]];if(!ids.length)return;
    if(kind==='edit'){if(ids.length!==1){toast('برای ویرایش فقط یک ردیف را انتخاب کنید.',true);return}const task=state.tasks.find(t=>String(t.id)===ids[0]);if(task)openTask(task);return}
    const labels={archive:'تکمیل و آرشیو',restore:'بازگردانی به کانبان',delete:'حذف'};
    if(!confirm(`${labels[kind]} برای ${fa(ids.length)} وظیفه انتخاب‌شده انجام شود؟`))return;
    try{
      for(const id of ids){
        if(kind==='archive'){const t=state.tasks.find(x=>String(x.id)===id);if(isManager())await update('tasks',`id=eq.${id}`,{archived:true,archived_at:new Date().toISOString(),status:'انجام شده',done_date:t.done_date||new Date().toISOString().slice(0,10)});else await rpc('submit_change_request',{p_request_type:'complete',p_task_id:Number(id),p_proposed_data:{done_date:new Date().toISOString().slice(0,10)},p_note:null})}
        if(kind==='restore'&&isManager())await update('tasks',`id=eq.${id}`,{archived:false,archived_at:null,status:'در حال انجام',done_date:null});
        if(kind==='delete'){if(isManager())await rpc('delete_task_and_resequence',{p_task_id:Number(id)});else await rpc('submit_change_request',{p_request_type:'delete',p_task_id:Number(id),p_proposed_data:{},p_note:null})}
      }
      picked[scope].clear();toast(`${fa(ids.length)} وظیفه با موفقیت پردازش شد.`);await refresh();
    }catch(err){toast(err.message,true)}
  }
  function interceptBulk(){
    const map={kanbanEditBtn:['kanban','edit'],archiveEditBtn:['archive','edit'],kanbanArchiveBtn:['kanban','archive'],archiveRestoreBtn:['archive','restore'],kanbanDeleteBtn:['kanban','delete'],archiveDeleteBtn:['archive','delete']};
    document.addEventListener('click',e=>{const hit=Object.entries(map).find(([id])=>e.target.closest(`#${id}`));if(!hit)return;e.preventDefault();e.stopImmediatePropagation();bulkAction(...hit[1])},true);
  }
  function orderToolbars(){
    const order=(toolbar,selectors)=>{if(!toolbar)return;selectors.forEach(s=>{const el=q(s,toolbar);if(el)toolbar.appendChild(el)})};
    order(q('#kanbanView .task-toolbar'),['#addTaskBtn','.task-search-toggle','#kanbanSearch','#importBtn','#kanbanExportBtn','#kanbanEditBtn','#kanbanArchiveBtn','#kanbanDeleteBtn']);
    order(q('#archiveView .task-toolbar'),['.task-search-toggle','#archiveSearch','#archiveImportBtn','#archiveExportBtn','#archiveEditBtn','#archiveRestoreBtn','#archiveDeleteBtn']);
    qa('.vehicle-toolbar').forEach(t=>order(t,['.vehicle-add','.vehicle-search-toggle','.vehicle-search','.vehicle-import','.vehicle-export','.vehicle-edit','.vehicle-delete','.vehicle-upload','.vehicle-blank']));
  }
  function normalizeViews(){
    qa('#appView .view .table-wrap table').forEach(t=>t.classList.add('vehicle-data-table'));
    qa('#appView .view>.panel').forEach(p=>{if(q('table',p))p.classList.add('vehicle-panel')});
    const page=q('#stickersView .desktop-sticker-page');
    if(page&&q('#desktopStickerSet option')?.textContent.includes('ثبت نشده'))page.innerHTML='<div class="sticker-empty-state"><div><b>هنوز نسخه‌ای تعریف نشده است</b><span>برای ساخت نسخه اول، روی «افزودن نسخه جدید» بزنید و تصاویر وضعیت‌ها را بارگذاری کنید.</span><br><button id="emptyAddSticker" class="primary" type="button">افزودن نسخه اول</button></div></div>'+page.innerHTML;
    q('#emptyAddSticker')?.addEventListener('click',()=>q('#addDesktopStickerSet')?.click());
  }
  function paginateTable(table){
    if(!table||table.closest('#archiveView')||table.closest('dialog'))return;
    const body=table.tBodies?.[0];if(!body)return;
    const rows=qa(':scope > tr',body).filter(row=>!row.classList.contains('empty')&&!row.classList.contains('unified-empty-row'));
    const wrap=table.closest('.table-wrap,.vehicle-table-wrap')||table.parentElement;
    let pager=wrap?.nextElementSibling?.classList?.contains('unified-pager')?wrap.nextElementSibling:null;
    if(rows.length<=50){rows.forEach(row=>row.hidden=false);pager?.remove();table.dataset.unifiedPage='1';delete table.dataset.unifiedPagerSignature;return}
    const pageCount=Math.ceil(rows.length/50),page=Math.min(Math.max(Number(table.dataset.unifiedPage)||1,1),pageCount),start=(page-1)*50;
    table.dataset.unifiedPage=String(page);
    rows.forEach((row,index)=>row.hidden=index<start||index>=start+50);
    if(!pager){pager=document.createElement('nav');pager.className='unified-pager';pager.setAttribute('aria-label','صفحه‌بندی جدول');wrap.after(pager)}
    const shown=Math.min(50,rows.length-start),signature=[page,pageCount,rows.length,start,shown].join(':');
    if(table.dataset.unifiedPagerSignature!==signature){
      pager.innerHTML=`<span>نمایش ${faNumber(start+1)} تا ${faNumber(start+shown)} از ${faNumber(rows.length)} ردیف</span><div><button type="button" class="ghost" data-unified-page="prev" ${page===1?'disabled':''}>صفحه قبل</button><strong>صفحه ${faNumber(page)} از ${faNumber(pageCount)}</strong><button type="button" class="ghost" data-unified-page="next" ${page===pageCount?'disabled':''}>صفحه بعد</button></div>`;
      table.dataset.unifiedPagerSignature=signature;
    }
  }
  function paginateAll(){qa('#appView .view table').forEach(paginateTable)}
  function installPagination(){
    document.addEventListener('click',event=>{const button=event.target.closest('[data-unified-page]');if(!button)return;const pager=button.closest('.unified-pager'),wrap=pager?.previousElementSibling,table=q('table',wrap);if(!table)return;const delta=button.dataset.unifiedPage==='next'?1:-1;table.dataset.unifiedPage=String((Number(table.dataset.unifiedPage)||1)+delta);paginateTable(table);wrap.scrollTo({top:0,behavior:'smooth'})});
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paginateAll()})}).observe(q('#appView')||document.body,{childList:true,subtree:true});
    paginateAll();
  }
  function ensureEmptyStates(){
    qa('#appView .view tbody').forEach(body=>{if(body.children.length)return;const table=body.closest('table'),row=document.createElement('tr');row.className='unified-empty-row';row.innerHTML=`<td class="empty" colspan="${table?.tHead?.rows?.[0]?.cells?.length||1}">هنوز اطلاعاتی برای نمایش ثبت نشده است.</td>`;body.appendChild(row)});
    const targets=[['#messageList','پیامی برای نمایش وجود ندارد.'],['#sentMessageList','هنوز پیامی ارسال نشده است.'],['#approvalChainList','هنوز زنجیره تأییدی تعریف نشده است.']];
    targets.forEach(([selector,text])=>{const el=q(selector);if(el&&!el.textContent.trim()&&!el.children.length)el.innerHTML=`<div class="unified-empty-inline">${text}</div>`});
  }
  function boot(){installTaskSelection();interceptBulk();orderToolbars();normalizeViews();installPagination();setTimeout(()=>{orderToolbars();normalizeViews();ensureEmptyStates();paginateAll()},900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
