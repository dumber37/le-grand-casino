/* ============================================================
   PILE OU FACE
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=20, selectedSide=null, spinning=false;
  const betEl=document.getElementById('cf-betAmount'), msg=document.getElementById('cf-message');
  const flipBtn=document.getElementById('cf-flipBtn'), coinEl=document.getElementById('cf-coin');
  const betMinus=document.getElementById('cf-betMinus'), betPlus=document.getElementById('cf-betPlus');
  const coinInner=coinEl.querySelector('.coin-inner');
  let spins=0; // tours cumulés, pour que chaque lancer tourne "vers l'avant" sans jamais revenir en arrière
  document.querySelectorAll('#view-coinflip .roulette-grid button').forEach(b=>{
    b.addEventListener('click',()=>{ if(spinning) return; document.querySelectorAll('#view-coinflip .roulette-grid button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); selectedSide=b.dataset.side; });
  });
  function render(){ betEl.textContent=bet; flipBtn.disabled=spinning||C.state.balance<bet; betMinus.disabled=betPlus.disabled=spinning; }
  betMinus.addEventListener('click',()=>{ if(!spinning){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!spinning){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',render);
  flipBtn.addEventListener('click',()=>{
    if(spinning) return;
    if(!selectedSide){ msg.textContent='Choisis Pile ou Face.'; return; }
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    // Mise verrouillée pour ce tour dès le clic : les boutons +/- sont désactivés pendant
    // l'animation (comme les autres jeux), et le gain est calculé sur ce montant figé, jamais
    // sur la variable "bet" (qui pourrait changer entre-temps si les boutons n'étaient pas bloqués).
    const roundBet=bet;
    spinning=true;
    C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    C.sound&&C.sound('spin');
    render(); msg.textContent='La pièce tourne...';
    coinEl.classList.remove('coin-bounce-win');

    // Le résultat est tiré immédiatement (même instant qu'avant) ; seule la mise à jour
    // visuelle/du solde est différée de 800ms pour laisser la pièce tourner en 3D.
    const result=Math.random()<0.5?'pile':'face';
    spins+=4+Math.floor(Math.random()*3);
    const targetDeg=spins*360+(result==='face'?180:0);
    coinInner.style.transform='rotateY('+targetDeg+'deg)';

    setTimeout(()=>{
      let win = result===selectedSide ? roundBet*2 : 0;
      msg.textContent = win>0 ? ("C'était "+result+" — gagné +"+win+" jetons") : ("C'était "+result+" — perdu");
      // Animation signature : la pièce rebondit en retombant sur le bon côté ; perte = assombrissement discret.
      if(win>0){ void coinEl.offsetWidth; coinEl.classList.add('coin-bounce-win'); }
      else { C.flashLoss(coinEl); }
      C.state.balance+=win; C.saveBalance(); C.renderBalance();
      C.recordGame('coinflip', roundBet, win); if(win>0) C.flashWin(msg);
      spinning=false; render();
    },800);
  });
  render();
})();
