const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture,until}=require('./helpers/app-fixture.cjs');
function unzipStored(bytes){const result=new Map();let at=0;while(bytes.readUInt32LE(at)===0x04034b50){const size=bytes.readUInt32LE(at+18),nameLength=bytes.readUInt16LE(at+26),extraLength=bytes.readUInt16LE(at+28),start=at+30+nameLength+extraLength;assert.equal(bytes.readUInt16LE(at+8),0);result.set(bytes.subarray(at+30,at+30+nameLength).toString(),bytes.subarray(start,start+size).toString());at=start+size}return result}

test('creation shows whole credential labels above separate fields and clears secrets on close',async t=>{
 const f=await fixture({styles:true,fetchResult:({endpoint,method,body,data})=>endpoint==='admin-users'&&method==='POST'&&!body.user_id?{...data,login_name:'fixture@example.invalid',temporary_password:'Synthetic-password-99!'}:undefined}),{d,w}=f;t.after(()=>f.dispose());await f.open('people');
 d.querySelector('#addPersonBtn').click();const form=d.querySelector('#personForm');form.elements.full_name.value='فرد آزمایشی';form.requestSubmit();await until(()=>d.querySelector('#initialCredentials')?.open);
 const dialog=d.querySelector('#initialCredentials');assert.equal(dialog.querySelector('#initialLoginName').value,'fixture@example.invalid');assert.equal(dialog.querySelector('#initialTemporaryPassword').value,'Synthetic-password-99!');
 for(const [id,label] of [['initialLoginName','نام کاربری'],['initialTemporaryPassword','رمز عبور موقت']]){const input=d.getElementById(id),field=input.parentElement,labelEl=field.querySelector('label');assert.equal(labelEl.textContent,label);assert.equal(labelEl.htmlFor,id);assert.equal(labelEl.nextElementSibling,input);assert.equal(w.getComputedStyle(labelEl).display,'block');assert.equal(w.getComputedStyle(labelEl).whiteSpace,'nowrap');assert.equal(w.getComputedStyle(field).display,'grid')}
 assert.equal(f.calls.filter(c=>c.endpoint==='admin-users'&&c.method==='POST').length,1);dialog.querySelector('button').click();assert.equal(dialog.children.length,0);assert(!d.body.innerHTML.includes('Synthetic-password-99!'));assert.deepEqual(f.errors,[]);
});

test('people Excel writes explicit borders for every cell for selected and complete exports',async t=>{
 const f=await fixture(),{d,w}=f;t.after(()=>f.dispose());await f.open('people');await until(()=>d.querySelector('#peopleBody [data-id=test-owner]'));
 for(const selected of [true,false]){
  w.bamcoSelection.set('#peopleBody',selected?['test-owner']:[]);const before=f.downloads.length;d.querySelector('#peopleView [data-management-export]').click();await until(()=>f.downloads.length>before);
  const bytes=Buffer.from(await f.downloads.at(-1).blob.arrayBuffer()),files=unzipStored(bytes),parser=new w.DOMParser(),style=parser.parseFromString(files.get('xl/styles.xml'),'text/xml'),sheet=parser.parseFromString(files.get('xl/worksheets/sheet1.xml'),'text/xml');
  assert.equal(style.querySelector('parsererror'),null);const border=style.querySelectorAll('borders>border')[1];for(const side of ['left','right','top','bottom']){assert.equal(border.querySelector(side).getAttribute('style'),'thin');assert.equal(border.querySelector(side+' color').getAttribute('rgb'),'FF718477')}
  const formats=style.querySelectorAll('cellXfs>xf');for(const cell of sheet.querySelectorAll('sheetData c')){const format=formats[Number(cell.getAttribute('s'))];assert.equal(format.getAttribute('borderId'),'1');assert.equal(format.getAttribute('applyBorder'),'1')}
  assert.equal(sheet.querySelectorAll('sheetData c').length,(selected?2:3)*6);const book=w.XLSX.read(new Uint8Array(bytes),{type:'array'}),rows=w.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});assert.equal(rows.length,selected?2:3);
 }
 assert.deepEqual(f.errors,[]);
});

test('failed deletion is reported without removing the row or preventing another edit',async t=>{
 const f=await fixture(),{d}=f;t.after(()=>f.dispose());await f.open('people');await until(()=>d.querySelector('#peopleBody [data-id=test-owner]'));d.querySelector('#peopleBody [data-id=test-owner]').click();f.failures.add('admin-users');d.querySelector('#deletePersonBtn').click();await until(()=>f.calls.some(c=>c.endpoint==='ui-notice'&&c.body.includes('۰ حساب حذف شد')));assert(d.querySelector('#peopleBody [data-id=test-owner]'));
 f.failures.delete('admin-users');d.querySelector('#peopleBody [data-id=test-owner]').click();d.querySelector('#editPersonBtn').click();assert(d.querySelector('#personDialog').open);assert.deepEqual(f.errors,[]);
});
