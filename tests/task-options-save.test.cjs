const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,until,pause}=require('./helpers/app-fixture.cjs');

test('catalog edit stays visible when an old read or another page refresh fails',async()=>{
 const statuses=[{key:'doing',label:'در حال انجام',kind:'active',color:'#328263',sort_order:1,active:true,is_system:true,owner_mode:'required',start_mode:'required',due_mode:'required',tracks_deadline:true,archivable:false}];
 const priorities=[{key:'medium',label:'متوسط',color:'#f2a93b',sort_order:1,active:true}];
 let holdRead=false,releaseRead,readStarted=false;
 const f=await fixture({tables:{task_statuses:statuses,priorities},fetchResult:async({endpoint,body,tables,data})=>{
  if(endpoint==='task_statuses'&&holdRead){holdRead=false;const snapshot=structuredClone(data);readStarted=true;await new Promise(resolve=>releaseRead=resolve);return snapshot}
  if(endpoint==='save_task_option'){const row=(body.p_kind==='status'?tables.task_statuses:tables.priorities).find(x=>x.key===body.p_key);Object.assign(row,body.p_data);return row}
 }});
 try{
  await f.open('systemOptions');await until(()=>f.d.querySelector('[data-option-edit="doing"]'));
  assert.equal(f.d.querySelector('.catalog-guide'),null);
  holdRead=true;const oldRead=f.w.bamcoOptions.load(true);await until(()=>readStarted);
  f.d.querySelector('[data-option-edit="doing"]').click();
  const form=f.d.querySelector('#taskOptionForm');form.elements.label.value='در حال پیگیری';form.elements.color.value='#804040';
  f.failures.add('task_status_view');form.querySelector('[type=submit]').click();
  await until(()=>!f.d.querySelector('#taskOptionDialog').open);
  assert.equal(f.w.bamcoOptions.rows('status')[0].label,'در حال پیگیری');
  assert.match(f.d.querySelector('.catalog-table tbody').textContent,/در حال پیگیری/);
  releaseRead();await oldRead;
  await until(()=>f.calls.some(x=>x.endpoint==='ui-notice'&&x.body.includes('تنظیمات ذخیره شد؛')));
  assert.equal(f.w.bamcoOptions.rows('status')[0].label,'در حال پیگیری');
  assert.equal(form.querySelector('.catalog-error').textContent,'');
  f.failures.delete('task_status_view');
  f.d.querySelector('[data-option-edit="medium"]').click();
  const priorityForm=f.d.querySelector('#taskOptionForm');priorityForm.elements.label.value='عادی';
  f.failures.add('save_task_option');priorityForm.querySelector('[type=submit]').click();
  await until(()=>priorityForm.querySelector('.catalog-error').textContent);
  assert(f.d.querySelector('#taskOptionDialog').open);
  assert.equal(f.w.bamcoOptions.rows('priority')[0].label,'متوسط');
  f.failures.delete('save_task_option');priorityForm.querySelector('[type=submit]').click();
  await until(()=>!f.d.querySelector('#taskOptionDialog').open);
  assert.equal(f.w.bamcoOptions.rows('priority')[0].label,'عادی');
  assert.equal(f.calls.filter(x=>x.endpoint==='save_task_option').length,3);
  await pause(100);assert.deepEqual(f.errors,[]);
 }finally{releaseRead?.();await f.dispose()}
});
