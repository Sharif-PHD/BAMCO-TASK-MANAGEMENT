"""Real Chromium regressions with isolated API data; never production writes."""
import argparse, asyncio, functools, http.server, json, os, re, shutil, threading, time
from pathlib import Path
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'test-results'/'browser'
MOCK=(Path(__file__).parent/'mock-api.js').read_text();MSG_MOCK=(Path(__file__).parent/'mock-messaging-api.js').read_text();FIXTURE=MOCK+'\n'+MSG_MOCK
async def heartbeat(page):
 before=await page.evaluate('window.__testTicks');await page.wait_for_timeout(250);assert await page.evaluate('window.__testTicks')>before,'Browser event loop stopped'
async def settled(page,tab,timeout=7500):
 view=page.locator('#'+tab+'View');await expect(view).to_be_visible();
 try: await page.wait_for_function("id=>{const v=document.querySelector('#'+id+'View');return v&&!v.classList.contains('bamco-view-settling')&&!v.querySelector('.workspace-loading')}",arg=tab,timeout=timeout)
 except Exception: raise AssertionError(f'{tab} did not settle')
async def login(page,role):
 if role=='owner': await page.evaluate('__testApi.actor=__testApi.profiles[1]')
 await expect(page.locator('#departmentEntry header img')).to_have_count(1);await page.locator('[data-department="product"]').click();await expect(page.locator('#email')).to_be_visible();await page.locator('#email').fill(role+'@example.test');await page.locator('#password').fill('test');code=await page.locator('#loginVerification').get_attribute('data-code')
 for i,digit in enumerate(code): await page.locator('.verification-digit').nth(i).fill(digit)
 await page.locator('#loginForm button[type="submit"]').click();await page.locator('.welcome-dismiss').click();await expect(page.locator('#homeView')).to_be_visible();await expect(page.locator('#appView > .card-topbar')).to_have_count(1)
async def open_tab(page,tab):
 print('open',tab,flush=True);start=time.monotonic();await page.locator('#nav [data-view="'+tab+'"]').click(force=True);await settled(page,tab);await heartbeat(page);return round((time.monotonic()-start)*1000)
async def home(page):
 await page.evaluate('window.bamcoShowHome?.()');await expect(page.locator('#homeView')).to_be_visible()
async def idle_mutations(page,selectors):
 await page.wait_for_timeout(500);await page.evaluate('''selectors=>{window.__idleChanges=0;window.__idleObserver=new MutationObserver(r=>window.__idleChanges+=r.length);for(const s of selectors){const n=document.querySelector(s);if(n)__idleObserver.observe(n,{childList:true,subtree:true})}}''',selectors);await page.wait_for_timeout(400);changes=await page.evaluate('(__idleObserver.disconnect(),__idleChanges)');assert changes==0,f'Idle controls keep rewriting: {changes}'
async def command_texts(page,selector):
 return [re.sub(r'\s+',' ',x).strip() for x in await page.locator(selector+' > *').all_text_contents()]
