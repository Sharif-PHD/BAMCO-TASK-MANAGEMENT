const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
const handler=source.split('\n').find(l=>l.startsWith("$('#passwordForm').addEventListener"));
async function run(failAuth=false,failProfile=false){
 let submit;const calls=[];const form={reset(){calls.push('reset')}};
 const elements={'#passwordForm':{addEventListener(_,cb){submit=cb}},'#newPassword':{value:'Changed-password-83!'},'#confirmPassword':{value:'Changed-password-83!'},'#passwordError':{textContent:''},'#passwordDialog':{close(){calls.push('close')}}};
 const state={profile:{id:'test',must_change_password:true}};
 const context={$:s=>elements[s],state,Date,window:{fetch:async()=>new Response('{}')},setTimeout,clearTimeout,api:async()=>{calls.push('auth');if(failAuth)throw Error('auth failed')},update:async(_,__,data)=>{calls.push(data.must_change_password?'require':'clear');if(failProfile&&!data.must_change_password)throw Error('profile failed')},toast(){},showView(){calls.push('navigate')}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/auth-session.js'),'utf8'),context);vm.runInContext(handler,context);
 const event={preventDefault(){},currentTarget:form};const pending=submit(event);event.currentTarget=null;await pending;return{calls,state,error:elements['#passwordError'].textContent};
}
test('password update succeeds before clearing mandatory change flag; form survives async event',async()=>{const r=await run();assert.deepEqual(r.calls,['auth','clear','reset','close','navigate']);assert.equal(r.state.profile.must_change_password,false)});
test('Auth failure cannot clear mandatory password change or close dialog',async()=>{const r=await run(true);assert.deepEqual(r.calls,['auth','require']);assert.equal(r.state.profile.must_change_password,true);assert.equal(r.error,'auth failed')});
test('profile failure preserves mandatory change state',async()=>{const r=await run(false,true);assert.deepEqual(r.calls,['auth','clear','require']);assert.equal(r.state.profile.must_change_password,true);assert.equal(r.error,'profile failed')});
