const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture,until,pause}=require('./helpers/app-fixture.cjs');
test('actual login module records one session, gates first entry, changes password, and revokes logout',async t=>{
 const f=await fixture({authUi:true,fetchResult:({endpoint})=>endpoint==='token'?{access_token:'signed-in',refresh_token:'refresh-fixture',expires_in:3600,user:{id:'test-manager'}}:undefined}),{w,d}=f;t.after(()=>f.dispose());
 f.profiles[0].must_change_password=true;w.eval('showLogin()');const start=f.calls.length;
 d.querySelector('#email').value='manager@example.test';d.querySelector('#password').value='Synthetic-test-password';
 const code=d.querySelector('#loginVerification').dataset.code;[...d.querySelectorAll('.verification-digit')].forEach((input,i)=>{input.value=code[i];input.dispatchEvent(new w.Event('input',{bubbles:true}))});
 d.querySelector('#loginForm').requestSubmit();await until(()=>d.querySelector('#passwordDialog').open);
 assert.equal(f.calls.slice(start).filter(c=>c.endpoint==='token').length,1);assert.equal(f.calls.slice(start).filter(c=>c.endpoint==='session-audit'&&c.body.action==='start').length,1);
 assert(!f.calls.slice(start).some(c=>c.endpoint==='tasks'||c.endpoint==='task_status_view'));
 d.querySelector('#newPassword').value='New-test-password-739!';d.querySelector('#confirmPassword').value='New-test-password-739!';d.querySelector('#passwordForm').requestSubmit();await until(()=>!d.querySelector('#passwordDialog').open);await pause(100);
 assert.equal(f.calls.slice(start).filter(c=>c.endpoint==='user'&&c.method==='PUT').length,1);assert.equal(f.calls.slice(start).filter(c=>c.endpoint==='profiles'&&c.method==='PATCH').length,1);assert.equal(f.profiles[0].must_change_password,false);
 d.querySelector('.home-welcome-dialog')?.close();d.querySelector('#logoutBtn').click();await until(()=>!d.querySelector('#loginView').classList.contains('hidden'));
 assert.equal(f.calls.slice(start).filter(c=>c.endpoint==='logout').length,1);assert.equal(w.eval('state.token'),'');assert.deepEqual(f.errors,[]);
});
