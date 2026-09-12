from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')

def write(path, text):
    Path(path).write_text(text, encoding='utf-8')

def must(cond, msg):
    if not cond:
        raise RuntimeError(msg)

def replace_once(src, old, new, label):
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, got {count}')
    return src.replace(old, new, 1)

# --- 1) Welcome card: fully remove waiting-work UI, logic and style. ---
home = read('assets/js/card-home.js')
home = replace_once(home, '<button class="welcome-waiting-link" type="button" data-welcome-waiting><span>امور منتظر پاسخ</span><strong data-welcome-waiting-count>۰</strong></button>', '', 'welcome waiting button')
home, n = re.subn(r'\n async function syncWelcomeWaiting\(\)\{.*?\n function openWaitingKanban\(\)\{.*?(?=\n window\.bamcoPrepareWelcomeStickers=)', '', home, count=1, flags=re.S)
must(n == 1, 'welcome waiting functions')
home = replace_once(home, ';void stickers();void syncWelcomeWaiting()}', ';void stickers()}', 'welcome open sync')
home = replace_once(home, "\n dialog.querySelector('[data-welcome-waiting]').addEventListener('click',openWaitingKanban);", '', 'welcome waiting listener')
must(not re.search(r'welcome-waiting|syncWelcomeWaiting|openWaitingKanban|امور منتظر پاسخ', home), 'welcome waiting residue remains')
write('assets/js/card-home.js', home)

home_css = read('assets/css/card-home.css')
home_css, n = re.subn(r'\n/\* Waiting-work shortcut[\s\S]*$', '\n', home_css, count=1)
must(n == 1, 'welcome waiting css block')
must('welcome-waiting' not in home_css, 'welcome waiting css residue')
write('assets/css/card-home.css', home_css)

