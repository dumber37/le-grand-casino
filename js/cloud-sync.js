/* ============================================================
   CONNEXION / SYNCHRONISATION CLOUD — optionnelle, jamais obligatoire
   pour jouer. Réutilise EXACTEMENT le même format que l'export/import
   déjà existant (C.buildSaveObject / C.applySaveObject, voir core.js) :
   aucun format parallèle. Le SDK Firebase n'est chargé (depuis son CDN
   officiel) QUE si CASINO_FIREBASE_CONFIG est rempli ET que le joueur a
   déjà une session active OU clique lui-même sur "Se connecter" — un
   joueur qui ne s'en sert jamais ne télécharge rien depuis Firebase, le
   site reste 100% hors-ligne par défaut.
   ============================================================ */
window.Casino=window.Casino||{};
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('view-account')) return;

  const anonEl=$('acc-anon'), notConfEl=$('acc-notConfigured'), stepsEl=$('acc-steps');
  const loginEl=$('acc-login'), connectedEl=$('acc-connected');
  const emailEl=$('acc-email'), passEl=$('acc-password');
  const showLoginBtn=$('acc-showLoginBtn'), signinBtn=$('acc-signinBtn'), signupBtn=$('acc-signupBtn'), cancelBtn=$('acc-cancelBtn');
  const uploadBtn=$('acc-uploadBtn'), downloadBtn=$('acc-downloadBtn'), signoutBtn=$('acc-signoutBtn');
  const userEmailEl=$('acc-userEmail'), lastSyncEl=$('acc-lastSync'), msgEl=$('acc-message');
  const SESSION_FLAG='grand-casino-had-session';

  const configured=C.firebaseConfigured;

  stepsEl.innerHTML=[
    'Va sur <b>console.firebase.google.com</b> et crée un projet gratuit (aucune carte bancaire).',
    'Active <b>Authentication</b> → onglet « Sign-in method » → active « E-mail/Mot de passe ».',
    'Active <b>Firestore Database</b> (mode production) et colle les règles de sécurité fournies dans <code>js/firebase-config.js</code> (commentaire en haut du fichier).',
    '⚙️ Paramètres du projet → Général → « Vos applications » → crée une app Web (</>), copie sa configuration.',
    'Colle cette configuration dans <b>js/firebase-config.js</b>, à la place de <code>null</code>, puis redéploie.'
  ].map(s=>'<li>'+s+'</li>').join('');

  const cloudBadge=$('hdrCloudBadge');
  function say(t){ msgEl.textContent=t; }
  function showLoggedOut(){
    anonEl.style.display=''; loginEl.style.display='none'; connectedEl.style.display='none';
    if(cloudBadge) cloudBadge.style.display='none';
  }
  function showLoggedIn(email){
    anonEl.style.display='none'; loginEl.style.display='none'; connectedEl.style.display='block';
    userEmailEl.textContent=email;
    if(cloudBadge){ cloudBadge.style.display='inline'; cloudBadge.title='Connecté : '+email; }
  }
  // Exposé pour core.js : appelé à chaque ouverture de la vue (switchView), comme les autres
  // rendus différés (renderStats, renderChallenges...). Ne déclenche jamais de chargement du
  // SDK à lui seul — juste l'état déjà connu.
  C.renderAccount=function(){
    notConfEl.classList.toggle('show', !configured);
    if(!configured) return;
    if(fb&&fb.auth&&fb.auth.currentUser) showLoggedIn(fb.auth.currentUser.email);
    else if(loginEl.style.display!=='block') showLoggedOut();
  };

  if(!configured){ C.renderAccount(); return; } // pas de config → rien d'autre à faire, aucun SDK chargé

  let fb=null; // { app, auth, db, authMod, fsMod } une fois le SDK chargé
  async function loadFirebase(){
    if(fb) return fb;
    say('Chargement…');
    const [app, authMod, fsMod] = await Promise.all([
      C.loadFirebaseApp(),
      import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
    ]);
    fb={app, auth:authMod.getAuth(app), db:fsMod.getFirestore(app), authMod, fsMod};
    return fb;
  }

  async function afterSignIn(){
    try{ localStorage.setItem(SESSION_FLAG,'1'); }catch(e){}
    showLoggedIn(fb.auth.currentUser.email);
    const {fsMod,db}=fb;
    const ref=fsMod.doc(db,'saves',fb.auth.currentUser.uid);
    const snap=await fsMod.getDoc(ref);
    if(snap.exists()){
      const data=snap.data();
      lastSyncEl.textContent=data.updatedAt?new Date(data.updatedAt).toLocaleString('fr-FR'):'—';
      say('Une sauvegarde cloud existe déjà pour ce compte. Choisis un sens de synchronisation ci-dessous.');
    } else {
      // Premier lien pour ce compte : on initialise le cloud avec la sauvegarde locale actuelle.
      await fsMod.setDoc(ref, {payload:C.buildSaveObject(), updatedAt:Date.now()});
      lastSyncEl.textContent=new Date().toLocaleString('fr-FR');
      say('Connecté — ta sauvegarde locale a été envoyée sur le cloud.');
    }
  }

  showLoginBtn.addEventListener('click',()=>{ anonEl.style.display='none'; loginEl.style.display='block'; say(''); });
  cancelBtn.addEventListener('click',()=>{ loginEl.style.display='none'; showLoggedOut(); say(''); });

  async function withAuthAction(mode){
    const email=emailEl.value.trim(), pass=passEl.value;
    if(!email||pass.length<6){ say('Email + mot de passe (6 caractères minimum).'); return; }
    try{
      const {auth,authMod}=await loadFirebase();
      if(mode==='signin') await authMod.signInWithEmailAndPassword(auth,email,pass);
      else await authMod.createUserWithEmailAndPassword(auth,email,pass);
      await afterSignIn();
    }catch(e){
      say('Erreur : '+(e&&e.code?e.code:'connexion impossible.'));
    }
  }
  signinBtn.addEventListener('click',()=>withAuthAction('signin'));
  signupBtn.addEventListener('click',()=>withAuthAction('signup'));

  uploadBtn.addEventListener('click',async()=>{
    try{
      const {fsMod,db}=fb;
      await fsMod.setDoc(fsMod.doc(db,'saves',fb.auth.currentUser.uid), {payload:C.buildSaveObject(), updatedAt:Date.now()});
      lastSyncEl.textContent=new Date().toLocaleString('fr-FR');
      say('✅ Sauvegarde envoyée vers le cloud.');
    }catch(e){ say('❌ Échec de l’envoi.'); }
  });
  downloadBtn.addEventListener('click',async()=>{
    try{
      const {fsMod,db}=fb;
      const snap=await fsMod.getDoc(fsMod.doc(db,'saves',fb.auth.currentUser.uid));
      if(!snap.exists()){ say('Aucune sauvegarde cloud pour ce compte.'); return; }
      if(!confirm('Récupérer la sauvegarde du cloud va remplacer TOUTES tes données locales actuelles (solde, stats, historique, favoris, achievements, missions...). Continuer ?')) return;
      const ok=C.applySaveObject(snap.data().payload);
      if(ok) C.reloadAfterImport('✅ Sauvegarde récupérée — rechargement...');
      else say('❌ Sauvegarde cloud invalide ou corrompue.');
    }catch(e){ say('❌ Échec de la récupération.'); }
  });
  signoutBtn.addEventListener('click',async()=>{
    try{ if(fb) await fb.authMod.signOut(fb.auth); }catch(e){}
    try{ localStorage.removeItem(SESSION_FLAG); }catch(e){}
    showLoggedOut(); say('Déconnecté — ta progression reste locale sur cet appareil.');
  });

  // Restaure automatiquement une session déjà ouverte précédemment (Firebase Auth garde sa
  // propre persistance navigateur) : on ne charge le SDK que si on a une vraie raison de le
  // faire (un flag local dit qu'une connexion a déjà réussi ici), jamais pour un joueur qui
  // n'a jamais utilisé la connexion cloud.
  try{
    if(localStorage.getItem(SESSION_FLAG)==='1'){
      loadFirebase().then(({auth,authMod})=>{
        authMod.onAuthStateChanged(auth, user=>{
          if(user) afterSignIn();
          else { try{ localStorage.removeItem(SESSION_FLAG); }catch(e){} showLoggedOut(); }
        });
      });
    }
  }catch(e){}

  C.renderAccount();
})();
