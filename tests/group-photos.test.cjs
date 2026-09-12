const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture,until}=require('./helpers/app-fixture.cjs');
test('group photo validates files, retries failed metadata without duplicating groups, paints and removes',async t=>{
 const f=await fixture(),{w,d}=f;t.after(()=>f.dispose());await f.open('groupChat');await until(()=>d.querySelector('[data-create-group]'));
 d.querySelector('[data-create-group]').click();await until(()=>d.querySelector('#conversationGroupForm'));
 const form=d.querySelector('#conversationGroupForm'),fileInput=form.elements.group_photo;
 form.elements.title.value='گروه عکس';form.querySelector('[value=test-owner]').click();
 const choose=file=>{Object.defineProperty(fileInput,'files',{configurable:true,value:[file]});fileInput.dispatchEvent(new w.Event('change',{bubbles:true}))};
 choose(new w.File(['bad'],'bad.svg',{type:'image/svg+xml'}));assert(form.querySelector('.form-error').textContent.includes('۵ مگابایت'));assert.equal(f.uploads.length,0);
 choose(new w.File(['photo'],'عکس.png',{type:'image/png'}));assert(form.querySelector('.group-photo-preview img'));
 f.failures.add('chat_set_group_avatar');form.requestSubmit();await until(()=>form.querySelector('.form-error').textContent);assert.equal(f.threads.filter(t=>t.thread_type==='group').length,1);assert(d.querySelector('#groupManageDialog').open);
 assert(f.calls.some(c=>c.method==='DELETE'&&c.url.includes('/group-avatars')));
 f.failures.delete('chat_set_group_avatar');form.requestSubmit();await until(()=>!d.querySelector('#groupManageDialog').open);await until(()=>d.querySelector('[data-kind=group] .conversation-avatar img'));
 assert.equal(f.threads.filter(t=>t.thread_type==='group').length,1);assert.match(f.threads.find(t=>t.thread_type==='group').avatar_path,/\.png$/);
 d.querySelector('[data-kind=group]').click();await until(()=>d.querySelector('.messenger-head .chat-avatar img'));
 [...d.querySelectorAll('.messenger-head-actions button')].find(b=>b.textContent==='تنظیمات گروه').click();await until(()=>d.querySelector('[data-remove-group-photo]'));
 d.querySelector('[data-remove-group-photo]').click();d.querySelector('#conversationGroupForm').requestSubmit();await until(()=>!d.querySelector('#groupManageDialog').open);assert.equal(f.threads.find(t=>t.thread_type==='group').avatar_path,null);assert.deepEqual(f.errors,[]);
});
