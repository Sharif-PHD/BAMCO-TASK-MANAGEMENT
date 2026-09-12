const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {fixture,until,pause}=require('./helpers/app-fixture.cjs');
const root=path.join(__dirname,'..');
const today=new Date().toISOString().slice(0,10);
const task={id:71,title:'وظیفهٔ آزمون رابط',status:'درحال انجام',priority:'متوسط',owner_id:'test-owner',start_date:today,due_date:today,archived:false};

test('every navigation destination has one working return-to-home control and releases the visible view',async t=>{
 const f=await fixture({styles:true,tables:{tasks:[task]}}),{w,d}=f;t.after(()=>f.dispose());
 const routes=[...new Set([...d.querySelectorAll('#nav [data-view]')].map(b=>b.dataset.view))];assert(routes.length>=20);
 assert(!routes.includes('emailSettings'));assert(!routes.includes('alertSettings'));assert(!routes.includes('templates'));
 for(const route of routes){
  await t.test(route,async()=>{
   await f.open(route);await pause(100);const view=d.querySelector('#'+route+'View');
   const backs=[...view.querySelectorAll('button')].filter(b=>b.textContent.replace(/\s+/g,' ').trim()==='بازگشت به خانه');
   assert.equal(backs.length,1,route+' must expose exactly one return-to-home control');const back=backs[0];
   assert.equal(view.querySelector('.bamco-page-heading button'),null);
   const style=w.getComputedStyle(back);assert.notEqual(style.display,'none');assert.notEqual(style.visibility,'hidden');assert.notEqual(style.pointerEvents,'none');
   back.click();await pause(20);assert.equal(w.getComputedStyle(view).display,'none');assert(!d.querySelector('#homeView').classList.contains('hidden'));assert.equal(d.querySelector('#nav button.active'),null);
  });
 }
 assert.deepEqual(f.errors,[]);
});

test('dashboard date controls, removed templates route, sticker picker, chain form and Gantt actions',async t=>{
 const f=await fixture({tables:{tasks:[task],app_settings:[],approval_chains:[],approval_chain_members:[],approval_chain_stages:[],approval_stage_approvers:[]}}),{d}=f;t.after(()=>f.dispose());
 await t.test('dashboard calendar applies dates automatically and clear resets the final-chart range',async()=>{
  await f.open('dashboard');assert.equal(d.querySelector('#workspaceActionCenter'),null);assert.equal(d.querySelector('#applyPerf'),null);
  for(const target of ['perfFrom','perfTo']){
   d.querySelector('[data-dashboard-date="'+target+'"]').click();await until(()=>d.querySelector('#calendarDialog').open);d.querySelector('#calDay').value='1';d.querySelector('#setDateBtn').click();assert(d.querySelector('#'+target).value);assert(!d.querySelector('#calendarDialog').open);
  }
  d.querySelector('#clearPerf').click();assert.equal(d.querySelector('#perfFrom').value,'');assert.equal(d.querySelector('#perfTo').value,'');
  assert.equal(d.querySelectorAll('.dashboard-date-field').length,2);assert.ok(d.querySelector('#clearPerf'));
 });
 await t.test('removed template editor route cannot return',async()=>{
  assert.equal(d.querySelector('#nav [data-view="templates"],#templatesView,#openDesktopTemplateEditor,#desktopTemplateEditor'),null);
 });
 await t.test('sticker controls open the upload form and preserve each selectable image slot',async()=>{
  await f.open('stickers');d.querySelector('#stickerNew').click();assert(d.querySelector('#stickerPackDialog').open);assert.equal(d.querySelectorAll('.sticker-pick').length,10);
  let fileClicks=0;d.querySelector('#stickerFile').addEventListener('click',()=>fileClicks++);for(const button of d.querySelectorAll('.sticker-pick'))button.click();assert.equal(fileClicks,10);d.querySelector('[data-sticker-close]').click();assert(!d.querySelector('#stickerPackDialog').open);
 });
 await t.test('chain creation submits member and both approval stages, then toggles its status',async()=>{
  await f.open('approvalChains');await until(()=>d.querySelector('#approvalChainForm select[name=members]').options.length);
  const form=d.querySelector('#approvalChainForm');form.elements.name.value='زنجیرهٔ آزمایشی';
  for(const key of ['members','stage1_approvers','stage2_approvers'])form.elements[key].options[key==='members'?1:0].selected=true;
  form.requestSubmit();await until(()=>f.tables.approval_stage_approvers.length===2);await until(()=>d.querySelector('.chain-toggle'));assert.equal(f.tables.approval_chain_stages.length,2);
  d.querySelector('.chain-toggle').click();await until(()=>f.tables.approval_chains[0].active===false);
 });
 await t.test('calendar/Gantt, month navigation and unscheduled panel remain bound after toolbar movement',async()=>{
  await f.open('taskTimeline');d.querySelector('[data-mode=gantt]').click();assert(d.querySelector('.tt-gantt'));assert(d.querySelector('.tt-gantt').style.getPropertyValue('--day-count'));assert.match(d.querySelector('.tt-bar').style.width,/%/);assert.equal(d.querySelector('.tt-track').style.width,'');
  const month=d.querySelector('#ttMonthLabel').textContent;d.querySelector('#ttNext').click();assert.notEqual(d.querySelector('#ttMonthLabel').textContent,month);d.querySelector('#ttPrev').click();assert.equal(d.querySelector('#ttMonthLabel').textContent,month);
  d.querySelector('#ttUnscheduled').click();assert(!d.querySelector('#ttUnscheduledPanel').classList.contains('hidden'));d.querySelector('#ttCloseUnscheduled').click();assert(d.querySelector('#ttUnscheduledPanel').classList.contains('hidden'));d.querySelector('[data-mode=calendar]').click();assert(d.querySelector('.tt-calendar'));
 });
 assert.deepEqual(f.errors,[]);
});

test('a new release clears app data caches and preserves sticker/sign-in state',async t=>{
 const f=await fixture({storage:{'bamco.chat.cache':'old chat','bamco.requests':'old requests','bamco.sent-email':'old email','bamco.sticker.cache':'keep','bamco.auth.preference':'keep'}});t.after(()=>f.dispose());
 for(const key of ['bamco.chat.cache','bamco.requests','bamco.sent-email'])assert.equal(f.w.localStorage.getItem(key),null);
 assert.equal(f.w.localStorage.getItem('bamco.sticker.cache'),'keep');assert.equal(f.w.localStorage.getItem('bamco.auth.preference'),'keep');
 assert(f.calls.filter(c=>c.url.includes('/rest/v1/')&&!c.url.includes('sticker')).every(c=>c.cache==='no-store'));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal((html.match(/assets\/js\/conversations.js/g)||[]).length,1);assert(!html.includes('completion-ui.js'));assert(!fs.readFileSync(path.join(root,'assets/js/production-runtime.js'),'utf8').includes('function renderTasksChat'));
});
