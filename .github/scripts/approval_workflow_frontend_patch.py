from pathlib import Path
import re


def exact(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    n = s.count(old)
    if n != 1:
        raise RuntimeError(f'{label}: expected 1 match, got {n}')
    p.write_text(s.replace(old, new, 1))


def rex(path, pattern, new, label):
    p = Path(path)
    s = p.read_text()
    out, n = re.subn(pattern, new, s, count=1, flags=re.S)
    if n != 1:
        raise RuntimeError(f'{label}: expected 1 match, got {n}')
    p.write_text(out)


app = 'assets/js/app.js'
exact(
    app,
    "const isManager=()=>state.profile?.role==='manager';\nfunction toast(message,error=false){return window.bamcoNotice(message,{error})}",
    """const isManager=()=>state.profile?.role==='manager';
window.bamcoLoadRequestWorkflow=async function(){
  try{
    const snapshot=await rpc('request_workflow_snapshot',{});
    if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||!Array.isArray(snapshot.current_requests)||!Array.isArray(snapshot.history_requests)||!Array.isArray(snapshot.routes))throw new Error('workflow snapshot unavailable');
    return{requests:snapshot.current_requests,history:snapshot.history_requests,routes:snapshot.routes};
  }catch(error){
    const actor=state.user?.id,manager=isManager();
    const requestFilter=manager?'select=*&request_status=in.(pending,in_review,needs_revision)&order=created_at.asc':`select=*&requested_by=eq.${actor}&request_status=in.(pending,in_review,needs_revision)&order=created_at.asc`;
    const historyFilter=manager?'select=*&request_status=in.(approved,rejected,cancelled)&order=created_at.desc':`select=*&requested_by=eq.${actor}&request_status=in.(approved,rejected,cancelled)&order=created_at.desc`;
    const [all,routes,history]=await Promise.all([selectAll('change_requests',requestFilter),rpc('request_routing_status',{}).catch(()=>[]),selectAll('change_requests',historyFilter)]);
    const routeById=new Map((routes||[]).map(x=>[String(x.request_id),x]));
    return{requests:manager?all.filter(r=>routeById.get(String(r.id))?.actionable):all,history,routes:routes||[]};
  }
};
function toast(message,error=false){return window.bamcoNotice(message,{error})}""",
    'workflow loader',
)

rex(
    app,
    r"    state\.requests=await select\('change_requests'.*?    state\.requestRoutes=await rpc\('request_routing_status',\{\}\)\.catch\(\(\)=>\[\]\);\n    renderAll\(\);",
    """    const workflow=await window.bamcoLoadRequestWorkflow();
    state.requests=workflow.requests;state.requestHistory=workflow.history;state.requestRoutes=workflow.routes;
    renderAll();""",
    'refresh workflow snapshot',
)

sync = 'assets/js/request-sync.js'
rex(
    sync,
    r"   const requestFilter=isManager\(\)\?.*?   const \[requests,routes,history\]=await Promise\.all\(\[\n    selectAll\('change_requests',requestFilter\),\n    rpc\('request_routing_status',\{\}\)\.catch\(\(\)=>state\.requestRoutes\|\|\[\]\),\n    selectAll\('change_requests',historyFilter\)\n   \]\);",
    """   const workflow=await window.bamcoLoadRequestWorkflow();
   const requests=workflow.requests,routes=workflow.routes,history=workflow.history;""",
    'request sync single snapshot',
)

index = 'index.html'
exact(index, 'assets/js/app.js?v=ui-toolbar-cleanup-20260912-1', 'assets/js/app.js?v=approval-workflow-root-20260912-1', 'app cache')
exact(index, 'assets/js/request-sync.js?v=approval-sync-20260910-1', 'assets/js/request-sync.js?v=approval-workflow-root-20260912-1', 'sync cache')

print('approval workflow frontend patch applied')
