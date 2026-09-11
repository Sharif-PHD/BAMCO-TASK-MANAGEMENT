/* Department entry: synchronous handoff to login; authorization remains server-owned. */
(()=>{'use strict';
function boot(){
 const login=document.querySelector('#loginView'),app=document.querySelector('#appView'),view=document.querySelector('#departmentEntry');if(!login||!app||!view)return;
 let selected=false;
 const sync=()=>{const signedIn=!app.classList.contains('hidden');view.hidden=signedIn||selected;document.body.classList.toggle('department-pending',!signedIn&&!selected);if(selected&&!signedIn){login.hidden=false;login.classList.remove('hidden')}};
 const enter=()=>{if(selected)return;selected=true;sync();requestAnimationFrame(()=>document.querySelector('#email')?.focus())};
 view.querySelector('[data-department="product"]')?.addEventListener('click',enter,{passive:true});
 document.addEventListener('click',e=>{if(e.target.closest('#departmentEntry [data-department="product"]'))enter()},true);
 let back=login.querySelector('.department-back');if(!back){back=document.createElement('button');back.type='button';back.className='department-back';back.textContent='بازگشت به انتخاب مدیریت';login.append(back)}
 back.onclick=()=>{selected=false;sync()};
 new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
 sync();
 const password=document.querySelector('#passwordDialog');password?.addEventListener('cancel',e=>{if(typeof state!=='undefined'&&state.profile?.must_change_password)e.preventDefault()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
