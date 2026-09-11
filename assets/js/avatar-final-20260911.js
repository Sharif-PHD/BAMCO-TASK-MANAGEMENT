(()=>{
'use strict';
if(window.__bamcoFinalAvatar20260911)return;
window.__bamcoFinalAvatar20260911=true;
let cachedPath='',cachedSrc='',sourcePromise=null,repairing=false,observer=null;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const profile=()=>typeof state!=='undefined'?state.profile:null;
const token=()=>typeof state!=='undefined'?state.token:'';

function placeAccount(){
  const app=q('#appView'),top=q('#appView>.card-topbar'),tools=q('.header-tools'),account=q('.account');
  if(!app||app.classList.contains('hidden')||!top||!tools||!account)return false;
  if(tools.parentElement!==top)top.appendChild(tools);
  if(account.parentElement!==tools)tools.prepend(account);
  return true;
}
function paint(src,path){
  const el=q('#avatar');if(!el||!src)return false;
  const existing=el.querySelector('img[data-profile-avatar-final]');
  if(existing&&existing.src===src&&el.dataset.avatarFinalPath===path)return true;
  const img=document.createElement('img');
  img.dataset.profileAvatarFinal='1';
  img.dataset.profileAvatar='1';
  img.alt='تصویر پروفایل';
  img.src=src;
  img.decoding='async';
  img.style.cssText='width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important';
  el.replaceChildren(img);
  el.classList.add('has-image');
  el.dataset.avatarFinalPath=path;
  el.dataset.avatarLoaded=path;
  el.style.removeProperty('background-image');
  return true;
}
async function source(path){
  if(cachedPath===path&&cachedSrc)return cachedSrc;
  if(sourcePromise)return sourcePromise;
  sourcePromise=(async()=>{
    let src='';
    if(window.bamcoMedia?.get)src=await window.bamcoMedia.get('avatars',path);
    else{
      const encoded=path.split('/').map(encodeURIComponent).join('/');
      const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/avatars/${encoded}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${token()}`},cache:'no-cache'});
      if(!res.ok)throw new Error(`avatar ${res.status}`);
      src=URL.createObjectURL(await res.blob());
    }
    cachedPath=path;cachedSrc=src;return src;
  })().finally(()=>{sourcePromise=null});
  return sourcePromise;
}
async function ensure(force=false){
  if(repairing)return false;
  const p=profile(),auth=token(),app=q('#appView');
  if(!p||!auth||!p.avatar_path||!app||app.classList.contains('hidden'))return false;
  const path=String(p.avatar_path);placeAccount();
  if(!force&&cachedPath===path&&cachedSrc){paint(cachedSrc,path);return true}
  repairing=true;
  try{const src=await source(path);if(String(profile()?.avatar_path||'')!==path)return false;placeAccount();return paint(src,path)}
  catch(err){console.error('final-avatar-load',err);return false}
  finally{repairing=false}
}
function heal(){
  const p=profile(),app=q('#appView');if(!p?.avatar_path||!app||app.classList.contains('hidden'))return;
  placeAccount();
  const el=q('#avatar'),path=String(p.avatar_path);
  if(cachedPath===path&&cachedSrc){
    if(!el?.querySelector('img[data-profile-avatar-final]')||el.dataset.avatarFinalPath!==path)paint(cachedSrc,path);
  }else void ensure();
}
function boot(){
  const app=q('#appView');
  observer=new MutationObserver(()=>queueMicrotask(heal));
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))void ensure(true)}).observe(app,{attributes:true,attributeFilter:['class']});
  [0,150,500,1000,1800,3000,5000].forEach(ms=>setTimeout(()=>void ensure(),ms));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void ensure()});
  addEventListener('pageshow',()=>void ensure());
  window.bamcoFinalAvatar={refresh:()=>ensure(true),heal};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
