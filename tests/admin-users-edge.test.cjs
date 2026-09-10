const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/admin-users/index.ts'),'utf8'));

function service(options={}){
 const calls=[],stored={id:'person-id',email:'person@example.test',full_name:'نام قبلی',role:'owner',active:true,cc_emails:['copy@example.test'],must_change_password:false};
 let handler;
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 const fetch=async(url,init={})=>{
  const u=new URL(url),method=init.method||'GET',body=init.body?JSON.parse(init.body):null;
  calls.push({url:u,method,body,headers:new Headers(init.headers)});
  if(u.pathname==='/auth/v1/user')return options.unauthorized?response({error:'invalid token'},401):response({id:'manager-id'});
  if(u.pathname==='/rest/v1/profiles'&&u.searchParams.get('id')==='eq.manager-id')return response([{role:options.role||'manager',active:options.active!==false}]);
  if(u.pathname==='/rest/v1/profiles'&&method==='GET')return response([stored]);
  if(u.pathname==='/auth/v1/admin/users'&&method==='POST')return response({id:stored.id});
  if(u.pathname==='/auth/v1/admin/users/person-id')return response({id:stored.id});
  if(u.pathname==='/rest/v1/rpc/delete_person_account')return options.deleteFail?response({message:'synthetic delete rejected'},409):response(options.unconfirmedDeletion?{}:{ok:true,tasks_retained:2,active_tasks:[{id:901,owner_id:null,owner_deleted_at:'2026-09-10T00:00:00Z'}],avatar_paths:['person-id/avatar.png']});
  if(u.pathname==='/storage/v1/object/avatars')return response({},options.cleanupFail?500:200);
  if(u.pathname==='/rest/v1/profiles'&&method==='PATCH'){
   // Reproduce the deployed guard: a service-role token has no manager auth.uid().
   if(new Headers(init.headers).get('Authorization')!=='Bearer manager-jwt')return response({code:'P0001',message:'تغییر این فیلدها مجاز نیست'},400);
   if(options.patchError)return response({code:'23505',message:'ایمیل تکراری است'},409);
   if(options.emptyWrite)return response([]);
   Object.assign(stored,body);return response([stored]);
  }
  throw new Error('Unexpected backend request '+method+' '+u.pathname);
 };
 vm.runInNewContext(source,{Deno:{env:{get:key=>({SUPABASE_URL:'https://fixture.test',SUPABASE_ANON_KEY:'public-key',SUPABASE_SERVICE_ROLE_KEY:'private-service-key'})[key]},serve:fn=>handler=fn},fetch,Response,crypto});
 return {calls,stored,async remove(body={}){const r=await handler(new Request('https://fixture.test/functions/v1/admin-users',{method:'DELETE',headers:{Authorization:'Bearer manager-jwt','Content-Type':'application/json'},body:JSON.stringify({user_id:stored.id,...body})}));return {status:r.status,body:await r.json()}},async save(body={}){const r=await handler(new Request('https://fixture.test/functions/v1/admin-users',{method:'POST',headers:{Authorization:'Bearer manager-jwt','Content-Type':'application/json'},body:JSON.stringify({user_id:stored.id,full_name:'نام ویرایش‌شده',email:stored.email,role:'manager',gender:'خانم',salutation:'سرکار خانم',active:true,default_message_channel:'both',...body})}));return{status:r.status,body:await r.json()}}};
}

test('deployed people handler writes profiles as the authenticated manager and verifies a stored row',async()=>{
 const f=service(),r=await f.save();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.ok,true);
 assert.equal(f.stored.full_name,'نام ویرایش‌شده');assert.equal(f.stored.role,'manager');
 assert.deepEqual(f.stored.cc_emails,['copy@example.test'],'unexposed CC addresses must not be erased by an edit');
 const patch=f.calls.find(c=>c.method==='PATCH');assert.equal(patch.headers.get('apikey'),'public-key');assert.equal(patch.headers.get('Prefer'),'return=representation');
 assert.equal(r.body.profile.id,'person-id');assert.equal(r.body.profile.full_name,f.stored.full_name);
 const auth=f.calls.find(c=>c.url.pathname==='/auth/v1/admin/users/person-id');assert.equal(auth.headers.get('Authorization'),'Bearer private-service-key');
});

