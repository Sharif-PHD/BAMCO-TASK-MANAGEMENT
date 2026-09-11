from pathlib import Path

app=Path('assets/js/app.js')
s=app.read_text()
old="function chooseTask(scope,id){state.selected[scope]=Number(id);renderTasks(scope==='archive')}"
new="function chooseTask(scope,id){const next=String(state.selected[scope])===String(id)?null:Number(id);state.selected[scope]=next;renderTasks(scope==='archive')}"
assert old in s, 'base chooseTask not found'
s=s.replace(old,new,1)

old2="  chooseTask=function(scope,id){\n    state.selected[scope]=Number(id);\n    const body=scope==='archive'?qs('#archiveBody'):qs('#kanbanBody');\n    if(body){\n      qsa('tr.task-selected',body).forEach(row=>{row.classList.remove('task-selected');row.setAttribute('aria-selected','false')});\n      const row=qsa('tr[data-task-id]',body).find(r=>String(r.dataset.taskId)===String(id));\n      if(row){row.classList.add('task-selected');row.setAttribute('aria-selected','true')}\n    }\n    updateTaskToolbar(scope);\n  };"
new2="  chooseTask=function(scope,id){\n    const next=String(state.selected[scope])===String(id)?null:Number(id);\n    state.selected[scope]=next;\n    const body=scope==='archive'?qs('#archiveBody'):qs('#kanbanBody');\n    if(body){\n      qsa('tr.task-selected',body).forEach(row=>{row.classList.remove('task-selected');row.setAttribute('aria-selected','false')});\n      if(next!==null){const row=qsa('tr[data-task-id]',body).find(r=>String(r.dataset.taskId)===String(id));if(row){row.classList.add('task-selected');row.setAttribute('aria-selected','true')}}\n    }\n    updateTaskToolbar(scope);\n  };"
assert old2 in s, 'late chooseTask not found'
s=s.replace(old2,new2,1)
app.write_text(s)

bulk=Path('assets/js/task-bulk-delete-20260912.js')
b=bulk.read_text()
assert 'if(window.__bamcoTaskBulkDelete20260912V4)return;' in b
b=b.replace('if(window.__bamcoTaskBulkDelete20260912V4)return;\nwindow.__bamcoTaskBulkDelete20260912V4=true;', 'if(window.__bamcoTaskBulkDelete20260912V6)return;\nwindow.__bamcoTaskBulkDelete20260912V6=true;\nwindow.__bamcoTaskBulkDelete20260912V5=true;\nwindow.__bamcoTaskBulkDelete20260912V4=true;',1)
marker='const lastPicked={kanban:null,archive:null};\nlet deleting=false;'
assert marker in b
b=b.replace(marker,'const lastPicked={kanban:null,archive:null};\nconst seeded={kanban:false,archive:false};\nlet deleting=false;',1)
old3="if(picked[scope].size===0&&typeof state!=='undefined'&&state?.selected?.[scope]!=null&&visible.has(String(state.selected[scope])))picked[scope].add(String(state.selected[scope]));"
assert old3 in b
b=b.replace(old3,"if(!seeded[scope]){if(picked[scope].size===0&&typeof state!=='undefined'&&state?.selected?.[scope]!=null&&visible.has(String(state.selected[scope])))picked[scope].add(String(state.selected[scope]));seeded[scope]=true;}",1)
bulk.write_text(b)

loader=Path('assets/js/avatar-final-20260911.js')
l=loader.read_text().replace('task-bulk-delete-20260912.js?v=20260912-5','task-bulk-delete-20260912.js?v=20260912-6')
l=l.replace('final-production-fixes-20260911.js?v=task-filter-repair-20260912-1','final-production-fixes-20260911.js?v=task-row-deselect-root-20260912-2')
loader.write_text(l)

index=Path('index.html')
h=index.read_text().replace('assets/js/app.js?v=task-filter-repair-20260912-1','assets/js/app.js?v=task-row-deselect-root-20260912-2')
h=h.replace('assets/js/avatar-final-20260911.js?v=task-row-deselect-20260912-1','assets/js/avatar-final-20260911.js?v=task-row-deselect-root-20260912-2')
index.write_text(h)

assert app.read_text().count("const next=String(state.selected[scope])===String(id)?null:Number(id)") >= 2
assert '__bamcoTaskBulkDelete20260912V6' in bulk.read_text()
assert 'const seeded={kanban:false,archive:false}' in bulk.read_text()
