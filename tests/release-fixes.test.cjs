const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('entry is lightweight and management gate precedes login',()=>{
  const html=read('../review-next/index.html');
  assert.ok(html.indexOf('id="departmentEntry"')<html.indexOf('id="loginView"'));
  assert.doesNotMatch(html,/data:image\//);
  assert.match(html,/release-fixes\.css/);
});

test('permanent vehicle template upload is enabled without embedding the PDF',()=>{
  const js=read('assets/js/vehicles.js');
  assert.ok(Buffer.byteLength(js)<50000);
  assert.match(js,/vehicle-template-upload/);
  assert.match(js,/uploadBlankTemplate/);
  assert.match(js,/class="ghost vehicle-import"/);
  assert.doesNotMatch(js,/data:application\/pdf;base64/);
  assert.ok(fs.statSync(path.join(root,'assets/forms/vehicle-permanent-blank.pdf')).size>1000);
});

test('sticker manager is empty-safe and previews both sides together',()=>{
  const js=read('assets/js/stickers.js');
  assert.doesNotMatch(js,/desktopStickerGender/);
  assert.match(js,/sticker-pair/);
  assert.match(js,/نسخه‌ای ثبت نشده است/);
});

test('chat exposes requested messaging controls',()=>{
  const js=read('assets/js/chat-ui.js'),runtime=read('assets/js/production-runtime.js');
  assert.match(js,/5\*1024\*1024/);
  assert.match(js,/message-reply/);
  assert.match(js,/message-delete/);
  assert.match(js,/avatar_path/);
  assert.match(runtime,/chat_manage_group/);
  assert.match(runtime,/chat_group_members/);
});

test('dashboard and Excel formatting remain responsive and conditional',()=>{
  assert.match(read('assets/js/app.js'),/Math\.max\(320,canvas\.parentElement\.clientWidth\)/);
  const excel=read('assets/js/styled-excel.js');
  assert.match(excel,/rightToLeft="1"/);
  assert.match(excel,/conditionalFormatting/);
  assert.match(excel,/B Nazanin/);
});
