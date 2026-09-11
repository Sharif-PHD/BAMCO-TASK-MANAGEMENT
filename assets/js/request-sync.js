/* Keep each open portal's approval queue in step with the server's stage. */
(()=>{'use strict';
 let pending=null,lastSnapshot='';
 const ownRows=rows=>isManager()?rows:(rows||[]).filter(r=>String(r.requested_by)===String(state.user?.id));
 function renderScoped(){
  const allRequests=state.requests,allHistory=state.requestHistory;
  try{
   state.requests=ownRows(allRequests);state.requestHistory=ownRows(allHistory);
   renderRequests();renderRequestHistory();
  }finally{state.requests=allRequests;state.requestHistory=allHistory}
 }
 function enforceVisibleScope(){
  if(isManager())return;
  const own=new Set(ownRows(state.requestHistory).map(r=>String(r.id)));
  document.querySelectorAll('#requestHistoryBody tr[data-request-id]').forEach(row=>{if(!own.has(String(row.dataset.requestId)))row.remove()});
 }
 async function sync({force=false}={}){
  if(!state.token||!state.profile||document.hidden)return;
  if(!force&&document.querySelector('dialog[open]'))return;
  if(pending)return pending;
  const actor=state.user?.id,token=state.token;
  pending=(async()=>{
   const requestFilter=isManager()?'select=*&request_status=in.(pending,in_review,needs_revision)&order=created_at.asc':`select=*&requested_by=eq.${actor}&request_status=in.(pending,in_review,needs_revision)&order=created_at.asc`;
   const historyFilter=isManager()?'select=*&request_status=in.(approved,rejected,cancelled)&order=created_at.desc':`select=*&requested_by=eq.${actor}&request_status=in.(approved,rejected,cancelled)&order=created_at.desc`;
   const [requests,routes,history]=await Promise.all([
    selectAll('change_requests',requestFilter),
    rpc('request_routing_status',{}).catch(()=>state.requestRoutes||[]),
    selectAll('change_requests',historyFilter)
   ]);
   if(actor!==state.user?.id||token!==state.token)return;
   const next=JSON.stringify([requests,routes,history]);
   if(next===lastSnapshot){enforceVisibleScope();return}
   lastSnapshot=next;state.requests=requests;state.requestRoutes=routes;state.requestHistory=history;
   renderScoped();enforceVisibleScope();
   if(state.view==='dashboard')window.renderDashboard?.();
  })();
  try{await pending}finally{pending=null}
 }
 const run=(force=false)=>sync({force}).catch(error=>console.warn('Approval queue refresh',error.message));
 const immediate=()=>{try{renderScoped();enforceVisibleScope()}catch{}void run(true)};
 setInterval(()=>run(false),10000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)immediate()});
 window.addEventListener('focus',immediate);
 document.addEventListener('click',event=>{if(event.target.closest('#nav [data-view="approvals"],#nav [data-view="requestHistory"],#homeView [data-view="approvals"],#homeView [data-view="requestHistory"]'))immediate()});
 const body=document.querySelector('#requestHistoryBody');if(body)new MutationObserver(enforceVisibleScope).observe(body,{childList:true});
 const app=document.querySelector('#appView');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden')&&state.profile)immediate()}).observe(app,{attributes:true,attributeFilter:['class']});
 queueMicrotask(()=>{if(state?.profile)immediate()});
 window.bamcoRequestSync={refresh:()=>sync({force:true})};
})();