# --- 2) Shared automatic-message renderer: one source of truth for risk + waiting. ---
renderer = read('assets/js/message-renderer.js')
start = renderer.find('function taskTable(snapshot,kind){')
end = renderer.find('function html(', start)
must(start >= 0 and end > start, 'message task renderer range')
task_section = r'''function normalizeTaskStatus(value){return String(value??'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim()}
function taskGroups(snapshot){
 const tasks=Array.isArray(snapshot?.tasks)?snapshot.tasks:[],warningIds=new Set((snapshot?.warning_task_ids||[]).map(String)),overdueIds=new Set((snapshot?.overdue_task_ids||[]).map(String)),waitingIds=new Set((snapshot?.waiting_task_ids||[]).map(String));
 return{
  warning:tasks.filter(t=>warningIds.has(String(t.id))||t.due_state==='warning'),
  overdue:tasks.filter(t=>overdueIds.has(String(t.id))||t.due_state==='overdue'),
  waiting:tasks.filter(t=>waitingIds.has(String(t.id))||normalizeTaskStatus(t.status_key)==='waiting'||normalizeTaskStatus(t.status)==='منتظر پاسخ')
 }
}
function tableShell(rows,{kind,head,soft,soft2,border,columns}){
 if(!rows.length)return `<div class="workflow-task-empty workflow-${kind}" style="padding:10px 12px;border-radius:10px;background:${soft}!important;border:1px solid ${border};font-weight:400;text-align:center!important">${text(kind==='waiting'?'موردی در انتظار پاسخ نیست':'موردی وجود ندارد.')}</div>`;
 return `<div class="workflow-task-scroll" style="overflow:auto;max-width:100%"><table dir="rtl" cellpadding="0" cellspacing="0" style="width:100%;min-width:520px;margin:0 auto;border-collapse:collapse;table-layout:fixed;direction:rtl;text-align:center;font-family:'B Nazanin',serif;font-size:13pt;background:${soft}!important"><thead><tr>${columns.map(v=>`<th style="background:${head}!important;color:#20382f!important;border:1px solid ${border}!important;padding:7px 6px!important;text-align:center!important">${text(v.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((t,i)=>{const bg=i%2?soft2:soft;return `<tr data-bamco-task-id="${escape(t.id)}" style="cursor:pointer;background:${bg}!important">${columns.map(col=>`<td style="background:${bg}!important;color:#172b25!important;border:1px solid ${border}!important;padding:7px 6px!important;overflow-wrap:anywhere;vertical-align:middle;text-align:center!important">${taskLink(t,col.value(t))}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`
}
const riskColumns=[
 {label:'نوع',value:t=>t.__risk},{label:'شناسه',value:t=>t.legacy_id||t.id},{label:'عنوان فعالیت',value:t=>t.title},
 {label:'وضعیت',value:t=>t.status},{label:'اولویت',value:t=>t.priority},{label:'تاریخ پایان',value:t=>date(t.due_date)}
];
const waitingColumns=[
 {label:'شناسه',value:t=>t.legacy_id||t.id},{label:'عنوان فعالیت',value:t=>t.title},{label:'وضعیت',value:t=>t.status},
 {label:'اولویت',value:t=>t.priority},{label:'تاریخ شروع',value:t=>date(t.start_date)}
];
function riskSection(snapshot){const g=taskGroups(snapshot),rows=[...g.overdue.map(t=>({...t,__risk:'دیرکردی'})),...g.warning.map(t=>({...t,__risk:'هشداری'}))],count=rows.length;return `<section class="workflow-auto-section workflow-risk-section" style="flex:1 1 430px;min-width:0;border:1px solid #dec176;border-radius:12px;padding:10px;background:#fffdf6"><div style="font-weight:700;font-size:15pt;margin:0 0 7px;color:#654d12;text-align:right">امور هشداری و دیرکردی <span style="font-family:Tahoma,sans-serif;font-size:11pt;font-weight:400">(${fa(count)} مورد)</span></div>${tableShell(rows,{kind:'risk',head:'#e8c56a',soft:'#fff8e8',soft2:'#fff3d4',border:'#d7b354',columns:riskColumns})}</section>`}
function waitingSection(snapshot){const rows=taskGroups(snapshot).waiting,count=rows.length;return `<section class="workflow-auto-section workflow-waiting-section" style="flex:1 1 370px;min-width:0;border:1px solid #c8b0eb;border-radius:12px;padding:10px;background:#fcfaff"><div style="font-weight:700;font-size:15pt;margin:0 0 7px;color:#69459a;text-align:right">امور منتظر پاسخ <span style="font-family:Tahoma,sans-serif;font-size:11pt;font-weight:400">(${fa(count)} مورد)</span></div>${tableShell(rows,{kind:'waiting',head:'#c8b0eb',soft:'#faf6ff',soft2:'#f1e8ff',border:'#b697e2',columns:waitingColumns})}</section>`}
function automaticTaskSections(snapshot){return `<div class="workflow-auto-task-grid" style="width:calc(100% - 28px);max-width:980px;margin:10px auto 12px;display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px;direction:rtl">${riskSection(snapshot)}${waitingSection(snapshot)}</div>`}
function taskTable(snapshot,kind){const g=taskGroups(snapshot);if(kind==='warning')return tableShell(g.warning,{kind:'warning',head:'#f0c44c',soft:'#fff8dc',soft2:'#fff3c3',border:'#d8ad34',columns:riskColumns.slice(1)});if(kind==='overdue')return tableShell(g.overdue,{kind:'overdue',head:'#e8756e',soft:'#fff0ee',soft2:'#fde3df',border:'#cf5e58',columns:riskColumns.slice(1)});return tableShell(g.waiting,{kind:'waiting',head:'#c8b0eb',soft:'#faf6ff',soft2:'#f1e8ff',border:'#b697e2',columns:waitingColumns})}
'''
renderer = renderer[:start] + task_section + renderer[end:]
old = "const rendered=body.split(/(\\[جدول امور هشداری\\]|\\[جدول امور دیرکردی\\]|\\[استیکر\\])/g).map(part=>part==='[جدول امور هشداری]'?taskTable(snapshot||{},'warning'):part==='[جدول امور دیرکردی]'?taskTable(snapshot||{},'overdue'):part==='[استیکر]'?safeImage:copyBlock(part)).join('');return"
new = "let taskSectionsRendered=false;const rendered=body.split(/(\\[جدول امور هشداری\\]|\\[جدول امور دیرکردی\\]|\\[جدول امور منتظر پاسخ\\]|\\[استیکر\\])/g).map(part=>{if(part==='[جدول امور هشداری]'||part==='[جدول امور دیرکردی]'||part==='[جدول امور منتظر پاسخ]'){if(taskSectionsRendered)return'';taskSectionsRendered=true;return automaticTaskSections(snapshot||{})}return part==='[استیکر]'?safeImage:copyBlock(part)}).join('');return"
renderer = replace_once(renderer, old, new, 'message placeholder renderer')
renderer = replace_once(renderer, 'const api={html,taskTable,date,fullDate,escape,APP_URL,openTaskInKanban,hydrateSystemBody}', 'const api={html,taskTable,taskGroups,automaticTaskSections,date,fullDate,escape,APP_URL,openTaskInKanban,hydrateSystemBody}', 'message renderer exports')
must('workflow-waiting-section' in renderer and 'workflow-risk-section' in renderer, 'automatic message sections missing')
write('assets/js/message-renderer.js', renderer)

