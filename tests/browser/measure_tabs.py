"""Measure every visible BAMCO tab with isolated API fixtures; never writes production."""
import asyncio, functools, http.server, json, threading, time
from pathlib import Path
from playwright.async_api import async_playwright, expect
from run_smoke import FIXTURE, login, home, settled, heartbeat

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'test-results'/'tab-performance'

async def post_settle(page, tab):
    return await page.evaluate('''async id=>{
      const v=document.querySelector('#'+id+'View');
      if(!v)return {mutations:0,width_drift:0,height_drift:0,visible_panels:0,loading_nodes:0};
      const table=()=>v.querySelector('table');
      const widths=()=>{const t=table();return t?.tHead?.rows?.[0]?[...t.tHead.rows[0].cells].map(x=>Math.round(x.getBoundingClientRect().width)):[]};
      const box=()=>{const n=v.querySelector('.panel,.task-timeline-shell,.messenger-shell,.messenger-layout,.table-panel')||v;const r=n.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}};
      const beforeW=widths(),beforeB=box();let mutations=0,loadingNodes=0;
      const obs=new MutationObserver(rs=>{mutations+=rs.length;for(const r of rs)for(const n of r.addedNodes||[])if(n.nodeType===1&&(n.matches?.('.workspace-loading')||n.querySelector?.('.workspace-loading')))loadingNodes++});
      obs.observe(v,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
      await new Promise(r=>setTimeout(r,800));obs.disconnect();
      const afterW=widths(),afterB=box();
      const widthDrift=beforeW.length===afterW.length?Math.max(0,...beforeW.map((x,i)=>Math.abs(x-afterW[i]))):(beforeW.length||afterW.length?999:0);
      return {mutations,width_drift:widthDrift,height_drift:Math.abs(beforeB.h-afterB.h),visible_panels:[...v.querySelectorAll(':scope>.panel,:scope>.task-timeline-shell,:scope>.messenger-shell')].filter(x=>getComputedStyle(x).display!=='none').length,loading_nodes:loadingNodes};
    }''',tab)

async def open_measure(page,tab):
    await home(page)
    view=page.locator('#'+tab+'View')
    before=await view.evaluate("v=>({html:v.innerHTML.length,cls:v.className})") if await view.count() else {}
    start=time.monotonic()
    await page.locator('#nav button[data-view="'+tab+'"]').click(force=True)
    await settled(page,tab,10000)
    settle_ms=round((time.monotonic()-start)*1000)
    await heartbeat(page)
    stable=await post_settle(page,tab)
    stable['settle_ms']=settle_ms
    stable['preexisting_html']=before.get('html',0)
    stable['tables']=await view.locator('table').count()
    stable['loading_visible']=await view.locator('.workspace-loading:visible').count()
    return stable

async def one_case(browser,base,width,role):
    mobile=width<700
    ctx=await browser.new_context(viewport={'width':width,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
    page=await ctx.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.add_init_script(FIXTURE);await page.goto(base,wait_until='load',timeout=15000);await login(page,role)
    views=await page.locator('#nav button[data-view]').evaluate_all("(els,role)=>els.filter(b=>!b.disabled&&(role==='manager'||!b.classList.contains('manager-only'))).map(b=>b.dataset.view)",role)
    metrics={};seen=[]
    for tab in views:
      if tab in seen or not await page.locator('#'+tab+'View').count(): continue
      seen.append(tab)
      try: metrics[tab]=await open_measure(page,tab)
      except Exception as exc: metrics[tab]={'error':str(exc)}
    result={'width':width,'role':role,'tabs':metrics,'javascript_errors':errors}
    await ctx.close();return result

async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT);server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
    try:
      async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox']);results=[]
        for width,role in [(1365,'manager'),(390,'manager'),(1365,'owner'),(390,'owner')]: results.append(await one_case(browser,base,width,role))
        await browser.close()
    finally: server.shutdown()
    (OUT/'metrics.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    flat=[]
    for case in results:
      for tab,m in case['tabs'].items(): flat.append({'role':case['role'],'width':case['width'],'tab':tab,**m})
    flat.sort(key=lambda x:x.get('settle_ms',0),reverse=True)
    print('TAB_METRICS='+json.dumps(flat,ensure_ascii=False))
    assert not any(case['javascript_errors'] for case in results),results

if __name__=='__main__': asyncio.run(main())