test('changing an email does not reset an existing password',async()=>{
 const f=service(),r=await f.save({email:'changed@example.test'});assert.equal(r.status,200);
 const update=f.calls.find(c=>c.url.pathname==='/auth/v1/admin/users/person-id');assert.equal(update.body.email,'changed@example.test');assert(!('password' in update.body));assert.equal(f.stored.must_change_password,false);
});

test('new accounts use the same manager profile-write context',async()=>{
 const f=service(),r=await f.save({user_id:null});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(f.stored.role,'manager');assert.equal(r.body.profile.id,'person-id');
 assert.equal(r.body.temporary_password.length,20);assert.equal(f.calls.find(c=>c.url.pathname==='/auth/v1/admin/users').body.password,r.body.temporary_password);assert.equal(f.stored.must_change_password,true);
});

test('no-email users retain internal delivery and removing an email preserves their login',async()=>{
 const f=service(),r=await f.save({email:null,default_message_channel:'both'});assert.equal(r.status,200);assert.equal(f.stored.messaging_enabled,true);assert.equal(f.stored.default_message_channel,'portal');
 assert(!('email' in f.calls.find(c=>c.url.pathname==='/auth/v1/admin/users/person-id').body));
 const created=service(),a=await created.save({user_id:null,email:null});assert.equal(a.status,200);assert.equal(created.calls.find(c=>c.url.pathname==='/auth/v1/admin/users').body.email,a.body.login_name+'@no-email.invalid');assert.equal(a.body.credential_editable,true);assert(a.body.temporary_password);assert.equal(created.stored.must_change_password,true);
});

test('an empty profile update or database rejection cannot report successful saving',async()=>{
 for(const options of [{emptyWrite:true},{patchError:true}]){const f=service(options),r=await f.save();assert(r.status>=400);assert(!r.body.ok);assert(r.body.error);}
 const f=service({patchError:true}),r=await f.save();assert.match(r.body.error,/ایمیل تکراری/);
});

test('unauthenticated, inactive and nonmanager callers cannot reach privileged account writes',async()=>{
 for(const options of [{unauthorized:true},{role:'owner'},{active:false}]){const f=service(options),r=await f.save();assert([401,403].includes(r.status));assert(!f.calls.some(c=>c.url.pathname.includes('/admin/users')||c.method==='PATCH'));}
});


test('delete uses the verified manager identity, server-only transaction and Storage API',async()=>{
 const f=service(),r=await f.remove({p_actor_id:'forged',actor_id:'forged'});assert.equal(r.status,200);assert.equal(r.body.tasks_retained,2);assert.equal(r.body.active_tasks[0].id,901);
 const call=f.calls.find(c=>c.url.pathname==='/rest/v1/rpc/delete_person_account');assert.deepEqual(call.body,{p_user_id:'person-id',p_actor_id:'manager-id'});assert.equal(call.headers.get('Authorization'),'Bearer private-service-key');
 const cleanup=f.calls.find(c=>c.url.pathname==='/storage/v1/object/avatars');assert.deepEqual(cleanup.body.prefixes,['person-id/avatar.png']);assert(!f.calls.some(c=>c.method==='DELETE'&&c.url.pathname.includes('/auth/v1/admin/users')));
});
test('deletion rejects nonmanagers and self deletion before the privileged transaction',async()=>{
 for(const options of [{unauthorized:true},{role:'owner'},{active:false}]){const f=service(options),r=await f.remove();assert([401,403].includes(r.status));assert(!f.calls.some(c=>c.url.pathname.includes('/rpc/')))}
 const f=service(),r=await f.remove({user_id:'manager-id'});assert.equal(r.status,400);assert(!f.calls.some(c=>c.url.pathname.includes('/rpc/')));
});
test('deletion failures cannot report success and photo cleanup failures remain distinguishable',async()=>{
 for(const options of [{deleteFail:true},{unconfirmedDeletion:true}]){const f=service(options),r=await f.remove();assert.equal(r.status,409);assert(!r.body.ok);assert(!f.calls.some(c=>c.url.pathname.includes('/storage/')))}
 const f=service({cleanupFail:true}),r=await f.remove();assert.equal(r.status,200);assert.equal(r.body.ok,true);assert(r.body.cleanup_warning);
});