async def manager_checks(page,result):
 assert await page.locator('#nav [data-view="templates"],#nav [data-view="messageTemplates"],#templatesView,#messageTemplatesView').count()==0;result['message_text_removed']='pass'
 assert await page.locator('#nav [data-view="requestReport"],#requestReportView').count()==0;result['removed_request_report_stays_removed']='pass'
 await open_tab(page,'responseReport');controls=await command_texts(page,'#responseReportView .response-command-row');assert controls[0]=='بازگشت به خانه';assert 'از تاریخ' in controls[1] and 'تا تاریخ' in controls[1];assert controls[2]=='تازه‌سازی' and controls[3]=='خروجی اکسل' and controls[4]=='حذف رکورد';assert await page.locator('#canonicalResponseFrom').input_value();assert await page.locator('#canonicalResponseTo').input_value();rows=page.locator('#responseReportBody tr[data-delivery-id]');await expect(rows).to_have_count(3);delete=page.locator('[data-response-bulk-delete]');await rows.first.click();await expect(delete).to_be_enabled();await delete.click();await page.locator('[data-notice-cancel]').click();await expect(rows).to_have_count(3);await page.evaluate("__testApi.fail.push('cancel_message_deliveries')");await delete.click();await page.locator('[data-notice-ok]').click();await expect(page.locator('#bamcoNoticeDialog')).to_have_attribute('data-kind','error');await page.locator('[data-notice-ok]').click();await page.evaluate('__testApi.fail=[]');await delete.click();await page.locator('[data-notice-ok]').click();await expect(rows).to_have_count(2);await page.locator('[data-notice-ok]').click();await page.wait_for_timeout(400);await rows.nth(0).click();await rows.nth(1).click(modifiers=['Control']);await expect(delete).to_have_text('حذف ۲ رکورد');await delete.click();await page.locator('[data-notice-ok]').click();await expect(rows).to_have_count(0);await page.locator('[data-notice-ok]').click();await home(page);result['response_report_root_controls_and_delete']='pass'
 await open_tab(page,'performanceReport');await expect(page.locator('[data-performance-from]')).to_be_visible();await expect(page.locator('[data-performance-to]')).to_be_visible();await home(page);result['performance_report']='pass'
 await open_tab(page,'messageCenter');assert await page.locator('#messageCenterView thead tr:first-child th').all_text_contents()==['نام','کار فعال','هشدار','دیرکرد','وضعیت پیام','آخرین ارسال'];controls=await command_texts(page,'#messageCenterView .message-command-row');assert controls[:4]==['بازگشت به خانه','خروجی اکسل','تازه‌سازی','ارسال'];await expect(page.locator('#messageChannel')).to_be_visible();assert await page.locator('#messageSubject,#messageCustomText').count()==0;assert await page.locator('#messageCenterView .suite-table-options').count()==0;recipient=page.locator('#messageCenterBody tr[data-id]').first;await recipient.click();send=page.locator('#sendSelectedMessages');await expect(recipient).to_have_attribute('aria-selected','true');await expect(send).to_be_enabled();assert await send.evaluate("n=>getComputedStyle(n).backgroundColor")=='rgb(33, 135, 100)';await send.click();await expect(page.locator('#messagePreviewDialog')).to_be_visible();await expect(page.locator('#messagePreviewDialog .workflow-message')).to_be_visible();await page.locator('[data-message-preview-close]').first.click();await home(page);result['simple_message_send']='pass'
 await open_tab(page,'sentMessages');controls=await command_texts(page,'#sentMessagesView .sent-command-row');assert controls[:3]==['بازگشت به خانه','خروجی اکسل','تازه‌سازی'];headers=await page.locator('#sentMessagesView thead tr:first-child th').all_text_contents();assert headers==['ردیف','نوع','فرستنده','گیرنده','موضوع','کانال','وضعیت','زمان ارسال','تلاش','خطا','جزئیات'];assert await page.locator('#sentMessagesView .sent-overview,#sentMessagesView .sent-log-summary').count()==0;await expect(page.locator('#sentSearch')).to_be_visible();await expect(page.locator('#sentStatusFilter')).to_be_visible();await expect(page.locator('#sentChannelFilter')).to_be_visible();await expect(page.locator('#sentMessagesView tbody')).to_contain_text('مدیر آزمایشی');await expect(page.locator('#sentMessagesView tbody')).to_contain_text('به‌روزرسانی وظیفه');await expect(page.locator('#sentMessagesView tbody')).to_contain_text('پیام داخل سامانه');assert await page.locator('#sentMessagesView .suite-table-options').count()==0;await home(page);result['sent_log_unified_without_cards']='pass'
 await open_tab(page,'responseTracking');controls=await command_texts(page,'#responseTrackingView .response-command-row');assert controls[0]=='بازگشت به خانه';assert 'از تاریخ' in controls[1] and 'تا تاریخ' in controls[1];assert controls[2]=='تازه‌سازی' and controls[3]=='خروجی اکسل' and controls[4]=='ارسال یادآوری';assert await page.locator('#responseFrom').input_value();assert await page.locator('#responseTo').input_value();assert 'شناسه پیگیری' not in ''.join(await page.locator('#responseTrackingView thead tr:first-child th').all_text_contents());tracking=page.locator('#responseTrackingBody tr[data-delivery]').first;reminder=page.locator('#sendResponseReminder');await expect(reminder).to_be_disabled();await tracking.click();await expect(tracking).to_have_attribute('aria-selected','true');await expect(reminder).to_be_enabled();await home(page);result['response_tracking_root_controls_and_selection']='pass'
 await open_tab(page,'directMessages');system=page.locator('#directMessagesView [data-kind="system"]');await expect(system).to_have_count(1);await system.click();await expect(page.locator('#directMessagesView .workflow-message')).to_be_visible();await expect(page.locator('#directMessagesView .workflow-message')).to_contain_text('گزارش وضعیت آزمایشی');await home(page);result['system_private_thread']='pass'
 await open_tab(page,'kanban');row=page.locator('#kanbanBody tr[data-task-id="1"]');await row.click();await expect(page.locator('#kanbanEditBtn')).to_be_enabled();await expect(page.locator('#kanbanArchiveBtn')).to_be_enabled();await expect(page.locator('#kanbanDeleteBtn')).to_be_enabled();history=page.locator('#kanbanView [data-task-history]');await expect(history).to_be_visible();await history.click();await expect(page.locator('#bamcoTaskHistoryDialog')).to_be_visible();txt=await page.locator('#bamcoTaskHistoryDialog').inner_text();assert 'متولی' in txt and 'تاریخ پایان' in txt and 'وضعیت' in txt and 'متولی آزمایشی' in txt;assert 'owner_id' not in txt and 'due_date' not in txt;await page.locator('#bamcoTaskHistoryDialog .bth-close').click();await home(page);result['persian_task_history_and_kanban_actions']='pass'
 await open_tab(page,'archive');archived=page.locator('#archiveBody tr[data-task-id="2"]');await archived.click();await expect(page.locator('#archiveEditBtn')).to_be_enabled();await expect(page.locator('#archiveRestoreBtn')).to_be_enabled();await expect(page.locator('#archiveDeleteBtn')).to_be_enabled();await home(page);result['archive_actions']='pass'
 await open_tab(page,'stickers');await expect(page.locator('#stickerPair img')).to_have_count(2);await page.wait_for_function("Array.from(document.querySelectorAll('#stickerPair img')).every(i=>i.complete&&i.naturalWidth>0)");await home(page);result['stickers']='pass'
