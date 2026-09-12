const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('../../tests/helpers/app-fixture.cjs');

test('manager current queue and history render from one authoritative workflow snapshot',async t=>{
  const now=new Date().toISOString();
  const snapshot={
    current_requests:[{id:501,request_type:'create',request_status:'in_review',current_stage:2,requested_by:'test-owner',task_id:null,created_at:now,proposed_data:{title:'درخواست جاری تست',priority:'متوسط'}}],
    history_requests:[{id:500,request_type:'create',request_status:'approved',current_stage:2,requested_by:'test-owner',task_id:null,created_at:now,reviewed_at:now,manager_note:'تأیید شد',proposed_data:{title:'درخواست سابقه تست'}}],
    routes:[{request_id:501,stage_no:2,stage_title:'تأیید مدیریت',approver_names:'مدیر آزمایشی',actionable:true}]
  };
  const f=await fixture({fetchResult:({endpoint})=>endpoint==='request_workflow_snapshot'?snapshot:undefined});
  t.after(()=>f.dispose());

  const workflow=await f.w.bamcoLoadRequestWorkflow();
  assert.deepEqual(workflow.requests.map(x=>x.id),[501]);
  assert.deepEqual(workflow.history.map(x=>x.id),[500]);
  assert.equal(workflow.routes[0].actionable,true);

  f.w.__workflowTest=workflow;
  f.w.eval("state.requests=window.__workflowTest.requests;state.requestHistory=window.__workflowTest.history;state.requestRoutes=window.__workflowTest.routes;renderRequests();renderRequestHistory();");

  assert.match(f.d.querySelector('#approvalBody').textContent,/درخواست جاری تست/);
  assert.ok(f.d.querySelector('[data-review-request="501"]'),'actionable manager request must expose Review');
  assert.ok(f.d.querySelector('#requestHistoryBody tr[data-request-id="500"]'));
  assert.equal(f.d.querySelector('#requestHistoryBody tr[data-request-id="501"]'),null);
  assert.match(f.d.querySelector('#requestHistoryBody').textContent,/درخواست سابقه تست/);

  const calls=f.calls.filter(c=>c.endpoint==='request_workflow_snapshot');
  assert.ok(calls.length>=1,'authoritative workflow snapshot RPC must be used');
});
