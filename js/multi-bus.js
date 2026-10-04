/* ============================================================
   RIDE THE BUS MULTIJOUEUR — via la connexion du « Salon entre amis ».
   Mêmes règles que le solo (C.busRules, exposé tel quel par bus.js :
   aucune règle dupliquée) : rouge/noir, plus haut/plus bas, entre/en
   dehors, la bonne couleur exacte, mêmes multiplicateurs. L'hôte gère
   le paquet ; chaque joueur avance à son propre rythme dans SA propre
   main (pioche commune côté hôte mais trajet indépendant), encaisse
   ou tente le coup suivant. Solde et historique comme partout.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('view-bus')||!$('bus-multi')) return;
  const R=()=>C.busRules, F=()=>C.friends;
  const soloBox=$('bus-solo'), multiBox=$('bus-multi');
  const cardsEl=$('bsm-cards'), stageEl=$('bsm-stage'), multEl=$('bsm-mult'), msg=$('bsm-message');
  const seatsEl=$('bsm-seats'), mpInfo=$('bsm-mpInfo'), fillEl=$('bsm-fill');
  const betBox=$('bsm-betBox'), betEl=$('bsm-betAmount'), betBtn=$('bsm-betBtn'), actionsEl=$('bsm-actions'), dealBtn=$('bsm-dealBtn');
  const MIN_BET=5, MAX_BET=100, TURN_MS=30000;
  const RIVALS=[{name:'Léa',icon:'🦊',stop:2},{name:'Victor',icon:'🐺',stop:3},{name:'Marco',icon:'🎩',stop:4}];
  const STAGE_TXT=['Rouge ou noir ?','Plus haute ou plus basse ?','Entre ou en dehors ?','Quel symbole exact ?'];

  let mode='ai', myBet=15, deck=[], seats=[], guestMode=false, guestInvested=0, view=null, turnTimers={}, handNo=0, roundActive=false;

  function switchMode(m){
    if(m!=='ai'&&m!=='multi') return;
    mode=m;
    document.querySelectorAll('.mode-switch[data-mode-for="bus"] button').forEach(b=>b.classList.toggle('sel',b.dataset.mode===m));
    soloBox.style.display=m==='ai'?'':'none';
    multiBox.style.display=m==='multi'?'':'none';
    if(m==='multi') updateMp();
  }
  document.querySelectorAll('.mode-switch[data-mode-for="bus"] button').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode)));
  function updateMp(){
    const role=F()&&F().role(), n=(role==='host')?F().peers().length:0;
    if(guestMode||role==='guest'){ mpInfo.textContent=guestMode?'🤝 Table de l’hôte.':'🤝 Connecté — l’hôte peut lancer une manche.'; fillEl.parentNode.style.display='none'; dealBtn.style.display='none'; }
    else { mpInfo.textContent=n?'🤝 '+n+' ami'+(n>1?'s':'')+' à la table':'🤝 Ouvre un salon (« Salon entre amis ») et invite des amis.'; fillEl.parentNode.style.display=''; dealBtn.style.display=''; }
    dealBtn.disabled=C.state.balance<MIN_BET;
  }
  $('bsm-friendsBtn').addEventListener('click',()=>document.querySelector('[data-view="friends"]').click());
  $('bsm-betMinus').addEventListener('click',()=>{ myBet=Math.max(MIN_BET,myBet-5); betEl.textContent=myBet; });
  $('bsm-betPlus').addEventListener('click',()=>{ myBet=Math.min(MAX_BET,myBet+5); betEl.textContent=myBet; });
  betEl.textContent=myBet;

  function resetSeat(s){ s.stage=0; s.cards=[]; s.done=false; s.mult=0; s.busted=false; }
  function newRound(){
    handNo++; roundActive=false;
    const peers=(F()&&F().role()==='host')?F().peers():[];
    const humans=[{kind:'me',peerId:null,name:'Toi'}].concat(peers.map(p=>({kind:'remote',peerId:p.id,name:p.name})));
    seats=humans.map(h=>Object.assign({bet:0},h)); seats.forEach(resetSeat);
    deck=C.newDeck();
    msg.textContent='Valide ta mise, puis '+(seats.length>1?'attends les autres.':'monte dans le bus.');
    render();
  }
  function myCommit(){
    if(myBet>C.state.balance){ msg.textContent='Solde insuffisant.'; return; }
    if(guestMode){ F().sendHost({t:'bs_bet',bet:myBet}); return; }
    const me=seats.find(s=>s.kind==='me'); if(me) me.bet=myBet; render();
  }
  betBtn.addEventListener('click',myCommit);

  function startRound(){
    const ready=seats.filter(s=>s.bet>0);
    if(!ready.length){ msg.textContent='Personne n’a encore validé de mise.'; return; }
    seats=ready.concat(fillEl.checked?RIVALS.map(rv=>Object.assign({kind:'ai',peerId:null},rv,{bet:ready[0].bet})):[]);
    roundActive=true;
    seats.forEach(s=>{
      resetSeat(s);
      if(s.kind==='me'){ C.state.balance-=s.bet; C.trackWager(s.bet); C.saveBalance(); C.renderBalance(); }
      else if(s.kind==='remote') F().sendPeer(s.peerId,{t:'bs_chips',delta:-s.bet});
    });
    msg.textContent='C’est parti !';
    render();
    seats.forEach(s=>{ if(s.kind==='ai') runAi(s); });
  }
  dealBtn.addEventListener('click',startRound);

  function drawFor(s){ const c=deck.length?deck.pop():C.newDeck().pop(); s.cards.push(c); return c; }
  function settleSeat(s,cashed){
    s.done=true; clearTimeout(turnTimers[s.peerId||'me']);
    const win=cashed?Math.round(s.bet*s.mult):0;
    if(s.kind==='me'){ C.state.balance+=win; C.saveBalance(); C.renderBalance(); C.recordGame('bus',s.bet,win); if(win>0) C.flashWin(msg); else C.flashLoss(cardsEl); }
    else if(s.kind==='remote'){ F().sendPeer(s.peerId,{t:'bs_end',total:s.bet,won:win}); }
    checkAllDone();
  }
  function aiStep(s){
    if(s.done) return;
    const before=s.cards.slice(); const c=drawFor(s);
    const g=R().checkGuess(s.stage+1,before,c,aiGuess(s));
    C.sound&&C.sound('card');
    if(!g.ok){ s.mult=0; settleSeat(s,false); render(); return; }
    s.mult=R().MULTS[s.stage]; s.stage++;
    render();
    if(s.stage>=4||s.stage>=s.stop){ settleSeat(s,true); render(); return; }
    setTimeout(()=>aiStep(s),700+Math.random()*500);
  }
  function runAi(s){ setTimeout(()=>aiStep(s),400+Math.random()*400); }
  function aiGuess(s){
    if(s.stage===0) return Math.random()<0.5?'rouge':'noir';
    if(s.stage===1) return Math.random()<0.5?'haute':'basse';
    if(s.stage===2) return Math.random()<0.5?'entre':'dehors';
    return ['♠','♥','♦','♣'][Math.floor(Math.random()*4)];
  }
  function guess(s,g){
    clearTimeout(turnTimers[s.peerId||'me']);
    const before=s.cards.slice(); const c=drawFor(s);
    const res=R().checkGuess(s.stage+1,before,c,g);
    C.sound&&C.sound('card');
    if(!res.ok){ s.mult=0; settleSeat(s,false); render(); return; }
    s.mult=R().MULTS[s.stage]; s.stage++;
    if(s.stage>=4) settleSeat(s,true);
    render();
  }
  function cashout(s){ settleSeat(s,true); render(); }
  function checkAllDone(){
    if(seats.every(s=>s.done)){ setTimeout(()=>{ newRound(); },2200); }
    render();
  }

  // ---------- Rendu ----------
  function snapshotFor(meIdx){
    return {handNo, roundActive, seats:seats.map((s,i)=>({name:s.name,kind:s.kind,bet:s.bet,stage:s.stage,cards:s.cards,done:s.done,mult:s.mult})), me:meIdx, msg:msg.textContent};
  }
  function render(){
    // render() ne tourne que côté hôte/solo (l'invité reçoit un instantané tout fait) : mon
    // siège est toujours celui marqué kind==='me' dans le tableau local.
    const meIdx=seats.findIndex(s=>s.kind==='me');
    draw(snapshotFor(meIdx));
    seats.forEach(s=>{ if(s.kind==='remote') F().sendPeer(s.peerId,Object.assign({t:'bs_state'},snapshotFor(seats.indexOf(s)))); });
  }
  function draw(s){
    view=s;
    const anyStarted=!!s.roundActive;
    seatsEl.innerHTML='';
    const me=s.me>=0?s.seats[s.me]:null;
    if(me){
      cardsEl.innerHTML=''; me.cards.forEach(c=>cardsEl.appendChild(C.renderCard(c,false)));
      for(let i=me.cards.length;i<4;i++){ const el=document.createElement('div'); el.className='card hidden'; el.textContent='?'; cardsEl.appendChild(el); }
      stageEl.textContent=me.done?(me.mult>0?'Encaissé à x'+me.mult+' !':'Perdu.'):('Étape '+(me.stage+1)+' : '+STAGE_TXT[me.stage]);
      multEl.textContent=me.stage>0?('Multiplicateur : x'+me.mult):'';
    } else { cardsEl.innerHTML=''; stageEl.textContent=''; multEl.textContent=''; }
    s.seats.forEach((seat,i)=>{
      if(i===s.me) return;
      const row=document.createElement('div'); row.className='bus-rival'+(seat.done&&seat.mult>0?' rival-best':(seat.done?' rival-out':''));
      const av=C.avatars?C.avatars.html(seat.name,22):'';
      row.innerHTML='<span class="rival-name">'+av+C.escapeHtml(seat.name)+'</span><span class="rival-res">'+(seat.bet<=0?'en attente':(seat.done?(seat.mult>0?'encaissé x'+seat.mult:'éliminé'):'étape '+(seat.stage+1)+' — mise '+seat.bet))+'</span>';
      seatsEl.appendChild(row);
    });
    msg.textContent=s.msg;
    betBox.style.display=(!anyStarted&&!guestMode)?'':'none';
    const canAct=me&&!me.done&&anyStarted;
    actionsEl.innerHTML=''; actionsEl.style.display=canAct?'flex':'none';
    if(canAct){
      const opts=me.stage===0?[['Rouge','rouge'],['Noir','noir']]:me.stage===1?[['Plus haute','haute'],['Plus basse','basse']]:me.stage===2?[['Entre','entre'],['En dehors','dehors']]:[['♠','♠'],['♥','♥'],['♦','♦'],['♣','♣']];
      opts.forEach(([label,val])=>{ const b=document.createElement('button'); b.textContent=label; b.addEventListener('click',()=>act('guess',val)); actionsEl.appendChild(b); });
      if(me.stage>0){ const cb=document.createElement('button'); cb.textContent='Encaisser (x'+me.mult+')'; cb.addEventListener('click',()=>act('cash')); actionsEl.appendChild(cb); }
    }
    dealBtn.style.display=(!guestMode&&F()&&F().role()==='host')?'':'none';
    if(!guestMode) dealBtn.disabled=anyStarted||C.state.balance<MIN_BET;
  }
  function act(type,val){
    if(guestMode){ F().sendHost({t:'bs_act',type,val}); return; }
    const s=seats.find(x=>x.kind==='me'); if(!s||s.done) return;
    if(type==='cash') cashout(s); else guess(s,val);
  }

  // ---------- Réseau ----------
  function guestReset(text){
    if(guestInvested>0){ C.state.balance+=guestInvested; C.saveBalance(); C.renderBalance(); text=(text||'')+' Ta mise t’a été rendue.'; }
    guestInvested=0; guestMode=false; view=null; seats=[];
    msg.textContent=text||''; updateMp(); render();
  }
  if(F()){
    F().onMsg((m,id)=>{
      if(!m.t||m.t.indexOf('bs_')!==0) return;
      if(m.t==='bs_bet'&&mode==='multi'&&F().role()==='host'){
        const s=seats.find(x=>x.kind==='remote'&&x.peerId===id); const b=parseInt(m.bet,10);
        if(s&&b>=MIN_BET&&b<=MAX_BET) s.bet=b; render();
      } else if(m.t==='bs_act'&&F().role()==='host'){
        const s=seats.find(x=>x.kind==='remote'&&x.peerId===id);
        if(s&&!s.done){ if(m.type==='cash') cashout(s); else guess(s,m.val); }
      } else if(m.t==='bs_state'){
        guestMode=true; switchMode('multi');
        if(!$('view-bus').classList.contains('active')){ const nav=document.querySelector('[data-view="bus"]'); if(nav) nav.click(); }
        draw(m);
      } else if(m.t==='bs_chips'){
        const d=parseInt(m.delta,10)||0; C.state.balance+=d; if(d<0){ C.trackWager(-d); guestInvested+=-d; } C.saveBalance(); C.renderBalance();
      } else if(m.t==='bs_end'){
        const total=parseInt(m.total,10)||0, won=parseInt(m.won,10)||0;
        C.state.balance+=won; C.saveBalance(); C.renderBalance(); guestInvested=0;
        C.recordGame('bus',total,won);
        if(won>0) C.flashWin(msg); else C.flashLoss(cardsEl);
      }
    });
    F().onPeerLeft(id=>{
      const s=seats.find&&seats.find(x=>x.kind==='remote'&&x.peerId===id);
      if(s&&!s.done){ s.mult=0; settleSeat(s,false); }
      render();
    });
    F().onLeave(()=>{ if(guestMode) guestReset('Tu as quitté le salon.'); });
  }
  document.addEventListener('friends-changed',()=>{ if(mode==='multi'&&!guestMode) updateMp(); });
  document.addEventListener('avatar-changed',()=>{ if(seats.length) render(); });

  newRound(); switchMode('ai');
})();
