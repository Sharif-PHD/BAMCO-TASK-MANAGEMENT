(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const eventLabels={drafted:'پیش‌نویس ایجاد شد',submitted:'درخواست ایجاد شد',routed:'وارد زنجیره تأیید شد',approved:'تأیید شد',corrected_and_approved:'اصلاح و تأیید شد',rejected:'رد شد',needs_revision:'جهت اصلاح برگشت داده شد',resubmitted:'دوباره ارسال شد',applied:'تغییر روی وظیفه اعمال شد',cancelled:'لغو شد'};
  const ruleLabels={any:'تأیید یکی از افراد کافی است',all:'تأیید همه افراد الزامی است'};

  function ensureViews(){
    const nav=q('#nav'),workspace=q('.workspace');if(!nav||!workspace||q('#approvalChainsView'))return;
    const button=document.createElement('button');button.dataset.view='approvalChains';button.className='manager-only';button.innerHTML='<b>⌘</b><span>زنجیره تأیید</span>';nav.appendChild(button);
    workspace.insertAdjacentHTML('beforeend',`<section id="approvalChainsView" class="view hidden manager-only"><div class="panel"><div class="panel-head"><div><h3>زنجیره‌های تأیید</h3><small>مسیر بررسی درخواست‌ها بدون تغییر کد قابل تنظیم است.</small></div></div><form id="approvalChainForm" class="approval-chain-form"><label>نام زنجیره<input name="name" required placeholder="برای نمونه: گروه الف"></label><label>کاربران مشمول<select name="members" multiple required></select></label><fieldset><legend>مرحله اول</legend><label>عنوان<input name="stage1_title" value="بررسی سرپرست" required></label><label>تأییدکنندگان<select name="stage1_approvers" multiple required></select></label><label>قانون<select name="stage1_rule"><option value="any">تأیید یکی کافی است</option><option value="all">تأیید همه لازم است</option></select></label></fieldset><fieldset><legend>مرحله دوم</legend><label>عنوان<input name="stage2_title" value="تأیید مدیریت"></label><label>تأییدکنندگان<select name="stage2_approvers" multiple></select></label><label>قانون<select name="stage2_rule"><option value="any">تأیید یکی کافی است</option><option value="all">تأیید همه لازم است</option></select></label></fieldset><label class="chain-default"><input type="checkbox" name="is_default"> زنجیره پیش‌فرض کاربران فاقد گروه</label><button class="primary" type="submit">ثبت زنجیره</button></form><div id="approvalChainList" class="approval-chain-list"></div></div></section>`);
    document.body.insertAdjacentHTML('beforeend',`<dialog id="requestTimelineDialog" class="modal"><div class="modal-head"><div><h3>خط زمانی درخواست <span id="requestTimelineNo"></span></h3><p>سوابق این درخواست قابل حذف نیست.</p></div><button type="button" id="closeRequestTimeline">×</button></div><div id="requestTimelineEvents" class="request-timeline"></div></dialog>`);
    button.addEventListener('click',()=>{if(typeof showView==='function')showView('approvalChains');loadChains()});
    q('#closeRequestTimeline').onclick=()=>q('#requestTimelineDialog').close();
    q('#approvalChainForm').addEventListener('submit',saveChain);
  }

  async function openTimeline(id){
    try{const rows=await select('change_request_events',`request_id=eq.${id}&select=*&order=created_at.asc`);q('#requestTimelineNo').textContent=typeof fa==='function'?fa(id):id;q('#requestTimelineEvents').innerHTML=rows.map(x=>`<article><i></i><div><b>${esc(eventLabels[x.event_type]||x.event_type)}</b><time>${jalaliDateTime(x.created_at)}</time><p>${esc(x.note||'بدون توضیح')}</p></div></article>`).join('')||'<div class="empty">رویدادی ثبت نشده است.</div>';q('#requestTimelineDialog').showModal()}catch(err){toast(err.message,true)}
  }

  function peopleOptions(selected=[]){return (state?.profiles||[]).map(p=>`<option value="${p.id}" ${selected.includes(p.id)?'selected':''}>${esc(p.full_name||p.email)}</option>`).join('')}
  async function loadChains(){
    if(!state?.profile||!isManager())return;
    qa('#approvalChainForm select[multiple]').forEach(s=>{if(!s.options.length)s.innerHTML=peopleOptions()});
    try{const chains=await select('approval_chains','select=*&order=id.desc');const members=await select('approval_chain_members','select=*');const stages=await select('approval_chain_stages','select=*&order=chain_id,stage_no');const approvers=await select('approval_stage_approvers','select=*');const name=id=>(state.profiles||[]).find(p=>p.id===id)?.full_name||'—';q('#approvalChainList').innerHTML=chains.map(c=>{const ms=members.filter(x=>x.chain_id===c.id).map(x=>name(x.user_id)).join('، ')||'بدون عضو';const ss=stages.filter(x=>x.chain_id===c.id).map(s=>`<li><b>${esc(s.title)}</b> — ${esc(approvers.filter(a=>a.stage_id===s.id).map(a=>name(a.approver_id)).join('، '))} <small>(${ruleLabels[s.approval_rule]})</small></li>`).join('');return`<article class="approval-chain-card"><header><div><b>${esc(c.name)}</b>${c.is_default?'<span>پیش‌فرض</span>':''}</div><button class="ghost chain-toggle" data-id="${c.id}" data-active="${c.active}">${c.active?'غیرفعال‌سازی':'فعال‌سازی'}</button></header><p><b>کاربران:</b> ${esc(ms)}</p><ol>${ss}</ol></article>`}).join('')||'<div class="empty">هنوز زنجیره‌ای تعریف نشده است.</div>'}catch(err){toast(err.message,true)}
  }

  async function saveChain(e){
    e.preventDefault();const f=e.currentTarget,fd=new FormData(f),ids=n=>[...f.elements[n].selectedOptions].map(o=>o.value);const members=ids('members'),s1=ids('stage1_approvers'),s2=ids('stage2_approvers');if(!members.length||!s1.length)return toast('کاربران مشمول و تأییدکنندگان مرحله اول را انتخاب کنید.',true);
    try{const chain=(await insert('approval_chains',{name:String(fd.get('name')).trim(),is_default:fd.has('is_default'),created_by:state.profile.id}))[0];await insert('approval_chain_members',members.map(user_id=>({chain_id:chain.id,user_id})));const stages=[{chain_id:chain.id,stage_no:1,title:fd.get('stage1_title'),approval_rule:fd.get('stage1_rule')}];if(s2.length)stages.push({chain_id:chain.id,stage_no:2,title:fd.get('stage2_title')||'تأیید مدیریت',approval_rule:fd.get('stage2_rule')});const created=await insert('approval_chain_stages',stages);await insert('approval_stage_approvers',[...s1.map(approver_id=>({stage_id:created.find(x=>x.stage_no===1).id,approver_id})),...s2.map(approver_id=>({stage_id:created.find(x=>x.stage_no===2).id,approver_id}))]);f.reset();qa('select[multiple]',f).forEach(s=>s.innerHTML=peopleOptions());toast('زنجیره تأیید ثبت شد.');await loadChains()}catch(err){toast(err.message,true)}
  }

  document.addEventListener('click',async e=>{
    const timeline=e.target.closest('.request-timeline-btn');if(timeline){e.preventDefault();openTimeline(timeline.dataset.request);return}
    const toggle=e.target.closest('.chain-toggle');if(toggle){try{await update('approval_chains',`id=eq.${toggle.dataset.id}`,{active:toggle.dataset.active!=='true'});await loadChains()}catch(err){toast(err.message,true)}}
  });
  function boot(){ensureViews();setTimeout(()=>{if(state?.profile&&isManager())loadChains()},1400)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
