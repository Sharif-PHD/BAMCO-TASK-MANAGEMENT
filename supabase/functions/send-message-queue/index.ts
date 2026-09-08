import { createClient } from 'jsr:@supabase/supabase-js@2.57.4'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Content-Type':'application/json'
}
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const escapeHtml=(value:unknown)=>String(value??'')
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&#039;')

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return reply({error:'Method not allowed'},405)
  const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const mailerinoKey=Deno.env.get('MAILERINO_API_KEY')
  const emailFrom=Deno.env.get('EMAIL_FROM')||'Product.Deployement.Engineerig@bamco-task-remiinder.ir'
  const replyTo=Deno.env.get('EMAIL_REPLY_TO')||emailFrom
  if(!mailerinoKey)return reply({error:'کلید API میلرینو روی سرور ثبت نشده است.'},503)
  const auth=req.headers.get('Authorization')||''
  const userClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}})
  const {data:{user}}=await userClient.auth.getUser()
  if(!user)return reply({error:'نشست کاربری معتبر نیست.'},401)
  const admin=createClient(url,serviceKey,{auth:{persistSession:false}})
  const {data:profile}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
  if(profile?.role!=='manager')return reply({error:'فقط مدیر مجاز به ارسال ایمیل است.'},403)
  const {batch_id}=await req.json().catch(()=>({}))
  if(!batch_id)return reply({error:'شناسه بسته پیام الزامی است.'},400)
  const {data:deliveries,error}=await admin.from('message_deliveries').select('id,thread_key,attempt_count,message_snapshots(*)').eq('batch_id',batch_id).eq('channel','email').in('status',['queued','failed']).lt('attempt_count',3)
  if(error)return reply({error:error.message},400)
  let sent=0,failed=0
  for(const delivery of deliveries||[]){
    const snapshot=Array.isArray(delivery.message_snapshots)?delivery.message_snapshots[0]:delivery.message_snapshots
    await admin.from('message_deliveries').update({status:'processing',attempt_count:(delivery.attempt_count||0)+1,last_attempt_at:new Date().toISOString(),error_message:null}).eq('id',delivery.id)
    try{
      if(!snapshot?.recipient_email)throw new Error('ایمیل گیرنده ثبت نشده است.')
      const trackingText=`شناسه پیگیری: ${delivery.thread_key}`
      const finalText=String(snapshot.final_text||'')
      const html=`<div dir="rtl" style="font-family:Tahoma;line-height:2"><p>${escapeHtml(finalText).replaceAll('\n','<br>')}</p><hr><small>${escapeHtml(trackingText)}</small></div>`
      const response=await fetch('https://api.mailerino.com/v1/send',{method:'POST',headers:{Authorization:`Bearer ${mailerinoKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:emailFrom,to:[snapshot.recipient_email],cc:snapshot.cc_emails||[],replyTo,subject:`${snapshot.subject} [${delivery.thread_key}]`,text:`${finalText}\n\n${trackingText}`,html})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result?.message||result?.error||`Mailerino ${response.status}`)
      await admin.from('message_deliveries').update({status:'sent',provider_message_id:result.id||result.messageId||null,sent_at:new Date().toISOString()}).eq('id',delivery.id);sent++
    }catch(err){await admin.from('message_deliveries').update({status:'failed',error_message:err instanceof Error?err.message:String(err)}).eq('id',delivery.id);failed++}
  }
  const nextStatus=failed?(sent?'partial':'failed'):'sent'
  await admin.from('message_batches').update({status:nextStatus,completed_at:new Date().toISOString()}).eq('id',batch_id)
  return reply({sent,failed})
})
