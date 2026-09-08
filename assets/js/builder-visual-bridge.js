(()=>{
  'use strict';

  const CONFIG_SRC='assets/js/builder-config.js?v=20260908';
  const BUILDER_CDN='https://cdn.builder.io/js/webcomponents';
  const q=(s,r=document)=>r.querySelector(s);

  function loadScript(src,marker){
    return new Promise((resolve,reject)=>{
      const existing=marker&&q(`script[${marker}]`);
      if(existing){
        if(existing.dataset.loaded==='1')return resolve(existing);
        existing.addEventListener('load',()=>resolve(existing),{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.async=true;
      if(marker)script.setAttribute(marker,'');
      script.addEventListener('load',()=>{script.dataset.loaded='1';resolve(script)},{once:true});
      script.addEventListener('error',reject,{once:true});
      (document.head||document.documentElement).appendChild(script);
    });
  }

  function injectBridgeStyle(){
    if(q('#bamcoBuilderBridgeStyle'))return;
    const style=document.createElement('style');
    style.id='bamcoBuilderBridgeStyle';
    style.textContent=`
      builder-component[data-bamco-builder-root]{display:block;width:100%;min-width:0}
      #loginView.bamco-builder-layout-active>.login-card{display:none!important}
      #welcomeView.bamco-builder-layout-active>.welcome-card{display:none!important}
      bamco-login-brand,bamco-login-form,bamco-welcome-card{display:block;width:100%;min-width:0}
      bamco-login-brand>.brand-lockup,bamco-login-form>#loginForm,bamco-welcome-card>.welcome-card{width:100%;max-width:none}
    `;
    document.head.appendChild(style);
  }

  function waitFor(selector,timeout=10000){
    const found=q(selector);if(found)return Promise.resolve(found);
    return new Promise((resolve,reject)=>{
      const observer=new MutationObserver(()=>{
        const el=q(selector);
        if(el){observer.disconnect();clearTimeout(timer);resolve(el)}
      });
      observer.observe(document.documentElement,{childList:true,subtree:true});
      const timer=setTimeout(()=>{observer.disconnect();reject(new Error(`BAMCO Builder source not found: ${selector}`))},timeout);
    });
  }

  function defineMover(tag,selector,viewSelector,activeClass='bamco-builder-layout-active'){
    if(customElements.get(tag))return;
    class BamcoBuilderMover extends HTMLElement{
      connectedCallback(){
        if(this.dataset.bamcoMoveStarted==='1')return;
        this.dataset.bamcoMoveStarted='1';
        waitFor(selector).then(el=>{
          if(this.contains(el))return;
          this.appendChild(el);
          q(viewSelector)?.classList.add(activeClass);
        }).catch(()=>{});
      }
    }
    customElements.define(tag,BamcoBuilderMover);
  }

  function registerComponents(context){
    const Builder=context?.Builder;
    if(!Builder?.registerComponent)return;
    Builder.registerComponent(null,{name:'BAMCO Login Brand / Welcome',tag:'bamco-login-brand'});
    Builder.registerComponent(null,{name:'BAMCO Login Form',tag:'bamco-login-form'});
    Builder.registerComponent(null,{name:'BAMCO Welcome Card',tag:'bamco-welcome-card'});
  }

  function mountBuilderRoot(viewSelector,id,model,apiKey){
    const view=q(viewSelector);if(!view||q(`#${id}`))return;
    const root=document.createElement('builder-component');
    root.id=id;
    root.dataset.bamcoBuilderRoot='1';
    root.setAttribute('model',model);
    root.setAttribute('api-key',apiKey);
    root.setAttribute('reload-on-route','true');
    view.appendChild(root);
  }

  async function start(){
    await loadScript(CONFIG_SRC,'data-bamco-builder-config');
    const cfg=window.BAMCO_BUILDER_VISUAL||{};
    const apiKey=String(cfg.apiKey||'').trim();
    if(!apiKey)return; // zero-impact fallback until the user's Builder Space is connected

    injectBridgeStyle();
    defineMover('bamco-login-brand','.brand-lockup','#loginView');
    defineMover('bamco-login-form','#loginForm','#loginView');
    defineMover('bamco-welcome-card','#welcomeView .welcome-card','#welcomeView');

    window.builderWcLoadCallbacks=window.builderWcLoadCallbacks||[];
    window.builderWcLoadCallbacks.push(registerComponents);

    mountBuilderRoot('#loginView','bamcoBuilderLogin',cfg.loginModel||'bamco-login-layout',apiKey);
    mountBuilderRoot('#welcomeView','bamcoBuilderWelcome',cfg.welcomeModel||'bamco-welcome-layout',apiKey);

    await loadScript(BUILDER_CDN,'data-bamco-builder-sdk');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(()=>{}),{once:true});
  else start().catch(()=>{});
})();
