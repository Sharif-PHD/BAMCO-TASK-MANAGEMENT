const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,DELETE,OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const normalizeEmail=(value:unknown)=>String(value||"").trim().toLowerCase();
const internalEmail=()=>`person-${crypto.randomUUID()}@no-email.invalid`;
const safeChannel=(value:unknown,hasEmail:boolean)=>hasEmail&&["portal","email","both"].includes(String(value))?String(value):"none";

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,authorization=req.headers.get("Authorization")||"";
    const userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});if(!userRes.ok)return json({error:"ورود معتبر نیست."},401);
    const user=await userRes.json();
    const managerRes=await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role,active`,{headers:{apikey:service,Authorization:`Bearer ${service}`}}),managerRows=await managerRes.json();
    if(managerRows?.[0]?.role!=="manager"||!managerRows[0].active)return json({error:"دسترسی مدیر لازم است."},403);
    // Profile guards and RLS need the verified manager's auth.uid(). Service-role
    // credentials belong only to Auth Admin calls, not these profile writes.
    const saveProfile=async(id:string,profile:Record<string,unknown>,failure:string)=>{
      const saved=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{apikey:anon,Authorization:authorization,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(profile)});
      const rows=await saved.json().catch(()=>null);
      if(!saved.ok)return json({error:rows?.message||rows?.error||failure},saved.status);
      if(!Array.isArray(rows)||rows.length!==1||rows[0].id!==id)return json({error:"ذخیره اطلاعات تأیید نشد؛ فرد را دوباره انتخاب کنید."},409);
      return json({ok:true,id,profile:rows[0]});
    };
    const b=await req.json();
    if(req.method==="DELETE"){
      if(!b.user_id)return json({error:"شناسه فرد ارسال نشده است."},400);
      if(b.user_id===user.id)return json({error:"مدیر نمی‌تواند حساب در حال استفاده خود را حذف کند."},400);
      const deleted=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(b.user_id)}`,{method:"DELETE",headers:{apikey:service,Authorization:`Bearer ${service}`}}),result=await deleted.json().catch(()=>({}));
      if(!deleted.ok){const linked=String(result.msg||result.message||"").toLowerCase().includes("database");return json({error:linked?"این فرد سابقه مرتبط دارد؛ حساب را غیرفعال کنید.":result.msg||result.message||"حذف حساب انجام نشد."},deleted.status)}
      return json({ok:true});
    }
    if(req.method!=="POST")return json({error:"روش درخواست مجاز نیست."},405);
    if(!String(b.full_name||"").trim())return json({error:"نام فرد الزامی است."},400);
    const publicEmail=normalizeEmail(b.email)||null,hasEmail=!!publicEmail,role=b.role==="manager"?"manager":"owner",channel=safeChannel(b.default_message_channel,hasEmail);
    const profileBody:Record<string,unknown>={email:publicEmail,full_name:String(b.full_name).trim(),display_name:String(b.full_name).trim(),role,gender:b.gender||null,salutation:b.salutation||null,active:b.active!==false,messaging_enabled:hasEmail,default_message_channel:channel};
    if(Array.isArray(b.cc_emails))profileBody.cc_emails=b.cc_emails;
    if(b.user_id){
      const oldRes=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(b.user_id)}&select=email,must_change_password`,{headers:{apikey:service,Authorization:`Bearer ${service}`}}),oldRows=await oldRes.json(),old=oldRows?.[0];if(!old)return json({error:"فرد پیدا نشد."},404);
      const emailChanged=normalizeEmail(old.email)!==normalizeEmail(publicEmail),authBody:Record<string,unknown>={user_metadata:{full_name:profileBody.full_name}};
      if(emailChanged){authBody.email=publicEmail||internalEmail();authBody.email_confirm=true}
      const authUpdate=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(b.user_id)}`,{method:"PUT",headers:{apikey:service,Authorization:`Bearer ${service}`,"Content-Type":"application/json"},body:JSON.stringify(authBody)}),authResult=await authUpdate.json().catch(()=>({}));if(!authUpdate.ok)return json({error:authResult.msg||authResult.message||"ویرایش حساب انجام نشد."},authUpdate.status);
      return await saveProfile(b.user_id,profileBody,"ویرایش اطلاعات فرد انجام نشد.");
    }
    const authEmail=publicEmail||internalEmail(),created=await fetch(`${url}/auth/v1/admin/users`,{method:"POST",headers:{apikey:service,Authorization:`Bearer ${service}`,"Content-Type":"application/json"},body:JSON.stringify({email:authEmail,password:"123456",email_confirm:true,user_metadata:{full_name:profileBody.full_name}})}),account=await created.json();if(!created.ok)return json({error:account.msg||account.message||"ساخت حساب انجام نشد."},created.status);
    return await saveProfile(account.id,{...profileBody,must_change_password:hasEmail},"حساب ساخته شد اما اطلاعات فرد کامل ذخیره نشد.");
  }catch(e){return json({error:e instanceof Error?e.message:"خطای ناشناخته"},500)}
});
