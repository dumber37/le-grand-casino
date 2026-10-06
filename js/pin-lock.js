/* ============================================================
   VERROU PIN — protège l'accès à l'appli sur CET appareil (pas un
   chiffrement : les données restent dans le navigateur). Demandé à
   l'ouverture, après 5 min d'absence, et avant les actions sensibles
   (export, import, restauration, réinitialisation, transfert QR).
   Seul un condensé salé (SHA-256) du PIN est stocké. 5 erreurs de suite
   = pause de 30 s. « PIN oublié » efface toutes les données locales.
   Le PIN n'est jamais inclus dans les sauvegardes ni la synchro cloud.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  const KEY='grand-casino-pin', IDLE_MS=5*60*1000, VERIFY_MS=2*60*1000;
  let cfg=null; try{ const p=JSON.parse(localStorage.getItem(KEY)||'null'); if(p&&p.hash&&p.salt) cfg=p; }catch(e){}
  let verifiedAt=0, hiddenAt=0, fails=0, lockedUntil=0, onOk=null, cancellable=false;

  async function hashPin(pin,salt){
    const data=new TextEncoder().encode(salt+':'+pin);
    if(window.crypto&&crypto.subtle){
      const d=await crypto.subtle.digest('SHA-256',data);
      return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,'0')).join('');
    }
    let h=5381; data.forEach(b=>{ h=((h<<5)+h+b)>>>0; }); return 'f'+h.toString(16); // repli sans crypto.subtle (page non sécurisée)
  }
  const newSalt=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');

  // ---- Écran de verrouillage ----
  const lockEl=document.createElement('div');
  lockEl.className='pin-lock'; lockEl.hidden=true; lockEl.setAttribute('role','dialog'); lockEl.setAttribute('aria-modal','true'); lockEl.setAttribute('aria-label','Verrou PIN');
  lockEl.innerHTML='<div class="pin-card"><div class="pin-title">🔒 Le Grand Casino</div><p class="pin-sub" id="pinSub"></p>'
    +'<input type="password" id="pinInput" inputmode="numeric" maxlength="6" autocomplete="off" class="fr-code-input" aria-label="PIN">'
    +'<button class="primary-btn" id="pinOkBtn">Déverrouiller</button><p class="pin-err" id="pinErr" role="alert"></p>'
    +'<button class="fr-copy" id="pinCancelAskBtn" style="display:none">Annuler</button> <button class="fr-copy" id="pinForgotBtn">PIN oublié ?</button></div>';
  document.body.appendChild(lockEl);
  const inputEl=$('pinInput'), errEl=$('pinErr'), subEl=$('pinSub'), cancelBtn=$('pinCancelAskBtn');

  function show(text,cb,canCancel){
    onOk=cb||null; cancellable=!!canCancel;
    subEl.textContent=text; errEl.textContent=''; inputEl.value='';
    cancelBtn.style.display=canCancel?'':'none';
    lockEl.hidden=false; setBehind(true); setTimeout(()=>inputEl.focus(),30);
  }
  function hide(){ lockEl.hidden=true; inputEl.value=''; setBehind(false); }
  // Derrière l'écran de verrouillage, le site ne doit plus être utilisable (ni au clavier, ni par Tab, ni par les raccourcis) : `inert`.
  function setBehind(locked){ const s=document.querySelector('.shell'); if(s){ if(locked) s.setAttribute('inert',''); else s.removeAttribute('inert'); } }
  async function tryUnlock(){
    if(!cfg) { hide(); return; }
    const wait=lockedUntil-Date.now();
    if(wait>0){ errEl.textContent='Trop d’essais — réessaie dans '+Math.ceil(wait/1000)+' s.'; return; }
    const h=await hashPin(inputEl.value,cfg.salt);
    if(h===cfg.hash){ fails=0; verifiedAt=Date.now(); const cb=onOk; onOk=null; hide(); if(cb) cb(); return; }
    fails++; inputEl.value='';
    if(fails>=5){ fails=0; lockedUntil=Date.now()+30000; errEl.textContent='5 erreurs — pause de 30 secondes.'; }
    else errEl.textContent='PIN incorrect ('+(5-fails)+' essai(s) restant(s) avant une pause).';
  }
  $('pinOkBtn').addEventListener('click',tryUnlock);
  inputEl.addEventListener('keydown',e=>{ if(e.key==='Enter') tryUnlock(); else if(e.key==='Escape'&&cancellable) hide(); });
  inputEl.addEventListener('input',()=>{ inputEl.value=inputEl.value.replace(/\D/g,'').slice(0,6); });
  cancelBtn.addEventListener('click',hide);
  $('pinForgotBtn').addEventListener('click',()=>{
    if(!confirm('Réinitialiser l’application efface TOUTES les données de cet appareil (solde, progression, achats, sauvegardes locales). Continuer ?')) return;
    try{ localStorage.clear(); }catch(e){}
    location.reload();
  });

  // ---- Quand verrouiller ----
  if(cfg) show('Saisis ton PIN pour continuer',null,false);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ hiddenAt=Date.now(); return; }
    if(cfg&&hiddenAt&&Date.now()-hiddenAt>IDLE_MS&&lockEl.hidden) show('Session verrouillée — saisis ton PIN',null,false);
  });
  // Actions sensibles : intercepte le clic (phase de capture, avant les gestionnaires du bouton) tant
  // que le PIN n'a pas été saisi dans les 2 dernières minutes, puis rejoue le clic une fois validé.
  const SENSITIVE='#exportSaveBtn,#importSaveBtn,#resetBtn,#showSaveQrBtn,#restoreNowBtn,[data-restore],#acc-downloadBtn,#acc-uploadBtn';
  document.addEventListener('click',e=>{
    if(!cfg) return;
    const b=e.target.closest(SENSITIVE); if(!b) return;
    if(Date.now()-verifiedAt<VERIFY_MS) return;
    e.stopImmediatePropagation(); e.preventDefault();
    show('PIN requis pour cette action',()=>b.click(),true);
  },true);

  // ---- Réglage dans Paramètres ----
  const toggle=$('pinToggle'), box=$('pinSetupBox'), msgEl=$('pinMsg');
  function sync(){ if(!toggle) return; const on=!!cfg; toggle.textContent=on?'Activé':'Désactivé'; toggle.classList.toggle('on',on); toggle.setAttribute('aria-pressed',String(on)); }
  if(toggle){
    toggle.addEventListener('click',()=>{
      if(cfg){
        show('Saisis ton PIN pour désactiver le verrou',()=>{ cfg=null; try{ localStorage.removeItem(KEY); }catch(e){} sync(); C.showToast&&C.showToast('🔓 Verrou PIN désactivé'); },true);
      } else { box.style.display=box.style.display==='none'?'block':'none'; msgEl.textContent=''; }
    });
    $('pinCancelBtn').addEventListener('click',()=>{ box.style.display='none'; $('pinNew').value=''; $('pinConfirm').value=''; });
    ['pinNew','pinConfirm'].forEach(id=>$(id).addEventListener('input',e=>{ e.target.value=e.target.value.replace(/\D/g,'').slice(0,6); }));
    $('pinSaveBtn').addEventListener('click',async()=>{
      const a=$('pinNew').value, b=$('pinConfirm').value;
      if(!/^\d{4,6}$/.test(a)){ msgEl.textContent='Le PIN doit contenir 4 à 6 chiffres.'; return; }
      if(a!==b){ msgEl.textContent='Les deux saisies sont différentes.'; return; }
      const salt=newSalt(); cfg={salt,hash:await hashPin(a,salt)};
      try{ localStorage.setItem(KEY,JSON.stringify(cfg)); }catch(e){ cfg=null; msgEl.textContent='Impossible d’enregistrer (stockage indisponible).'; return; }
      verifiedAt=Date.now(); $('pinNew').value=''; $('pinConfirm').value=''; box.style.display='none'; sync();
      C.showToast&&C.showToast('🔒 Verrou PIN activé');
    });
  }
  sync();
})();
