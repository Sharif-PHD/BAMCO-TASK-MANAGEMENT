(()=>{
  const q=s=>document.querySelector(s);

  // Keep password changes optional. Database defaults are also false.
  const keepPasswordOptional=()=>{const cancel=q('#cancelPasswordBtn');if(cancel)cancel.classList.remove('hidden')};
  keepPasswordOptional();

  // Task columns now start at identifier; filter indices match data columns directly.
  document.addEventListener('change',e=>{
    const sel=e.target.closest?.('#kanbanView .column-filters select,#archiveView .column-filters select');if(!sel)return;
    e.stopImmediatePropagation();
    const scope=sel.closest('.view').id.startsWith('archive')?'archive':'kanban';
    tableFilters[scope][sel.closest('th').cellIndex]=sel.value;renderTasks(scope==='archive');
  },true);

  // Excel export: keep the current formatting, but emit Persian digits for Reminder.
  async function exportRowsFaReminder(archived){
    const XLSX=await window.ensureBamcoXLSX();
    const rows=state.tasks.filter(t=>!!t.archived===archived),headers=['شناسه','عنوان فعالیت','توضیحات','متولی','وضعیت','اولویت','تاریخ شروع','تاریخ انجام','تاریخ پایان','یادآور','آخرین به‌روزرسانی','وضعیت دیرکرد','توضیحات مدیر',...(archived?['تأخیر','تعجیل']:[])];
    const data=rows.map(t=>[displayId(t),t.title,t.description||'',ownerName(t),t.status,t.priority,jalaliText(t.start_date),jalaliText(t.done_date),jalaliText(t.due_date),fa(t.reminder_days),jalaliDateTime(t.last_updated_at),t.due_state||'عادی',t.manager_notes||'',...(archived?[fa(t.delay_days||0),fa(t.advance_days||0)]:[])]);
    const ws=XLSX.utils.aoa_to_sheet([headers,...data]),range=XLSX.utils.decode_range(ws['!ref']);
    const border={top:{style:'thin',color:{rgb:'7F8C87'}},bottom:{style:'thin',color:{rgb:'7F8C87'}},left:{style:'thin',color:{rgb:'7F8C87'}},right:{style:'thin',color:{rgb:'7F8C87'}}};
    for(let r=range.s.r;r<=range.e.r;r++)for(let c=range.s.c;c<=range.e.c;c++){
      const address=XLSX.utils.encode_cell({r,c}),cell=ws[address]||(ws[address]={t:'s',v:''}),persian=/[\u0600-\u06ff]/.test(String(cell.v??''));
      cell.s=r===0?{font:{name:'B Nazanin',sz:14,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'176B4D'}},alignment:{horizontal:'center',vertical:'center',readingOrder:2,wrapText:false},border}:{font:{name:persian?'B Nazanin':'Times New Roman',sz:12},alignment:{horizontal:persian?'right':'left',vertical:'center',readingOrder:persian?2:1,wrapText:true},border};
    }
    ws['!views']=[{rightToLeft:true}];ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:range.e.r,c:range.e.c}})};ws['!freeze']={xSplit:0,ySplit:1,topLeftCell:'A2',activePane:'bottomLeft',state:'frozen'};
    ws['!rows']=[{hpt:28},...rows.map(()=>({hpt:24}))];ws['!cols']=headers.map((h,i)=>({wch:[10,28,42,24,18,12,15,15,15,10,22,18,30,10,10][i]||14}));
    const wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};XLSX.utils.book_append_sheet(wb,ws,archived?'Archive':'KANBAN');XLSX.writeFile(wb,`BAMCO_${archived?'Archive':'KANBAN'}_${new Date().toISOString().slice(0,10)}.xlsx`,{compression:true});toast('فایل Excel راست‌چین و قالب‌بندی‌شده آماده شد.');
  }
  document.addEventListener('click',e=>{const btn=e.target.closest?.('#kanbanExportBtn,#archiveExportBtn');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();exportRowsFaReminder(btn.id==='archiveExportBtn')},true);

  // IMPORTANT: avatar upload/crop is owned only by manager.js. Do not attach a second
  // listener here; the previous duplicate handler was conflicting with the existing
  // #avatarCropDialog and caused selected profile images not to be persisted correctly.
  const pwBtn=q('#changePasswordBtn');
  if(pwBtn){
    pwBtn.title='تغییر رمز عبور اختیاری است.';
    const panel=pwBtn.closest('.panel'),small=panel?.querySelector('.panel-head small');
    if(small&&!small.textContent.includes('اختیاری'))small.textContent='نام نمایشی، تصویر پروفایل و تغییر اختیاری رمز عبور';
  }
  setTimeout(()=>{keepPasswordOptional();if(typeof state!=='undefined'&&state.profile)window.refreshProfileAvatar?.()},500);
})();

