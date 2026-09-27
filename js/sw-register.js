/* ============================================================
   ENREGISTREMENT DU SERVICE WORKER — active le mode hors-ligne et
   l'installation "à l'écran d'accueil". Nécessite d'être servi via
   http(s) (localhost/127.0.0.1 comptent) : ne fonctionne pas en
   ouvrant index.html directement depuis le disque (file://), c'est
   une contrainte du navigateur, pas de ce script.
   ============================================================ */
if('serviceWorker' in navigator && (location.protocol==='http:'||location.protocol==='https:')){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
