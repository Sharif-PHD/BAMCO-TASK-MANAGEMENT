"""Chromium probe for first-paint stability of the management selector."""
import asyncio, functools, http.server, json, threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'test-results'/'entry-stability'

async def sample(page,width):
    await page.add_init_script("""
      window.__entryShifts=[];
      try{
        new PerformanceObserver(list=>{
          for(const e of list.getEntries()) if(!e.hadRecentInput) window.__entryShifts.push({value:e.value,time:e.startTime,sources:(e.sources||[]).map(s=>s.node?.id||s.node?.className||s.node?.tagName||'')});
        }).observe({type:'layout-shift',buffered:true});
      }catch{}
    """)
    await page.goto(page.context._options.get('base_url') or 'about:blank')

async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT)
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}/'
    results=[]
    try:
      async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        for width,height in [(1365,900),(390,844)]:
          context=await browser.new_context(viewport={'width':width,'height':height},is_mobile=width<700,has_touch=width<700)
          page=await context.new_page()
          await page.add_init_script("""
            window.__entryShifts=[];
            try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__entryShifts.push({value:e.value,time:e.startTime,sources:(e.sources||[]).map(s=>({node:s.node?.id||s.node?.className||s.node?.tagName||'',prev:s.previousRect?.toJSON?.()||null,cur:s.currentRect?.toJSON?.()||null}))})}).observe({type:'layout-shift',buffered:true})}catch{}
          """)
          await page.goto(base,wait_until='load',timeout=15000)
          await page.wait_for_timeout(1800)
          geom=[]
          for _ in range(6):
            geom.append(await page.evaluate("""()=>{const r=s=>{const n=document.querySelector(s);if(!n)return null;const b=n.getBoundingClientRect();return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]};return {entry:r('#departmentEntry'),logo:r('#departmentEntry header img'),title:r('#departmentTitle'),grid:r('.department-grid'),cards:[...document.querySelectorAll('.department-grid button')].map(n=>{const b=n.getBoundingClientRect();return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]})}}"""))
            await page.wait_for_timeout(100)
          shifts=await page.evaluate('window.__entryShifts||[]')
          stable=all(g==geom[0] for g in geom[1:])
          cls=sum(float(x.get('value',0)) for x in shifts)
          result={'width':width,'stable_after_load':stable,'cls':round(cls,6),'shifts':shifts,'geometry':geom[0]}
          results.append(result)
          await page.screenshot(path=str(OUT/f'entry-{width}.png'),full_page=True)
          await context.close()
        await browser.close()
      (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
      print(json.dumps(results,ensure_ascii=False))
      assert all(r['stable_after_load'] for r in results),results
      assert all(r['cls'] <= 0.001 for r in results),results
    finally:
      server.shutdown()

if __name__=='__main__': asyncio.run(main())
