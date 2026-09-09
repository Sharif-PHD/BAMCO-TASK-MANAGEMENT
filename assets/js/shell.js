/* module:shell:1 */
(()=>{
  'use strict';
  const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nav=q('#nav'),workspace=q('.workspace');if(!nav||!workspace)return;
  nav.insertAdjacentHTML('beforeend','<button data-view="people" class="manager-only"><b>♙</b><span>افراد و نقش‌ها</span></button><button data-view="templates" class="manager-only"><b>≡</b><span>متن پیام‌ها</span></button><button data-view="stickers" class="manager-only"><b>◇</b><span>مدیریت استیکرها</span></button><button data-view="settings"><b>⚙</b><span>تنظیمات</span></button>');
  workspace.insertAdjacentHTML('beforeend',`
  <section id="peopleView" class="view hidden manager-only"><div class="panel table-panel"><div class="panel-head"><div><h3>مدیریت افراد و نقش‌ها</h3><small>حساب کاربران، نام متولی در کانبان و سطح دسترسی</small></div><input id="peopleSearch" class="search" placeholder="جست‌وجو…"></div><div class="people-actions"><button id="addPersonBtn" class="primary">＋ افزودن فرد</button><button id="editPersonBtn" class="ghost">ویرایش</button><button id="deletePersonBtn" class="danger">حذف</button></div><div class="table-wrap"><table class="manager-table"><thead><tr><th>نام متولی</th><th>نقش</th><th>جنسیت</th><th>نام کاربری</th><th>عنوان خطاب</th><th>فعال</th></tr></thead><tbody id="peopleBody"></tbody></table></div></div></section>
  <section id="templatesView" class="view hidden manager-only"><div class="panel"><div class="panel-head"><div><h3>متن پیام‌ها</h3><small>متن پیام داخل سامانه بر اساس وضعیت متولی</small></div><div class="manager-toolbar"><select id="templateState"><option value="state1">وضعیت مطلوب</option><option value="state2">یادآوری</option><option value="state3">نیازمند توجه</option><option value="state4">پیگیری جدی</option><option value="state5">اقدام فوری</option><option value="followup">یادآوری مجدد</option></select><button id="saveTemplateBtn" class="primary">ذخیره متن</button></div></div><div class="manager-note">متغیرها: [عنوان مخاطب]، [تعداد هشدار]، [تعداد دیرکرد]، [جدول امور هشداری]، [جدول امور دیرکردی]، [استیکر] و [تاریخ گزارش]</div><textarea id="templateBody" class="template-editor"></textarea></div></section>
  <section id="stickersView" class="view hidden manager-only"><div class="panel"><div class="panel-head"><div><h3>مدیریت استیکرها</h3><small>نسخه را تعریف کنید و ده تصویر آن را در پایگاه داده بارگذاری کنید.</small></div></div><div id="stickerGrid" hidden></div></div></section>
  <section id="settingsView" class="view hidden"><div class="panel"><div class="panel-head"><div><h3>تنظیمات حساب کاربری</h3><small>نام نمایشی، تصویر پروفایل و امنیت حساب</small></div></div><div class="manager-form"><label>نام نمایشی<input id="profileDisplayName"></label><label>نام کاربری<input id="profileEmail" class="english" dir="ltr" readonly></label><div class="profile-photo-field"><div id="profileAvatarPreview" class="profile-avatar-preview">ب</div><div><b>تصویر پروفایل</b><p>PNG، JPG یا WebP تا ۸ مگابایت</p><button id="chooseAvatarBtn" type="button" class="ghost">انتخاب و تنظیم عکس</button><input id="profileAvatar" type="file" accept="image/png,image/jpeg,image/webp" hidden></div></div><div class="account-security-box"><div><h4>تغییر رمز عبور</h4><p>رمز حساب خود را از این بخش تغییر دهید.</p></div><button id="changePasswordBtn" type="button" class="primary">تغییر رمز عبور</button></div></div><div class="modal-actions"><button id="saveProfileBtn" class="primary">ذخیره تنظیمات حساب</button></div></div></section>
  <dialog id="personDialog" class="modal manager-modal"><form id="personForm"><div class="modal-head"><div><h3 id="personDialogTitle">افزودن فرد</h3><p>حساب کاربری و سطح دسترسی</p></div><button type="button" data-person-close>×</button></div><div class="manager-form"><label>نام متولی در کانبان<input name="full_name" required></label><label>نقش<select name="role"><option value="owner">متولی</option><option value="manager">مدیر</option></select></label><label>جنسیت<select name="gender"><option>آقا</option><option>خانم</option></select></label><label>نام کاربری<input name="email" class="english" dir="ltr" type="email" required></label><label>رمز اولیه<input name="initial_password" class="english" dir="ltr" type="password" minlength="8"></label><label>عنوان خطاب<input name="salutation"></label><label>کانال پیش‌فرض پیام<select name="default_message_channel"><option value="portal">داخل سامانه</option><option value="email">ایمیل</option><option value="both">هر دو</option></select></label><label>فعال<select name="active"><option value="true">بله</option><option value="false">خیر</option></select></label></div><div class="modal-actions"><button type="button" class="ghost" data-person-close>انصراف</button><button type="submit" class="primary">ذخیره</button></div></form></dialog>`);
  let people=[],editing=null,selected=null,templates=[];
  async function edge(body={},method='POST'){const r=await fetch(`${SB_URL}/functions/v1/admin-users`,{method,headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'عملیات حساب کاربری انجام نشد.');return d}
  async function loadPeople(){people=await select('profiles','select=id,email,full_name,display_name,role,gender,salutation,active,default_message_channel&order=full_name');renderPeople()}
  function renderPeople(){const term=q('#peopleSearch').value.trim().toLowerCase(),rows=people.filter(p=>!term||[p.full_name,p.email,p.role,p.salutation].some(v=>String(v||'').toLowerCase().includes(term)));q('#peopleBody').innerHTML=rows.map(p=>`<tr data-id="${p.id}" class="${selected===p.id?'person-selected':''}"><td>${esc(p.full_name)}</td><td>${p.role==='manager'?'مدیر':'متولی'}</td><td>${esc(p.gender||'—')}</td><td class="english">${esc(p.email)}</td><td>${esc(p.salutation||'—')}</td><td>${p.active!==false?'بله':'خیر'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">کاربری ثبت نشده است.</td></tr>'}
  function openPerson(p=null){editing=p;const f=q('#personForm');f.reset();f.elements.role.value='owner';f.elements.active.value='true';if(p)for(const k of ['full_name','role','gender','email','salutation','active','default_message_channel'])if(f.elements[k])f.elements[k].value=String(p[k]??'');f.elements.email.readOnly=!!p;q('#personDialogTitle').textContent=p?'ویرایش فرد':'افزودن فرد';q('#personDialog').showModal()}
  async function savePerson(e){e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));data.active=data.active==='true';try{if(editing){delete data.initial_password;delete data.email;await update('profiles',`id=eq.${editing.id}`,data)}else{if(!data.initial_password)throw new Error('رمز اولیه الزامی است.');await edge(data)}q('#personDialog').close();toast('اطلاعات فرد ذخیره شد.');await loadPeople()}catch(err){toast(err.message,true)}}
  async function removePerson(){const p=people.find(x=>x.id===selected);if(!p)return toast('یک فرد را انتخاب کنید.',true);if(!confirm(`حساب «${p.full_name}» حذف شود؟`))return;try{await edge({user_id:p.id},'DELETE');selected=null;await loadPeople();toast('حساب کاربری حذف شد.')}catch(err){toast(err.message,true)}}
  async function loadTemplates(){templates=await select('message_templates','select=*&order=template_key');showTemplate()}
  function showTemplate(){q('#templateBody').value=templates.find(x=>x.template_key===q('#templateState').value)?.body_text||''}
  async function saveTemplate(){const key=q('#templateState').value,body_text=q('#templateBody').value,row=templates.find(x=>x.template_key===key);try{row?await update('message_templates',`id=eq.${row.id}`,{body_text}):await insert('message_templates',{template_key:key,body_text});await loadTemplates();toast('متن پیام ذخیره شد.')}catch(err){toast(err.message,true)}}
  let avatarUrl='',pendingBlob=null,pendingUrl='',cropImage=null,zoom=1,offX=0,offY=0,drag=false,last=null;
  function paint(el,url=''){if(!el)return;el.textContent=(state.profile.display_name||state.profile.full_name||'ب').trim()[0];el.classList.toggle('has-image',!!url);el.style.backgroundImage=url?`url("${url}")`:''}
  window.refreshProfileAvatar=async()=>{if(!state.profile)return;if(avatarUrl)URL.revokeObjectURL(avatarUrl);avatarUrl='';paint(q('#avatar'));paint(q('#profileAvatarPreview'));if(!state.profile.avatar_path)return;try{const path=state.profile.avatar_path.split('/').map(encodeURIComponent).join('/'),r=await fetch(`${SB_URL}/storage/v1/object/authenticated/avatars/${path}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'no-store'});if(!r.ok)throw new Error('دریافت عکس انجام نشد.');avatarUrl=URL.createObjectURL(await r.blob());paint(q('#avatar'),avatarUrl);paint(q('#profileAvatarPreview'),avatarUrl)}catch(err){toast(err.message,true)}};
  function metrics(){const base=Math.max(360/cropImage.naturalWidth,360/cropImage.naturalHeight),scale=base*zoom,maxX=Math.max(0,(cropImage.naturalWidth*scale-360)/2),maxY=Math.max(0,(cropImage.naturalHeight*scale-360)/2);offX=Math.max(-maxX,Math.min(maxX,offX));offY=Math.max(-maxY,Math.min(maxY,offY));return{scale,x:(360-cropImage.naturalWidth*scale)/2+offX,y:(360-cropImage.naturalHeight*scale)/2+offY}}
  function draw(){if(!cropImage)return;const c=q('#avatarCropCanvas'),ctx=c.getContext('2d'),m=metrics();ctx.clearRect(0,0,360,360);ctx.drawImage(cropImage,m.x,m.y,cropImage.naturalWidth*m.scale,cropImage.naturalHeight*m.scale);ctx.fillStyle='rgba(5,25,19,.55)';ctx.beginPath();ctx.rect(0,0,360,360);ctx.arc(180,180,164,0,Math.PI*2,true);ctx.fill('evenodd');ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(180,180,164,0,Math.PI*2);ctx.stroke()}
  function openCrop(file){if(!file)return;if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))return toast('فایل باید تصویر PNG، JPG یا WebP و حداکثر ۸ مگابایت باشد.',true);const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);cropImage=img;zoom=1;offX=offY=0;q('#avatarCropZoom').value=1;draw();q('#avatarCropDialog').showModal()};img.onerror=()=>toast('تصویر قابل خواندن نیست.',true);img.src=url}
  function point(e){const r=q('#avatarCropCanvas').getBoundingClientRect();return{x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*360/r.height}}
  function applyCrop(){if(!cropImage)return;const out=document.createElement('canvas'),m=metrics(),ctx=out.getContext('2d');out.width=out.height=512;ctx.save();ctx.beginPath();ctx.arc(256,256,256,0,Math.PI*2);ctx.clip();ctx.drawImage(cropImage,m.x*512/360,m.y*512/360,cropImage.naturalWidth*m.scale*512/360,cropImage.naturalHeight*m.scale*512/360);ctx.restore();out.toBlob(blob=>{pendingBlob=blob;if(pendingUrl)URL.revokeObjectURL(pendingUrl);pendingUrl=URL.createObjectURL(blob);paint(q('#profileAvatarPreview'),pendingUrl);q('#avatarCropDialog').close();toast('برش عکس آماده است؛ ذخیره تنظیمات حساب را بزنید.');},'image/png')}
  async function saveProfile(){try{const display_name=q('#profileDisplayName').value.trim();let avatar_path=state.profile.avatar_path||null;if(pendingBlob){avatar_path=`${state.profile.id}/avatar.png`;const path=avatar_path.split('/').map(encodeURIComponent).join('/'),r=await fetch(`${SB_URL}/storage/v1/object/avatars/${path}`,{method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`,'x-upsert':'true','Content-Type':'image/png'},body:pendingBlob});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).message||'آپلود تصویر انجام نشد.')}const rows=await update('profiles',`id=eq.${state.profile.id}`,{display_name,avatar_path,updated_at:new Date().toISOString()});state.profile={...state.profile,...rows[0]};pendingBlob=null;q('#userName').textContent=display_name||state.profile.full_name;await window.refreshProfileAvatar();toast('تنظیمات حساب ذخیره شد.')}catch(err){toast(err.message,true)}}
  function loadSettings(){q('#profileDisplayName').value=state.profile.display_name||state.profile.full_name||'';q('#profileEmail').value=state.profile.email||'';window.refreshProfileAvatar()}
  document.addEventListener('DOMContentLoaded',()=>{
    if(!q('#saveTemplateBtn'))document.body.insertAdjacentHTML('beforeend','<button id="saveTemplateBtn" type="button" hidden></button>');
    q('#peopleSearch').addEventListener('input',renderPeople);q('#peopleBody').addEventListener('click',e=>{const tr=e.target.closest('[data-id]');if(tr){selected=tr.dataset.id;renderPeople()}});q('#peopleBody').addEventListener('dblclick',()=>openPerson(people.find(x=>x.id===selected)));q('#addPersonBtn').addEventListener('click',()=>openPerson());q('#editPersonBtn').addEventListener('click',()=>{const p=people.find(x=>x.id===selected);p?openPerson(p):toast('یک فرد را انتخاب کنید.',true)});q('#deletePersonBtn').addEventListener('click',removePerson);q('#personForm').addEventListener('submit',savePerson);document.querySelectorAll('[data-person-close]').forEach(x=>x.addEventListener('click',()=>q('#personDialog').close()));
    q('#templateState').addEventListener('change',showTemplate);q('#saveTemplateBtn').addEventListener('click',saveTemplate);q('#chooseAvatarBtn').addEventListener('click',()=>q('#profileAvatar').click());q('#profileAvatar').addEventListener('change',e=>{openCrop(e.target.files[0]);e.target.value=''});q('#avatarCropZoom').addEventListener('input',e=>{zoom=Number(e.target.value);draw()});const canvas=q('#avatarCropCanvas');canvas.addEventListener('pointerdown',e=>{drag=true;last=point(e);canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e);offX+=p.x-last.x;offY+=p.y-last.y;last=p;draw()});canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);q('#applyAvatarCrop').addEventListener('click',applyCrop);q('#saveProfileBtn').addEventListener('click',saveProfile);q('#changePasswordBtn').addEventListener('click',()=>{q('#cancelPasswordBtn').classList.remove('hidden');q('#passwordForm').reset();q('#passwordDialog').showModal()});
    q('#nav').addEventListener('click',e=>{const view=e.target.closest('button[data-view]')?.dataset.view;if(view==='people'&&isManager())setTimeout(loadPeople);if(view==='templates'&&isManager())setTimeout(loadTemplates);if(view==='settings')setTimeout(loadSettings)});
  });
})();



/* module:shell:2 */
(()=>{
  'use strict';
  if(window.__bamcoAvatarHardFix)return;
  window.__bamcoAvatarHardFix='v5';
  let currentObjectUrl='';

  // The release builder includes the profile layout in bamco-unified.css.

  const appState=()=>typeof state!=='undefined'?state:null;
  function label(){
    const p=appState()?.profile;
    return String(p?.display_name||p?.full_name||'ب').trim().charAt(0)||'ب';
  }
  function render(el,url=''){
    if(!el)return;
    el.innerHTML='';
    el.style.removeProperty('background-image');
    if(url){
      const img=document.createElement('img');
      img.alt='تصویر پروفایل';img.src=url;
      img.style.setProperty('width','100%','important');
      img.style.setProperty('height','100%','important');
      img.style.setProperty('object-fit','cover','important');
      img.style.setProperty('display','block','important');
      img.style.setProperty('border-radius','50%','important');
      el.appendChild(img);el.classList.add('has-image');
    }else{
      el.textContent=label();el.classList.remove('has-image');
    }
  }

  async function refresh(){
    const s=appState(),p=s?.profile;
    if(!p||!s?.token)return;
    if(currentObjectUrl){URL.revokeObjectURL(currentObjectUrl);currentObjectUrl='';}
    render(document.querySelector('#avatar'));
    render(document.querySelector('#profileAvatarPreview'));
    if(!p.avatar_path)return;
    try{
      const path=String(p.avatar_path).split('/').map(encodeURIComponent).join('/');
      const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/avatars/${path}`,{
        headers:{apikey:SB_KEY,Authorization:`Bearer ${s.token}`},cache:'no-store'
      });
      if(!res.ok)throw new Error('دریافت تصویر پروفایل انجام نشد.');
      currentObjectUrl=URL.createObjectURL(await res.blob());
      render(document.querySelector('#avatar'),currentObjectUrl);
      render(document.querySelector('#profileAvatarPreview'),currentObjectUrl);
    }catch(err){
      console.error('avatar-display-hard-fix',err);
    }
  }

  window.refreshProfileAvatar=refresh;
  const style=document.createElement('style');
  style.id='avatarHardFixStyle';
  style.textContent=`
    #appView #avatar,#settingsView #profileAvatarPreview{border-radius:50%!important;overflow:hidden!important;background-image:none!important}
    #appView #avatar>img,#settingsView #profileAvatarPreview>img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important}
  `;
  document.head.appendChild(style);
  [0,250,800,1600].forEach(ms=>setTimeout(()=>{if(appState()?.profile)refresh()},ms));
})();



