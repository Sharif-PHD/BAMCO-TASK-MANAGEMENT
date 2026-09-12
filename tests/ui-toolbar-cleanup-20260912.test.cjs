const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,until,pause}=require('./helpers/app-fixture.cjs');

test('dashboard performance dates auto-apply with no Apply button and Clear remains',async t=>{
  const f=await fixture();t.after(()=>f.dispose());await f.open('dashboard');
  assert.equal(f.d.querySelector('#applyPerf'),null);
  assert.ok(f.d.querySelector('#clearPerf'));
  const dateButton=f.d.querySelector('[data-dashboard-date="perfFrom"]');assert.ok(dateButton);
  dateButton.click();await pause(10);
  f.d.querySelector('#setDateBtn').click();await pause(20);
  assert.equal(f.errors.length,0,f.errors.join('\n'));
});

test('response report has no search and first-row buttons are regular weight',async t=>{
  const f=await fixture({tables:{message_response_tracking:[]}});t.after(()=>f.dispose());
  await f.open('responseReport');await until(()=>f.d.querySelector('#responseReportView .response-command-row'));
  assert.equal(f.d.querySelector('#canonicalResponseSearch'),null);
  assert.equal(f.d.querySelector('#responseReportView input[type="search"]'),null);
  assert.match(f.d.querySelector('#bamcoCanonicalReportCss').textContent,/response-command-row button\{font-weight:400!important\}/);
  assert.equal(f.errors.length,0,f.errors.join('\n'));
});

test('message center is one bounded row with no search and channel follows Refresh',async t=>{
  const f=await fixture({tables:{message_recipient_live_state:[]}});t.after(()=>f.dispose());
  await f.open('messageCenter');await until(()=>f.d.querySelector('#messageCenterView .message-command-row'));
  const row=f.d.querySelector('#messageCenterView .message-command-row'),children=[...row.children];
  assert.equal(f.d.querySelector('#messageCenterSearch'),null);
  assert.equal(f.d.querySelectorAll('#messageCenterView .message-command-row').length,1);
  const refresh=children.findIndex(x=>x.id==='refreshMessageCenter');
  const channel=children.findIndex(x=>x.querySelector?.('#messageChannel'));
  const send=children.findIndex(x=>x.id==='sendSelectedMessages');
  assert.ok(refresh>=0&&channel===refresh+1&&send===channel+1);
  assert.match(f.d.querySelector('#bamcoMessageCenterCommandCss').textContent,/message-command-row button\{font-weight:400!important\}/);
  assert.equal(f.errors.length,0,f.errors.join('\n'));
});

test('sent messages has no second controls row and first-row buttons are regular weight',async t=>{
  const f=await fixture({tables:{sent_message_log:[]}});t.after(()=>f.dispose());
  await f.open('sentMessages');await until(()=>f.d.querySelector('#sentMessagesView .sent-command-row'));
  assert.equal(f.d.querySelector('#sentMessagesView .sent-controls'),null);
  assert.equal(f.d.querySelector('#sentSearch'),null);
  assert.equal(f.d.querySelector('#sentStatusFilter'),null);
  assert.equal(f.d.querySelector('#sentChannelFilter'),null);
  assert.ok(f.d.querySelector('#sentMessagesView .sent-command-row .sent-count'));
  assert.match(f.d.querySelector('#bamcoSentMessagesCss').textContent,/sent-command-row button\{font-weight:400!important\}/);
  assert.equal(f.errors.length,0,f.errors.join('\n'));
});

test('response tracking removes row-2 and row-3 buttons while preserving select filters',async t=>{
  const f=await fixture({tables:{message_response_tracking:[]}});t.after(()=>f.dispose());
  await f.open('responseTracking');await until(()=>f.d.querySelector('#responseTrackingView .response-command-row'));
  assert.equal(f.d.querySelector('#responseSelectAll'),null);
  assert.equal(f.d.querySelector('.response-quick'),null);
  assert.equal(f.d.querySelectorAll('#responseTrackingView .response-filters button').length,0);
  assert.ok(f.d.querySelector('#responsePerson'));
  assert.ok(f.d.querySelector('#responseChannel'));
  assert.ok(f.d.querySelector('#responseState'));
  assert.ok(f.d.querySelector('#reminderSendChannel'));
  assert.match(f.d.querySelector('#bamcoResponseTrackingRootCss').textContent,/response-command-row button\{font-weight:400!important\}/);
  assert.equal(f.errors.length,0,f.errors.join('\n'));
});
