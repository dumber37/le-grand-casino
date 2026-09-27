/* ============================================================
   SLOT ENGINE — moteur générique partagé par toutes les machines
   à sous (rouleaux, levier, mise, résolution des gains, animations
   de victoire). Chaque machine (slots.js, dragon-slots.js) ne
   fournit qu'une configuration : symboles/poids/gains, préfixe des
   ids DOM, et clé de jeu pour les stats. La mécanique (probabilités,
   règle "3 identiques" / "petite paire") est strictement identique
   pour toutes les machines.
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;

  C.createSlotMachine = function(opts){
    const prefix = opts.prefix;
    const symbols = opts.symbols; // [{icon, weight, payout}]
    const jackpotIcon = opts.jackpotIcon || null;
    const pairMultiplier = opts.pairMultiplier != null ? opts.pairMultiplier : 0.5;
    const minBet = opts.minBet != null ? opts.minBet : 5;
    const maxBet = opts.maxBet != null ? opts.maxBet : 100;
    const betStep = opts.betStep != null ? opts.betStep : 5;
    let bet = opts.defaultBet != null ? opts.defaultBet : 10;
    let spinning = false;

    const el = (id)=>document.getElementById(prefix+'-'+id);
    const betEl=el('betAmount'), msg=el('message'), lever=el('lever'), reelsWrap=el('reels'), winLine=el('winline');
    const reels=[el('reel0'), el('reel1'), el('reel2')];

    function weighted(){
      const t=symbols.reduce((s,x)=>s+x.weight,0); let r=Math.random()*t;
      for(const s of symbols){ if(r<s.weight) return s; r-=s.weight; }
      return symbols[0];
    }
    function render(){ betEl.textContent=bet; lever.classList.toggle('disabled', spinning||C.state.balance<bet); }
    el('betMinus').addEventListener('click',()=>{ if(!spinning){ bet=Math.max(minBet,bet-betStep); render(); } });
    el('betPlus').addEventListener('click',()=>{ if(!spinning){ bet=Math.min(maxBet,bet+betStep); render(); } });
    document.addEventListener('balance-changed',render);

    function bounceReel(r){ r.classList.remove('reel-bounce'); void r.offsetWidth; r.classList.add('reel-bounce'); setTimeout(()=>r.classList.remove('reel-bounce'),450); }
    // Le minuteur de retrait est annulé/reprogrammé à chaque appel : sans ça, un tour gagnant
    // relancé juste avant la fin du flourish précédent se faisait couper son animation par le
    // retrait différé (setTimeout) du tour d'avant.
    let blinkTimer=null;
    function blinkReels(list,jackpot){
      if(blinkTimer) clearTimeout(blinkTimer);
      list.forEach(r=>{ r.classList.remove('symbol-blink','jackpot-flourish'); void r.offsetWidth; r.classList.add(jackpot?'jackpot-flourish':'symbol-blink'); });
      blinkTimer=setTimeout(()=>list.forEach(r=>r.classList.remove('symbol-blink','jackpot-flourish')), jackpot?1500:1600);
    }
    function showWinLine(){ if(!winLine) return; winLine.classList.remove('show'); void winLine.offsetWidth; winLine.classList.add('show'); }
    function spawnCoins(){
      if(!reelsWrap) return;
      for(let i=0;i<10;i++){
        const c=document.createElement('span'); c.className='coin-fall'; c.textContent='🪙';
        c.style.left=(6+Math.random()*88)+'%'; c.style.animationDelay=(Math.random()*250)+'ms';
        reelsWrap.appendChild(c);
        setTimeout(()=>c.remove(), 1200);
      }
    }

    function doSpin(){
      if(spinning) return;
      if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
      spinning=true;
      C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
      C.sound&&C.sound('lever');
      lever.classList.add('pulled','disabled'); msg.textContent='Ça tourne...';
      reels.forEach(r=>{ r.classList.add('spin-active'); r.classList.remove('symbol-blink','jackpot-flourish'); });

      const results=[weighted(),weighted(),weighted()];
      const stopAt=[9,11,13]; let count=0;
      const iv=setInterval(()=>{
        count++;
        reels.forEach((r,i)=>{ if(count<stopAt[i]) r.textContent=weighted().icon; });
        stopAt.forEach((s,i)=>{
          if(count===s){ reels[i].textContent=results[i].icon; reels[i].classList.remove('spin-active'); bounceReel(reels[i]); }
        });
        if(count>=stopAt[2]){
          clearInterval(iv);
          const icons=results.map(r=>r.icon);
          let win=0;
          if(icons[0]===icons[1]&&icons[1]===icons[2]){
            win=bet*results[0].payout;
            const jackpot=jackpotIcon!==null&&icons[0]===jackpotIcon;
            msg.textContent=(jackpot?'JACKPOT ! +':'Gagné ! +')+win+' jetons';
            blinkReels(reels, jackpot); showWinLine();
            if(jackpot){ C.sound&&C.sound('jackpot'); }
            if(jackpot||results[0].payout>=15) spawnCoins();
          } else if(icons[0]===icons[1]||icons[1]===icons[2]||icons[0]===icons[2]){
            win=Math.round(bet*pairMultiplier); msg.textContent='Petite paire, +'+win+' jetons';
            const matched=icons[0]===icons[1]?[reels[0],reels[1]]:(icons[1]===icons[2]?[reels[1],reels[2]]:[reels[0],reels[2]]);
            blinkReels(matched,false);
          } else {
            msg.textContent='Perdu, retente ta chance.'; C.flashLoss(reelsWrap);
          }
          C.state.balance+=win; C.saveBalance(); C.renderBalance();
          C.recordGame(opts.gameKey, bet, win); if(win>0) C.flashWin(msg);
          spinning=false; lever.classList.remove('pulled'); render();
        }
      },90);
    }
    lever.addEventListener('click',doSpin);
    render();
  };
})();
