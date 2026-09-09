/* Interior presentation only. Home, navigation, permissions and data stay with
   their existing modules. Reconcile in place so form state/listeners survive. */
(()=>{
  'use strict';
  const excluded=new Set(['homeView','welcomeView']);
  const headings={dashboardView:'داشبورد',templatesView:'متن پیام‌ها',settingsView:'تنظیمات کاربری'};
  const toolbarSelector='.task-toolbar,.vehicle-toolbar,.people-actions,.manager-toolbar,.workspace-actions,.workspace-report-tools,.suite-toolbar,.sticker-toolbar,.message-center-actions,.response-quick,.tt-switch';
  let pending=false,observer;
  const eligible=view=>view?.matches('.workspace > .view')&&!excluded.has(view.id);
  function decorateView(view){
    if(!eligible(view))return;
    view.classList.add('bamco-interior');
    let head=view.querySelector(':scope > .bamco-page-heading');
    const source=view.querySelector('.panel-head h3,.vehicle-panel-head h3,.tt-head h3');
    const nav=document.querySelector(`#nav [data-view="${view.id.replace(/View$/,'')}"] span`);
    const title=source?.textContent.trim()||head?.querySelector('h3')?.textContent||headings[view.id]||nav?.textContent.trim()||'اطلاعات';
    if(!head){
      head=document.createElement('header');head.className='bamco-page-heading';
      const h=document.createElement('h3');head.append(h);view.prepend(head);
    }
    if(view.firstElementChild!==head)view.prepend(head);
    const h=head.querySelector('h3');if(h.textContent!==title)h.textContent=title;
    let back=view.querySelector('.content-back');
    if(!back){back=document.createElement('button');back.type='button';back.className='content-back ghost';back.textContent='بازگشت به خانه';back.addEventListener('click',()=>window.bamcoShowHome?.())}
    if(back.parentElement!==head)head.prepend(back);
    view.querySelectorAll('.content-back').forEach(b=>{if(b!==back)b.remove()});
    view.querySelectorAll(':scope > .content-actions').forEach(b=>{if(!b.querySelector('button,a,input,select'))b.remove()});
    if(source){
      source.classList.add('bamco-source-title');
      const nativeHead=source.closest('.panel-head,.vehicle-panel-head,.tt-head');
      const bar=view.querySelector(toolbarSelector);
      if(bar&&!bar.closest('dialog,form,details')&&!nativeHead.contains(bar)){
        [...nativeHead.children].forEach(child=>{
          if(child!==source&&!child.contains(source)&&child.matches('button,a,.workspace-actions'))bar.prepend(child);
        });
      }
      const hasActions=nativeHead.querySelector('button,a,input,select,textarea,summary');
      nativeHead.classList.toggle('bamco-empty-heading',!hasActions);
      nativeHead.classList.toggle('bamco-control-row',!!hasActions);
    }
    [...view.children].forEach(child=>{
      if(child!==head&&!child.matches('style,script,input,dialog,.content-actions'))child.classList.add('bamco-page-body');
    });
    view.querySelectorAll(toolbarSelector).forEach(bar=>{
      if(!bar.closest('dialog,form,details'))bar.classList.add('bamco-command-bar');
    });
    view.querySelectorAll('.response-filters,.message-center-filters,.tt-filters,.dashboard-filter-grid').forEach(el=>el.classList.add('bamco-filter-bar'));
    view.querySelectorAll('button:not([aria-label])').forEach(button=>{
      if(button.title&&!button.textContent.trim())button.setAttribute('aria-label',button.title);
    });
  }
  function scan(){
    pending=false;observer?.disconnect();
    document.querySelectorAll('.workspace > .view').forEach(decorateView);
    document.querySelectorAll('dialog:not(.home-welcome-dialog)').forEach(d=>d.classList.add('bamco-dialog'));
    observer?.observe(document.body,{childList:true,subtree:true});
  }
  function install(){
    observer=new MutationObserver(records=>{
      if(!records.some(r=>r.target.nodeType===1&&(r.target.closest('.workspace,.bamco-dialog')||[...r.addedNodes].some(n=>n.nodeType===1&&n.matches?.('dialog')))))return;
      if(!pending){pending=true;requestAnimationFrame(scan)}
    });
    scan();
  }
  window.bamcoInteriorUI={decorateView};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
