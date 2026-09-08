(()=>{
  'use strict';
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const STICKER_KEYS=['01_happy_female','01_happy_male','02_reminder_female','02_reminder_male','03_concerned_female','03_concerned_male','04_serious_female','04_serious_male','05_urgent_female','05_urgent_male'];

  function installHeaderStyles(){
    if(q('#bamcoHeaderRefreshStyles'))return;
    const link=document.createElement('link');
    link.id='bamcoHeaderRefreshStyles';
    link.rel='stylesheet';
    link.href='assets/css/header-refresh.css?v=20260908-header-refresh';
    document.head.appendChild(link);
  }

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

    const task=makeGroup('مدیریت وظایف','tasks',['kanban','archive','taskTimeline','approvals','requestHistory','approvalChains'],'☑');
    const people=makeGroup('مدیریت افراد','people',['people'],'♙');
    const email=makeGroup('مدیریت پیام','messages',['messages','sentMessages','templates','stickers'],'✉');
    const vehicle=makeGroup('مدیریت خودرو','vehicle',['vehiclePermanent','vehicleTemporary'],'◇');
    const reports=makeGroup('گزارش‌ها','reports',['dashboard'],'▦');
    const configuration=makeGroup('تنظیمات','configuration',['systemOptions'],'⚙');
    if(settings)nav.appendChild(settings);

    const groups=[task,email,people,vehicle,reports,configuration];
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

  function installHeaderTools(){
    const sidebar=q('#sidebar');
    if(!sidebar||q('.header-tools'))return;

    const tools=document.createElement('div');
    tools.className='header-tools';
    tools.setAttribute('aria-label','ابزارهای کاربری');

    const account=q('.account');
    if(account)tools.appendChild(account);

    const bell=document.createElement('button');
    bell.type='button';
    bell.id='notificationBell';
    bell.className='header-tool-btn header-notification-bell';
    bell.title='پیام‌های من';
    bell.setAttribute('aria-label','پیام‌ها');
    bell.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg><span class="header-notification-count" aria-hidden="true"></span>`;

    const settingsProxy=document.createElement('button');
    settingsProxy.type='button';
    settingsProxy.id='headerSettingsBtn';
    settingsProxy.className='header-tool-btn header-settings-btn';
    settingsProxy.title='تنظیمات';
    settingsProxy.setAttribute('aria-label','تنظیمات');
    settingsProxy.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.56-1.03H5.4v-3h.06A1.7 1.7 0 0 0 7.02 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06A1.7 1.7 0 0 0 10.68 5.34a1.7 1.7 0 0 0 1.03-1.56V3.7h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.03h.06v3h-.06A1.7 1.7 0 0 0 19.4 15Z"></path></svg>`;

    tools.append(bell,settingsProxy);
    sidebar.appendChild(tools);

    const syncBell=()=>{
      const badge=q('#messageBadge'),count=bell.querySelector('.header-notification-count');
      const value=(badge?.textContent||'').trim();
      count.textContent=value;
      bell.classList.toggle('has-unread',!!value);
      bell.setAttribute('aria-label',value?`پیام‌ها، ${value} پیام خوانده‌نشده`:'پیام‌ها');
    };

    const bindMessageBadge=()=>{
      const badge=q('#messageBadge');
      if(!badge||badge.dataset.headerBellBound==='1')return false;
      badge.dataset.headerBellBound='1';
      new MutationObserver(syncBell).observe(badge,{childList:true,characterData:true,subtree:true,attributes:true});
      syncBell();
      return true;
    };

    if(!bindMessageBadge()){
      const nav=q('#nav');
      if(nav){
        const observer=new MutationObserver(()=>{if(bindMessageBadge())observer.disconnect()});
        observer.observe(nav,{childList:true,subtree:true});
      }
    }

    bell.addEventListener('click',()=>{
      closeAllGroups();
      const source=q('#nav button[data-view="messages"]');
      if(source)source.click();
      else if(typeof showView==='function')showView('messages');
    });

    settingsProxy.addEventListener('click',()=>{
      closeAllGroups();
      const source=q('#nav button[data-view="settings"]');
      if(source)source.click();
      else if(typeof showView==='function')showView('settings');
    });
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
    installHeaderStyles();
    installGroupedNav();
    installHeaderTools();
    installCollapseButton();
    installTaskTools();
    removeSubtitle();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
