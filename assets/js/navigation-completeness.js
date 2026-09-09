(()=>{
  'use strict';
  const VERSION='20260909-stability-hotfix-2';
  if(window.__bamcoStabilityHotfix===VERSION)return;
  window.__bamcoStabilityHotfix=VERSION;
  document.documentElement.dataset.navigationComplete='stability-hotfix';

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

  function install(){
    wrapEnterApp();
    // Stability mode intentionally leaves the original navigation DOM and
    // original tab handlers untouched. Do not rebuild or move nav buttons.
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
