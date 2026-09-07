(()=>{
  'use strict';
  if(window.__bamcoSecureStorageBridge)return;
  window.__bamcoSecureStorageBridge='edge-with-direct-fallback-v2';
  const nativeFetch=window.fetch.bind(window);
  const storagePattern=/\/storage\/v1\/object\/(avatars|vehicle-forms)\/(.+?)(?:\?.*)?$/;

  const mimeFor=(bucket,path,body)=>{
    if(body?.type)return body.type;
    const lower=decodeURIComponent(path).toLowerCase();
    if(lower.endsWith('.pdf'))return 'application/pdf';
    if(lower.endsWith('.png'))return 'image/png';
    if(lower.endsWith('.jpg')||lower.endsWith('.jpeg'))return 'image/jpeg';
    if(lower.endsWith('.webp'))return 'image/webp';
    return bucket==='avatars'?'image/png':'application/octet-stream';
  };

  async function edgeRequest(bucket,path,operation,body){
    const fd=new FormData();
    fd.append('bucket',bucket);
    fd.append('path',decodeURIComponent(path));
    fd.append('operation',operation);
    if(body instanceof Blob){
      const type=mimeFor(bucket,path,body);
      const ext=type==='application/pdf'?'pdf':type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
      const file=body instanceof File&&body.type?body:new File([body],body?.name||`upload.${ext}`,{type,lastModified:Date.now()});
      fd.append('file',file,file.name);
    }
    try{
      const res=await nativeFetch(`${SB_URL}/functions/v1/secure-storage-upload`,{
        method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${state.token}`},body:fd,cache:'no-store'
      });
      const text=await res.text();let payload={};try{payload=text?JSON.parse(text):{}}catch{}
      const normalized=JSON.stringify(res.ok?payload:{...payload,message:payload.message||payload.error||'مسیر امن آپلود پاسخ موفق نداد.'});
      return new Response(normalized,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    }catch(err){
      return new Response(JSON.stringify({message:err?.message||'مسیر امن آپلود در دسترس نبود.'}),{status:599,headers:{'Content-Type':'application/json'}});
    }
  }

  async function directFallback(input,init,edgeRes){
    try{
      const direct=await nativeFetch(input,init);
      if(direct.ok)return direct;
      return direct.status!==0?direct:edgeRes;
    }catch{return edgeRes}
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input instanceof Request?input.url:String(input));
    const method=String(init.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    const match=url.match(storagePattern);
    if(match&&(method==='POST'||method==='PUT')&&init.body instanceof Blob){
      const edgeRes=await edgeRequest(match[1],match[2],'upload',init.body);
      if(edgeRes.ok)return edgeRes;
      return directFallback(input,init,edgeRes);
    }
    if(match&&method==='DELETE'){
      const edgeRes=await edgeRequest(match[1],match[2],'delete');
      if(edgeRes.ok)return edgeRes;
      return directFallback(input,init,edgeRes);
    }
    return nativeFetch(input,init);
  };
})();
