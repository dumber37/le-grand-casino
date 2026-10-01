/* ============================================================
   SALON ENTRE AMIS — Baccarat multijoueur en direct, sans serveur.
   Connexion directe navigateur ↔ navigateur (WebRTC) : l'hôte crée un
   salon et invite chaque ami en échangeant deux codes à copier-coller
   (invitation → réponse). L'hôte tire les cartes avec la MÊME logique
   que le Baccarat solo (C.baccarat.deal / payout), et chacun garde son
   propre solde local : la mise est mise de côté à la validation, le gain
   est crédité au résultat, et la manche est enregistrée via C.recordGame
   comme toutes les autres. Jetons 100% fictifs.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('view-friends')) return;
  const MAX_FRIENDS=4, SIDES={player:'Player',banker:'Banker',tie:'Tie'};
  const myName=(function(){ try{ return localStorage.getItem('grand-casino-pseudo')||'Joueur'; }catch(e){ return 'Joueur'; } })();

  let role=null, peers=[], pending=null, hostConn=null, nextId=1, myId=0;
  // Passerelle pour d'autres jeux (poker) : ils réutilisent CETTE connexion via C.friends (voir fin du fichier).
  const msgHandlers=[], peerLeftHandlers=[], leaveHandlers=[];
  const notifyChange=()=>document.dispatchEvent(new Event('friends-changed'));
  let mySide=null, myBet=25, escrow=0, roster=[];

  const msgEl=$('fr-message');
  const say=t=>{ msgEl.textContent=t; };
  const supported=typeof RTCPeerConnection!=='undefined';

  // ---------- Codes d'échange ----------
  const enc=d=>'GC1:'+btoa(unescape(encodeURIComponent(JSON.stringify({type:d.type,sdp:d.sdp}))));
  const dec=s=>{ s=(s||'').trim(); if(s.indexOf('GC1:')!==0) throw new Error('code'); return JSON.parse(decodeURIComponent(escape(atob(s.slice(4))))); };
  const newPc=()=>new RTCPeerConnection({iceServers:$('fr-stun').checked?[{urls:'stun:stun.l.google.com:19302'}]:[]});
  const gathered=pc=>new Promise(res=>{
    if(pc.iceGatheringState==='complete') return res();
    const t=setTimeout(res,6000);
    pc.addEventListener('icegatheringstatechange',()=>{ if(pc.iceGatheringState==='complete'){ clearTimeout(t); res(); } });
  });
  const sendTo=(dc,obj)=>{ try{ if(dc&&dc.readyState==='open') dc.send(JSON.stringify(obj)); }catch(e){} };

  // ---------- Mise de côté (escrow) : même solde partagé, jamais négatif ----------
  function refund(){ if(escrow>0){ C.state.balance+=escrow; C.saveBalance(); C.renderBalance(); escrow=0; } }
  function commit(){
    if(!mySide){ say('Choisis Player, Banker ou Tie.'); return false; }
    refund();
    if(C.state.balance<myBet){ say('Solde insuffisant.'); syncMine(); return false; }
    C.state.balance-=myBet; C.trackWager(myBet); C.saveBalance(); C.renderBalance(); escrow=myBet;
    syncMine(); say('Mise validée : '+SIDES[mySide]+' — '+myBet+'.'); return true;
  }
  function syncMine(){
    if(role==='host'){ broadcastRoster(); }
    else if(hostConn){ sendTo(hostConn.dc,{t:'bet',side:escrow>0?mySide:null,bet:escrow}); }
    renderPlayers(role==='host'?buildRoster():roster);
  }

  // ---------- Liste des joueurs ----------
  const myAv=()=>C.avatars?C.avatars.myTraits():null;
  const buildRoster=()=>[{id:0,name:myName,side:escrow>0?mySide:null,bet:escrow,av:myAv()}].concat(peers.map(p=>({id:p.id,name:p.name,side:p.side,bet:p.bet,av:p.av||null})));
  function broadcastRoster(){ const r=buildRoster(); roster=r; peers.forEach(p=>sendTo(p.dc,{t:'roster',players:r})); renderPlayers(r); }
  let lastResults=null;
  function renderPlayers(list,results){
    // Le détail de la dernière manche reste affiché jusqu'à ce que quelqu'un mise à nouveau.
    if(results) lastResults=results;
    else if(list.some(p=>p.bet>0)) lastResults=null;
    else results=lastResults;
    const box=$('fr-players'); box.innerHTML='';
    list.forEach(p=>{
      const row=document.createElement('div'); row.className='fr-player';
      const me=(role==='host'?p.id===0:p.id===myId);
      let right=p.bet>0&&p.side?SIDES[p.side]+' · '+p.bet:'n’a pas encore misé';
      if(results){ const r=results.find(x=>x.id===p.id); if(r&&r.bet>0){ const net=r.win-r.bet; right=SIDES[r.side]+' · '+r.bet+' → '+(net>0?'+'+net:(net<0?String(net):'0')); if(net!==0) row.classList.add(net>0?'fr-win':'fr-loss'); } }
      const avHtml=C.avatars?(me?C.avatars.html('Toi',26):(C.avatars.htmlTraits(p.av,26)||C.avatars.html(p.name,26))):(me?'⭐ ':'🙂 ');
      row.innerHTML='<span>'+avHtml+escapeHtml(p.name)+(me?' (toi)':'')+(p.id===0?' (hôte)':'')+'</span><span>'+right+'</span>';
      box.appendChild(row);
    });
  }
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---------- Manche (hôte) ----------
  function deal(){
    if(role!=='host') return;
    const list=buildRoster();
    if(!list.some(p=>p.bet>0&&p.side)){ say('Personne n’a encore validé de mise.'); return; }
    const res=C.baccarat.deal();
    const players=list.map(p=>({id:p.id,name:p.name,side:p.side,bet:p.bet,win:(p.bet>0&&p.side)?C.baccarat.payout(p.side,p.bet,res.outcome):0}));
    const msg={t:'result',banker:res.banker,player:res.player,pTotal:res.pTotal,bTotal:res.bTotal,outcome:res.outcome,players};
    peers.forEach(p=>{ sendTo(p.dc,msg); p.side=null; p.bet=0; });
    applyResult(msg);
  }
  function applyResult(m){
    const bc=$('fr-bankerCards'), pc=$('fr-playerCards');
    bc.innerHTML=''; m.banker.forEach(c=>bc.appendChild(C.renderCard(c,false)));
    pc.innerHTML=''; m.player.forEach(c=>pc.appendChild(C.renderCard(c,false)));
    $('fr-bankerScore').textContent=m.bTotal; $('fr-playerScore').textContent=m.pTotal;
    const bz=bc.closest('.zone'), pz=pc.closest('.zone');
    bz.classList.remove('zone-win'); pz.classList.remove('zone-win');
    if(m.outcome==='banker') bz.classList.add('zone-win'); else if(m.outcome==='player') pz.classList.add('zone-win');
    C.sound&&C.sound('card');
    renderPlayers(m.players,m.players);
    const meId=role==='host'?0:myId, mine=m.players.find(p=>p.id===meId);
    say((m.outcome==='tie'?'Égalité':SIDES[m.outcome]+' gagne')+' ('+m.pTotal+' – '+m.bTotal+').');
    if(escrow>0&&(!mine||mine.bet!==escrow)){
      // Ma mise est arrivée chez l'hôte APRÈS la distribution : elle n'a pas été comptée, on me la rend.
      refund();
      if(role==='guest'&&hostConn) sendTo(hostConn.dc,{t:'bet',side:null,bet:0});
      say(msgEl.textContent+' Ta mise est arrivée trop tard pour cette manche : elle t’a été rendue.');
    } else if(escrow>0){
      const stake=escrow, win=mine?mine.win:0; escrow=0;
      C.state.balance+=win; C.saveBalance(); C.renderBalance();
      say(msgEl.textContent+(win>0?' Tu gagnes +'+win+' jetons !':' Perdu.'));
      C.recordGame('baccarat',stake,win);
      if(win>0) C.flashWin(msgEl); else C.flashLoss($('fr-table'));
    }
    mySide=null; syncSides();
    if(role==='host') broadcastRoster();
  }

  // ---------- Hôte : invitations ----------
  function setupHostMessages(entry){
    // Reconnexion automatique pour un ami DÉJÀ connecté (pas juste pendant la poignée de main
    // initiale, déjà couverte dans invite()) : un creux réseau en pleine partie tente un ICE
    // restart avant de considérer l'ami parti (dc.onclose, juste en dessous, gère ce cas final).
    entry.pc.addEventListener('connectionstatechange',()=>{
      if(entry.pc.connectionState==='disconnected'){
        setTimeout(()=>{ if(entry.pc.connectionState==='disconnected'&&entry.pc.restartIce) entry.pc.restartIce(); },5000);
      }
    });
    entry.dc.onmessage=e=>{
      let m; try{ m=JSON.parse(e.data); }catch(x){ return; }
      if(m.t==='hello'){
        if(entry.peer||peers.length>=MAX_FRIENDS) return;
        const peer={id:nextId++,name:String(m.name||'Ami').slice(0,20),pc:entry.pc,dc:entry.dc,side:null,bet:0,av:C.avatars?C.avatars.clean(m.av):null};
        entry.peer=peer; peers.push(peer); if(pending===entry) pending=null;
        sendTo(peer.dc,{t:'welcome',id:peer.id}); broadcastRoster();
        say(peer.name+' a rejoint le salon.'); updateHostUi();
      } else if(m.t==='av'&&entry.peer){
        entry.peer.av=C.avatars?C.avatars.clean(m.av):null; broadcastRoster();
      } else if(m.t==='bet'&&entry.peer){
        const p=entry.peer, b=parseInt(m.bet,10);
        if(SIDES[m.side]&&b>0&&b<=500){ p.side=m.side; p.bet=b; } else { p.side=null; p.bet=0; }
        broadcastRoster();
      } else if(entry.peer&&typeof m.t==='string'&&/^(pk|bj|bs|cr)_/.test(m.t)){
        msgHandlers.forEach(f=>{ try{ f(m,entry.peer.id); }catch(x){} });
      }
    };
    entry.dc.onclose=()=>{
      if(entry.peer){
        const gone=entry.peer;
        peers=peers.filter(p=>p!==gone); say(gone.name+' a quitté le salon.'); broadcastRoster(); updateHostUi();
        peerLeftHandlers.forEach(f=>{ try{ f(gone.id); }catch(x){} });
      }
      if(pending===entry) pending=null;
    };
  }
  async function invite(){
    if(!supported){ say('Ton navigateur ne gère pas WebRTC.'); return; }
    if(peers.length>=MAX_FRIENDS){ say('Salon complet ('+MAX_FRIENDS+' amis maximum).'); return; }
    if(pending){ try{ pending.pc.close(); }catch(e){} pending=null; }
    const pc=newPc(), dc=pc.createDataChannel('gc'), entry={pc,dc,peer:null};
    pending=entry; setupHostMessages(entry);
    // Si la connexion n'aboutit jamais (réseau, pare-feu...), connectionState finit par passer
    // à 'failed' — sans ça, le message resterait bloqué sur « Connexion en cours... » pour
    // toujours, sans aucun moyen de savoir que ça a échoué. On ne réagit qu'à 'failed' (jamais
    // à 'disconnected', souvent transitoire et qui peut se rétablir tout seul), et seulement si
    // cette invitation est toujours celle en attente (un ami a peut-être déjà rejoint entre-temps).
    pc.addEventListener('connectionstatechange',()=>{
      if(pc.connectionState==='disconnected'){
        // Reconnexion automatique sur un creux réseau passager (bascule wifi, mise en veille
        // courte...) : ICE restart sur la MÊME connexion après quelques secondes si ça ne s'est
        // pas rétabli tout seul — jamais besoin de redemander un code. Ne fonctionne que si
        // l'autre côté est toujours joignable quelque part sur le réseau ; sinon la connexion
        // finit par passer à 'failed', géré juste en dessous comme avant.
        setTimeout(()=>{ if(pc.connectionState==='disconnected'&&pc.restartIce) pc.restartIce(); },5000);
      } else if(pending===entry&&pc.connectionState==='failed'){
        pending=null;
        say('La connexion a échoué. Génère une nouvelle invitation et réessaie — vérifiez que la case « Jouer via Internet » est cochée des deux côtés, ou que vous êtes bien sur le même réseau si elle est décochée.');
      }
    });
    say('Préparation de l’invitation...');
    const off=await pc.createOffer(); await pc.setLocalDescription(off); await gathered(pc);
    $('fr-offer').value=enc(pc.localDescription); $('fr-answerIn').value='';
    $('fr-inviteBox').style.display='block';
    say('Envoie le code d’invitation à ton ami, puis colle sa réponse ci-dessous.');
  }
  async function acceptAnswer(){
    if(!pending) return say('Génère d’abord une invitation.');
    try{ await pending.pc.setRemoteDescription(dec($('fr-answerIn').value)); say('Connexion en cours...'); }
    catch(e){ say('Code de réponse invalide.'); }
  }

  // ---------- Invité ----------
  async function joinGenerate(){
    if(!supported){ say('Ton navigateur ne gère pas WebRTC.'); return; }
    let off; try{ off=dec($('fr-offerIn').value); }catch(e){ say('Code d’invitation invalide.'); return; }
    const pc=newPc();
    // Même filet de sécurité côté invité : sans lui, une connexion qui échoue laisse le message
    // bloqué sur « ... attends la connexion » indéfiniment. Ignoré une fois réellement connecté
    // (role==='guest') : une coupure après coup est déjà gérée par onHostLost (fermeture du canal).
    pc.addEventListener('connectionstatechange',()=>{
      if(pc.connectionState==='disconnected'){
        // Même reconnexion automatique que côté hôte, y compris APRÈS être pleinement connecté
        // (contrairement à la branche 'failed' ci-dessous, pas de garde sur role : un creux
        // réseau en pleine partie doit aussi déclencher une tentative de reconnexion).
        setTimeout(()=>{ if(pc.connectionState==='disconnected'&&pc.restartIce) pc.restartIce(); },5000);
      } else if(role!=='guest'&&pc.connectionState==='failed'){
        say('La connexion a échoué. Redemande un nouveau code d’invitation à ton hôte et réessaie — vérifiez que la case « Jouer via Internet » est cochée des deux côtés, ou que vous êtes bien sur le même réseau si elle est décochée.');
      }
    });
    pc.ondatachannel=ev=>{
      const dc=ev.channel; hostConn={pc,dc};
      dc.onopen=()=>sendTo(dc,{t:'hello',name:myName,av:myAv()});
      dc.onmessage=onGuestMessage;
      dc.onclose=onHostLost;
    };
    try{
      await pc.setRemoteDescription(off);
      const ans=await pc.createAnswer(); await pc.setLocalDescription(ans); await gathered(pc);
    }catch(e){ say('Impossible de traiter ce code.'); return; }
    $('fr-answer').value=enc(pc.localDescription); $('fr-answerBox').style.display='block';
    say('Envoie ce code de réponse à l’hôte, puis attends la connexion.');
  }
  function onGuestMessage(e){
    let m; try{ m=JSON.parse(e.data); }catch(x){ return; }
    if(m.t==='welcome'){ myId=m.id; role='guest'; showTable(); say('Connecté au salon de l’hôte !'); notifyChange(); }
    else if(m.t==='roster'){ roster=m.players; renderPlayers(roster); }
    else if(m.t==='result'){ applyResult(m); }
    else if(typeof m.t==='string'&&/^(pk|bj|bs|cr)_/.test(m.t)){ msgHandlers.forEach(f=>{ try{ f(m,null); }catch(x){} }); }
  }
  function onHostLost(){
    if(role!=='guest') return;
    refund(); leave(true); say('L’hôte a quitté le salon — ta mise en attente t’a été rendue.');
  }

  // ---------- Interface ----------
  function showTable(){
    $('fr-setup').style.display='none'; $('fr-table').style.display='block';
    $('fr-dealBtn').style.display=role==='host'?'block':'none';
    $('fr-hostBox').style.display=role==='host'?'block':'none';
    updateHostUi(); syncSides(); renderPlayers(role==='host'?buildRoster():roster);
  }
  function updateHostUi(){ if(role==='host') $('fr-count').textContent=peers.length+' / '+MAX_FRIENDS+' amis connectés'; notifyChange(); }
  function syncSides(){ $('fr-sides').querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.dataset.side===mySide)); $('fr-betAmount').textContent=myBet; }
  function leave(silent){
    refund();
    leaveHandlers.forEach(f=>{ try{ f(); }catch(x){} });
    peers.forEach(p=>{ try{ p.pc.close(); }catch(e){} }); peers=[];
    if(pending){ try{ pending.pc.close(); }catch(e){} pending=null; }
    if(hostConn){ try{ hostConn.pc.close(); }catch(e){} hostConn=null; }
    role=null; roster=[]; mySide=null; nextId=1; myId=0; lastResults=null;
    ['fr-offer','fr-answerIn','fr-offerIn','fr-answer'].forEach(id=>$(id).value='');
    ['fr-inviteBox','fr-answerBox','fr-hostBox','fr-guestBox'].forEach(id=>$(id).style.display='none');
    ['fr-bankerCards','fr-playerCards'].forEach(id=>$(id).innerHTML=''); ['fr-bankerScore','fr-playerScore'].forEach(id=>$(id).textContent='');
    $('fr-table').style.display='none'; $('fr-setup').style.display='block';
    if(!silent) say('Salon fermé.');
    notifyChange();
  }

  // ---------- API partagée avec les autres jeux (le poker multijoueur l'utilise) ----------
  C.friends={
    role:()=>role,
    name:()=>myName,
    peers:()=>peers.map(p=>({id:p.id,name:p.name,av:p.av||null})),
    sendPeer:(id,obj)=>{ const p=peers.find(x=>x.id===id); if(p) sendTo(p.dc,obj); },
    sendHost:obj=>{ if(hostConn) sendTo(hostConn.dc,obj); },
    onMsg:f=>msgHandlers.push(f),
    onPeerLeft:f=>peerLeftHandlers.push(f),
    onLeave:f=>leaveHandlers.push(f)
  };

  $('fr-createBtn').addEventListener('click',()=>{ if(!supported) return say('Ton navigateur ne gère pas WebRTC.'); role='host'; showTable(); say('Salon créé — invite tes amis avec le bouton ci-dessous.'); });
  $('fr-joinBtn').addEventListener('click',()=>{ $('fr-guestBox').style.display='block'; say('Colle le code d’invitation reçu de l’hôte.'); });
  $('fr-inviteBtn').addEventListener('click',invite);
  $('fr-connectBtn').addEventListener('click',acceptAnswer);
  $('fr-genAnswerBtn').addEventListener('click',joinGenerate);
  $('fr-sides').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ mySide=b.dataset.side; syncSides(); }));
  $('fr-betMinus').addEventListener('click',()=>{ myBet=Math.max(5,myBet-5); syncSides(); });
  $('fr-betPlus').addEventListener('click',()=>{ myBet=Math.min(200,myBet+5); syncSides(); });
  $('fr-betBtn').addEventListener('click',commit);
  $('fr-dealBtn').addEventListener('click',deal);
  $('fr-leaveBtn').addEventListener('click',()=>leave(false));
  document.querySelectorAll('#view-friends [data-copy]').forEach(b=>b.addEventListener('click',()=>{
    const ta=$(b.dataset.copy); ta.select();
    (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(ta.value):Promise.reject()).then(()=>say('Code copié !'),()=>{ try{ document.execCommand('copy'); say('Code copié !'); }catch(e){} });
  }));
  // Si je change d'avatar pendant que je suis dans un salon, les autres joueurs le voient.
  document.addEventListener('avatar-changed',()=>{
    if(role==='host') broadcastRoster();
    else if(role==='guest'&&hostConn) sendTo(hostConn.dc,{t:'av',av:myAv()});
    else renderPlayers(roster);
  });
  if(!supported) say('Ton navigateur ne gère pas WebRTC : le salon entre amis est indisponible.');

  // ---------- Lien d'invitation cliquable + QR code ----------
  // Même code GC1:... qu'avant, juste encodé dans l'URL (#join=.../#answer=...) pour qu'un clic
  // suffise au lieu d'un copier-coller manuel. Le QR encode ce MÊME lien (pas le code brut) :
  // n'importe quel appareil photo de téléphone reconnaît une URL et propose de l'ouvrir — pas
  // besoin d'un scanner dédié dans l'app.
  function joinLink(param,code){ return location.origin+location.pathname+'#'+param+'='+encodeURIComponent(code); }
  function copyText(text){
    return (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(text):Promise.reject()).then(
      ()=>say('Lien copié !'),
      ()=>{
        const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); say('Lien copié !'); }catch(e){}
        ta.remove();
      }
    );
  }
  function toggleQr(btn,qrEl,param,codeEl){
    if(qrEl.style.display!=='none'){ qrEl.style.display='none'; btn.textContent='Afficher le QR code'; return; }
    const link=joinLink(param,codeEl.value);
    const svg=C.makeQrSvg?C.makeQrSvg(link,4,8):null;
    qrEl.innerHTML=svg||'<p style="color:#900;font-size:.76rem;margin:0">Code trop long pour un QR cette fois — utilise le lien ou le code à copier.</p>';
    qrEl.style.display='block'; btn.textContent='Masquer le QR code';
  }
  $('fr-offerLinkBtn').addEventListener('click',()=>copyText(joinLink('join',$('fr-offer').value)));
  $('fr-answerLinkBtn').addEventListener('click',()=>copyText(joinLink('answer',$('fr-answer').value)));
  $('fr-offerQrBtn').addEventListener('click',()=>toggleQr($('fr-offerQrBtn'),$('fr-offerQr'),'join',$('fr-offer')));
  $('fr-answerQrBtn').addEventListener('click',()=>toggleQr($('fr-answerQrBtn'),$('fr-answerQr'),'answer',$('fr-answer')));

  // Détecte #join=/#answer= dans l'URL : au clic sur un lien reçu, pré-remplit le bon champ au
  // lieu d'un copier-coller. Un changement de hash seul ne recharge jamais la page (navigation
  // interne standard) : l'hôte garde sa connexion WebRTC en mémoire même en cliquant un lien de
  // réponse reçu pendant qu'il attend déjà — c'est justement ce qui permet au second lien (la
  // réponse) de fonctionner sans tout recommencer.
  function handleShareHash(){
    const h=location.hash;
    if(h.indexOf('#join=')===0){
      let code; try{ code=decodeURIComponent(h.slice(6)); }catch(e){ return; }
      const navBtn=document.querySelector('[data-view="friends"]'); if(navBtn) navBtn.click();
      const joinBtn=$('fr-joinBtn'); if(joinBtn&&$('fr-guestBox').style.display==='none') joinBtn.click();
      $('fr-offerIn').value=code;
      say('Code d’invitation reçu — clique sur « Générer ma réponse ».');
    } else if(h.indexOf('#answer=')===0){
      let code; try{ code=decodeURIComponent(h.slice(8)); }catch(e){ return; }
      if(pending){ $('fr-answerIn').value=code; say('Réponse de ton ami reçue — clique sur « Connecter ».'); }
    }
  }
  window.addEventListener('hashchange',handleShareHash);
  handleShareHash();
})();
