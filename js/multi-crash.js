/* ============================================================
   CRASH MULTIJOUEUR — via la connexion du « Salon entre amis ».
   Mêmes règles que le Crash solo (C.crashRules, exposé tel quel par
   crash.js : même formule de tirage du point de crash, même courbe
   temps → multiplicateur, aucune probabilité dupliquée). L'hôte tire
   le point de crash et fait avancer la fusée ; tous les joueurs du
   salon voient exactement la même courbe monter en même temps (l'hôte
   diffuse juste le temps écoulé, chacun recalcule le multiplicateur
   avec la même formule — donc zéro décalage possible). Chaque joueur
   mise et encaisse à son propre rythme, avec son propre solde, comme
   dans les autres jeux multijoueurs du salon.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('view-crash')||!$('crash-multi')) return;
  const R=()=>C.crashRules, F=()=>C.friends;
  const soloBox=$('crash-solo'), multiBox=$('crash-multi');
  const multEl=$('crm-mult'), lineEl=$('crm-line'), rocket=$('crm-rocket'), histEl=$('crm-history');
  const seatsEl=$('crm-seats'), mpInfo=$('crm-mpInfo'), msg=$('crm-message');
  const betBox=$('crm-betBox'), betEl=$('crm-betAmount'), betBtn=$('crm-betBtn');
  const actionsEl=$('crm-actions'), cashoutBtn=$('crm-cashoutBtn'), startBtn=$('crm-startBtn');
  const displayEl=$('view-crash').querySelector('#crash-multi .crash-display');
  const MIN_BET=5, MAX_BET=100, W=300, H=160;
  const crashHistory=[];

  let mode='ai', myBet=20, seats=[], guestMode=false, guestInvested=0, view=null;
  let flying=false, startTime=0, crashPoint=1, currentMult=1, iv=null, points=[], roundNo=0;

  function switchMode(m){
    if(m!=='ai'&&m!=='multi') return;
    mode=m;
    document.querySelectorAll('.mode-switch[data-mode-for="crash"] button').forEach(b=>b.classList.toggle('sel',b.dataset.mode===m));
    soloBox.style.display=m==='ai'?'':'none';
    multiBox.style.display=m==='multi'?'':'none';
    if(m==='multi') updateMp();
  }
  document.querySelectorAll('.mode-switch[data-mode-for="crash"] button').forEach(b=>b.addEventListener('click',()=>{ if(!flying) switchMode(b.dataset.mode); }));
  function updateMp(){
    const role=F()&&F().role(), n=(role==='host')?F().peers().length:0;
    if(guestMode||role==='guest'){ mpInfo.textContent=guestMode?'🤝 Salon de l’hôte — il lance la fusée.':'🤝 Connecté — l’hôte peut lancer la fusée.'; startBtn.style.display='none'; }
    else { mpInfo.textContent=n?'🤝 '+n+' ami'+(n>1?'s':'')+' dans le salon':'🤝 Ouvre un salon (« Salon entre amis ») et invite des amis.'; startBtn.style.display=''; }
  }
  $('crm-friendsBtn').addEventListener('click',()=>document.querySelector('[data-view="friends"]').click());
  $('crm-betMinus').addEventListener('click',()=>{ if(!flying) myBet=Math.max(MIN_BET,myBet-5); betEl.textContent=myBet; });
  $('crm-betPlus').addEventListener('click',()=>{ if(!flying) myBet=Math.min(MAX_BET,myBet+5); betEl.textContent=myBet; });
  betEl.textContent=myBet;

  // ---------- Manche (hôte / solo local) ----------
  function newRound(){
    roundNo++; flying=false;
    const peers=(F()&&F().role()==='host')?F().peers():[];
    const humans=[{kind:'me',peerId:null,name:'Toi'}].concat(peers.map(p=>({kind:'remote',peerId:p.id,name:p.name})));
    seats=humans.map(h=>Object.assign({bet:0,done:false,cashed:false,mult:0},h));
    resetGraph();
    msg.textContent='Valide ta mise, puis '+(seats.length>1?'attends que l’hôte lance la fusée.':'lance la fusée.');
    render();
  }
  function resetGraph(){
    points=[{x:0,y:H}]; currentMult=1;
    multEl.classList.remove('busted'); multEl.textContent='x1.00';
    lineEl.setAttribute('points',''); rocket.style.left='0%'; rocket.style.bottom='0%'; rocket.style.transform='';
  }
  function myCommit(){
    if(myBet>C.state.balance){ msg.textContent='Solde insuffisant.'; return; }
    if(guestMode){ F().sendHost({t:'cr_bet',bet:myBet}); return; }
    const me=seats.find(s=>s.kind==='me'); if(me&&!flying) me.bet=myBet; render();
  }
  betBtn.addEventListener('click',myCommit);

  function startFlight(){
    if(flying) return;
    const ready=seats.filter(s=>s.bet>0);
    if(!ready.length){ msg.textContent='Personne n’a encore validé de mise.'; return; }
    seats=ready;
    seats.forEach(s=>{
      s.done=false; s.cashed=false; s.mult=0;
      if(s.kind==='me'){ C.state.balance-=s.bet; C.trackWager(s.bet); C.saveBalance(); C.renderBalance(); }
      else if(s.kind==='remote') F().sendPeer(s.peerId,{t:'cr_chips',delta:-s.bet});
    });
    crashPoint=R().genCrashPoint(); flying=true; startTime=Date.now();
    resetGraph();
    msg.textContent='En vol...';
    C.sound&&C.sound('spin');
    render();
    iv=setInterval(tick,60);
  }
  startBtn.addEventListener('click',startFlight);
  function tick(){
    const elapsed=(Date.now()-startTime)/1000, mult=R().multFromElapsed(elapsed);
    if(mult>=crashPoint) return crashRound();
    currentMult=mult;
    drawTick(elapsed,mult);
    seats.forEach(s=>{ if(s.kind==='remote') F().sendPeer(s.peerId,{t:'cr_tick',el:elapsed}); });
  }
  function drawTick(elapsed,mult){
    multEl.textContent='x'+mult.toFixed(2);
    const x=Math.min(W, elapsed*22), y=R().yFor(mult);
    points.push({x,y});
    lineEl.setAttribute('points', points.map(p=>p.x+','+p.y).join(' '));
    rocket.style.left=(x/W*100)+'%'; rocket.style.bottom=((1-y/H)*100)+'%';
    R().updateRocketFx(rocket, rocket.parentElement, points);
    renderSeats();
  }
  function crashRound(){
    clearInterval(iv); flying=false; currentMult=crashPoint;
    multEl.textContent='x'+crashPoint.toFixed(2); multEl.classList.add('busted');
    displayEl.classList.remove('crash-shake'); void displayEl.offsetWidth; displayEl.classList.add('crash-shake');
    crashHistory.push(crashPoint); renderHistory();
    seats.forEach(s=>{
      if(s.done) return; s.done=true; s.mult=0;
      if(s.kind==='me'){ C.recordGame('crash',s.bet,0); C.flashLoss(displayEl); }
      else if(s.kind==='remote') F().sendPeer(s.peerId,{t:'cr_end',total:s.bet,won:0,cp:crashPoint});
    });
    msg.textContent='Crash à x'+crashPoint.toFixed(2)+' !';
    render();
    setTimeout(()=>{ newRound(); },2400);
  }
  function cashoutSeat(s){
    if(!flying||s.done) return;
    s.done=true; s.cashed=true; s.mult=currentMult;
    const win=Math.round(s.bet*currentMult);
    if(s.kind==='me'){
      C.state.balance+=win; C.saveBalance(); C.renderBalance(); C.recordGame('crash',s.bet,win);
      C.flashScreen();
      // Toast + son directement, SANS jamais passer par msg.textContent : ce champ est partagé
      // et rediffusé à tout le salon par render() (même instantané pour tous les joueurs) — s'il
      // portait mon message personnel, tous les amis le verraient s'afficher chez eux comme si
      // c'était leur propre gain. Ma ligne dans la liste des sièges (déjà personnalisée, propre
      // à chacun) suffit à afficher mon résultat sans toucher au message commun.
      C.showToast('Encaissé à x'+currentMult.toFixed(2)+' ! +'+win+' jetons');
      C.sound&&C.sound('win');
      crashHistory.push(currentMult); renderHistory();
    } else if(s.kind==='remote'){ F().sendPeer(s.peerId,{t:'cr_end',total:s.bet,won:win,mult:currentMult}); }
    render();
  }
  function myCashout(){
    if(guestMode){ F().sendHost({t:'cr_act',type:'cash'}); return; }
    const me=seats.find(s=>s.kind==='me'); if(me) cashoutSeat(me);
  }
  cashoutBtn.addEventListener('click',myCashout);
  function renderHistory(){
    histEl.innerHTML='';
    crashHistory.slice(-8).forEach(h=>{ const s=document.createElement('span'); s.textContent='x'+h.toFixed(2); s.style.color=h<2?'var(--red)':'var(--good)'; histEl.appendChild(s); });
  }

  // ---------- Rendu ----------
  function snapshotFor(meIdx){
    // crashPoint n'est jamais révélé aux amis tant que la fusée est en vol (comme en solo,
    // où il reste caché jusqu'au crash) : seul un round déjà réglé peut l'exposer.
    return {roundNo, flying, crashPoint: flying?null:crashPoint, currentMult,
      seats:seats.map(s=>({name:s.name,kind:s.kind,bet:s.bet,done:s.done,cashed:s.cashed,mult:s.mult})),
      me:meIdx, msg:msg.textContent};
  }
  function render(){
    // render() ne tourne que côté hôte/solo (l'invité reçoit un instantané tout fait) : mon
    // siège est toujours celui marqué kind==='me' dans le tableau local.
    const meIdx=seats.findIndex(s=>s.kind==='me');
    draw(snapshotFor(meIdx));
    seats.forEach(s=>{ if(s.kind==='remote') F().sendPeer(s.peerId,Object.assign({t:'cr_state'},snapshotFor(seats.indexOf(s)))); });
  }
  function renderSeats(){ if(view) draw(Object.assign({},view,{currentMult})); }
  function draw(s){
    view=s;
    const me=s.me>=0?s.seats[s.me]:null;
    seatsEl.innerHTML='';
    s.seats.forEach((seat,i)=>{
      const row=document.createElement('div'); row.className='fr-player'+(seat.done?(seat.cashed?' fr-win':' fr-loss'):'');
      const av=C.avatars?C.avatars.html(seat.name,22):'';
      let right=seat.bet<=0?'en attente':(seat.done?(seat.cashed?'encaissé x'+seat.mult.toFixed(2)+' → +'+Math.round(seat.bet*seat.mult):'crashé'):('en vol · '+seat.bet));
      row.innerHTML='<span>'+av+escapeHtml(seat.name)+(i===s.me?' (toi)':'')+'</span><span>'+right+'</span>';
      seatsEl.appendChild(row);
    });
    betBox.style.display=(!s.flying&&!guestMode)?'':'none';
    const canCash=s.flying&&me&&!me.done;
    actionsEl.style.display=canCash?'flex':'none';
    if(!guestMode){ startBtn.disabled=s.flying; startBtn.style.display=F()&&F().role()==='host'?'':'none'; }
    msg.textContent=s.msg;
  }
  const escapeHtml=C.escapeHtml;

  // ---------- Réseau ----------
  function guestReset(text){
    if(guestInvested>0){ C.state.balance+=guestInvested; C.saveBalance(); C.renderBalance(); text=(text||'')+' Ta mise t’a été rendue.'; }
    guestInvested=0; guestMode=false; view=null; seats=[]; flying=false;
    resetGraph(); msg.textContent=text||''; updateMp(); render();
  }
  if(F()){
    F().onMsg((m,id)=>{
      if(!m.t||m.t.indexOf('cr_')!==0) return;
      if(m.t==='cr_bet'&&mode==='multi'&&F().role()==='host'){
        const s=seats.find(x=>x.kind==='remote'&&x.peerId===id); const b=parseInt(m.bet,10);
        if(s&&!flying&&b>=MIN_BET&&b<=MAX_BET) s.bet=b; render();
      } else if(m.t==='cr_act'&&F().role()==='host'){
        const s=seats.find(x=>x.kind==='remote'&&x.peerId===id);
        if(s&&m.type==='cash') cashoutSeat(s);
      } else if(m.t==='cr_state'){
        guestMode=true; switchMode('multi');
        if(!$('view-crash').classList.contains('active')){ const nav=document.querySelector('[data-view="crash"]'); if(nav) nav.click(); }
        currentMult=m.currentMult; crashPoint=m.crashPoint; flying=m.flying;
        draw(m);
      } else if(m.t==='cr_tick'){
        flying=true; const mult=R().multFromElapsed(m.el);
        drawTick(m.el,mult);
      } else if(m.t==='cr_chips'){
        const d=parseInt(m.delta,10)||0; C.state.balance+=d; if(d<0){ C.trackWager(-d); guestInvested+=-d; } C.saveBalance(); C.renderBalance();
      } else if(m.t==='cr_end'){
        const total=parseInt(m.total,10)||0, won=parseInt(m.won,10)||0;
        C.state.balance+=won; C.saveBalance(); C.renderBalance(); guestInvested=0;
        C.recordGame('crash',total,won);
        if(won>0){
          C.flashScreen(); C.showToast('Encaissé à x'+(typeof m.mult==='number'?m.mult.toFixed(2):(won/total).toFixed(2))+' ! +'+won+' jetons'); C.sound&&C.sound('win');
          crashHistory.push(typeof m.mult==='number'?m.mult:won/total); renderHistory();
        } else {
          C.flashLoss(displayEl);
          crashHistory.push(typeof m.cp==='number'?m.cp:crashPoint); renderHistory();
        }
      }
    });
    F().onPeerLeft(id=>{
      const s=seats.find&&seats.find(x=>x.kind==='remote'&&x.peerId===id);
      if(s&&!s.done&&flying){ s.done=true; s.mult=0; }
      render();
    });
    F().onLeave(()=>{
      if(guestMode) guestReset('Tu as quitté le salon.');
      else { clearInterval(iv); if(seats.length) newRound(); }
    });
  }
  document.addEventListener('friends-changed',()=>{ if(mode==='multi'&&!guestMode) updateMp(); });
  document.addEventListener('avatar-changed',()=>{ if(seats.length) render(); });

  newRound(); switchMode('ai');
})();
