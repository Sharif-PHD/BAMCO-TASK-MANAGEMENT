/* Single owner of the message template editor. */
(()=>{
  'use strict';
  const META={
    state1:'وضعیت مطلوب',state2:'یادآوری',state3:'نیازمند توجه',state4:'پیگیری جدی',state5:'اقدام فوری',followup:'یادآوری مجدد'
  };
  const FOOTER=`چنانچه هر یک از فعالیت‌ها انجام شده، پیشرفت داشته یا وضعیت آن تغییر کرده است، لطفاً با پاسخ به همین ایمیل، مراتب را اعلام فرمایید تا اطلاعات فایل «مدیریت وظایف» به‌روزرسانی شود. همچنین در صورت نیاز می‌توانید از طریق شماره داخلی ۷۴۸۸ با مهندس قائمی در ارتباط باشید.\n\nتاریخ گزارش: [تاریخ کامل شمسی]\n\nبا تشکر و احترام\nسامانه خودکار پایش و پیگیری امور\nشرکت خودروسازان بم\nواحد مهندسی محصول`;
  const DEFAULTS={
    state1:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | وضعیت مطلوب',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که در حال حاضر هیچ‌یک از فعالیت‌های حوزه مسئولیت شما در وضعیت «هشدار» یا «دیرکرد» قرار ندارد.\n\nخلاصه وضعیت: ۰ مورد هشداری | ۰ مورد دیرکردی\n\n[استیکر]\n\nاز همراهی و اهتمام شما در پیگیری، انجام به‌موقع و به‌روزرسانی امور سپاسگزاریم.\n\nچنانچه تغییری در آخرین وضعیت فعالیت‌ها ایجاد شده است، لطفاً با پاسخ به همین ایمیل، مراتب را اعلام فرمایید تا اطلاعات فایل «مدیریت وظایف» به‌روزرسانی شود. همچنین در صورت نیاز می‌توانید از طریق شماره داخلی ۷۴۸۸ با مهندس قائمی در ارتباط باشید.\n\nتاریخ گزارش: [تاریخ کامل شمسی]\n\nبا تشکر و احترام\nسامانه خودکار پایش و پیگیری امور\nشرکت خودروسازان بم\nواحد مهندسی محصول`},
    state2:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | یادآوری',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور هشداری] مورد از فعالیت‌های حوزه مسئولیت شما وارد دوره «هشدار» شده‌اند و موعد پایان آن‌ها نزدیک است.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | ۰ مورد دیرکردی\n\n[استیکر]\n\n[جدول امور هشداری]\n\nلطفاً ضمن بررسی موارد فوق، برنامه‌ریزی و پیگیری لازم را به‌منظور انجام آن‌ها پیش از فرارسیدن موعد مقرر در دستور کار قرار دهید.\n\n${FOOTER}`},
    state3:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | نیازمند توجه',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور دیرکردی] مورد از فعالیت‌های حوزه مسئولیت شما از موعد تعیین‌شده عبور کرده و در وضعیت «دیرکرد» قرار گرفته‌اند.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | [تعداد امور دیرکردی] مورد دیرکردی\n\n[استیکر]\n\n[جدول امور دیرکردی]\n\n[جدول امور هشداری]\n\nلطفاً موارد فوق را بررسی کرده و اقدامات لازم برای تکمیل آن‌ها و به‌روزرسانی آخرین وضعیت هر فعالیت را در اسرع وقت انجام دهید.\n\n${FOOTER}`},
    state4:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | پیگیری جدی',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور دیرکردی] مورد از فعالیت‌های حوزه مسئولیت شما در وضعیت «دیرکرد» قرار دارند و نیازمند پیگیری جدی‌تر هستند.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | [تعداد امور دیرکردی] مورد دیرکردی\n\n[استیکر]\n\n[جدول امور دیرکردی]\n\n[جدول امور هشداری]\n\nخواهشمند است موارد فوق با جدیت بررسی شده و اقدامات لازم برای تعیین تکلیف، تکمیل و به‌روزرسانی وضعیت آن‌ها در اولویت قرار گیرد.\n\n${FOOTER}`},
    state5:{subject:'گزارش روزانه وضعیت امور | [تاریخ کامل شمسی] | اقدام فوری',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nبررسی آخرین اطلاعات ثبت‌شده در فایل «مدیریت وظایف» نشان می‌دهد که [تعداد امور دیرکردی] مورد از فعالیت‌های حوزه مسئولیت شما در وضعیت «دیرکرد» قرار گرفته‌اند و نیازمند رسیدگی و اقدام فوری هستند.\n\nخلاصه وضعیت: [تعداد امور هشداری] مورد هشداری | [تعداد امور دیرکردی] مورد دیرکردی\n\n[استیکر]\n\n[جدول امور دیرکردی]\n\n[جدول امور هشداری]\n\nخواهشمند است موارد فوق در اولویت پیگیری قرار گرفته و اقدامات مقتضی برای تعیین تکلیف و تکمیل آن‌ها در سریع‌ترین زمان ممکن انجام شود.\n\n${FOOTER}`},
    followup:{subject:'یادآوری مجدد وضعیت امور | [تاریخ کامل شمسی]',body:`[عنوان و نام مخاطب]\n\nبا درود و مهر،\n\nپیرو آخرین گزارش ارسال‌شده درباره وضعیت امور در تاریخ [تاریخ آخرین ارسال]، تاکنون پاسخی از سوی شما دریافت نشده است.\n\nخواهشمند است در صورت انجام فعالیت‌ها، ایجاد پیشرفت یا تغییر در آخرین وضعیت امور، مراتب را از طریق پاسخ به همین ایمیل اعلام فرمایید تا اطلاعات فایل «مدیریت وظایف» به‌روزرسانی شود.\n\nهمچنین در صورت نیاز می‌توانید از طریق شماره داخلی ۷۴۸۸ با مهندس قائمی در ارتباط باشید.\n\nبا تشکر و احترام\nسامانه خودکار پایش و پیگیری امور\nشرکت خودروسازان بم\nواحد مهندسی محصول`}
  };
  let activeKey='state1',loadEpoch=0;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const htmlToText=html=>String(html||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
  const textToHtml=text=>esc(String(text||'')).replace(/\r\n/g,'\n').replace(/\n/g,'<br>');
  const settingValue=row=>typeof row?.value==='string'?row.value:(row?.value?.value??'');

  function ensureStyles(){
    if(document.querySelector('#bamcoTemplateEditorFixCss'))return;
    const style=document.createElement('style');style.id='bamcoTemplateEditorFixCss';style.textContent=`
      #templatesView .template-toolbar-left{display:flex!important;align-items:center!important;gap:9px!important;justify-content:flex-start!important;direction:ltr!important;width:100%!important;margin-top:12px!important}
      #templatesView .template-picker{display:flex!important;align-items:center!important;gap:7px!important;direction:rtl!important;margin-right:0!important;margin-left:auto!important}
      #templatesView .template-picker label{margin:0!important;white-space:nowrap!important}
      #templatesView #templateState{min-width:210px!important;text-align:right!important;text-align-last:right!important;font-family:"B Nazanin",BNazanin,Tahoma,sans-serif!important}
      #templatesView #openDesktopTemplateEditor{min-width:116px!important}
      #desktopTemplateEditor{width:min(860px,94vw)!important;max-width:860px!important}
      #desktopTemplateEditor form{display:flex!important;flex-direction:column!important;gap:12px!important}
      #desktopTemplateEditor label{display:flex!important;flex-direction:column!important;gap:6px!important;text-align:right!important;font-family:"B Nazanin",BNazanin,Tahoma,sans-serif!important}
      #desktopTemplateEditor #dteSubject{width:100%!important;box-sizing:border-box!important;min-height:42px!important}
      #desktopTemplateEditor #dteBody{width:100%!important;box-sizing:border-box!important;min-height:430px!important;resize:vertical!important;line-height:1.9!important;text-align:right!important;direction:rtl!important;font-family:"B Nazanin",BNazanin,Tahoma,sans-serif!important}
      @media(max-width:700px){#templatesView .template-toolbar-left{flex-wrap:wrap!important}#templatesView .template-picker{width:100%!important;margin:0!important}#templatesView #templateState{min-width:0!important;flex:1!important}#desktopTemplateEditor #dteBody{min-height:55vh!important}}
    `;document.head.append(style);
  }

  async function getSubject(key){
    try{const rows=await select('app_settings',`key=eq.email_subject_${encodeURIComponent(key)}&select=*`);return rows.length?settingValue(rows[0]):''}catch{return''}
  }
  async function loadTemplate(key){
    const fallback=DEFAULTS[key]||DEFAULTS.state1;
    const rows=await select('email_templates',`template_key=eq.${encodeURIComponent(key)}&select=*`),row=rows[0]||null;
    let subject=row?.subject_template||'';
    if(!subject)subject=await getSubject(key);
    return {id:row?.id||null,subject:subject||fallback.subject,body:row?.body_html?htmlToText(row.body_html):fallback.body};
  }
  async function saveTemplate(key,subject,body){
    const cleanSubject=String(subject||'').replace(/\u200f/g,'').trim(),cleanBody=String(body||'').trim();
    if(!cleanSubject)throw new Error('موضوع ایمیل نمی‌تواند خالی باشد.');
    if(!cleanBody)throw new Error('متن ایمیل نمی‌تواند خالی باشد.');
    const rows=await select('email_templates',`template_key=eq.${encodeURIComponent(key)}&select=*`);
    const payload={body_html:textToHtml(cleanBody),subject_template:cleanSubject};
    if(rows.length)await update('email_templates',`id=eq.${rows[0].id}`,payload);else await insert('email_templates',{template_key:key,...payload});
  }

  function bindDialog(d){
    d.querySelector('#dteCancel').onclick=d.querySelector('#dteClose').onclick=()=>d.close();
    d.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=d.querySelector('#dteSave');if(button.disabled)return;button.disabled=true;d.querySelector('#dteError').textContent='';try{await saveTemplate(activeKey,d.querySelector('#dteSubject').value,d.querySelector('#dteBody').value);d.close();toast('موضوع و متن پیام ذخیره شد.')}catch(error){d.querySelector('#dteError').textContent=error.message||'ذخیره متن پیام انجام نشد.'}finally{button.disabled=false}};
    return d;
  }
  function ensureDialog(){
    let d=document.querySelector('#desktopTemplateEditor');
    const valid=d?.querySelector('#templateEditorForm')&&d.querySelector('#dteSubject')&&d.querySelector('#dteBody');
    if(d&&!valid){d.remove();d=null}
    if(d)return bindDialog(d);
    d=document.createElement('dialog');d.id='desktopTemplateEditor';d.className='modal bamco-dialog template-editor-dialog';
    d.innerHTML='<form id="templateEditorForm"><div class="modal-head"><h3>ویرایش متن پیام</h3><button type="button" class="ghost bamco-icon-button" id="dteClose" aria-label="بستن">×</button></div><label>موضوع<input id="dteSubject" required></label><label class="template-body-label">متن پیام<textarea id="dteBody" required spellcheck="false"></textarea></label><p id="dteError" class="form-error" role="alert"></p><div class="modal-actions"><button id="dteSave" class="primary" type="submit">ثبت تغییرات</button><button id="dteCancel" class="ghost" type="button">انصراف</button></div></form>';
    document.body.append(d);return bindDialog(d);
  }

  async function openEditor(){
    const key=document.querySelector('#templateState')?.value||activeKey||'state1',epoch=++loadEpoch,d=ensureDialog(),button=document.querySelector('#openDesktopTemplateEditor'),subject=d.querySelector('#dteSubject'),body=d.querySelector('#dteBody'),save=d.querySelector('#dteSave');
    activeKey=key;if(button)button.disabled=true;save.disabled=true;subject.disabled=true;body.disabled=true;d.querySelector('#dteError').textContent='';subject.value='';body.value='';subject.placeholder='در حال بارگذاری…';body.placeholder='در حال بارگذاری متن الگو…';if(!d.open)d.showModal();
    try{
      const t=await loadTemplate(key);if(epoch!==loadEpoch)return;
      subject.value=t.subject;body.value=t.body;subject.placeholder='';body.placeholder='';
      setTimeout(()=>{if(!d.open)return;body.selectionStart=0;body.selectionEnd=0;body.scrollTop=0;body.focus()},30);
    }catch(error){if(epoch===loadEpoch)d.querySelector('#dteError').textContent=error.message||'متن الگو بارگذاری نشد.'}
    finally{if(epoch===loadEpoch){if(button)button.disabled=false;save.disabled=false;subject.disabled=false;body.disabled=false}}
  }
  document.addEventListener('click',e=>{if(e.target.closest('.content-back,#nav [data-view],#logoutBtn')&&!e.target.closest('#nav [data-view="templates"]'))loadEpoch++},true);

  function renderView(view){
    view.innerHTML=`<div class="panel"><div class="panel-head"><h3>ویرایش متن پیام‌ها</h3></div><div class="template-toolbar-left"><div class="template-picker"><label for="templateState">الگو</label><select id="templateState">${Object.entries(META).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><button id="openDesktopTemplateEditor" type="button" class="primary">ویرایش متن</button></div></div></div>`;
    const selectEl=view.querySelector('#templateState');selectEl.value=activeKey;
    view.querySelector('#openDesktopTemplateEditor').onclick=openEditor;
    selectEl.onchange=e=>{activeKey=e.target.value};
  }
  function install(force=false){
    const view=document.querySelector('#templatesView');if(!view)return;
    ensureStyles();ensureDialog();
    if(!force&&view.dataset.templateEditor==='3'&&view.querySelector('#openDesktopTemplateEditor'))return;
    view.dataset.templateEditor='3';renderView(view);
  }
  window.bamcoTemplateEditor={open:openEditor,install:()=>install(true)};
  function boot(){install(true);setTimeout(()=>install(false),120);setTimeout(()=>install(false),600)}
  document.addEventListener('click',e=>{if(e.target.closest('#nav [data-view="templates"]'))setTimeout(()=>install(false),40)},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
