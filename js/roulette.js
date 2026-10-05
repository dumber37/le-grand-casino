/* ============================================================
   ROULETTE
   ============================================================ */
(function(){
  const C=window.Casino;
  // Rouge/noir alterne parfaitement tout autour de la roue (sauf au niveau du zéro, neutre) —
  // c'est la répartition standard de la roulette européenne. 28 est noir et 36 est rouge :
  // une inversion ici (28 à la place de 36) cassait l'alternance à deux endroits de la roue.
  const RED=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const WHEEL_ORDER=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const N=WHEEL_ORDER.length, segAngle=360/N;
  function colorOf(n){ if(n===0) return 'vert'; return RED.includes(n)?'rouge':'noir'; }
  function colorHex(c){ return c==='vert'?'#1f7a44':(c==='rouge'?'#a3352f':'#161616'); }

  const wheelEl=document.getElementById('r-wheel'), ballOrbitEl=document.getElementById('r-ballOrbit');
  const stops=[]; WHEEL_ORDER.forEach((n,i)=>{ const c=colorHex(colorOf(n)); stops.push(c+' '+(i*segAngle)+'deg '+((i+1)*segAngle)+'deg'); });
  wheelEl.style.background='conic-gradient('+stops.join(',')+')';
  const radius=98;
  const wheelNumberSpans={};
  WHEEL_ORDER.forEach((n,i)=>{
    const angle=i*segAngle+segAngle/2;
    const span=document.createElement('span'); span.className='num'; span.textContent=n;
    span.style.transform='translate(-50%,-50%) rotate('+angle+'deg) translateY(-'+radius+'px)';
    wheelEl.appendChild(span);
    wheelNumberSpans[n]=span;
  });
  const wheelWrapEl=document.querySelector('#view-roulette .wheel-wrap');

  // ---- Table de mise : grille 1-36 générée à partir de RED (source unique de vérité,
  // partagée avec la couleur de la roue — aucune duplication de la répartition rouge/noir). ----
  const numbersGridEl=document.getElementById('r-numbersGrid');
  const zeroEl=document.getElementById('r-zero');
  const tableCells={0:zeroEl}; // n -> élément cliquable de la table (mise en plein)
  for(let row=0; row<3; row++){
    for(let col=1; col<=12; col++){
      const n = col*3 - (2-row); // row0(haut)=3c-2, row1(milieu)=3c-1, row2(bas)=3c
      const cell=document.createElement('button');
      cell.className='rl-cell '+(RED.includes(n)?'rl-red':'rl-black');
      cell.textContent=n; cell.dataset.num=n;
      numbersGridEl.appendChild(cell);
      tableCells[n]=cell;
    }
  }

  // ---- Historique des derniers numéros (session courante, non persisté) ----
  const historyEl=document.getElementById('r-history');
  const spinHistory=[];
  function renderSpinHistory(){
    historyEl.innerHTML=spinHistory.slice(-10).reverse().map(h=>{
      const cls=h.color==='rouge'?'rl-h-red':(h.color==='noir'?'rl-h-black':'rl-h-green');
      return '<span class="'+cls+'">'+h.n+'</span>';
    }).join('');
  }

  let bet=20, selected=null, spinning=false, wheelRotation=0, ballRotation=0;
  const betEl=document.getElementById('r-betAmount'), msg=document.getElementById('r-message');
  const resultText=document.getElementById('r-resultText'), spinBtn=document.getElementById('r-spinBtn');

  // ---- Sélection de mise : un seul type actif à la fois, réutilisé par toute la table
  // (zéro, numéros pleins, colonnes 2:1, douzaines, rouge/noir/pair/impair/manque/passe). ----
  function clearSelection(){
    Object.values(tableCells).forEach(el=>el.classList.remove('sel'));
    document.querySelectorAll('#view-roulette .rl-col.sel, #view-roulette .rl-out.sel').forEach(el=>el.classList.remove('sel'));
  }
  function selectPlein(n, el){ clearSelection(); el.classList.add('sel'); selected={type:'plein', n}; msg.textContent='Mise en plein sur '+n+' sélectionnée.'; }
  Object.entries(tableCells).forEach(([n,el])=>{
    el.addEventListener('click',()=>{ if(spinning) return; selectPlein(parseInt(n,10), el); });
  });
  const BET_LABELS={
    rouge:'Rouge', noir:'Noir', pair:'Pair', impair:'Impair', manque:'1 à 18', passe:'19 à 36',
    douzaine1:'1ère douzaine', douzaine2:'2e douzaine', douzaine3:'3e douzaine',
    colonne1:'1ère colonne', colonne2:'2e colonne', colonne3:'3e colonne'
  };
  document.querySelectorAll('#view-roulette .rl-col, #view-roulette .rl-out').forEach(b=>{
    b.addEventListener('click',()=>{
      if(spinning) return;
      clearSelection(); b.classList.add('sel'); selected={type:b.dataset.bet};
      msg.textContent='Mise sélectionnée : '+(BET_LABELS[b.dataset.bet]||b.dataset.bet)+'.';
    });
  });

  function render(){ betEl.textContent=bet; spinBtn.disabled=spinning||C.state.balance<bet; }
  document.getElementById('r-betMinus').addEventListener('click',()=>{if(!spinning){bet=Math.max(5,bet-5);render();}});
  document.getElementById('r-betPlus').addEventListener('click',()=>{if(!spinning){bet=Math.min(100,bet+5);render();}});
  document.addEventListener('balance-changed',render);

  function doSpin(){
    if(spinning) return;
    if(!selected){ msg.textContent='Choisis une mise avant de lancer.'; return; }
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    spinning=true; C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance(); render();
    C.sound&&C.sound('spin');
    msg.textContent='La bille tourne...'; resultText.textContent='–';
    Object.values(tableCells).forEach(el=>el.classList.remove('win-pulse'));
    document.querySelectorAll('#view-roulette .rl-col.win-pulse, #view-roulette .rl-out.win-pulse').forEach(el=>el.classList.remove('win-pulse'));

    const result=Math.floor(Math.random()*37);
    const col=colorOf(result);
    const idx=WHEEL_ORDER.indexOf(result);
    const segCenter=idx*segAngle+segAngle/2;
    const target=((-segCenter)%360+360)%360;
    const currentMod=((wheelRotation%360)+360)%360;
    const delta=((target-currentMod)+360)%360;
    wheelRotation+=5*360+delta;
    ballRotation-=9*360;
    wheelEl.style.transform='rotate('+wheelRotation+'deg)';
    ballOrbitEl.style.transform='rotate('+ballRotation+'deg)';
    animateBall();

    setTimeout(()=>{
      let win=0;
      if(selected.type==='plein'){ if(result===selected.n) win=bet*36; }
      else if(selected.type==='rouge'){ if(col==='rouge') win=bet*2; }
      else if(selected.type==='noir'){ if(col==='noir') win=bet*2; }
      else if(selected.type==='pair'){ if(result!==0&&result%2===0) win=bet*2; }
      else if(selected.type==='impair'){ if(result%2===1) win=bet*2; }
      else if(selected.type==='manque'){ if(result>=1&&result<=18) win=bet*2; }
      else if(selected.type==='passe'){ if(result>=19&&result<=36) win=bet*2; }
      else if(selected.type==='douzaine1'){ if(result>=1&&result<=12) win=bet*3; }
      else if(selected.type==='douzaine2'){ if(result>=13&&result<=24) win=bet*3; }
      else if(selected.type==='douzaine3'){ if(result>=25&&result<=36) win=bet*3; }
      else if(selected.type==='colonne1'){ if(result!==0&&result%3===1) win=bet*3; }
      else if(selected.type==='colonne2'){ if(result!==0&&result%3===2) win=bet*3; }
      else if(selected.type==='colonne3'){ if(result!==0&&result%3===0) win=bet*3; }
      resultText.textContent=result+' — '+col.charAt(0).toUpperCase()+col.slice(1);
      resultText.style.color=col==='rouge'?'var(--red)':(col==='noir'?'var(--cream)':'#4fce85');
      msg.textContent=win>0?('Gagné +'+win+' jetons'):'Perdu';
      // Petit rebond de la bille au moment où elle se pose, comme une vraie bille qui
      // finit de rouler dans la case plutôt que de s'arrêter net.
      const ballEl=ballOrbitEl.querySelector('.ball');
      if(ballEl){ ballEl.classList.remove('ball-settle'); void ballEl.offsetWidth; ballEl.classList.add('ball-settle'); }

      spinHistory.push({n:result, color:col}); renderSpinHistory();

      // Animation signature : la case gagnante pulse/brille — sur la roue et sur la table.
      Object.values(wheelNumberSpans).forEach(s=>s.classList.remove('wheel-num-win'));
      const winSpan=wheelNumberSpans[result];
      if(winSpan){ void winSpan.offsetWidth; winSpan.classList.add('wheel-num-win'); }
      const winCell=tableCells[result];
      if(winCell){ void winCell.offsetWidth; winCell.classList.add('win-pulse'); }
      // La mise extérieure gagnante (rouge/noir/douzaine/colonne...) pulse aussi elle-même :
      // avant, seule la case du numéro pulsait, jamais le bouton de mise réellement cliqué.
      if(win>0){
        const selEl=document.querySelector('#view-roulette .rl-col.sel, #view-roulette .rl-out.sel');
        if(selEl){ selEl.classList.remove('win-pulse'); void selEl.offsetWidth; selEl.classList.add('win-pulse'); }
      }

      if(win<=0) C.flashLoss(wheelWrapEl);
      C.state.balance+=win; C.saveBalance(); C.renderBalance();
      C.recordGame('roulette', bet, win); if(win>0) C.flashWin(msg);
      spinning=false; render();
    },SPIN_MS+50);
  }
  // Trajectoire de la bille (purement visuelle : le numéro est déjà tiré et la roue s'arrête dessus).
  // Elle court d'abord sur la piste extérieure (translateY négatif = plus près du bord), ralentit,
  // puis tombe vers les alvéoles en rebondissant sur les séparateurs avant de se poser. Une seule
  // animation sur .ball (jamais sur l'orbite, déjà animée par transition) : le rebond final
  // .ball-settle (CSS) prend le relais une fois celle-ci terminée.
  const SPIN_MS=5000, HOPS=[0.70,0.80,0.88,0.95];
  function animateBall(){
    const ballEl=ballOrbitEl.querySelector('.ball');
    if(!ballEl||!ballEl.animate||document.documentElement.getAttribute('data-motion')==='reduce') return;
    ballEl.classList.remove('ball-settle');
    const a=ballEl.animate([
      {transform:'translateY(-9px)',offset:0},
      {transform:'translateY(-9px)',offset:.5},
      {transform:'translateY(-5px)',offset:.62},
      {transform:'translateY(3px)',offset:.70},
      {transform:'translateY(-4px)',offset:.76},
      {transform:'translateY(2px)',offset:.82},
      {transform:'translateY(-2px)',offset:.88},
      {transform:'translateY(1px)',offset:.93},
      {transform:'translateY(0px)',offset:1}
    ],{duration:SPIN_MS,easing:'linear',fill:'forwards'});
    a.onfinish=a.oncancel=()=>{ try{ a.cancel(); }catch(e){} };
    HOPS.forEach(p=>setTimeout(()=>{ C.sound&&C.sound('hop'); },SPIN_MS*p));
  }
  spinBtn.addEventListener('click',doSpin);
  render();
})();
