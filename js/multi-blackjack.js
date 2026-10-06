/* ============================================================
   BLACKJACK MULTIJOUEUR — via la connexion du « Salon entre amis ».
   Mêmes règles que le Blackjack solo (C.bjRules, exposé tel quel par
   blackjack.js : aucune règle dupliquée) : une seule main par joueur
   (pas de split en multijoueur), tirer/rester/doubler, croupier tire
   sous 17. L'hôte gère le paquet et le croupier ; chaque joueur garde
   son propre solde (mise déduite à la validation, gain crédité à la
   fin) et sa manche est enregistrée via C.recordGame comme partout.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('view-blackjack')||!$('bj-multi')) return;
  const R=()=>C.bjRules, F=()=>C.friends;
  const soloBox=$('bj-solo'), multiBox=$('bj-multi');
  const seatsEl=$('bjm-seats'), dCardsEl=$('bjm-dCards'), dScoreEl=$('bjm-dScore'), msg=$('bjm-message');
  const mpEl=$('bjm-mp'), mpInfo=$('bjm-mpInfo'), fillEl=$('bjm-fill');
  const betBox=$('bjm-betBox'), betEl=$('bjm-betAmount'), betBtn=$('bjm-betBtn');
  const actionsEl=$('bjm-actions'), hitBtn=$('bjm-hit'), standBtn=$('bjm-stand'), doubleBtn=$('bjm-double');
  const dealBtn=$('bjm-dealBtn'), tableEl=multiBox.querySelector('.bj-table');
  const MIN_BET=5, MAX_BET=200, TURN_MS=45000;

  const AI_SEATS=[{name:'Léa',icon:'🦊',risky:false},{name:'Marco',icon:'🎩',risky:true}];
  let mode='ai', myBet=25, deck=[], dealer=[], seats=[], turn=-1, active=false, guestMode=false, guestInvested=0, view=null, turnTimer=null, handNo=0;
  // Distribution lente (C.paceDeal) côté hôte : `dealShown` = cartes déjà posées par place ({seats:[…], dealer}),
  // null le reste du temps. snapshotFor() n'envoie (à l'hôte comme aux amis) que les cartes déjà posées : la
  // donne est tirée d'un coup comme avant, seul l'affichage est étalé dans le temps.
  let dealShown=null, dealCtl=null;
  // Fin de manche étalée côté hôte (finishRound) : `endShown` = {dealer: cartes du croupier déjà posées, open: carte cachée
  // retournée ?} pendant que le croupier joue, null le reste du temps ; endCtl règle la manche tout de suite si on quitte la page.
  let endShown=null, endCtl=null;
  const instantDeal=(n,onCard,onDone)=>{ onDone(); return {skip(){},cancel(){}}; }; // repli si deal-anim.js manque : tout d'un coup

  function switchMode(m){
    if(m!=='ai'&&m!=='multi') return;
    mode=m;
    document.querySelectorAll('.mode-switch[data-mode-for="blackjack"] button').forEach(b=>b.classList.toggle('sel',b.dataset.mode===m));
    soloBox.style.display=m==='ai'?'':'none';
    multiBox.style.display=m==='multi'?'':'none';
    if(m==='multi') updateMp();
  }
  document.querySelectorAll('.mode-switch[data-mode-for="blackjack"] button').forEach(b=>b.addEventListener('click',()=>{ if(!active) switchMode(b.dataset.mode); }));

  function updateMp(){
    const role=F()&&F().role(), n=(role==='host')?F().peers().length:0;
    if(guestMode||role==='guest'){ mpInfo.textContent=guestMode?'🤝 Table de l’hôte — il distribue les mains.':'🤝 Connecté — l’hôte peut lancer une main.'; fillEl.parentNode.style.display='none'; dealBtn.style.display='none'; }
    else { mpInfo.textContent=n?'🤝 '+n+' ami'+(n>1?'s':'')+' à la table':'🤝 Ouvre un salon (« Salon entre amis ») et invite des amis.'; fillEl.parentNode.style.display=''; dealBtn.style.display=''; }
    dealBtn.disabled=active||C.state.balance<MIN_BET;
  }
  $('bjm-friendsBtn').addEventListener('click',()=>document.querySelector('[data-view="friends"]').click());
  $('bjm-betMinus').addEventListener('click',()=>{ myBet=Math.max(MIN_BET,myBet-5); betEl.textContent=myBet; });
  $('bjm-betPlus').addEventListener('click',()=>{ myBet=Math.min(MAX_BET,myBet+5); betEl.textContent=myBet; });
  betEl.textContent=myBet;

  // ---------- Hôte : table ----------
  function snapshotFor(viewerSeatIdx){
    const dl=dealShown?dealer.slice(0,dealShown.dealer):(endShown?dealer.slice(0,endShown.dealer):dealer.slice());
    const open=!active||!!(endShown&&endShown.open);
    return {
      handNo, active, dealer:dl, dealerScore:open?R().handScore(dl):(dl[0]?R().cardValue(dl[0]):''),
      revealDealer:open,
      seats:seats.map((s,i)=>({name:s.name,kind:s.kind,cards:dealShown?s.cards.slice(0,dealShown.seats[i]):s.cards,bet:s.bet,done:s.done,result:s.result,turn:active&&turn===i})),
      me:viewerSeatIdx, msg:msg.textContent
    };
  }
  function render(){
    // render() ne tourne que côté hôte/solo (l'invité reçoit un instantané tout fait) : mon
    // siège est toujours celui marqué kind==='me' dans le tableau local.
    const meIdx=seats.findIndex(s=>s.kind==='me');
    draw(snapshotFor(meIdx));
    seats.forEach((s,i)=>{ if(s.kind==='remote') F().sendPeer(s.peerId,Object.assign({t:'bj_state'},snapshotFor(i))); });
  }
  function draw(s){
    view=s;
    // Même retournement animé qu'en solo (blackjack.js) : carte déjà affichée → juste enlever
    // .is-back (transition CSS) ; quand le croupier tire ensuite, seule la nouvelle carte est ajoutée (le retournement
    // n'est pas coupé) ; sinon reconstruction normale, comme avant.
    const holeCardEl=dCardsEl.children[1]&&dCardsEl.children[1].querySelector('.card-flip.is-back'), haveD=dCardsEl.children.length;
    if(s.revealDealer&&holeCardEl&&haveD===s.dealer.length){
      holeCardEl.classList.remove('is-back');
      C.sound&&C.sound('card');
    } else if(s.revealDealer&&!holeCardEl&&haveD>=2&&haveD<s.dealer.length){
      for(let i=haveD;i<s.dealer.length;i++) dCardsEl.appendChild(C.renderCard(s.dealer[i],false,true));
    } else {
      dCardsEl.innerHTML=''; s.dealer.forEach((c,i)=>dCardsEl.appendChild(C.renderCard(c,i===1&&!s.revealDealer,true)));
    }
    dScoreEl.textContent=s.dealerScore;
    seatsEl.innerHTML='';
    s.seats.forEach((seat,i)=>{
      if(s.me===i) return; // affiché en bas, dans betBox/actions area
      // Tout ce qui vient de l'hôte (libellé, mise, classe) est neutralisé : ni HTML ni nombre douteux dans la page.
      const d=document.createElement('div'); d.className='hand-block'+(seat.turn?' active':'')+(seat.result&&seat.result.cls?' '+String(seat.result.cls).replace(/[^\w-]/g,''):'');
      const av=C.avatars?C.avatars.html(seat.kind==='ai'?seat.name:seat.name,22):'';
      const sBet=C.num(seat.bet);
      d.innerHTML='<div class="zone-label"><span>'+av+C.escapeHtml(seat.name)+'</span><span>'+(seat.cards.length?R().handScore(seat.cards):'')+'</span></div>'
        +'<div class="cards"></div><div class="hand-bet">'+(seat.result?C.escapeHtml(seat.result.label):(sBet>0?('Mise : '+sBet+' '+(C.chips?C.chips.html(sBet,{scale:.6,label:false}):'')):'En attente'))+'</div>';
      const row=d.querySelector('.cards'); seat.cards.forEach(c=>row.appendChild(C.renderCard(c,false)));
      seatsEl.appendChild(d);
    });
    // Mon propre siège (si j'en ai un) : rendu dans la zone dédiée en bas
    let mine=$('bjm-mySeat');
    if(!mine){ mine=document.createElement('div'); mine.id='bjm-mySeat'; mine.className='hand-block'; tableEl.appendChild(mine); }
    if(s.me>=0){
      const seat=s.seats[s.me]; mine.style.display='';
      const av=C.avatars?C.avatars.html('Toi',26):'';
      mine.className='hand-block'+(seat.turn?' active':'')+(seat.result&&seat.result.cls?' '+String(seat.result.cls).replace(/[^\w-]/g,''):'');
      const mBet=C.num(seat.bet);
      mine.innerHTML='<div class="zone-label"><span class="zl-me">'+av+'Toi</span><span>'+(seat.cards.length?R().handScore(seat.cards):'')+'</span></div>'
        +'<div class="cards"></div><div class="hand-bet">'+(seat.result?C.escapeHtml(seat.result.label):('Mise : '+mBet+' '+(C.chips?C.chips.html(mBet,{scale:.7,label:false}):'')))+'</div>';
      const row=mine.querySelector('.cards'); seat.cards.forEach(c=>row.appendChild(C.renderCard(c,false,true)));
    } else mine.style.display='none';
    msg.textContent=s.msg;
    betBox.style.display=(!s.active&&!guestMode)?'':'none';
    const canAct=s.active&&s.me>=0&&s.seats[s.me]&&s.seats[s.me].turn;
    actionsEl.style.display=canAct?'flex':'none';
    if(canAct){
      const seat=s.seats[s.me], first=seat.cards.length===2;
      doubleBtn.disabled=!(first&&C.state.balance>=seat.bet);
    }
    dealBtn.style.display=(!guestMode&&F()&&F().role()==='host')?'':'none';
    if(!guestMode) dealBtn.disabled=s.active||C.state.balance<MIN_BET;
  }

  function newRound(){
    if(active) return;
    handNo++;
    const peers=(F()&&F().role()==='host')?F().peers():[];
    const humanSeats=[{kind:'me',peerId:null,name:'Toi'}].concat(peers.map(p=>({kind:'remote',peerId:p.id,name:p.name,bet:0,cards:[],done:false,result:null})));
    // On ne connaît la mise des amis qu'après un aller-retour ; on démarre avec une table
    // « en attente de mise », l'hôte pouvant distribuer dès qu'au moins une mise est validée.
    seats=[{kind:'me',peerId:null,name:'Toi',bet:0,cards:[],done:false,result:null}].concat(peers.map(p=>({kind:'remote',peerId:p.id,name:p.name,bet:0,cards:[],done:false,result:null})));
    dealer=[]; active=false; turn=-1;
    msg.textContent='Valide ta mise'+(seats.length>1?', et attends les autres joueurs':'')+', puis distribue.';
    render();
  }
  function myCommit(){
    if(myBet>C.state.balance){ msg.textContent='Solde insuffisant.'; return; }
    if(guestMode){ F().sendHost({t:'bj_bet',bet:myBet}); return; }
    const me=seats.find(s=>s.kind==='me'); if(me) me.bet=myBet;
    render();
  }
  betBtn.addEventListener('click',myCommit);

  function startDeal(){
    if(active||!seats.length) return;
    const ready=seats.filter(s=>s.bet>0);
    if(!ready.length){ msg.textContent='Personne n’a encore validé de mise.'; return; }
    seats=ready.concat(fillEl.checked&&seats.length<=1?AI_SEATS.map(a=>({kind:'ai',name:a.name,icon:a.icon,risky:a.risky,bet:myBet||25,cards:[],done:false,result:null})):[]);
    ready.forEach(s=>{
      if(s.kind==='me'){ C.state.balance-=s.bet; C.trackWager(s.bet); C.saveBalance(); C.renderBalance(); }
      else if(s.kind==='remote'){ F().sendPeer(s.peerId,{t:'bj_chips',delta:-s.bet}); }
    });
    deck=C.newDeck();
    seats.forEach(s=>{ s.cards=[deck.pop(),deck.pop()]; s.done=false; s.result=null; });
    dealer=[deck.pop(),deck.pop()];
    active=true; turn=-1;
    // Le croupier distribue une carte à la fois : 1re carte à chaque joueur puis au croupier, puis la 2e carte
    // à chacun — ~1 s entre deux cartes ; le premier tour de jeu ne commence qu'à la fin.
    const order=[]; for(let r=0;r<2;r++){ seats.forEach((_,i)=>order.push(i)); order.push('dealer'); }
    dealShown={seats:seats.map(()=>0),dealer:0};
    if(C.forgetCards) C.forgetCards(tableEl);
    tableEl.classList.add('dealing');
    msg.textContent='Distribution des cartes…';
    render();
    const ctl=(C.paceDeal||instantDeal)(order.length,k=>{
      const who=order[k]; if(who==='dealer') dealShown.dealer++; else dealShown.seats[who]++;
      render();
    },()=>{
      dealShown=null; dealCtl=null; tableEl.classList.remove('dealing');
      msg.textContent='La main commence.';
      render();
      setTimeout(advanceTurn,500);
    });
    dealCtl=dealShown?ctl:null; // déjà revenu à null si la donne s'est faite d'un coup (mouvement réduit)
  }
  dealBtn.addEventListener('click',startDeal);
  // Pendant la distribution lente (ou le jeu du croupier), l'hôte peut l'accélérer d'un clic sur la table.
  tableEl.addEventListener('click',()=>{ const ctl=dealCtl||endCtl; if(ctl) ctl.skip(); });
  if(C.onPageLeave) C.onPageLeave(()=>{ if(endCtl) endCtl.skip(); }); // mises déjà prises : le résultat se règle avant de quitter

  function advanceTurn(){
    clearTimeout(turnTimer);
    let idx=-1;
    for(let i=turn+1;i<seats.length;i++){ if(!seats[i].done){ idx=i; break; } }
    if(idx<0) return finishRound();
    turn=idx; const s=seats[idx];
    if(s.kind==='ai'){
      setTimeout(()=>{
        while(!s.done&&R().aiShouldHit(s.cards,dealer[0],s.risky)){ s.cards.push(deck.pop()); C.sound&&C.sound('card'); }
        s.done=true; render(); advanceTurn();
      },600+Math.random()*500);
      return;
    }
    render();
    if(s.kind==='remote'){ turnTimer=setTimeout(()=>{ if(active&&turn===idx){ s.done=true; s.result=null; render(); advanceTurn(); } },TURN_MS); }
  }
  function myAction(type){
    if(guestMode){ if(view&&view.me>=0&&view.seats[view.me]&&view.seats[view.me].turn) F().sendHost({t:'bj_act',type}); return; }
    if(!active) return; const s=seats[turn]; if(!s||s.kind!=='me') return;
    doAction(s,type);
  }
  function doAction(s,type){
    clearTimeout(turnTimer);
    if(type==='hit'){ s.cards.push(deck.pop()); C.sound&&C.sound('card'); if(R().handScore(s.cards)>=21) s.done=true; }
    else if(type==='stand'){ s.done=true; }
    else if(type==='double'&&s.cards.length===2){
      const cost=s.bet;
      if(s.kind==='me'){ if(C.state.balance<cost) return; C.state.balance-=cost; C.trackWager(cost); C.saveBalance(); C.renderBalance(); }
      else if(s.kind==='remote') F().sendPeer(s.peerId,{t:'bj_chips',delta:-cost});
      s.bet*=2; s.doubled=true; s.cards.push(deck.pop()); s.done=true; C.sound&&C.sound('card');
    }
    if(s.done) advanceTurn(); else render();
  }
  hitBtn.addEventListener('click',()=>myAction('hit'));
  standBtn.addEventListener('click',()=>myAction('stand'));
  doubleBtn.addEventListener('click',()=>myAction('double'));

  function finishRound(){
    const anyAlive=seats.some(s=>R().handScore(s.cards)<=21);
    if(anyAlive){ while(R().dealerShouldHit(dealer)) dealer.push(deck.pop()); }
    if(dealer.length===2||!C.paceDeal){ settleRound(); return; } // le croupier ne tire pas : retournement de la carte cachée, résultat tout de suite
    // Le croupier joue : retourne sa carte cachée puis tire, une carte à la fois (un peu plus vif que la donne, comme en solo).
    // Les tirages sont déjà faits ; les amis suivent les instantanés envoyés à chaque étape. Le résultat n'est réglé qu'à la fin.
    turn=-1; endShown={dealer:2,open:false};
    const seq=['hole']; for(let n=2;n<dealer.length;n++) seq.push('dealer');
    tableEl.classList.add('dealing');
    msg.textContent='Le croupier joue…'; render();
    const gap=C.DEAL_STEP_MS>0?Math.max(350,Math.round(C.DEAL_STEP_MS*0.6)):0;
    let atOnce=true; // vrai tant que paceDeal n'est pas revenu : onDone appelé dans ce laps de temps = tout s'est fait d'un coup
    const ctl=C.paceDeal(seq.length,k=>{
      if(seq[k]==='hole') endShown.open=true; else endShown.dealer++;
      render();
    },()=>{
      endShown=null; endCtl=null; tableEl.classList.remove('dealing');
      if(atOnce&&C.sound) C.sound('card'); // vitesse « Instantanée » / mouvement réduit : un seul bruit de cartes
      settleRound();
    },{gap,lead:450});
    atOnce=false;
    endCtl=endShown?ctl:null; // `endShown` est déjà revenu à null si tout s'est fait d'un coup
  }
  function settleRound(){
    active=false; turn=-1;
    const msgs=[];
    seats.forEach(s=>{
      const res=R().payoutFor(s.cards,dealer,s.bet,!!s.doubled);
      s.result=res; msgs.push((s.kind==='me'?'Toi':s.name)+' : '+res.label);
      if(s.kind==='me'){ C.state.balance+=res.win; C.recordGame('blackjack',s.bet,res.win); if(res.win>s.bet) C.flashWin(msg); else if(res.win===0) C.flashLoss(tableEl); }
      else if(s.kind==='remote') F().sendPeer(s.peerId,{t:'bj_end',total:s.bet,won:res.win,label:res.label});
    });
    C.saveBalance(); C.renderBalance();
    msg.textContent=msgs.join(' · ');
    render();
    setTimeout(()=>{ if(!active) newRound(); },2600);
  }

  // ---------- Réseau ----------
  function guestReset(text){
    if(guestInvested>0){ C.state.balance+=guestInvested; C.saveBalance(); C.renderBalance(); text=(text||'')+' Ta mise en attente t’a été rendue.'; }
    guestInvested=0; guestMode=false; view=null; seats=[]; dealer=[]; active=false;
    msg.textContent=text||'Valide ta mise, puis l\'hôte distribue.'; updateMp(); render();
  }
  if(F()){
    F().onMsg((m,id)=>{
      if(!m.t||m.t.indexOf('bj_')!==0) return;
      if(m.t==='bj_bet'&&mode==='multi'&&F().role()==='host'){
        const s=seats.find(x=>x.kind==='remote'&&x.peerId===id); const b=parseInt(m.bet,10);
        if(s&&!active&&b>=MIN_BET&&b<=MAX_BET) s.bet=b; render();
      } else if(m.t==='bj_act'&&F().role()==='host'){
        const idx=seats.findIndex(x=>x.kind==='remote'&&x.peerId===id);
        if(idx>=0&&active&&turn===idx&&['hit','stand','double'].includes(m.type)) doAction(seats[idx],m.type);
      } else if(m.t==='bj_state'){
        guestMode=true; switchMode('multi');
        if(!$('view-blackjack').classList.contains('active')){ const nav=document.querySelector('[data-view="blackjack"]'); if(nav) nav.click(); }
        draw(m);
      } else if(m.t==='bj_chips'){
        const d=parseInt(m.delta,10)||0; C.state.balance+=d; if(d<0){ C.trackWager(-d); guestInvested+=-d; } C.saveBalance(); C.renderBalance();
      } else if(m.t==='bj_end'){
        const total=parseInt(m.total,10)||0, won=parseInt(m.won,10)||0;
        C.state.balance+=won; C.saveBalance(); C.renderBalance(); guestInvested=0;
        C.recordGame('blackjack',total,won);
        if(won>total) C.flashWin(msg); else if(won===0) C.flashLoss(tableEl);
      }
    });
    F().onPeerLeft(id=>{
      const idx=seats.findIndex&&seats.findIndex(s=>s.kind==='remote'&&s.peerId===id);
      if(idx==null||idx<0) return;
      if(active&&!seats[idx].done){ seats[idx].done=true; if(turn===idx) advanceTurn(); }
      else seats.splice(idx,1);
      render();
    });
    F().onLeave(()=>{ if(guestMode) guestReset('Tu as quitté le salon.'); });
  }
  document.addEventListener('friends-changed',()=>{ if(mode==='multi'&&!guestMode) updateMp(); });
  document.addEventListener('avatar-changed',()=>{ if(seats.length) render(); });

  newRound(); switchMode('ai');
})();