# --- 3) Documents: stable in-app modal preview, MIME fallback and five renderer paths. ---
docs = read('assets/js/documents-sites.js')
docs = replace_once(docs, "'application/pdf':'PDF','image/png':'تصویر','image/jpeg':'تصویر','image/webp':'تصویر','text/plain':'متن','text/csv':'CSV',", "'application/pdf':'PDF','image/png':'تصویر','image/jpeg':'تصویر','image/webp':'تصویر','image/gif':'تصویر','text/plain':'متن','text/csv':'CSV',", 'document MIME labels')
docs = replace_once(docs, "const feature={categories:[],documents:[],docQuery:'',sites:[],assignments:[],credentials:new Map(),siteQuery:'',siteFilter:'all',docLoading:false,siteLoading:false};", "const feature={categories:[],documents:[],docQuery:'',sites:[],assignments:[],credentials:new Map(),siteQuery:'',siteFilter:'all',docLoading:false,siteLoading:false,preview:{doc:null,mime:'',nativeUrl:'',workbook:null}};", 'feature preview state')
old_private = "async function privateFile(path){const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/${DOC_BUCKET}/${encodePath(path)}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'no-store'});if(!res.ok){let msg='دریافت فایل انجام نشد.';try{const d=await res.json();msg=d.message||d.error||msg}catch{}throw Error(msg)}return res.blob()}"
new_private = "function storageError(status,data,fallback='دریافت فایل انجام نشد.'){const server=data?.message||data?.error;if(status===401)return'نشست شما منقضی شده یا احراز هویت معتبر نیست.';if(status===403)return'مجوز مشاهده این فایل را ندارید.';if(status===404)return'فایل در فضای ذخیره‌سازی پیدا نشد.';return server||fallback}\nasync function privateFile(path){const res=await fetch(`${SB_URL}/storage/v1/object/authenticated/${DOC_BUCKET}/${encodePath(path)}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},cache:'no-store'});if(!res.ok){let data={};try{data=await res.json()}catch{}throw Error(storageError(res.status,data))}return res.blob()}"
docs = replace_once(docs, old_private, new_private, 'private file error handling')
docs = replace_once(docs, 'accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.xls,.xlsx,.docx"', 'accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.xls,.xlsx,.docx"', 'document input accept')
preview_dialog = '<dialog id="documentPreviewDialog" class="modal feature-preview-modal"><div class="modal-head"><div><h3 id="documentPreviewTitle">پیش‌نمایش سند</h3><p id="documentPreviewMeta"></p></div><button type="button" data-feature-close="documentPreviewDialog" aria-label="بستن">×</button></div><div class="feature-preview-toolbar"><button type="button" class="ghost" id="documentPreviewOpenTab" disabled>باز کردن در تب جدید</button><button type="button" class="ghost" id="documentPreviewDownload" disabled>دانلود</button></div><div id="documentPreviewBody" class="feature-preview-body" aria-live="polite"><div class="feature-preview-state">فایلی انتخاب نشده است.</div></div></dialog>\n'
docs = replace_once(docs, '<dialog id="siteDialog" class="modal">', preview_dialog + '<dialog id="siteDialog" class="modal">', 'preview dialog')
close_wire = "qa('[data-feature-close]').forEach(b=>b.addEventListener('click',()=>{const d=q('#'+b.dataset.featureClose);if(d?.id==='credentialRevealDialog')clearReveal();d?.close()}));"
close_wire_new = close_wire + "q('#documentPreviewDialog')?.addEventListener('close',resetDocumentPreview);q('#documentPreviewOpenTab')?.addEventListener('click',()=>{if(feature.preview.nativeUrl)window.open(feature.preview.nativeUrl,'_blank','noopener,noreferrer')});q('#documentPreviewDownload')?.addEventListener('click',e=>{if(feature.preview.doc)void downloadDocument(feature.preview.doc.id,e.currentTarget)});"
docs = replace_once(docs, close_wire, close_wire_new, 'preview dialog wiring')
start = docs.find('function openDocumentPreviewTab(){')
end = docs.find('async function downloadDocument', start)
must(start >= 0 and end > start, 'old preview implementation range')
preview_impl = r'''const EXT_MIME={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',txt:'text/plain',csv:'text/csv',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
function documentMime(doc){const stored=String(doc?.mime_type||'').trim().toLowerCase();if(stored&&stored!=='application/octet-stream'&&stored!=='binary/octet-stream')return stored;const ext=String(doc?.original_file_name||doc?.storage_path||'').split('.').pop().toLowerCase();return EXT_MIME[ext]||stored||'application/octet-stream'}
function resetDocumentPreview(){feature.preview={doc:null,mime:'',nativeUrl:'',workbook:null};const body=q('#documentPreviewBody');if(body)body.innerHTML='<div class="feature-preview-state">فایلی انتخاب نشده است.</div>';const open=q('#documentPreviewOpenTab'),download=q('#documentPreviewDownload');if(open)open.disabled=true;if(download)download.disabled=true}
function previewError(message){const body=q('#documentPreviewBody');if(body)body.innerHTML=`<div class="feature-preview-state feature-preview-error"><b>پیش‌نمایش فایل انجام نشد.</b><span>${esc(message||'خطای ناشناخته')}</span></div>`}
async function signedDocumentUrl(path){const res=await fetch(`${SB_URL}/storage/v1/object/sign/${DOC_BUCKET}/${encodePath(path)}`,{method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`,'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({expiresIn:300})});const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}if(!res.ok)throw Error(storageError(res.status,data,'لینک امن پیش‌نمایش دریافت نشد.'));const raw=data?.signedURL||data?.signedUrl||data?.signed_url;if(!raw)throw Error('لینک امن پیش‌نمایش دریافت نشد.');if(/^https?:\/\//i.test(raw))return raw;return `${SB_URL}/storage/v1${raw.startsWith('/')?'':'/'}${raw}`}
function renderSheet(workbook,name){const host=q('#documentPreviewSheetHost'),XLSX=window.__bamcoPreviewXLSX;if(!host||!XLSX)return;const rows=XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:''}).slice(0,500),cols=Math.min(80,Math.max(1,...rows.map(r=>r.length)));host.innerHTML=rows.length?`<table class="feature-preview-table"><tbody>${rows.map((row,i)=>`<tr>${Array.from({length:cols},(_,j)=>`<${i===0?'th':'td'}>${esc(row[j]??'')}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="feature-preview-state">این Sheet داده‌ای برای نمایش ندارد.</div>'}
async function previewDocument(id,button){const doc=feature.documents.find(d=>String(d.id)===String(id));if(!doc)return;const dialog=q('#documentPreviewDialog'),body=q('#documentPreviewBody'),open=q('#documentPreviewOpenTab'),download=q('#documentPreviewDownload'),mime=documentMime(doc);feature.preview={doc,mime,nativeUrl:'',workbook:null};q('#documentPreviewTitle').textContent=doc.title||doc.original_file_name||'پیش‌نمایش سند';q('#documentPreviewMeta').textContent=`${doc.original_file_name||'—'} · ${DOC_MIMES[mime]||mime} · ${fmtBytes(doc.file_size)}`;body.innerHTML='<div class="feature-preview-state feature-preview-loading">در حال آماده‌سازی پیش‌نمایش…</div>';open.disabled=true;download.disabled=false;if(!dialog.open)dialog.showModal();setBusy(button,true,'در حال دریافت…');try{if(mime==='application/pdf'){const url=await signedDocumentUrl(doc.storage_path);feature.preview.nativeUrl=url;open.disabled=false;body.innerHTML=`<iframe class="feature-pdf-preview" title="پیش‌نمایش PDF" src="${esc(url)}"></iframe>`;return}if(mime.startsWith('image/')){const url=await signedDocumentUrl(doc.storage_path);feature.preview.nativeUrl=url;open.disabled=false;body.innerHTML=`<img class="feature-image-preview" alt="${esc(doc.title||doc.original_file_name)}" src="${esc(url)}">`;body.querySelector('img')?.addEventListener('error',()=>previewError('تصویر از فضای ذخیره‌سازی دریافت نشد.'),{once:true});return}if(mime==='text/plain'||mime==='text/csv'){const blob=await privateFile(doc.storage_path),textBody=await blob.text();feature.preview.nativeUrl=await signedDocumentUrl(doc.storage_path).catch(()=>'');open.disabled=!feature.preview.nativeUrl;const pre=document.createElement('pre');pre.className='feature-text-preview';pre.textContent=textBody;body.replaceChildren(pre);return}if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){const blob=await privateFile(doc.storage_path);if(!window.docx?.renderAsync)throw Error('نمایشگر محلی DOCX بارگذاری نشده است.');body.innerHTML='<div id="documentDocxHost" class="feature-docx-preview"></div>';await window.docx.renderAsync(await blob.arrayBuffer(),q('#documentDocxHost'),null,{className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,breakPages:true,renderHeaders:true,renderFooters:true});return}if(mime==='application/vnd.ms-excel'||mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){const blob=await privateFile(doc.storage_path),XLSX=await window.ensureBamcoXLSX(),workbook=XLSX.read(await blob.arrayBuffer(),{type:'array'});window.__bamcoPreviewXLSX=XLSX;feature.preview.workbook=workbook;body.innerHTML=`<div class="feature-sheet-switcher"><label>Sheet<select id="documentPreviewSheet">${workbook.SheetNames.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label><span>حداکثر ۵۰۰ ردیف و ۸۰ ستون در پیش‌نمایش</span></div><div id="documentPreviewSheetHost" class="feature-sheet-scroll"></div>`;const select=q('#documentPreviewSheet');renderSheet(workbook,select.value);select.addEventListener('change',()=>renderSheet(workbook,select.value));return}body.innerHTML='<div class="feature-preview-state">پیش‌نمایش این نوع فایل در مرورگر پشتیبانی نمی‌شود.</div>'}catch(error){previewError(error?.message||String(error))}finally{setBusy(button,false)}}
'''
docs = docs[:start] + preview_impl + docs[end:]
must('documentPreviewDialog' in docs and 'window.docx?.renderAsync' in docs and 'documentPreviewSheet' in docs and 'openDocumentPreviewTab' not in docs, 'document preview refactor incomplete')
write('assets/js/documents-sites.js', docs)

