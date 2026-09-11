(()=>{
'use strict';
if(window.__bamcoWorkloadSegmentLabels20260911)return;
window.__bamcoWorkloadSegmentLabels20260911=true;
const q=(s,r=document)=>r?.querySelector(s)||null;
const faNum=v=>typeof fa==='function'?fa(v):String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
function rows(){
 const list=(typeof state!=='undefined'&&Array.isArray(state.tasks)?state.tasks:[]).filter(t=>!t.archived&&!window.bamcoOptions?.terminal?.(t));
 const owner=q('#dashOwner')?.value||'همه',priority=q('#dashPriority')?.value||'همه',status=q('#dashStatus')?.value||'همه',bucket=q('#dashBucket')?.value||'همه';
 return list.filter(t=>{
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
function draw(){
 const canvas=q('#workloadChart'),view=q('#dashboardView');
 if(!canvas||view?.classList.contains('hidden'))return;
 const data=rows(),groups=new Map();
 for(const t of data){
  const owner=typeof ownerName==='function'?(ownerName(t)||'—'):'—',p=String(t.priority||'بدون اولویت');
  if(!groups.has(owner))groups.set(owner,new Map());
  const m=groups.get(owner);m.set(p,(m.get(p)||0)+1);
 }
 const owners=[...groups.entries()].sort((a,b)=>[...b[1].values()].reduce((x,y)=>x+y,0)-[...a[1].values()].reduce((x,y)=>x+y,0)).slice(0,10);
 const priorities=[...new Set(data.map(t=>String(t.priority||'بدون اولویت')))];
 const dpr=window.devicePixelRatio||1,w=Math.max(420,canvas.parentElement?.clientWidth||canvas.clientWidth||800),h=445;
 canvas.dataset.logicalHeight=String(h);canvas.style.height=h+'px';canvas.style.width='100%';
 const pixelW=Math.round(w*dpr),pixelH=Math.round(h*dpr);if(canvas.width!==pixelW)canvas.width=pixelW;if(canvas.height!==pixelH)canvas.height=pixelH;
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.direction='rtl';ctx.textAlign='right';ctx.fillStyle='#173f35';ctx.font='bold 21px "B Nazanin",Tahoma,serif';ctx.fillText('حجم کار فعال به تفکیک متولی',w-18,31);
 if(!owners.length){ctx.textAlign='center';ctx.fillStyle='#7a8e85';ctx.font='18px "B Nazanin",Tahoma,serif';ctx.fillText('اطلاعاتی برای نمایش وجود ندارد',w/2,h/2);return}
 const left=60,right=Math.max(left+220,w-185),top=62,bottom=h-82,max=Math.max(1,...owners.map(([,m])=>[...m.values()].reduce((a,b)=>a+b,0))),gap=16,bw=Math.max(42,Math.min(78,((right-left)-gap*(owners.length+1))/owners.length)),scale=(bottom-top)/max;
 for(let step=0;step<=5;step++){const y=bottom-(bottom-top)*step/5;ctx.strokeStyle='#edf2f0';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillStyle='#879a91';ctx.textAlign='right';ctx.font='12px "B Nazanin",Tahoma,serif';ctx.fillText(faNum(Math.round(max*step/5)),left-8,y+4)}
 let x=left+Math.max(0,(right-left-(owners.length*bw+(owners.length+1)*gap))/2)+gap;
 for(const [owner,m] of owners){
  let y=bottom;
  for(const p of priorities){
   const value=m.get(p)||0;if(!value)continue;
   const height=value*scale;
   ctx.fillStyle=window.bamcoOptions?.color?.('priority',p)||'#76a68f';ctx.fillRect(x,y-height,bw,height);
   ctx.fillStyle='#1f2d28';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(height<18?'11px ':'13px ')+'"B Nazanin",Tahoma,serif';ctx.fillText(faNum(value),x+bw/2,y-height/2);
   y-=height;
  }
  ctx.textBaseline='alphabetic';ctx.fillStyle='#435b51';ctx.textAlign='center';ctx.font='12px "B Nazanin",Tahoma,serif';const short=String(owner).replace(/^(جناب آقای|سرکار خانم|مهندس|آقای|خانم)\s+/,'');ctx.fillText(short.length>16?short.slice(0,15)+'…':short,x+bw/2,bottom+20);x+=bw+gap;
 }
 let ly=82;for(const p of priorities){ctx.fillStyle=window.bamcoOptions?.color?.('priority',p)||'#76a68f';ctx.fillRect(w-44,ly-10,16,16);ctx.fillStyle='#435b51';ctx.textAlign='right';ctx.font='14px "B Nazanin",Tahoma,serif';ctx.fillText(p,w-52,ly+2);ly+=27}
}
function schedule(){requestAnimationFrame(()=>requestAnimationFrame(draw))}
function hook(){
 const original=window.renderDashboard;
 if(typeof original==='function'&&!original.__bamcoReferenceWorkload){
  const wrapped=function(...args){const out=original.apply(this,args);schedule();setTimeout(draw,60);return out};wrapped.__bamcoReferenceWorkload=true;window.renderDashboard=wrapped;
 }
 document.addEventListener('change',e=>{if(e.target.matches('#dashOwner,#dashPriority,#dashStatus,#dashBucket'))schedule()});
 document.addEventListener('click',e=>{if(e.target.closest('#resetDashFilters,#nav [data-view="dashboard"]'))schedule()},true);
 addEventListener('resize',()=>{if(typeof state!=='undefined'&&state.view==='dashboard')schedule()},{passive:true});
 new MutationObserver(()=>{if(!q('#dashboardView')?.classList.contains('hidden'))schedule()}).observe(q('#dashboardView')||document.body,{childList:true,subtree:true});
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
