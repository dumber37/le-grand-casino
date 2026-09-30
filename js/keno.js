/* ============================================================
   KENO — choisis jusqu'à 10 numéros parmi 40, 10 sont tirés. Le gain
   dépend du nombre de numéros choisis ET du nombre de bons numéros
   (table de gains PAYTABLE, indexée par [nb choisi][nb trouvé]).
   Échelle des multiplicateurs alignée sur le reste de l'app (jackpot
   max x60, comme Fortune Dragon) plutôt que sur un vrai Keno réel
   (où certains gains dépassent x1000) — cohérence de l'économie
   fictive du casino avant tout.
   ============================================================ */
(function(){
  const C=window.Casino;
  const N=40, MAXPICK=10;
  const PAYTABLE={
    1:{1:2},
    2:{2:4},
    3:{2:1,3:8},
    4:{2:1,3:3,4:15},
    5:{3:2,4:8,5:25},
    6:{3:1,4:4,5:15,6:35},
    7:{4:2,5:8,6:20,7:45},
    8:{4:1,5:4,6:12,7:25,8:50},
    9:{5:2,6:8,7:18,8:30,9:55},
    10:{5:1,6:4,7:10,8:20,9:35,10:60}
  };
  let bet=20, picks=[], drawing=false;
  const gridEl=document.getElementById('kn-grid'), msg=document.getElementById('kn-message');
  const betEl=document.getElementById('kn-betAmount'), drawBtn=document.getElementById('kn-drawBtn');
  const betMinus=document.getElementById('kn-betMinus'), betPlus=document.getElementById('kn-betPlus');
  const paytableEl=document.getElementById('kn-paytable');

  function buildGrid(){
    gridEl.innerHTML='';
    for(let i=1;i<=N;i++){
      const b=document.createElement('button'); b.type='button'; b.className='kn-num'; b.textContent=i; b.dataset.n=i;
      b.addEventListener('click',()=>{
        if(drawing) return;
        const idx=picks.indexOf(i);
        if(idx>=0){ picks.splice(idx,1); b.classList.remove('sel'); }
        else { if(picks.length>=MAXPICK) return; picks.push(i); b.classList.add('sel'); }
        renderPaytable(); render();
      });
      gridEl.appendChild(b);
    }
  }
  function renderPaytable(){
    const tbl=PAYTABLE[picks.length];
    if(!tbl){ paytableEl.innerHTML='<div><span>Choisis 1 à 10 numéros</span><span></span></div>'; return; }
    paytableEl.innerHTML=Object.keys(tbl).sort((a,b)=>a-b).map(hits=>
      '<div><span>'+hits+' bon'+(hits>1?'s':'')+' sur '+picks.length+'</span><span>x'+tbl[hits]+'</span></div>'
    ).join('');
  }
  function render(){ betEl.textContent=bet; drawBtn.disabled=drawing||picks.length===0||C.state.balance<bet; betMinus.disabled=betPlus.disabled=drawing; }
  betMinus.addEventListener('click',()=>{ if(!drawing){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!drawing){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',render);

  // Même technique de tirage sans remise que C.newDeck (Fisher-Yates), appliquée à 1..40
  // plutôt qu'à un jeu de cartes.
  function drawNumbers(){
    const pool=[]; for(let i=1;i<=N;i++) pool.push(i);
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    return pool.slice(0,10);
  }
  function draw(){
    if(drawing) return;
    if(picks.length===0){ msg.textContent='Choisis au moins un numéro.'; return; }
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    const roundBet=bet;
    drawing=true; render();
    C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    Array.from(gridEl.children).forEach(b=>b.classList.remove('hit','miss'));
    msg.textContent='Tirage en cours...';
    const drawn=drawNumbers();
    let i=0;
    function revealNext(){
      if(i>=drawn.length){
        const hits=picks.filter(p=>drawn.includes(p)).length;
        const mult=(PAYTABLE[picks.length]||{})[hits]||0;
        const win=roundBet*mult;
        C.state.balance+=win; C.saveBalance(); C.renderBalance();
        C.recordGame('keno', roundBet, win);
        msg.textContent=hits+' bon'+(hits>1?'s':'')+' sur '+picks.length+(win>0?' — gagné +'+win+' jetons':' — perdu');
        if(win>0) C.flashWin(msg); else C.flashLoss(gridEl);
        drawing=false; render();
        return;
      }
      const n=drawn[i]; i++;
      const btn=gridEl.querySelector('[data-n="'+n+'"]');
      if(btn) btn.classList.add(picks.includes(n)?'hit':'miss');
      C.sound&&C.sound('card');
      setTimeout(revealNext,150);
    }
    C.sound&&C.sound('spin');
    setTimeout(revealNext,300);
  }
  drawBtn.addEventListener('click',draw);
  buildGrid(); renderPaytable(); render();
})();
