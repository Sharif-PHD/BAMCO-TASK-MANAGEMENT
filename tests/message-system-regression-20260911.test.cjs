const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('workflow message renderer is compact, centered and warning/overdue colored',()=>{
  const renderer=read('assets/js/message-renderer.js');
  assert.match(renderer,/workflow-sticker/);
  assert.match(renderer,/display:block;margin:0 auto/);
  assert.match(renderer,/width:calc\(100% - 28px\);max-width:980px;margin:10px auto 12px/);
  assert.match(renderer,/#f0c44c/);
  assert.match(renderer,/#e8756e/);
  assert.match(renderer,/text-align:center!important/);
  assert.match(renderer,/replace\(\/\\n\{3,\}\/g,'\\n\\n'\)/);
});

test('system message UI blocks generic table-suite controls and preserves inbox cards',()=>{
  const root=read('assets/js/messaging-history-root-20260911.js');
  assert.match(root,/\.workflow-message \.suite-filters/);
  assert.match(root,/\.workflow-message table\{margin-left:auto!important;margin-right:auto!important;min-width:0!important\}/);
  assert.doesNotMatch(root,/qa\('\[data-mid\]',list\)\.forEach\(x=>x\.remove\(\)\)/);
  assert.match(root,/conversation-route-count/);
  assert.match(root,/#d52f2f/);
  assert.match(root,/پاک کردن زنجیره/);
  assert.match(root,/chat_clear_system_thread/);
});

test('database migration exposes only own system chain and creates self-system alerts',()=>{
  const sql=read('supabase/migrations/20260911131500_unified_system_chain_and_chat_alerts.sql');
  assert.match(sql,/t\.system_recipient_id=auth\.uid\(\)/);
  assert.match(sql,/\(new\.is_system and p\.id=t\.system_recipient_id\)/);
  assert.match(sql,/chat_clear_system_thread/);
  assert.match(sql,/delete from public\.chat_messages where thread_id=p_thread_id/);
});


test('automatic message renders risk and waiting work as sibling sections from one snapshot',()=>{
  const renderer=require(path.join(__dirname,'..','assets/js/message-renderer.js'));
  const snapshot={body_template:'[جدول امور دیرکردی]\n\n[جدول امور هشداری]',warning_task_ids:[2],overdue_task_ids:[1],waiting_task_ids:[3],tasks:[{id:1,legacy_id:11,title:'Late',status:'در حال انجام',priority:'فوری',due_date:'2026-09-01',due_state:'overdue'},{id:2,legacy_id:12,title:'Warn',status:'در حال انجام',priority:'متوسط',due_date:'2026-09-20',due_state:'warning'},{id:3,legacy_id:13,title:'Wait',status:'منتظر پاسخ',status_key:'waiting',status_kind:'waiting',priority:'متوسط',start_date:'2026-09-02',due_state:'none'}]};
  const html=renderer.html(snapshot);
  assert.match(html,/امور هشداری و دیرکردی/);
  assert.match(html,/امور منتظر پاسخ/);
  assert.match(html,/workflow-auto-task-grid/);
  assert.match(html,/data-bamco-task-id="3"/);
  assert.equal((html.match(/workflow-auto-task-grid/g)||[]).length,1);
  const empty=renderer.html({...snapshot,waiting_task_ids:[],tasks:snapshot.tasks.filter(x=>x.id!==3)});
  assert.match(empty,/موردی در انتظار پاسخ نیست/);
});
