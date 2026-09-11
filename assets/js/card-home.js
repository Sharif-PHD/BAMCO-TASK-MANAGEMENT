/* Card navigation reuses existing buttons, handlers and role visibility. */
(()=>{
'use strict';
function install(){
 const q=s=>document.querySelector(s), app=q('#appView'), workspace=q('.workspace'), nav=q('#nav');
 if(!app||!workspace||!nav||q('#homeView'))return;
 document.body.classList.add('card-navigation');
 const top=document.createElement('header');top.className='card-topbar';
 top.innerHTML='<img src="assets/images/bamco-white-cropped.png" width="180" height="86" alt="خودروسازان بم"><strong>سامانه مدیریت، پایش و پیگیری امور</strong><button type="button" class="home-return">⌂ خانه</button>';
 app.prepend(top);const tools=q('.header-tools');if(tools)top.append(tools);
 const home=document.createElement('section');home.id='homeView';home.className='view hidden card-home';home.tabIndex=-1;home.setAttribute('aria-label','میز کار');
 workspace.append(home);home.append(nav);
 nav.querySelector('.nav-login-root')?.remove();
 const footer=document.createElement('footer');footer.id='homeFixedFooter';footer.innerHTML='<a href="https://www.linkedin.com/company/bam-automotive-company/" target="_blank" rel="noopener noreferrer">شرکت خودروسازان بم</a> | واحد توسعه و تکوین محصول | <a href="https://www.linkedin.com/in/shahab-tanhaiyan-b1156a10a/" target="_blank" rel="noopener noreferrer">شهاب‌الدین تنهائیان</a> و <a href="https://www.linkedin.com/in/nazanin-ghaemizadeh/" target="_blank" rel="noopener noreferrer">نازنین قائمی</a>';app.append(footer);
 // One order, matching the approved three-column RTL reference.
 const groups=[
  ['people',['people','loginActivity','activeSessions']],
  ['messages',['messages','messageCenter','sentMessages','responseTracking','templates','stickers']],
  ['reports',['dashboard','performanceReport','responseReport','requestReport']],
  ['configuration',['systemOptions','alertSettings','emailSettings','settings']],
  ['tasks',['kanban','archive','taskTimeline','approvals','requestHistory','approvalChains']],
  ['vehicle',['vehiclePermanent','vehicleTemporary']],
  ['conversations',['groupChat','directMessages','taskChats']]
 ];
 // These aliases share the same renderer and data. Keep the pages/data intact;
 // remove only the duplicate shortcut when its canonical shortcut exists.
 const aliases={loginReport:'loginActivity',messageReport:'sentMessages'};
 const groupObserver=new MutationObserver(()=>syncGroups());
 function syncGroups(){
  groupObserver.disconnect();
  try{
   for(const [alias,target] of Object.entries(aliases)){
    if(nav.querySelector(`button[data-view="${target}"]`))nav.querySelectorAll(`button[data-view="${alias}"]`).forEach(b=>b.remove());
   }
   const routes=new Set(),buttons=new Map();
   nav.querySelectorAll('button[data-view]').forEach(button=>{
    const key=button.dataset.view;
    if(routes.has(key)){
     const kept=buttons.get(key);
     // Prefer the original bound element; moving it preserves its handlers.
     if(!kept.id&&!kept.dataset.runtimeBound&&!kept.onclick&&(button.id||button.dataset.runtimeBound||button.onclick)){kept.remove();buttons.set(key,button)}else button.remove();
    }else{routes.add(key);buttons.set(key,button)}
   });
   let previous=null;
   for(const [key,ids] of groups){
    const group=nav.querySelector(`.nav-group[data-group="${key}"]`);if(!group)continue;
    const next=previous?previous.nextElementSibling:nav.firstElementChild;
    if(next!==group)nav.insertBefore(group,next);previous=group;
    const box=group.querySelector('.nav-group-items');if(!box)continue;
    let previousButton=null;
    for(const id of ids){
     const button=buttons.get(id);if(!button)continue;
     if(button.classList.contains('nav-settings-root'))button.classList.remove('nav-settings-root');
     const nextButton=previousButton?previousButton.nextElementSibling:box.firstElementChild;
     if(nextButton!==button)box.insertBefore(button,nextButton);previousButton=button;
    }
    const toggle=group.querySelector('button.nav-group-toggle');
    if(toggle){const heading=document.createElement('h3');heading.className='nav-group-toggle';heading.innerHTML=toggle.innerHTML;toggle.replaceWith(heading)}
   }
   // Do not hide or discard a unique route merely because it arrived late.
   nav.querySelectorAll('.nav-group').forEach(group=>{
    const visible=[...group.querySelectorAll('[data-view]')].some(b=>!b.classList.contains('hidden'));
    if(group.classList.contains('hidden')===visible)group.classList.toggle('hidden',!visible);
   });
  }finally{groupObserver.observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
 }
 syncGroups();
 // Section headings are non-interactive. Only existing subpage buttons navigate.
 const dialog=document.createElement('dialog');dialog.className='home-welcome-dialog';dialog.setAttribute('aria-labelledby','homeWelcomeTitle');dialog.innerHTML='<button class="welcome-dismiss" type="button" aria-label="بستن خوشامدگویی" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div class="home-welcome-copy"><p class="welcome-person"></p><h2 id="homeWelcomeTitle">به سامانه مدیریت، پایش و پیگیری امور خوش آمدید</h2></div><img class="home-sticker female" alt="استیکر زن در وضعیت مطلوب"><img class="home-sticker male" alt="استیکر مرد در وضعیت مطلوب">';document.body.append(dialog);
 let welcomeStickerUrls=[],welcomeStickerPromise=null,welcomeStickerReady=false;
 async function loadWelcomeStickers(){
  const fallback=window.BAMCO_DESKTOP_ASSETS?.yellow_happy;for(const gender of ['female','male']){const image=dialog.querySelector('.'+gender);if(fallback&&!image.src)image.src=fallback}
  if(typeof state==='undefined'||!state.token||typeof select!=='function')return;
  try{const [sets,candidates]=await Promise.all([select('sticker_sets','active=eq.true&select=id&order=created_at.desc&limit=1'),select('stickers','state_key=eq.state1&gender=in.(female,male)&select=set_id,gender,storage_path')]),set=sets[0];if(!set)return;const rows=candidates.filter(row=>String(row.set_id)===String(set.id));if(rows.length<2)return;const loaded=await Promise.all(rows.map(async row=>{const path=String(row.storage_path).split('/').map(encodeURIComponent).join('/'),res=await fetch(`${SB_URL}/storage/v1/object/authenticated/stickers/${path}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'force-cache'});if(!res.ok)throw new Error('sticker '+row.gender);return{gender:row.gender,url:URL.createObjectURL(await res.blob())}}));welcomeStickerUrls.forEach(URL.revokeObjectURL);welcomeStickerUrls=loaded.map(x=>x.url);for(const item of loaded){const image=dialog.querySelector('.'+item.gender);if(image)image.src=item.url}welcomeStickerReady=loaded.length>=2}catch(err){console.error('welcome-stickers',err)}
 }
 function stickers(force=false){if(welcomeStickerReady&&!force)return Promise.resolve();if(!welcomeStickerPromise||force)welcomeStickerPromise=loadWelcomeStickers().finally(()=>{welcomeStickerPromise=null});return welcomeStickerPromise}
 window.bamcoPrepareWelcomeStickers=()=>stickers();stickers();window.addEventListener('bamco-stickers-ready',()=>stickers(true));
 function showHome(){
  if(app.classList.contains('hidden'))return;
  // The home route must always be a concrete visible workspace. Several legacy
  // observers can move/hide views while the welcome dialog is open, so repair
  // the home/nav relationship every time instead of assuming it survived.
  if(nav.parentElement!==home)home.append(nav);
  workspace.querySelectorAll(':scope > .view').forEach(v=>v.classList.toggle('hidden',v!==home));
  home.classList.remove('hidden');
  nav.classList.remove('hidden');
  top.classList.remove('hidden');
  footer.classList.remove('hidden');
  document.body.classList.remove('welcome-active','content-only');document.body.classList.add('card-home-active');
  if(typeof state!=='undefined')state.view='home';
  const title=q('#viewTitle');if(title)title.textContent='میز کار';q('#addTaskBtn')?.classList.add('hidden');syncGroups();
 }
 function syncMode(){const loggedIn=!app.classList.contains('hidden'),atHome=!home.classList.contains('hidden');document.body.classList.toggle('card-home-active',loggedIn&&atHome);document.body.classList.toggle('content-only',loggedIn&&!atHome)}
 new MutationObserver(syncMode).observe(home,{attributes:true,attributeFilter:['class']});
 window.bamcoShowHome=showHome;
 let welcomed=false;
 window.bamcoOpenHomeWelcome=()=>{if(welcomed||app.classList.contains('hidden'))return;if(typeof state!=='undefined'&&state.profile?.must_change_password)return;welcomed=true;showHome();dialog.querySelector('.welcome-person').textContent=(q('#userName')?.textContent||'همکار')+' عزیز';dialog.showModal();void stickers()};
 dialog.querySelector('.welcome-dismiss').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{showHome();requestAnimationFrame(()=>home.focus({preventScroll:true}))});
 dialog.addEventListener('cancel',()=>requestAnimationFrame(showHome));
 top.querySelector('.home-return').addEventListener('click',()=>{showHome();home.focus({preventScroll:true})});
 new MutationObserver(()=>{if(app.classList.contains('hidden')){welcomed=false;if(dialog.open)dialog.close();document.body.classList.remove('card-home-active','content-only')}}).observe(app,{attributes:true,attributeFilter:['class']});
 if(!app.classList.contains('hidden'))window.bamcoOpenHomeWelcome();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
