/* Record application sign-ins immediately and use the shared HTTP session. */
(()=>{'use strict';
if(window.__bamcoSessionRuntime)return;window.__bamcoSessionRuntime=true;
const KEY='bamco.session.id.v1';let starting=null,lastActivity=Date.now(),lastSent=0;
for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,()=>lastActivity=Date.now(),{passive:true});
const call=async(action,extra={})=>{
 if(typeof state==='undefined'||!state.token)return null;
 return api('/functions/v1/session-audit',{method:'POST',body:{action,...extra}});
};
async function startOnce(){
 const data=await call('start',{app_version:'security-20260910-1'}),id=data?.session?.id;
 if(!id)throw Error('ثبت نشست انجام نشد؛ دوباره وارد شوید.');
 sessionStorage.setItem(KEY,id);lastActivity=Date.now();lastSent=lastActivity;return id;
}
function start(){if(!state?.token)return Promise.resolve(null);if(!starting)starting=startOnce().finally(()=>starting=null);return starting}
async function heartbeat(){
 if(!state?.token)return;const id=sessionStorage.getItem(KEY);if(!id)return start();
 try{const active=lastActivity>lastSent,data=await call(active?'heartbeat':'status',{session_id:id});if(active)lastSent=lastActivity;
  if(data?.ended||data?.revoked||data?.expired){clear();showLogin();toast('نشست شما پایان یافته است. دوباره وارد شوید.',true)}
 }catch(error){if(!state.token)clear();console.warn('BAMCO session heartbeat',error.message)}
}
async function end(reason='logout'){
 const id=sessionStorage.getItem(KEY);if(!id)return;
 try{await call('end',{session_id:id,reason})}finally{clear()}
}
function clear(){sessionStorage.removeItem(KEY)}
window.bamcoSession={start,heartbeat,end,clear};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state?.token)heartbeat()});
const timer=setInterval(heartbeat,120000);
window.addEventListener('pagehide',()=>{clearInterval(timer);end('closed').catch(()=>{})},{once:true});
})();
