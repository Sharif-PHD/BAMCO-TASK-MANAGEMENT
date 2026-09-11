(()=>{
'use strict';
if(window.__bamcoRuntimeFixes20260911)return;
window.__bamcoRuntimeFixes20260911=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];

function installStyles(){
  if(q('#bamcoRuntimeFixes20260911Css'))return;
  const style=document.createElement('style');style.id='bamcoRuntimeFixes20260911Css';style.textContent=`
    @media(max-width:700px){
      html body #departmentEntry{min-height:100dvh!important;height:auto!important;overflow:auto!important;justify-content:flex-start!important;padding:18px 12px 24px!important}
      html body #departmentEntry header{margin:0 auto 16px!important;max-width:430px!important}
      html body #departmentEntry header img{width:166px!important;height:104px!important;padding:15px 20px!important;border-radius:14px!important}
      html body #departmentEntry h1{font-size:21px!important;line-height:1.7!important;margin:12px 0 2px!important}
      html body #departmentEntry header p{font-size:16px!important;line-height:1.6!important}
      html body #departmentEntry .department-grid{grid-template-columns:1fr!important;gap:10px!important;width:100%!important;max-width:430px!important}
      html body #departmentEntry .department-grid button{aspect-ratio:auto!important;min-height:96px!important;width:100%!important;display:grid!important;grid-template-columns:58px minmax(0,1fr) auto!important;align-items:center!important;justify-content:stretch!important;gap:12px!important;padding:12px 14px!important;border-radius:14px!important;text-align:right!important;text-align-last:right!important}
      html body #departmentEntry .department-icon{width:54px!important;height:54px!important;border-radius:13px!important}
      html body #departmentEntry .department-icon svg{width:32px!important;height:32px!important}
      html body #departmentEntry .department-grid strong{font-size:17px!important;line-height:1.7!important;text-align:right!important;text-align-last:right!important}
      html body #departmentEntry .department-state{font-size:13px!important;white-space:nowrap!important;padding:4px 8px!important}
      html body.content-only #appView #sidebar.sidebar,
      html body.content-only #appView #sidebar.sidebar.collapsed{position:fixed!important;inset:0 0 auto 0!important;left:0!important;right:0!important;top:0!important;width:100%!important;max-width:none!important;min-width:0!important;height:130px!important;max-height:130px!important;transform:none!important;margin:0!important;border-left:0!important;border-right:0!important;border-radius:0!important;overflow:visible!important}
      html body.content-only #appView .workspace,
      html body.content-only #appView.app:has(#sidebar.collapsed) .workspace{margin-left:0!important;margin-right:0!important;width:100%!important;max-width:none!important;padding-right:10px!important;padding-left:10px!important}
      html body.content-only #appView #collapseBtn{display:none!important}
    }
    #systemOptionsView .catalog-section,#systemOptionsView .table-wrap,#systemOptionsView .catalog-table{width:100%!important;max-width:none!important}
    #systemOptionsView .catalog-table{table-layout:auto!important}
  `;document.head.append(style);
}

function clearLegacyMobileShell(){
  if(!matchMedia('(max-width:700px)').matches)return;
  const marker='bamco.mobile-shell-reset.20260911.1';
  try{
    if(!localStorage.getItem(marker)){
      for(const storage of [localStorage,sessionStorage])for(const key of Object.keys(storage)){
        if(/(?:sidebar|side-bar|nav).*(?:collapse|collapsed|drawer|mobile|width)|(?:collapse|collapsed|drawer|mobile).*(?:sidebar|nav)/i.test(key))storage.removeItem(key);
      }
      localStorage.setItem(marker,'1');
      if(typeof caches!=='undefined')caches.keys().then(async names=>{for(const name of names){if(/bamco/i.test(name)&&!/sticker/i.test(name))await caches.delete(name)}}).catch(()=>{});
    }
  }catch{}
  const normalize=()=>{
    const sidebar=q('#sidebar');if(!sidebar)return;
    sidebar.classList.remove('collapsed','mobile-open','sidebar-open','drawer-open','open-mobile');
    for(const p of ['width','max-width','min-width','height','max-height','left','right','top','bottom','transform','margin-left','margin-right'])sidebar.style.removeProperty(p);
    q('#collapseBtn')?.setAttribute('aria-expanded','false');
  };
  normalize();
  const sidebar=q('#sidebar');if(sidebar&&!sidebar.dataset.mobileShellGuard){
    sidebar.dataset.mobileShellGuard='1';new MutationObserver(normalize).observe(sidebar,{attributes:true,attributeFilter:['class','style']});
  }
  addEventListener('resize',normalize,{passive:true});
}

function tableAoA(table){
  const headerCells=[...(table.tHead?.rows?.[0]?.cells||[])],keep=headerCells.map((th,i)=>({i,name:th.textContent.trim()})).filter(x=>x.name&&x.name!=='عملیات');
  const rows=[...table.tBodies[0]?.rows||[]].filter(r=>!r.querySelector('.empty'));
  return [keep.map(x=>x.name),...rows.map(row=>keep.map(x=>row.cells[x.i]?.textContent.trim()||''))];
}
function fitSheet(X,ws,data){
  ws['!views']=[{rightToLeft:true}];
  const cols=data[0]?.length||0;ws['!cols']=Array.from({length:cols},(_,c)=>({wch:Math.min(48,Math.max(11,...data.map(r=>String(r[c]??'').length+2)))}));
}
async function exportSystemOptions(view){
  const tables=qa('.catalog-table',view);if(tables.length<2)throw Error('هر دو جدول وضعیت و اولویت هنوز آماده نشده‌اند.');
  const X=await window.ensureBamcoXLSX(),wb=X.utils.book_new();
  const sheets=[['وضعیت',tables[0]],['اولویت',tables[1]]];
  for(const [name,table] of sheets){const data=tableAoA(table),ws=X.utils.aoa_to_sheet(data);fitSheet(X,ws,data);X.utils.book_append_sheet(wb,ws,name)}
  wb.__bamcoCatalogColors=true;wb.Workbook={Views:[{RTL:true}]};
  X.writeFile(wb,'وضعیت‌ها و اولویت‌ها.xlsx',{compression:true});
  if(typeof toast==='function')toast('فایل Excel با دو شیت وضعیت و اولویت آماده شد.');
}
function patchOptionsExport(){
  const apply=()=>{
    const original=window.bamcoExportTable;if(typeof original!=='function'||original.__bamcoOptionsTwoSheets)return false;
    const wrapped=async table=>{const view=table?.closest?.('.view');if(view?.id==='systemOptionsView')return exportSystemOptions(view);return original(table)};
    wrapped.__bamcoOptionsTwoSheets=true;wrapped.__bamcoOriginal=original;window.bamcoExportTable=wrapped;return true;
  };
  if(!apply()){let tries=0;const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},100)}
}
function fixCatalogReset(){
  document.addEventListener('click',e=>{
    const btn=e.target.closest('#systemOptionsView .suite-reset');if(!btn)return;
    const options=btn.closest('.suite-table-options'),host=options?.previousElementSibling,table=host?.matches('.table-wrap')?host.querySelector('table'):host?.querySelector?.('table');if(!table)return;
    setTimeout(()=>{
      table.querySelector(':scope>colgroup')?.remove();
      table.style.removeProperty('width');table.style.removeProperty('min-width');table.style.removeProperty('table-layout');
      table.style.setProperty('width','100%','important');table.style.setProperty('table-layout','auto','important');
      qa('th,td',table).forEach(cell=>{cell.style.removeProperty('width');cell.style.removeProperty('min-width');cell.style.removeProperty('max-width')});
      const last=table.tHead?.rows?.[0]?.cells?.[table.tHead.rows[0].cells.length-1];if(last){last.style.removeProperty('width');last.style.removeProperty('min-width');last.style.removeProperty('max-width')}
      requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
    },0);
  },true);
}

function boot(){installStyles();clearLegacyMobileShell();patchOptionsExport();fixCatalogReset()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