# --- 4) Document edge function: extension-aware MIME fallback, GIF support. ---
edge = read('supabase/functions/document-library/index.ts')
edge = replace_once(edge, '"image/png","image/jpeg","image/webp","text/plain"', '"image/png","image/jpeg","image/webp","image/gif","text/plain"', 'edge allowed gif')
edge = replace_once(edge, '"image/webp":"webp","text/plain":"txt"', '"image/webp":"webp","image/gif":"gif","text/plain":"txt"', 'edge extension gif')
edge = replace_once(edge, 'const extension=(file:File)=>{const map:Record<string,string>={', 'const MIME_BY_EXT:Record<string,string>={pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",txt:"text/plain",csv:"text/csv",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"};\nconst fileMime=(file:File)=>{const given=String(file.type||"").toLowerCase();if(ALLOWED.has(given))return given;const ext=file.name.split(".").pop()?.toLowerCase()||"";return MIME_BY_EXT[ext]||given};\nconst extension=(file:File,mime=fileMime(file))=>{const map:Record<string,string>={', 'edge mime helper')
edge = replace_once(edge, 'return map[file.type]||"bin"};', 'return map[mime]||file.name.split(".").pop()?.toLowerCase()||"bin"};', 'edge extension resolution')
edge = replace_once(edge, 'async function uploadObject(url:string,service:string,path:string,file:File){', 'async function uploadObject(url:string,service:string,path:string,file:File,mime=fileMime(file)){', 'edge upload signature')
edge = replace_once(edge, '"Content-Type":file.type||"application/octet-stream"', '"Content-Type":mime||"application/octet-stream"', 'edge upload content type')
edge = replace_once(edge, 'function validateFile(file:File){if(!ALLOWED.has(file.type))throw Object.assign(new Error("فرمت فایل مجاز نیست."),{status:400});if(file.size<=0||file.size>MAX)throw Object.assign(new Error("حجم فایل باید حداکثر ۲۵ مگابایت باشد."),{status:413})}', 'function validateFile(file:File){const mime=fileMime(file);if(!ALLOWED.has(mime))throw Object.assign(new Error("فرمت فایل مجاز نیست."),{status:400});if(file.size<=0||file.size>MAX)throw Object.assign(new Error("حجم فایل باید حداکثر ۲۵ مگابایت باشد."),{status:413});return mime}', 'edge validate MIME')
edge = replace_once(edge, 'validateFile(file);const path=`categories/${categoryId}/${crypto.randomUUID()}.${extension(file)}`;await uploadObject(url,service,path,file);', 'const mime=validateFile(file);const path=`categories/${categoryId}/${crypto.randomUUID()}.${extension(file,mime)}`;await uploadObject(url,service,path,file,mime);', 'edge upload resolved MIME')
edge = edge.replace('mime_type:file.type,file_size:file.size,version:1', 'mime_type:mime,file_size:file.size,version:1', 1)
edge = edge.replace('{category_id:categoryId,mime_type:file.type,file_size:file.size}', '{category_id:categoryId,mime_type:mime,file_size:file.size}', 1)
edge = replace_once(edge, 'validateFile(file);const categoryId=Number(form.get("category_id")||old.category_id)', 'const mime=validateFile(file);const categoryId=Number(form.get("category_id")||old.category_id)', 'edge replace resolved MIME')
edge = replace_once(edge, 'path=`categories/${categoryId}/${crypto.randomUUID()}.${extension(file)}`;await uploadObject(url,service,path,file);', 'path=`categories/${categoryId}/${crypto.randomUUID()}.${extension(file,mime)}`;await uploadObject(url,service,path,file,mime);', 'edge replace upload MIME')
edge = edge.replace('mime_type:file.type,file_size:file.size,version:Number(old.version||1)+1', 'mime_type:mime,file_size:file.size,version:Number(old.version||1)+1', 1)
edge = edge.replace('{operation:"replace",version:patch.version,mime_type:file.type,file_size:file.size}', '{operation:"replace",version:patch.version,mime_type:mime,file_size:file.size}', 1)
must('image/gif' in edge and 'fileMime' in edge and edge.count('mime_type:mime') >= 2, 'edge MIME refactor incomplete')
write('supabase/functions/document-library/index.ts', edge)

