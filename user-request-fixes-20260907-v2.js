(()=>{
  'use strict';
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  const WIDTHS={
    'شناسه':64,
    'عنوان فعالیت':210,
    'توضیحات':330,
    'متولی':165,
    'وضعیت':130,
    'اولویت':90,
    'تاریخ شروع':118,
    'تاریخ انجام':118,
    'تاریخ پایان':118,
    'یادآور':82,
    'آخرین به‌روزرسانی':160,
    'وضعیت دیرکرد':135,
    'توضیحات مدیر':275,
    'تأخیر':82,
    'تعجیل':82
  };
  const MIN_WIDTHS={
    'شناسه':52,'عنوان فعالیت':150,'توضیحات':190,'متولی':120,'وضعیت':100,'اولویت':72,
    'تاریخ شروع':96,'تاریخ انجام':96,'تاریخ پایان':96,'یادآور':68,'آخرین به‌روزرسانی':125,
    'وضعیت دیرکرد':105,'توضیحات مدیر':170,'تأخیر':64,'تعجیل':64
  };

  function injectStyle(){
    let style=q('#bamcoUserRequestFixes20260907V2');
    if(!style){style=document.createElement('style');style.id='bamcoUserRequestFixes20260907V2';document.head.appendChild(style)}
    style.textContent=`
      /* ---------- Right sidebar: one font, deterministic top-level order ---------- */
      #appView #sidebar #nav,
      #appView #sidebar #nav button,
      #appView #sidebar #nav span,
      #appView #sidebar #nav b{
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
      }
      #appView #sidebar #nav>.nav-login-root,
      #appView #sidebar #nav>.nav-settings-root{
        width:100%!important;
        min-height:45px!important;
        margin:0!important;
        padding:7px 10px!important;
        border:0!important;
        background:transparent!important;
        color:#fff!important;
        display:grid!important;
        grid-template-columns:28px 1fr!important;
        align-items:center!important;
        gap:8px!important;
        direction:rtl!important;
        text-align:right!important;
        font-size:17px!important;
        font-weight:700!important;
        cursor:pointer!important;
      }
      #appView #sidebar #nav>.nav-login-root:hover,
      #appView #sidebar #nav>.nav-settings-root:hover{background:rgba(0,0,0,.08)!important}
      #appView #sidebar #nav>.nav-login-root.active,
      #appView #sidebar #nav>.nav-settings-root.active{background:#218764!important;color:#fff!important}
      #appView #sidebar #nav>.nav-login-root>b,
      #appView #sidebar #nav>.nav-settings-root>b{width:28px!important;min-width:28px!important;text-align:center!important;font-size:18px!important}
      #appView #sidebar #nav>.nav-login-root>span,
      #appView #sidebar #nav>.nav-settings-root>span{white-space:nowrap!important}
      #appView #sidebar.collapsed #nav>.nav-login-root,
      #appView #sidebar.collapsed #nav>.nav-settings-root{
        display:flex!important;justify-content:center!important;padding:8px 4px!important;min-height:48px!important
      }
      #appView #sidebar.collapsed #nav>.nav-login-root>span,
      #appView #sidebar.collapsed #nav>.nav-settings-root>span{display:none!important}

      /* ---------- Initial welcome page ---------- */
      #welcomeView.bamco-welcome-view{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        height:calc(100vh - var(--footer-h,34px) - 10px)!important;
        max-height:none!important;
        padding:24px!important;
        box-sizing:border-box!important;
      }
      #welcomeView.bamco-welcome-view.hidden{display:none!important}
      #welcomeView .bamco-welcome-card{
        width:min(900px,92%)!important;
        min-height:270px!important;
        padding:42px 48px!important;
        border:1px solid #8aa79d!important;
        border-radius:10px!important;
        background:#f7faf8!important;
        box-shadow:none!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        box-sizing:border-box!important;
      }
      #welcomeView .bamco-welcome-copy{
        width:100%!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:5px!important;
        color:#176b4d!important;
        text-align:center!important;
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
        font-weight:700!important;
      }
      #welcomeView .bamco-welcome-name{font-size:25px!important;line-height:1.9!important;white-space:nowrap!important}
      #welcomeView .bamco-welcome-system{font-size:28px!important;line-height:1.9!important;white-space:nowrap!important}
      #welcomeView .bamco-welcome-greeting{font-size:25px!important;line-height:1.9!important;white-space:nowrap!important}
      body.welcome-active .workspace>header{display:none!important}

      /* ---------- Kanban + Archive: one geometry for header/filter/body ---------- */
      #appView #kanbanView .table-wrap,
      #appView #archiveView .table-wrap{
        direction:rtl!important;
        overflow:auto!important;
        box-sizing:border-box!important;
      }
      #appView #kanbanView table.bamco-task-table-stable,
      #appView #archiveView table.bamco-task-table-stable{
        table-layout:fixed!important;
        border-collapse:collapse!important;
        direction:rtl!important;
        max-width:none!important;
        min-width:0!important;
      }
      #appView #kanbanView table.bamco-task-table-stable th,
      #appView #kanbanView table.bamco-task-table-stable td,
      #appView #archiveView table.bamco-task-table-stable th,
      #appView #archiveView table.bamco-task-table-stable td{
        min-width:0!important;
        max-width:none!important;
        box-sizing:border-box!important;
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
        font-size:15px!important;
        direction:rtl!important;
        color:#174d3e!important;
      }
      #appView #kanbanView table.bamco-task-table-stable th,
      #appView #archiveView table.bamco-task-table-stable th{
        position:relative!important;
        white-space:nowrap!important;
        overflow:visible!important;
        text-overflow:clip!important;
        text-align:center!important;
        vertical-align:middle!important;
      }
      #appView #kanbanView table.bamco-task-table-stable td,
      #appView #archiveView table.bamco-task-table-stable td{
        white-space:normal!important;
        overflow:visible!important;
        text-overflow:clip!important;
        overflow-wrap:anywhere!important;
        word-break:normal!important;
        line-height:1.85!important;
        vertical-align:top!important;
        text-align:right!important;
      }
      /* ID uses exactly the same Persian font as every other task column. */
      #appView #kanbanView table.bamco-task-table-stable th:first-child,
      #appView #kanbanView table.bamco-task-table-stable td:first-child,
      #appView #archiveView table.bamco-task-table-stable th:first-child,
      #appView #archiveView table.bamco-task-table-stable td:first-child{
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
        font-size:15px!important;
        font-weight:inherit!important;
        direction:rtl!important;
        text-align:right!important;
        white-space:nowrap!important;
        padding-right:7px!important;
        padding-left:5px!important;
      }
      #appView #kanbanView table.bamco-task-table-stable .column-filters>th,
      #appView #archiveView table.bamco-task-table-stable .column-filters>th{
        display:table-cell!important;
        visibility:visible!important;
        padding:5px 6px!important;
        overflow:hidden!important;
        background:#eef4f1!important;
      }
      #appView #kanbanView table.bamco-task-table-stable .column-filters select,
      #appView #archiveView table.bamco-task-table-stable .column-filters select{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        height:34px!important;
        min-height:34px!important;
        margin:0!important;
        padding:3px 22px 3px 6px!important;
        box-sizing:border-box!important;
        border:1px solid #b8c8c1!important;
        border-radius:7px!important;
        background-color:#fff!important;
        background-position:4px center!important;
        background-size:12px!important;
        font-family:"B Nazanin",BNazanin,"B Nazanin Regular",Tahoma,sans-serif!important;
        font-size:14px!important;
        direction:rtl!important;
        text-align:right!important;
      }
      #appView #kanbanView table.bamco-task-table-stable .task-select-column,
      #appView #archiveView table.bamco-task-table-stable .task-select-column,
      #appView #kanbanView table.bamco-task-table-stable .task-pick,
      #appView #archiveView table.bamco-task-table-stable .task-pick{display:none!important}
      #appView table.bamco-task-table-stable .column-resize-handle{
        position:absolute!important;
        top:0!important;bottom:0!important;left:-5px!important;width:10px!important;
        cursor:col-resize!important;z-index:40!important;touch-action:none!important;user-select:none!important;background:transparent!important
      }
      #appView table.bamco-task-table-stable .column-resize-handle::after{
        content:"";position:absolute;top:7px;bottom:7px;left:4px;width:1px;background:transparent
      }
      #appView table.bamco-task-table-stable .column-resize-handle:hover::after,
      #appView table.bamco-task-table-stable .column-resize-handle.dragging::after{background:#4f8d77!important}

      /* ---------- Sticker manager framing ---------- */
      #appView #stickersView .desktop-sticker-box{
        box-sizing:border-box!important;border:1px solid #8aa79d!important;border-radius:10px!important;background:#eef3f0!important;overflow:visible!important
      }
      #appView #stickersView .bamco-sticker-preview-box{margin:0 0 12px!important;padding:8px 12px 12px!important}
      #appView #stickersView .bamco-sticker-preview-box>legend{padding:0 8px!important;color:#147154!important;font-size:18px!important;font-weight:700!important}
      #appView #stickersView .bamco-sticker-preview-box .desktop-sticker-active-note{height:auto!important;min-height:28px!important;padding:0 5px 6px!important}
      #appView #stickersView .bamco-sticker-preview-box .desktop-sticker-preview-stage{
        min-height:500px!important;height:clamp(500px,68vh,760px)!important;max-height:760px!important;
        border:1px solid #c7d3ce!important;border-radius:8px!important;background:#f8faf9!important;box-sizing:border-box!important;overflow:hidden!important
      }
      #appView #stickersView .bamco-sticker-preview-box #desktopStickerPreview{display:block!important;width:auto!important;height:auto!important;max-width:96%!important;max-height:96%!important;object-fit:contain!important}

      @media(max-width:760px){
        #welcomeView .bamco-welcome-card{width:98%!important;padding:28px 12px!important}
        #welcomeView .bamco-welcome-name,#welcomeView .bamco-welcome-greeting{font-size:20px!important}
        #welcomeView .bamco-welcome-system{font-size:19px!important;white-space:nowrap!important}
        #appView #stickersView .bamco-sticker-preview-box .desktop-sticker-preview-stage{min-height:400px!important;height:58vh!important;max-height:620px!important}
      }
    `;
  }

  function removeMisplacedLoginSettings(){q('#loginSettingsPanel')?.remove()}

  function findGroup(nav,key,label){
    return qa('#nav>.nav-group').find(g=>g.dataset.group===key||g.dataset.navGroup===key||((g.querySelector('.nav-group-toggle')?.textContent||'').includes(label)))||null;
  }

  function ensureLoginNav(){
    const nav=q('#nav');if(!nav)return;
    let login=q('#nav>.nav-login-root');
    if(!login){
      login=document.createElement('button');
      login.type='button';login.className='nav-login-root';login.dataset.customView='welcome';
      login.innerHTML='<b>⌂</b><span>صفحه ورود</span>';
    }
    if(login.dataset.bound!=='1'){
      login.dataset.bound='1';
      login.addEventListener('click',e=>{e.preventDefault();showWelcomePage()});
    }
    const tasks=findGroup(nav,'tasks','مدیریت وظایف');
    const email=findGroup(nav,'email','مدیریت ایمیل');
    const vehicle=findGroup(nav,'vehicle','مدیریت خودرو');
    const settings=q('#nav>button[data-view="settings"],#nav>.nav-settings-root');
    if(settings){settings.classList.add('nav-settings-root');const span=settings.querySelector('span');if(span)span.textContent='تنظیمات'}
    nav.prepend(login);
    [tasks,email,vehicle,settings].filter(Boolean).forEach(el=>nav.appendChild(el));
  }

  function currentUserName(){
    try{return (state?.profile?.display_name||state?.profile?.full_name||q('#userName')?.textContent||'کاربر').trim()}catch{return (q('#userName')?.textContent||'کاربر').trim()}
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function ensureWelcomeView(){
    const workspace=q('.workspace');if(!workspace)return null;
    let view=q('#welcomeView');
    if(!view){view=document.createElement('section');view.id='welcomeView';workspace.appendChild(view)}
    view.className='view hidden bamco-welcome-view';
    view.innerHTML=`<div class="bamco-welcome-card"><div class="bamco-welcome-copy">
      <div class="bamco-welcome-name">${escapeHtml(currentUserName())} عزیز</div>
      <div class="bamco-welcome-system">به سامانه مدیریت، پایش و پیگیری امور</div>
      <div class="bamco-welcome-greeting">خوش آمدید</div>
    </div></div>`;
    return view;
  }

  function showWelcomePage(){
    const app=q('#appView');if(!app||app.classList.contains('hidden'))return;
    const view=ensureWelcomeView();if(!view)return;
    qa('.workspace>.view').forEach(v=>v.classList.add('hidden'));
    view.classList.remove('hidden');
    qa('#nav button.active').forEach(b=>b.classList.remove('active'));
    q('#nav>.nav-login-root')?.classList.add('active');
    document.body.classList.add('welcome-active');
    q('#addTaskBtn')?.classList.add('hidden');
    const title=q('#viewTitle');if(title)title.textContent='';
    const sub=q('#viewSubtitle');if(sub)sub.textContent='';
    try{if(typeof state!=='undefined')state.view='welcome'}catch{}
  }

  function passwordRequired(){
    try{return typeof state!=='undefined'&&!!state.profile?.must_change_password}catch{return false}
  }

  function installWelcomeFlow(){
    ensureLoginNav();ensureWelcomeView();
    const nav=q('#nav');
    if(nav&&nav.dataset.welcomeFlowV3!=='1'){
      nav.dataset.welcomeFlowV3='1';
      nav.addEventListener('click',e=>{
        const b=e.target.closest('button');if(!b||b.classList.contains('nav-login-root'))return;
        document.body.classList.remove('welcome-active');
        q('#welcomeView')?.classList.add('hidden');
        q('#nav>.nav-login-root')?.classList.remove('active');
      },true);
    }
    const app=q('#appView');if(!app||app.dataset.welcomeObserverV3==='1')return;
    app.dataset.welcomeObserverV3='1';
    let wasHidden=app.classList.contains('hidden');
    const sync=()=>{
      ensureLoginNav();
      if(app.classList.contains('hidden')){wasHidden=true;return}
      ensureWelcomeView();
      if(wasHidden){
        wasHidden=false;
        setTimeout(()=>{if(!passwordRequired())showWelcomePage()},40);
      }
    };
    new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
    sync();
  }

  function stripSelectionColumn(table){
    const heads=[...table.querySelectorAll('thead>tr:first-child>th')];
    const idx=heads.findIndex(th=>(th.childNodes[0]?.textContent||th.textContent||'').trim()==='انتخاب');
    if(idx<0)return;
    heads[idx]?.remove();
    const filter=table.querySelector('thead .column-filters');if(filter?.children[idx])filter.children[idx].remove();
    table.querySelectorAll('tbody>tr').forEach(row=>row.children[idx]?.remove());
  }

  const tableState=new Map();
  function buildStableTaskTable(scope,force=false){
    const view=q(`#${scope}View`),table=view?.querySelector('.table-wrap table');if(!table)return;
    stripSelectionColumn(table);
    const heads=[...table.querySelectorAll('thead>tr:first-child>th')];
    const filters=table.querySelector('thead .column-filters');if(!heads.length||!filters)return;

    while(filters.children.length>heads.length)filters.lastElementChild.remove();
    while(filters.children.length<heads.length)filters.insertAdjacentHTML('beforeend','<th><select><option value="">همه</option></select></th>');

    const expected=scope==='archive'?15:13;
    if(heads.length!==expected)return;

    let saved={};
    try{saved=JSON.parse(localStorage.getItem(`bamco-${scope}-column-widths-v5`)||'{}')||{}}catch{saved={}}
    const names=heads.map(h=>(h.childNodes[0]?.textContent||h.textContent||'').trim());
    const widths=names.map(name=>{
      const v=Number(saved[name]);return Number.isFinite(v)&&v>0?v:(WIDTHS[name]||130)
    });

    table.querySelector(':scope>colgroup')?.remove();
    table.querySelectorAll('.column-resize-handle').forEach(h=>h.remove());
    table.classList.remove('bamco-resizable-table','resizable-task-table');
    table.classList.add('bamco-task-table-stable');
    table.dataset.stableGeometry='3';

    const colgroup=document.createElement('colgroup');
    const cols=heads.map(()=>{const c=document.createElement('col');colgroup.appendChild(c);return c});
    table.insertBefore(colgroup,table.firstChild);

    const apply=()=>{
      let total=0;
      heads.forEach((head,i)=>{
        const name=names[i],min=MIN_WIDTHS[name]||64;
        widths[i]=Math.max(min,Math.min(620,Number(widths[i])||WIDTHS[name]||130));
        cols[i].style.setProperty('width',`${widths[i]}px`,'important');
        cols[i].style.setProperty('min-width',`${widths[i]}px`,'important');
        cols[i].style.setProperty('max-width',`${widths[i]}px`,'important');
        total+=widths[i];
      });
      table.style.setProperty('width',`${total}px`,'important');
      table.style.setProperty('min-width',`${total}px`,'important');
      table.style.setProperty('max-width','none','important');
    };
    const save=()=>{const data={};names.forEach((n,i)=>data[n]=widths[i]);localStorage.setItem(`bamco-${scope}-column-widths-v5`,JSON.stringify(data))};
    apply();

    heads.forEach((head,i)=>{
      const handle=document.createElement('span');handle.className='column-resize-handle';handle.title='برای تغییر عرض ستون بکشید؛ برای بازنشانی دوبار کلیک کنید';head.appendChild(handle);
      handle.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();widths[i]=WIDTHS[names[i]]||130;apply();save()});
      handle.addEventListener('pointerdown',e=>{
        if(e.button!==0&&e.pointerType!=='touch')return;
        e.preventDefault();e.stopPropagation();
        const startX=e.clientX,startWidth=widths[i],min=MIN_WIDTHS[names[i]]||64;
        handle.classList.add('dragging');document.body.classList.add('column-resizing');
        const move=ev=>{widths[i]=Math.max(min,Math.min(620,startWidth+(startX-ev.clientX)));apply()};
        const up=()=>{handle.classList.remove('dragging');document.body.classList.remove('column-resizing');save();window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true)};
        window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
      });
    });

    [...filters.children].forEach((th,i)=>{
      const select=th.querySelector('select');if(!select)return;
      select.dataset.columnIndex=String(i);select.title=names[i]||'';
    });

    tableState.set(scope,{table,apply});
    const wrap=view.querySelector('.table-wrap');
    if(wrap&&wrap.dataset.initialRtlScrollV3!=='1'){wrap.dataset.initialRtlScrollV3='1';requestAnimationFrame(()=>{wrap.scrollLeft=0})}
  }

  function installStableTables(){
    const rebuild=scope=>buildStableTaskTable(scope,true);
    ['kanban','archive'].forEach(scope=>{
      buildStableTaskTable(scope,true);
      const view=q(`#${scope}View`);if(!view||view.dataset.stableTableObserverV3==='1')return;
      view.dataset.stableTableObserverV3='1';
      let queued=false;
      new MutationObserver(()=>{
        if(queued)return;queued=true;
        requestAnimationFrame(()=>{
          queued=false;
          const entry=tableState.get(scope);
          const table=view.querySelector('.table-wrap table');
          const heads=table?[...table.querySelectorAll('thead>tr:first-child>th')]:[];
          const filters=table?.querySelector('.column-filters');
          if(!entry||entry.table!==table||!filters||filters.children.length!==heads.length)rebuild(scope);else entry.apply();
        });
      }).observe(view,{childList:true,subtree:true});
    });
    const nav=q('#nav');if(nav&&nav.dataset.taskScrollResetV3!=='1'){
      nav.dataset.taskScrollResetV3='1';
      nav.addEventListener('click',e=>{
        const b=e.target.closest('button[data-view="kanban"],button[data-view="archive"]');if(!b)return;
        const scope=b.dataset.view;
        setTimeout(()=>{buildStableTaskTable(scope);const w=q(`#${scope}View .table-wrap`);if(w)w.scrollLeft=0},40);
      },true);
    }
  }

  function repairStickerBox(){
    const view=q('#stickersView');if(!view)return;
    const stage=view.querySelector('.desktop-sticker-preview-stage');if(!stage)return;
    let box=view.querySelector('.bamco-sticker-preview-box');
    if(!box){
      const note=view.querySelector('.desktop-sticker-active-note');
      box=document.createElement('fieldset');box.className='desktop-sticker-box bamco-sticker-preview-box';
      const legend=document.createElement('legend');legend.textContent='پیش‌نمایش استیکر';box.appendChild(legend);
      stage.parentNode.insertBefore(box,note||stage);if(note)box.appendChild(note);box.appendChild(stage);
    }
  }

  function installStickerRepair(){
    const view=q('#stickersView');if(!view)return;repairStickerBox();
    if(view.dataset.stickerBoxV3==='1')return;view.dataset.stickerBoxV3='1';
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repairStickerBox()})}).observe(view,{childList:true,subtree:true});
  }

  function enforceFirstLoginPassword(){
    const app=q('#appView'),dialog=q('#passwordDialog'),cancel=q('#cancelPasswordBtn');if(!app||!dialog)return;
    const enforce=()=>{
      if(app.classList.contains('hidden')||!passwordRequired())return;
      cancel?.classList.add('hidden');
      document.body.classList.remove('welcome-active');q('#welcomeView')?.classList.add('hidden');
      if(!dialog.open){try{dialog.showModal()}catch{}}
    };
    if(dialog.dataset.requiredCancelGuardV3!=='1'){
      dialog.dataset.requiredCancelGuardV3='1';dialog.addEventListener('cancel',e=>{if(passwordRequired())e.preventDefault()});
    }
    new MutationObserver(enforce).observe(app,{attributes:true,attributeFilter:['class']});
    [0,80,250,700].forEach(ms=>setTimeout(enforce,ms));
  }

  function installSafePasswordSubmit(){
    const form=q('#passwordForm');if(!form||form.dataset.safePasswordSubmitV3==='1')return;
    form.dataset.safePasswordSubmitV3='1';
    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const p=q('#newPassword')?.value||'',c=q('#confirmPassword')?.value||'',error=q('#passwordError');if(error)error.textContent='';
      if(p.length<8){if(error)error.textContent='رمز عبور باید حداقل ۸ کاراکتر باشد.';return}
      if(p!==c){if(error)error.textContent='تکرار رمز عبور یکسان نیست.';return}
      const wasRequired=passwordRequired(),submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
      try{
        await api('/auth/v1/user',{method:'PUT',body:{password:p}});
        const saved=await update('profiles',`id=eq.${state.profile.id}`,{must_change_password:false,updated_at:new Date().toISOString()});
        state.profile.must_change_password=false;if(saved?.[0])state.profile={...state.profile,...saved[0]};
        form.reset();q('#passwordDialog')?.close();q('#cancelPasswordBtn')?.classList.remove('hidden');toast('رمز عبور با موفقیت تغییر کرد.');
        if(wasRequired)setTimeout(showWelcomePage,40);
      }catch(err){if(error)error.textContent=err?.message==='New password should be different from the old password.'?'رمز جدید باید با رمز قبلی متفاوت باشد.':(err?.message||'تغییر رمز عبور انجام نشد.')}
      finally{if(submit)submit.disabled=false}
    },true);
  }

  function applyAll(){
    injectStyle();removeMisplacedLoginSettings();ensureLoginNav();installWelcomeFlow();installStableTables();installStickerRepair();enforceFirstLoginPassword();installSafePasswordSubmit();
  }

  function boot(){
    applyAll();
    /* Older scripts finish their delayed layout work by ~1.8s. Re-assert the final stable geometry afterwards. */
    [120,450,900,1500,2100,2800].forEach(ms=>setTimeout(()=>{
      injectStyle();removeMisplacedLoginSettings();ensureLoginNav();ensureWelcomeView();buildStableTaskTable('kanban',true);buildStableTaskTable('archive',true);repairStickerBox();
    },ms));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
