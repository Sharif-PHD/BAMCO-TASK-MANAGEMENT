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
 function syncGroups(){nav.querySelectorAll('.nav-group').forEach(group=>{const visible=[...group.querySelectorAll('[data-view]')].some(b=>!b.classList.contains('hidden'));if(group.classList.contains('hidden')===visible)group.classList.toggle('hidden',!visible);group.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded','true')})}
 new MutationObserver(syncGroups).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});syncGroups();
 // Group headings open their first permitted page; all subpages remain visible.
 nav.addEventListener('click',e=>{const toggle=e.target.closest('.nav-group-toggle');if(!toggle)return;e.preventDefault();e.stopImmediatePropagation();toggle.closest('.nav-group').querySelector('[data-view]:not(.hidden)')?.click()},true);
 const dialog=document.createElement('dialog');dialog.className='home-welcome-dialog';dialog.setAttribute('aria-labelledby','homeWelcomeTitle');dialog.innerHTML='<button class="welcome-dismiss" type="button" aria-label="بستن خوشامدگویی" autofocus>×</button><div class="home-welcome-copy"><p class="welcome-person"></p><h2 id="homeWelcomeTitle">به سامانه مدیریت، پایش و پیگیری امور خوش آمدید</h2><p>همراه شما برای نظم در کارها، پایش پیشرفت و پیگیری به‌موقع امور.</p><p>بخش موردنظر را از کارت‌های میز کار انتخاب کنید.</p></div><img class="home-sticker female" alt="استیکر زن در وضعیت مطلوب"><img class="home-sticker male" alt="استیکر مرد در وضعیت مطلوب">';document.body.append(dialog);
 function stickers(){const assets=window.BAMCO_DESKTOP_ASSETS||{};for(const gender of ['female','male']){const image=dialog.querySelector('.'+gender);const src=assets['01_happy_'+gender];if(src)image.src=src}}
 stickers();window.addEventListener('bamco-stickers-ready',stickers);
 function showHome(){
  if(app.classList.contains('hidden'))return;
  workspace.querySelectorAll(':scope > .view').forEach(v=>v.classList.toggle('hidden',v!==home));
  document.body.classList.remove('welcome-active');document.body.classList.add('card-home-active');
  if(typeof state!=='undefined')state.view='home';
  q('#viewTitle').textContent='میز کار';q('#addTaskBtn')?.classList.add('hidden');syncGroups();
 }
 new MutationObserver(()=>document.body.classList.toggle('card-home-active',!home.classList.contains('hidden'))).observe(home,{attributes:true,attributeFilter:['class']});
 let welcomed=false;
 window.bamcoOpenHomeWelcome=()=>{showHome();if(welcomed||app.classList.contains('hidden'))return;if(typeof state!=='undefined'&&state.profile?.must_change_password)return;welcomed=true;dialog.querySelector('.welcome-person').textContent=(q('#userName')?.textContent||'همکار')+' عزیز';stickers();dialog.showModal()};
 dialog.querySelector('.welcome-dismiss').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>home.querySelector('h2').focus({preventScroll:true}));
 top.querySelector('.home-return').addEventListener('click',()=>{showHome();home.querySelector('h2').focus({preventScroll:true})});
 new MutationObserver(()=>{if(app.classList.contains('hidden')){welcomed=false;if(dialog.open)dialog.close();document.body.classList.remove('card-home-active')}}).observe(app,{attributes:true,attributeFilter:['class']});
 if(!app.classList.contains('hidden'))window.bamcoOpenHomeWelcome();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
