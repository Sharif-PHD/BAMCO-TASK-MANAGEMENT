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

  // Task export is owned by tasks-io.js; no second click interceptor.

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

