(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const labels={columns:'ستون‌ها',density:'نمای فشرده',fullscreen:'تمام‌صفحه',reset:'بازنشانی جدول'};

  function tableOf(scope){return q(`#${scope}View table`)}
  function headerText(th){return (th.childNodes[0]?.textContent||th.textContent||'').trim()}

  function sortTable(table,index,direction){
    const body=table.tBodies[0];if(!body)return;
    const rows=qa('tr',body),number=s=>Number(String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[,٬]/g,''));
    rows.sort((a,b)=>{
      const av=a.cells[index]?.innerText.trim()||'',bv=b.cells[index]?.innerText.trim()||'',an=number(av),bn=number(bv);
      const result=Number.isFinite(an)&&Number.isFinite(bn)?an-bn:av.localeCompare(bv,'fa',{numeric:true,sensitivity:'base'});
      return direction==='asc'?result:-result;
    });
    rows.forEach(row=>body.appendChild(row));
  }

  function installSort(table){
    qa('thead tr:first-child th',table).forEach((th,index)=>{
      if(th.dataset.workbenchSort==='1'||headerText(th)==='انتخاب')return;
      th.dataset.workbenchSort='1';th.classList.add('wb-sortable');th.tabIndex=0;th.title='مرتب‌سازی این ستون';
      const apply=()=>{
        const next=th.dataset.sortDirection==='asc'?'desc':'asc';
        qa('thead th',table).forEach(x=>{delete x.dataset.sortDirection;x.removeAttribute('aria-sort')});
        th.dataset.sortDirection=next;th.setAttribute('aria-sort',next==='asc'?'ascending':'descending');sortTable(table,index,next);
      };
      th.addEventListener('click',e=>{if(e.target.closest('.column-resize-handle,select,input,button'))return;apply()});
      th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();apply()}});
    });
  }

  function toggleColumn(table,index,show){
    qa('tr',table).forEach(row=>row.cells[index]?.classList.toggle('wb-column-hidden',!show));
  }

  function columnMenu(scope,table,button){
    q('.wb-column-menu')?.remove();
    const menu=document.createElement('div');menu.className='wb-column-menu';
    qa('thead tr:first-child th',table).forEach((th,index)=>{
      const name=headerText(th);if(!name||name==='انتخاب')return;
      const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=!th.classList.contains('wb-column-hidden');
      input.addEventListener('change',()=>toggleColumn(table,index,input.checked));label.append(input,document.createTextNode(name));menu.appendChild(label);
    });
    button.parentElement.appendChild(menu);
    const close=e=>{if(!menu.contains(e.target)&&e.target!==button){menu.remove();document.removeEventListener('pointerdown',close,true)}};
    setTimeout(()=>document.addEventListener('pointerdown',close,true));
  }

  function reset(scope,table){
    try{localStorage.removeItem(`bamco-${scope}-column-widths-v6`)}catch{}
    qa('.column-filters select',table).forEach(x=>{x.value='';x.dispatchEvent(new Event('change',{bubbles:true}))});
    qa('thead th',table).forEach((th,index)=>{th.classList.remove('wb-column-hidden');delete th.dataset.sortDirection;th.removeAttribute('aria-sort');toggleColumn(table,index,true)});
    table.closest('.table-panel')?.classList.remove('wb-compact','wb-fullscreen');
    window.dispatchEvent(new Event('resize'));
  }

  function install(scope){
    const table=tableOf(scope),panel=table?.closest('.table-panel'),toolbar=q(`#${scope}View .task-toolbar`);if(!table||!panel||!toolbar)return;
    installSort(table);
    if(toolbar.querySelector('.table-workbench'))return;
    const tools=document.createElement('div');tools.className='table-workbench';
    const make=(name,icon)=>{const b=document.createElement('button');b.type='button';b.className='ghost wb-tool';b.dataset.tool=name;b.title=labels[name];b.setAttribute('aria-label',labels[name]);b.innerHTML=`<span aria-hidden="true">${icon}</span><em>${labels[name]}</em>`;return b};
    const cols=make('columns','▥'),density=make('density','≡'),full=make('fullscreen','⛶'),clear=make('reset','↺');tools.append(cols,density,full,clear);toolbar.appendChild(tools);
    cols.onclick=()=>columnMenu(scope,table,cols);
    density.onclick=()=>{const on=panel.classList.toggle('wb-compact');density.classList.toggle('active',on)};
    full.onclick=()=>{const on=panel.classList.toggle('wb-fullscreen');full.classList.toggle('active',on);full.querySelector('em').textContent=on?'خروج از تمام‌صفحه':labels.fullscreen};
    clear.onclick=()=>reset(scope,table);
  }

  function refresh(){for(const scope of ['kanban','archive'])install(scope)}
  const boot=()=>{refresh();const app=q('#appView');if(app)new MutationObserver(()=>requestAnimationFrame(refresh)).observe(app,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
