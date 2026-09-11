"""Real Chromium regression tests with isolated API data, never production writes.
Default: serve unmodified assets over HTTP (including the production CSP).
--offline: inline local assets for environments where browser networking is disabled.
"""
import argparse
import asyncio
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import threading
import time
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'test-results' / 'browser'
MOCK = (Path(__file__).parent / 'mock-api.js').read_text()

async def heartbeat(page):
    before = await page.evaluate('window.__testTicks')
    await page.wait_for_timeout(250)
    assert await page.evaluate('window.__testTicks') > before, 'Browser event loop stopped'

async def login(page, role):
    if role == 'owner':
        await page.evaluate('__testApi.actor=__testApi.profiles[1]')
    await page.locator('[data-department="product"]').click()
    await expect(page.locator('#email')).to_be_visible()
    await page.locator('#email').fill(role+'@example.test')
    await page.locator('#password').fill('Synthetic-test-password-729!')
    code = await page.locator('#loginVerification').get_attribute('data-code')
    for i, digit in enumerate(code):
        await page.locator('.verification-digit').nth(i).fill(digit)
    await page.locator('#loginForm button[type="submit"]').click()
    await page.locator('.welcome-dismiss').click()
    await expect(page.locator('#homeView')).to_be_visible()

async def open_tab(page, tab):
    print('open',tab,flush=True)
    await page.locator('#nav [data-view="'+tab+'"]').click()
    await expect(page.locator('#'+tab+'View')).to_be_visible()
    await heartbeat(page)

async def back(page, tab):
    await page.locator('#'+tab+'View .content-back').click()
    await expect(page.locator('#homeView')).to_be_visible()

async def idle_mutations(page, selectors):
    await page.wait_for_timeout(800)
    await page.evaluate('''selectors=>{
      window.__idleChanges=0;
      window.__idleObserver=new MutationObserver(r=>window.__idleChanges+=r.length);
      for(const selector of selectors){const n=document.querySelector(selector);if(n)__idleObserver.observe(n,{childList:true,subtree:true})}
    }''', selectors)
    await page.wait_for_timeout(500)
    changes = await page.evaluate('(__idleObserver.disconnect(),__idleChanges)')
    assert changes == 0, f'Idle controls are still rewriting themselves: {changes}'

async def manager_checks(page, result):
    await open_tab(page, 'templates')
    await page.evaluate('__testApi.delay.email_templates=600')
    await page.locator('#openDesktopTemplateEditor').click()
    await expect(page.locator('#desktopTemplateEditor')).to_be_visible()
    await expect(page.locator('#dteBody')).to_have_value('متن ذخیره‌شده state1')
    await page.locator('#dteCancel').click()
    await idle_mutations(page, ['#openDesktopTemplateEditor'])
    await back(page, 'templates')
    result['template_editor'] = 'pass'

    await open_tab(page, 'requestReport')
    await expect(page.locator('#requestReportView [data-report-export]')).to_have_text('خروجی اکسل')
    await idle_mutations(page, ['#requestReportView [data-report-export]'])
    await back(page, 'requestReport')
    result['request_report_no_loop'] = 'pass'

    await open_tab(page, 'responseReport')
    rows = page.locator('#responseReportBody tr[data-delivery-id]')
    await expect(rows).to_have_count(3)
    delete = page.locator('[data-response-bulk-delete]')
    await rows.first.click()
    await expect(delete).to_be_enabled()
    await delete.click()
    await page.locator('[data-notice-cancel]').click()
    await expect(delete).to_be_enabled()
    await expect(rows).to_have_count(3)
    # Failure must preserve selection and re-enable the same action.
    await page.evaluate("__testApi.fail.push('cancel_message_deliveries')")
    await delete.click()
    await page.locator('[data-notice-ok]').click()
    await expect(page.locator('#bamcoNoticeDialog')).to_have_attribute('data-kind','error')
    await page.locator('[data-notice-ok]').click()
    await expect(delete).to_be_enabled()
    await expect(rows).to_have_count(3)
    await page.evaluate('__testApi.fail=[]')
    await delete.click()
    await page.locator('[data-notice-ok]').click()
    await expect(rows).to_have_count(2)
    await page.locator('[data-notice-ok]').click()
    await page.wait_for_timeout(600)
    await rows.nth(0).click()
    await rows.nth(1).click(modifiers=['Control'])
    await expect(delete).to_have_text('حذف ۲ رکورد')
    await delete.click()
    await page.locator('[data-notice-ok]').click()
    await expect(rows).to_have_count(0)
    await page.locator('[data-notice-ok]').click()
    await idle_mutations(page, ['[data-response-bulk-delete]'])
    await back(page,'responseReport')
    result['response_single_multi_cancel_failure'] = 'pass'

    await open_tab(page, 'performanceReport')
    await expect(page.locator('[data-performance-from]')).to_be_visible()
    await expect(page.locator('[data-performance-to]')).to_be_visible()
    await expect(page.locator('#performanceReportView thead tr').first.locator('th').last).to_have_text('درخواست تعریف وظیفه این ماه')
    assert await page.locator('#performanceReportView tbody tr').first.locator('td').last.evaluate("n=>getComputedStyle(n).borderBottomWidth") == '1px'
    await back(page, 'performanceReport')
    result['performance_report'] = 'pass'

    await open_tab(page, 'stickers')
    await expect(page.locator('#stickerPair img')).to_have_count(2)
    await page.wait_for_function("Array.from(document.querySelectorAll('#stickerPair img')).every(i=>i.complete&&i.naturalWidth>0)")
    await back(page, 'stickers')
    result['stickers'] = 'pass'

