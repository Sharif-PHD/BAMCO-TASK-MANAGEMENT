const fs=require('node:fs');

function read(path){return fs.readFileSync(path,'utf8')}
function write(path,value){fs.writeFileSync(path,value)}
function replaceOnce(source,oldText,newText,label){const count=source.split(oldText).length-1;if(count!==1)throw new Error(`${label}: expected exactly 1 match, got ${count}`);return source.replace(oldText,newText)}
function assetVersion(html,path,version){const esc=path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const re=new RegExp(`${esc}(?:\\?v=[^"'\\s>]+)?`,'g');const matches=html.match(re)||[];if(matches.length!==1)throw new Error(`${path}: expected 1 asset reference, got ${matches.length}`);return html.replace(re,`${path}?v=${version}`)}

// 1) Native document previews: PDF/images/text use a short-lived signed Storage URL.
let docs=read('assets/js/documents-sites.js');
const previewStart=docs.indexOf('async function previewDocument(id,button)');
const previewEnd=docs.indexOf('async function downloadDocument',previewStart);
if(previewStart<0||previewEnd<0)throw new Error('previewDocument block not found');
const previewReplacement=`async function signedDocumentUrl(path){
  const res=await fetch(\`${'${SB_URL}'}/storage/v1/object/sign/${'${DOC_BUCKET}'}/${'${encodePath(path)}'}\`,{method:'POST',headers:{apikey:SB_KEY,Authorization:\`Bearer ${'${state.token}'}\`,'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({expiresIn:300})});
  const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}if(!res.ok)throw Error(data?.message||data?.error||'لینک امن پیش‌نمایش دریافت نشد.');const raw=data?.signedURL||data?.signedUrl||data?.signed_url;if(!raw)throw Error('لینک امن پیش‌نمایش دریافت نشد.');return new URL(raw,SB_URL).href
}
async function previewDocument(id,button){const doc=feature.documents.find(d=>String(d.id)===String(id));if(!doc)return;let tab=null;setBusy(button,true,'در حال دریافت…');try{tab=openDocumentPreviewTab();const nativePreview=doc.mime_type==='application/pdf'||doc.mime_type.startsWith('image/')||doc.mime_type==='text/plain'||doc.mime_type==='text/csv';if(nativePreview){const url=await signedDocumentUrl(doc.storage_path);try{tab.location.replace(url)}catch{tab.location.href=url}return}const blob=await privateFile(doc.storage_path);let previewBlob=blob;if(doc.mime_type.includes('spreadsheet')||doc.mime_type==='application/vnd.ms-excel'){const XLSX=await window.ensureBamcoXLSX(),wb=XLSX.read(await blob.arrayBuffer(),{type:'array'}),name=wb.SheetNames[0],rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''}).slice(0,200),cols=Math.min(40,Math.max(1,...rows.map(r=>r.length))),table=rows.map((r,i)=>\`<tr>${'${Array.from({length:cols},(_,j)=>`<${i===0?\'th\':\'td\'}>${esc(r[j]??\'\')}</${i===0?\'th\':\'td\'}>`).join(\'\')}'}</tr>\`).join('');previewBlob=new Blob([previewHtml(doc.title,\`<p>Sheet: ${'${esc(name)}'} · پیش‌نمایش حداکثر ۲۰۰ ردیف و ۴۰ ستون</p><div class="wrap"><table><tbody>${'${table}'}</tbody></table></div>\`)],{type:'text/html;charset=utf-8'})}else if(doc.mime_type.includes('wordprocessingml')){previewBlob=new Blob([previewHtml(doc.title,'<div class="note">پیش‌نمایش امن DOCX به‌صورت مستقیم توسط مرورگر پشتیبانی نمی‌شود. برای مشاهده فایل از دکمه دانلود استفاده کنید.</div>')],{type:'text/html;charset=utf-8'})}else{previewBlob=new Blob([previewHtml(doc.title,'<div class="note">مرورگر برای این نوع فایل پیش‌نمایش داخلی ندارد. برای مشاهده فایل از دکمه دانلود استفاده کنید.</div>')],{type:'text/html;charset=utf-8'})}const url=URL.createObjectURL(previewBlob);try{tab.location.replace(url)}catch{tab.location.href=url}setTimeout(()=>URL.revokeObjectURL(url),300000)}catch(e){try{tab?.close()}catch{}notice(e.message,true)}finally{setBusy(button,false)}}
`;
docs=docs.slice(0,previewStart)+previewReplacement+docs.slice(previewEnd);
write('assets/js/documents-sites.js',docs);

// 2) Sites buttons: explicitly use the regular face and disable synthetic bolding.
let sitesCss=read('assets/css/documents-sites.css');
const oldSitesRule='#sitesAccessView button,#siteDialog button,#credentialDialog button,#credentialRevealDialog button{font-weight:400!important}';
const newSitesRule='#sitesAccessView button,#siteDialog button,#credentialDialog button,#credentialRevealDialog button{font-family:BamcoPersian,"B Nazanin",BNazanin,Tahoma,sans-serif!important;font-weight:400!important;font-synthesis:none!important}';
sitesCss=replaceOnce(sitesCss,oldSitesRule,newSitesRule,'sites non-bold rule');
write('assets/css/documents-sites.css',sitesCss);

