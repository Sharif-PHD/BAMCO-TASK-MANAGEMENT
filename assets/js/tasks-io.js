(()=>{
let preview=[],importArchived=false,importFile=null;
const key=(o,...ks)=>{for(const k of ks)if(o[k]!==undefined&&String(o[k]).trim()!=='')return o[k];return null};
const iso=v=>{if(!v)return null;if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);if(typeof v==='number'&&window.XLSX?.SSF){const d=window.XLSX.SSF.parse_date_code(v);return d?`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`:null}const s=en(String(v).trim()).replace(/-/g,'/');if(/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)){const [y,m,d]=s.split('/').map(Number);if(y<1700&&typeof jalaliToISO==='function')return jalaliToISO(y,m,d);return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}return null};
function owner(value){const s=norm(value).toLowerCase();return state.profiles.find(p=>norm(p.full_name).toLowerCase()===s||norm(p.excel_name).toLowerCase()===s||String(p.email).toLowerCase()===s)}
async function parse(file){
  importFile=file;await window.bamcoOptions.load(true);
  const XLSX=await window.ensureBamcoXLSX();
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
  const ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});
  preview=rows.map((r,i)=>{
    const who=owner(key(r,'متولی','نام در اکسل','ایمیل','owner'));
    const title=key(r,'عنوان فعالیت','عنوان کار','عنوان','title');
    const status=String(key(r,'وضعیت','status')||window.bamcoOptions.label('status','registered')),errors=[];
    const legacyId=Number(key(r,'شناسه','ID','id'))||null,existing=document.querySelector('#duplicateMode').value==='update'?state.tasks.find(t=>Number(t.legacy_id||t.id)===legacyId):null;
    const data={legacy_id:legacyId,title:String(title||''),description:String(key(r,'توضیحات','description')||''),owner_id:who?.id||null,status,priority:String(key(r,'اولویت','priority')||window.bamcoOptions.label('priority','medium')),start_date:iso(key(r,'تاریخ شروع','start_date')),done_date:iso(key(r,'تاریخ انجام','done_date')),due_date:iso(key(r,'تاریخ پایان','due_date')),reminder_days:Number(key(r,'یادآور','reminder_days')||0),manager_notes:String(key(r,'توضیحات مدیر','manager_notes')||''),archived:importArchived,archived_at:importArchived?new Date().toISOString():null,source:'excel'};
    if(!title)errors.push('عنوان خالی');if(key(r,'متولی','نام در اکسل','ایمیل','owner')&&!who)errors.push('متولی نامعتبر');
    try{window.bamcoOptions.normalizeTask(data,existing);if(importArchived&&!window.bamcoOptions.status(data)?.archivable&&!existing?.archived)errors.push('این وضعیت اجازه آرشیو ندارد')}catch(error){errors.push(error.message)}
    return{row:i+2,errors,data};
  });
  renderPreview(rows.length);
}
function renderPreview(total){const bad=preview.filter(x=>x.errors.length).length;document.querySelector('#importSummary').textContent=`${fa(total)} رکورد بررسی شد؛ ${fa(total-bad)} معتبر و ${fa(bad)} دارای خطاست.`;document.querySelector('#importPreviewBody').innerHTML=preview.slice(0,100).map(x=>`<tr class="${x.errors.length?'row-overdue':''}"><td>${fa(x.row)}</td><td>${fa(x.data.legacy_id||'—')}</td><td>${safe(x.data.title)}</td><td>${safe(ownerName(x.data))}</td><td>${safe(x.errors.join('، ')||'آماده ورود')}</td></tr>`).join('');document.querySelector('#importDialog').showModal()}
async function commit(){const mode=document.querySelector('#duplicateMode').value,valid=preview.filter(x=>!x.errors.length);let ok=0,failed=0,firstError='';for(const r of valid){try{const exists=r.data.legacy_id?state.tasks.find(t=>Number(t.legacy_id||t.id)===r.data.legacy_id):null;if(exists&&mode==='reject')continue;if(exists&&mode==='update')await update('tasks',`id=eq.${exists.id}`,{...r.data,legacy_id:exists.legacy_id});else await insert('tasks',{...r.data,legacy_id:exists&&mode==='create'?null:r.data.legacy_id,created_by:state.profile.id});ok++}catch(e){failed++;if(!firstError)firstError=e.message}}document.querySelector('#importDialog').close();toast(`${fa(ok)} رکورد وارد شد؛ ${fa(failed)} خطا.${firstError?' '+firstError:''}`,failed>0);await refresh()}
async function exportRows(archived){
  await window.bamcoOptions.load(true);
  const XLSX=await window.ensureBamcoXLSX();
  const chosen=new Set(window.bamcoSelection?.ids(archived?'#archiveBody':'#kanbanBody')||[]),rows=state.tasks.filter(t=>!!t.archived===archived&&(!chosen.size||chosen.has(String(t.id)))),headers=['شناسه','عنوان فعالیت','توضیحات','متولی','وضعیت','اولویت','تاریخ شروع','تاریخ انجام','تاریخ پایان','یادآور','آخرین به‌روزرسانی','وضعیت دیرکرد','توضیحات مدیر',...(archived?['تأخیر','تعجیل']:[])];
  const asDate=value=>value?jalaliText(value):'';
  const data=rows.map(t=>[Number(displayId(t)),t.title,t.description||'',ownerName(t),t.status,t.priority,asDate(t.start_date),asDate(t.done_date),asDate(t.due_date),fa(t.reminder_days||0),t.last_updated_at?jalaliDateTime(t.last_updated_at):'',t.due_state||'عادی',t.manager_notes||'',...(archived?[Number(t.delay_days||0),Number(t.advance_days||0)]:[])]);
  const ws=XLSX.utils.aoa_to_sheet([headers,...data]),range=XLSX.utils.decode_range(ws['!ref']);
  const border={top:{style:'thin',color:{rgb:'7F8C87'}},bottom:{style:'thin',color:{rgb:'7F8C87'}},left:{style:'thin',color:{rgb:'7F8C87'}},right:{style:'thin',color:{rgb:'7F8C87'}}};
  for(let r=range.s.r;r<=range.e.r;r++)for(let c=range.s.c;c<=range.e.c;c++){
    const address=XLSX.utils.encode_cell({r,c}),cell=ws[address]||(ws[address]={t:'s',v:''}),persian=/[\u0600-\u06ff]/.test(String(cell.v??''));
    cell.s=r===0?{font:{name:'B Nazanin',sz:14,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'176B4D'}},alignment:{horizontal:'center',vertical:'center',readingOrder:2,wrapText:false},border}:{font:{name:persian?'B Nazanin':'Times New Roman',sz:12},alignment:{horizontal:persian?'right':'left',vertical:'center',readingOrder:persian?2:1,wrapText:true},border};
  }
  for(let r=1;r<=rows.length;r++)for(const [c,type]of [[4,'status'],[5,'priority']]){const cell=ws[XLSX.utils.encode_cell({r,c})],hex=window.bamcoOptions.color(type,rows[r-1]).slice(1),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),light=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];cell.s.fill={patternType:'solid',fgColor:{rgb:hex}};cell.s.font.color={rgb:light>.179?'000000':'FFFFFF'}}
  ws['!views']=[{rightToLeft:true}];ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:range.e.r,c:range.e.c}})};ws['!freeze']={xSplit:0,ySplit:1,topLeftCell:'A2',activePane:'bottomLeft',state:'frozen'};
  for(let r=1;r<=range.e.r;r++){for(const c of [6,7,8])if(ws[XLSX.utils.encode_cell({r,c})]?.v)ws[XLSX.utils.encode_cell({r,c})].z='yyyy/mm/dd';if(ws[XLSX.utils.encode_cell({r,c:10})]?.v)ws[XLSX.utils.encode_cell({r,c:10})].z='yyyy/mm/dd hh:mm'}
  ws['!rows']=[{hpt:28},...rows.map(()=>({hpt:24}))];ws['!cols']=headers.map((h,i)=>({wch:[10,28,42,24,18,12,15,15,15,10,22,18,30,10,10][i]||14}));
  const wb=XLSX.utils.book_new();wb.__bamcoCatalogColors=true;wb.Workbook={Views:[{RTL:true}]};XLSX.utils.book_append_sheet(wb,ws,archived?'آرشیو':'کانبان');XLSX.writeFile(wb,`خروجی ${archived?'آرشیو':'کانبان'}_${jalaliText(new Date().toISOString()).replaceAll('/','-')}.xlsx`,{compression:true});toast('فایل Excel راست‌چین و قالب‌بندی‌شده آماده شد.');
}
document.querySelector('#importBtn')?.addEventListener('click',()=>{importArchived=false;document.querySelector('#importFile').click()});document.querySelector('#archiveImportBtn')?.addEventListener('click',()=>{importArchived=true;document.querySelector('#importFile').click()});document.querySelector('#importFile')?.addEventListener('change',e=>e.target.files?.[0]&&parse(e.target.files[0]).catch(x=>toast(x.message,true)));document.querySelector('#commitImportBtn')?.addEventListener('click',commit);document.querySelector('#kanbanExportBtn')?.addEventListener('click',()=>exportRows(false));document.querySelector('#archiveExportBtn')?.addEventListener('click',()=>exportRows(true));
document.querySelector('#duplicateMode')?.addEventListener('change',()=>{if(importFile&&document.querySelector('#importDialog')?.open)parse(importFile).catch(e=>toast(e.message,true))});
window.BAMCO_DATA_IO={iso,exportRows,parse};
})();
