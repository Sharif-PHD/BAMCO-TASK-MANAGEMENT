(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s);
  let blankTemplate=null;
  const b64ToBlob=(b64,type='application/pdf')=>{const bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type})};
  async function loadTemplate(){
    try{
      const rows=await select('vehicle_form_templates','select=template_key,title,filename,mime_type,file_base64&template_key=eq.permanent_handover_blank&limit=1');
      blankTemplate=rows?.[0]||null;
      return blankTemplate;
    }catch{return null}
  }
  function downloadTemplate(row){
    if(!row?.file_base64)return false;
    const url=URL.createObjectURL(b64ToBlob(row.file_base64,row.mime_type||'application/pdf'));
    const a=document.createElement('a');a.href=url;a.download=row.filename||'فرم تحویلی خودرو.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);return true;
  }
  async function saveTemplateFile(file){
    if(!file)return;
    if(file.type!=='application/pdf')return toast('فرم خام باید فایل PDF باشد.',true);
    if(file.size>5*1024*1024)return toast('حجم فرم خام نباید بیشتر از ۵ مگابایت باشد.',true);
    const b64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=reject;r.readAsDataURL(file)});
    try{
      const existing=await select('vehicle_form_templates','select=template_key&template_key=eq.permanent_handover_blank&limit=1');
      const body={template_key:'permanent_handover_blank',title:'فرم تحویلی خودرو',filename:file.name||'فرم تحویلی خودرو.pdf',mime_type:'application/pdf',file_base64:b64,updated_at:new Date().toISOString()};
      if(existing?.length)await update('vehicle_form_templates','template_key=eq.permanent_handover_blank',body);else await insert('vehicle_form_templates',body);
      blankTemplate=body;toast('فرم خام خودرو در سامانه ذخیره شد.');
    }catch(err){toast(err.message||'ذخیره فرم خام انجام نشد.',true)}
  }
  function installInput(){if(q('#vehicleBlankTemplateUpload'))return;const i=document.createElement('input');i.id='vehicleBlankTemplateUpload';i.type='file';i.accept='application/pdf';i.hidden=true;i.addEventListener('change',e=>saveTemplateFile(e.target.files?.[0]));document.body.appendChild(i)}
  document.addEventListener('click',async e=>{
    const btn=e.target.closest('.vehicle-download-blank');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    const row=blankTemplate||await loadTemplate();
    if(downloadTemplate(row))return;
    if(typeof isManager==='function'&&isManager()){
      installInput();
      toast('فرم خام هنوز در سامانه ثبت نشده است؛ فایل PDF فرم خام را انتخاب کنید.');
      q('#vehicleBlankTemplateUpload').value='';q('#vehicleBlankTemplateUpload').click();
    }else toast('فرم خام هنوز در سامانه ثبت نشده است.',true);
  },true);
  window.addEventListener('bamco-vehicle-template-refresh',()=>loadTemplate());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installInput();setTimeout(loadTemplate,500)},{once:true});else{installInput();setTimeout(loadTemplate,500)}
})();