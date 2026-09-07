import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source=(await readFile(new URL('../data-io.js',import.meta.url),'utf8')).split('// Load the latest UI corrections')[0];
let exported=null;
const cells={};
const XLSX={
  SSF:{parse_date_code:n=>n===46008?{y:2025,m:12,d:17}:null},
  utils:{
    aoa_to_sheet(data){
      exported=data;const ws={'!ref':`A1:O${data.length}`};
      data.forEach((row,r)=>row.forEach((v,c)=>cells[`${r}:${c}`]={v,t:v instanceof Date?'d':typeof v==='number'?'n':'s'}));
      return new Proxy(ws,{get(o,k){if(k in o)return o[k];const m=String(k).match(/^([A-Z]+)(\d+)$/);if(!m)return undefined;let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;return cells[`${Number(m[2])-1}:${c-1}`]},set(o,k,v){o[k]=v;return true}});
    },
    decode_range:()=>({s:{r:0,c:0},e:{r:1,c:14}}),
    encode_cell:({r,c})=>`${String.fromCharCode(65+c)}${r+1}`,
    encode_range:()=> 'A1:O2',
    book_new:()=>({}),book_append_sheet(){},
  },
  writeFile(){},
};
const document={querySelector:()=>null};
const context={window:{},document,XLSX,console,Date,
  en:s=>String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)),
  norm:s=>String(s??'').trim(),jalaliToISO:(y,m,d)=>`${y===1405?2026:y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
  state:{tasks:[{id:1,legacy_id:1219,archived:false,title:'نمونه',description:'',owner_id:'u1',status:'در حال انجام',priority:'فوری',start_date:'2026-09-01',done_date:null,due_date:'2026-09-10',reminder_days:2,last_updated_at:'2026-09-07T10:00:00Z'}]},
  displayId:t=>t.legacy_id,ownerName:()=> 'کاربر',jalaliText:x=>x||'',jalaliDateTime:x=>x||'',toast(){},safe:x=>x,fa:x=>String(x),refresh(){},update(){},insert(){},
};
context.window=context;
vm.createContext(context);vm.runInContext(source,context);
assert.equal(context.BAMCO_DATA_IO.iso('1405/06/04'),'2026-06-04');
assert.equal(context.BAMCO_DATA_IO.iso('2026-09-07'),'2026-09-07');
assert.equal(context.BAMCO_DATA_IO.iso(46008),'2025-12-17');
context.BAMCO_DATA_IO.exportRows(false);
assert.equal(typeof exported[1][0],'number');
assert.equal(exported[1][0],1219);
assert.ok(exported[1][6] instanceof Date);
assert.equal(typeof exported[1][9],'number');
console.log('data-io tests: OK');