# --- 5) Canonical CSS only; no fix/override product file. ---
css = read('assets/css/documents-sites.css')
css += r'''

/* Canonical in-app document viewer. */
.feature-preview-modal{width:min(1180px,96vw)!important;max-width:1180px!important;max-height:94vh!important}.feature-preview-modal .modal-head{margin-bottom:8px}.feature-preview-toolbar{display:flex;justify-content:flex-start;gap:7px;flex-wrap:wrap;margin:0 0 8px}.feature-preview-body{min-height:420px;max-height:72vh;overflow:auto;border:1px solid #d4dfda;border-radius:10px;background:#f7faf8;padding:10px}.feature-preview-state{min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:#60766d;padding:24px}.feature-preview-loading:before{content:'↻';font:700 30px Tahoma;color:#218764}.feature-preview-error{color:#a22f2f;background:#fff7f7}.feature-pdf-preview{display:block;width:100%;height:68vh;min-height:520px;border:0;background:#fff}.feature-image-preview{display:block;max-width:100%;height:auto;max-height:68vh;margin:auto;object-fit:contain}.feature-text-preview{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;direction:rtl;text-align:right;font-family:BamcoPersian,'B Nazanin',Tahoma,sans-serif;line-height:1.8}.feature-docx-preview{background:#e9ecef;padding:14px;min-height:420px;overflow:auto}.feature-docx-preview .docx-wrapper{padding:18px!important}.feature-sheet-switcher{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 8px}.feature-sheet-switcher label{display:flex!important;align-items:center;gap:7px;margin:0!important}.feature-sheet-switcher select{min-width:150px;height:34px}.feature-sheet-scroll{max-width:100%;overflow:auto;border:1px solid #d7e2dd;background:#fff}.feature-preview-table{border-collapse:collapse;min-width:max(680px,100%);width:max-content}.feature-preview-table th,.feature-preview-table td{position:static!important;border:1px solid #d7e2dd;padding:6px 8px;white-space:nowrap;background:#fff}.feature-preview-table th{background:#edf4f0!important;font-weight:700}.feature-preview-modal button{font-weight:400!important}@media(max-width:760px){.feature-preview-modal{width:98vw!important;max-height:96vh!important}.feature-preview-body{min-height:300px;max-height:72vh;padding:6px}.feature-preview-state{min-height:280px}.feature-pdf-preview{height:65vh;min-height:420px}.feature-docx-preview{padding:4px}.feature-docx-preview .docx-wrapper{padding:4px!important}.feature-preview-toolbar button{flex:1 1 150px}}
'''
write('assets/css/documents-sites.css', css)

