const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const runtime=fs.readFileSync(path.join(__dirname,'../assets/js/production-runtime.js'),'utf8');
const fn=runtime.slice(runtime.indexOf('async function render(id)'),runtime.indexOf('\nfunction bind()'));
for(const id of ['groupChat','directMessages','taskChats','loginActivity','activeSessions','performanceReport','responseReport','requestReport','systemOptions'])test(`${id}: asynchronous data errors render a visible error panel`,async()=>{let shown;const fail=async()=>{throw Error('test unavailable')};const ctx={window:{},panel:(...args)=>shown=args,esc:s=>s,renderGroup:fail,renderDirect:fail,renderTasksChat:fail,renderSessions:fail,renderPerformance:fail,simpleReport:fail,systemOptions:fail};vm.createContext(ctx);vm.runInContext(fn,ctx);await ctx.render(id);assert.equal(shown[0],id);assert.match(shown[3],/test unavailable/)});
const source=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');const api=source.slice(source.indexOf('async function api('),source.indexOf('\nconst select='));
test('API timeout produces a recoverable error and clears its timer',async()=>{let abort,cleared=false;const ctx={SB_KEY:'test',SB_URL:'https://example.invalid',state:{token:'test'},AbortController,apiErrorMessage:()=>'',setTimeout:f=>(abort=f,1),clearTimeout:()=>cleared=true,fetch:async()=>{abort();throw Error('aborted')}};vm.createContext(ctx);vm.runInContext(api,ctx);await assert.rejects(ctx.api('/test'),/دوباره تلاش کنید/);assert.equal(cleared,true)});

test('an active manager view is not hidden by its access marker',()=>{
  const css=fs.readFileSync(path.join(__dirname,'../assets/css/app.css'),'utf8');
  assert.match(css,/\.view\.manager-only:not\(\.hidden\)\{display:block!important\}/);
});

test('runtime can create a late navigation group before adding its route',()=>{
  assert.match(runtime,/function groupFor\(key\)\{const labels=/);
  assert.match(runtime,/configuration:\['تنظیمات','⚙'\]/);
  assert.match(runtime,/return labels\[key\]\?ensureGroup\(key,\.\.\.labels\[key\]\):null/);
});
const tabs=fs.readFileSync(path.join(__dirname,'../assets/js/tab-workspace.js'),'utf8');const settings=tabs.slice(tabs.indexOf('const settingFields='),tabs.indexOf('\nfunction dialog'));
for(const id of ['alertSettings','emailSettings'])test(`${id}: configuration controls remain visible and saving disabled when server is unavailable`,async()=>{let html='';const ctx={run:1,select:async()=>{throw Error('offline')},panel:(_,h)=>html=h,esc:s=>String(s??''),word:s=>s};vm.createContext(ctx);vm.runInContext(settings,ctx);await ctx.settings(id,1);assert.match(html,/<form/);assert.match(html,/<input/);assert.match(html,/<button type="submit" class="primary" disabled>/);assert.match(html,/دسترس نیست/)});
