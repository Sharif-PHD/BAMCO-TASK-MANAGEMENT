const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const featurePath=path.join(ROOT,'assets/js/documents-sites.js');
const credentialPath=path.join(ROOT,'supabase/functions/credential-vault/index.ts');
const documentPath=path.join(ROOT,'supabase/functions/document-library/index.ts');
const migrationPath=path.join(ROOT,'supabase/migrations/20260912154000_documents_sites_secure_features.sql');
const hardeningPath=path.join(ROOT,'supabase/migrations/20260912154100_documents_write_consistency_hardening.sql');

test('safe site URL validator accepts only http(s) and rejects credentials/scripting schemes',()=>{
  const {safeHttpUrl}=require(featurePath);
  assert.equal(safeHttpUrl('https://portal.example.com/path'),true);
  assert.equal(safeHttpUrl('http://intranet.local:8080/login'),true);
  assert.equal(safeHttpUrl('javascript:alert(1)'),false);
  assert.equal(safeHttpUrl('data:text/html,x'),false);
  assert.equal(safeHttpUrl('ftp://example.com'),false);
  assert.equal(safeHttpUrl('https://user:pass@example.com'),false);
});

test('frontend never persists credentials in browser storage or URL',()=>{
  const src=fs.readFileSync(featurePath,'utf8');
  assert.doesNotMatch(src,/localStorage|sessionStorage/);
  assert.doesNotMatch(src,/URLSearchParams\([^)]*password/i);
  assert.match(src,/credential-vault/);
  assert.match(src,/type=\\?"password\\?"/);
});

test('credential vault uses server-only key and AES-GCM with user/site binding',()=>{
  const src=fs.readFileSync(credentialPath,'utf8');
  assert.match(src,/credential_server_key/);
  assert.match(src,/AES-GCM/g);
  assert.match(src,/additionalData/);
  assert.match(src,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(src,/localStorage|sessionStorage/);
  assert.doesNotMatch(src,/console\.(log|debug|info).*password/i);
  assert.match(src,/user_site_credentials\?user_id=eq\.\$\{encodeURIComponent\(user\.id\)\}/);
});

test('document edge enforces manager and compensates failed metadata insert',()=>{
  const src=fs.readFileSync(documentPath,'utf8');
  assert.match(src,/role!=="manager"/);
  assert.match(src,/documents-private/);
  assert.match(src,/await deleteObjects\(url,service,\[path\]\)\.catch/);
  assert.match(src,/document_upload/);
  assert.match(src,/document_delete/);
});

test('database migration keeps documents private, RLS protected and credentials opaque',()=>{
  const sql=fs.readFileSync(migrationPath,'utf8');
  const hard=fs.readFileSync(hardeningPath,'utf8');
  assert.match(sql,/document_categories.*enable row level security/is);
  assert.match(sql,/user_site_credentials.*enable row level security/is);
  assert.match(sql,/documents-private','documents-private',false/);
  assert.match(sql,/vault\.create_secret/);
  assert.match(sql,/revoke all on public\.user_site_credentials from anon,authenticated/);
  assert.match(hard,/revoke insert, update, delete on public\.documents from authenticated/);
  assert.match(hard,/revoke delete on public\.document_categories from authenticated/);
});

test('feature uses local XLSX loader and no public preview service or unsafe eval',()=>{
  const src=fs.readFileSync(featurePath,'utf8');
  assert.match(src,/ensureBamcoXLSX/);
  assert.doesNotMatch(src,/docs\.google|officeapps\.live|view\.officeapps|iframe[^\n]+https?:\/\//i);
  assert.doesNotMatch(src,/eval\(|new Function/);
  assert.match(src,/پیش‌نمایش امن DOCX/);
});

test('index wires both feature views and source files after integration',()=>{
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.match(html,/data-view="documents"/);
  assert.match(html,/data-view="sitesAccess"/);
  assert.match(html,/id="documentsView"/);
  assert.match(html,/id="sitesAccessView"/);
  assert.match(html,/assets\/js\/documents-sites\.js/);
  assert.match(html,/assets\/css\/documents-sites\.css/);
});
