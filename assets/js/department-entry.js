/* Department entry: startup-safe, no dynamic runtime loading. */
(()=>{'use strict';
function boot(){
 const login=document.querySelector('#loginView'),app=document.querySelector('#appView'),view=document.querySelector('#departmentEntry');
 if(!login||!app||!view)return;
 let selected=false,lastSignedIn=null,lastPending=null;
 const sync=()=>{
  const signedIn=!app.classList.contains('hidden');
  const shouldHide=signedIn||selected;
  if(view.hidden!==shouldHide)view.hidden=shouldHide;
  const pending=!signedIn&&!selected;
  if(lastPending!==pending){document.body.classList.toggle('department-pending',pending);lastPending=pending}
  lastSignedIn=signedIn;
 };
 const product=view.querySelector('[data-department="product"]');
 if(product&&!product.dataset.entryBound){
  product.dataset.entryBound='1';
  product.addEventListener('click',()=>{
   selected=true;sync();
   requestAnimationFrame(()=>document.querySelector('#email')?.focus());
  });
 }
 let back=login.querySelector('.department-back');
 if(!back){
  back=document.createElement('button');back.type='button';back.className='department-back';back.textContent='بازگشت به انتخاب مدیریت';login.append(back);
 }
 if(!back.dataset.entryBound){back.dataset.entryBound='1';back.addEventListener('click',()=>{selected=false;sync()})}
 new MutationObserver(()=>{const signedIn=!app.classList.contains('hidden');if(signedIn!==lastSignedIn)sync()}).observe(app,{attributes:true,attributeFilter:['class']});
 sync();
 const password=document.querySelector('#passwordDialog');password?.addEventListener('cancel',e=>{if(typeof state!=='undefined'&&state.profile?.must_change_password)e.preventDefault()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
