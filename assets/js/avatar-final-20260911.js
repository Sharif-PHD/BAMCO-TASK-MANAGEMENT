(()=>{
'use strict';
if(window.__bamcoFinalProductionFixLoader20260911)return;
window.__bamcoFinalProductionFixLoader20260911=true;
const load=()=>{
  if(document.querySelector('script[data-bamco-final-production-fixes]'))return;
  const s=document.createElement('script');
  s.src='assets/js/final-production-fixes-20260911.js?v=20260911-1';
  s.dataset.bamcoFinalProductionFixes='1';
  s.async=false;
  document.head.appendChild(s);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
