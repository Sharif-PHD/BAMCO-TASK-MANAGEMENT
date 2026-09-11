"""Offline-only Chromium harness. Production HTML, CSP and assets are not modified."""
import base64
import mimetypes
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def fixture_html():
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>','',html)
    deferred=[]
    def script(m):
        attr,path=m.group(1),m.group(2).split('?')[0]
        code=(ROOT/path).read_text() if (ROOT/path).is_file() else ''
        tag='<script>'+code.replace('</script','<\\/script')+'\n//# sourceURL='+path+'\n</script>'
        if 'defer' in attr:
            deferred.append(tag);return ''
        return tag
    html=re.sub(r'<script\b([^>]*src="([^"]+)"[^>]*)>\s*</script>',script,html)
    def css(m):
        path=m.group(1).split('?')[0]
        if not (ROOT/path).is_file():return ''
        text=(ROOT/path).read_text()
        text=re.sub(r'url\([^)]*\)','none',text)
        return '<style>'+text+'</style>'
    html=re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>',css,html)
    html=re.sub(r'<link\b[^>]*>','',html)
    def img(m):
        path=ROOT/m.group(1)
        if not path.is_file():return m.group(0)
        return 'src="data:'+str(mimetypes.guess_type(path)[0])+';base64,'+base64.b64encode(path.read_bytes()).decode()+'"'
    html=re.sub(r'src="(assets/[^"?]+)"',img,html)
    # about:blank has no storage origin; use an isolated memory implementation.
    storage='''<script>
    function testStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i],get length(){return m.size}}}
    Object.defineProperty(window,'localStorage',{value:testStorage()});Object.defineProperty(window,'sessionStorage',{value:testStorage()});
    window.fetch=async()=>new Response('[]',{status:200,headers:{'Content-Type':'application/json'}});
    </script>'''
    return html.replace('<head>','<head>'+storage).replace('</body>',''.join(deferred)+'</body>')
