const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('workflow message renderer is compact, centered and warning/overdue colored',()=>{
  const renderer=read('assets/js/message-renderer.js');
  assert.match(renderer,/workflow-sticker/);
  assert.match(renderer,/display:block;margin:0 auto/);
  assert.match(renderer,/width:calc\(100% - 28px\);max-width:760px;margin:10px auto 12px/);
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