async def case(browser, base, offline, width, role):
    mobile = width < 700
    context = await browser.new_context(viewport={'width':width,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
    page = await context.new_page()
    page.set_default_timeout(7000)
    errors = []
    page.on('pageerror',lambda e: errors.append(str(e)))
    result = {'width':width,'role':role,'mode':'offline-inline' if offline else 'http-production-csp'}
    try:
        start = time.monotonic()
        if offline:
            from offline_fixture import fixture_html
            html=fixture_html().replace('</script>','</script><script>'+MOCK+'</script>',1)
            await page.set_content(html,wait_until='load',timeout=8000)
        else:
            await page.add_init_script(MOCK)
            await page.goto(base,wait_until='load',timeout=15000)
        result['load_seconds'] = round(time.monotonic()-start,3)
        await heartbeat(page)
        print('login',width,role,flush=True)
        await login(page,role)
        print('logged in',width,role,flush=True)
        await heartbeat(page)
        if mobile:
            print('mobile stale-state test',flush=True)
            # Reintroduce a cached legacy class/style; normalisation must converge.
            await page.evaluate("const s=document.querySelector('#sidebar');s.classList.add('collapsed');s.style.width='68px'")
            await heartbeat(page)
            await expect(page.locator('#sidebar')).not_to_have_class(__import__('re').compile(r'\bcollapsed\b'))
        result['entry_login_home'] = 'pass'
        if role == 'manager':
            await manager_checks(page,result)
        else:
            assert not await page.locator('#nav [data-view="templates"]').is_visible()
            result['owner_manager_controls_hidden'] = 'pass'
        for tab in ['dashboard','kanban','archive']:
            await open_tab(page,tab)
            if tab=='dashboard':
                await page.wait_for_timeout(250)
                assert await page.locator('#workloadChart').evaluate("c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0)"), 'Blank workload canvas'
            await back(page,tab)
        result['dashboard_kanban_archive'] = 'pass'
        assert not errors, errors
        result['javascript_errors'] = errors
        await page.screenshot(path=str(OUT/f'{width}-{role}.png'))
        result['status'] = 'passed'
    except Exception as e:
        result['status']='failed';result['error']=str(e);result['javascript_errors']=errors
        try: await asyncio.wait_for(page.screenshot(path=str(OUT/f'{width}-{role}-failure.png')),2)
        except Exception: pass
    finally:
        await context.close()
    print(json.dumps(result,ensure_ascii=False),flush=True)
    return result

async def main(offline):
    OUT.mkdir(parents=True,exist_ok=True)
    handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT)
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        async with async_playwright() as p:
            executable=os.getenv('CHROMIUM_PATH') or (shutil.which('chromium') if offline else None)
            browser=await p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
            results=[]
            for width,role in [(1365,'manager'),(390,'manager'),(1365,'owner'),(390,'owner')]:
                results.append(await case(browser,f'http://127.0.0.1:{server.server_port}/',offline,width,role))
            await browser.close()
        (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
        assert all(r['status']=='passed' for r in results), 'Browser regression failed; see test-results/browser/results.json'
    finally:
        server.shutdown()

if __name__=='__main__':
    args=argparse.ArgumentParser();args.add_argument('--offline',action='store_true')
    asyncio.run(main(args.parse_args().offline))
