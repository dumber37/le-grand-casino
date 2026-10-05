/* ============================================================
   SLOT ENGINE — moteur générique partagé par toutes les machines
   à sous (rouleaux, levier, mise, résolution des gains, animations
   de victoire). Chaque machine (slots.js, dragon-slots.js) ne
   fournit qu'une configuration : symboles/poids/gains, préfixe des
   ids DOM, et clé de jeu pour les stats. La mécanique (probabilités,
   règle "3 identiques" / "petite paire") est strictement identique
   pour toutes les machines à 1 ligne (mode par défaut).

   Mode grille (opts.rows>1, ex. Fortune Dragon 3x5) : chaque rouleau
   affiche plusieurs symboles empilés au lieu d'un seul. La RÈGLE reste
   rigoureusement la même que le mode classique — "ligne complète =
   gain plein (bet*payout du symbole), doublon quelque part sur la
   ligne = petite paire (bet*pairMultiplier)" — seulement appliquée à
   chaque ligne (rangée) de la grille au lieu d'une seule. Aucun poids
   ni gain défini par une machine (symbols/payout/pairMultiplier) n'est
   jamais modifié par ce fichier : le mode grille est un pur passage à
   l'échelle du même mécanisme, pas une nouvelle mécanique.
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
    const rows = opts.rows != null ? opts.rows : 1;
    const cols = opts.cols != null ? opts.cols : 3;
    let bet = opts.defaultBet != null ? opts.defaultBet : 10;
    let spinning = false;

    const el = (id)=>document.getElementById(prefix+'-'+id);
    const betEl=el('betAmount'), msg=el('message'), lever=el('lever'), reelsWrap=el('reels'), winLine=el('winline');

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

    // ---- Rouleau qui DÉFILE vraiment (purement visuel, le tirage est fait avant) : pendant le tour,
    // une bande de symboles aléatoires défile verticalement et floue (pseudo-élément ::before, voir
    // slots.css) ; à l'arrêt, le symbole final glisse dans la fenêtre avec un petit dépassement
    // (::after) avant de laisser place au vrai contenu. Le défilement ralentit sur les derniers
    // tics. Sans effet si « Réduire les animations » est actif : on garde l'ancien clignotement. ----
    const motionOk=()=>document.documentElement.getAttribute('data-motion')!=='reduce';
    function beginSpinFx(host,nRows){
      if(!motionOk()) return;
      const sym=host.querySelector('.symbol'), cs=getComputedStyle(host);
      const fs=getComputedStyle(sym||host).fontSize, L=8;
      // Pas d'une ligne : en grille, hauteur d'une cellule + espace entre cellules ; sinon tout le rouleau.
      const cell=sym?sym.offsetHeight+(parseFloat(cs.rowGap)||0):host.clientHeight;
      const lines=[]; for(let i=0;i<L;i++) lines.push(weighted().icon);
      host.style.setProperty('--reel-fs',fs); host.style.setProperty('--cell',cell+'px'); host.style.setProperty('--pad',(sym?parseFloat(cs.paddingTop)||0:0)+'px');
      host.style.setProperty('--strip-shift',(L*cell)+'px'); host.style.setProperty('--spin-dur','.3s');
      host.dataset.strip=lines.concat(lines).join('\n');
      host.classList.add('strip-on');
    }
    function slowSpinFx(host,remaining){
      if(!host.classList.contains('strip-on')) return;
      if(remaining===3) host.style.setProperty('--spin-dur','.42s');
      else if(remaining===1) host.style.setProperty('--spin-dur','.75s');
    }
    function endSpinFx(host,finals){
      if(!host.classList.contains('strip-on')) return;
      const n=finals.length, cell=parseFloat(host.style.getPropertyValue('--cell'))||0;
      const before=[]; for(let i=0;i<n;i++) before.push(weighted().icon);
      host.dataset.land=finals.concat(before).join('\n');
      host.style.setProperty('--land-shift',(n*cell)+'px');
      host.classList.remove('strip-on'); host.classList.add('landing');
      C.sound&&C.sound('clack');
      setTimeout(()=>host.classList.remove('landing'),360);
    }
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
    // Pluie de pièces retombant sur TOUTE la cabine (pas juste la fenêtre des rouleaux) : plus
    // spectaculaire sur un gros gain, encore plus sur un jackpot (pièces plus grosses + quelques
    // étincelles mêlées + flash plein écran déjà utilisé ailleurs dans l'app, ex. Crash). Purement
    // décoratif — ne touche jamais au calcul du gain, déjà déterminé avant cet appel.
    const cabEl=reelsWrap&&reelsWrap.closest('.cab');
    function spawnCoins(tier){
      if(!cabEl) return;
      const jackpot=tier==='jackpot';
      const count=jackpot?26:(tier==='big'?14:6);
      for(let i=0;i<count;i++){
        const spark=jackpot&&i%4===0;
        const c=document.createElement('span');
        c.className='coin-fall'+(jackpot?' coin-big':'')+(spark?' coin-spark':'');
        c.textContent=spark?'✨':'🪙';
        c.style.left=(2+Math.random()*96)+'%';
        c.style.animationDelay=(Math.random()*(jackpot?450:280))+'ms';
        c.style.setProperty('--fall-x',(Math.random()*60-30)+'px');
        c.style.setProperty('--fall-dist',(jackpot?280:200)+Math.random()*60+'px');
        cabEl.appendChild(c);
        setTimeout(()=>c.remove(), 1700);
      }
      if(jackpot){
        C.flashScreen&&C.flashScreen();
        if(cabEl){ cabEl.classList.remove('jackpot-shake'); void cabEl.offsetWidth; cabEl.classList.add('jackpot-shake'); }
      }
    }
    // Texte de gain qui s'envole au-dessus des rouleaux ("+80", "JACKPOT !") et halo qui
    // traverse toute la cabine — sur CHAQUE gain (pas seulement jackpot), pour que la machine
    // se sente vivante même sur un petit gain. Purement décoratif, comme spawnCoins ci-dessus.
    function showWinText(text,jackpot){
      if(!cabEl) return;
      const t=document.createElement('div');
      t.className='win-burst'+(jackpot?' win-burst-jackpot':'');
      t.textContent=text;
      cabEl.appendChild(t);
      setTimeout(()=>t.remove(), 1300);
    }
    function pulseCabinet(jackpot){
      if(!cabEl) return;
      cabEl.classList.remove('win-glow'); void cabEl.offsetWidth; cabEl.classList.add('win-glow');
      setTimeout(()=>cabEl.classList.remove('win-glow'), jackpot?1500:900);
    }

    if(rows<=1){
      // ---- Mode classique (1 ligne, 3 rouleaux) — comportement strictement inchangé ----
      const reels=[el('reel0'), el('reel1'), el('reel2')];

      function doSpin(){
        if(spinning) return;
        if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
        spinning=true;
        C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
        C.sound&&C.sound('lever');
        lever.classList.add('pulled','disabled'); msg.textContent='Ça tourne...';
        reels.forEach(r=>{ beginSpinFx(r,1); r.classList.add('spin-active'); r.classList.remove('symbol-blink','jackpot-flourish'); });

        const results=[weighted(),weighted(),weighted()];
        const stopAt=[9,11,13]; let count=0;
        // Rythme "physique" plutôt qu'un tic strictement constant : les rouleaux défilent vite au
        // début puis ralentissent avant de s'arrêter, comme une vraie machine à sous. Seul le
        // RYTHME visuel change (le délai entre deux images s'allonge progressivement) — le tirage
        // et les indices d'arrêt (stopAt/results, déjà déterminés ci-dessus) restent identiques.
        function tick(){
          count++;
          reels.forEach((r,i)=>{ if(count<stopAt[i]){ r.textContent=weighted().icon; slowSpinFx(r,stopAt[i]-count); } });
          stopAt.forEach((s,i)=>{
            if(count===s){ reels[i].textContent=results[i].icon; endSpinFx(reels[i],[results[i].icon]); reels[i].classList.remove('spin-active'); bounceReel(reels[i]); }
          });
          if(count>=stopAt[2]){
            const icons=results.map(r=>r.icon);
            let win=0;
            if(icons[0]===icons[1]&&icons[1]===icons[2]){
              win=bet*results[0].payout;
              const jackpot=jackpotIcon!==null&&icons[0]===jackpotIcon;
              msg.textContent=(jackpot?'JACKPOT ! +':'Gagné ! +')+win+' jetons';
              blinkReels(reels, jackpot); showWinLine();
              if(jackpot){ C.sound&&C.sound('jackpot'); if(opts.onJackpot) opts.onJackpot(); }
              spawnCoins(jackpot?'jackpot':(results[0].payout>=15?'big':'small'));
              showWinText(jackpot?'JACKPOT !':'+'+win, jackpot); pulseCabinet(jackpot);
            } else if(icons[0]===icons[1]||icons[1]===icons[2]||icons[0]===icons[2]){
              win=Math.round(bet*pairMultiplier); msg.textContent='Petite paire, +'+win+' jetons';
              const matched=icons[0]===icons[1]?[reels[0],reels[1]]:(icons[1]===icons[2]?[reels[1],reels[2]]:[reels[0],reels[2]]);
              blinkReels(matched,false);
              showWinText('+'+win, false); pulseCabinet(false);
            } else {
              msg.textContent='Perdu, retente ta chance.'; C.flashLoss(reelsWrap);
            }
            C.state.balance+=win; C.saveBalance(); C.renderBalance();
            C.recordGame(opts.gameKey, bet, win); if(win>0) C.flashWin(msg);
            spinning=false; lever.classList.remove('pulled'); render();
            return;
          }
          setTimeout(tick, Math.min(58+count*count*0.85, 165));
        }
        setTimeout(tick, 58);
      }
      lever.addEventListener('click',doSpin);
    } else {
      // ---- Mode grille (rows>1, ex. Fortune Dragon 3x5) ----
      // Chaque .reel devient une colonne contenant `rows` symboles empilés (.symbol), générés
      // ici une seule fois. Même moteur de tirage (weighted()) et même règle de gain que le mode
      // classique ci-dessus, simplement appliquée à chaque ligne de la grille plutôt qu'à une
      // seule rangée de 3.
      const reelCols=[]; for(let c=0;c<cols;c++) reelCols.push(el('reel'+c));
      reelCols.forEach(col=>{
        col.classList.add('reel-grid'); col.innerHTML='';
        for(let r=0;r<rows;r++){ const cell=document.createElement('div'); cell.className='symbol'; cell.textContent=weighted().icon; col.appendChild(cell); }
      });
      const cellAt=(c,r)=>reelCols[c].children[r];

      function doSpinGrid(){
        if(spinning) return;
        if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
        spinning=true;
        C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
        C.sound&&C.sound('lever');
        lever.classList.add('pulled','disabled'); msg.textContent='Ça tourne...';
        reelCols.forEach(col=>{
          beginSpinFx(col,rows);
          col.classList.add('spin-active');
          Array.from(col.children).forEach(cell=>cell.classList.remove('symbol-blink','jackpot-flourish'));
        });

        // grid[r][c] = symbole final de la rangée r, colonne c
        const grid=[]; for(let r=0;r<rows;r++){ grid.push(Array.from({length:cols},()=>weighted())); }
        const stopAt=Array.from({length:cols},(_,c)=>9+c*4); // colonnes qui s'arrêtent l'une après l'autre
        let count=0;

        function tick(){
          count++;
          reelCols.forEach((col,c)=>{
            if(count<stopAt[c]){ Array.from(col.children).forEach(cell=>{ cell.textContent=weighted().icon; }); slowSpinFx(col,stopAt[c]-count); }
          });
          stopAt.forEach((s,c)=>{
            if(count===s){
              Array.from(reelCols[c].children).forEach((cell,r)=>{ cell.textContent=grid[r][c].icon; });
              endSpinFx(reelCols[c],grid.map(row=>row[c].icon));
              reelCols[c].classList.remove('spin-active');
              bounceReel(reelCols[c]);
            }
          });
          if(count>=stopAt[cols-1]){
            let win=0, anyJackpot=false, winningLines=0, maxLinePayout=0;
            const fullCells=[], pairCells=[];
            for(let r=0;r<rows;r++){
              const icons=grid[r].map(s=>s.icon);
              const counts={}; icons.forEach(ic=>counts[ic]=(counts[ic]||0)+1);
              let maxIcon=icons[0], maxCount=0;
              Object.keys(counts).forEach(ic=>{ if(counts[ic]>maxCount){ maxCount=counts[ic]; maxIcon=ic; } });
              if(maxCount===cols){
                const sym=grid[r].find(s=>s.icon===maxIcon);
                win+=bet*sym.payout; winningLines++;
                if(sym.payout>maxLinePayout) maxLinePayout=sym.payout;
                if(jackpotIcon!==null&&maxIcon===jackpotIcon) anyJackpot=true;
                for(let c=0;c<cols;c++) fullCells.push(cellAt(c,r));
              } else if(maxCount>=2){
                win+=Math.round(bet*pairMultiplier);
                for(let c=0;c<cols;c++) if(icons[c]===maxIcon) pairCells.push(cellAt(c,r));
              }
            }
            if(fullCells.length){
              msg.textContent=(anyJackpot?'JACKPOT ! +':'Gagné ! +')+win+' jetons'+(winningLines>1?' ('+winningLines+' lignes)':'');
              blinkReels(fullCells, anyJackpot); if(pairCells.length) blinkReels(pairCells,false); showWinLine();
              if(anyJackpot){ C.sound&&C.sound('jackpot'); if(opts.onJackpot) opts.onJackpot(); }
              spawnCoins(anyJackpot?'jackpot':(maxLinePayout>=15?'big':'small'));
              showWinText(anyJackpot?'JACKPOT !':'+'+win, anyJackpot); pulseCabinet(anyJackpot);
            } else if(pairCells.length){
              msg.textContent='Petite combinaison, +'+win+' jetons';
              blinkReels(pairCells,false);
              showWinText('+'+win,false); pulseCabinet(false);
            } else {
              msg.textContent='Perdu, retente ta chance.'; C.flashLoss(reelsWrap);
            }
            C.state.balance+=win; C.saveBalance(); C.renderBalance();
            C.recordGame(opts.gameKey, bet, win); if(win>0) C.flashWin(msg);
            spinning=false; lever.classList.remove('pulled'); render();
            return;
          }
          setTimeout(tick, Math.min(58+count*count*0.85, 165));
        }
        setTimeout(tick, 58);
      }
      lever.addEventListener('click',doSpinGrid);
    }

    render();
  };
})();
