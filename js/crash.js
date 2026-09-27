/* ============================================================
   CRASH
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=20, active=false, startTime=0, crashPoint=1, currentMult=1, iv=null, points=[], crashHistory=[], lastR=null;
  const betEl=document.getElementById('cr-betAmount'), msg=document.getElementById('cr-message');
  const multEl=document.getElementById('cr-mult'), lineEl=document.getElementById('cr-line'), rocket=document.getElementById('cr-rocket'), histEl=document.getElementById('cr-history');
  const startBtn=document.getElementById('cr-startBtn'), actionsEl=document.getElementById('cr-actions'), cashoutBtn=document.getElementById('cr-cashoutBtn');
  const displayEl=document.querySelector('#view-crash .crash-display');
  const infoEl=document.getElementById('cr-infoDetail');
  const W=300, H=160, MAXMULT=20;
  function render(){ betEl.textContent=bet; startBtn.disabled=active||C.state.balance<bet; }
  document.getElementById('cr-betMinus').addEventListener('click',()=>{if(!active){bet=Math.max(5,bet-5);render();}});
  document.getElementById('cr-betPlus').addEventListener('click',()=>{if(!active){bet=Math.min(100,bet+5);render();}});
  document.addEventListener('balance-changed',render);
  function crashPointFromR(r){ let cp=0.99/(1-r); cp=Math.min(cp,50); return Math.max(1.0, Math.round(cp*100)/100); }
  function genCrashPoint(){ const r=Math.random(); lastR=r; return crashPointFromR(r); }
  // Règles exposées telles quelles pour le multijoueur (multi-crash.js) : MÊME formule de
  // tirage du point de crash, MÊME conversion temps écoulé → multiplicateur, MÊME courbe
  // d'affichage (yFor) — aucune règle/probabilité dupliquée, aucun risque de drift entre
  // le solo et le multijoueur. genCrashPoint() ici ne touche pas lastR (propre à l'écran
  // « mode transparence » du solo) : un tirage multijoueur ne doit pas polluer cet affichage.
  C.crashRules = {
    RATE: 0.15, MAXMULT,
    genCrashPoint: function(){ return crashPointFromR(Math.random()); },
    multFromElapsed: function(elapsed){ return Math.exp(0.15*elapsed); },
    yFor: function(mult){ return yFor(mult); }
  };
  // Mode transparence : explique la formule, avec les chiffres réels de la dernière manche
  // une fois qu'une manche a eu lieu — purement pédagogique, ne change rien au tirage.
  function renderCrashInfo(){
    if(!infoEl) return;
    const base="Le point de crash est tiré au hasard à chaque manche avec la formule 0,99 / (1 − r), où r est un nombre aléatoire entre 0 et 1 (résultat plafonné à x50). La marge de la maison (1%) vient du facteur 0,99 ; plus r est proche de 1, plus le multiplicateur est élevé, mais la probabilité chute très vite à mesure qu'il grimpe.";
    infoEl.textContent = lastR===null ? base : (base+' Dernière manche : r = '+lastR.toFixed(4)+' → 0,99 / (1 − '+lastR.toFixed(4)+') = x'+crashPoint.toFixed(2)+'.');
  }
  function yFor(mult){ return H-Math.min(H-8, (Math.log(mult)/Math.log(MAXMULT))*(H-8)); }
  function renderCrashHistory(){
    histEl.innerHTML='';
    crashHistory.slice(-8).forEach(h=>{ const s=document.createElement('span'); s.textContent='x'+h.toFixed(2); s.style.color=h<2?'var(--red)':'#4fce85'; histEl.appendChild(s); });
  }
  function start(){
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
    crashPoint=genCrashPoint(); currentMult=1; active=true; startTime=Date.now(); points=[{x:0,y:H}];
    multEl.classList.remove('busted'); multEl.textContent='x1.00'; lineEl.setAttribute('points',''); rocket.style.left='0%'; rocket.style.bottom='0%';
    msg.textContent='En vol...'; actionsEl.style.display='flex'; render(); renderCrashInfo();
    iv=setInterval(()=>{
      const elapsed=(Date.now()-startTime)/1000;
      currentMult=Math.exp(0.15*elapsed);
      if(currentMult>=crashPoint){ crash(); return; }
      multEl.textContent='x'+currentMult.toFixed(2);
      const x=Math.min(W, elapsed*22), y=yFor(currentMult);
      points.push({x,y});
      lineEl.setAttribute('points', points.map(p=>p.x+','+p.y).join(' '));
      rocket.style.left=(x/W*100)+'%'; rocket.style.bottom=((1-y/H)*100)+'%';
    },60);
  }
  function crash(){
    clearInterval(iv); active=false;
    multEl.textContent='x'+crashPoint.toFixed(2); multEl.classList.add('busted');
    msg.textContent='Crash à x'+crashPoint.toFixed(2)+' — perdu';
    actionsEl.style.display='none';
    // Animation signature : tremblement plus marqué au crash.
    displayEl.classList.remove('crash-shake'); void displayEl.offsetWidth; displayEl.classList.add('crash-shake');
    crashHistory.push(crashPoint); renderCrashHistory();
    C.recordGame('crash', bet, 0); render();
  }
  cashoutBtn.addEventListener('click',()=>{
    if(!active) return;
    clearInterval(iv); active=false;
    const win=Math.round(bet*currentMult);
    msg.textContent='Encaissé à x'+currentMult.toFixed(2)+' ! +'+win+' jetons';
    actionsEl.style.display='none';
    // Animation signature : flash lumineux sur tout l'écran au cash out réussi.
    C.flashScreen();
    crashHistory.push(currentMult); renderCrashHistory();
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('crash', bet, win); C.flashWin(msg); render();
  });
  startBtn.addEventListener('click',start);
  render();
})();
