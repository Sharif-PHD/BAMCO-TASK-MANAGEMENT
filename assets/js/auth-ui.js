(()=>{
  'use strict';
  const q=s=>document.querySelector(s);
  const USER_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/></svg>`;
  const LOCK_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm3 9.73V18h-2v-2.27a2 2 0 1 1 2 0Z"/></svg>`;
  const EYE_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.2 0 9.3 4.6 10.5 6.1a1.4 1.4 0 0 1 0 1.8C21.3 14.4 17.2 19 12 19S2.7 14.4 1.5 12.9a1.4 1.4 0 0 1 0-1.8C2.7 9.6 6.8 5 12 5Zm0 2C8 7 4.6 10.4 3.5 12c1.1 1.6 4.5 5 8.5 5s7.4-3.4 8.5-5C19.4 10.4 16 7 12 7Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"/></svg>`;
  const EYE_OFF_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.3 2 18.7 18.7-1.3 1.3-3.4-3.4A11.8 11.8 0 0 1 12 20C6.8 20 2.7 15.4 1.5 13.9a1.4 1.4 0 0 1 0-1.8 20.5 20.5 0 0 1 4.1-4.2L2 3.3 3.3 2Zm3.8 7.4A18.5 18.5 0 0 0 3.5 13c1.1 1.6 4.5 5 8.5 5 1.3 0 2.6-.4 3.7-1l-1.8-1.8a4 4 0 0 1-5.1-5.1L7.1 9.4ZM12 6c5.2 0 9.3 4.6 10.5 6.1a1.4 1.4 0 0 1 0 1.8 18.2 18.2 0 0 1-2.2 2.4l-1.4-1.4a17.2 17.2 0 0 0 1.6-1.9c-1.1-1.6-4.5-5-8.5-5-.8 0-1.5.1-2.2.3L8.2 6.7A12 12 0 0 1 12 6Z"/></svg>`;

  function injectStyle(){
    let style=q('#bamcoLoginControlsStyle');
    if(!style){style=document.createElement('style');style.id='bamcoLoginControlsStyle';document.head.appendChild(style)}
    style.textContent=`
      #loginView .brand-lockup img{width:122px!important;height:122px!important;padding:12px!important;border-radius:24px!important}
      #loginView .bamco-auth-field{position:relative!important;display:block!important;width:100%!important}
      #loginView .bamco-auth-field>#email,#loginView .bamco-auth-field>#password{width:100%!important;box-sizing:border-box!important;background-image:none!important;padding-left:50px!important}
      #loginView .bamco-password-field>#password{padding-right:50px!important}
      #loginView .bamco-auth-leading-icon{position:absolute!important;left:15px!important;top:50%!important;transform:translateY(-50%)!important;width:23px!important;height:23px!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#7b8683!important;pointer-events:none!important;z-index:8!important}
      #loginView .bamco-auth-leading-icon svg,#loginView .bamco-password-toggle svg{width:23px!important;height:23px!important;display:block!important;fill:currentColor!important}
      #loginView .bamco-password-toggle{position:absolute!important;right:14px!important;top:50%!important;transform:translateY(-50%)!important;width:30px!important;height:30px!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;color:#7b8683!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;z-index:9!important}
      #loginView .bamco-verification{margin-top:12px!important;padding:10px!important;border:1px solid #d4e0db!important;border-radius:10px!important;background:#f6faf8!important;direction:rtl!important;text-align:right!important}
      #loginView .bamco-verification-title{display:block!important;margin-bottom:7px!important;font-weight:700!important;color:#31584b!important;text-align:right!important;direction:rtl!important}
      #loginView .bamco-verification-title span{display:block!important;width:100%!important;text-align:right!important}
      #loginView .bamco-code-row{display:grid!important;grid-template-columns:112px 1fr 34px!important;gap:7px!important;align-items:center!important}
      #loginView .bamco-code-box{height:40px!important;display:grid!important;place-items:center!important;border:1px dashed #8eaaa0!important;border-radius:8px!important;background:#fff!important;font-family:"Times New Roman",Times,serif!important;font-size:20px!important;font-weight:700!important;letter-spacing:5px!important;direction:ltr!important;color:#174f3e!important;user-select:none!important}
      #loginView #loginVerifyCode{height:40px!important;text-align:center!important;direction:ltr!important;font-family:"Times New Roman",Times,serif!important;font-size:16px!important;letter-spacing:3px!important;padding:6px 8px!important}
      #loginView .bamco-refresh-code{height:34px!important;width:34px!important;border:1px solid #cad8d2!important;border-radius:8px!important;background:#fff!important;color:#176b4d!important;cursor:pointer!important;padding:0!important}
      #loginView .bamco-code-error{min-height:18px!important;margin-top:4px!important;color:#b42318!important;text-align:right!important;font-size:12px!important}
    `;
  }

  function wrapInput(input,kind,iconSvg){
    if(!input)return null;
    let wrap=input.closest('.bamco-auth-field');
    if(!wrap){wrap=document.createElement('div');wrap.className=`bamco-auth-field bamco-${kind}-field`;input.parentNode.insertBefore(wrap,input);wrap.appendChild(input)}else wrap.classList.add(`bamco-${kind}-field`);
    if(!wrap.querySelector('.bamco-auth-leading-icon')){const icon=document.createElement('span');icon.className='bamco-auth-leading-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=iconSvg;wrap.appendChild(icon)}
    return wrap;
  }

  function installPasswordToggle(wrap,input){
    if(!wrap||!input||wrap.querySelector('.bamco-password-toggle'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='bamco-password-toggle';btn.title='نمایش رمز عبور';btn.setAttribute('aria-label','نمایش رمز عبور');btn.innerHTML=EYE_ICON;
    btn.addEventListener('click',()=>{const showing=input.type==='text';input.type=showing?'password':'text';btn.innerHTML=showing?EYE_ICON:EYE_OFF_ICON;btn.title=showing?'نمایش رمز عبور':'مخفی کردن رمز عبور';btn.setAttribute('aria-label',btn.title);try{input.focus({preventScroll:true})}catch{}});
    wrap.appendChild(btn);
  }

  const toLatinDigits=v=>String(v||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const makeCode=()=>String(Math.floor(1000+Math.random()*9000));

  function installVerification(){
    const form=q('#loginForm');if(!form)return;
    let box=q('#loginVerification');
    if(!box){
      box=document.createElement('div');box.id='loginVerification';box.className='bamco-verification';
      box.innerHTML=`<div class="bamco-verification-title"><span>کد را وارد کنید</span></div><div class="bamco-code-row"><div id="loginVerifyDisplay" class="bamco-code-box" aria-label="کد تأیید"></div><input id="loginVerifyCode" type="text" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9۰-۹٠-٩]{4}" placeholder="کد"><button type="button" id="refreshLoginVerify" class="bamco-refresh-code" title="ساخت کد جدید" aria-label="ساخت کد جدید">↻</button></div><div id="loginVerifyError" class="bamco-code-error"></div>`;
      const submit=form.querySelector('button[type="submit"],.primary.wide');
      if(submit)form.insertBefore(box,submit);else form.appendChild(box);
    }else{
      const title=box.querySelector('.bamco-verification-title');
      if(title)title.innerHTML='<span>کد را وارد کنید</span>';
    }
    const display=q('#loginVerifyDisplay'),input=q('#loginVerifyCode'),error=q('#loginVerifyError'),refresh=q('#refreshLoginVerify');
    const renew=(clearError=true)=>{box.dataset.code=makeCode();if(display)display.textContent=box.dataset.code;if(input)input.value='';if(clearError&&error)error.textContent=''};
    if(!box.dataset.code)renew();
    if(refresh&&!refresh.dataset.bound){refresh.dataset.bound='1';refresh.addEventListener('click',()=>renew(true))}
    if(input&&!input.dataset.bound){input.dataset.bound='1';input.addEventListener('input',()=>{input.value=toLatinDigits(input.value).replace(/\D/g,'').slice(0,4);if(error)error.textContent=''})}
    if(!form.dataset.verifyBound){
      form.dataset.verifyBound='1';
      form.addEventListener('submit',e=>{
        const entered=toLatinDigits(input?.value).replace(/\D/g,'');
        if(entered!==box.dataset.code){
          e.preventDefault();e.stopImmediatePropagation();
          renew(false);
          if(error)error.textContent='کد تأیید صحیح نیست. کد جدید را وارد کنید.';
          setTimeout(()=>input?.focus(),0);
        }
      },true);
    }
  }

  function install(){injectStyle();const email=q('#email'),password=q('#password');wrapInput(email,'email',USER_ICON);const passWrap=wrapInput(password,'password',LOCK_ICON);installPasswordToggle(passWrap,password);installVerification()}
  function boot(){install();[100,350,900,1600].forEach(ms=>setTimeout(install,ms));const login=q('#loginView');if(login&&!login.dataset.loginControlsObserved){login.dataset.loginControlsObserved='1';let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})}).observe(login,{childList:true,subtree:true})}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
