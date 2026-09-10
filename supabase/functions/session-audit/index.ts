import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2.57.4';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json',
  'Cache-Control':'no-store'
};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clamp=(value:unknown,max=500)=>String(value??'').slice(0,max);
const getIp=(req:Request)=>{
  const raw=(req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')||'').split(',')[0]?.trim()||'';
  if(!raw)return null;
  if(/^(\d{1,3}\.){3}\d{1,3}$/.test(raw))return raw;
  if(/^[0-9a-f:]+$/i.test(raw)&&raw.includes(':'))return raw;
  return null;
};

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return respond({error:'Method not allowed'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization=req.headers.get('Authorization')||'';
    if(!authorization)return respond({error:'نشست کاربری معتبر نیست.'},401);
    const authClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:{user},error:userError}=await authClient.auth.getUser();
    if(userError||!user)return respond({error:'نشست کاربری معتبر نیست.'},401);
    // Read this claim only after Auth has verified the bearer token above.
    const payload=JSON.parse(atob(authorization.replace(/^Bearer\s+/i,'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    const authSessionId=String(payload.session_id||'');
    if(!/^[0-9a-f-]{36}$/i.test(authSessionId))return respond({error:'شناسه ورود معتبر نیست.'},401);
    const admin=createClient(url,service,{auth:{persistSession:false}});
    const [{data:timeoutSetting},{data:retentionSetting}]=await Promise.all([
      admin.from('app_settings').select('value').eq('key','session.timeout_minutes').maybeSingle(),
      admin.from('app_settings').select('value').eq('key','session.retention_days').maybeSingle()
    ]);
    const timeoutMinutes=Math.max(5,Number(timeoutSetting?.value??30)||30);
    const retentionDays=Math.max(1,Number(retentionSetting?.value??30)||30);
    const body=await req.json().catch(()=>({})) as Record<string,unknown>;
    const action=String(body.action||'heartbeat');
    let sessionId=body.session_id?String(body.session_id):null;
    const now=new Date();
    if(!['start','end','heartbeat','status'].includes(action))return respond({error:'عملیات نشست معتبر نیست.'},400);
    const {data:authActive,error:authError}=await admin.rpc('bamco_session_auth_exists',{p_session_id:authSessionId,p_user_id:user.id});
    if(authError)throw authError;

    if(action==='start'){
      if(!authActive)return respond({error:'این ورود پایان یافته است. دوباره وارد شوید.',ended:true},401);
      const cutoff=new Date(now.getTime()-retentionDays*86400000).toISOString();
      await admin.from('user_sessions').delete().lt('login_at',cutoff);
      let {data,error}=await admin.from('user_sessions').insert({
        user_id:user.id,auth_session_id:authSessionId,last_activity_at:now.toISOString(),ip_address:getIp(req),
        user_agent:clamp(req.headers.get('user-agent'),1000),app_version:clamp(body.app_version||'web',120)
      }).select('id,login_at,last_activity_at,logout_at,revoked_at,ended_reason').single();
      if(error?.code==='23505')({data,error}=await admin.from('user_sessions').select('id,login_at,last_activity_at,logout_at,revoked_at,ended_reason').eq('auth_session_id',authSessionId).eq('user_id',user.id).single());
      if(error)return respond({error:error.message},400);
      if(data?.logout_at&&data.ended_reason==='closed'&&!data.revoked_at){const resumed=await admin.from('user_sessions').update({logout_at:null,ended_reason:null,last_activity_at:now.toISOString()}).eq('id',data.id).eq('user_id',user.id).eq('auth_session_id',authSessionId).eq('ended_reason','closed').is('revoked_at',null).select('id,login_at,last_activity_at,logout_at,revoked_at,ended_reason').single();if(resumed.error)throw resumed.error;data=resumed.data}
      if(data?.logout_at||data?.revoked_at)return respond({error:'این نشست پایان یافته است. دوباره وارد شوید.',ended:true},409);
      return respond({ok:true,session:data,timeout_minutes:timeoutMinutes,retention_days:retentionDays});
    }

    if(!sessionId&&action==='end'){
      const {data,error}=await admin.from('user_sessions').select('id').eq('auth_session_id',authSessionId).eq('user_id',user.id).maybeSingle();
      if(error)throw error;
      sessionId=data?.id;
      if(!sessionId)return respond({ok:true,ended:true,ended_reason:'logout'});
    }
    if(!sessionId)return respond({error:'شناسه نشست الزامی است.'},400);
    const {data:session,error:sessionError}=await admin.from('user_sessions').select('id,user_id,auth_session_id,last_activity_at,logout_at,revoked_at,ended_reason').eq('id',sessionId).eq('user_id',user.id).maybeSingle();
    if(sessionError)return respond({error:sessionError.message},400);
    if(!session)return respond({error:'نشست ثبت‌شده پیدا نشد.',expired:true,ended:true},404);
    if(session.auth_session_id&&session.auth_session_id!==authSessionId)return respond({error:'شناسه نشست با این ورود مطابقت ندارد.'},403);
    // A verified connected client may resume a page-close marker, never logout/revocation.
    if(authActive&&session.logout_at&&session.ended_reason==='closed'&&!session.revoked_at&&['heartbeat','status'].includes(action)){const resumed=await admin.from('user_sessions').update({logout_at:null,ended_reason:null,last_activity_at:now.toISOString()}).eq('id',sessionId).eq('user_id',user.id).eq('auth_session_id',authSessionId).eq('ended_reason','closed').is('revoked_at',null).select('id').single();if(resumed.error)throw resumed.error;return respond({ok:true,ended:false,revoked:false,expired:false,last_activity_at:now.toISOString(),timeout_minutes:timeoutMinutes})}
    if(session.revoked_at||session.logout_at)return respond({ok:true,revoked:!!session.revoked_at,expired:session.ended_reason==='inactivity',ended:true,ended_reason:session.ended_reason,timeout_minutes:timeoutMinutes});

    // Upgrade a still-connected pre-v2 client using its verified token and its own
    // audit ID. Never infer a legacy login from another session of the same user.
    if(!session.auth_session_id&&authActive&&action!=='end'){
      const {data:linked,error}=await admin.from('user_sessions').update({auth_session_id:authSessionId})
        .eq('id',sessionId).eq('user_id',user.id).is('auth_session_id',null)
        .is('logout_at',null).is('revoked_at',null).select('id,auth_session_id').maybeSingle();
      if(error||!linked)return respond({error:error?.message||'وضعیت نشست تغییر کرده است؛ دوباره بررسی کنید.'},409);
    }

    if(action==='end'||!authActive){
      const reason=authActive&&['logout','inactivity','closed','replaced'].includes(String(body.reason))?String(body.reason):'logout';
      const {data,error}=await admin.from('user_sessions').update({logout_at:now.toISOString(),ended_reason:reason}).eq('id',sessionId).eq('user_id',user.id).select('id,logout_at').single();
      if(error||!data?.logout_at)return respond({error:error?.message||'پایان نشست ذخیره نشد.'},500);
      return respond({ok:true,ended:true,ended_reason:reason});
    }
    if(action!=='heartbeat'&&action!=='status')return respond({error:'عملیات نشست معتبر نیست.'},400);

    const last=new Date(session.last_activity_at).getTime();
    if(Number.isFinite(last)&&now.getTime()-last>=timeoutMinutes*60000){
      const {error}=await admin.from('user_sessions').update({logout_at:now.toISOString(),ended_reason:'inactivity'}).eq('id',sessionId).eq('user_id',user.id);
      if(error)throw error;
      return respond({ok:true,expired:true,ended:true,ended_reason:'inactivity',timeout_minutes:timeoutMinutes});
    }
    if(action==='heartbeat'){
      const {error}=await admin.from('user_sessions').update({last_activity_at:now.toISOString()}).eq('id',sessionId).eq('user_id',user.id).is('logout_at',null).is('revoked_at',null);
      if(error)return respond({error:error.message},400);
    }
    return respond({ok:true,expired:false,revoked:false,ended:false,timeout_minutes:timeoutMinutes,last_activity_at:action==='heartbeat'?now.toISOString():session.last_activity_at});
  }catch(error){
    console.error('session-audit',error);
    return respond({error:error instanceof Error?error.message:'خطای ناشناخته نشست.'},500);
  }
});
