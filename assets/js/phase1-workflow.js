(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const eventLabels={drafted:'پیش‌نویس ایجاد شد',submitted:'درخواست ایجاد شد',routed:'وارد زنجیره تأیید شد',approved:'تأیید شد',corrected_and_approved:'اصلاح و تأیید شد',rejected:'رد شد',needs_revision:'جهت اصلاح برگشت داده شد',resubmitted:'دوباره ارسال شد',applied:'تغییر روی وظیفه اعمال شد',cancelled:'لغو شد'};
  let chainData={chains:[],members:[],stages:[],approvers:[]},editing=null;
  const ruleLabels={any:'تأیید یکی از افراد کافی است',all:'تأیید همه افراد الزامی است'};

  function ensureViews(){
    const nav=q('#nav'),workspace=q('.workspace');if(!nav||!workspace||q('#approvalChainsView'))return;
    const button=document.createElement('button');button.dataset.view='approvalChains';button.className='manager-only';button.innerHTML='<b>⌘</b><span>زنجیره تأیید</span>';nav.appendChild(button);
    workspace.insertAdjacentHTML('beforeend',`<section id="approvalChainsView" class="view hidden manager-only"><div class="panel"><div class="panel-head"><div><h3>زنجیره‌های تأیید</h3><small>مسیر بررسی درخواست‌ها بدون تغییر کد قابل تنظیم است.</small></div></div><form id="approvalChainForm" class="approval-chain-form"><label>نام زنجیره<input name="name" required placeholder="برای نمونه: گروه الف"></label><label>کاربران مشمول<select name="members" multiple required></select></label><fieldset><legend>مرحله اول</legend><label>عنوان<input name="stage1_title" value="بررسی سرپرست" required></label><label>تأییدکنندگان<select name="stage1_approvers" multiple required></select></label><label>قانون<select name="stage1_rule"><option value="any">تأیید یکی کافی است</option><option value="all">تأیید همه لازم است</option></select></label></fieldset><fieldset><legend>مرحله دوم</legend><label>عنوان<input name="stage2_title" value="تأیید مدیریت"></label><label>تأییدکنندگان<select name="stage2_approvers" multiple></select></label><label>قانون<select name="stage2_rule"><option value="any">تأیید یکی کافی است</option><option value="all">تأیید همه لازم است</option></select></label></fieldset><label class="chain-default"><input type="checkbox" name="is_default"> زنجیره پیش‌فرض کاربران فاقد گروه</label><p class="chain-edit-note hidden">تغییرات برای درخواست‌های جدید اعمال می‌شود؛ درخواست‌های در حال بررسی مسیر قبلی خود را ادامه می‌دهند.</p><div class="chain-form-actions"><button class="primary" type="submit">ثبت زنجیره</button><button type="button" class="ghost hidden" id="cancelChainEdit">انصراف از ویرایش</button></div></form><div id="approvalChainList" class="approval-chain-list"></div></div></section>`);
    document.body.insertAdjacentHTML('beforeend',`<dialog id="requestTimelineDialog" class="modal"><div class="modal-head"><div><h3>خط زمانی درخواست <span id="requestTimelineNo"></span></h3><p>سوابق این درخواست قابل حذف نیست.</p></div><button type="button" id="closeRequestTimeline">×</button></div><div id="requestTimelineEvents" class="request-timeline"></div></dialog>`);
    button.addEventListener('click',()=>{if(typeof showView==='function')showView('approvalChains');loadChains()});
    q('#closeRequestTimeline').onclick=()=>q('#requestTimelineDialog').close();
    q('#approvalChainForm').addEventListener('submit',saveChain);q('#cancelChainEdit').onclick=()=>editChain(null);
  }

  async function openTimeline(id){
    try{const rows=await select('change_request_events',`request_id=eq.${id}&select=*&order=created_at.asc`);q('#requestTimelineNo').textContent=typeof fa==='function'?fa(id):id;q('#requestTimelineEvents').innerHTML=rows.map(x=>`<article><i></i><div><b>${esc(eventLabels[x.event_type]||x.event_type)}</b><time>${jalaliDateTime(x.created_at)}</time><p>${esc(x.note||'بدون توضیح')}</p></div></article>`).join('')||'<div class="empty">رویدادی ثبت نشده است.</div>';q('#requestTimelineDialog').showModal()}catch(err){toast(err.message,true)}
  }

  function peopleOptions(selected=[],managers=false){return (state.profiles||[]).filter(p=>p.active&&(!managers||p.role==='manager')).map(p=>`<option value="${p.id}" ${selected.includes(p.id)?'selected':''}>${esc(p.full_name||p.email)}</option>`).join('')}
  function editChain(id){
    const f=q('#approvalChainForm'),c=chainData.chains.find(x=>String(x.id)===String(id));editing=c?.id||null;f.reset();
    f.elements.name.value=c?.name||'';f.elements.is_default.checked=!!c?.is_default;
    f.elements.members.innerHTML=peopleOptions(chainData.members.filter(m=>m.chain_id===c?.id).map(m=>m.user_id));
    for(const n of [1,2]){const stage=chainData.stages.find(x=>x.chain_id===c?.id&&Number(x.stage_no)===n);f.elements['stage'+n+'_title'].value=stage?.title||(n===1?'بررسی سرپرست':'تأیید مدیریت');f.elements['stage'+n+'_rule'].value=stage?.approval_rule||'any';f.elements['stage'+n+'_approvers'].innerHTML=peopleOptions(chainData.approvers.filter(a=>a.stage_id===stage?.id).map(a=>a.approver_id),true)}
    q('[type=submit]',f).textContent=c?'ذخیره تغییرات':'ثبت زنجیره';q('#cancelChainEdit').classList.toggle('hidden',!c);q('.chain-edit-note',f).classList.toggle('hidden',!c);if(c)f.elements.name.focus();
  }
  async function loadChains(){
    if(!state.profile||!isManager())return;
    try{const [chains,members,stages,approvers]=await Promise.all([select('approval_chains','select=*&superseded_by=is.null&order=id.desc'),select('approval_chain_members','select=*'),select('approval_chain_stages','select=*&order=chain_id,stage_no'),select('approval_stage_approvers','select=*')]);chainData={chains,members,stages,approvers};if(!editing)editChain(null);const name=id=>(state.profiles||[]).find(p=>p.id===id)?.full_name||'—';
      q('#approvalChainList').innerHTML=chains.map(c=>{const ms=members.filter(x=>x.chain_id===c.id).map(x=>name(x.user_id)).join('، ')||'بدون عضو';const ss=stages.filter(x=>x.chain_id===c.id).map(s=>`<li><b>${esc(s.title)}</b> — ${esc(approvers.filter(a=>a.stage_id===s.id).map(a=>name(a.approver_id)).join('، '))} <small>(${ruleLabels[s.approval_rule]})</small></li>`).join('');return `<article class="approval-chain-card"><header><div><b>${esc(c.name)}</b>${c.is_default?'<span>پیش‌فرض</span>':''}</div><div class="chain-card-actions"><button type="button" class="ghost chain-edit" data-id="${c.id}">ویرایش</button><button type="button" class="ghost chain-toggle" data-id="${c.id}" data-active="${c.active}">${c.active?'غیرفعال‌سازی':'فعال‌سازی'}</button></div></header><p><b>کاربران:</b> ${esc(ms)}</p><ol>${ss}</ol></article>`}).join('')||'<div class="empty">هنوز زنجیره‌ای تعریف نشده است.</div>';
    }catch(err){toast(err.message,true)}
  }
  async function saveChain(e){
    e.preventDefault();const f=e.currentTarget,fd=new FormData(f),button=q('[type=submit]',f),ids=n=>[...f.elements[n].selectedOptions].map(o=>o.value);if(button.disabled)return;const members=ids('members'),s1=ids('stage1_approvers'),s2=ids('stage2_approvers');if(!members.length||!s1.length)return toast('کاربران مشمول و تأییدکنندگان مرحله اول را انتخاب کنید.',true);
    button.disabled=true;try{const stages=[{title:fd.get('stage1_title'),rule:fd.get('stage1_rule'),approvers:s1}];if(s2.length)stages.push({title:fd.get('stage2_title')||'تأیید مدیریت',rule:fd.get('stage2_rule'),approvers:s2});await rpc('save_approval_chain',{p_chain_id:editing,p_name:String(fd.get('name')).trim(),p_member_ids:members,p_stages:stages,p_is_default:fd.has('is_default')});toast(editing?'تغییرات زنجیره ذخیره شد.':'زنجیره تأیید ثبت شد.');editChain(null);await loadChains()}catch(err){toast(err.message,true)}finally{button.disabled=false}
  }

  document.addEventListener('click',async e=>{
    const timeline=e.target.closest('.request-timeline-btn');if(timeline){e.preventDefault();openTimeline(timeline.dataset.request);return}
    const edit=e.target.closest('.chain-edit');if(edit){editChain(edit.dataset.id);return}const toggle=e.target.closest('.chain-toggle');if(toggle){try{await update('approval_chains',`id=eq.${toggle.dataset.id}`,{active:toggle.dataset.active!=='true'});await loadChains()}catch(err){toast(err.message,true)}}
  });
  function boot(){ensureViews();setTimeout(()=>{if(state?.profile&&isManager())loadChains()},1400)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
