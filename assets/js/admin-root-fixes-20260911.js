(()=>{
'use strict';
if(window.__bamcoAdminRootFixes20260911)return;
window.__bamcoAdminRootFixes20260911=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];

function loadFreshTemplates(){
  if(q('script[data-bamco-fresh-templates]'))return;
  const s=document.createElement('script');
  s.src='assets/js/templates.js?v=template-root-20260911-4';
  s.async=false;s.setAttribute('data-bamco-fresh-templates','');
  s.onload=()=>{removeTemplateHelp();setTimeout(removeTemplateHelp,80)};
  (document.head||document.documentElement).appendChild(s);
}
function removeTemplateHelp(){
  const view=q('#templatesView');if(!view)return;
  q('.template-help',view)?.remove();
  const btn=q('#openDesktopTemplateEditor',view);if(btn){btn.type='button';btn.textContent='ویرایش متن'}
}
function watchTemplates(){
  const view=q('#templatesView');if(!view)return;
  removeTemplateHelp();
  if(view.dataset.rootTemplateWatch)return;view.dataset.rootTemplateWatch='1';
  let busy=false;
  new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{removeTemplateHelp();busy=false})}).observe(view,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('#nav [data-view="templates"]')){loadFreshTemplates();setTimeout(removeTemplateHelp,0);setTimeout(removeTemplateHelp,120)}},true);
}

function normalizeRequestExport(){
  const b=q('#requestReportView [data-report-export]');if(b)b.textContent='خروجی اکسل';
}
function watchRequestReport(){
  const view=q('#requestReportView');if(!view)return;
  normalizeRequestExport();
  if(view.dataset.rootRequestWatch)return;view.dataset.rootRequestWatch='1';
  new MutationObserver(()=>queueMicrotask(normalizeRequestExport)).observe(view,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{if(e.target.closest('#nav [data-view="requestReport"]'))setTimeout(normalizeRequestExport,60)},true);
}

let stickerWarmPromise=null,stickerCache=null;
async function fetchStickerBlob(path){
  const key=String(path||'');if(!key)return'';
  const encoded=key.split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/stickers/${encoded}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'force-cache'});
  if(!res.ok)throw Error('sticker fetch failed');
  return URL.createObjectURL(await res.blob());
}
async function warmStickers(){
  if(stickerWarmPromise)return stickerWarmPromise;
  stickerWarmPromise=(async()=>{
    if(!state?.token||!state?.profile||state.profile.role!=='manager')return null;
    const [sets,rows]=await Promise.all([
      select('sticker_sets','select=*&order=created_at.asc'),
      select('stickers','select=*&order=set_id,state_key,gender')
    ]);
    const urls=new Map();
    const queue=rows.filter(r=>r.storage_path).slice();
    const workers=Array.from({length:Math.min(4,queue.length||1)},async()=>{
      while(queue.length){const row=queue.shift();try{urls.set(String(row.storage_path),await fetchStickerBlob(row.storage_path))}catch{}}
    });
    await Promise.all(workers);
    stickerCache={sets,rows,urls,at:Date.now()};
    primeStickerView();
    return stickerCache;
  })().catch(()=>null).finally(()=>{if(!stickerCache)stickerWarmPromise=null});
  return stickerWarmPromise;
}
function currentStickerSet(cache){
  const selected=Number(q('#stickerSet')?.value||0);
  return cache.sets.find(s=>Number(s.id)===selected)||cache.sets.find(s=>s.active)||cache.sets[0]||null;
}
function primeStickerView(){
  const cache=stickerCache,view=q('#stickersView');if(!cache||!view)return;
  const setSelect=q('#stickerSet',view),stateSelect=q('#stickerState',view),pair=q('#stickerPair',view),empty=q('#stickerEmpty',view);
  if(!setSelect||!stateSelect||!pair)return;
  if(!cache.sets.length){if(empty)empty.classList.remove('hidden');pair.innerHTML='';return}
  const active=currentStickerSet(cache);if(!active)return;
  const keep=Number(setSelect.value||active.id);
  setSelect.innerHTML=cache.sets.map(s=>`<option value="${s.id}" ${Number(s.id)===keep?'selected':''}>${String(s.name||'نسخه')}${s.active?' — فعال':''}</option>`).join('');
  if(!setSelect.value)setSelect.value=String(active.id);
  if(empty)empty.classList.add('hidden');
  const setId=Number(setSelect.value),stateKey=stateSelect.value||'state1',meta={female:'خانم',male:'آقا'};
  pair.innerHTML=['female','male'].map(g=>{const row=cache.rows.find(r=>Number(r.set_id)===setId&&r.state_key===stateKey&&r.gender===g),src=row?cache.urls.get(String(row.storage_path)):'';return `<article data-side="${g}">${src?`<img src="${src}" alt="${stateKey}">`:'<div>تصویری تعریف نشده است</div>'}<strong>${meta[g]}</strong></article>`}).join('');
}
function watchStickerNav(){
  let tries=0;
  const attempt=()=>{
    if(state?.profile){if(state.profile.role==='manager'&&state.token)warmStickers();return}
    if(++tries<100)setTimeout(attempt,120);
  };
  setTimeout(attempt,0);
  document.addEventListener('click',e=>{
    if(!e.target.closest('#nav [data-view="stickers"]'))return;
    primeStickerView();
    warmStickers();
    requestAnimationFrame(primeStickerView);
    setTimeout(primeStickerView,40);
    setTimeout(primeStickerView,120);
  },true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state?.profile?.role==='manager'&&(!stickerCache||Date.now()-stickerCache.at>120000)){stickerWarmPromise=null;warmStickers()}});
}

function boot(){loadFreshTemplates();watchTemplates();watchRequestReport();watchStickerNav();setTimeout(()=>{removeTemplateHelp();normalizeRequestExport()},300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
