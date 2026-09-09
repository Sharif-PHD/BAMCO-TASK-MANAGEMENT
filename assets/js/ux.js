/* module:ux:25 */
(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];

  const ICONS={
    login:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>`,
    tasks:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10l1.6 1.6L13 8.8M8.5 15l1.6 1.6L13 13.8M15 10h1.5M15 15h1.5"/></svg>`,
    people:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.5 2.6-5.2 5.5-5.2s5 1.7 5.5 5.2M15 6.5a2.5 2.5 0 0 1 0 5M16.5 14c2.3.4 3.7 2 4 5"/></svg>`,
    email:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>`,
    vehicle:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14l-1.3-5.2A2.4 2.4 0 0 0 15.4 9H8.6a2.4 2.4 0 0 0-2.3 1.8L5 16Zm-1 0v2.2c0 .4.4.8.8.8H6m12 0h1.2c.4 0 .8-.4.8-.8V16M7 13h.01M17 13h.01"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3.8 10 2h4l.5 1.8 1.8.8 1.7-.9 2.8 2.8-.9 1.7.8 1.8 1.8.5v4l-1.8.5-.8 1.8.9 1.7-2.8 2.8-1.7-.9-1.8.8L14 22h-4l-.5-1.8-1.8-.8-1.7.9-2.8-2.8.9-1.7-.8-1.8-1.8-.5v-4l1.8-.5.8-1.8-.9-1.7L6 3.7l1.7.9 1.8-.8Z"/><circle cx="12" cy="12" r="3"/></svg>`
  };

  function injectStyle(){
    /* Layout and visual rules belong to bamco-unified.css only. */
    q('#bamcoFinalPolishStyle')?.remove();
    return;
    let style=q('#bamcoFinalPolishStyle');
    if(!style){style=document.createElement('style');style.id='bamcoFinalPolishStyle';document.head.appendChild(style)}
    style.textContent=`
      html body #appView #sidebar #nav>.nav-group,
      html body #appView #sidebar #nav>.nav-settings-root{border:0!important;border-top:0!important;border-bottom:0!important;box-shadow:none!important}
      html body #appView #sidebar #nav .nav-chevron{display:none!important;width:0!important;min-width:0!important;margin:0!important;padding:0!important}
      html body #appView #sidebar #nav>.nav-login-root::after,
      html body #appView #sidebar #nav>.nav-settings-root::after,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle::before,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle::after{content:none!important;display:none!important}
      html body #appView #sidebar #nav>.nav-login-root,
      html body #appView #sidebar #nav>.nav-settings-root,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle{
        display:grid!important;grid-template-columns:28px minmax(0,1fr)!important;gap:10px!important;
        width:100%!important;height:48px!important;min-height:48px!important;margin:0!important;padding:7px 10px!important;
        align-items:center!important;box-sizing:border-box!important;border:0!important;
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
        font-size:17px!important;line-height:1.25!important;font-weight:700!important;text-align:right!important
      }
      html body #appView #sidebar #nav>.nav-login-root>b,
      html body #appView #sidebar #nav>.nav-settings-root>b,
      html body #appView #sidebar #nav>.nav-group>.nav-group-toggle>.nav-group-icon{
        width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;
        display:flex!important;align-items:center!important;justify-content:center!important;margin:0!important;padding:0!important;
        font-size:0!important;line-height:1!important;color:currentColor!important
      }
      html body #appView #sidebar #nav .bamco-top-icon svg{
        width:20px!important;height:20px!important;display:block!important;fill:none!important;stroke:currentColor!important;
        stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important
      }
      html body #appView #sidebar #nav>.nav-group>.nav-group-items{
        padding-right:2.5em!important;
        padding-left:0!important;
      }
      html body #appView #sidebar #nav>.nav-group>.nav-group-items>button{
        display:grid!important;
        grid-template-columns:22px minmax(0,1fr)!important;
        align-items:center!important;
        gap:10px!important;
        direction:rtl!important;
        text-align:right!important;
        justify-items:stretch!important;
        padding-right:0!important;
      }
      html body #appView #sidebar #nav>.nav-group>.nav-group-items>button>span{
        display:block!important;
        width:100%!important;
        direction:rtl!important;
        text-align:right!important;
        justify-self:stretch!important;
      }

      html body #appView #welcomeView.bamco-welcome-view{
        overflow:visible!important;
      }
      html body #appView #welcomeView .bamco-welcome-layout{
        position:relative!important;
        display:block!important;
        width:min(900px,68vw)!important;
        max-width:900px!important;
        margin:0 auto!important;
        overflow:visible!important;
      }
      html body #appView #welcomeView .bamco-welcome-card{
        width:100%!important;
        min-height:270px!important;
        margin:0!important;
      }
      html body #appView #welcomeView .bamco-welcome-sticker{
        position:absolute!important;
        width:min(470px,34vw)!important;
        height:540px!important;
        max-width:none!important;
        bottom:-195px!important;
        z-index:4!important;
        object-fit:contain!important;
        pointer-events:none!important;
      }
      html body #appView #welcomeView .bamco-welcome-sticker-left{
        left:-260px!important;
        right:auto!important;
      }
      html body #appView #welcomeView .bamco-welcome-sticker-right{
        right:-260px!important;
        left:auto!important;
      }
      @media(max-width:1100px){
        html body #appView #welcomeView .bamco-welcome-layout{width:min(720px,65vw)!important}
        html body #appView #welcomeView .bamco-welcome-sticker{width:330px!important;height:400px!important;bottom:-145px!important}
        html body #appView #welcomeView .bamco-welcome-sticker-left{left:-185px!important}
        html body #appView #welcomeView .bamco-welcome-sticker-right{right:-185px!important}
      }

      html body #appView #kanbanView>.table-panel,
      html body #appView #archiveView>.table-panel{
        position:relative!important;margin:18px 0 14px!important;padding:28px 16px 16px!important;
        border:1px solid #b8c8c1!important;border-radius:10px!important;background:#f8faf9!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head,
      html body #appView #archiveView .table-panel>.panel-head{
        position:static!important;display:block!important;height:0!important;min-height:0!important;
        margin:0!important;padding:0!important;border:0!important;background:transparent!important;overflow:visible!important;flex:0 0 0!important
      }
      html body #appView #kanbanView .table-panel>.panel-head>div:first-child,
      html body #appView #archiveView .table-panel>.panel-head>div:first-child{
        position:absolute!important;top:-15px!important;right:18px!important;z-index:6!important;
        display:block!important;width:auto!important;max-width:calc(100% - 36px)!important;
        margin:0!important;padding:0 10px!important;background:#eef3f0!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head h3,
      html body #appView #archiveView .table-panel>.panel-head h3{
        position:static!important;margin:0!important;padding:0!important;color:#145741!important;
        font-size:18px!important;line-height:1.7!important;font-weight:700!important;white-space:nowrap!important;overflow:visible!important
      }
      html body #appView #kanbanView .table-panel>.panel-head small,
      html body #appView #archiveView .table-panel>.panel-head small{display:none!important}

      html body #appView #kanbanView .task-toolbar,
      html body #appView #archiveView .task-toolbar{
        display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;
        gap:10px!important;column-gap:10px!important;row-gap:10px!important;margin:0 0 12px!important;padding:0!important;
        overflow-x:auto!important;background:transparent!important;border:0!important
      }
      html body #appView #kanbanView .task-toolbar>*,
      html body #appView #archiveView .task-toolbar>*{margin:0!important}
      html body #appView #kanbanView .task-toolbar button,
      html body #appView #archiveView .task-toolbar button{flex:0 0 auto!important}
      html body #appView #kanbanView .toolbar-search:not(.search-open),
      html body #appView #archiveView .toolbar-search:not(.search-open){display:none!important}
      html body #appView #kanbanView .toolbar-search.search-open,
      html body #appView #archiveView .toolbar-search.search-open{
        display:block!important;flex:0 0 270px!important;width:270px!important;min-width:270px!important;max-width:270px!important;
        opacity:1!important;pointer-events:auto!important
      }
    `;
  }

  function setIcon(el,svg,key){
    if(!el||el.dataset.bamcoTopIcon===key)return;
    el.classList.add('bamco-top-icon');el.innerHTML=svg;el.dataset.bamcoTopIcon=key;
  }

  function polishSidebar(){
    const nav=q('#nav');if(!nav)return;
    qa('.nav-chevron',nav).forEach(x=>x.remove());
    setIcon(q(':scope>.nav-login-root>b',nav),ICONS.login,'login');
    qa(':scope>.nav-group',nav).forEach(g=>{
      const key=g.dataset.group||g.dataset.navGroup||'';
      const icon=q('.nav-group-toggle>.nav-group-icon',g);
      if(key==='tasks')setIcon(icon,ICONS.tasks,'tasks');
      if(key==='people')setIcon(icon,ICONS.people,'people');
      if(key==='messages')setIcon(icon,ICONS.email,'messages');
      if(key==='email')setIcon(icon,ICONS.email,'email');
      if(key==='vehicle')setIcon(icon,ICONS.vehicle,'vehicle');
    });
    setIcon(q(':scope>.nav-settings-root>b',nav),ICONS.settings,'settings');
  }

  function fixWording(){
    const add=q('#addTaskBtn');if(add)add.textContent='＋ افزودن وظیفه';
    for(const el of [q('#taskDialogTitle'),q('#saveTaskBtn')]){
      if(el&&el.textContent.includes('تسک'))el.textContent=el.textContent.replace(/تسک/g,'وظیفه');
    }
    const k=q('#kanbanView .panel-head h3');if(k)k.textContent='وظایف جاری';
    const a=q('#archiveView .panel-head h3');if(a)a.textContent='وظایف آرشیو شده';
    const footer=q('#appFooterCredit');if(footer)footer.textContent='توسعه یافته توسط واحد توسعه و تکوین محصول شرکت خودروسازان بم | شهاب‌الدین تنهائیان و نازنین قائمی';
  }

  function run(){injectStyle();polishSidebar();fixWording()}

  function installObservers(){
    const dialog=q('#taskDialog');if(dialog&&!dialog.dataset.bamcoWordingVerifyV4){
      dialog.dataset.bamcoWordingVerifyV4='1';
      let queued=false;
      new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fixWording()})}).observe(dialog,{childList:true,subtree:true,characterData:true});
    }
    const nav=q('#nav');if(nav&&!nav.dataset.bamcoSidebarVerifyV4){
      nav.dataset.bamcoSidebarVerifyV4='1';
      let queued=false;
      new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polishSidebar()})}).observe(nav,{childList:true,subtree:true});
    }
  }

  function boot(){
    run();installObservers();
    run();installObservers();requestAnimationFrame(run);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();



/* module:ux:26 */
(()=>{
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function decorateWelcome(){
    const card=q('#welcomeView .welcome-card');
    if(!card||card.dataset.uxWelcome==='1')return;
    card.dataset.uxWelcome='1';
    card.innerHTML=`
      <div class="welcome-content">
        <img id="welcomeFemaleSticker" class="welcome-sticker is-missing" alt="استیکر وضعیت مطلوب خانم">
        <div class="welcome-copy">
          <h2>به سامانه مدیریت، پایش و پیگیری امور خوش آمدید</h2>
          <p>لطفاً از منوی سمت راست، بخش موردنظر خود را انتخاب کنید.</p>
        </div>
        <img id="welcomeMaleSticker" class="welcome-sticker is-missing" alt="استیکر وضعیت مطلوب آقا">
      </div>`;
    refreshWelcomeStickers();
  }

  function setWelcomeImage(selector,src){
    const img=q(selector);if(!img)return;
    if(!src){img.classList.add('is-missing');img.removeAttribute('src');return}
    img.onload=()=>img.classList.remove('is-missing');
    img.onerror=()=>img.classList.add('is-missing');
    img.src=src;
  }

  function refreshWelcomeStickers(){
    const assets=window.BAMCO_DESKTOP_ASSETS||{};
    setWelcomeImage('#welcomeFemaleSticker',assets['01_happy_female']||'');
    setWelcomeImage('#welcomeMaleSticker',assets['01_happy_male']||'');
  }

  function collapseGroupsForEntry(){
    qa('#nav .nav-group').forEach(g=>g.classList.add('collapsed-group'));
  }

  function installEntryCollapse(){
    const app=q('#appView');if(!app||app.dataset.uxEntryCollapse==='1')return;
    app.dataset.uxEntryCollapse='1';
    let wasHidden=app.classList.contains('hidden');
    const collapseSoon=()=>[80,250,600].forEach(ms=>setTimeout(collapseGroupsForEntry,ms));
    const applyIfEntered=()=>{
      const hidden=app.classList.contains('hidden');
      if(wasHidden&&!hidden)collapseSoon();
      wasHidden=hidden;
    };
    new MutationObserver(applyIfEntered).observe(app,{attributes:true,attributeFilter:['class']});
    if(!wasHidden)collapseSoon();
  }

  function polishSearchButtons(){
    const k=q('#kanbanView .task-search-toggle');
    const a=q('#archiveView .task-search-toggle');
    if(k){k.textContent='جست‌وجو در وظایف';k.title='جست‌وجو در وظایف';k.setAttribute('aria-label','جست‌وجو در وظایف')}
    if(a){a.textContent='جست‌وجو در آرشیو';a.title='جست‌وجو در آرشیو';a.setAttribute('aria-label','جست‌وجو در آرشیو')}
    const ki=q('#kanbanSearch'),ai=q('#archiveSearch');
    if(ki)ki.placeholder='جست‌وجو در وظایف…';
    if(ai)ai.placeholder='جست‌وجو در آرشیو…';
  }

  function cleanTaskTable(viewId){
    const view=q(`#${viewId}`);if(!view)return;
    view.querySelectorAll('tbody tr[data-task-id]').forEach(row=>{
      const cells=row.children;
      const offset=cells[0]?.classList.contains('unified-select-cell')?1:0;
      if(cells[offset])cells[offset].textContent=(cells[offset].textContent||'').replace(/^\s*#\s*/,'').trim();
      if(cells[offset+11]){
        const text=(cells[offset+11].textContent||'').trim();
        cells[offset+11].textContent=text;
      }
    });
  }

  function installTableCleaning(){
    ['kanbanView','archiveView'].forEach(id=>{
      const view=q(`#${id}`);if(!view||view.dataset.uxTableClean==='1')return;
      view.dataset.uxTableClean='1';
      cleanTaskTable(id);
      const body=view.querySelector('tbody');
      if(body)new MutationObserver(()=>requestAnimationFrame(()=>cleanTaskTable(id))).observe(body,{childList:true,subtree:true});
    });
  }

  function ensureSidebarLogo(){
    const brand=q('#sidebar .side-brand'),img=brand?.querySelector('img');
    if(!brand||!img)return;
    brand.querySelectorAll('strong').forEach(x=>{x.style.setProperty('display','none','important');x.style.setProperty('visibility','hidden','important')});
    img.style.setProperty('display','block','important');
    img.style.setProperty('visibility','visible','important');
    img.style.setProperty('opacity','1','important');
  }

  function refreshAll(){
    decorateWelcome();
    refreshWelcomeStickers();
    polishSearchButtons();
    installTableCleaning();
    ensureSidebarLogo();
  }

  function boot(){
    installEntryCollapse();
    refreshAll();
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;refreshAll()});
    }).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('bamco-stickers-ready',()=>setTimeout(refreshWelcomeStickers,30));
    refreshAll();requestAnimationFrame(refreshAll);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

(()=>{
  const META={
    state1:'وضعیت مطلوب',state2:'یادآوری',state3:'نیازمند توجه',state4:'پیگیری جدی',state5:'اقدام فوری',followup:'یادآوری مجدد'
  };
  const FOOTER=`چنانچه هر یک از فعالیت‌ها انجام شده، پیشرفت داشته یا وضعیت آن تغییر کرده است، لطفاً با پاسخ به همین ایمیل، مراتب را اعلام فرمایید تا اطلاعات فایل «مدیریت وظایف» به‌روزرسانی شود. همچنین در صورت نیاز می‌توانید از طریق شماره داخلی ۷۴۸۸ با مهندس قائمی در ارتباط باشید.\n\nتاریخ گزارش: [تاریخ کامل شمسی]\n\nبا تشکر و احترام\nسامانه خودکار پایش و پیگیری امور\nشرکت خودروسازان بم\nواحد مهندسی محصول`;
  const DEFAULTS={
    state1:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | وضعیت مطلوب',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که در حال حاضر هیچ‌یک از فعالیت‌های حوزه مسئولیت شما در وضعیت «هشدار» یا «دیرکرد» قرار ندارد.\n\nخلاصه وضعیت: ۰ مورد هشداری | ۰ مورد دیرکردی\n\n[استیکر]\n\nاز همراهی و اهتمام شما در پیگیری، انجام به‌موقع و به‌روزرسانی امور سپاسگزاریم.\n\nچنانچه تغییری در آخرین وضعیت فعالیت‌ها ایجاد شده است، لطفاً با پاسخ به همین ایمیل، مراتب را اعلام فرمایید تا اطلاعات فایل «مدیریت وظایف» به‌روزرسانی شود. همچنین در صورت نیاز می‌توانید از طریق شماره داخلی ۷۴۸۸ با مهندس قائمی در ارتباط باشید.\n\nتاریخ گزارش: [تاریخ کامل شمسی]\n\nبا تشکر و احترام\nسامانه خودکار پایش و پیگیری امور\nشرکت خودروسازان بم\nواحد مهندسی محصول`},
    state2:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | یادآوری',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور هشداری] مورد از فعالیت‌های حوزه مسئولیت شما وارد دوره «هشدار» شده‌اند و موعد پایان آن‌ها نزدیک است.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | ۰ مورد دیرکردی\n\n[استیکر]\n\n[جدول امور هشداری]\n\nلطفاً ضمن بررسی موارد فوق، برنامه‌ریزی و پیگیری لازم را به‌منظور انجام آن‌ها پیش از فرارسیدن موعد مقرر در دستور کار قرار دهید.\n\n${FOOTER}`},
    state3:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | نیازمند توجه',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور دیرکردی] مورد از فعالیت‌های حوزه مسئولیت شما از موعد تعیین‌شده عبور کرده و در وضعیت «دیرکرد» قرار گرفته‌اند.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | [تعداد امور دیرکردی] مورد دیرکردی\n\n[استیکر]\n\n[جدول امور دیرکردی]\n\n[جدول امور هشداری]\n\nلطفاً موارد فوق را بررسی کرده و اقدامات لازم برای تکمیل آن‌ها و به‌روزرسانی آخرین وضعیت هر فعالیت را در اسرع وقت انجام دهید.\n\n${FOOTER}`},
    state4:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | پیگیری جدی',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور دیرکردی] مورد از فعالیت‌های حوزه مسئولیت شما در وضعیت «دیرکرد» قرار دارند و نیازمند پیگیری جدی‌تر هستند.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | [تعداد امور دیرکردی] مورد دیرکردی\n\n[استیکر]\n\n[جدول امور دیرکردی]\n\n[جدول امور هشداری]\n\nخواهشمند است موارد فوق با جدیت بررسی شده و اقدامات لازم برای تعیین تکلیف، تکمیل و به‌روزرسانی وضعیت آن‌ها در اولویت قرار گیرد.\n\n${FOOTER}`},
    state5:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | اقدام فوری',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور دیرکردی] مورد از فعالیت‌های حوزه مسئولیت شما در وضعیت «دیرکرد» قرار گرفته‌اند و نیازمند رسیدگی و اقدام فوری هستند.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | [تعداد امور دیرکردی] مورد دیرکردی\n\n[استیکر]\n\n[جدول امور دیرکردی]\n\n[جدول امور هشداری]\n\nخواهشمند است موارد فوق در اولویت پیگیری قرار گرفته و اقدامات مقتضی برای تعیین تکلیف و تکمیل آن‌ها در سریع‌ترین زمان ممکن انجام شود.\n\n${FOOTER}`},
    followup:{subject:'یادآوری مجدد وضعیت امور | [تاریخ کامل شمسی]',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nپیرو آخرین گزارش ارسال‌شده درباره وضعیت امور در تاریخ [تاریخ آخرین ارسال]، تاکنون پاسخی از سوی شما دریافت نشده است.\n\nخواهشمند است در صورت انجام فعالیت‌ها، ایجاد پیشرفت یا تغییر در آخرین وضعیت امور، مراتب را از طریق پاسخ به همین ایمیل اعلام فرمایید تا اطلاعات فایل «مدیریت وظایف» به‌روزرسانی شود.\n\nهمچنین در صورت نیاز می‌توانید از طریق شماره داخلی ۷۴۸۸ با مهندس قائمی در ارتباط باشید.\n\nبا تشکر و احترام\nسامانه خودکار پایش و پیگیری امور\nشرکت خودروسازان بم\nواحد مهندسی محصول`}
  };
  let activeKey='state1',loaded={};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const htmlToText=html=>String(html||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
  const textToHtml=text=>esc(String(text||'')).replace(/\r\n/g,'\n').replace(/\n/g,'<br>');
  const settingValue=row=>typeof row?.value==='string'?row.value:(row?.value?.value??'');

  async function getSubject(key){
    try{const rows=await select('app_settings',`key=eq.email_subject_${encodeURIComponent(key)}&select=*`);return rows.length?settingValue(rows[0]):''}catch{return''}
  }
  async function setSubject(key,value){
    const sk=`email_subject_${key}`;let rows=[];try{rows=await select('app_settings',`key=eq.${encodeURIComponent(sk)}&select=key`)}catch{}
    if(rows.length)await update('app_settings',`key=eq.${encodeURIComponent(sk)}`,{value:{value}});else await insert('app_settings',{key:sk,value:{value}});
  }
  async function loadTemplate(key){
    let row=null;try{const rows=await select('email_templates',`template_key=eq.${encodeURIComponent(key)}&select=*`);row=rows[0]||null}catch{}
    const subject=await getSubject(key);
    return {id:row?.id||null,subject:subject||DEFAULTS[key].subject,body:row?.body_html?htmlToText(row.body_html):DEFAULTS[key].body};
  }
  async function saveTemplate(key,subject,body){
    const cleanSubject=String(subject||'').replace(/\u200f/g,'').trim(),cleanBody=String(body||'').trim();
    if(!cleanSubject)throw new Error('موضوع ایمیل نمی‌تواند خالی باشد.');
    if(!cleanBody)throw new Error('متن ایمیل نمی‌تواند خالی باشد.');
    let rows=[];try{rows=await select('email_templates',`template_key=eq.${encodeURIComponent(key)}&select=*`)}catch{}
    const payload={body_html:textToHtml(cleanBody)};
    if(rows.length)await update('email_templates',`id=eq.${rows[0].id}`,payload);else await insert('email_templates',{template_key:key,...payload});
    await setSubject(key,cleanSubject);
    loaded[key]={id:rows[0]?.id||null,subject:cleanSubject,body:cleanBody};
  }

  function injectStyle(){if(document.querySelector('#desktopEmailEditorStyle'))return;const s=document.createElement('style');s.id='desktopEmailEditorStyle';s.textContent=`
    #templatesView .desktop-template-shell{padding:16px;background:transparent}
    #templatesView .desktop-template-fieldset{border:1px solid #b9c9c1;border-radius:8px;padding:24px;margin:12px 0 0;background:#fff;display:flex;align-items:center;justify-content:flex-start;gap:8px;direction:rtl}
    #templatesView .desktop-template-fieldset legend{padding:0 8px;font-weight:700;color:#173d32}
    #templatesView .desktop-template-fieldset label{font-weight:700;margin-left:4px}
    #templatesView #templateState{width:240px;max-width:45vw;text-align:right;font-family:"B Nazanin",Tahoma,sans-serif;font-size:18px}
    #templatesView #openDesktopTemplateEditor{margin-right:20px;min-width:130px}
    #desktopTemplateEditor{margin:0!important;width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;border:0!important;border-radius:0!important;padding:0!important;background:#eef3f0;direction:rtl;overflow:hidden}
    #desktopTemplateEditor::backdrop{background:rgba(0,0,0,.16)}
    #desktopTemplateEditor .dte-wrap{height:100vh;display:flex;flex-direction:column;font-family:"B Nazanin",Tahoma,sans-serif;font-size:20px}
    #desktopTemplateEditor .dte-toolbar{height:68px;min-height:68px;display:flex;align-items:center;gap:8px;padding:10px;background:#eef3f0;direction:rtl}
    #desktopTemplateEditor .dte-toolbar button,#desktopTemplateEditor .dte-toolbar select{height:38px;border:1px solid #b8c2bd;border-radius:3px;background:#fff;font-size:16px}
    #desktopTemplateEditor #dteSave{width:150px;background:#176b4d;color:#fff;border-color:#176b4d;font-family:"B Nazanin",Tahoma,sans-serif;font-size:18px}
    #desktopTemplateEditor #dteCancel{width:110px;font-family:"B Nazanin",Tahoma,sans-serif;font-size:18px}
    #desktopTemplateEditor #dteFont{width:170px}#desktopTemplateEditor #dteSize{width:72px}
    #desktopTemplateEditor .format-btn{width:48px;font-family:"Times New Roman",serif;font-size:20px}
    #desktopTemplateEditor .dte-subject{height:58px;min-height:58px;padding:8px 12px;background:#dfece6;display:flex;align-items:center;direction:rtl}
    #desktopTemplateEditor .dte-subject label{width:120px;font-weight:700;text-align:right;font-size:20px}
    #desktopTemplateEditor #dteSubject{flex:1;height:42px;border:1px solid #b8c2bd;border-radius:2px;background:#fff;direction:rtl;text-align:right;font-family:"B Nazanin",Tahoma,sans-serif;font-size:20px;padding:4px 10px}
    #desktopTemplateEditor #dteBody{flex:1;overflow:auto;background:#fff;border:0;outline:none;resize:none;direction:rtl;text-align:right;white-space:pre-wrap;line-height:1.75;padding:10px 16px;font-family:"B Nazanin",Tahoma,sans-serif;font-size:20px;unicode-bidi:plaintext}
    @media(max-width:760px){#templatesView .desktop-template-fieldset{padding:14px;flex-wrap:wrap}#templatesView #openDesktopTemplateEditor{margin-right:0}#desktopTemplateEditor .dte-toolbar{overflow-x:auto}#desktopTemplateEditor .dte-toolbar>*{flex:0 0 auto}}
  `;document.head.appendChild(s)}

  function ensureDialog(){if(document.querySelector('#desktopTemplateEditor'))return;const d=document.createElement('dialog');d.id='desktopTemplateEditor';d.innerHTML=`<div class="dte-wrap"><div class="dte-toolbar"><button id="dteSave" type="button">ثبت تغییرات</button><button id="dteCancel" type="button">انصراف</button><select id="dteFont"><option>B Nazanin</option><option>Tahoma</option><option>Times New Roman</option><option>Arial</option></select><select id="dteSize">${[10,11,12,13,14,16,18,20,22,24,28,32].map(n=>`<option ${n===14?'selected':''}>${n}</option>`).join('')}</select><button class="format-btn" id="dteBold" type="button"><b>B</b></button><button class="format-btn" id="dteItalic" type="button"><i>I</i></button><button class="format-btn" id="dteUnderline" type="button"><u>U</u></button></div><div class="dte-subject"><label for="dteSubject">موضوع ایمیل</label><input id="dteSubject"></div><textarea id="dteBody" spellcheck="false"></textarea></div>`;document.body.appendChild(d);
    const body=d.querySelector('#dteBody'),font=d.querySelector('#dteFont'),size=d.querySelector('#dteSize');
    const applyFont=()=>{body.style.fontFamily=`"${font.value}",sans-serif`;body.style.fontSize=`${size.value}px`;body.focus()};
    font.addEventListener('change',applyFont);size.addEventListener('change',applyFont);
    d.querySelector('#dteBold').addEventListener('click',()=>{document.execCommand?.('bold');body.focus()});
    d.querySelector('#dteItalic').addEventListener('click',()=>{document.execCommand?.('italic');body.focus()});
    d.querySelector('#dteUnderline').addEventListener('click',()=>{document.execCommand?.('underline');body.focus()});
    d.querySelector('#dteCancel').addEventListener('click',()=>d.close());
    d.querySelector('#dteSave').addEventListener('click',async()=>{try{const subject=d.querySelector('#dteSubject').value,txt=body.value;await saveTemplate(activeKey,subject,txt);d.close();toast('تغییرات موضوع و متن ایمیل ذخیره شد.')}catch(e){toast(e.message||'ذخیره متن ایمیل انجام نشد.',true)}});
  }

  async function openEditor(){activeKey=document.querySelector('#templateState')?.value||'state1';const d=document.querySelector('#desktopTemplateEditor');d.querySelector('#dteSave').disabled=true;try{const t=loaded[activeKey]||await loadTemplate(activeKey);loaded[activeKey]=t;d.querySelector('#dteSubject').value=t.subject;d.querySelector('#dteBody').value=t.body;d.showModal();setTimeout(()=>{const b=d.querySelector('#dteBody');b.selectionStart=0;b.selectionEnd=0;b.scrollTop=0;b.focus()},30)}catch(e){toast(e.message||'متن ایمیل بارگذاری نشد.',true)}finally{d.querySelector('#dteSave').disabled=false}}

  function install(){const view=document.querySelector('#templatesView');if(!view||view.dataset.desktopParity==='1')return;view.dataset.desktopParity='1';injectStyle();ensureDialog();const panel=view.querySelector('.panel');if(!panel)return;panel.className='desktop-template-shell';panel.innerHTML=`<fieldset class="desktop-template-fieldset"><legend>ویرایش متن ایمیل</legend><label for="templateState">الگو</label><select id="templateState">${Object.entries(META).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><button id="openDesktopTemplateEditor" type="button" class="ghost">ویرایش متن</button></fieldset>`;panel.querySelector('#openDesktopTemplateEditor').addEventListener('click',openEditor);panel.querySelector('#templateState').addEventListener('change',e=>{activeKey=e.target.value});}

  function boot(){install();requestAnimationFrame(install)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