# --- 6) Index: local vendor + cache bust canonical modules. ---
html = read('index.html')
html = replace_once(html, 'assets/css/documents-sites.css?v=documents-sites-20260912-2', 'assets/css/documents-sites.css?v=documents-preview-20260912-1', 'documents CSS cache')
html = replace_once(html, 'assets/js/message-renderer.js?v=message-title-layout-20260911-2', 'assets/js/message-renderer.js?v=waiting-section-20260912-1', 'message renderer cache')
html = replace_once(html, 'assets/css/card-home.css?v=welcome-home-20260912-4', 'assets/css/card-home.css?v=welcome-home-20260912-5', 'home CSS cache')
html = replace_once(html, 'assets/js/card-home.js?v=welcome-home-20260912-4', 'assets/js/card-home.js?v=welcome-home-20260912-5', 'home JS cache')
html = replace_once(html, '  <script defer src="assets/js/documents-sites.js?v=documents-sites-20260912-3"></script>', '  <script defer src="assets/vendor/docx-preview.min.js?v=0.3.6"></script>\n  <script defer src="assets/js/documents-sites.js?v=documents-preview-20260912-1"></script>', 'documents JS vendor wiring')
write('index.html', html)

# --- 7) Existing tests updated to new root behavior. ---
doc_tests = read('tests/documents-sites.test.cjs')
doc_tests = replace_once(doc_tests, "  assert.match(src,/پیش‌نمایش امن DOCX/);", "  assert.match(src,/window\\.docx\\?\\.renderAsync/);\n  assert.match(src,/documentPreviewSheet/);\n  assert.match(src,/documentPreviewDialog/);", 'DOCX test expectation')
start = doc_tests.find("test('PDF preview uses a signed Storage URL and bypasses blob delivery'")
end = doc_tests.find("test('sites access buttons", start)
must(start >= 0 and end > start, 'old PDF preview test range')
new_test = r'''test('document preview is modal-first with MIME fallback and five renderer paths',()=>{
  const src=fs.readFileSync(featurePath,'utf8');
  assert.match(src,/function documentMime\(doc\)/);
  assert.match(src,/mime==='application\/pdf'/);
  assert.match(src,/mime\.startsWith\('image\/'\)/);
  assert.match(src,/mime==='text\/plain'/);
  assert.match(src,/window\.docx\?\.renderAsync/);
  assert.match(src,/ensureBamcoXLSX/);
  assert.match(src,/documentPreviewDialog/);
  assert.match(src,/documentPreviewOpenTab/);
  assert.match(src,/documentPreviewDownload/);
  assert.match(src,/storage\/v1\/object\/sign/);
  assert.doesNotMatch(src,/openDocumentPreviewTab/);
});

'''
doc_tests = doc_tests[:start] + new_test + doc_tests[end:]
write('tests/documents-sites.test.cjs', doc_tests)

