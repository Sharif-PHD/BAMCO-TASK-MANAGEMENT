(()=>{
'use strict';
const q=s=>document.querySelector(s);
const USER_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/></svg>`;
const LOCK_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm3 9.73V18h-2v-2.27a2 2 0 1 1 2 0Z"/></svg>`;
const EYE_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.2 0 9.3 4.6 10.5 6.1a1.4 1.4 0 0 1 0 1.8C21.3 14.4 17.2 19 12 19S2.7 14.4 1.5 12.9a1.4 1.4 0 0 1 0-1.8C2.7 9.6 6.8 5 12 5Zm0 2C8 7 4.6 10.4 3.5 12c1.1 1.6 4.5 5 8.5 5s7.4-3.4 8.5-5C19.4 10.4 16 7 12 7Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"/></svg>`;
const EYE_OFF_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.3 2 18.7 18.7-1.3 1.3-3.4-3.4A11.8 11.8 0 0 1 12 20C6.8 20 2.7 15.4 1.5 13.9a1.4 1.4 0 0 1 0-1.8 20.5 20.5 0 0 1 4.1-4.2L2 3.3 3.3 2Zm3.8 7.4A18.5 18.5 0 0 0 3.5 13c1.1 1.6 4.5 5 8.5 5 1.3 0 2.6-.4 3.7-1l-1.8-1.8a4 4 0 0 1-5.1-5.1L7.1 9.4ZM12 6c5.2 0 9.3 4.6 10.5 6.1a1.4 1.4 0 0 1 0 1.8 18.2 18.2 0 0 1-2.2 2.4l-1.4-1.4a17.2 17.2 0 0 0 1.6-1.9c-1.1-1.6-4.5-5-8.5-5-.8 0-1.5.1-2.2.3L8.2 6.7A12 12 0 0 1 12 6Z"/></svg>`;
const REFRESH_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a7 7 0 1 0 1 4h-2a5 5 0 1 1-1.45-3.54L14 11h7V4l-2 2v2Z" fill="currentColor"/></svg>`;
const toLatinDigits=v=>String(v||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const makeCode=()=>String(Math.floor(1000+Math.random()*9000));

function installNetworkGuard(){
  if(window.__bamcoLoginNetworkGuard)return;
  window.__bamcoLoginNetworkGuard='v1';
  const baseFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input instanceof Request?input.url:String(input));
    const isCritical=/\.supabase\.co\/(auth|rest)\/v1\//.test(url);
    if(!isCritical||init.signal)return baseFetch(input,init);
    const controller=new AbortController();
    const timeoutMs=url.includes('/auth/v1/token')?15000:22000;
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      return await baseFetch(input,{...init,signal:controller.signal});
    }catch(err){
      if(controller.signal.aborted)throw new Error('ارتباط با سامانه بیش از حد طول کشید. لطفاً دوباره تلاش کنید.');
      throw err;
    }finally{clearTimeout(timer)}
  };
}

