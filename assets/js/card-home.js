/* Card navigation reuses existing buttons, handlers and role visibility. */
(()=>{
'use strict';
function install(){
 const q=s=>document.querySelector(s), app=q('#appView'), workspace=q('.workspace'), nav=q('#nav');
 if(!app||!workspace||!nav)return;
 document.body.classList.add('card-navigation');
 const top=document.createElement('header');top.className='card-topbar';
 top.innerHTML='<img src="assets/images/bamco-white.png" alt="خودروسازان بم"><strong>سامانه مدیریت، پایش و پیگیری امور</strong><button type="button" class="home-return">⌂ خانه</button>';
 app.prepend(top);const tools=q('.header-tools');if(tools)top.append(tools);
 const home=document.createElement('section');home.id='homeView';home.className='view hidden card-home';home.innerHTML='<div class="home-heading"><span>میز کار شما</span><h2 tabindex="-1">امروز از کدام بخش شروع می‌کنید؟</h2><p>برای مشاهده اطلاعات و جدول‌ها، بخش موردنظر را انتخاب کنید.</p></div>';
 workspace.append(home);home.append(nav);
 nav.querySelector('.nav-login-root')?.remove();
 const footer=document.createElement('footer');footer.id='homeFixedFooter';footer.innerHTML='<a href="https://www.linkedin.com/company/bam-automotive-company/" target="_blank" rel="noopener noreferrer">شرکت خودروسازان بم</a> | واحد توسعه و تکوین محصول | <a href="https://www.linkedin.com/in/shahab-tanhaiyan-b1156a10a/" target="_blank" rel="noopener noreferrer">شهاب‌الدین تنهائیان</a> و <a href="https://www.linkedin.com/in/nazanin-ghaemizadeh/" target="_blank" rel="noopener noreferrer">نازنین قائمی</a>';app.append(footer);
 function syncGroups(){
  const routes=new Set();nav.querySelectorAll('button[data-view]').forEach(button=>{const key=button.dataset.view;if(routes.has(key)){button.remove();return}routes.add(key)});
  const desired=['people','messages','reports','configuration','tasks','vehicle','conversations'].map(key=>nav.querySelector(`.nav-group[data-group="${key}"]`)).filter(Boolean),current=[...nav.querySelectorAll(':scope>.nav-group')];if(desired.some((group,index)=>current[index]!==group))desired.forEach(group=>nav.append(group));
  nav.querySelectorAll('.nav-group').forEach(group=>{const visible=[...group.querySelectorAll('[data-view]')].some(b=>!b.classList.contains('hidden'));if(group.classList.contains('hidden')===visible)group.classList.toggle('hidden',!visible);const toggle=group.querySelector('button.nav-group-toggle');if(toggle){const heading=document.createElement('h3');heading.className='nav-group-toggle';heading.innerHTML=toggle.innerHTML;toggle.replaceWith(heading)}})
 }
 new MutationObserver(syncGroups).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});syncGroups();
 // Section headings are non-interactive. Only existing subpage buttons navigate.
 const dialog=document.createElement('dialog');dialog.className='home-welcome-dialog';dialog.setAttribute('aria-labelledby','homeWelcomeTitle');dialog.innerHTML='<button class="welcome-dismiss" type="button" aria-label="بستن خوشامدگویی" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div class="home-welcome-copy"><p class="welcome-person"></p><h2 id="homeWelcomeTitle">به سامانه مدیریت، پایش و پیگیری امور خوش آمدید</h2></div><img class="home-sticker female" alt="استیکر زن در وضعیت مطلوب"><img class="home-sticker male" alt="استیکر مرد در وضعیت مطلوب">';document.body.append(dialog);
 let welcomeStickerUrls=[],welcomeStickerPromise=null,welcomeStickerReady=false;
 async function loadWelcomeStickers(){
  const fallback=window.BAMCO_DESKTOP_ASSETS?.yellow_happy;for(const gender of ['female','male']){const image=dialog.querySelector('.'+gender);if(fallback&&!image.src)image.src=fallback}
  if(typeof state==='undefined'||!state.token||typeof select!=='function')return;
  try{const sets=await select('sticker_sets','active=eq.true&select=id&order=created_at.desc&limit=1'),set=sets[0];if(!set)return;const rows=await select('stickers',`set_id=eq.${set.id}&state_key=eq.state1&gender=in.(female,male)&select=gender,storage_path`);if(rows.length<2)return;const loaded=await Promise.all(rows.map(async row=>{const path=String(row.storage_path).split('/').map(encodeURIComponent).join('/'),res=await fetch(`${SB_URL}/storage/v1/object/authenticated/stickers/${path}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'force-cache'});if(!res.ok)throw new Error('sticker '+row.gender);return{gender:row.gender,url:URL.createObjectURL(await res.blob())}}));welcomeStickerUrls.forEach(URL.revokeObjectURL);welcomeStickerUrls=loaded.map(x=>x.url);for(const item of loaded){const image=dialog.querySelector('.'+item.gender);if(image)image.src=item.url}welcomeStickerReady=loaded.length>=2}catch(err){console.error('welcome-stickers',err)}
 }
 function stickers(force=false){if(welcomeStickerReady&&!force)return Promise.resolve();if(!welcomeStickerPromise||force)welcomeStickerPromise=loadWelcomeStickers().finally(()=>{welcomeStickerPromise=null});return welcomeStickerPromise}
 window.bamcoPrepareWelcomeStickers=()=>stickers();stickers();window.addEventListener('bamco-stickers-ready',()=>stickers(true));
 function showHome(){
  if(app.classList.contains('hidden'))return;
  workspace.querySelectorAll(':scope > .view').forEach(v=>v.classList.toggle('hidden',v!==home));
  document.body.classList.remove('welcome-active');document.body.classList.add('card-home-active');
  if(typeof state!=='undefined')state.view='home';
  document.body.classList.remove('content-only');
  q('#viewTitle').textContent='میز کار';q('#addTaskBtn')?.classList.add('hidden');syncGroups();
 }
 function syncMode(){const loggedIn=!app.classList.contains('hidden'),atHome=!home.classList.contains('hidden');document.body.classList.toggle('card-home-active',loggedIn&&atHome);document.body.classList.toggle('content-only',loggedIn&&!atHome)}
 new MutationObserver(syncMode).observe(home,{attributes:true,attributeFilter:['class']});
 window.bamcoShowHome=showHome;
 let welcomed=false;
 window.bamcoOpenHomeWelcome=async()=>{showHome();if(welcomed||app.classList.contains('hidden'))return;if(typeof state!=='undefined'&&state.profile?.must_change_password)return;welcomed=true;dialog.querySelector('.welcome-person').textContent=(q('#userName')?.textContent||'همکار')+' عزیز';await stickers();dialog.showModal()};
 dialog.querySelector('.welcome-dismiss').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>home.querySelector('h2').focus({preventScroll:true}));
 top.querySelector('.home-return').addEventListener('click',()=>{showHome();home.querySelector('h2').focus({preventScroll:true})});
 new MutationObserver(()=>{if(app.classList.contains('hidden')){welcomed=false;if(dialog.open)dialog.close();document.body.classList.remove('card-home-active','content-only')}}).observe(app,{attributes:true,attributeFilter:['class']});
 if(!app.classList.contains('hidden'))window.bamcoOpenHomeWelcome();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
