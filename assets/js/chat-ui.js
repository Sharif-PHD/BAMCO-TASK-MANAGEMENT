/* Live chat UI, using the existing thread/message APIs. Files use a private bucket. */
(()=>{
'use strict';
const qa=(s,r=document)=>[...r.querySelectorAll(s)],LIMIT=5*1024*1024,FILE='BAMCO_ATTACHMENT_V1:',STICKER='BAMCO_STICKER_V1:',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar='<span class="chat-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg></span>';
const fileAllowed=file=>!!file&&file.size>0&&file.size<=LIMIT;
if(typeof module!=='undefined'&&module.exports)module.exports={fileAllowed,LIMIT};
if(typeof document==='undefined')return;
let active=null;
const directory=async()=>{try{return await rpc('chat_directory_v2',{})}catch{return await rpc('chat_directory',{})}};
function summary(body){if(body?.startsWith(FILE)){try{return JSON.parse(body.slice(FILE.length)).name}catch{return'فایل'}}if(body?.startsWith(STICKER))return'استیکر';return body||''}
async function mount(host,{id,title,subtitle='',actions=[]}){
 if(active)active.close();
 if(!host)throw Error('پنل گفتگو آماده نیست.');
 const stateUI={id,reply:null,pending:null,busy:false,closed:false,urls:[],messages:[],loaded:false};
 active=stateUI;stateUI.close=()=>{stateUI.closed=true;clearTimeout(stateUI.timer);stateUI.urls.forEach(URL.revokeObjectURL);stateUI.urls=[];stateUI.pending=null;stateUI.reply=null;stateUI.messages=[]};
 host.classList.add('messenger-host');host.innerHTML=`<div class="messenger-head">${avatar}<div><strong>${esc(title)}</strong><small>${esc(subtitle||'گفتگو')}</small></div><button type="button" class="chat-refresh bamco-icon-button" aria-label="تازه‌سازی پیام‌ها">↻</button></div><div class="messenger-messages" role="log" aria-live="polite"><div class="chat-empty">در حال دریافت پیام‌ها…</div></div><div class="chat-error" role="status"></div><div class="chat-reply hidden"><span></span><button type="button" aria-label="لغو پاسخ">×</button></div><div class="chat-pending hidden"><span></span><button type="button" aria-label="حذف پیوست">×</button></div><div class="chat-stickers hidden" aria-label="انتخاب استیکر"></div><form class="messenger-compose"><button type="button" class="chat-attach bamco-icon-button" title="عکس یا فایل تا ۵ مگابایت" aria-label="پیوست عکس یا فایل">＋</button><button type="button" class="chat-sticker-toggle bamco-icon-button" title="استیکر" aria-label="انتخاب استیکر">☺</button><textarea rows="1" aria-label="متن پیام" placeholder="پیام بنویسید…"></textarea><button type="submit" class="chat-send bamco-icon-button" aria-label="ارسال پیام">➤</button><input type="file" hidden></form>`;
 const q=s=>host.querySelector(s),error=message=>q('.chat-error').textContent=message,box=q('.messenger-messages'),input=q('textarea');
 function reply(message){stateUI.reply=message;q('.chat-reply').classList.toggle('hidden',!message);q('.chat-reply span').textContent=message?'پاسخ به: '+summary(message.body).slice(0,160):'';input.focus()}
 async function storage(path,options={}){const res=await fetch(SB_URL+'/storage/v1/object/'+path,{...options,headers:{apikey:SB_KEY,Authorization:'Bearer '+state.token,...options.headers}});if(!res.ok){const info=await res.json().catch(()=>({}));throw new Error('دریافت یا ارسال فایل انجام نشد: '+(info.message||info.error||'دسترسی یا اتصال را بررسی کنید.'))}return res}
 async function attach(message,node){let meta;try{meta=JSON.parse(message.body.slice(FILE.length))}catch{node.textContent='اطلاعات فایل معتبر نیست.';return}
 if(typeof meta.path!=='string'||!meta.path.startsWith(id+'/')||meta.path.includes('..')||!Number.isFinite(meta.size)||meta.size>LIMIT){node.textContent='پیوست نامعتبر';return}
 const button=document.createElement('button');button.type='button';button.className='chat-file';button.textContent='↓ '+String(meta.name||'فایل')+' · '+Math.ceil(meta.size/1024).toLocaleString('fa-IR')+' کیلوبایت';node.append(button);
 const retrieve=async()=>{const res=await storage('authenticated/chat-attachments/'+meta.path.split('/').map(encodeURIComponent).join('/'));const blob=await res.blob();if(blob.size>LIMIT)throw Error('اندازه فایل بیش از ۵ مگابایت است.');const url=URL.createObjectURL(blob);stateUI.urls.push(url);return url};
 button.onclick=async()=>{try{button.disabled=true;const url=await retrieve(),a=document.createElement('a');a.href=url;a.download=String(meta.name||'attachment');a.click()}catch(err){error(err.message)}finally{button.disabled=false}};
 if(['image/png','image/jpeg','image/webp','image/gif'].includes(meta.mime)){try{const url=await retrieve();if(stateUI.closed)return;const img=document.createElement('img');img.className='chat-photo';img.src=url;img.alt=String(meta.name||'تصویر پیوست');node.prepend(img)}catch(err){error(err.message)}}
 if(meta.caption){const caption=document.createElement('div');caption.textContent=meta.caption;node.append(caption)}
 }
 async function load(manual=false){
  if(stateUI.closed)return;try{const [messages,people]=await Promise.all([selectAll('chat_messages',`select=*&thread_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&order=created_at.asc`,200),directory()]);if(stateUI.closed||!host.isConnected)return;
   const nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<90,oldTop=box.scrollTop,signature=JSON.stringify(messages);if(signature===stateUI.signature)return;stateUI.signature=signature;stateUI.messages=messages;stateUI.urls.forEach(URL.revokeObjectURL);stateUI.urls=[];
   const names=Object.fromEntries(people.map(p=>[p.id,p.display_name||p.full_name||'کاربر'])),profiles=Object.fromEntries(people.map(p=>[p.id,p]));box.replaceChildren();let date='';
   for(const m of messages){const day=new Date(m.created_at).toLocaleDateString('fa-IR');if(day!==date){const divider=document.createElement('div');divider.className='chat-date';divider.textContent=day;box.append(divider);date=day}
    const mine=m.sender_id===state.user.id,item=document.createElement('article');item.className='chat-bubble'+(mine?' mine':'');item.dataset.messageId=m.id;
    item.innerHTML=`<div class="chat-author"><span class="chat-avatar" data-sender-avatar="${esc(m.sender_id)}">${esc((names[m.sender_id]||'ک').slice(0,1))}</span><b class="chat-sender">${esc(names[m.sender_id]||'کاربر')}</b></div><div class="chat-body"></div><div class="chat-bubble-meta"><time>${new Date(m.created_at).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}</time><button type="button" class="message-reply">پاسخ</button>${isManager()?'<button type="button" class="message-delete">حذف</button>':''}</div>`;
    const parent=messages.find(x=>String(x.id)===String(m.reply_to||m.reply_to_id));if(parent){const quote=document.createElement('blockquote');quote.textContent=summary(parent.body).slice(0,180);item.querySelector('.chat-body').before(quote)}
    const body=item.querySelector('.chat-body');body.dir=/[A-Za-z]/.test(m.body||'')&&!/[\u0600-\u06ff]/.test(m.body||'')?'ltr':'rtl';if(m.body?.startsWith(FILE))attach(m,body);else if(m.body?.startsWith(STICKER)){const key=m.body.slice(STICKER.length),src=window.BAMCO_DESKTOP_ASSETS?.[key];if(src){const img=document.createElement('img');img.className='chat-sticker';img.src=src;img.alt='استیکر';body.append(img)}else body.textContent='استیکر'}else body.textContent=m.body||'';
    item.querySelector('.message-reply').onclick=()=>reply(m);const del=item.querySelector('.message-delete');if(del)del.onclick=async()=>{if(!confirm('این پیام حذف شود؟'))return;try{del.disabled=true;await rpc('chat_delete_message',{p_message_id:Number(m.id)});await load(true)}catch(err){error(err.message);del.disabled=false}};
    box.append(item);
   }
   const avatarIds=[...new Set(messages.map(m=>m.sender_id))];for(const userId of avatarIds){const path=profiles[userId]?.avatar_path;if(!path)continue;try{const res=await storage('authenticated/avatars/'+String(path).split('/').map(encodeURIComponent).join('/'));const url=URL.createObjectURL(await res.blob());stateUI.urls.push(url);qa(`[data-sender-avatar="${CSS.escape(userId)}"]`,box).forEach(el=>{el.style.backgroundImage=`url(${url})`;el.textContent='';el.classList.add('has-image')})}catch{}}
   if(!messages.length)box.innerHTML='<div class="chat-empty">'+avatar+'<strong>گفتگو از اینجا شروع می‌شود</strong><span>پیام، استیکر، عکس یا فایل تا ۵ مگابایت ارسال کنید.</span></div>';
   if(!stateUI.loaded||nearBottom||manual)box.scrollTop=box.scrollHeight;else box.scrollTop=oldTop;stateUI.loaded=true;await rpc('chat_mark_read',{p_thread_id:id});
  }catch(err){error(err.message||'پیام‌ها بارگذاری نشدند.');if(!stateUI.loaded)box.innerHTML='<div class="chat-empty">دریافت پیام‌ها انجام نشد. دکمه تازه‌سازی را بزنید.</div>'}
 }
 async function send(sticker){if(stateUI.busy||stateUI.closed)return;let text=input.value.trim(),uploaded=null;if(!sticker&&!text&&!stateUI.pending)return;stateUI.busy=true;q('.chat-send').disabled=true;error('');
  try{if(sticker)text=STICKER+sticker;
   else if(stateUI.pending){const file=stateUI.pending;if(!fileAllowed(file))throw Error('فایل باید حداکثر ۵ مگابایت باشد.');const extension=/\.([a-z0-9]{1,10})$/i.exec(file.name),path=id+'/'+state.user.id+'/'+crypto.randomUUID()+(extension?'.'+extension[1].toLowerCase():'');await storage('chat-attachments/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});uploaded=path;text=FILE+JSON.stringify({path,name:file.name,size:file.size,mime:file.type,caption:text})}
   await rpc('chat_send_message',{p_thread_id:id,p_body:text,p_reply_to:stateUI.reply?.id||null});input.value='';reply(null);stateUI.pending=null;q('.chat-pending').classList.add('hidden');q('.chat-stickers').classList.add('hidden');await load(true);
  }catch(err){error(err.message||'ارسال انجام نشد.');if(uploaded)fetch(SB_URL+'/storage/v1/object/chat-attachments',{method:'DELETE',headers:{apikey:SB_KEY,Authorization:'Bearer '+state.token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[uploaded]})}).catch(()=>{})}
  finally{stateUI.busy=false;if(host.isConnected)q('.chat-send').disabled=false}
 }
 const controls=document.createElement('div');controls.className='messenger-head-actions';
 for(const action of actions){const button=document.createElement('button');button.type='button';button.className=action.danger?'danger':'ghost';button.textContent=action.label;button.onclick=async()=>{if(button.disabled)return;button.disabled=true;try{await action.run()}catch(err){error(err.message||'عملیات انجام نشد.')}finally{if(button.isConnected)button.disabled=false}};controls.append(button)}
 q('.messenger-head').append(controls);
 q('form').onsubmit=e=>{e.preventDefault();send()};input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();send()}};
 q('.chat-reply button').onclick=()=>reply(null);q('.chat-pending button').onclick=()=>{stateUI.pending=null;q('.chat-pending').classList.add('hidden')};q('.chat-refresh').onclick=()=>load(true);
 q('.chat-attach').onclick=()=>q('input[type=file]').click();q('input[type=file]').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(!fileAllowed(file)){error('فایل خالی یا بزرگ‌تر از ۵ مگابایت پذیرفته نمی‌شود.');return}stateUI.pending=file;q('.chat-pending span').textContent=file.name;q('.chat-pending').classList.remove('hidden');error('')};
 q('.chat-sticker-toggle').onclick=()=>{const panel=q('.chat-stickers');panel.classList.toggle('hidden');if(!panel.childElementCount)Object.entries(window.BAMCO_DESKTOP_ASSETS||{}).forEach(([key,src])=>{const b=document.createElement('button');b.type='button';b.title='ارسال استیکر';const img=document.createElement('img');img.src=src;img.alt=key;b.append(img);b.onclick=()=>send(key);panel.append(b)})};
 await load();
 async function tick(){if(stateUI.closed||!host.isConnected)return;if(!document.hidden&&!host.closest('.view')?.classList.contains('hidden'))await load();if(!stateUI.closed&&host.isConnected)stateUI.timer=setTimeout(tick,5000)}stateUI.timer=setTimeout(tick,5000);
}
window.bamcoChat={mount,close(){active?.close();active=null}};
})();
