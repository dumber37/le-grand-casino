/* ============================================================
   CLASSEMENT EN LIGNE — liste en direct des joueurs qui ont choisi d'y
   apparaître, sans rien importer. S'appuie sur le même projet Firebase
   que la sauvegarde cloud (cloud-sync.js) : un document par joueur dans
   la collection « leaderboard » (pseudo + chiffres de jeu, rien d'autre).
   - Voir le classement : aucun compte requis ; le SDK Firebase n'est
     chargé qu'à l'ouverture de la page Classement.
   - Y apparaître : il faut être connecté (page « Connexion ») ET le
     demander explicitement (bouton, désactivable à tout moment : le
     document est alors supprimé).
   Tout ce qui arrive du réseau est assaini (C.num / C.str, échappement) :
   un document truqué ne peut rien injecter dans la page. Les chiffres
   viennent du navigateur de chaque joueur : ce classement est amical, pas
   infalsifiable. Règle Firestore à publier : voir js/firebase-config.js.
   ============================================================ */
window.Casino=window.Casino||{};
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  const box=$('lb-online'), view=$('view-leaderboard'), sortEl=$('lb-sort');
  if(!box||!view||!sortEl||!C.firebaseConfigured) return; // pas de Firebase configuré : la section reste masquée
  box.style.display='';

  const OPT_KEY='grand-casino-lb-online'; // préférence de CET appareil (pas dans les sauvegardes)
  const statusEl=$('lb-onlineStatus'), listEl=$('lb-onlineList'), actionsEl=$('lb-onlineActions'), liveEl=$('lb-live');
  const SIZE=30, PUBLISH_EVERY=15000;
  let fb=null, loading=null, user=null, rows=[], unsub=null, liveMetric='', optedIn=false, state='idle', pubTimer=0, lastPub=0, authBound=false;
  try{ optedIn=localStorage.getItem(OPT_KEY)==='1'; }catch(e){}
  const saveOpt=()=>{ try{ if(optedIn) localStorage.setItem(OPT_KEY,'1'); else localStorage.removeItem(OPT_KEY); }catch(e){} };
  const active=()=>view.classList.contains('active');

  // Chargement du SDK : auth AVANT firestore, comme cloud-sync.js, pour que Firestore envoie bien l'identité du joueur connecté.
  function loadFb(){
    if(fb) return Promise.resolve(fb);
    if(!loading) loading=Promise.all([
      C.loadFirebaseApp(),
      import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
    ]).then(([app,authMod,fsMod])=>{ fb={app,authMod,fsMod,auth:authMod.getAuth(app),db:fsMod.getFirestore(app)}; return fb; })
      .catch(e=>{ loading=null; throw e; });
    return loading;
  }

  // Un document reçu du réseau : texte court et nombres finis uniquement.
  const n0=v=>Math.max(0,Math.min(1e12,Math.round(C.num(v))));
  function clean(d){
    d=d&&typeof d==='object'?d:{};
    return {name:C.str(d.name,20).trim()||'Joueur', balance:n0(d.balance), totalWon:n0(d.totalWon), totalWagered:n0(d.totalWagered),
      biggestWin:n0(d.biggestWin), crashBestMult:Math.max(0,Math.min(1e6,C.num(d.crashBestMult))), gamesPlayed:n0(d.gamesPlayed),
      vipIdx:Math.max(0,Math.min(5,Math.round(C.num(d.vipIdx))))};
  }
  const fmt=n=>(n||0).toLocaleString('fr-FR');
  const metricText=(s,m)=>m==='crashBestMult'?(s.crashBestMult>0?'x'+s.crashBestMult.toFixed(2):'—'):fmt(s[m]);

  function render(){
    const m=sortEl.value;
    if(state==='error'||state==='denied'||state==='loading'||(state==='idle'&&!rows.length)){ listEl.innerHTML=''; }
    else if(!rows.length) listEl.innerHTML='<p class="empty-state">Personne dans le classement pour l’instant — sois le premier !</p>';
    else listEl.innerHTML=rows.map((r,i)=>{
      const s=r.s, tier=(C.VIP_TIERS&&C.VIP_TIERS[s.vipIdx])||{icon:'',name:'',color:'var(--muted)'}, me=!!(user&&r.id===user.uid);
      return '<div class="lb-row'+(me?' lb-me':'')+'"><span class="lb-rank">'+(i+1)+'</span>'
        +'<span class="lb-name">'+(C.avatars?C.avatars.html(me?'Toi':s.name,26):'')+C.escapeHtml(me?s.name+' (toi)':s.name)+'</span>'
        +'<span class="lb-vip" style="color:'+tier.color+'">'+C.escapeHtml(tier.icon+' '+tier.name)+'</span>'
        +'<span class="lb-metric">'+metricText(s,m)+'</span></div>';
    }).join('');
    liveEl.textContent=(unsub&&state==='live')?'● en direct':'';
    // ----- message d'état + actions -----
    let msg='', acts='';
    if(state==='loading') msg='Connexion au classement…';
    else if(state==='denied') msg='Le classement en ligne n’est pas encore activé sur ce site : la règle Firestore « leaderboard » reste à publier (voir js/firebase-config.js).';
    else if(state==='error') msg='Impossible de joindre le classement en ligne (connexion ?).';
    else if(!user) { msg='Tu vois le classement en direct. Pour y apparaître, connecte-toi d’abord.'; acts='<button type="button" class="primary-btn" data-view="account">🔐 Se connecter</button>'; }
    else if(optedIn){ msg='✅ Tu apparais dans le classement sous le pseudo « '+C.escapeHtml(C.avatars?C.avatars.pseudo():'Joueur')+' » (modifiable dans Profil). Ton solde et tes stats sont mis à jour automatiquement.'; acts='<button type="button" id="lb-optOut">Me retirer du classement</button>'; }
    else { msg='Seuls ton pseudo, ton solde et tes statistiques de jeu seraient visibles par les autres joueurs.'; acts='<button type="button" class="primary-btn" id="lb-optIn">🌍 Apparaître dans le classement</button>'; }
    statusEl.innerHTML=msg; actionsEl.innerHTML=acts;
  }

  function stopLive(){ if(unsub){ try{ unsub(); }catch(e){} unsub=null; } liveMetric=''; }
  async function startLive(){
    const metric=sortEl.value;
    if(unsub&&liveMetric===metric) return;
    stopLive();
    if(state!=='live') state='loading'; render();
    try{
      const f=await loadFb(); bindAuth(f);
      if(!active()){ state='idle'; render(); return; }
      const {fsMod,db}=f;
      liveMetric=metric;
      unsub=fsMod.onSnapshot(fsMod.query(fsMod.collection(db,'leaderboard'),fsMod.orderBy(metric,'desc'),fsMod.limit(SIZE)),snap=>{
        rows=snap.docs.map(d=>({id:d.id,s:clean(d.data())})); state='live';
        if(user&&!optedIn&&rows.some(r=>r.id===user.uid)){ optedIn=true; saveOpt(); } // déjà inscrit depuis un autre appareil
        render();
      },err=>{ stopLive(); state=(err&&err.code==='permission-denied')?'denied':'error'; render(); });
    }catch(e){ state='error'; render(); }
  }
  function bindAuth(f){
    if(authBound) return; authBound=true;
    f.authMod.onAuthStateChanged(f.auth,u=>{ user=u||null; if(user&&optedIn) publish(true); render(); });
  }

  async function publish(force){
    if(!user||!optedIn||!fb) return;
    if(C.challengeActive) return; // pendant un Défi personnel le solde est fictif : jamais publié (repris à la fin du défi)
    const now=Date.now();
    if(!force&&now-lastPub<PUBLISH_EVERY){ clearTimeout(pubTimer); pubTimer=setTimeout(()=>publish(true),PUBLISH_EVERY-(now-lastPub)); return; }
    lastPub=now;
    try{
      const s=clean(C.leaderboardSummary?C.leaderboardSummary():{});
      s.name=C.str(C.avatars?C.avatars.pseudo():'Joueur',20).trim()||'Joueur';
      await fb.fsMod.setDoc(fb.fsMod.doc(fb.db,'leaderboard',user.uid),Object.assign({},s,{updatedAt:now}));
    }catch(e){ if(e&&e.code==='permission-denied'){ state='denied'; render(); } }
  }

  actionsEl.addEventListener('click',async e=>{
    if(e.target.closest('#lb-optIn')){ optedIn=true; saveOpt(); render(); await publish(true); startLive(); }
    else if(e.target.closest('#lb-optOut')){
      optedIn=false; saveOpt(); clearTimeout(pubTimer); render();
      try{ if(user&&fb) await fb.fsMod.deleteDoc(fb.fsMod.doc(fb.db,'leaderboard',user.uid)); C.showToast&&C.showToast('Tu n’apparais plus dans le classement en ligne'); }catch(err){}
    }
  });
  sortEl.addEventListener('change',()=>{ if(active()) startLive(); });
  document.addEventListener('balance-changed',()=>{ if(optedIn&&user&&fb) publish(false); });
  document.addEventListener('pseudo-changed',()=>{ if(optedIn&&user&&fb) publish(true); });
  // Hors de la page Classement, plus d'écoute en direct (rien n'est lu pour rien) ; on la rouvre au retour.
  new MutationObserver(()=>{ if(!active()){ stopLive(); if(state==='live') state='idle'; } }).observe(view,{attributes:true,attributeFilter:['class']});

  // switchView appelle C.renderLeaderboard à chaque ouverture de la page.
  const base=C.renderLeaderboard;
  C.renderLeaderboard=function(){ if(base) base(); render(); startLive().then(()=>{ if(optedIn&&user) publish(false); }); };
  render();
})();