home_tests = read('tests/home-layout.test.cjs')
home_tests, n = re.subn(r"\n\ntest\('automatic welcome exposes waiting work[\s\S]*?\n\}\);\s*$", "\n\ntest('welcome card contains no waiting-work UI or logic',()=>{\n  const src=read('assets/js/card-home.js'),css=read('assets/css/card-home.css');\n  assert.doesNotMatch(src,/welcome-waiting|syncWelcomeWaiting|openWaitingKanban|امور منتظر پاسخ/);\n  assert.doesNotMatch(css,/welcome-waiting/);\n});\n", home_tests, count=1)
must(n == 1, 'home waiting test')
write('tests/home-layout.test.cjs', home_tests)

msg_tests = read('tests/message-system-regression-20260911.test.cjs')
msg_tests += r'''

test('automatic message renders risk and waiting work as sibling sections from one snapshot',()=>{
  const renderer=require(path.join(ROOT,'assets/js/message-renderer.js'));
  const snapshot={body_template:'[جدول امور دیرکردی]\n\n[جدول امور هشداری]',warning_task_ids:[2],overdue_task_ids:[1],waiting_task_ids:[3],tasks:[{id:1,legacy_id:11,title:'Late',status:'در حال انجام',priority:'فوری',due_date:'2026-09-01',due_state:'overdue'},{id:2,legacy_id:12,title:'Warn',status:'در حال انجام',priority:'متوسط',due_date:'2026-09-20',due_state:'warning'},{id:3,legacy_id:13,title:'Wait',status:'منتظر پاسخ',status_key:'waiting',status_kind:'waiting',priority:'متوسط',start_date:'2026-09-02',due_state:'none'}]};
  const html=renderer.html(snapshot);
  assert.match(html,/امور هشداری و دیرکردی/);
  assert.match(html,/امور منتظر پاسخ/);
  assert.match(html,/workflow-auto-task-grid/);
  assert.match(html,/data-bamco-task-id="3"/);
  assert.equal((html.match(/workflow-auto-task-grid/g)||[]).length,1);
  const empty=renderer.html({...snapshot,waiting_task_ids:[],tasks:snapshot.tasks.filter(x=>x.id!==3)});
  assert.match(empty,/موردی در انتظار پاسخ نیست/);
});
'''
write('tests/message-system-regression-20260911.test.cjs', msg_tests)

print('canonical refactor applied')
