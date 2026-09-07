import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname),release=join(root,'release');
async function files(dir){const out=[];for(const name of await readdir(dir)){const path=join(dir,name),s=await stat(path);if(s.isDirectory())out.push(...await files(path));else if(/\.(?:html|js|css)$/i.test(name))out.push(path)}return out}
const paths=await files(release),content=(await Promise.all(paths.map(path=>readFile(path)))).map((b,i)=>[paths[i],b.toString('utf8')]);
const forbidden=[
  [/service[_-]?role/i,'service-role credential'],
  [/sb_secret_/i,'secret Supabase key'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'private key'],
  [/\beval\s*\(/,'eval'],
  [/document\.write\s*\(/,'document.write']
];
for(const [pattern,label] of forbidden)for(const [path,text] of content)if(pattern.test(text))throw new Error(`${label} found in ${path}`);
const html=(await readFile(join(release,'index.html'),'utf8'));
const refs=[...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"?]+)(?:\?[^" ]*)?"/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x));
for(const ref of refs)await stat(join(release,ref));
if(new Set(refs).size!==refs.length)throw new Error('Duplicate static asset reference detected.');
if(!html.includes('task-calendar-gantt-20260907.js'))throw new Error('Calendar/Gantt module is missing.');
console.log(`security release tests: OK (${paths.length} text assets scanned)`);