async def sweep_tabs(page,role,result):
 views=await page.locator('#nav button[data-view]').evaluate_all("(els,role)=>els.filter(b=>!b.disabled&&(role==='manager'||!b.classList.contains('manager-only'))).map(b=>b.dataset.view)",role);seen=[];times={}
 for tab in views:
  if tab in seen: continue
  seen.append(tab);await home(page);ms=await open_tab(page,tab);times[tab]=ms;assert ms<7000,f'{tab} load took {ms} ms';view=page.locator('#'+tab+'View');assert await view.locator('.workspace-loading').count()<=1;assert 'bamco-view-settling' not in (await view.get_attribute('class') or '');await heartbeat(page)
 result['all_visible_tabs']=seen;result['tab_load_ms']=times
async def case(browser,base,offline,width,role):
 mobile=width<700;context=await browser.new_context(viewport={'width':width,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile);page=await context.new_page();page.set_default_timeout(8000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));result={'width':width,'role':role,'mode':'offline-inline' if offline else 'http-production-csp'}
 try:
  start=time.monotonic()
  if offline:
   from offline_fixture import fixture_html
   html=fixture_html().replace('</script>','</script><script>'+FIXTURE+'</script>',1);await page.set_content(html,wait_until='load',timeout=10000)
  else:
   await page.add_init_script(FIXTURE);await page.goto(base,wait_until='load',timeout=15000)
  result['load_seconds']=round(time.monotonic()-start,3);await heartbeat(page);await login(page,role);await heartbeat(page);result['entry_login_home']='pass'
  if mobile:
   await page.evaluate("const s=document.querySelector('#sidebar');s.classList.add('collapsed');s.style.width='68px'");await heartbeat(page);await expect(page.locator('#sidebar')).not_to_have_class(re.compile(r'\bcollapsed\b'))
  if role=='manager': await manager_checks(page,result)
  else: assert not await page.locator('#nav [data-view="templates"],#nav [data-view="messageTemplates"]').is_visible();result['owner_manager_controls_hidden']='pass'
  await sweep_tabs(page,role,result);assert not errors,errors;result['javascript_errors']=errors;await page.screenshot(path=str(OUT/f'{width}-{role}.png'),full_page=True);result['status']='passed'
 except Exception as e:
  result['status']='failed';result['error']=repr(e);result['javascript_errors']=errors
  try: await asyncio.wait_for(page.screenshot(path=str(OUT/f'{width}-{role}-failure.png'),full_page=True),2)
  except Exception: pass
 finally: await context.close()
 print(json.dumps(result,ensure_ascii=False),flush=True);return result
async def main(offline):
 OUT.mkdir(parents=True,exist_ok=True);handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT);server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   executable=os.getenv('CHROMIUM_PATH') or (shutil.which('chromium') if offline else None);browser=await p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox']);results=[]
   for width,role in [(1365,'manager'),(390,'manager'),(1365,'owner'),(390,'owner')]: results.append(await case(browser,f'http://127.0.0.1:{server.server_port}/',offline,width,role))
   await browser.close()
  (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));assert all(r['status']=='passed' for r in results),'Browser regression failed; see test-results/browser/results.json'
 finally: server.shutdown()
if __name__=='__main__':
 args=argparse.ArgumentParser();args.add_argument('--offline',action='store_true');asyncio.run(main(args.parse_args().offline))
