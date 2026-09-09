(()=>{
  'use strict';
  const VERSION='20260909-safe-completion-3';
  if(window.__bamcoStabilityHotfix===VERSION)return;
  window.__bamcoStabilityHotfix=VERSION;
  document.documentElement.dataset.navigationComplete='safe-completion';

  function showBackgroundError(err){
    console.error('BAMCO background refresh failed',err);
    try{if(typeof window.toast==='function')window.toast(err?.message||'بارگذاری اطلاعات کامل نشد. دوباره تلاش کنید.',true)}catch{}
  }

  function wrapEnterApp(){
    if(window.__bamcoFastEnterWrapped)return true;
    if(typeof window.enterApp!=='function'||typeof window.refresh!=='function')return false;
    const originalEnter=window.enterApp;
    const realRefresh=window.refresh;
    const fastEnter=async function(){
      let requested=false;
      const deferredRefresh=async()=>{requested=true};
      try{
        window.refresh=deferredRefresh;
        try{refresh=deferredRefresh}catch{}
        await originalEnter();
      }finally{
        window.refresh=realRefresh;
        try{refresh=realRefresh}catch{}
      }
      if(requested)setTimeout(()=>Promise.resolve(realRefresh()).catch(showBackgroundError),0);
    };
    window.enterApp=fastEnter;
    try{enterApp=fastEnter}catch{}
    window.__bamcoFastEnterWrapped=true;
    return true;
  }

  function addScript(src,key,onload){
    if(window[key])return;
    window[key]=true;
    const s=document.createElement('script');
    s.src=src;s.async=true;
    s.onload=onload||null;
    s.onerror=()=>{window[key]=false;showBackgroundError(new Error('بارگذاری امکانات تکمیلی انجام نشد.'))};
    document.head.appendChild(s);
  }

  function loadRuntime(){
    const app=document.querySelector('#appView');
    if(!app||app.classList.contains('hidden'))return;
    addScript('assets/js/production-runtime.js?v=20260909-5','__bamcoSafeRuntimeLoading',()=>{
      window.__bamcoSafeRuntimeLoaded=true;
      addScript('assets/js/completion-ui.js?v=20260909-5','__bamcoCompletionUiLoading',()=>{window.__bamcoCompletionUiLoaded=true});
    });
    addScript('assets/js/session-runtime.js?v=20260909-1','__bamcoSessionRuntimeLoading',()=>{window.__bamcoSessionRuntimeLoaded=true});
  }

  function install(){
    wrapEnterApp();
    const app=document.querySelector('#appView');
    if(!app)return;
    const sync=()=>{if(!app.classList.contains('hidden'))setTimeout(loadRuntime,0)};
    new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
    sync();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

