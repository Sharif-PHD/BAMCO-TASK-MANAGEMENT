(()=>{
  'use strict';
  const q=s=>document.querySelector(s);

  const USER_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/></svg>`;
  const LOCK_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm3 9.73V18h-2v-2.27a2 2 0 1 1 2 0Z"/></svg>`;
  const EYE_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.2 0 9.3 4.6 10.5 6.1a1.4 1.4 0 0 1 0 1.8C21.3 14.4 17.2 19 12 19S2.7 14.4 1.5 12.9a1.4 1.4 0 0 1 0-1.8C2.7 9.6 6.8 5 12 5Zm0 2C8 7 4.6 10.4 3.5 12c1.1 1.6 4.5 5 8.5 5s7.4-3.4 8.5-5C19.4 10.4 16 7 12 7Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"/></svg>`;
  const EYE_OFF_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.3 2 18.7 18.7-1.3 1.3-3.4-3.4A11.8 11.8 0 0 1 12 20C6.8 20 2.7 15.4 1.5 13.9a1.4 1.4 0 0 1 0-1.8 20.5 20.5 0 0 1 4.1-4.2L2 3.3 3.3 2Zm3.8 7.4A18.5 18.5 0 0 0 3.5 13c1.1 1.6 4.5 5 8.5 5 1.3 0 2.6-.4 3.7-1l-1.8-1.8a4 4 0 0 1-5.1-5.1L7.1 9.4ZM12 6c5.2 0 9.3 4.6 10.5 6.1a1.4 1.4 0 0 1 0 1.8 18.2 18.2 0 0 1-2.2 2.4l-1.4-1.4a17.2 17.2 0 0 0 1.6-1.9c-1.1-1.6-4.5-5-8.5-5-.8 0-1.5.1-2.2.3L8.2 6.7A12 12 0 0 1 12 6Z"/></svg>`;

  function injectStyle(){
    if(q('#bamcoLoginControlsStyle'))return;
    const style=document.createElement('style');
    style.id='bamcoLoginControlsStyle';
    style.textContent=`
      #loginView .bamco-auth-field{
        position:relative!important;
        display:block!important;
        width:100%!important;
      }
      html body #loginView .bamco-auth-field>#email,
      html body #loginView .bamco-auth-field>#email:hover,
      html body #loginView .bamco-auth-field>#email:focus,
      html body #loginView .bamco-auth-field>#email:not(:placeholder-shown),
      html body #loginView .bamco-auth-field>#email:-webkit-autofill,
      html body #loginView .bamco-auth-field>#email:autofill,
      html body #loginView .bamco-auth-field>#password,
      html body #loginView .bamco-auth-field>#password:hover,
      html body #loginView .bamco-auth-field>#password:focus,
      html body #loginView .bamco-auth-field>#password:not(:placeholder-shown),
      html body #loginView .bamco-auth-field>#password:-webkit-autofill,
      html body #loginView .bamco-auth-field>#password:autofill{
        width:100%!important;
        box-sizing:border-box!important;
        background-image:none!important;
        padding-left:54px!important;
      }
      html body #loginView .bamco-auth-field.bamco-password-field>#password,
      html body #loginView .bamco-auth-field.bamco-password-field>#password:hover,
      html body #loginView .bamco-auth-field.bamco-password-field>#password:focus,
      html body #loginView .bamco-auth-field.bamco-password-field>#password:not(:placeholder-shown),
      html body #loginView .bamco-auth-field.bamco-password-field>#password:-webkit-autofill,
      html body #loginView .bamco-auth-field.bamco-password-field>#password:autofill{
        padding-right:54px!important;
      }
      #loginView .bamco-auth-leading-icon{
        position:absolute!important;
        left:17px!important;
        top:50%!important;
        transform:translateY(-50%)!important;
        width:25px!important;
        height:25px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        color:#7b8683!important;
        pointer-events:none!important;
        z-index:8!important;
      }
      #loginView .bamco-auth-leading-icon svg,
      #loginView .bamco-password-toggle svg{
        width:25px!important;
        height:25px!important;
        display:block!important;
        fill:currentColor!important;
      }
      #loginView .bamco-password-toggle{
        position:absolute!important;
        right:16px!important;
        top:50%!important;
        transform:translateY(-50%)!important;
        width:32px!important;
        height:32px!important;
        min-width:32px!important;
        min-height:32px!important;
        padding:0!important;
        margin:0!important;
        border:0!important;
        outline:0!important;
        background:transparent!important;
        box-shadow:none!important;
        color:#7b8683!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        cursor:pointer!important;
        z-index:9!important;
      }
      #loginView .bamco-password-toggle:hover,
      #loginView .bamco-password-toggle:focus-visible{
        color:#176b4d!important;
        background:transparent!important;
        box-shadow:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function wrapInput(input,kind,iconSvg){
    if(!input)return null;
    let wrap=input.closest('.bamco-auth-field');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className=`bamco-auth-field bamco-${kind}-field`;
      input.parentNode.insertBefore(wrap,input);
      wrap.appendChild(input);
    }else{
      wrap.classList.add(`bamco-${kind}-field`);
    }
    if(!wrap.querySelector('.bamco-auth-leading-icon')){
      const icon=document.createElement('span');
      icon.className='bamco-auth-leading-icon';
      icon.setAttribute('aria-hidden','true');
      icon.innerHTML=iconSvg;
      wrap.appendChild(icon);
    }
    return wrap;
  }

  function installPasswordToggle(wrap,input){
    if(!wrap||!input||wrap.querySelector('.bamco-password-toggle'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='bamco-password-toggle';
    btn.title='نمایش رمز عبور';
    btn.setAttribute('aria-label','نمایش رمز عبور');
    btn.setAttribute('aria-pressed','false');
    btn.innerHTML=EYE_ICON;
    btn.addEventListener('click',()=>{
      const showing=input.type==='text';
      input.type=showing?'password':'text';
      btn.innerHTML=showing?EYE_ICON:EYE_OFF_ICON;
      btn.title=showing?'نمایش رمز عبور':'مخفی کردن رمز عبور';
      btn.setAttribute('aria-label',btn.title);
      btn.setAttribute('aria-pressed',showing?'false':'true');
      try{input.focus({preventScroll:true});const len=input.value.length;input.setSelectionRange(len,len)}catch{}
    });
    wrap.appendChild(btn);
  }

  function install(){
    injectStyle();
    const email=q('#email'),password=q('#password');
    wrapInput(email,'email',USER_ICON);
    const passWrap=wrapInput(password,'password',LOCK_ICON);
    installPasswordToggle(passWrap,password);
  }

  function boot(){
    install();
    [100,350,900,1600].forEach(ms=>setTimeout(install,ms));
    const login=q('#loginView');
    if(login&&!login.dataset.loginControlsObserved){
      login.dataset.loginControlsObserved='1';
      let queued=false;
      new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})}).observe(login,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
