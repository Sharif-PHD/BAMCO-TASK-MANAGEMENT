const fs=require('node:fs');
const p='assets/js/documents-sites.js';
let s=fs.readFileSync(p,'utf8');
const old="const raw=data?.signedURL||data?.signedUrl||data?.signed_url;if(!raw)throw Error('لینک امن پیش‌نمایش دریافت نشد.');return new URL(raw,SB_URL).href";
const next="const raw=data?.signedURL||data?.signedUrl||data?.signed_url;if(!raw)throw Error('لینک امن پیش‌نمایش دریافت نشد.');if(/^https?:\\/\\//i.test(raw))return raw;return `${SB_URL}/storage/v1${raw.startsWith('/')?'':'/'}${raw}`";
if((s.split(old).length-1)!==1)throw new Error('signed URL normalization source mismatch');
s=s.replace(old,next);fs.writeFileSync(p,s);
const testPath='tests/documents-sites.test.cjs';let t=fs.readFileSync(testPath,'utf8');
const anchor="  assert.match(src,/expiresIn:300/);";
const add="  assert.match(src,/storage\\/v1\\$\\{raw\\.startsWith/);";
if(!t.includes(add)){if((t.split(anchor).length-1)!==1)throw new Error('signed URL test anchor mismatch');t=t.replace(anchor,anchor+'\n'+add);fs.writeFileSync(testPath,t)}
if(!s.includes("return `${SB_URL}/storage/v1${raw.startsWith('/')?'':'/'}${raw}`"))throw new Error('signed URL final path missing');
console.log('signed URL normalization PASS');
