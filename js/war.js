/* ============================================================
   BATAILLE (WAR) — une carte chacun, la plus haute gagne. Égalité :
   une "guerre", une carte de plus chacun (gain plus élevé). Nouvelle
   égalité sur la guerre : mise remboursée (pas de récursion infinie).
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=20, active=false;
  const betEl=document.getElementById('wr-betAmount'), msg=document.getElementById('wr-message');
  const playBtn=document.getElementById('wr-playBtn');
  const betMinus=document.getElementById('wr-betMinus'), betPlus=document.getElementById('wr-betPlus');
  const playerEl=document.getElementById('wr-playerCard'), dealerEl=document.getElementById('wr-dealerCard');
  const tableEl=document.querySelector('#view-war .bj-table');

  function rankVal(c){ if(c.r==='A') return 14; if(c.r==='K') return 13; if(c.r==='Q') return 12; if(c.r==='J') return 11; return parseInt(c.r,10); }
  function render(){ betEl.textContent=bet; playBtn.disabled=active||C.state.balance<bet; betMinus.disabled=betPlus.disabled=active; }
  betMinus.addEventListener('click',()=>{ if(!active){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!active){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',render);
  function showCard(el,card){ el.innerHTML=''; el.appendChild(C.renderCard(card,false,true)); }

  function finish(roundBet,win,message){
    msg.textContent=message;
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('war', roundBet, win);
    if(win>roundBet) C.flashWin(msg); else if(win===0) C.flashLoss(tableEl||msg);
    active=false; render();
  }
  function playRound(){
    if(active) return;
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    const roundBet=bet;
    active=true; render();
    C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    const deck=C.newDeck();
    const p=deck.pop(), d=deck.pop();
    C.sound&&C.sound('card');
    showCard(playerEl,p); showCard(dealerEl,d);
    const pv=rankVal(p), dv=rankVal(d);
    if(pv>dv){ finish(roundBet, roundBet*2, 'Tu gagnes ! +'+(roundBet*2)+' jetons'); }
    else if(pv<dv){ finish(roundBet, 0, 'Perdu — le croupier avait la carte la plus haute.'); }
    else {
      msg.textContent='Égalité — GUERRE ! Une carte de plus chacun...';
      setTimeout(()=>{
        const p2=deck.pop(), d2=deck.pop();
        C.sound&&C.sound('card');
        showCard(playerEl,p2); showCard(dealerEl,d2);
        const pv2=rankVal(p2), dv2=rankVal(d2);
        if(pv2>dv2) finish(roundBet, roundBet*3, 'Guerre gagnée ! +'+(roundBet*3)+' jetons');
        else if(pv2<dv2) finish(roundBet, 0, 'Guerre perdue.');
        else finish(roundBet, roundBet, 'Double égalité — mise remboursée.');
      }, 900);
    }
  }
  playBtn.addEventListener('click', playRound);
  render();
})();
