(()=>{
  'use strict';
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const STICKER_KEYS=['01_happy_female','01_happy_male','02_reminder_female','02_reminder_male','03_concerned_female','03_concerned_male','04_serious_female','04_serious_male','05_urgent_female','05_urgent_male'];

  function addVehicleViews(){
    const workspace=q('.workspace');
    if(!workspace||q('#vehiclePermanentView'))return;
    workspace.insertAdjacentHTML('beforeend',`
      <section id="vehiclePermanentView" class="view hidden manager-only vehicle-view"><div class="panel"><div class="panel-head"><div><h3>تحویل دائم</h3><small>مدیریت اطلاعات خودروهای تحویل دائم</small></div></div><div class="empty vehicle-empty">این بخش برای ثبت و مدیریت اطلاعات تحویل دائم آماده است.</div></div></section>
      <section id="vehicleTemporaryView" class="view hidden manager-only vehicle-view"><div class="panel"><div class="panel-head"><div><h3>تحویل موقت</h3><small>مدیریت اطلاعات خودروهای تحویل موقت</small></div></div><div class="empty vehicle-empty">این بخش برای ثبت و مدیریت اطلاعات تحویل موقت آماده است.</div></div></section>`);
  }

  function closeAllGroups(except=null){
    qa('#nav .nav-group.open').forEach(g=>{if(g!==except)g.classList.remove('open')});
  }

  function makeGroup(title,key,views,icon){
    const nav=q('#nav');
    const children=views.map(v=>q(`#nav button[data-view="${v}"]`)).filter(Boolean);
    if(!children.length)return null;
    const group=document.createElement('div');
    group.className='nav-group';group.dataset.group=key;
    const toggle=document.createElement('button');
    toggle.type='button';toggle.className='nav-group-toggle';toggle.title=title;toggle.setAttribute('aria-label',title);toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML=`<b class="nav-group-icon">${icon}</b><span>${title}</span><b class="nav-chevron">⌄</b>`;
    const items=document.createElement('div');items.className='nav-group-items';children.forEach(b=>items.appendChild(b));
    group.append(toggle,items);nav.appendChild(group);
    toggle.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const willOpen=!group.classList.contains('open');
      closeAllGroups(group);
      group.classList.toggle('open',willOpen);
      toggle.setAttribute('aria-expanded',willOpen?'true':'false');
    });
    items.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-view]');
      if(btn){group.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
    });
    return group;
  }

  function installGroupedNav(){
    const nav=q('#nav');if(!nav||nav.dataset.grouped==='1')return;
    nav.dataset.grouped='1';addVehicleViews();
    const sidebar=q('#sidebar'),brand=q('.side-brand'),systemTitle=brand?.querySelector('strong');
    if(sidebar&&systemTitle&&!systemTitle.classList.contains('header-system-title')){
      systemTitle.classList.add('header-system-title');
      sidebar.appendChild(systemTitle);
    }
    const settings=q('#nav button[data-view="settings"]');
    if(settings){
      settings.classList.add('nav-settings-root');
      settings.title='تنظیمات';
      if(!settings.querySelector('b'))settings.insertAdjacentHTML('afterbegin','<b>⚙</b>');
    }

    const permanent=document.createElement('button');permanent.dataset.view='vehiclePermanent';permanent.className='manager-only';permanent.innerHTML='<b>▣</b><span>تحویل دائم</span>';
    const temporary=document.createElement('button');temporary.dataset.view='vehicleTemporary';temporary.className='manager-only';temporary.innerHTML='<b>▤</b><span>تحویل موقت</span>';
    nav.append(permanent,temporary);qa('#nav>.nav-divider').forEach(x=>x.remove());

    const task=makeGroup('مدیریت وظایف','tasks',['kanban','archive','taskTimeline','dashboard','approvals','requestHistory'],'☑');
    const people=makeGroup('مدیریت افراد و نقش‌ها','people',['people','systemOptions'],'♙');
    const email=makeGroup('مدیریت پیام','messages',['messages','sentMessages','templates','stickers'],'✉');
    const vehicle=makeGroup('مدیریت خودرو','vehicle',['vehiclePermanent','vehicleTemporary'],'◇');
    if(settings)nav.appendChild(settings);

    const groups=[task,people,email,vehicle];
    const refreshVisibility=()=>groups.forEach(g=>{
      if(!g)return;
      const visible=[...g.querySelectorAll('.nav-group-items>button')].some(b=>!b.classList.contains('hidden'));
      g.classList.toggle('hidden',!visible);
    });
    refreshVisibility();
    new MutationObserver(refreshVisibility).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});

    [permanent,temporary].forEach(b=>b.addEventListener('click',()=>{
      closeAllGroups();
      document.body.classList.remove('welcome-active');q('#welcomeView')?.classList.add('hidden');
      if(typeof showView==='function')showView(b.dataset.view);
      const h=q('#viewTitle');if(h)h.textContent=b.dataset.view==='vehiclePermanent'?'تحویل دائم':'تحویل موقت';
    }));

    document.addEventListener('click',e=>{if(!e.target.closest('#nav .nav-group'))closeAllGroups()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAllGroups()});
  }

  function installCollapseButton(){
    const btn=q('#collapseBtn');
    if(btn){btn.hidden=true;btn.setAttribute('aria-hidden','true')}
  }

  function installTaskTools(){
    const add=q('#addTaskBtn'),kanbanToolbar=q('#kanbanView .task-toolbar');
    if(add&&kanbanToolbar&&!kanbanToolbar.contains(add)){add.textContent='＋ افزودن وظیفه';kanbanToolbar.prepend(add)}
    const configs=[['kanban','#kanbanSearch'],['archive','#archiveSearch']];
    configs.forEach(([scope,searchSel])=>{
      const toolbar=q(`#${scope}View .task-toolbar`),input=q(searchSel);
      if(!toolbar||!input||toolbar.querySelector('.task-search-toggle'))return;
      const toggle=document.createElement('button');
      toggle.type='button';toggle.className='ghost task-search-toggle';toggle.textContent='⌕';toggle.title='جست‌وجو';toggle.setAttribute('aria-label','باز کردن جست‌وجو');
      input.classList.add('toolbar-search');
      toolbar.insertBefore(toggle,toolbar.firstChild?.nextSibling||null);
      toolbar.insertBefore(input,toggle.nextSibling);
      toggle.addEventListener('click',()=>{
        const open=input.classList.toggle('search-open');
        toggle.classList.toggle('active',open);
        if(open)setTimeout(()=>input.focus(),20);
      });
      input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.classList.remove('search-open');toggle.classList.remove('active');input.blur()}});
    });
  }

  function removeSubtitle(){const p=q('#viewSubtitle');if(p){p.textContent='';p.style.display='none'}}

  const appendScript=()=>Promise.resolve(true);
  const imageWorks=src=>new Promise(resolve=>{
    if(!src)return resolve(false);
    const img=new Image();let done=false;
    const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v)};
    const timer=setTimeout(()=>finish(false),3500);
    img.onload=()=>finish(img.naturalWidth>10&&img.naturalHeight>10);img.onerror=()=>finish(false);img.src=src;
  });

  async function loadStickerAssets(){
    window.BAMCO_DESKTOP_ASSETS=window.BAMCO_DESKTOP_ASSETS||{};
    const smallCandidates={...window.BAMCO_DESKTOP_ASSETS};
    window.BAMCO_STICKER_PACK='';
    await appendScript('sticker-pack-01.js?v=20260907-core1');
    await appendScript('sticker-pack-02.js?v=20260907-core1');
    await appendScript('sticker-pack-loader.js?v=20260907-core1');
    const fullCandidates={...window.BAMCO_DESKTOP_ASSETS};
    const beforeExact={...window.BAMCO_DESKTOP_ASSETS};
    const exact=['01_happy_female.js','01_happy_male.js','02_reminder_female.js','02_reminder_male.js','03_concerned_female.js','03-04-pair.js'];
    for(const name of exact)await appendScript(`sticker-assets-exact/${name}?v=20260907-core1`);
    const afterExact={...window.BAMCO_DESKTOP_ASSETS};
    let valid=0;
    for(const key of STICKER_KEYS){
      const exactCandidate=afterExact[key]!==beforeExact[key]?afterExact[key]:'';
      const candidates=[exactCandidate,fullCandidates[key],smallCandidates[key],afterExact[key]].filter((x,i,a)=>x&&a.indexOf(x)===i);
      let chosen='';
      for(const src of candidates){if(await imageWorks(src)){chosen=src;break}}
      if(chosen){window.BAMCO_DESKTOP_ASSETS[key]=chosen;valid++}
    }
    window.BAMCO_STICKER_ASSET_COUNT=valid;
    window.dispatchEvent(new CustomEvent('bamco-stickers-ready',{detail:{count:valid}}));
  }

  function forceNormalScale(){
    document.documentElement.style.setProperty('zoom','1');
    document.body.style.setProperty('zoom','1');
  }

  const boot=()=>{
    forceNormalScale();
    installGroupedNav();
    installCollapseButton();
    installTaskTools();
    removeSubtitle();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
