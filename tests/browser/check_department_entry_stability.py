"""Verify the management selector does not resize or jump after first paint."""
import asyncio
import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
MOCK = (Path(__file__).parent / 'mock-api.js').read_text(encoding='utf-8')
MSG_MOCK = (Path(__file__).parent / 'mock-messaging-api.js').read_text(encoding='utf-8')

SELECTORS = [
    '#departmentEntry',
    '#departmentEntry > header',
    '#departmentEntry > header > img',
    '#departmentTitle',
    '#departmentEntry .department-grid',
    '#departmentEntry .department-grid button:nth-child(1)',
    '#departmentEntry .department-grid button:nth-child(2)',
    '#departmentEntry .department-grid button:nth-child(3)',
]

async def snapshot(page):
    return await page.evaluate(
        """selectors => Object.fromEntries(selectors.map(sel => {
          const el=document.querySelector(sel); if(!el) return [sel,null];
          const r=el.getBoundingClientRect(),s=getComputedStyle(el);
          return [sel,{x:r.x,y:r.y,w:r.width,h:r.height,display:s.display,
            minHeight:s.minHeight,height:s.height,padding:s.padding,
            gridTemplateColumns:s.gridTemplateColumns,transform:s.transform}];
        }))""",
        SELECTORS,
    )

async def run_case(browser, base, width, height):
    mobile = width < 700
    context = await browser.new_context(
        viewport={'width': width, 'height': height},
        is_mobile=mobile,
        has_touch=mobile,
    )
    page = await context.new_page()
    page.set_default_timeout(8000)
    await page.add_init_script(MOCK + '\n' + MSG_MOCK)
    await page.add_init_script(
        """
        window.__entryLayoutShifts=[];
        const nodeName=n=>{
          if(!n)return null;
          if(n.id)return '#'+n.id;
          const cls=typeof n.className==='string'&&n.className.trim()?'.'+n.className.trim().split(/\s+/).join('.'):'';
          return String(n.tagName||'node').toLowerCase()+cls;
        };
        new PerformanceObserver(list=>{
          for(const e of list.getEntries()) if(!e.hadRecentInput) window.__entryLayoutShifts.push({
            value:e.value,startTime:e.startTime,
            sources:(e.sources||[]).map(s=>({node:nodeName(s.node),previousRect:s.previousRect,currentRect:s.currentRect}))
          });
        }).observe({type:'layout-shift',buffered:true});
        """
    )
    await page.goto(base, wait_until='domcontentloaded', timeout=15000)
    entry = page.locator('#departmentEntry')
    await expect(entry).to_be_visible()
    await expect(page.locator('#departmentEntry > header > img')).to_have_count(1)

    marks=(0,50,100,250,500,900,1600)
    samples=[]
    previous=0
    for mark in marks:
        if mark>previous: await page.wait_for_timeout(mark-previous)
        samples.append(await snapshot(page));previous=mark

    first=samples[0]
    max_delta=0.0
    changes=[]
    for sample_index,sample in enumerate(samples[1:],1):
        for sel in SELECTORS:
            a,b=first[sel],sample[sel]
            assert a and b, f'missing {sel}'
            for key in ('x','y','w','h'):
                delta=abs(float(a[key])-float(b[key]));max_delta=max(max_delta,delta)
                if delta>0.5: changes.append({'sample':sample_index,'selector':sel,'field':key,'from':a[key],'to':b[key],'delta':delta})
            for key in ('display','minHeight','height','padding','gridTemplateColumns','transform'):
                if a[key]!=b[key]: changes.append({'sample':sample_index,'selector':sel,'field':key,'from':a[key],'to':b[key]})

    assert not changes, f'entry layout changed after DOMContentLoaded: {json.dumps(changes,ensure_ascii=False)}'
    shift_details = await page.evaluate('window.__entryLayoutShifts')
    cls = sum(float(x.get('value',0)) for x in shift_details)
    print(json.dumps({'width':width,'height':height,'max_delta_px':max_delta,'cls':cls,'layout_shifts':shift_details},ensure_ascii=False),flush=True)
    assert cls < 0.001, f'entry CLS is {cls}: {json.dumps(shift_details,ensure_ascii=False)}'
    assert await page.locator('#departmentEntry').evaluate("el=>getComputedStyle(el).transform==='none'")
    assert await page.locator('#departmentEntry .department-grid button').first.evaluate("el=>getComputedStyle(el).transform==='none'")

    if mobile:
        assert await page.locator('#departmentEntry .department-grid').evaluate("el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===1")
        heights=await page.locator('#departmentEntry .department-grid button').evaluate_all("els=>els.map(e=>e.getBoundingClientRect().height)")
        assert all(abs(h-96)<0.6 for h in heights), heights
    else:
        boxes=await page.locator('#departmentEntry .department-grid button').evaluate_all("els=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})")
        assert max(x['y'] for x in boxes)-min(x['y'] for x in boxes)<0.6, boxes
        assert max(x['w'] for x in boxes)-min(x['w'] for x in boxes)<0.6, boxes

    result={'width':width,'height':height,'max_delta_px':max_delta,'cls':cls,'samples':len(samples),'status':'passed'}
    print(json.dumps(result,ensure_ascii=False),flush=True)
    await context.close()
    return result

async def main():
    handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT)
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
            base=f'http://127.0.0.1:{server.server_port}/'
            results=[
                await run_case(browser,base,1365,900),
                await run_case(browser,base,390,844),
            ]
            await browser.close()
        assert all(x['status']=='passed' for x in results)
    finally:
        server.shutdown()

if __name__=='__main__': asyncio.run(main())
