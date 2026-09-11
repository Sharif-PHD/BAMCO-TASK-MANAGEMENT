(()=>{
'use strict';
if(window.__bamcoTopbarAvatarFix20260911V2)return;
window.__bamcoTopbarAvatarFix20260911V2=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
let refreshRun=0,repairFrame=0;

function profile(){return typeof state!=='undefined'?state.profile:null}
function token(){return typeof state!=='undefined'?state.token:''}
function initial(){const p=profile();return String(p?.display_name||p?.full_name||'ب').trim().charAt(0)||'ب'}

function ensureHeaderAccount(){
  const app=q('#appView'),top=q('#appView>.card-topbar'),tools=q('.header-tools'),account=q('.account');
  if(!app||app.classList.contains('hidden')||!top)return false;
  if(tools&&tools.parentElement!==top)top.appendChild(tools);
  if(tools&&account&&account.parentElement!==tools)tools.prepend(account);
  return !!(tools&&account&&account.parentElement===tools&&tools.parentElement===top);
}
function paintInitial(el){
  if(!el)return;
  el.replaceChildren(document.createTextNode(initial()));
  el.classList.remove('has-image');
  el.removeAttribute('data-avatar-loaded');
  el.style.removeProperty('background-image');
}
function paintImage(el,src,path){
  if(!el||!src)return;
  const current=el.querySelector('img[data-profile-avatar]');
  if(current&&current.src===src&&el.dataset.avatarLoaded===String(path))return;
  const img=document.createElement('img');
  img.dataset.profileAvatar='1';
  img.alt='تصویر پروفایل';
  img.src=src;
  img.decoding='async';
  img.style.cssText='width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important';
  el.replaceChildren(img);
  el.classList.add('has-image');
  el.dataset.avatarLoaded=String(path||'');
  el.style.removeProperty('background-image');
}
async function avatarSource(path){
  if(window.bamcoMedia?.get)return window.bamcoMedia.get('avatars',path);
  const encoded=String(path).split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/avatars/${encoded}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${token()}`},cache:'no-cache'});
  if(!res.ok)throw new Error(`avatar ${res.status}`);
  return URL.createObjectURL(await res.blob());
}
async function refresh(){
  const run=++refreshRun,p=profile(),auth=token();
  if(!p||!auth)return false;
  ensureHeaderAccount();
  const targets=[q('#avatar'),q('#profileAvatarPreview')].filter(Boolean);
  if(!p.avatar_path){targets.forEach(paintInitial);return true}
  try{
    const src=await avatarSource(p.avatar_path);
    if(run!==refreshRun)return false;
    ensureHeaderAccount();
    targets.forEach(el=>paintImage(el,src,p.avatar_path));
    return true;
  }catch(err){
    console.error('topbar-avatar-load',err);
    if(!targets.some(el=>el.querySelector('img[data-profile-avatar]')))targets.forEach(paintInitial);
    return false;
  }
}
function schedule(){
  ensureHeaderAccount();
  [0,80,250,700,1500,3000].forEach(ms=>setTimeout(()=>{
    const app=q('#appView');
    if(app&&!app.classList.contains('hidden'))void refresh();
  },ms));
}
function repair(){
  if(repairFrame)return;
  repairFrame=requestAnimationFrame(()=>{
    repairFrame=0;
    const app=q('#appView');if(!app||app.classList.contains('hidden'))return;
    const moved=ensureHeaderAccount();
    const avatar=q('#avatar'),p=profile();
    if(moved&&p?.avatar_path&&!avatar?.querySelector('img[data-profile-avatar]'))void refresh();
  });
}
function boot(){
  window.refreshProfileAvatar=refresh;
  window.bamcoTopbarAvatar={refresh,repair:ensureHeaderAccount};
  const app=q('#appView');
  if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))schedule()}).observe(app,{attributes:true,attributeFilter:['class']});
  new MutationObserver(repair).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  if(app&&!app.classList.contains('hidden'))schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