function buildLogin(){const form=q('#loginForm');if(!form||form.dataset.cleanBuilt)return;const oldEmail=q('#email'),oldPassword=q('#password');const emailValue=oldEmail?.value||'';const passwordValue=oldPassword?.value||'';form.innerHTML=`
<div class="login-fields">
  <label class="login-field" for="email"><span class="login-field-title bamco-fa">نام کاربری</span><span class="login-input-shell"><input id="email" class="english" type="email" autocomplete="username" required placeholder="name@bamco.ir" dir="ltr"><span class="login-leading-icon">${USER_ICON}</span></span></label>
  <label class="login-field" for="password"><span class="login-field-title bamco-fa">رمز عبور</span><span class="login-input-shell"><input id="password" class="english" type="password" autocomplete="current-password" required placeholder="••••••" dir="ltr"><span class="login-leading-icon">${LOCK_ICON}</span><button type="button" class="login-password-toggle" aria-label="نمایش رمز عبور" title="نمایش رمز عبور">${EYE_ICON}</button></span></label>
  <div class="login-field login-verification-field"><span class="login-field-title bamco-fa">تأیید عددی</span><div id="loginVerification" class="login-verification-box"><div id="loginVerifyDisplay" class="login-code-display" aria-label="کد تأیید"></div><div class="login-code-input-shell"><input id="loginVerifyCode" type="text" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9۰-۹٠-٩]{4}" aria-label="کد را وارد نمایید"><div class="login-code-slots" aria-hidden="true"><span></span><span></span><span></span><span></span></div></div><button type="button" id="refreshLoginVerify" class="login-refresh-code" title="ساخت کد جدید" aria-label="ساخت کد جدید">${REFRESH_ICON}</button></div><div id="loginVerifyError" class="login-code-error bamco-fa"></div></div>
</div>
<button class="primary wide login-submit" type="submit">ورود به سامانه</button>
<p id="loginError" class="form-error"></p>`;form.dataset.cleanBuilt='1';q('#email').value=emailValue;q('#password').value=passwordValue;}
function bindPassword(){const input=q('#password'),btn=q('.login-password-toggle');if(!input||!btn||btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',()=>{const showing=input.type==='text';input.type=showing?'password':'text';btn.innerHTML=showing?EYE_ICON:EYE_OFF_ICON;btn.title=showing?'نمایش رمز عبور':'مخفی کردن رمز عبور';btn.setAttribute('aria-label',btn.title);input.focus()})}
function bindVerification(){const form=q('#loginForm'),box=q('#loginVerification'),display=q('#loginVerifyDisplay'),input=q('#loginVerifyCode'),error=q('#loginVerifyError'),refresh=q('#refreshLoginVerify'),slots=[...document.querySelectorAll('.login-code-slots span')];if(!form||!box||!input)return;const paint=()=>{const value=toLatinDigits(input.value).replace(/\D/g,'').slice(0,4);slots.forEach((slot,i)=>slot.textContent=value[i]||'')};const renew=(clear=true)=>{box.dataset.code=makeCode();display.textContent=box.dataset.code;input.value='';paint();if(clear&&error)error.textContent=''};if(!box.dataset.code)renew();if(!refresh.dataset.bound){refresh.dataset.bound='1';refresh.addEventListener('click',()=>{renew();input.focus()})}if(!input.dataset.bound){input.dataset.bound='1';input.addEventListener('input',()=>{input.value=toLatinDigits(input.value).replace(/\D/g,'').slice(0,4);paint();if(error)error.textContent=''})}if(!form.dataset.verifyBound){form.dataset.verifyBound='1';form.addEventListener('submit',e=>{const entered=toLatinDigits(input.value).replace(/\D/g,'');if(entered!==box.dataset.code){e.preventDefault();e.stopImmediatePropagation();renew(false);if(error)error.textContent='کد تأیید صحیح نیست. کد جدید را وارد کنید.';input.focus()}},true)}if(!form.dataset.enterBound){form.dataset.enterBound='1';form.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();form.requestSubmit?form.requestSubmit():form.querySelector('[type=submit]')?.click()}})}}
function bindLoginWatchdog(){
  const form=q('#loginForm');if(!form||form.dataset.watchdogBound)return;
  form.dataset.watchdogBound='1';
  form.addEventListener('submit',()=>{
    const btn=form.querySelector('button[type="submit"]'),error=q('#loginError');
    if(!btn)return;
    const original='ورود به سامانه';
    btn.textContent='در حال ورود…';
    if(form.__bamcoWaitTimer)clearTimeout(form.__bamcoWaitTimer);
    form.__bamcoWaitTimer=setTimeout(()=>{
      if(q('#loginView')?.classList.contains('hidden'))return;
      btn.disabled=false;btn.textContent=original;
      if(error&&!error.textContent)error.textContent='پاسخ سامانه طولانی شد. دوباره روی «ورود به سامانه» بزنید.';
    },24000);
    setTimeout(()=>{if(!btn.disabled)btn.textContent=original},0);
  },true);
}
function applyPersianFonts(root=document){const persian=/[\u0600-\u06FF]/;root.querySelectorAll?.('body *').forEach(el=>{if(el.closest('.english,.english-ui,.en-text,[dir="ltr"]'))return;if(el.matches('input[type="email"],input[type="url"],input[type="password"]'))return;const direct=[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&persian.test(n.nodeValue||''));const attrs=[el.getAttribute('placeholder'),el.getAttribute('title'),el.getAttribute('aria-label')].filter(Boolean).some(v=>persian.test(v));if(direct||attrs)el.classList.add('bamco-fa')})}
function install(){installNetworkGuard();q('#loginView .brand-lockup img')?.remove();buildLogin();bindPassword();bindVerification();bindLoginWatchdog();applyPersianFonts(document)}
function boot(){install();const login=q('#loginView');if(login&&!login.dataset.cleanLoginObserved){login.dataset.cleanLoginObserved='1';new MutationObserver(()=>install()).observe(login,{childList:true,subtree:true})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* Login runtime guard: never block successful authentication on the initial data refresh. */
(()=>{
'use strict';
function installLoginRuntimeGuard(){
  if(window.__bamcoLoginRuntimeGuard)return;
  window.__bamcoLoginRuntimeGuard='v2';
  if(typeof enterApp==='function'&&typeof refresh==='function'){
    const originalEnterApp=enterApp;
    const realRefresh=refresh;
    const fastEnter=async function(){
      let refreshRequested=false;
      const deferredRefresh=async()=>{refreshRequested=true};
      try{
        refresh=deferredRefresh;
        window.refresh=deferredRefresh;
        await originalEnterApp();
      }finally{
        refresh=realRefresh;
        window.refresh=realRefresh;
      }
      if(refreshRequested){
        setTimeout(()=>{
          Promise.resolve(realRefresh()).catch(err=>{
            console.error('BAMCO background refresh failed',err);
            if(typeof toast==='function')toast(err?.message||'بارگذاری اطلاعات سامانه کامل نشد. دوباره تلاش کنید.',true);
          });
        },0);
      }
    };
    enterApp=fastEnter;
    window.enterApp=fastEnter;
  }
  const recover=event=>{
    const login=document.querySelector('#loginView');
    if(!login||login.classList.contains('hidden'))return;
    const form=document.querySelector('#loginForm'),btn=form?.querySelector('button[type="submit"]'),error=document.querySelector('#loginError');
    if(btn){btn.disabled=false;btn.textContent='ورود به سامانه'}
    if(error&&!error.textContent)error.textContent='خطای اجرای صفحه شناسایی شد. صفحه را تازه‌سازی کرده و دوباره وارد شوید.';
    console.error('BAMCO login runtime error',event?.reason||event?.error||event);
  };
  window.addEventListener('unhandledrejection',recover);
  window.addEventListener('error',recover);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installLoginRuntimeGuard,{once:true});else installLoginRuntimeGuard();
})();