// 3) Automatic welcome message: add a real waiting-work shortcut wired to the canonical Kanban status filter.
let home=read('assets/js/card-home.js');
const oldDialog='<div class="home-welcome-copy"><p class="welcome-person"></p><h2 id="homeWelcomeTitle">به سامانه مدیریت، پایش و پیگیری امور خوش آمدید</h2></div>';
const newDialog='<div class="home-welcome-copy"><p class="welcome-person"></p><h2 id="homeWelcomeTitle">به سامانه مدیریت، پایش و پیگیری امور خوش آمدید</h2><button class="welcome-waiting-link" type="button" data-welcome-waiting><span>امور منتظر پاسخ</span><strong data-welcome-waiting-count>۰</strong></button></div>';
home=replaceOnce(home,oldDialog,newDialog,'welcome dialog');
const stickerAnchor=" function stickers(force=false){if(welcomeStickerReady&&!force)return Promise.resolve();if(!welcomeStickerPromise||force)welcomeStickerPromise=loadWelcomeStickers().finally(()=>{welcomeStickerPromise=null});return welcomeStickerPromise}\n";
const waitingLogic=` function stickers(force=false){if(welcomeStickerReady&&!force)return Promise.resolve();if(!welcomeStickerPromise||force)welcomeStickerPromise=loadWelcomeStickers().finally(()=>{welcomeStickerPromise=null});return welcomeStickerPromise}\n async function syncWelcomeWaiting(){const button=dialog.querySelector('[data-welcome-waiting]'),countNode=dialog.querySelector('[data-welcome-waiting-count]');if(!button||!countNode)return;let rows=null;try{if(typeof state!=='undefined'&&state.token&&typeof selectAll==='function'&&window.bamcoOptions?.kind)rows=await selectAll('task_status_view','select=status,status_key,archived&archived=eq.false')}catch{}const source=Array.isArray(rows)?rows:(typeof state!=='undefined'&&Array.isArray(state.tasks)?state.tasks:[]),count=source.filter(t=>!t.archived&&window.bamcoOptions?.kind?.(t)==='waiting').length;countNode.textContent=typeof fa==='function'?fa(count):String(count).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);button.dataset.count=String(count);button.setAttribute('aria-label',\`امور منتظر پاسخ، ${'${count}'} مورد\`)}\n function openWaitingKanban(){const tasks=typeof state!=='undefined'&&Array.isArray(state.tasks)?state.tasks:[],sample=tasks.find(t=>!t.archived&&window.bamcoOptions?.kind?.(t)==='waiting'),label=window.bamcoOptions?.label?.('status','waiting')||sample?.status||'منتظر پاسخ';if(typeof tableFilters!=='undefined'&&tableFilters?.kanban){for(const key of Object.keys(tableFilters.kanban))delete tableFilters.kanban[key];tableFilters.kanban[4]=label}const search=q('#kanbanSearch');if(search)search.value='';if(dialog.open)dialog.close();leaveHome();if(typeof showView==='function')showView('kanban');else q('#nav button[data-view="kanban"]')?.click();requestAnimationFrame(()=>{if(typeof renderTasks==='function')renderTasks(false)})}\n`;
home=replaceOnce(home,stickerAnchor,waitingLogic,'waiting shortcut logic');
const oldWelcome="window.bamcoOpenHomeWelcome=()=>{if(welcomed||app.classList.contains('hidden'))return;if(typeof state!=='undefined'&&state.profile?.must_change_password)return;welcomed=true;clearHomeTimers();homeExpected=true;homeEpoch++;showHome();dialog.querySelector('.welcome-person').textContent=(q('#userName')?.textContent||'همکار')+' عزیز';dialog.showModal();void stickers()};\n dialog.querySelector('.welcome-dismiss').addEventListener('click',()=>dialog.close());";
const newWelcome="window.bamcoOpenHomeWelcome=()=>{if(welcomed||app.classList.contains('hidden'))return;if(typeof state!=='undefined'&&state.profile?.must_change_password)return;welcomed=true;clearHomeTimers();homeExpected=true;homeEpoch++;showHome();dialog.querySelector('.welcome-person').textContent=(q('#userName')?.textContent||'همکار')+' عزیز';dialog.showModal();void stickers();void syncWelcomeWaiting()};\n dialog.querySelector('.welcome-dismiss').addEventListener('click',()=>dialog.close());\n dialog.querySelector('[data-welcome-waiting]').addEventListener('click',openWaitingKanban);";
home=replaceOnce(home,oldWelcome,newWelcome,'welcome open wiring');
write('assets/js/card-home.js',home);

