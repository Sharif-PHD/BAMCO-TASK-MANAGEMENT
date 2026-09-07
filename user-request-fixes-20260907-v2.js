(()=>{
  'use strict';
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function injectStyle(){
    let style=q('#bamcoUserRequestFixes20260907V2');
    if(!style){style=document.createElement('style');style.id='bamcoUserRequestFixes20260907V2';document.head.appendChild(style)}
    style.textContent=`
      #welcomeView.bamco-welcome-view{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        height:calc(100vh - var(--footer-h,34px) - 10px)!important;
        max-height:none!important;
        padding:24px 26px!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
      }
      #welcomeView.bamco-welcome-view.hidden{display:none!important}
      #welcomeView .bamco-welcome-layout{
        width:min(1320px,98%)!important;
        display:grid!important;
        grid-template-columns:minmax(150px,260px) minmax(560px,900px) minmax(150px,260px)!important;
        align-items:center!important;
        justify-content:center!important;
        gap:24px!important;
        direction:ltr!important;
      }
      #welcomeView .bamco-welcome-card{
        grid-column:2!important;
        width:100%!important;
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
        direction:rtl!important;
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
      #welcomeView .bamco-welcome-sticker{
        display:block!important;
        width:min(235px,16vw)!important;
        height:330px!important;
        max-width:100%!important;
        object-fit:contain!important;
        object-position:center!important;
        align-self:center!important;
        justify-self:center!important;
        pointer-events:none!important;
        user-select:none!important;
        filter:none!important;
      }
      #welcomeView .bamco-welcome-sticker-left{grid-column:1!important}
      #welcomeView .bamco-welcome-sticker-right{grid-column:3!important}
      #welcomeView .bamco-welcome-sticker:not([src]),
      #welcomeView .bamco-welcome-sticker[src=""]{visibility:hidden!important}
      body.welcome-active .workspace>header{display:none!important}

      #appView #sidebar #nav>.nav-login-root{
        width:100%!important;
        margin:0!important;
        border:0!important;
        background:transparent!important;
        color:#fff!important;
        cursor:pointer!important;
      }
      #appView #sidebar #nav>.nav-login-root.active{background:#218764!important;color:#fff!important}

      @media(max-width:1050px){
        #welcomeView .bamco-welcome-layout{grid-template-columns:150px minmax(500px,760px) 150px!important;gap:14px!important}
        #welcomeView .bamco-welcome-sticker{width:145px!important;height:260px!important}
      }
      @media(max-width:760px){
        #welcomeView.bamco-welcome-view{padding:18px 12px!important;overflow:auto!important}
        #welcomeView .bamco-welcome-layout{width:98%!important;grid-template-columns:1fr!important;gap:12px!important}
        #welcomeView .bamco-welcome-card{grid-column:1!important;grid-row:1!important;width:100%!important;padding:28px 12px!important}
        #welcomeView .bamco-welcome-sticker{width:125px!important;height:170px!important}
        #welcomeView .bamco-welcome-sticker-left{grid-column:1!important;grid-row:2!important;justify-self:start!important}
        #welcomeView .bamco-welcome-sticker-right{grid-column:1!important;grid-row:2!important;justify-self:end!important}
        #welcomeView .bamco-welcome-name,#welcomeView .bamco-welcome-greeting{font-size:20px!important}
        #welcomeView .bamco-welcome-system{font-size:19px!important;white-space:nowrap!important}
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
  function happySticker(gender){return window.BAMCO_DESKTOP_ASSETS?.[`01_happy_${gender}`]||''}

  function updateWelcomeStickers(){
    const left=q('#welcomeHappyFemale'),right=q('#welcomeHappyMale');
    if(left){const src=happySticker('female');if(src&&left.getAttribute('src')!==src)left.src=src}
    if(right){const src=happySticker('male');if(src&&right.getAttribute('src')!==src)right.src=src}
  }

  function ensureWelcomeView(){
    const workspace=q('.workspace');if(!workspace)return null;
    let view=q('#welcomeView');
    if(!view){view=document.createElement('section');view.id='welcomeView';workspace.appendChild(view)}
    view.className='view hidden bamco-welcome-view';
    view.innerHTML=`<div class="bamco-welcome-layout">
      <img id="welcomeHappyFemale" class="bamco-welcome-sticker bamco-welcome-sticker-left" alt="استیکر وضعیت مطلوب خانم">
      <div class="bamco-welcome-card"><div class="bamco-welcome-copy">
        <div class="bamco-welcome-name">${escapeHtml(currentUserName())} عزیز</div>
        <div class="bamco-welcome-system">به سامانه مدیریت، پایش و پیگیری امور</div>
        <div class="bamco-welcome-greeting">خوش آمدید</div>
      </div></div>
      <img id="welcomeHappyMale" class="bamco-welcome-sticker bamco-welcome-sticker-right" alt="استیکر وضعیت مطلوب آقا">
    </div>`;
    updateWelcomeStickers();
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
    updateWelcomeStickers();
  }

  function passwordRequired(){
    try{return typeof state!=='undefined'&&!!state.profile?.must_change_password}catch{return false}
  }

  function installWelcomeFlow(){
    ensureLoginNav();ensureWelcomeView();
    window.addEventListener('bamco-stickers-ready',updateWelcomeStickers);
    const nav=q('#nav');
    if(nav&&nav.dataset.welcomeFlowV4!=='1'){
      nav.dataset.welcomeFlowV4='1';
      nav.addEventListener('click',e=>{
        const b=e.target.closest('button');if(!b||b.classList.contains('nav-login-root'))return;
        document.body.classList.remove('welcome-active');
        q('#welcomeView')?.classList.add('hidden');
        q('#nav>.nav-login-root')?.classList.remove('active');
      },true);
    }
    const app=q('#appView');if(!app||app.dataset.welcomeObserverV4==='1')return;
    app.dataset.welcomeObserverV4='1';
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

  function enforceFirstLoginPassword(){
    const app=q('#appView'),dialog=q('#passwordDialog'),cancel=q('#cancelPasswordBtn');if(!app||!dialog)return;
    const enforce=()=>{
      if(app.classList.contains('hidden')||!passwordRequired())return;
      cancel?.classList.add('hidden');
      document.body.classList.remove('welcome-active');q('#welcomeView')?.classList.add('hidden');
      if(!dialog.open){try{dialog.showModal()}catch{}}
    };
    if(dialog.dataset.requiredCancelGuardV4!=='1'){
      dialog.dataset.requiredCancelGuardV4='1';dialog.addEventListener('cancel',e=>{if(passwordRequired())e.preventDefault()});
    }
    new MutationObserver(enforce).observe(app,{attributes:true,attributeFilter:['class']});
    [0,80,250,700].forEach(ms=>setTimeout(enforce,ms));
  }

  function installSafePasswordSubmit(){
    const form=q('#passwordForm');if(!form||form.dataset.safePasswordSubmitV4==='1')return;
    form.dataset.safePasswordSubmitV4='1';
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
    injectStyle();removeMisplacedLoginSettings();ensureLoginNav();installWelcomeFlow();enforceFirstLoginPassword();installSafePasswordSubmit();
  }

  function boot(){
    applyAll();
    [120,450,900,1500].forEach(ms=>setTimeout(()=>{injectStyle();removeMisplacedLoginSettings();ensureLoginNav();ensureWelcomeView();updateWelcomeStickers()},ms));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();