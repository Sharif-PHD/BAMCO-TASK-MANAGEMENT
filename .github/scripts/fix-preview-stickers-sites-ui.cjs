const fs=require('node:fs');
let js=fs.readFileSync('assets/js/documents-sites.js','utf8');
const start=js.indexOf("let previewObjectUrl='';function resetPreview()");
const end=js.indexOf('async function downloadDocument',start);
if(start<0||end<0)throw new Error('preview source block not found');
const replacement=`function openDocumentPreviewTab(){
  const tab=window.open('about:blank','_blank');
  if(!tab)throw Error('مرورگر اجازه باز کردن تب پیش‌نمایش را نداد. لطفاً Pop-up را برای این سامانه مجاز کنید.');
  try{tab.opener=null;tab.document.title='در حال آماده‌سازی پیش‌نمایش…';tab.document.body.innerHTML='<div style="font-family:Tahoma,sans-serif;direction:rtl;padding:24px">در حال آماده‌سازی پیش‌نمایش…</div>'}catch{}
  return tab
}
function previewHtml(title,body){return \`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\${esc(title)}</title><style>body{font-family:Tahoma,sans-serif;margin:24px;color:#173f34;background:#f7faf8}h1{font-size:18px}table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #d7e2dd;padding:6px 8px;text-align:right;vertical-align:top}th{background:#edf4f0;position:sticky;top:0}.wrap{overflow:auto;max-height:calc(100vh - 90px)}.note{padding:14px;background:#fff;border:1px solid #d7e2dd;border-radius:10px}</style></head><body><h1>\${esc(title)}</h1>\${body}</body></html>\`}
async function previewDocument(id,button){const doc=feature.documents.find(d=>String(d.id)===String(id));if(!doc)return;let tab=null;setBusy(button,true,'در حال دریافت…');try{tab=openDocumentPreviewTab();const blob=await privateFile(doc.storage_path);let previewBlob=blob;if(doc.mime_type.includes('spreadsheet')||doc.mime_type==='application/vnd.ms-excel'){const XLSX=await window.ensureBamcoXLSX(),wb=XLSX.read(await blob.arrayBuffer(),{type:'array'}),name=wb.SheetNames[0],rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''}).slice(0,200),cols=Math.min(40,Math.max(1,...rows.map(r=>r.length))),table=rows.map((r,i)=>\`<tr>\${Array.from({length:cols},(_,j)=>\`<\${i===0?'th':'td'}>\${esc(r[j]??'')}</\${i===0?'th':'td'}>\`).join('')}</tr>\`).join('');previewBlob=new Blob([previewHtml(doc.title,\`<p>Sheet: \${esc(name)} · پیش‌نمایش حداکثر ۲۰۰ ردیف و ۴۰ ستون</p><div class="wrap"><table><tbody>\${table}</tbody></table></div>\`)],{type:'text/html;charset=utf-8'})}else if(doc.mime_type.includes('wordprocessingml')){previewBlob=new Blob([previewHtml(doc.title,'<div class="note">پیش‌نمایش امن DOCX به‌صورت مستقیم توسط مرورگر پشتیبانی نمی‌شود. برای مشاهده فایل از دکمه دانلود استفاده کنید.</div>')],{type:'text/html;charset=utf-8'})}else if(!(doc.mime_type==='application/pdf'||doc.mime_type.startsWith('image/')||doc.mime_type==='text/plain'||doc.mime_type==='text/csv')){previewBlob=new Blob([previewHtml(doc.title,'<div class="note">مرورگر برای این نوع فایل پیش‌نمایش داخلی ندارد. برای مشاهده فایل از دکمه دانلود استفاده کنید.</div>')],{type:'text/html;charset=utf-8'})}const url=URL.createObjectURL(previewBlob);try{tab.location.replace(url)}catch{tab.location.href=url}setTimeout(()=>URL.revokeObjectURL(url),300000)}catch(e){try{tab?.close()}catch{}notice(e.message,true)}finally{setBusy(button,false)}}
`;
js=js.slice(0,start)+replacement+js.slice(end);
const modalPattern=/<dialog id="documentPreviewDialog"[\s\S]*?<\/dialog>\n?/;
if(!modalPattern.test(js))throw new Error('obsolete preview modal not found');
js=js.replace(modalPattern,'');
const resetListener="q('#documentPreviewDialog')?.addEventListener('close',resetPreview);";
if(!js.includes(resetListener))throw new Error('obsolete resetPreview listener not found');
js=js.replace(resetListener,'');
const dynamicNote='<div class="feature-confidential-note">رمز عبور فقط با درخواست صریح شما از سرور امن دریافت می‌شود و به‌صورت پیش‌فرض نمایش داده نمی‌شود.</div>';
if(!js.includes(dynamicNote))throw new Error('dynamic password note not found');
js=js.replace(dynamicNote,'');
fs.writeFileSync('assets/js/documents-sites.js',js);

let html=fs.readFileSync('index.html','utf8');
const staticNote='        <div class="feature-confidential-note">رمز عبور فقط با درخواست صریح شما از سرور امن دریافت می‌شود و به‌صورت پیش‌فرض نمایش داده نمی‌شود.</div>\n';
if(!html.includes(staticNote))throw new Error('static password note not found');
html=html.replace(staticNote,'')
  .replace('assets/js/documents-sites.js?v=documents-sites-20260912-1','assets/js/documents-sites.js?v=documents-sites-20260912-2')
  .replace('assets/js/card-home.js?v=welcome-home-20260911-2','assets/js/card-home.js?v=welcome-home-20260912-3');
fs.writeFileSync('index.html',html);

let css=fs.readFileSync('assets/css/documents-sites.css','utf8');
const marker='Sites actions follow the standard BAMCO non-bold button language.';
if(!css.includes(marker))css+=`\n/* ${marker} */\n#sitesAccessView button,#siteDialog button,#credentialDialog button,#credentialRevealDialog button{font-weight:400!important}\n`;
fs.writeFileSync('assets/css/documents-sites.css',css);

const preview=js.slice(js.indexOf('async function previewDocument'),js.indexOf('async function downloadDocument'));
const checks={
  newTab:js.includes("window.open('about:blank','_blank')"),
  privateFetch:preview.includes('await privateFile(doc.storage_path)'),
  localBlob:preview.includes('URL.createObjectURL(previewBlob)')&&preview.includes('tab.location.replace(url)'),
  oldModalRemoved:!js.includes('documentPreviewDialog')&&!js.includes('resetPreview')&&!js.includes('documentPreviewDownload'),
  docxSafeText:js.includes('پیش‌نمایش امن DOCX'),
  noteRemovedEverywhere:!html.includes('رمز عبور فقط با درخواست صریح شما')&&!js.includes('رمز عبور فقط با درخواست صریح شما'),
  nonBold:css.includes('#sitesAccessView button')&&css.includes('font-weight:400!important'),
  previewCache:html.includes('documents-sites-20260912-2'),
  stickerCache:html.includes('welcome-home-20260912-3')
};
for(const [k,v] of Object.entries(checks))console.log(k,v?'PASS':'FAIL');
if(!Object.values(checks).every(Boolean))throw new Error('requested behavior validation failed');
fs.unlinkSync('.github/workflows/fix-preview-stickers-sites-ui.yml');
fs.unlinkSync('.github/scripts/fix-preview-stickers-sites-ui.cjs');
