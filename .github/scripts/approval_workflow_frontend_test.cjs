const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,until}=require('../../tests/helpers/app-fixture.cjs');

test('manager current queue and history render from one authoritative workflow snapshot',async t=>{
  const now=new Date().toISOString();
  const snapshot={
    current_requests:[{id:501,request_type:'create',request_status:'in_review',current_stage:2,requested_by:'test-owner',task_id:null,created_at:now,proposed_data:{title:'درخواست جاری تست',priority:'متوسط'}}],
    history_requests:[{id:500,request_type:'create',request_status:'approved',current_stage:2,requested_by:'test-owner',task_id:null,created_at:now,reviewed_at:now,manager_note:'تأیید شد',proposed_data:{title:'درخواست سابقه تست'}}],
    routes:[{request_id:501,stage_no:2,stage_title:'تأیید مدیریت',approver_names:'مدیر آزمایشی',actionable:true}]
  };
  const f=await fixture({fetchResult:({endpoint})=>endpoint==='request_workflow_snapshot'?snapshot:undefined});
  t.after(()=>f.dispose());
  await f.open('approvals');
  await until(()=>f.d.querySelector('[data-review-request="501"]'));
  assert.match(f.d.querySelector('#approvalBody').textContent,/درخواست جاری تست/);
  assert.ok(f.d.querySelector('[data-review-request="501"]'));
  f.d.querySelector('[data-review-request="501"]').click();
  assert.equal(f.d.querySelector('#reviewDialog').open,true);
  f.d.querySelector('#reviewDialog').close();
  await f.open('requestHistory');
  await until(()=>f.d.querySelector('#requestHistoryBody tr[data-request-id="500"]'));
  assert.ok(f.d.querySelector('#requestHistoryBody tr[data-request-id="500"]'));
  assert.equal(f.d.querySelector('#requestHistoryBody tr[data-request-id="501"]'),null);
  assert.match(f.d.querySelector('#requestHistoryBody').textContent,/درخواست سابقه تست/);
});
