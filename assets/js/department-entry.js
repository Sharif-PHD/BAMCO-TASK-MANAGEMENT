/* Department entry: startup-safe, no dynamic runtime loading. */
(()=>{'use strict';
function boot(){
 const login=document.querySelector('#loginView'),app=document.querySelector('#appView'),view=document.querySelector('#departmentEntry');
 if(!login||!app||!view)return;
 let selected=false,lastSignedIn=null,lastPending=null;
 const showLogin=()=>{
  selected=true;
  view.hidden=true;
  document.body.classList.remove('department-pending');
  login.classList.remove('hidden');
  login.style.removeProperty('display');
  app.classList.add('hidden');
  lastPending=false;lastSignedIn=false;
  requestAnimationFrame(()=>document.querySelector('#email')?.focus());
 };
 const showDepartments=()=>{
  selected=false;
  view.hidden=false;
  document.body.classList.add('department-pending');
  login.classList.remove('hidden');
  login.style.removeProperty('display');
  app.classList.add('hidden');
  lastPending=true;lastSignedIn=false;
 };
 const sync=()=>{
  const signedIn=!app.classList.contains('hidden');
  if(signedIn){
   if(!view.hidden)view.hidden=true;
   if(document.body.classList.contains('department-pending'))document.body.classList.remove('department-pending');
   lastPending=false;lastSignedIn=true;return;
  }
  if(selected){
   if(!view.hidden)view.hidden=true;
   if(document.body.classList.contains('department-pending'))document.body.classList.remove('department-pending');
   if(login.classList.contains('hidden'))login.classList.remove('hidden');
   lastPending=false;lastSignedIn=false;return;
  }
  if(view.hidden)view.hidden=false;
  if(!document.body.classList.contains('department-pending'))document.body.classList.add('department-pending');
  lastPending=true;lastSignedIn=false;
 };
 const product=view.querySelector('[data-department="product"]');
 if(product&&!product.dataset.entryBound){product.dataset.entryBound='1';product.addEventListener('click',showLogin)}
 let back=login.querySelector('.department-back');
 if(!back){back=document.createElement('button');back.type='button';back.className='department-back';back.textContent='بازگشت به انتخاب مدیریت';login.append(back)}
 if(!back.dataset.entryBound){back.dataset.entryBound='1';back.addEventListener('click',showDepartments)}
 new MutationObserver(()=>{const signedIn=!app.classList.contains('hidden');if(signedIn!==lastSignedIn)sync()}).observe(app,{attributes:true,attributeFilter:['class']});
 // Fail-safe: a hidden department selector must never coexist with a pending body
 // because that combination hides both entry and login and produces a blank page.
 new MutationObserver(()=>{if(view.hidden&&!app.classList.contains('hidden'))return;if(view.hidden&&document.body.classList.contains('department-pending'))showLogin()}).observe(view,{attributes:true,attributeFilter:['hidden']});
 sync();
 // Reconcile once after all deferred startup scripts have had a chance to mutate classes.
 queueMicrotask(sync);setTimeout(sync,0);setTimeout(sync,250);
 const password=document.querySelector('#passwordDialog');password?.addEventListener('cancel',e=>{if(typeof state!=='undefined'&&state.profile?.must_change_password)e.preventDefault()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
