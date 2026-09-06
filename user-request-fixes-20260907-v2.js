(()=>{
  'use strict';
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function injectStyle(){
    if(q('#bamcoUserRequestFixes20260907V2'))return;
    const style=document.createElement('style');
    style.id='bamcoUserRequestFixes20260907V2';
    style.textContent=`
      /* Settings stays as a direct, right-aligned item in the right sidebar. */
      #appView #sidebar #nav>button.nav-settings-root{
        direction:rtl!important;
        text-align:right!important;
        justify-content:flex-start!important;
        align-items:center!important;
      }
      #appView #sidebar:not(.collapsed) #nav>button.nav-settings-root{
        padding-right:10px!important;
        padding-left:8px!important;
      }

      /* Login-page settings is the first section of Settings. */
      #appView #settingsView #loginSettingsPanel{order:-1000!important}
      #appView #settingsView .bamco-login-settings-preview{
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:5px!important;
        min-height:108px!important;
        padding:16px 20px!important;
        border:1px solid #c7d3ce!important;
        border-radius:9px!important;
        background:#fff!important;
        text-align:center!important;
      }
      #appView #settingsView .bamco-login-settings-title{
        color:#145741!important;
        font-size:20px!important;
        font-weight:700!important;
        line-height:1.7!important;
        white-space:nowrap!important;
      }
      #appView #settingsView .bamco-login-settings-secondary{
        color:#61756e!important;
        font-size:16px!important;
        font-weight:700!important;
        line-height:1.7!important;
        white-space:nowrap!important;
      }

      /* Keep the second login line on one line. */
      #loginView .login-card::after,
      #loginView .brand-lockup h1::after,
      #passwordDialog .first-login-brand p{
        white-space:nowrap!important;
      }

      /* Kanban / Archive filter row must keep exactly the same column geometry as the header/body. */
      #appView #kanbanView .column-filters>th,
      #appView #archiveView .column-filters>th{
        display:table-cell!important;
        box-sizing:border-box!important;
        min-width:0!important;
        overflow:hidden!important;
      }
      #appView #kanbanView .column-filters select,
      #appView #archiveView .column-filters select{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
        margin:0!important;
        direction:rtl!important;
        text-align:right!important;
      }

      /* Do not remove the selection column from table layout: keep a 1px invisible geometry column.
         This prevents every dropdown after it from shifting into the neighboring header. */
      #appView #kanbanView table.bamco-resizable-table .task-select-column,
      #appView #archiveView table.bamco-resizable-table .task-select-column,
      #appView #kanbanView table.bamco-resizable-table .bamco-hidden-selection-geometry,
      #appView #archiveView table.bamco-resizable-table .bamco-hidden-selection-geometry{
        display:table-cell!important;
        visibility:hidden!important;
        width:1px!important;
        min-width:1px!important;
        max-width:1px!important;
        padding:0!important;
        border:0!important;
        overflow:hidden!important;
      }
      #appView #kanbanView table.bamco-resizable-table>colgroup>col:last-child,
      #appView #archiveView table.bamco-resizable-table>colgroup>col:last-child{
        visibility:visible!important;
        width:1px!important;
        min-width:1px!important;
        max-width:1px!important;
      }

      /* Repair Sticker Manager framing: every logical block has a complete box. */
      #appView #stickersView .desktop-sticker-box{
        box-sizing:border-box!important;
        border:1px solid #8aa79d!important;
        border-radius:10px!important;
        background:#eef3f0!important;
        overflow:visible!important;
      }
      #appView #stickersView .bamco-sticker-preview-box{
        margin:0 0 12px!important;
        padding:8px 12px 12px!important;
      }
      #appView #stickersView .bamco-sticker-preview-box>legend{
        padding:0 8px!important;
        color:#147154!important;
        font-size:18px!important;
        font-weight:700!important;
      }
      #appView #stickersView .bamco-sticker-preview-box .desktop-sticker-active-note{
        height:auto!important;
        min-height:28px!important;
        padding:0 5px 6px!important;
      }
      #appView #stickersView .bamco-sticker-preview-box .desktop-sticker-preview-stage{
        min-height:500px!important;
        height:clamp(500px,68vh,760px)!important;
        max-height:760px!important;
        border:1px solid #c7d3ce!important;
        border-radius:8px!important;
        background:#f8faf9!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
      }
      #appView #stickersView .bamco-sticker-preview-box #desktopStickerPreview{
        display:block!important;
        width:auto!important;
        height:auto!important;
        max-width:96%!important;
        max-height:96%!important;
        object-fit:contain!important;
      }
      @media(max-width:760px){
        #loginView .brand-lockup h1::after{font-size:23px!important;white-space:nowrap!important}
        #appView #settingsView .bamco-login-settings-title{font-size:17px!important}
        #appView #settingsView .bamco-login-settings-secondary{font-size:14px!important}
        #appView #stickersView .bamco-sticker-preview-box .desktop-sticker-preview-stage{
          min-height:400px!important;
          height:58vh!important;
          max-height:620px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installLoginSettingsSection(){
    const view=q('#settingsView');
    if(!view||q('#loginSettingsPanel'))return;
    const panel=document.createElement('div');
    panel.id='loginSettingsPanel';
    panel.className='panel';
    panel.innerHTML=`
      <div class="panel-head"><div><h3>صفحه ورود</h3><small>نمایش صفحه ورود و رفتار امنیتی اولین ورود</small></div></div>
      <div class="bamco-login-settings-preview" aria-label="پیش‌نمایش متن صفحه ورود">
        <div class="bamco-login-settings-title">سامانه مدیریت، پایش و پیگیری امور</div>
        <div class="bamco-login-settings-secondary">شرکت خودروسازان بم</div>
      </div>`;
    view.insertBefore(panel,view.firstChild);
  }

  function repairFilterGeometry(scope){
    const view=q(`#${scope}View`),table=view?.querySelector('table');
    if(!table)return;
    const heads=[...table.querySelectorAll('thead>tr:first-child>th')];
    const filters=table.querySelector('.column-filters');
    if(!heads.length||!filters)return;

    while(filters.children.length<heads.length){
      const th=document.createElement('th');
      th.innerHTML='<select disabled><option value="">همه</option></select>';
      filters.appendChild(th);
    }
    while(filters.children.length>heads.length)filters.lastElementChild?.remove();

    const selectionIndex=heads.findIndex(h=>(h.textContent||'').trim()==='انتخاب');
    if(selectionIndex>=0){
      const cells=[heads[selectionIndex],filters.children[selectionIndex]];
      table.querySelectorAll('tbody>tr').forEach(row=>{if(row.children[selectionIndex])cells.push(row.children[selectionIndex])});
      cells.filter(Boolean).forEach(cell=>cell.classList.add('bamco-hidden-selection-geometry'));
      const cols=[...(table.querySelector(':scope > colgroup')?.children||[])];
      const col=cols[selectionIndex];
      if(col){
        col.style.setProperty('visibility','visible');
        col.style.setProperty('width','1px');
        col.style.setProperty('min-width','1px');
        col.style.setProperty('max-width','1px');
      }
    }

    [...filters.children].forEach((th,index)=>{
      const select=th.querySelector('select');
      if(!select)return;
      select.dataset.columnIndex=String(index);
      select.title=(heads[index]?.textContent||'').trim();
    });
  }

  function installFilterRepair(){
    const run=()=>{repairFilterGeometry('kanban');repairFilterGeometry('archive')};
    run();
    ['kanbanView','archiveView'].forEach(id=>{
      const view=q(`#${id}`);if(!view||view.dataset.filterGeometryV2==='1')return;
      view.dataset.filterGeometryV2='1';
      let queued=false;
      new MutationObserver(()=>{
        if(queued)return;queued=true;
        requestAnimationFrame(()=>{queued=false;run()});
      }).observe(view,{childList:true,subtree:true});
    });
    [100,350,900,1600].forEach(ms=>setTimeout(run,ms));
  }

  function repairStickerBox(){
    const view=q('#stickersView');
    if(!view)return;
    const stage=view.querySelector('.desktop-sticker-preview-stage');
    if(!stage||view.querySelector('.bamco-sticker-preview-box'))return;
    const note=view.querySelector('.desktop-sticker-active-note');
    const box=document.createElement('fieldset');
    box.className='desktop-sticker-box bamco-sticker-preview-box';
    const legend=document.createElement('legend');
    legend.textContent='پیش‌نمایش استیکر';
    box.appendChild(legend);
    stage.parentNode.insertBefore(box,note||stage);
    if(note)box.appendChild(note);
    box.appendChild(stage);
  }

  function installStickerRepair(){
    const view=q('#stickersView');if(!view)return;
    repairStickerBox();
    if(view.dataset.stickerBoxV2==='1')return;
    view.dataset.stickerBoxV2='1';
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;repairStickerBox()});
    }).observe(view,{childList:true,subtree:true});
    [120,500,1200].forEach(ms=>setTimeout(repairStickerBox,ms));
  }

  function passwordRequired(){
    try{return typeof state!=='undefined'&&!!state.profile?.must_change_password}catch{return false}
  }

  function enforceFirstLoginPassword(){
    const app=q('#appView'),dialog=q('#passwordDialog'),cancel=q('#cancelPasswordBtn');
    if(!app||!dialog)return;
    const enforce=()=>{
      if(app.classList.contains('hidden')||!passwordRequired())return;
      cancel?.classList.add('hidden');
      q('#passwordError')&&(q('#passwordError').textContent='');
      document.body.classList.remove('welcome-active');
      q('#welcomeView')?.classList.add('hidden');
      if(!dialog.open){try{dialog.showModal()}catch{}}
    };
    if(dialog.dataset.requiredCancelGuard!=='1'){
      dialog.dataset.requiredCancelGuard='1';
      dialog.addEventListener('cancel',e=>{if(passwordRequired())e.preventDefault()});
    }
    new MutationObserver(enforce).observe(app,{attributes:true,attributeFilter:['class']});
    [0,80,250,700].forEach(ms=>setTimeout(enforce,ms));
  }

  function installSafePasswordSubmit(){
    const form=q('#passwordForm');
    if(!form||form.dataset.safePasswordSubmitV2==='1')return;
    form.dataset.safePasswordSubmitV2='1';
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      const p=q('#newPassword')?.value||'',c=q('#confirmPassword')?.value||'';
      const error=q('#passwordError');
      if(error)error.textContent='';
      if(p.length<8){if(error)error.textContent='رمز عبور باید حداقل ۸ کاراکتر باشد.';return}
      if(p!==c){if(error)error.textContent='تکرار رمز عبور یکسان نیست.';return}
      const wasRequired=passwordRequired();
      const submit=form.querySelector('button[type="submit"]');
      if(submit)submit.disabled=true;
      try{
        /* Change the Auth password first; clear the first-login flag only after Auth confirms success. */
        await api('/auth/v1/user',{method:'PUT',body:{password:p}});
        const saved=await update('profiles',`id=eq.${state.profile.id}`,{must_change_password:false,updated_at:new Date().toISOString()});
        state.profile.must_change_password=false;
        if(saved?.[0])state.profile={...state.profile,...saved[0]};
        form.reset();
        q('#passwordDialog')?.close();
        q('#cancelPasswordBtn')?.classList.remove('hidden');
        toast('رمز عبور با موفقیت تغییر کرد.');
        if(wasRequired&&typeof showView==='function')showView('kanban');
      }catch(err){
        const message=err?.message==='New password should be different from the old password.'?'رمز جدید باید با رمز قبلی متفاوت باشد.':(err?.message||'تغییر رمز عبور انجام نشد.');
        if(error)error.textContent=message;
      }finally{if(submit)submit.disabled=false}
    },true);
  }

  function applyAll(){
    injectStyle();
    installLoginSettingsSection();
    installFilterRepair();
    installStickerRepair();
    enforceFirstLoginPassword();
    installSafePasswordSubmit();
  }

  function boot(){
    applyAll();
    [150,500,1100,1900].forEach(ms=>setTimeout(()=>{
      injectStyle();
      installLoginSettingsSection();
      repairFilterGeometry('kanban');
      repairFilterGeometry('archive');
      repairStickerBox();
    },ms));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
