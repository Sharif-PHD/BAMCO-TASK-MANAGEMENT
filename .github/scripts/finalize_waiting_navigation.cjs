const fs=require('node:fs');
const p='assets/js/card-home.js';let s=fs.readFileSync(p,'utf8');
const old="const search=q('#kanbanSearch');if(search)search.value='';if(dialog.open)dialog.close();leaveHome();if(typeof showView==='function')showView('kanban');";
const next="const search=q('#kanbanSearch');if(search)search.value='';leaveHome();if(dialog.open)dialog.close();if(typeof showView==='function')showView('kanban');";
if((s.split(old).length-1)!==1)throw new Error('waiting navigation source mismatch');s=s.replace(old,next);fs.writeFileSync(p,s);
if(s.indexOf('leaveHome();if(dialog.open)dialog.close()')<0)throw new Error('waiting navigation race guard missing');
console.log('waiting navigation race guard PASS');
