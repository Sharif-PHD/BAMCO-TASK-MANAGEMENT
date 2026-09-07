(()=>{
  'use strict';
  if(window.__bamcoAvatarHardFix)return;
  window.__bamcoAvatarHardFix='v4';
  let currentObjectUrl='';

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
