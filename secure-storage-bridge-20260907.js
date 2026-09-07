(()=>{
  'use strict';
  if(window.__bamcoSecureStorageBridge)return;
  window.__bamcoSecureStorageBridge=true;
  const nativeFetch=window.fetch.bind(window);
  const storagePattern=/\/storage\/v1\/object\/(avatars|vehicle-forms)\/(.+?)(?:\?.*)?$/;

  async function edgeRequest(bucket,path,operation,body){
    const fd=new FormData();
    fd.append('bucket',bucket);
    fd.append('path',decodeURIComponent(path));
    fd.append('operation',operation);
    if(body instanceof Blob){
      const ext=bucket==='avatars'?'png':(body.type==='application/pdf'?'pdf':body.type==='image/png'?'png':'jpg');
      const file=body instanceof File?body:new File([body],`upload.${ext}`,{type:body.type||'application/octet-stream',lastModified:Date.now()});
      fd.append('file',file,file.name);
    }
    const res=await nativeFetch(`${SB_URL}/functions/v1/secure-storage-upload`,{
      method:'POST',
      headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},
      body:fd,
      cache:'no-store'
    });
    const text=await res.text();
    let payload={};try{payload=text?JSON.parse(text):{}}catch{}
    const normalized=JSON.stringify(res.ok?payload:{...payload,message:payload.message||payload.error||'آپلود فایل انجام نشد.'});
    return new Response(normalized,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input instanceof Request?input.url:String(input));
    const method=String(init.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    const match=url.match(storagePattern);
    if(match&&(method==='POST'||method==='PUT')&&init.body instanceof Blob){
      return edgeRequest(match[1],match[2],'upload',init.body);
    }
    if(match&&method==='DELETE'){
      return edgeRequest(match[1],match[2],'delete');
    }
    return nativeFetch(input,init);
  };
})();
