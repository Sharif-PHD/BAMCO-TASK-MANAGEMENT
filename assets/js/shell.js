/* module:shell:1 */
(()=>{
  'use strict';
  const q=(s,root=document)=>root.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nav=q('#nav'),workspace=q('.workspace');if(!nav||!workspace)return;
  nav.insertAdjacentHTML('beforeend','<button data-view="people" class="manager-only"><b>♙</b><span>افراد و نقش‌ها</span></button><button data-view="templates" class="manager-only"><b>≡</b><span>متن پیام‌ها</span></button><button data-view="stickers" class="manager-only"><b>◇</b><span>مدیریت استیکرها</span></button><button data-view="settings"><b>⚙</b><span>تنظیمات</span></button>');
  workspace.insertAdjacentHTML('beforeend',`
  <section id="peopleView" class="view hidden manager-only"><div class="panel table-panel"><div class="panel-head"><div><h3>مدیریت افراد و نقش‌ها</h3><small>حساب کاربران، نام متولی در کانبان و سطح دسترسی</small></div><input id="peopleSearch" class="search" placeholder="جست‌وجو…"></div><div class="people-actions"><button id="addPersonBtn" class="primary">＋ افزودن فرد</button><button id="editPersonBtn" class="ghost">ویرایش</button><button id="deletePersonBtn" class="danger">حذف</button></div><div class="table-wrap"><table class="manager-table"><thead><tr><th>نام متولی</th><th>نقش</th><th>جنسیت</th><th>نام کاربری</th><th>عنوان خطاب</th><th>فعال</th></tr></thead><tbody id="peopleBody"></tbody></table></div></div></section>
  <section id="templatesView" class="view hidden manager-only"><div class="panel"><div class="panel-head"><div><h3>متن پیام‌ها</h3><small>متن پیام داخل سامانه بر اساس وضعیت متولی</small></div><div class="manager-toolbar"><select id="templateState"><option value="state1">وضعیت مطلوب</option><option value="state2">یادآوری</option><option value="state3">نیازمند توجه</option><option value="state4">پیگیری جدی</option><option value="state5">اقدام فوری</option><option value="followup">یادآوری مجدد</option></select><button id="saveTemplateBtn" class="primary">ذخیره متن</button></div></div><div class="manager-note">متغیرها: [عنوان مخاطب]، [تعداد هشدار]، [تعداد دیرکرد]، [جدول امور هشداری]، [جدول امور دیرکردی]، [استیکر] و [تاریخ گزارش]</div><textarea id="templateBody" class="template-editor"></textarea></div></section>
  <section id="stickersView" class="view hidden manager-only"><div class="panel"><div class="panel-head"><div><h3>مدیریت استیکرها</h3><small>نسخه را تعریف کنید و ده تصویر آن را در پایگاه داده بارگذاری کنید.</small></div></div><div id="stickerGrid" hidden></div></div></section>
  <section id="settingsView" class="view hidden"><div class="panel"><div class="panel-head"><div><h3>تنظیمات حساب کاربری</h3><small>نام نمایشی، تصویر پروفایل و امنیت حساب</small></div></div><div class="manager-form"><label>نام نمایشی<input id="profileDisplayName"></label><label>نام کاربری<input id="profileEmail" class="english" dir="ltr" readonly></label><div class="profile-photo-field"><div id="profileAvatarPreview" class="profile-avatar-preview">ب</div><div><b>تصویر پروفایل</b><p>PNG، JPG یا WebP تا ۸ مگابایت</p><button id="chooseAvatarBtn" type="button" class="ghost">انتخاب و تنظیم عکس</button><input id="profileAvatar" type="file" accept="image/png,image/jpeg,image/webp" hidden></div></div><div class="account-security-box"><div><h4>تغییر رمز عبور</h4><p>رمز حساب خود را از این بخش تغییر دهید.</p></div><button id="changePasswordBtn" type="button" class="primary">تغییر رمز عبور</button></div></div><div class="modal-actions"><button id="saveProfileBtn" class="primary">ذخیره تنظیمات حساب</button></div></div></section>
  <dialog id="personDialog" class="modal manager-modal"><form id="personForm"><div class="modal-head"><div><h3 id="personDialogTitle">افزودن فرد</h3><p>اطلاعات فرد، سطح دسترسی و امکان دریافت پیام</p></div><button type="button" data-person-close>×</button></div><div class="manager-form"><label>نام متولی در کانبان<input name="full_name" required></label><label>نقش<select name="role"><option value="owner">متولی</option><option value="manager">مدیر</option></select></label><label>جنسیت<select name="gender"><option>آقا</option><option>خانم</option></select></label><label>ایمیل (اختیاری)<input name="email" class="english" dir="ltr" type="email" placeholder="name@bamco.ir"></label><label>عنوان خطاب<input name="salutation"></label><label class="person-message-channel">کانال پیش‌فرض پیام<select name="default_message_channel"><option value="portal">داخل سامانه</option><option value="email">ایمیل</option><option value="both">هر دو</option></select><small>بدون ایمیل، ارسال ایمیل و پیام داخل سامانه غیرفعال است.</small></label><label>فعال<select name="active"><option value="true">بله</option><option value="false">خیر</option></select></label></div><p id="personError" class="form-error" role="alert"></p><div class="modal-actions"><button type="button" class="ghost" data-person-close>انصراف</button><button type="submit" class="primary">ذخیره</button></div></form></dialog>`);
  document.body.append(q('#personDialog'));
  let people=[],editing=null,selected=new Set();
  function syncPersonSelection(){
    selected=new Set([...selected].filter(id=>people.some(p=>p.id===id)));
    document.querySelectorAll('#peopleBody tr[data-id]').forEach(row=>{const chosen=selected.has(row.dataset.id);row.classList.toggle('person-selected',chosen);row.setAttribute('aria-selected',String(chosen))});
    q('#editPersonBtn').disabled=!people.length;q('#editPersonBtn').title=selected.size>1?'ویرایش فقط برای یک فرد مجاز است':'ویرایش فرد';q('#deletePersonBtn').disabled=!selected.size;
  }
  document.addEventListener('bamco-selection-change',e=>{if(e.target.closest('#peopleView')){selected=new Set(e.detail.ids);syncPersonSelection()}});
  async function edge(body={},method='POST'){const r=await fetch(`${SB_URL}/functions/v1/admin-users`,{method,headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'عملیات حساب کاربری انجام نشد.');return d}
  async function loadPeople(){people=await select('profiles','select=id,email,full_name,display_name,role,gender,salutation,active,default_message_channel,messaging_enabled&order=full_name');state.profiles=people;renderPeople()}
  function renderPeople(){const term=q('#peopleSearch').value.trim().toLowerCase(),rows=people.filter(p=>!term||[p.full_name,p.email,p.role,p.salutation].some(v=>String(v||'').toLowerCase().includes(term)));q('#peopleBody').innerHTML=rows.map(p=>`<tr data-id="${p.id}" class="${selected.has(p.id)?'person-selected':''}"><td>${esc(p.full_name)}</td><td>${p.role==='manager'?'مدیر':'متولی'}</td><td>${esc(p.gender||'—')}</td><td class="english">${esc(p.email||'—')}</td><td>${esc(p.salutation||'—')}</td><td>${p.active!==false?'بله':'خیر'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">کاربری ثبت نشده است.</td></tr>';syncPersonSelection()}
  function syncMessageAvailability(){const f=q('#personForm'),hasEmail=!!f.elements.email.value.trim(),field=q('.person-message-channel',f);f.elements.default_message_channel.disabled=!hasEmail;field?.classList.toggle('is-disabled',!hasEmail);if(!hasEmail)f.elements.default_message_channel.value='portal'}
  function openPerson(p=null){editing=p;const f=q('#personForm');f.reset();q('#personError').textContent='';f.elements.role.value='owner';f.elements.active.value='true';if(p)for(const k of ['full_name','role','gender','email','salutation','active','default_message_channel'])if(f.elements[k])f.elements[k].value=String(p[k]??'');q('#personDialogTitle').textContent=p?'ویرایش فرد':'افزودن فرد';syncMessageAvailability();q('#personDialog').showModal()}
  function pickPersonToEdit(){
    if(selected.size>1)return toast('برای ویرایش فقط یک فرد را انتخاب کنید. حذف چندتایی مجاز است.',true);
    const person=people.find(p=>selected.has(p.id));if(person)return openPerson(person);
    let dialog=q('#personPickerDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='personPickerDialog';dialog.className='modal small bamco-dialog';document.body.append(dialog)}
    dialog.innerHTML=`<form><div class="modal-head"><h3>انتخاب فرد برای ویرایش</h3></div><label>فرد<select name="person" required><option value="">انتخاب کنید…</option>${people.map(p=>`<option value="${esc(p.id)}">${esc(p.full_name)} — ${p.role==='manager'?'مدیر':'متولی'}</option>`).join('')}</select></label><div class="modal-actions"><button type="submit" class="primary">ویرایش</button><button type="button" class="ghost">انصراف</button></div></form>`;
    q('button[type=button]',dialog).onclick=()=>dialog.close();q('form',dialog).onsubmit=e=>{e.preventDefault();const p=people.find(p=>p.id===e.currentTarget.elements.person.value);if(!p)return;window.bamcoSelection.set('#peopleBody',[p.id]);dialog.close();openPerson(p)};dialog.showModal();
  }
  async function savePerson(e){
    e.preventDefault();const form=e.currentTarget,submit=form.querySelector('[type="submit"]');if(submit.disabled)return;
    const data=Object.fromEntries(new FormData(form));data.active=data.active==='true';data.email=String(data.email||'').trim()||null;data.messaging_enabled=!!data.email;data.default_message_channel=data.email?(data.default_message_channel||'portal'):'none';if(editing)data.user_id=editing.id;
    q('#personError').textContent='';submit.disabled=true;
    try{await edge(data);q('#personDialog').close();toast('اطلاعات فرد ذخیره شد.');await loadPeople()}
    catch(err){q('#personError').textContent=err.message;toast(err.message,true)}
    finally{submit.disabled=false}
  }
  async function removePerson(){const chosen=people.filter(p=>selected.has(p.id));if(!chosen.length)return toast('حداقل یک فرد را انتخاب کنید.',true);if(!await window.bamcoConfirm(`حساب ${chosen.length.toLocaleString('fa-IR')} فرد انتخاب‌شده حذف شود؟
${chosen.map(p=>p.full_name).join('، ')}
حساب‌های دارای سابقه ممکن است فقط قابل غیرفعال‌سازی باشند.`))return;const button=q('#deletePersonBtn');button.disabled=true;let removed=0,errors=[];for(const p of chosen){try{await edge({user_id:p.id},'DELETE');removed++}catch(err){errors.push(p.full_name+': '+err.message)}}window.bamcoSelection.clear('#peopleBody');await loadPeople();toast(`${removed.toLocaleString('fa-IR')} حساب حذف شد.`+(errors.length?'\n'+errors.join('\n'):''),!!errors.length)}
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
    syncPersonSelection();q('#peopleSearch').addEventListener('input',renderPeople);q('#peopleBody').addEventListener('dblclick',e=>{if(selected.size>1)return toast('برای ویرایش فقط یک فرد را انتخاب کنید.',true);const row=e.target.closest('[data-id]'),person=people.find(x=>x.id===row?.dataset.id);if(person){window.bamcoSelection.set('#peopleBody',[person.id]);openPerson(person)}});q('#addPersonBtn').addEventListener('click',()=>openPerson());q('#editPersonBtn').addEventListener('click',pickPersonToEdit);q('#deletePersonBtn').addEventListener('click',removePerson);q('#personForm').addEventListener('submit',savePerson);q('#personForm').elements.email.addEventListener('input',syncMessageAvailability);document.querySelectorAll('[data-person-close]').forEach(x=>x.addEventListener('click',()=>q('#personDialog').close()));
    q('#chooseAvatarBtn').addEventListener('click',()=>q('#profileAvatar').click());q('#profileAvatar').addEventListener('change',e=>{openCrop(e.target.files[0]);e.target.value=''});q('#avatarCropZoom').addEventListener('input',e=>{zoom=Number(e.target.value);draw()});const canvas=q('#avatarCropCanvas');canvas.addEventListener('pointerdown',e=>{drag=true;last=point(e);canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e);offX+=p.x-last.x;offY+=p.y-last.y;last=p;draw()});canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);q('#applyAvatarCrop').addEventListener('click',applyCrop);q('#saveProfileBtn').addEventListener('click',saveProfile);q('#changePasswordBtn').addEventListener('click',()=>{q('#cancelPasswordBtn').classList.remove('hidden');q('#passwordForm').reset();q('#passwordDialog').showModal()});
    q('#nav').addEventListener('click',e=>{const view=e.target.closest('button[data-view]')?.dataset.view;if(view==='people'&&isManager())loadPeople().catch(err=>toast(err.message,true));if(view==='settings')setTimeout(loadSettings)});
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



/* Inbox displays the same immutable report used by the sender. Sending is owned by message-center. */
(()=>{
 const q=s=>document.querySelector(s),nav=q('#nav'),workspace=q('.workspace');if(!nav||!workspace)return;let rows=[],epoch=0;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 nav.insertAdjacentHTML('beforeend','<button data-view="messages"><b>✉</b><span>پیام‌ها</span><i id="messageBadge" class="message-badge"></i></button><button data-view="sentMessages" class="manager-only"><b>✓</b><span>پیام‌های ارسال‌شده</span></button>');
 workspace.insertAdjacentHTML('beforeend','<section id="messagesView" class="view hidden"><div class="panel"><div class="panel-head"><h3>پیام‌های من</h3></div><div class="manager-toolbar"><button id="refreshMessages" class="ghost">تازه‌سازی</button></div><div id="messageList" class="message-list"></div></div></section><section id="sentMessagesView" class="view hidden manager-only"></section>');
 async function load(){if(!state.profile)return;const run=++epoch;try{const [received,deliveries,snapshots]=await Promise.all([selectAll('portal_message_recipients',`recipient_id=eq.${state.profile.id}&select=*,portal_messages(*)&order=message_id.desc`),selectAll('message_deliveries',`recipient_id=eq.${state.profile.id}&channel=eq.portal&select=portal_message_id,snapshot_id`),selectAll('message_snapshots',`recipient_id=eq.${state.profile.id}&select=*`)]);if(run!==epoch)return;rows=received;const snapById=new Map(snapshots.map(s=>[String(s.id),s])),byMessage=new Map(deliveries.map(d=>[String(d.portal_message_id),snapById.get(String(d.snapshot_id))]));q('#messageBadge').textContent=rows.some(x=>!x.read_at)?fa(rows.filter(x=>!x.read_at).length):'';
 q('#messageList').innerHTML=rows.map(x=>{const m=x.portal_messages||{},s=byMessage.get(String(x.message_id));return `<article class="message-card ${x.read_at?'':'unread'}" data-mid="${x.message_id}"><div class="message-meta"><b>${esc(m.subject)}</b><span>${jalaliDateTime(m.created_at)}</span></div><div class="message-report-body">${s?BamcoMessageRender.html(s):`<p style="white-space:pre-wrap">${esc(m.body)}</p>`}</div><div class="message-actions">${m.require_ack&&!x.acknowledged_at?'<button class="ghost ack-message">تأیید دریافت</button>':''}${m.allow_reply?`<button class="ghost reply-message">${x.replied_at?'ویرایش پاسخ':'پاسخ'}</button><div class="message-reply-box hidden"><textarea aria-label="پاسخ شما" placeholder="پاسخ شما…">${esc(x.reply_text||'')}</textarea><button class="primary save-reply">ثبت پاسخ</button></div>`:''}${x.replied_at?'<small>پاسخ شما ثبت شده است.</small>':''}</div></article>`}).join('')||'<div class="empty">پیامی برای شما ثبت نشده است.</div>';
 await Promise.all(rows.map(async x=>{const s=byMessage.get(String(x.message_id));if(!s?.sticker_path)return;try{const src=await bamcoMedia.get('stickers',s.sticker_path);if(run===epoch){const host=q(`#messageList [data-mid="${x.message_id}"] .message-report-body`);if(host)host.innerHTML=BamcoMessageRender.html(s,{stickerUrl:src})}}catch{}}));
 }catch(err){toast(err.message,true)}}
 document.addEventListener('DOMContentLoaded',()=>{
 q('#nav [data-view="messages"]').onclick=()=>load();q('#refreshMessages').onclick=load;
 q('#messageList').onclick=async e=>{const card=e.target.closest('[data-mid]');if(!card||e.target.closest('textarea'))return;const row=rows.find(x=>String(x.message_id)===card.dataset.mid),button=e.target.closest('button');if(!row||button?.disabled)return;
 const body={read_at:new Date().toISOString()};if(button?.matches('.reply-message')){card.querySelector('.message-reply-box').classList.toggle('hidden');card.querySelector('textarea').focus();if(row.read_at)return}
 else if(button?.matches('.save-reply')){body.reply_text=card.querySelector('textarea').value.trim();if(!body.reply_text)return toast('متن پاسخ را وارد کنید.',true);body.replied_at=new Date().toISOString()}
 else if(button?.matches('.ack-message'))body.acknowledged_at=new Date().toISOString();else if(row.read_at)return;
 if(button)button.disabled=true;try{await update('portal_message_recipients',`message_id=eq.${card.dataset.mid}&recipient_id=eq.${state.profile.id}`,body);Object.assign(row,body);card.classList.remove('unread');q('#messageBadge').textContent=rows.some(x=>!x.read_at)?fa(rows.filter(x=>!x.read_at).length):'';if(body.replied_at||body.acknowledged_at){await load();if(body.replied_at)toast('پاسخ شما در سابقه همین پیام ثبت شد.')}}catch(err){toast(err.message,true)}finally{if(button?.isConnected)button.disabled=false}
 };setTimeout(load,1200);
 });
 window.bamcoInbox={load};
})();
