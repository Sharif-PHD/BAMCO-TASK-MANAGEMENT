(()=>{
'use strict';
if(window.__bamcoTaskTerminalColumns20260912)return;
window.__bamcoTaskTerminalColumns20260912=true;

const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
const faDigits=value=>typeof fa==='function'?fa(value):String(value??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const scopes={kanban:{view:'#kanbanView',body:'#kanbanBody',columns:14},archive:{view:'#archiveView',body:'#archiveBody',columns:15}};
let scheduled=false;

function taskFor(row){
  const id=String(row?.dataset?.taskId||'');
  return (typeof state!=='undefined'&&Array.isArray(state?.tasks))?state.tasks.find(task=>String(task.id)===id):null;
}
function preservePick(input,target){
  if(!input||!target)return;
  input.dataset.bamcoHiddenTaskPick='1';
  input.style.setProperty('display','none','important');
  input.setAttribute('aria-hidden','true');
  input.tabIndex=-1;
  if(input.parentElement!==target)target.appendChild(input);
}
function normalizeHeader(scope){
  const {view,columns}=scopes[scope],table=q(`${view} table`);if(!table)return;
  const head=q('thead tr:first-child',table),filters=q('thead .column-filters',table);if(!head)return;

  qa('[data-bamco-task-select-all]',head).forEach(el=>el.closest('label')?.remove()||el.remove());
  while(head.cells.length>columns)head.deleteCell(head.cells.length-1);
  while(head.cells.length<columns)head.appendChild(document.createElement('th'));
  const terminal=head.cells[columns-1];
  if(terminal&&terminal.textContent.trim()!=='تعجیل')terminal.replaceChildren(document.createTextNode('تعجیل'));
  terminal?.removeAttribute('aria-label');

  if(filters){
    while(filters.cells.length>columns)filters.deleteCell(filters.cells.length-1);
    while(filters.cells.length<columns){const th=document.createElement('th');th.className='bamco-terminal-filter-spacer';th.setAttribute('aria-hidden','true');filters.appendChild(th)}
  }
}
function normalizeKanbanRows(){
  const body=q('#kanbanBody');if(!body)return;
  qa('tr[data-task-id]',body).forEach(row=>{
    while(row.cells.length>14)row.deleteCell(row.cells.length-1);
    while(row.cells.length<14)row.insertCell(-1);
    const terminal=row.cells[13],input=q('input.task-pick',row),task=taskFor(row),value=faDigits(task?.advance_days||0);
    if(!terminal)return;
    terminal.classList.add('fa-text','bamco-advance-cell');
    let valueNode=q('[data-bamco-advance-value]',terminal);
    if(!valueNode){valueNode=document.createElement('span');valueNode.dataset.bamcoAdvanceValue='1';terminal.replaceChildren(valueNode);}
    if(valueNode.textContent!==value)valueNode.textContent=value;
    preservePick(input,terminal);
  });
  q('#kanbanBody tr .empty')?.setAttribute('colspan','14');
}
function normalizeArchiveRows(){
  const body=q('#archiveBody');if(!body)return;
  qa('tr[data-task-id]',body).forEach(row=>{
    const input=q('input.task-pick',row);
    if(row.cells.length>15){
      const terminal=row.cells[14],selection=row.cells[row.cells.length-1];
      preservePick(input,terminal);
      if(selection!==terminal)selection.remove();
    }else if(row.cells.length===15){preservePick(input,row.cells[14]);}
    while(row.cells.length>15)row.deleteCell(row.cells.length-1);
    row.cells[14]?.classList.add('fa-text','bamco-advance-cell');
  });
  q('#archiveBody tr .empty')?.setAttribute('colspan','15');
}
function normalize(){
  scheduled=false;
  normalizeHeader('kanban');normalizeHeader('archive');
  normalizeKanbanRows();normalizeArchiveRows();
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(normalize)}
function installStyles(){
  if(q('#bamcoTaskTerminalColumnsCss'))return;
  const style=document.createElement('style');style.id='bamcoTaskTerminalColumnsCss';style.textContent=`
    #kanbanView th:last-child,#archiveView th:last-child{white-space:nowrap!important}
    #kanbanBody td.bamco-advance-cell,#archiveBody td.bamco-advance-cell{text-align:center!important;white-space:nowrap!important}
    #kanbanView .bamco-terminal-filter-spacer{background:#edf3f0!important}
    #kanbanView input.task-pick[data-bamco-hidden-task-pick],#archiveView input.task-pick[data-bamco-hidden-task-pick]{display:none!important}
  `;document.head.appendChild(style);
}
function boot(){
  installStyles();normalize();
  for(const scope of Object.keys(scopes)){
    const table=q(`${scopes[scope].view} table`),body=q(scopes[scope].body);
    if(table)new MutationObserver(schedule).observe(table.tHead||table,{childList:true,subtree:true,characterData:true});
    if(body)new MutationObserver(schedule).observe(body,{childList:true,subtree:true});
  }
  addEventListener('click',event=>{
    if(event.target?.closest?.('#kanbanBody tr[data-task-id],#archiveBody tr[data-task-id]'))schedule();
  },true);
  window.bamcoNormalizeTaskTerminalColumns=normalize;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
