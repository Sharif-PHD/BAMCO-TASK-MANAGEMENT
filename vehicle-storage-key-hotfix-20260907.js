(()=>{
  'use strict';
  if(window.__bamcoVehicleStorageKeyHotfix)return;
  window.__bamcoVehicleStorageKeyHotfix='ascii-safe-v1';

  const previousFetch=window.fetch.bind(window);
  const storagePrefix='/storage/v1/object/vehicle-forms/';
  const restNeedle='/rest/v1/vehicle_permanent_records';

  function decodePath(value){
    return String(value||'').split('/').map(part=>{try{return decodeURIComponent(part)}catch{return part}}).join('/');
  }
  function fileExt(path,mime=''){
    const m=String(mime||'').toLowerCase();
    if(m==='application/pdf')return'pdf';
    if(m==='image/png')return'png';
    if(m==='image/jpeg')return'jpg';
    const x=decodePath(path).toLowerCase().match(/\.(pdf|png|jpe?g)$/);
    return x?(x[1]==='jpeg'?'jpg':x[1]):'pdf';
  }
  function safePath(path,mime=''){
    const decoded=decodePath(path);
    const match=decoded.match(/^permanent\/(\d+)\/(\d+)(?:-[^/]*)?(?:\.(pdf|png|jpe?g))?$/i);
    if(!match)return decoded;
    const ext=fileExt(decoded,mime);
    return `permanent/${match[1]}/${match[2]}.${ext}`;
  }
  function encodePath(path){return String(path).split('/').map(encodeURIComponent).join('/')}

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input instanceof Request?input.url:String(input));
    const method=String(init.method||(input instanceof Request?input.method:'GET')).toUpperCase();

    if((method==='POST'||method==='PUT'||method==='DELETE')&&url.includes(storagePrefix)){
      const i=url.indexOf(storagePrefix),head=url.slice(0,i+storagePrefix.length),tail=url.slice(i+storagePrefix.length);
      const q=tail.indexOf('?'),rawPath=q>=0?tail.slice(0,q):tail,query=q>=0?tail.slice(q):'';
      const safe=safePath(rawPath,init.body?.type||'');
      if(safe!==decodePath(rawPath)){
        return previousFetch(head+encodePath(safe)+query,init);
      }
    }

    if(method==='PATCH'&&url.includes(restNeedle)&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body);
        if(body&&typeof body.form_path==='string'&&body.form_path.startsWith('permanent/')){
          body.form_path=safePath(body.form_path);
          return previousFetch(input,{...init,body:JSON.stringify(body)});
        }
      }catch{}
    }

    return previousFetch(input,init);
  };
})();
