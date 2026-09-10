(() => {
  'use strict';

  const STORAGE_KEY='bamco.visual.layout.v2';
  const EDIT_CLASS='bamco-visual-editing';
  const state={enabled:false,selected:null,drag:null,resize:null,layouts:load()};
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{return {}}}
  function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.layouts))}
  function esc(s){return window.CSS?.escape?CSS.escape(s):String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&')}
  function activeView(){return $('#loginView:not(.hidden)')||$('#appView:not(.hidden) .view:not(.hidden)')||$('#appView:not(.hidden)')||document.body}
  function viewKey(){return activeView()?.id||'global'}

  function selectorFor(el){
    if(!el)return '';
    if(el.id)return '#'+esc(el.id);
    const view=el.closest('.view[id],#loginView,#appView');
    const parts=[];let cur=el;
    while(cur&&cur!==view&&cur!==document.body){
      let part=cur.tagName.toLowerCase();
      const stable=[...cur.classList].filter(c=>!c.startsWith('bamco-')&&!['hidden','active','open','collapsed','manager-only','has-image'].includes(c));
      if(stable.length)part+='.'+stable.slice(0,2).map(esc).join('.');
      const parent=cur.parentElement;
      if(parent){const same=[...parent.children].filter(x=>x.tagName===cur.tagName);if(same.length>1)part+=`:nth-of-type(${same.indexOf(cur)+1})`}
      parts.unshift(part);cur=parent;
    }
    return (view?.id?'#'+esc(view.id):'body')+' '+parts.join(' > ');
  }

  function isEditor(el){return !!el?.closest?.('#bamcoVisualEditor')}
  function candidate(target){
    if(!target||!(target instanceof Element)||isEditor(target))return null;
    const priority=[
      '#appView .side-brand img','#appView .header-system-title','#appView .header-tool-btn','#appView #logoutBtn',
      '#appView .header-tools .avatar','#appView .header-tools .account-copy strong','#appView .header-tools .account-copy small',
      '#appView .nav-group-toggle','#appView .nav-group-items>button','#appView #nav>button',
      '#appView .welcome-sticker','#appView .bamco-welcome-sticker','[class*="sticker"]',
      '.welcome-copy h2','.welcome-copy p','.brand-lockup','img',
      'h1','h2','h3','h4','p','strong','small','span','label','button',
      '.panel','.manager-card','.table-panel','.table-wrap','.task-toolbar','.panel-head','.welcome-card','.welcome-content','.welcome-copy',
      '.workspace>header','.sidebar','.sidebar nav','.account','.dashboard-card','.chart-card','.app-footer-credit','#appFooterCredit'
    ];
    let el=target.closest(priority.join(','));
    if(el?.tagName==='SVG'||el?.tagName==='PATH')el=el.closest('button')||el.parentElement;
    if(!el){const view=activeView();if(view?.contains(target))el=target.closest('section,article,header,footer,aside,main,form,nav,div')}
    if(!el||el===document.body||el===document.documentElement||isEditor(el))return null;
    return el;
  }

  function applyRec(el,rec){
    if(!el||!rec)return;
    Object.entries(rec.style||{}).forEach(([k,v])=>{if(v)el.style.setProperty(k,v,'important');else el.style.removeProperty(k)});
    if(rec.text!==undefined&&isTextLeaf(el))el.textContent=rec.text;
    const tr=(rec.style||{}).translate||'';const m=tr.match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);if(m){el.dataset.bveX=m[1];el.dataset.bveY=m[2]}
  }
  function applyAll(){Object.entries(state.layouts).forEach(([sel,rec])=>{try{$$(sel).forEach(el=>applyRec(el,rec))}catch{}})}
  function isTextLeaf(el){return !!el&&!el.querySelector('svg,img,input,textarea,select,button')&&el.children.length===0}

  function ensureUI(){
    if($('#bamcoVisualEditor'))return;
    const root=document.createElement('div');root.id='bamcoVisualEditor';
    root.innerHTML=`
      <button id="bamcoVisualToggle" class="bve-fab" type="button">✦ ویرایش ظاهر</button>
      <aside id="bamcoVisualPanel" class="bve-panel" aria-hidden="true">
        <div class="bve-head"><strong>ویرایش دستی چیدمان</strong><button id="bveClose" type="button">×</button></div>
        <div class="bve-note">روی لوگو، متن، آیکن، استیکر یا هر بخش کلیک کن و مستقیم با موس جابه‌جایش کن. از چهار گوشه هم می‌توانی سایز را تغییر بدهی.</div>
        <div class="bve-selected"><span>انتخاب:</span><b id="bveSelectedName">—</b></div>
        <div class="bve-grid">
          <label>X<input id="bveX" type="number" step="1"></label>
          <label>Y<input id="bveY" type="number" step="1"></label>
          <label>عرض<input id="bveWidth" type="text" placeholder="مثلاً 240px"></label>
          <label>ارتفاع<input id="bveHeight" type="text" placeholder="مثلاً 80px"></label>
          <label>اندازه فونت<input id="bveFont" type="text" placeholder="مثلاً 24px"></label>
          <label>تراز<select id="bveAlign"><option value="">پیش‌فرض</option><option value="right">راست</option><option value="center">وسط</option><option value="left">چپ</option></select></label>
          <label>فاصله داخلی<input id="bvePadding" type="text"></label>
          <label>فاصله بیرونی<input id="bveMargin" type="text"></label>
        </div>
        <div class="bve-actions"><button id="bveApply" class="primary" type="button">اعمال</button><button id="bveResetOne" type="button">بازنشانی بخش</button></div>
        <div class="bve-actions"><button id="bveExport" type="button">خروجی چیدمان</button><label class="bve-import">ورود چیدمان<input id="bveImport" type="file" accept=".json,application/json"></label></div>
        <div class="bve-actions"><button id="bveResetAll" type="button">بازنشانی همه</button></div>
        <div class="bve-foot">Ctrl + Shift + E = باز/بسته کردن ادیتور</div>
      </aside>
      <div id="bveBox" class="bve-box" hidden><span class="bve-tag"></span><i class="bve-handle nw" data-dir="nw"></i><i class="bve-handle ne" data-dir="ne"></i><i class="bve-handle sw" data-dir="sw"></i><i class="bve-handle se" data-dir="se"></i></div>`;
    document.body.appendChild(root);bind();
  }

  function bind(){
    $('#bamcoVisualToggle').onclick=toggle;$('#bveClose').onclick=()=>enable(false);$('#bveApply').onclick=applyForm;$('#bveResetOne').onclick=resetOne;$('#bveResetAll').onclick=resetAll;$('#bveExport').onclick=exportLayout;$('#bveImport').onchange=importLayout;
    document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='e'){e.preventDefault();toggle()}if(state.enabled&&e.key==='Escape')enable(false)});
    document.addEventListener('click',onClick,true);document.addEventListener('pointerdown',onDown,true);document.addEventListener('pointermove',onMove,true);document.addEventListener('pointerup',onUp,true);
    window.addEventListener('resize',box);window.addEventListener('scroll',box,true);
  }
  function toggle(){enable(!state.enabled)}
  function enable(on){state.enabled=!!on;document.documentElement.classList.toggle(EDIT_CLASS,state.enabled);document.documentElement.classList.add('bve-design-access');const p=$('#bamcoVisualPanel');p.classList.toggle('open',state.enabled);p.setAttribute('aria-hidden',String(!state.enabled));$('#bamcoVisualToggle').textContent=state.enabled?'✓ پایان ویرایش':'✦ ویرایش ظاهر';if(!state.enabled)select(null)}

  function friendly(el){if(!el)return '—';if(el.id)return el.id;const t=(el.textContent||'').trim().replace(/\s+/g,' ');if(t&&t.length<50)return t;return el.className?.toString().split(' ')[0]||el.tagName.toLowerCase()}
  function select(el){state.selected=el;const b=$('#bveBox');if(!el){b.hidden=true;$('#bveSelectedName').textContent='—';return}b.hidden=false;$('#bveSelectedName').textContent=friendly(el);$('.bve-tag',b).textContent=friendly(el);fill(el);box()}
  function fill(el){const cs=getComputedStyle(el);$('#bveX').value=Math.round(parseFloat(el.dataset.bveX||'0')||0);$('#bveY').value=Math.round(parseFloat(el.dataset.bveY||'0')||0);$('#bveWidth').value=el.style.width||'';$('#bveHeight').value=el.style.height||'';$('#bveFont').value=el.style.fontSize||'';$('#bveAlign').value=el.style.textAlign||'';$('#bvePadding').value=el.style.padding||'';$('#bveMargin').value=el.style.margin||''}

  function onClick(e){if(!state.enabled||isEditor(e.target))return;e.preventDefault();e.stopPropagation();const el=candidate(e.target);if(el)select(el)}
  function onDown(e){if(!state.enabled)return;const h=e.target.closest('.bve-handle');if(h&&state.selected){e.preventDefault();e.stopPropagation();const r=state.selected.getBoundingClientRect();state.resize={dir:h.dataset.dir,x:e.clientX,y:e.clientY,w:r.width,h:r.height};return}if(isEditor(e.target))return;const el=candidate(e.target);if(!el)return;if(state.selected!==el)select(el);e.preventDefault();e.stopPropagation();state.drag={x:e.clientX,y:e.clientY,tx:parseFloat(el.dataset.bveX||'0')||0,ty:parseFloat(el.dataset.bveY||'0')||0}}
  function onMove(e){if(!state.enabled||!state.selected)return;const el=state.selected;if(state.resize){e.preventDefault();const dx=e.clientX-state.resize.x,dy=e.clientY-state.resize.y;let w=state.resize.w,h=state.resize.h;if(state.resize.dir.includes('e'))w+=dx;if(state.resize.dir.includes('w'))w-=dx;if(state.resize.dir.includes('s'))h+=dy;if(state.resize.dir.includes('n'))h-=dy;w=Math.max(20,w);h=Math.max(20,h);el.style.setProperty('width',Math.round(w)+'px','important');el.style.setProperty('height',Math.round(h)+'px','important');box();return}if(state.drag){e.preventDefault();const x=Math.round(state.drag.tx+e.clientX-state.drag.x),y=Math.round(state.drag.ty+e.clientY-state.drag.y);el.dataset.bveX=x;el.dataset.bveY=y;el.style.setProperty('translate',`${x}px ${y}px`,'important');el.style.setProperty('z-index','500','important');box()}}
  function onUp(){if(!state.enabled||!state.selected){state.drag=null;state.resize=null;return}if(state.drag||state.resize)saveGeometry(state.selected);state.drag=null;state.resize=null}
  function box(){const b=$('#bveBox'),el=state.selected;if(!state.enabled||!el||!document.contains(el)){if(b)b.hidden=true;return}const r=el.getBoundingClientRect();b.hidden=false;b.style.left=r.left+window.scrollX+'px';b.style.top=r.top+window.scrollY+'px';b.style.width=r.width+'px';b.style.height=r.height+'px'}

  function recFor(el){const s=selectorFor(el);return [s,state.layouts[s]||{view:viewKey(),style:{}}]}
  function saveGeometry(el){const [s,rec]=recFor(el);['width','height','translate','z-index','position'].forEach(p=>{const v=el.style.getPropertyValue(p);if(v)rec.style[p]=v});state.layouts[s]=rec;persist();fill(el)}
  function applyForm(){const el=state.selected;if(!el)return;const [s,rec]=recFor(el);const x=parseFloat($('#bveX').value||'0')||0,y=parseFloat($('#bveY').value||'0')||0;el.dataset.bveX=x;el.dataset.bveY=y;const vals={translate:`${x}px ${y}px`,width:$('#bveWidth').value.trim(),height:$('#bveHeight').value.trim(),'font-size':$('#bveFont').value.trim(),'text-align':$('#bveAlign').value,padding:$('#bvePadding').value.trim(),margin:$('#bveMargin').value.trim()};Object.entries(vals).forEach(([p,v])=>{rec.style[p]=v;if(v)el.style.setProperty(p,v,'important');else el.style.removeProperty(p)});state.layouts[s]=rec;persist();box()}
  function resetOne(){const el=state.selected;if(!el)return;const s=selectorFor(el),rec=state.layouts[s];Object.keys(rec?.style||{}).forEach(p=>el.style.removeProperty(p));delete el.dataset.bveX;delete el.dataset.bveY;delete state.layouts[s];persist();fill(el);box()}
  async function resetAll(){if(!await window.bamcoConfirm('همه جابه‌جایی‌های دستی بازنشانی شود؟'))return;Object.entries(state.layouts).forEach(([s,rec])=>{try{$$(s).forEach(el=>Object.keys(rec.style||{}).forEach(p=>el.style.removeProperty(p)))}catch{}});state.layouts={};persist();select(null)}
  function exportLayout(){const data=JSON.stringify({version:2,exportedAt:new Date().toISOString(),layouts:state.layouts},null,2),blob=new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='bamco-layout-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function importLayout(e){const f=e.target.files?.[0];if(!f)return;try{const o=JSON.parse(await f.text());state.layouts=o.layouts||o;persist();applyAll();select(null)}catch{window.bamcoNotice('فایل چیدمان معتبر نیست.',{error:true})}finally{e.target.value=''}}

  function boot(){ensureUI();applyAll();window.BAMCOVisualEditor={enable:()=>enable(true),disable:()=>enable(false),export:exportLayout,resetAll};new MutationObserver(()=>{applyAll();if(state.selected&&!document.contains(state.selected))select(null)}).observe(document.body,{childList:true,subtree:true});enable(true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
