/* One owner for public, group, private and task conversations. */
(()=>{
 'use strict';
 const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={groupChat:'گفت‌وگوی عمومی و گروه‌ها',directMessages:'گفت‌وگوی خصوصی',taskChats:'گفت‌وگوی مرتبط با وظیفه'};
 const label=p=>p.display_name||p.full_name||'کاربر';let serial=0,currentView='',selectedTask=null;
 const directory=()=>rpc('chat_directory_v2',{});
 function loading(host,text='در حال دریافت اطلاعات…'){host.innerHTML=`<div class="conversation-empty" role="status">${esc(text)}</div>`}
 function failure(host,error){host.innerHTML=`<div class="workspace-error" role="alert"><p>${esc(error.message||'دریافت اطلاعات انجام نشد.')}</p><button type="button" class="ghost" data-conversation-refresh>تلاش دوباره</button></div>`}
 function personButton(p){return `<button type="button" class="conversation-item" data-person="${esc(p.id)}" data-person-name="${esc(label(p))}"><span class="conversation-avatar" data-profile-photo="${esc(p.id)}" aria-hidden="true">${esc(label(p).trim()[0])}</span><span><strong>${esc(label(p))}</strong><small>${p.role==='manager'?'مدیر':'متولی'}</small></span><span class="conversation-arrow" aria-hidden="true">‹</span></button>`}
 function selectItem(button,host){qa('.conversation-item.active',host).forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current')});button.classList.add('active');button.setAttribute('aria-current','true')}
 async function render(id){
  if(!Object.hasOwn(names,id))return;const epoch=++serial;currentView=id;selectedTask=null;window.bamcoChat?.close();
  const view=q('#'+id+'View');if(!view)return;
  view.innerHTML=`<div class="panel conversation-panel"><div class="panel-head"><h3>${names[id]}</h3></div><div class="manager-toolbar"><button type="button" class="ghost" data-conversation-refresh>تازه‌سازی</button>${id==='groupChat'&&isManager()?'<button type="button" class="primary" data-create-group>＋ ایجاد گروه</button>':''}</div><div class="prod-chat conversation-layout"><section class="conversation-sidebar"><label class="conversation-search"><span>${id==='taskChats'?'انتخاب وظیفه':id==='directMessages'?'انتخاب مخاطب':'گفت‌وگوها'}</span><input type="search" data-conversation-search placeholder="جست‌وجو…"></label><div class="conversation-list"></div></section><section class="conversation-stage"><div class="conversation-empty"><strong>${id==='taskChats'?'۱. وظیفه را انتخاب کنید':id==='directMessages'?'با چه کسی گفت‌وگو می‌کنید؟':'یک گفت‌وگو را انتخاب کنید'}</strong><span>${id==='taskChats'?'۲. مخاطب را انتخاب کنید؛ پیام فقط در همان گفت‌وگو ثبت می‌شود.':'پیام، فایل یا استیکر را در گفت‌وگوی انتخاب‌شده ارسال کنید.'}</span></div></section></div></div>`;
  const list=q('.conversation-list',view);loading(list);
  try{
   if(id==='groupChat'){
    await rpc('chat_ensure_public',{});
    const [threads,members]=await Promise.all([select('chat_threads','select=id,thread_type,title,avatar_path,updated_at&thread_type=in.(public,group)&is_active=eq.true&order=updated_at.desc'),select('chat_members',`select=thread_id&user_id=eq.${encodeURIComponent(state.user.id)}`)]);
    if(epoch!==serial)return;const mine=new Set(members.map(m=>m.thread_id));
    list.innerHTML=threads.filter(t=>t.thread_type==='public'||mine.has(t.id)).map(t=>`<button type="button" class="conversation-item" data-thread="${esc(t.id)}" data-title="${esc(t.title)}" data-kind="${t.thread_type}" data-group-photo="${esc(t.avatar_path||'')}"><span class="conversation-avatar" data-thread-photo="${esc(t.id)}" aria-hidden="true">${t.thread_type==='public'?'◎':'♙'}</span><span><strong>${esc(t.title)}</strong><small>${t.thread_type==='public'?'عمومی · همه کاربران':'گروه · اعضای انتخاب‌شده'}</small></span><span class="conversation-arrow" aria-hidden="true">‹</span></button>`).join('')||'<div class="conversation-empty">هنوز عضو گروهی نیستید.</div>';
    bamcoMedia.groups(list,threads);const general=q('[data-kind=public]',list);if(general)await openThread(general,view);
   }else if(id==='directMessages'){
    const [directoryPeople,history,members]=await Promise.all([directory(),select('chat_threads','select=id,title,task_id,deleted_participant_name&thread_type=eq.direct&is_active=eq.false&participant_deleted_at=not.is.null&order=updated_at.desc'),select('chat_members',`select=thread_id&user_id=eq.${encodeURIComponent(state.user.id)}`)]);if(epoch!==serial)return;
    const people=directoryPeople.filter(p=>p.id!==state.user.id),mine=new Set(members.map(m=>m.thread_id)),retained=history.filter(t=>mine.has(t.id));
    list.innerHTML=people.map(personButton).join('')+retained.map(t=>`<button type="button" class="conversation-item" data-thread="${esc(t.id)}" data-title="${esc(t.deleted_participant_name||t.title)}" data-kind="direct" data-read-only="true"><span class="conversation-avatar" aria-hidden="true">${esc((t.deleted_participant_name||'ک')[0])}</span><span><strong>${esc(t.deleted_participant_name||t.title)}</strong><small>حساب حذف شده · سوابق گفت‌وگو${t.task_id?' · وظیفه '+esc(t.task_id):''}</small></span></button>`).join('')||'<div class="conversation-empty">مخاطبی در دسترس نیست.</div>';bamcoMedia.avatars(list,people);
   }else{
    const tasks=(state.tasks||[]).filter(t=>!t.archived);if(epoch!==serial)return;
    list.innerHTML=tasks.map(t=>`<button type="button" class="conversation-item conversation-task" data-task-choice="${t.id}"><span class="conversation-task-id">${esc(t.legacy_id||t.id)}</span><span><strong>${esc(t.title)}</strong><small>متولی: ${esc(ownerName(t))} · ${esc(t.status)}</small></span></button>`).join('')||'<div class="conversation-empty">وظیفه جاری وجود ندارد.</div>';
   }
  }catch(error){if(epoch===serial)failure(list,error)}
 }
 async function openThread(button,view){
  const epoch=serial,host=q('.conversation-stage',view),id=button.dataset.thread,title=button.dataset.title,kind=button.dataset.kind;
  selectItem(button,q('.conversation-list',view));
  const readOnly=button.dataset.readOnly==='true',actions=[];
  if(kind==='group'){
   actions.push({label:isManager()?'مدیریت اعضا':'اعضای گروه',run:()=>groupDialog(id,title,!isManager(),button.dataset.groupPhoto||'')});
   actions.push({label:'خروج از گروه',run:async()=>{if(!await window.bamcoConfirm(`از گروه «${title}» خارج می‌شوید؟`))return;await rpc('chat_leave_group',{p_thread_id:id});if(epoch===serial)await render('groupChat')}});
  }
  if(!readOnly&&kind!=='public'&&isManager())actions.push(deleteAction(id,title,currentView));
  await window.bamcoChat.mount(host,{id,title,readOnly,groupPhoto:button.dataset.groupPhoto||'',subtitle:readOnly?'حساب مخاطب حذف شده؛ سابقه گفت‌وگو':kind==='public'?'عمومی · همه کاربران':kind==='group'?'گروه · اعضای انتخاب‌شده':'خصوصی',actions});
 }
 function deleteAction(id,title,view){return{label:'حذف گفت‌وگو',danger:true,run:async()=>{if(!await window.bamcoConfirm(`گفت‌وگوی «${title}» حذف شود؟`))return;await rpc('chat_delete_thread',{p_thread_id:id});await render(view)}}}
 async function chooseTask(button,view){
  const epoch=serial;selectedTask=(state.tasks||[]).find(t=>String(t.id)===button.dataset.taskChoice);if(!selectedTask)return;
  const task=selectedTask,host=q('.conversation-stage',view);selectItem(button,q('.conversation-list',view));window.bamcoChat.close();loading(host,'در حال دریافت مخاطبان…');
  try{const people=(await directory()).filter(p=>p.id!==state.user.id);if(epoch!==serial||selectedTask!==task)return;
   host.innerHTML=`<div class="conversation-recipient-head"><small>وظیفه ${esc(task.legacy_id||task.id)}</small><h4>${esc(task.title)}</h4><p>با چه کسی دربارهٔ این وظیفه گفت‌وگو می‌کنید؟</p><input type="search" data-recipient-search placeholder="جست‌وجوی نام مخاطب…" aria-label="جست‌وجوی مخاطب"></div><div class="conversation-recipient-grid">${people.map(personButton).join('')||'<p>مخاطبی در دسترس نیست.</p>'}</div>`;
  bamcoMedia.avatars(host,people);
  }catch(error){if(epoch===serial)failure(host,error)}
 }
 async function choosePerson(button,view){
  const epoch=serial,task=selectedTask,host=q('.conversation-stage',view),userId=button.dataset.person,title=button.dataset.personName,route=view.id.replace(/View$/,'');
  button.disabled=true;
  try{const id=task?await rpc('chat_ensure_task_direct',{p_task_id:Number(task.id),p_other_user:userId}):await rpc('chat_ensure_direct',{p_other_user:userId});if(epoch!==serial||task!==selectedTask)return;
   if(route==='directMessages')selectItem(button,q('.conversation-list',view));
   await window.bamcoChat.mount(host,{id,personId:userId,title,subtitle:task?`وظیفه ${task.legacy_id||task.id} · ${task.title}`:'خصوصی · فقط این گفت‌وگو',actions:[...(task?[{label:'تغییر مخاطب',run:()=>chooseTask(q('.conversation-task.active',view),view)}]:[]),...(isManager()?[deleteAction(id,title,route)]:[])]});
  }catch(error){failure(host,error)}finally{if(button.isConnected)button.disabled=false}
 }
 async function groupDialog(id=null,title='',readOnly=false,photoPath=''){
  let photoFile=null,removePhoto=false,previewUrl='';
  let dialog=q('#groupManageDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='groupManageDialog';dialog.className='modal bamco-dialog group-manage-dialog';document.body.append(dialog)}
  dialog.innerHTML='<div class="conversation-empty" role="status">در حال دریافت اعضا…</div>';dialog.showModal();
  try{const [people,members]=await Promise.all([directory(),id?rpc('chat_group_members',{p_thread_id:id}):Promise.resolve([])]);if(!dialog.open)return;
   const selected=new Set(members.map(m=>m.user_id));selected.add(state.user.id);const owners=new Set(members.filter(m=>m.member_role==='owner').map(m=>m.user_id));owners.add(state.user.id);
   dialog.innerHTML=`<form id="conversationGroupForm"><div class="modal-head"><div><h3>${readOnly?'اعضای گروه':id?'مدیریت گروه':'ایجاد گروه'}</h3><p>${readOnly?esc(title):'نام گروه را بنویسید و اعضا را انتخاب کنید.'}</p></div><button type="button" class="ghost bamco-icon-button" data-group-close aria-label="بستن">×</button></div>${readOnly?'':`<label>نام گروه<input name="title" required minlength="2" maxlength="120" value="${esc(title)}" placeholder="نام گروه"></label>`}${readOnly?'':`<div class="group-photo-picker"><span class="conversation-avatar group-photo-preview">♙</span><div><button type="button" class="ghost" data-choose-group-photo>انتخاب عکس گروه</button><button type="button" class="ghost" data-remove-group-photo>حذف عکس</button><small>PNG، JPG یا WebP؛ حداکثر ۵ مگابایت</small></div><input type="file" name="group_photo" accept="image/png,image/jpeg,image/webp" hidden></div>`}<label>جست‌وجوی اعضا<input type="search" data-member-search placeholder="نام فرد…"></label><div class="group-selection-count" role="status"></div><div class="group-member-grid">${people.filter(p=>!readOnly||selected.has(p.id)).map(p=>`<label class="group-member-option"><input type="checkbox" name="members" value="${p.id}" ${selected.has(p.id)?'checked':''} ${readOnly||owners.has(p.id)?'disabled':''}><span class="conversation-avatar" data-profile-photo="${esc(p.id)}">${esc(label(p).trim()[0])}</span><span><strong>${esc(label(p))}</strong><small>${p.id===state.user.id?'شما':p.role==='manager'?'مدیر':'متولی'}</small></span></label>`).join('')}</div><p class="form-error" role="alert"></p><div class="modal-actions">${readOnly?'':`<button type="submit" class="primary">${id?'ذخیره تغییرات':'ایجاد گروه'}</button>`}<button type="button" class="ghost" data-group-close>${readOnly?'بستن':'انصراف'}</button></div></form>`;
   bamcoMedia.avatars(dialog,people);
   if(!readOnly){const preview=q('.group-photo-preview',dialog),fileInput=q('[name=group_photo]',dialog),paint=src=>{preview.replaceChildren();if(src){const img=document.createElement('img');img.src=src;img.alt='عکس گروه';preview.append(img)}else preview.textContent='♙'};
    if(photoPath)bamcoMedia.get('group-avatars',photoPath).then(src=>{if(!photoFile&&!removePhoto&&dialog.open)paint(src)}).catch(()=>{});
    q('[data-choose-group-photo]',dialog).onclick=()=>fileInput.click();q('[data-remove-group-photo]',dialog).onclick=()=>{photoFile=null;removePhoto=true;fileInput.value='';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';paint('')};
    fileInput.onchange=()=>{const file=fileInput.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){q('.form-error',dialog).textContent='عکس باید PNG، JPG یا WebP و حداکثر ۵ مگابایت باشد.';fileInput.value='';return}photoFile=file;removePhoto=false;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);paint(previewUrl);q('.form-error',dialog).textContent=''};
    dialog.addEventListener('close',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl)},{once:true});
   }
   const count=()=>q('.group-selection-count',dialog).textContent=qa('input[name=members]:checked',dialog).length.toLocaleString('fa-IR')+' عضو انتخاب شده';count();dialog.onchange=count;
   q('[data-member-search]',dialog).oninput=e=>qa('.group-member-option',dialog).forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(e.target.value.trim().toLowerCase()));
   qa('[data-group-close]',dialog).forEach(b=>b.onclick=()=>dialog.close());
   q('form',dialog).onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=q('[type=submit]',form),error=q('.form-error',form);if(!button||button.disabled)return;
    const ids=qa('input[name=members]:checked',form).map(x=>x.value),groupTitle=form.elements.title.value.trim();if(ids.length<2){error.textContent='حداقل یک نفر دیگر را به گروه اضافه کنید.';return}
    button.disabled=true;error.textContent='';try{if(id)await rpc('chat_manage_group',{p_thread_id:id,p_title:groupTitle,p_member_ids:ids,p_delete:false});else id=await rpc('chat_create_group',{p_title:groupTitle,p_member_ids:ids});if(photoFile){const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[photoFile.type],path=id+'/'+crypto.randomUUID()+'.'+ext,res=await fetch(SB_URL+'/storage/v1/object/group-avatars/'+path,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+state.token,'Content-Type':photoFile.type},body:photoFile});if(!res.ok)throw Error('گروه ذخیره شد، اما بارگذاری عکس انجام نشد؛ دوباره ذخیره کنید.');try{await rpc('chat_set_group_avatar',{p_thread_id:id,p_avatar_path:path})}catch(error){await fetch(SB_URL+'/storage/v1/object/group-avatars',{method:'DELETE',headers:{apikey:SB_KEY,Authorization:'Bearer '+state.token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})}).catch(()=>{});throw error}}else if(removePhoto)await rpc('chat_set_group_avatar',{p_thread_id:id,p_avatar_path:null});dialog.close();await render('groupChat')}catch(err){error.textContent=err.message||'ذخیره گروه انجام نشد.'}finally{button.disabled=false}
   };
  }catch(error){dialog.innerHTML=`<p class="form-error" role="alert">${esc(error.message)}</p><button type="button" class="ghost" data-group-close>بستن</button>`;q('[data-group-close]',dialog).onclick=()=>dialog.close()}
 }
 document.addEventListener('click',async e=>{
  const view=e.target.closest('#groupChatView,#directMessagesView,#taskChatsView');if(!view)return;
  try{if(e.target.closest('[data-create-group]'))return groupDialog();if(e.target.closest('[data-conversation-refresh]'))return render(view.id.replace(/View$/,''));
   const thread=e.target.closest('[data-thread]');if(thread)return await openThread(thread,view);
   const task=e.target.closest('[data-task-choice]');if(task)return await chooseTask(task,view);
   const person=e.target.closest('[data-person]');if(person)return await choosePerson(person,view);
  }catch(error){failure(q('.conversation-stage',view),error)}
 });
 document.addEventListener('input',e=>{if(e.target.matches('[data-conversation-search],[data-recipient-search]')){const host=e.target.closest('.conversation-sidebar,.conversation-stage');qa('.conversation-item',host).forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(e.target.value.trim().toLowerCase()))}});
 document.addEventListener('click',e=>{if(e.target.closest('.content-back,#nav [data-view]')){serial++;window.bamcoChat?.close()}},true);
 window.bamcoConversations={owns:id=>Object.hasOwn(names,id),render,close(){serial++;selectedTask=null;window.bamcoChat?.close()}};
})();
