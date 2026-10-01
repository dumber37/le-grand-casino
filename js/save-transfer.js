/* ============================================================
   TRANSFERT DE SAUVEGARDE PAR QR CODE — fait passer sa progression
   d'un appareil à l'autre (PC ↔ téléphone) sans compte ni cloud : un
   lien encodé en QR (#importsave=...), ouvert nativement par
   l'appareil photo de n'importe quel téléphone (même principe que le
   lien d'invitation du Salon entre amis, voir friends.js). L'historique
   détaillé n'est pas inclus (buildSaveObject({skipHistory:true}), déjà
   dans core.js) — le reste (solde, stats, achievements, missions,
   favoris) tient largement dans un QR, contrairement à 100 parties
   d'historique qui le feraient largement déborder.
   ============================================================ */
(function(){
  const C = window.Casino;
  const btn = document.getElementById('showSaveQrBtn'), box = document.getElementById('saveQrBox');
  if(!btn || !box) return;

  function qrLink(){
    const payload = C.buildSaveObject({skipHistory:true});
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return location.origin + location.pathname + '#importsave=' + encoded;
  }
  btn.addEventListener('click', ()=>{
    if(box.style.display!=='none'){ box.style.display='none'; btn.textContent='Afficher un QR de transfert'; return; }
    const svg = C.makeQrSvg ? C.makeQrSvg(qrLink(), 4, 8) : null;
    box.innerHTML = svg
      ? '<p style="font-size:.74rem;color:var(--muted);margin:0 0 8px">Scanne ce code avec l’appareil photo de l’autre appareil (solde, stats, achievements et missions inclus — pas l’historique détaillé).</p>'+svg
      : '<p style="font-size:.78rem;color:var(--red)">Sauvegarde trop volumineuse pour un QR cette fois — utilise plutôt « Exporter ma sauvegarde ».</p>';
    box.style.display = 'block'; btn.textContent = 'Masquer le QR';
  });

  // #importsave=... détecté dans l'URL (après un scan) : propose l'import comme pour un fichier,
  // jamais appliqué silencieusement.
  function handleImportHash(){
    const h = location.hash;
    if(h.indexOf('#importsave=')!==0) return;
    let payload;
    try{ payload = JSON.parse(decodeURIComponent(escape(atob(h.slice(12))))); }catch(e){ return; }
    if(!C.validateSaveData(payload)) return;
    if(!confirm('Importer cette sauvegarde depuis le QR code va remplacer TOUTES tes données actuelles (solde, statistiques, achievements, missions, favoris...). Continuer ?')) return;
    C.applySaveObject(payload);
    C.reloadAfterImport();
  }
  window.addEventListener('hashchange', handleImportHash);
  handleImportHash();
})();
