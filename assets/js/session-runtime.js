/* Record one audit row per Auth login and never revive it after logout. */
(()=>{'use strict';
if(window.__bamcoSessionRuntime)return;window.__bamcoSessionRuntime=true;
const KEY='bamco.session.id.v1';let starting=null,ending=false,generation=0,lastActivity=Date.now(),lastSent=0;
for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,()=>lastActivity=Date.now(),{passive:true});
const call=async(action,extra={},options={})=>{
 if(typeof state==='undefined'||!state.token)return null;
 return api('/functions/v1/session-audit',{method:'POST',body:{action,...extra},...options});
};
function start(){
 if(!state?.token||ending)return Promise.resolve(null);
 if(sessionStorage.getItem(KEY))return Promise.resolve(sessionStorage.getItem(KEY));
 if(!starting){
  const epoch=generation;
  const request=call('start',{app_version:'sessions-20260910-2'}).then(data=>{
   const id=data?.session?.id;if(!id)throw Error('ثبت نشست انجام نشد؛ دوباره وارد شوید.');
   if(epoch===generation&&!ending&&state.token){sessionStorage.setItem(KEY,id);lastActivity=Date.now();lastSent=lastActivity}
   return id;
  }).finally(()=>{if(starting===request)starting=null});
  starting=request;
 }
 return starting;
}
async function heartbeat(){
 if(!state?.token||ending)return;const epoch=generation,id=sessionStorage.getItem(KEY);if(!id)return start();
 try{const sentActivity=lastActivity,active=sentActivity>lastSent,data=await call(active?'heartbeat':'status',{session_id:id});
  if(epoch!==generation||ending||!state.token)return;
  if(active)lastSent=sentActivity;
  if(data?.ended||data?.revoked||data?.expired){clear();showLogin();toast('نشست شما پایان یافته است. دوباره وارد شوید.',true)}
 }catch(error){if(!state.token)clear();console.warn('BAMCO session heartbeat',error.message)}
}
async function end(reason='logout',options={}){
 if(ending)return;ending=true;generation++;
 try{
  let id=sessionStorage.getItem(KEY);
  if(!id&&starting&&!options.keepalive)id=await starting.catch(()=>null);
  if(!state?.token)return;
  const data=await call('end',{session_id:id,reason},options);
  if(!data?.ended)throw Error('پایان نشست از سرور تأیید نشد.');
  clear();
 }finally{ending=false}
}
function clear(){generation++;sessionStorage.removeItem(KEY);starting=null}
window.bamcoSession={start,heartbeat,end,clear,currentId:()=>sessionStorage.getItem(KEY)};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state?.token)heartbeat().catch(error=>console.warn('BAMCO session',error.message))});
setInterval(()=>heartbeat().catch(error=>console.warn('BAMCO session',error.message)),120000);
window.addEventListener('pagehide',event=>{if(!event.persisted)end('closed',{keepalive:true}).catch(()=>{})});
})();
