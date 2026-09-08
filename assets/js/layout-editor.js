(() => {
  'use strict';

  const STORAGE_KEY = 'bamco.visual.layout.v1';
  const EDIT_CLASS = 'bamco-visual-editing';
  const state = {
    enabled: false,
    selected: null,
    drag: null,
    resize: null,
    layouts: loadLayouts()
  };

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  function loadLayouts(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function persist(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.layouts));
  }
  function activeView(){
    return $('#loginView:not(.hidden)') || $('#appView:not(.hidden) .view:not(.hidden)') || $('#appView:not(.hidden)') || document.body;
  }
  function viewKey(){
    const v = activeView();
    return v?.id || 'global';
  }
  function esc(s){
    if (window.CSS?.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }
  function selectorFor(el){
    if (!el || el === document.body || el === document.documentElement) return 'body';
    if (el.id) return '#' + esc(el.id);
    const view = el.closest('.view[id], #loginView, #appView');
    const parts = [];
    let cur = el;
    while (cur && cur !== view && cur !== document.body) {
      let part = cur.tagName.toLowerCase();
      const stable = [...cur.classList].filter(c =>
        !c.startsWith('bamco-') && !['hidden','active','open','collapsed','manager-only','has-image','task-selected','person-selected'].includes(c)
      );
      if (stable.length) part += '.' + stable.slice(0,2).map(esc).join('.');
      const parent = cur.parentElement;
      if (parent) {
        const same = [...parent.children].filter(x => x.tagName === cur.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(cur)+1})`;
      }
      parts.unshift(part);
      cur = parent;
    }
    const prefix = view?.id ? '#' + esc(view.id) : 'body';
    return prefix + ' ' + parts.join(' > ');
  }

  function editableCandidate(target){
    if (!target || !(target instanceof Element)) return null;
    if (target.closest('#bamcoVisualEditor')) return null;
    const protectedLeaf = target.closest('input,textarea,select,option,canvas,svg,path,th,td,tr,tbody,thead');
    if (protectedLeaf) target = protectedLeaf.closest('table,.table-wrap,.panel,.login-card,.welcome-card') || protectedLeaf.parentElement;
    const selectors = [
      '.panel','.manager-card','.stats','.stats article','.send-summary article',
      '.table-panel','.table-wrap','.task-toolbar','.panel-head','.welcome-card',
      '.welcome-content','.welcome-copy','.welcome-sticker','.brand-lockup',
      '#loginForm','.login-fields','.login-field','.login-verification-box',
      '.workspace > header','.header-actions','.sidebar','.sidebar nav',
      '.sidebar nav > button','.nav-group-items > button','.side-brand','.account',
      '.vehicle-view','.timeline-toolbar','.timeline-shell','.dashboard-grid',
      '.dashboard-card','.chart-card','.app-footer-credit','#appFooterCredit'
    ];
    let el = target.closest(selectors.join(','));
    if (!el) {
      const view = activeView();
      if (view && view.contains(target)) {
        el = target.closest('section,article,header,footer,aside,main,form,nav,div');
      }
    }
    if (!el || el === document.body || el === document.documentElement) return null;
    return el;
  }

  function applyRecord(el, rec){
    if (!el || !rec) return;
    const props = rec.style || {};
    Object.entries(props).forEach(([k,v]) => {
      if (v === null || v === '') el.style.removeProperty(k);
      else el.style.setProperty(k, v, 'important');
    });
    const tr = props.transform || '';
    const m = tr.match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/);
    if (m) { el.dataset.bveX = m[1]; el.dataset.bveY = m[2]; }
  }
  function applyAll(){
    Object.entries(state.layouts).forEach(([selector, rec]) => {
      try { $$(selector).forEach(el => applyRecord(el, rec)); } catch {}
    });
  }

  function ensureUI(){
    if ($('#bamcoVisualEditor')) return;
    const root = document.createElement('div');
    root.id = 'bamcoVisualEditor';
    root.innerHTML = `
      <button id="bamcoVisualToggle" class="bve-fab" type="button" title="ویرایش ظاهر">✦ ویرایش ظاهر</button>
      <aside id="bamcoVisualPanel" class="bve-panel" aria-hidden="true">
        <div class="bve-head">
          <strong>ویرایش ظاهر و چیدمان</strong>
          <button id="bveClose" type="button" aria-label="بستن">×</button>
        </div>
        <div class="bve-note">روی هر بخش کلیک کن؛ سپس با موس جابه‌جا یا از گوشه‌ها تغییر اندازه بده.</div>
        <div class="bve-selected"><span>بخش انتخاب‌شده:</span><b id="bveSelectedName">—</b></div>
        <div class="bve-grid">
          <label>عرض<input id="bveWidth" type="text" placeholder="auto / 100% / 420px"></label>
          <label>ارتفاع<input id="bveHeight" type="text" placeholder="auto / 300px"></label>
          <label>فاصله داخلی<input id="bvePadding" type="text" placeholder="مثلاً 16px"></label>
          <label>فاصله بیرونی<input id="bveMargin" type="text" placeholder="مثلاً 12px auto"></label>
          <label>فاصله بین اجزا<input id="bveGap" type="text" placeholder="مثلاً 12px"></label>
          <label>گردی گوشه<input id="bveRadius" type="text" placeholder="مثلاً 16px"></label>
          <label>اندازه فونت<input id="bveFont" type="text" placeholder="مثلاً 14px"></label>
          <label>رنگ پس‌زمینه<input id="bveBg" type="text" placeholder="#ffffff / transparent"></label>
          <label>رنگ متن<input id="bveColor" type="text" placeholder="#17352d"></label>
          <label>رنگ کادر<input id="bveBorderColor" type="text" placeholder="#c7d4ce"></label>
          <label>تراز
            <select id="bveAlign">
              <option value="">پیش‌فرض</option>
              <option value="right">راست</option>
              <option value="center">وسط</option>
              <option value="left">چپ</option>
            </select>
          </label>
        </div>
        <div class="bve-actions">
          <button id="bveApply" class="primary" type="button">اعمال</button>
          <button id="bveResetOne" type="button">بازنشانی بخش</button>
          <button id="bveResetView" type="button">بازنشانی این تب</button>
          <button id="bveResetAll" type="button">بازنشانی همه</button>
        </div>
        <div class="bve-actions">
          <button id="bveExport" type="button">خروجی چیدمان</button>
          <label class="bve-import">ورود چیدمان<input id="bveImport" type="file" accept=".json,application/json"></label>
        </div>
        <div class="bve-foot">میانبر: Ctrl + Shift + E</div>
      </aside>
      <div id="bveBox" class="bve-box" hidden>
        <span class="bve-tag"></span>
        <i class="bve-handle nw" data-dir="nw"></i><i class="bve-handle ne" data-dir="ne"></i>
        <i class="bve-handle sw" data-dir="sw"></i><i class="bve-handle se" data-dir="se"></i>
      </div>`;
    document.body.appendChild(root);
    bindUI();
  }

  function bindUI(){
    $('#bamcoVisualToggle').addEventListener('click', toggle);
    $('#bveClose').addEventListener('click', () => setEnabled(false));
    $('#bveApply').addEventListener('click', applyForm);
    $('#bveResetOne').addEventListener('click', resetSelected);
    $('#bveResetView').addEventListener('click', resetView);
    $('#bveResetAll').addEventListener('click', resetAll);
    $('#bveExport').addEventListener('click', exportLayout);
    $('#bveImport').addEventListener('change', importLayout);
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault(); toggle();
      }
      if (state.enabled && e.key === 'Escape') setEnabled(false);
    });
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('resize', updateBox);
    window.addEventListener('scroll', updateBox, true);
  }

  function toggle(){ setEnabled(!state.enabled); }
  function setEnabled(on){
    state.enabled = !!on;
    document.documentElement.classList.toggle(EDIT_CLASS, state.enabled);
    const panel = $('#bamcoVisualPanel');
    panel.classList.toggle('open', state.enabled);
    panel.setAttribute('aria-hidden', String(!state.enabled));
    $('#bamcoVisualToggle').textContent = state.enabled ? '✓ پایان ویرایش' : '✦ ویرایش ظاهر';
    if (!state.enabled) select(null);
  }

  function onDocumentClick(e){
    if (!state.enabled || e.target.closest('#bamcoVisualEditor')) return;
    e.preventDefault();
    e.stopPropagation();
    const el = editableCandidate(e.target);
    if (el) select(el);
  }

  function select(el){
    state.selected = el;
    const box = $('#bveBox');
    if (!el) {
      box.hidden = true;
      $('#bveSelectedName').textContent = '—';
      return;
    }
    box.hidden = false;
    $('#bveSelectedName').textContent = friendlyName(el);
    $('.bve-tag', box).textContent = friendlyName(el);
    fillForm(el);
    updateBox();
  }

  function friendlyName(el){
    const heading = el.querySelector?.(':scope > h1,:scope > h2,:scope > h3,.panel-head h3');
    const text = heading?.textContent?.trim();
    if (text) return text.slice(0,45);
    if (el.id) return el.id;
    const cls = [...el.classList].filter(c => !c.startsWith('bamco-'))[0];
    return cls || el.tagName.toLowerCase();
  }

  function fillForm(el){
    const map = {
      bveWidth:'width', bveHeight:'height', bvePadding:'padding',
      bveMargin:'margin', bveGap:'gap', bveRadius:'border-radius',
      bveFont:'font-size', bveBg:'background-color', bveColor:'color',
      bveBorderColor:'border-color', bveAlign:'text-align'
    };
    Object.entries(map).forEach(([id,prop]) => {
      const input = $('#'+id);
      input.value = el.style.getPropertyValue(prop) || '';
    });
  }

  function applyForm(){
    const el = state.selected;
    if (!el) return;
    const selector = selectorFor(el);
    const rec = state.layouts[selector] || {view:viewKey(), style:{}};
    const fields = {
      width:$('#bveWidth').value.trim(),
      height:$('#bveHeight').value.trim(),
      padding:$('#bvePadding').value.trim(),
      margin:$('#bveMargin').value.trim(),
      gap:$('#bveGap').value.trim(),
      'border-radius':$('#bveRadius').value.trim(),
      'font-size':$('#bveFont').value.trim(),
      'background-color':$('#bveBg').value.trim(),
      'color':$('#bveColor').value.trim(),
      'border-color':$('#bveBorderColor').value.trim(),
      'text-align':$('#bveAlign').value
    };
    Object.entries(fields).forEach(([prop,val]) => {
      rec.style[prop] = val;
      if (val) el.style.setProperty(prop,val,'important'); else el.style.removeProperty(prop);
    });
    state.layouts[selector] = rec;
    persist(); updateBox();
  }

  function onPointerDown(e){
    if (!state.enabled) return;
    const handle = e.target.closest('.bve-handle');
    if (handle && state.selected) {
      e.preventDefault(); e.stopPropagation();
      const r = state.selected.getBoundingClientRect();
      state.resize = {dir:handle.dataset.dir, x:e.clientX, y:e.clientY, w:r.width, h:r.height};
      return;
    }
    if (e.target.closest('#bamcoVisualEditor')) return;
    const el = editableCandidate(e.target);
    if (!el) return;
    if (state.selected !== el) select(el);
    e.preventDefault(); e.stopPropagation();
    const tx = parseFloat(el.dataset.bveX || '0') || 0;
    const ty = parseFloat(el.dataset.bveY || '0') || 0;
    state.drag = {x:e.clientX, y:e.clientY, tx, ty};
  }

  function onPointerMove(e){
    if (!state.enabled || !state.selected) return;
    if (state.resize) {
      e.preventDefault();
      const dx = e.clientX - state.resize.x, dy = e.clientY - state.resize.y;
      let w = state.resize.w, h = state.resize.h;
      if (state.resize.dir.includes('e')) w += dx;
      if (state.resize.dir.includes('w')) w -= dx;
      if (state.resize.dir.includes('s')) h += dy;
      if (state.resize.dir.includes('n')) h -= dy;
      w = Math.max(80,w); h = Math.max(40,h);
      state.selected.style.setProperty('width', Math.round(w)+'px','important');
      state.selected.style.setProperty('height', Math.round(h)+'px','important');
      updateBox();
      return;
    }
    if (state.drag) {
      e.preventDefault();
      const dx = e.clientX - state.drag.x, dy = e.clientY - state.drag.y;
      const x = Math.round(state.drag.tx + dx), y = Math.round(state.drag.ty + dy);
      state.selected.dataset.bveX = String(x);
      state.selected.dataset.bveY = String(y);
      state.selected.style.setProperty('transform', `translate(${x}px, ${y}px)`, 'important');
      state.selected.style.setProperty('z-index','25','important');
      if (getComputedStyle(state.selected).position === 'static') state.selected.style.setProperty('position','relative','important');
      updateBox();
    }
  }

  function onPointerUp(){
    if (!state.enabled || !state.selected) { state.drag=null; state.resize=null; return; }
    if (state.drag || state.resize) saveGeometry(state.selected);
    state.drag = null; state.resize = null;
  }

  function saveGeometry(el){
    const selector = selectorFor(el);
    const rec = state.layouts[selector] || {view:viewKey(),style:{}};
    ['width','height','transform','z-index','position'].forEach(prop => {
      const v = el.style.getPropertyValue(prop);
      if (v) rec.style[prop] = v;
    });
    state.layouts[selector] = rec;
    persist();
    fillForm(el);
  }

  function updateBox(){
    const box = $('#bveBox'), el = state.selected;
    if (!state.enabled || !el || !document.contains(el)) { box.hidden = true; return; }
    const r = el.getBoundingClientRect();
    box.hidden = false;
    box.style.left = (r.left + window.scrollX) + 'px';
    box.style.top = (r.top + window.scrollY) + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';
  }

  function clearInlineFromRecord(el, rec){
    if (!el || !rec?.style) return;
    Object.keys(rec.style).forEach(prop => el.style.removeProperty(prop));
    delete el.dataset.bveX; delete el.dataset.bveY;
  }
  function resetSelected(){
    const el = state.selected;
    if (!el) return;
    const selector = selectorFor(el);
    const rec = state.layouts[selector];
    clearInlineFromRecord(el, rec);
    delete state.layouts[selector];
    persist(); fillForm(el); updateBox();
  }
  function resetView(){
    const key = viewKey();
    Object.entries({...state.layouts}).forEach(([selector, rec]) => {
      if (rec.view !== key) return;
      try { $$(selector).forEach(el => clearInlineFromRecord(el, rec)); } catch {}
      delete state.layouts[selector];
    });
    persist(); select(null);
  }
  function resetAll(){
    if (!confirm('همه تغییرات ظاهری ذخیره‌شده بازنشانی شود؟')) return;
    Object.entries({...state.layouts}).forEach(([selector, rec]) => {
      try { $$(selector).forEach(el => clearInlineFromRecord(el, rec)); } catch {}
    });
    state.layouts = {};
    persist();
    select(null);
  }

  function exportLayout(){
    const data = JSON.stringify({version:1, exportedAt:new Date().toISOString(), layouts:state.layouts}, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bamco-layout.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function importLayout(e){
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const layouts = obj.layouts || obj;
      if (!layouts || typeof layouts !== 'object') throw new Error();
      state.layouts = layouts;
      persist(); applyAll(); select(null);
    } catch {
      alert('فایل چیدمان معتبر نیست.');
    } finally { e.target.value=''; }
  }

  function expose(){
    window.BAMCOVisualEditor = {
      enable: () => setEnabled(true),
      disable: () => setEnabled(false),
      export: exportLayout,
      resetAll
    };
  }

  function boot(){
    ensureUI();
    applyAll();
    expose();
    const mo = new MutationObserver(() => {
      applyAll();
      if (state.selected && !document.contains(state.selected)) select(null);
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
