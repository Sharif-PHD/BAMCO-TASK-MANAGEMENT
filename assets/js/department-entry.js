/* Department entry: one stable startup owner, no repeated layout repair loop. */
(()=>{'use strict';
function boot(){
 const login=document.querySelector('#loginView'),app=document.querySelector('#appView'),view=document.querySelector('#departmentEntry');
 if(!login||!app||!view)return;
 const dedupeLogo=()=>{const logos=[...view.querySelectorAll(':scope>header>img')];logos.slice(1).forEach(node=>node.remove())};
 dedupeLogo();new MutationObserver(dedupeLogo).observe(view,{childList:true,subtree:false});
 let selected=false,lastSignedIn=null;
 const showLogin=()=>{
  selected=true;view.hidden=true;document.body.classList.remove('department-pending');login.classList.remove('hidden');login.style.removeProperty('display');app.classList.add('hidden');lastSignedIn=false;
  requestAnimationFrame(()=>document.querySelector('#email')?.focus());
 };
 const showDepartments=()=>{
  selected=false;view.hidden=false;document.body.classList.add('department-pending');login.classList.remove('hidden');login.style.removeProperty('display');app.classList.add('hidden');lastSignedIn=false;
 };
 const sync=()=>{
  const signedIn=!app.classList.contains('hidden');
  if(signedIn){if(!view.hidden)view.hidden=true;document.body.classList.remove('department-pending');lastSignedIn=true;return}
  if(selected){if(!view.hidden)view.hidden=true;document.body.classList.remove('department-pending');login.classList.remove('hidden');lastSignedIn=false;return}
  if(view.hidden)view.hidden=false;document.body.classList.add('department-pending');lastSignedIn=false;
 };
 const product=view.querySelector('[data-department="product"]');
 if(product&&!product.dataset.entryBound){product.dataset.entryBound='1';product.addEventListener('click',showLogin)}
 let back=login.querySelector('.department-back');
 if(!back){back=document.createElement('button');back.type='button';back.className='department-back';back.textContent='بازگشت به انتخاب مدیریت';login.append(back)}
 if(!back.dataset.entryBound){back.dataset.entryBound='1';back.addEventListener('click',showDepartments)}
 new MutationObserver(()=>{const signedIn=!app.classList.contains('hidden');if(signedIn!==lastSignedIn)sync()}).observe(app,{attributes:true,attributeFilter:['class']});
 new MutationObserver(()=>{if(view.hidden&&!app.classList.contains('hidden'))return;if(view.hidden&&document.body.classList.contains('department-pending'))showLogin()}).observe(view,{attributes:true,attributeFilter:['hidden']});
 sync();queueMicrotask(sync);
 const password=document.querySelector('#passwordDialog');password?.addEventListener('cancel',e=>{if(typeof state!=='undefined'&&state.profile?.must_change_password)e.preventDefault()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