/* module:shell:3 */
(()=>{
  const nav=document.querySelector('#nav'),workspace=document.querySelector('.workspace');if(!nav||!workspace)return;
  document.querySelector('#templatesView h3')?.replaceChildren('متن پیام‌ها');
  const templateHint=document.querySelector('#templatesView .panel-head small');if(templateHint)templateHint.textContent='متن پیام داخل سامانه بر اساس وضعیت متولی';
  const stickerHint=document.querySelector('#stickersView .panel-head small');if(stickerHint)stickerHint.textContent='استیکرهای پیام برای پنج وضعیت متولی';
  nav.insertAdjacentHTML('beforeend','<button data-view="messages"><b>✉</b><span>پیام‌ها</span><i id="messageBadge" class="message-badge"></i></button><button data-view="sentMessages" class="manager-only"><b>✓</b><span>پیام‌های ارسال‌شده</span></button>');
  workspace.insertAdjacentHTML('beforeend',`<section id="messagesView" class="view hidden"><div class="panel"><div class="panel-head"><h3>پیام‌های من</h3><button id="refreshMessages" class="ghost">به‌روزرسانی</button></div><div id="messageList" class="message-list"></div></div></section><section id="sentMessagesView" class="view hidden manager-only"><div class="message-layout"><div class="panel"><div class="panel-head"><h3>پیام‌های ارسال‌شده</h3></div><div id="sentMessageList" class="message-list"></div></div><form id="messageCompose" class="panel message-compose"><h3>ارسال پیام جدید</h3><label>گیرندگان<select id="messageAudience"><option value="all">همه کاربران فعال</option><option value="selected">افراد منتخب</option></select></label><label id="messageRecipientsWrap" class="hidden">افراد<select id="messageRecipients" multiple size="7"></select></label><label>عنوان<input name="subject" required></label><label>اهمیت<select name="importance"><option value="normal">عادی</option><option value="important">مهم</option><option value="urgent">فوری</option></select></label><label>متن پیام<textarea name="body" required></textarea></label><label><input name="require_ack" type="checkbox"> تأیید دریافت الزامی است</label><label><input name="allow_reply" type="checkbox" checked> امکان پاسخ فعال باشد</label><button class="primary" type="submit">ارسال در پرتال</button></form></div></section>`);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){if(!state?.profile)return;const rows=await select('portal_message_recipients',`recipient_id=eq.${state.profile.id}&select=*,portal_messages(*)&order=message_id.desc`);const unread=rows.filter(x=>!x.read_at).length;document.querySelector('#messageBadge').textContent=unread?fa(unread):'';document.querySelector('#messageList').innerHTML=rows.map(x=>{const m=x.portal_messages||{};return `<article class="message-card ${x.read_at?'':'unread'} ${m.importance==='urgent'?'urgent':''}" data-mid="${x.message_id}"><div class="message-meta"><b>${esc(m.subject)}</b><span>${jalaliDateTime(m.created_at)}</span></div><p>${esc(m.body)}</p><div class="message-actions">${m.require_ack&&!x.acknowledged_at?'<button class="ghost ack-message">تأیید دریافت</button>':''}${m.allow_reply?`<button class="ghost reply-message">پاسخ</button><div class="message-reply-box hidden"><textarea placeholder="پاسخ شما…">${esc(x.reply_text||'')}</textarea><button class="primary save-reply">ثبت پاسخ</button></div>`:''}</div></article>`}).join('')||'<div class="empty">پیامی برای شما ثبت نشده است.</div>'}
  let sentRows=[];
  async function loadSent(){if(!isManager())return;sentRows=await select('portal_messages',`sender_id=eq.${state.profile.id}&select=*,portal_message_recipients(*)&order=created_at.desc`);document.querySelector('#sentMessageList').innerHTML=sentRows.map(m=>{const rs=m.portal_message_recipients||[],read=rs.filter(x=>x.read_at).length,replied=rs.filter(x=>x.replied_at).length,pending=rs.filter(x=>!x.replied_at).length;return`<article class="message-card"><div class="message-meta"><b>${esc(m.subject)}</b><span>${jalaliDateTime(m.created_at)}</span></div><p>${esc(m.body)}</p><small>${fa(read)} از ${fa(rs.length)} مشاهده؛ ${fa(replied)} پاسخ؛ ${fa(pending)} بدون پاسخ</small>${m.allow_reply&&pending?`<button class="ghost remind-message" data-mid="${m.id}">یادآوری به افراد بدون پاسخ</button>`:''}</article>`}).join('')||'<div class="empty">هنوز پیامی ارسال نشده است.</div>'}
  async function loadPeople(){const people=await select('profiles','active=eq.true&select=id,full_name,email&order=full_name');document.querySelector('#messageRecipients').innerHTML=people.filter(p=>p.id!==state.profile.id).map(p=>{const tasks=state.tasks.filter(t=>!t.archived&&t.owner_id===p.id),warning=tasks.filter(t=>norm(t.due_state)==='دوره هشدار').length,late=tasks.filter(t=>norm(t.due_state)==='دیرکرد').length;return`<option value="${p.id}">${esc(p.full_name)} — هشدار ${fa(warning)}، دیرکرد ${fa(late)}</option>`}).join('');return people}
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelector('#nav button[data-view="messages"]')?.addEventListener('click',()=>setTimeout(load,0));document.querySelector('#nav button[data-view="sentMessages"]')?.addEventListener('click',()=>setTimeout(()=>{if(window.bamcoTabs?.owns('sentMessages'))window.bamcoTabs.render('sentMessages');else{loadPeople();loadSent()}},0));document.querySelector('#refreshMessages')?.addEventListener('click',load);
    document.querySelector('#messageAudience')?.addEventListener('change',e=>document.querySelector('#messageRecipientsWrap').classList.toggle('hidden',e.target.value!=='selected'));
    document.querySelector('#messageList')?.addEventListener('click',async e=>{const card=e.target.closest('[data-mid]');if(!card)return;if(e.target.closest('.reply-message')){card.querySelector('.message-reply-box')?.classList.toggle('hidden');return}const body={read_at:new Date().toISOString()};if(e.target.closest('.ack-message'))body.acknowledged_at=new Date().toISOString();if(e.target.closest('.save-reply')){body.reply_text=card.querySelector('textarea').value.trim();if(!body.reply_text)return toast('متن پاسخ را وارد کنید.',true);body.replied_at=new Date().toISOString()}await update('portal_message_recipients',`message_id=eq.${card.dataset.mid}&recipient_id=eq.${state.profile.id}`,body);await load()});
    document.querySelector('#messageCompose')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),people=await loadPeople();let ids=document.querySelector('#messageAudience').value==='all'?people.filter(p=>p.id!==state.profile.id).map(p=>p.id):[...document.querySelector('#messageRecipients').selectedOptions].map(o=>o.value);if(!ids.length)return toast('حداقل یک گیرنده انتخاب کنید.',true);const created=(await insert('portal_messages',{sender_id:state.profile.id,subject:f.get('subject').trim(),body:f.get('body').trim(),importance:f.get('importance'),require_ack:f.has('require_ack'),allow_reply:f.has('allow_reply')}))[0];await insert('portal_message_recipients',ids.map(recipient_id=>({message_id:created.id,recipient_id})));e.currentTarget.reset();toast('پیام در پرتال گیرندگان ثبت شد.');await loadSent()});
    document.querySelector('#sentMessageList')?.addEventListener('click',async e=>{const btn=e.target.closest('.remind-message');if(!btn)return;const original=sentRows.find(x=>String(x.id)===btn.dataset.mid),ids=(original?.portal_message_recipients||[]).filter(x=>!x.replied_at).map(x=>x.recipient_id);if(!ids.length)return;try{const reminder=(await insert('portal_messages',{sender_id:state.profile.id,subject:`یادآوری: ${original.subject}`,body:`لطفاً پیام قبلی را بررسی و پاسخ خود را در سامانه ثبت کنید.\n\n${original.body}`,importance:'important',require_ack:true,allow_reply:true}))[0];await insert('portal_message_recipients',ids.map(recipient_id=>({message_id:reminder.id,recipient_id})));toast('یادآوری در پرتال افراد بدون پاسخ ثبت شد.');await loadSent()}catch(err){toast(err.message,true)}});
    setTimeout(load,1200);
  });
})();



/* Canonical status/priority editor is owned by tab-workspace.js. */