let homeCss=read('assets/css/card-home.css');
if(!homeCss.includes('.welcome-waiting-link{'))homeCss += `\n/* Waiting-work shortcut in the automatic welcome message; same purple language as the waiting dashboard card. */\n.welcome-waiting-link{width:min(360px,100%);margin:8px auto 0;padding:10px 14px;border:1px solid #c8b0eb;border-radius:12px;background:linear-gradient(135deg,#eee3ff,#faf6ff);color:#69459a;display:flex;align-items:center;justify-content:space-between;gap:12px;font:inherit;font-weight:400;cursor:pointer}.welcome-waiting-link:hover{background:linear-gradient(135deg,#e7d8ff,#f6efff);border-color:#b697e2}.welcome-waiting-link strong{min-width:34px;height:30px;padding:0 8px;border-radius:999px;background:#69459a;color:#fff;display:grid;place-items:center;font:700 14px Tahoma,sans-serif}.welcome-waiting-link:focus-visible{outline:3px solid #69459a38;outline-offset:2px}\n`;
write('assets/css/card-home.css',homeCss);

// 4) Explicit cache bust for every changed browser asset.
let html=read('index.html');
html=assetVersion(html,'assets/css/documents-sites.css','documents-sites-20260912-2');
html=assetVersion(html,'assets/js/documents-sites.js','documents-sites-20260912-3');
html=assetVersion(html,'assets/css/card-home.css','welcome-home-20260912-4');
html=assetVersion(html,'assets/js/card-home.js','welcome-home-20260912-4');
write('index.html',html);

// 5) Persist regression coverage in existing test files, not in another product patch file.
let docsTest=read('tests/documents-sites.test.cjs');
if(!docsTest.includes("PDF preview uses a signed Storage URL"))docsTest += `\n\ntest('PDF preview uses a signed Storage URL and bypasses blob delivery',()=>{\n  const src=fs.readFileSync(featurePath,'utf8');\n  const start=src.indexOf('async function previewDocument');\n  const end=src.indexOf('async function downloadDocument',start);\n  const preview=src.slice(start,end);\n  assert.match(src,/storage\\/v1\\/object\\/sign\\/\\$\\{DOC_BUCKET\\}/);\n  assert.match(src,/expiresIn:300/);\n  assert.match(preview,/doc\\.mime_type==='application\\/pdf'/);\n  assert.match(preview,/await signedDocumentUrl\\(doc\\.storage_path\\)/);\n  assert(preview.indexOf("doc.mime_type==='application/pdf'") < preview.indexOf('const blob=await privateFile(doc.storage_path)'));\n});\n\ntest('sites access buttons use the regular font face without synthetic bold',()=>{\n  const css=fs.readFileSync(path.join(ROOT,'assets/css/documents-sites.css'),'utf8');\n  assert.match(css,/#sitesAccessView button[^}]*font-weight:400!important/);\n  assert.match(css,/#sitesAccessView button[^}]*font-synthesis:none!important/);\n});\n`;
write('tests/documents-sites.test.cjs',docsTest);

let homeTest=read('tests/home-layout.test.cjs');
if(!homeTest.includes('automatic welcome exposes waiting work'))homeTest += `\n\ntest('automatic welcome exposes waiting work and routes it to the Kanban status filter',()=>{\n  const src=fs.readFileSync(path.join(ROOT,'assets/js/card-home.js'),'utf8');\n  const css=fs.readFileSync(path.join(ROOT,'assets/css/card-home.css'),'utf8');\n  assert.match(src,/data-welcome-waiting/);\n  assert.match(src,/امور منتظر پاسخ/);\n  assert.match(src,/bamcoOptions\\?\\.label\\?\\.\\('status','waiting'\\)/);\n  assert.match(src,/tableFilters\\.kanban\\[4\\]=label/);\n  assert.match(src,/showView\\('kanban'\\)/);\n  assert.match(src,/task_status_view.*archived=eq\\.false/);\n  assert.match(css,/#c8b0eb/);\n  assert.match(css,/#69459a/);\n});\n`;
write('tests/home-layout.test.cjs',homeTest);

// Fast structural gate before the workflow runs the full tests.
const finalDocs=read('assets/js/documents-sites.js'),finalHome=read('assets/js/card-home.js'),finalHtml=read('index.html');
const checks={signedPdf:finalDocs.includes('/storage/v1/object/sign/${DOC_BUCKET}/')&&finalDocs.includes('expiresIn:300'),pdfBeforeBlob:finalDocs.indexOf("doc.mime_type==='application/pdf'")<finalDocs.indexOf('const blob=await privateFile(doc.storage_path)'),waitingLink:finalHome.includes('data-welcome-waiting')&&finalHome.includes("tableFilters.kanban[4]=label"),waitingRoute:finalHome.includes("showView('kanban')"),sitesRegular:read('assets/css/documents-sites.css').includes('font-synthesis:none!important'),cssBust:finalHtml.includes('documents-sites.css?v=documents-sites-20260912-2'),jsBust:finalHtml.includes('documents-sites.js?v=documents-sites-20260912-3'),homeBust:finalHtml.includes('card-home.js?v=welcome-home-20260912-4')};
for(const [name,ok] of Object.entries(checks))console.log(name,ok?'PASS':'FAIL');
if(!Object.values(checks).every(Boolean))throw new Error('root-fix structural gate failed');
