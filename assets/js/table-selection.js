/* One selection model for every data table, including rows on other pages. */
(()=>{'use strict';
const models=new Map(),q=(s,r=document)=>r.querySelector(s);
const tableOf=value=>typeof value==='string'?q(value)?.closest('table')||q(value+' table'):value?.matches('table')?value:value?.closest('table');
const rows=t=>[...(t?.tBodies[0]?.rows||[])].filter(r=>!(r.cells.length===1&&r.cells[0].colSpan>1));
const key=r=>String(r.dataset.taskId??r.dataset.id??r.dataset.deliveryId??r.dataset.requestId??r.dataset.workspaceIndex??r.dataset.delivery??r.dataset.selectionKey??r.textContent.trim());
function model(t){const view=t.closest('.view'),id=(view?.id||'dialog')+':'+(t.id||[...view.querySelectorAll('table')].indexOf(t));if(!models.has(id))models.set(id,{ids:new Set(),anchor:null,table:t});const m=models.get(id);m.table=t;return m}
function paint(t){const m=model(t);t.setAttribute('aria-multiselectable','true');for(const r of rows(t)){const yes=m.ids.has(key(r));r.classList.toggle('suite-selected',yes);r.setAttribute('aria-selected',String(yes));r.tabIndex=0}}
function notify(t){paint(t);t.dispatchEvent(new CustomEvent('bamco-selection-change',{bubbles:true,detail:{ids:[...model(t).ids]}}))}
function clear(value){const t=tableOf(value);if(t){model(t).ids.clear();notify(t)}else for(const m of models.values()){m.ids.clear();if(m.table.isConnected)notify(m.table)}}
function selectRow(row,event={}){const t=row.closest('table'),m=model(t),id=key(row),was=m.ids.has(id),additiveByDefault=!!row.closest('#responseReportView');if(event.shiftKey&&m.anchor){const list=rows(t).filter(r=>!r.hidden&&!r.classList.contains('suite-filtered-out')&&!r.classList.contains('page-row-hidden')),a=list.findIndex(r=>key(r)===m.anchor),b=list.indexOf(row);if(a>=0&&b>=0){for(const r of list.slice(Math.min(a,b),Math.max(a,b)+1))m.ids.add(key(r))}}else{if(!event.ctrlKey&&!event.metaKey&&!additiveByDefault)m.ids.clear();if(!was)m.ids.add(id);else m.ids.delete(id);m.anchor=id}notify(t)}
function usesNativeTaskSelection(row){return !!row.closest('#kanbanView,#archiveView')}
document.addEventListener('click',e=>{const row=e.target.closest('.workspace tbody tr');if(row&&!row.closest('dialog')&&!e.target.closest('button,a,input,select,textarea')&&rows(row.closest('table')).includes(row)){
  if(usesNativeTaskSelection(row))return;
  e.preventDefault();e.stopImmediatePropagation();selectRow(row,e);return
}if(e.target.closest('.content-back,#nav [data-view],#logoutBtn,[data-tab-refresh]'))clear()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.target.closest('dialog'))clear();if([' ','Enter'].includes(e.key)&&e.target.matches('.workspace tbody tr')){
  if(usesNativeTaskSelection(e.target))return;
  e.preventDefault();e.stopImmediatePropagation();selectRow(e.target,e)
}},true);
let frame;const scan=()=>{frame=0;document.querySelectorAll('.workspace .view table').forEach(t=>{if(!t.closest('dialog')&&!t.closest('#kanbanView,#archiveView'))paint(t)})};
const install=()=>{new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(scan)}).observe(document.querySelector('.workspace'),{childList:true,subtree:true});scan()};
window.bamcoSelection={ids:value=>{const t=tableOf(value);return t?[...model(t).ids]:[]},rows:value=>{const t=tableOf(value);return t?rows(t).filter(r=>model(t).ids.has(key(r))):[]},clear,set(value,ids){const t=tableOf(value);if(t){model(t).ids=new Set(ids.map(String));notify(t)}},key};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
