(()=>{
'use strict';
if(window.__bamcoLoginAvatarWorkloadFix20260911)return;
window.__bamcoLoginAvatarWorkloadFix20260911=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const faNum=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
let avatarObjectUrl='',avatarRun=0;

function avatarInitial(){
  const p=typeof state!=='undefined'?state.profile:null;
  return String(p?.display_name||p?.full_name||'ب').trim().charAt(0)||'ب';
}
function paintAvatar(el,url=''){
  if(!el)return;
  el.innerHTML='';
  el.style.removeProperty('background-image');
  if(url){
    const img=document.createElement('img');
    img.alt='تصویر پروفایل';img.src=url;
    img.style.cssText='width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important';
    el.appendChild(img);el.classList.add('has-image');
  }else{
    el.textContent=avatarInitial();el.classList.remove('has-image');
  }
}
async function refreshAvatarAfterLogin(){
  const run=++avatarRun,p=typeof state!=='undefined'?state.profile:null,token=typeof state!=='undefined'?state.token:'';
  if(!p||!token)return;
  paintAvatar(q('#avatar'));paintAvatar(q('#profileAvatarPreview'));
  if(!p.avatar_path)return;
  try{
    const path=String(p.avatar_path).split('/').map(encodeURIComponent).join('/');
    const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/avatars/${path}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${token}`},cache:'no-store'});
    if(!res.ok)throw new Error(`avatar ${res.status}`);
    const url=URL.createObjectURL(await res.blob());
    if(run!==avatarRun){URL.revokeObjectURL(url);return}
    if(avatarObjectUrl)URL.revokeObjectURL(avatarObjectUrl);
    avatarObjectUrl=url;paintAvatar(q('#avatar'),url);paintAvatar(q('#profileAvatarPreview'),url);
  }catch(err){
    console.error('post-login-avatar-sync',err);
    try{await window.refreshProfileAvatar?.()}catch{}
  }
}
function scheduleAvatar(){[0,80,250,700,1500].forEach(ms=>setTimeout(()=>{const app=q('#appView');if(app&&!app.classList.contains('hidden'))void refreshAvatarAfterLogin()},ms))}

function filteredTasks(){
  const rows=(typeof state!=='undefined'?state.tasks:[]||[]).filter(t=>!t.archived&&!window.bamcoOptions?.terminal?.(t));
  const owner=q('#dashOwner')?.value||'همه',priority=q('#dashPriority')?.value||'همه',status=q('#dashStatus')?.value||'همه',bucket=q('#dashBucket')?.value||'همه';
  return rows.filter(t=>{
    if(owner!=='همه'&&typeof ownerName==='function'&&norm(ownerName(t))!==norm(owner))return false;
    if(priority!=='همه'&&norm(t.priority)!==norm(priority))return false;
    if(status!=='همه'&&norm(t.status)!==norm(status))return false;
    if(bucket!=='همه'){
      const due=String(t.due_state||''),b=due==='دیرکرد'?'دیرکرد':due.includes('هشدار')?'دوره هشدار':'فاقد شرایط دیرکرد';
      if(norm(b)!==norm(bucket))return false;
    }
    return true;
  });
}
function drawSimpleWorkload(){
  const canvas=q('#workloadChart'),view=q('#dashboardView');if(!canvas||view?.classList.contains('hidden'))return;
  const rows=filteredTasks(),groups=new Map();
  for(const t of rows){const owner=typeof ownerName==='function'?(ownerName(t)||'—'):'—',p=String(t.priority||'بدون اولویت');if(!groups.has(owner))groups.set(owner,new Map());const m=groups.get(owner);m.set(p,(m.get(p)||0)+1)}
  const owners=[...groups.entries()].sort((a,b)=>[...b[1].values()].reduce((x,y)=>x+y,0)-[...a[1].values()].reduce((x,y)=>x+y,0)).slice(0,10);
  const priorities=[...new Set(rows.map(t=>String(t.priority||'بدون اولویت')))];
  const dpr=window.devicePixelRatio||1,w=Math.max(420,canvas.parentElement?.clientWidth||canvas.clientWidth||800),h=445;
  canvas.style.height=h+'px';canvas.style.width='100%';canvas.dataset.logicalHeight=String(h);
  const pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(canvas.width!==pw)canvas.width=pw;if(canvas.height!==ph)canvas.height=ph;
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.direction='rtl';ctx.textAlign='right';ctx.fillStyle='#173f35';ctx.font='bold 21px "B Nazanin",Tahoma,serif';ctx.fillText('حجم کار فعال به تفکیک متولی',w-18,31);
  if(!owners.length){ctx.textAlign='center';ctx.fillStyle='#7a8e85';ctx.font='18px "B Nazanin",Tahoma,serif';ctx.fillText('اطلاعاتی برای نمایش وجود ندارد',w/2,h/2);return}
  const left=60,right=Math.max(left+220,w-185),top=66,bottom=h-82,max=Math.max(1,...owners.map(([,m])=>[...m.values()].reduce((a,b)=>a+b,0))),gap=16,bw=Math.max(42,Math.min(78,((right-left)-gap*(owners.length+1))/owners.length)),scale=(bottom-top)/max;
  for(let step=0;step<=5;step++){const y=bottom-(bottom-top)*step/5;ctx.strokeStyle='#edf2f0';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillStyle='#879a91';ctx.textAlign='right';ctx.font='12px "B Nazanin",Tahoma,serif';ctx.fillText(faNum(Math.round(max*step/5)),left-8,y+4)}
  let x=left+Math.max(0,(right-left-(owners.length*bw+(owners.length+1)*gap))/2)+gap;
  for(const [owner,m] of owners){
    let y=bottom;const total=[...m.values()].reduce((a,b)=>a+b,0);
    for(const p of priorities){const value=m.get(p)||0;if(!value)continue;const height=value*scale;ctx.fillStyle=window.bamcoOptions?.color?.('priority',p)||'#76a68f';ctx.fillRect(x,y-height,bw,height);y-=height}
    ctx.textAlign='center';ctx.fillStyle='#173f35';ctx.font='bold 16px "B Nazanin",Tahoma,serif';ctx.fillText(faNum(total),x+bw/2,Math.max(top+15,y-8));
    ctx.fillStyle='#435b51';ctx.font='12px "B Nazanin",Tahoma,serif';const short=String(owner).replace(/^(جناب آقای|سرکار خانم|مهندس|آقای|خانم)\s+/,'');ctx.fillText(short.length>16?short.slice(0,15)+'…':short,x+bw/2,bottom+20);x+=bw+gap;
  }
  let ly=82;for(const p of priorities){ctx.fillStyle=window.bamcoOptions?.color?.('priority',p)||'#76a68f';ctx.fillRect(w-44,ly-10,16,16);ctx.fillStyle='#435b51';ctx.textAlign='right';ctx.font='14px "B Nazanin",Tahoma,serif';ctx.fillText(p,w-52,ly+2);ly+=27}
}
function hookWorkload(){
  const apply=()=>{const original=window.renderDashboard;if(typeof original!=='function'||original.__bamcoSimpleWorkloadLabel)return false;const wrapped=function(...args){const out=original.apply(this,args);requestAnimationFrame(()=>requestAnimationFrame(drawSimpleWorkload));return out};wrapped.__bamcoSimpleWorkloadLabel=true;window.renderDashboard=wrapped;return true};
  if(!apply()){let tries=0,t=setInterval(()=>{if(apply()||++tries>60)clearInterval(t)},100)}
  document.addEventListener('change',e=>{if(e.target.matches('#dashOwner,#dashPriority,#dashStatus,#dashBucket'))requestAnimationFrame(()=>requestAnimationFrame(drawSimpleWorkload))});
  document.addEventListener('click',e=>{if(e.target.closest('#resetDashFilters,#nav [data-view="dashboard"]'))setTimeout(drawSimpleWorkload,50)},true);
  addEventListener('resize',()=>{if(typeof state!=='undefined'&&state.view==='dashboard')requestAnimationFrame(drawSimpleWorkload)},{passive:true});
}
function boot(){
  const app=q('#appView');if(app){new MutationObserver(()=>{if(!app.classList.contains('hidden'))scheduleAvatar()}).observe(app,{attributes:true,attributeFilter:['class']});if(!app.classList.contains('hidden'))scheduleAvatar()}
  new MutationObserver(()=>{if(document.body.classList.contains('card-home-active'))scheduleAvatar()}).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('pageshow',scheduleAvatar);hookWorkload();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
