(()=>{
'use strict';
if(window.__bamcoSessionRuntime)return;window.__bamcoSessionRuntime=true;
const KEY='bamco.session.id.v1';
const call=async(action,extra={})=>{
  if(typeof state==='undefined'||!state?.token||typeof SB_URL==='undefined'||typeof SB_KEY==='undefined')return null;
  const response=await fetch(`${SB_URL}/functions/v1/session-audit`,{method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`,'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),keepalive:action==='end'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'خطای ثبت نشست');
  return data;
};
async function start(){
  try{
    let id=sessionStorage.getItem(KEY);
    if(id){
      const status=await call('status',{session_id:id}).catch(()=>null);
      if(status&&!status.ended&&!status.revoked&&!status.expired)return id;
      sessionStorage.removeItem(KEY);id=null;
    }
    const data=await call('start',{app_version:'web-20260909'});
    id=data?.session?.id||null;if(id)sessionStorage.setItem(KEY,id);return id;
  }catch(err){console.warn('BAMCO session start',err);return null}
}
async function heartbeat(){
  const id=sessionStorage.getItem(KEY);if(!id)return start();
  try{const data=await call('heartbeat',{session_id:id});if(data?.ended||data?.revoked||data?.expired){sessionStorage.removeItem(KEY);if(typeof toast==='function')toast('نشست شما پایان یافته است. دوباره وارد سامانه شوید.',true)}}catch(err){console.warn('BAMCO session heartbeat',err)}
}
async function end(reason='logout'){
  const id=sessionStorage.getItem(KEY);if(!id)return;
  sessionStorage.removeItem(KEY);try{await call('end',{session_id:id,reason})}catch{}
}
setTimeout(start,0);
const timer=setInterval(heartbeat,120000);
window.addEventListener('pagehide',()=>{clearInterval(timer);end('closed')},{once:true});
document.querySelector('#logoutBtn')?.addEventListener('click',()=>end('logout'),{capture:true});
})();
