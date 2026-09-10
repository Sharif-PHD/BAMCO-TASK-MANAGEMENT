/* Keep each open portal's approval queue in step with the server's stage. */
(()=>{'use strict';
 let pending=null;
 async function sync(){
  if(!state.token||!state.profile||document.hidden||document.querySelector('dialog[open]'))return;
  if(pending)return pending;
  const actor=state.user?.id,token=state.token;
  pending=(async()=>{
   const [requests,routes,history]=await Promise.all([
    selectAll('change_requests','select=*&request_status=in.(pending,in_review,needs_revision)&order=created_at.asc'),
    rpc('request_routing_status',{}),
    selectAll('change_requests','select=*&request_status=in.(approved,rejected,cancelled)&order=created_at.desc')
   ]);
   if(actor!==state.user?.id||token!==state.token||document.querySelector('dialog[open]'))return;
   const next=JSON.stringify([requests,routes,history]);
   if(next===JSON.stringify([state.requests,state.requestRoutes,state.requestHistory]))return;
   state.requests=requests;state.requestRoutes=routes;state.requestHistory=history;
   renderRequests();renderRequestHistory();
   if(state.view==='dashboard')window.renderDashboard?.();
  })();
  try{await pending}finally{pending=null}
 }
 const run=()=>sync().catch(error=>console.warn('Approval queue refresh',error.message));
 setInterval(run,15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)run()});
 window.addEventListener('focus',run);
 document.addEventListener('click',event=>{if(event.target.closest('#nav [data-view="approvals"],#nav [data-view="requestHistory"],#homeView [data-view="approvals"],#homeView [data-view="requestHistory"]'))requestAnimationFrame(run)});
 window.bamcoRequestSync={refresh:sync};
})();
