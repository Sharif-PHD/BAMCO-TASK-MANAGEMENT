const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,pause}=require('./helpers/app-fixture.cjs');

test('every shipped tab opens without blocking the event loop',async t=>{
  const f=await fixture(),{d}=f;t.after(()=>f.dispose());
  const routes=[...new Set([...d.querySelectorAll('#nav [data-view]')].map(button=>button.dataset.view))];
  assert(routes.length>=20);
  for(const route of routes)await t.test(route,async()=>{
    let heartbeat=false;setTimeout(()=>{heartbeat=true},0);const started=performance.now();
    await f.open(route);await pause(0);
    const elapsed=performance.now()-started,view=d.querySelector('#'+route+'View');
    assert(view,route+' view is missing');
    assert(!view.classList.contains('hidden'),route+' did not become visible');
    assert(heartbeat,route+' blocked the event loop');
    // JSDOM executes every shipped module in one process and is slower than the
    // real Chromium gate. Keep this as a deadlock/regression budget, not a
    // production-performance benchmark; Chromium separately enforces 7s.
    assert(elapsed<5000,route+' took '+Math.round(elapsed)+'ms to settle');
  });
  assert.deepEqual(f.errors,[]);
});
