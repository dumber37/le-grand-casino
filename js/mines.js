/* ============================================================
   MINES
   ============================================================ */
(function(){
  const C=window.Casino;
  const N=25;
  let bet=20, minesCount=3, board=[], revealed=[], active=false, revealsCount=0;
  const betEl=document.getElementById('mn-betAmount'), msg=document.getElementById('mn-message');
  const gridEl=document.getElementById('mn-grid'), potentialEl=document.getElementById('mn-potential'), multEl=document.getElementById('mn-mult');
  const startBtn=document.getElementById('mn-startBtn'), actionsEl=document.getElementById('mn-actions'), cashoutBtn=document.getElementById('mn-cashoutBtn');
  const infoEl=document.getElementById('mn-infoDetail');
  const INFO_BASE="Le multiplicateur suit les probabilités réelles : à chaque case sûre révélée, il est multiplié par (cases restantes) / (cases sûres restantes parmi elles), avec une marge de la maison de 3% (facteur ×0,97). Moins il reste de cases sûres par rapport au total, plus il grimpe vite.";
  // Mode transparence : chiffres réels de la manche en cours une fois qu'elle a démarré —
  // purement pédagogique, ne change rien au tirage des mines ni au calcul du multiplicateur.
  function renderMinesInfo(){
    if(!infoEl) return;
    infoEl.textContent = active
      ? INFO_BASE+' Cette manche : '+minesCount+' mines, '+revealsCount+' case(s) sûre(s) révélée(s) → multiplicateur actuel x'+multiplierFor(revealsCount).toFixed(2)+'.'
      : INFO_BASE;
  }
  document.querySelectorAll('#view-mines .roulette-grid button').forEach(b=>{
    b.addEventListener('click',()=>{ if(active) return; document.querySelectorAll('#view-mines .roulette-grid button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); minesCount=parseInt(b.dataset.mines,10); });
  });
  function buildGrid(){
    gridEl.innerHTML='';
    for(let i=0;i<N;i++){
      const cell=document.createElement('div'); cell.className='mines-cell';
      // Case personnalisée (div) rendue accessible au clavier : rôle bouton, focus (tabindex),
      // et Entrée/Espace déclenchent la révélation comme un clic — sans toucher au clic souris existant.
      cell.setAttribute('role','button'); cell.setAttribute('tabindex','0'); cell.setAttribute('aria-label','Case '+(i+1));
      cell.addEventListener('click',()=>reveal(i));
      cell.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); reveal(i); } });
      gridEl.appendChild(cell);
    }
  }
  buildGrid();
  function multiplierFor(k){ let m=1; for(let i=0;i<k;i++){ m*=(N-i)/(N-minesCount-i); } return m*0.97; }
  function render(){ betEl.textContent=bet; startBtn.disabled=active||C.state.balance<bet; }
  document.getElementById('mn-betMinus').addEventListener('click',()=>{if(!active){bet=Math.max(5,bet-5);render();}});
  document.getElementById('mn-betPlus').addEventListener('click',()=>{if(!active){bet=Math.min(100,bet+5);render();}});
  document.addEventListener('balance-changed',render);
  function start(){
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
    board=new Array(N).fill('safe');
    let placed=0; while(placed<minesCount){ const idx=Math.floor(Math.random()*N); if(board[idx]!=='mine'){ board[idx]='mine'; placed++; } }
    revealed=new Array(N).fill(false); revealsCount=0; active=true;
    buildGrid(); multEl.textContent='1.00'; potentialEl.textContent=bet;
    msg.textContent='Choisis une case.'; actionsEl.style.display='flex'; render(); renderMinesInfo();
  }
  function endRound(win,text,isMineHit){
    active=false; actionsEl.style.display='none';
    Array.from(gridEl.children).forEach((cell,i)=>{ if(!cell.classList.contains('revealed')){ cell.classList.add('revealed', board[i]==='mine'?'mine':'safe'); cell.textContent=board[i]==='mine'?'💣':'💎'; if(board[i]!=='mine') cell.classList.add('diamond-twinkle'); } });
    // Animation signature : la mine qui explose secoue toute la grille (pas juste la case).
    if(isMineHit){ gridEl.classList.remove('grid-shake'); void gridEl.offsetWidth; gridEl.classList.add('grid-shake'); }
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('mines', bet, win); if(win>0) C.flashWin(msg);
    msg.textContent=text; render(); renderMinesInfo();
  }
  function reveal(i){
    if(!active||revealed[i]) return;
    revealed[i]=true; const cell=gridEl.children[i];
    if(board[i]==='mine'){ cell.classList.add('revealed','mine'); cell.textContent='💣'; endRound(0,'Boom ! Perdu.', true); return; }
    cell.classList.add('revealed','safe','diamond-twinkle'); cell.textContent='💎'; revealsCount++;
    C.sound&&C.sound('reveal');
    const mult=multiplierFor(revealsCount);
    multEl.textContent=mult.toFixed(2); potentialEl.textContent=Math.round(bet*mult);
    renderMinesInfo();
    if(revealsCount>=N-minesCount){ endRound(Math.round(bet*mult), 'Grille terminée ! +'+Math.round(bet*mult)+' jetons'); }
  }
  cashoutBtn.addEventListener('click',()=>{ if(!active) return; const mult=multiplierFor(revealsCount); const win=Math.round(bet*mult); endRound(win, 'Encaissé ! +'+win+' jetons'); });
  startBtn.addEventListener('click',start);
  render();
})();
