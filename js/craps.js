/* ============================================================
   CRAPS — pass line simplifié : un coup "come out" (7/11 gagne
   d'entrée, 2/3/12 perd d'entrée), sinon le total établit "le point"
   et on relance jusqu'à refaire ce total (gagné) ou un 7 ("seven
   out", perdu). Paiement 1:1, comme une vraie pass line.
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=20, phase='comeout', point=null, rolling=false, roundBet=0;
  const betEl=document.getElementById('cp-betAmount'), msg=document.getElementById('cp-message');
  const rollBtn=document.getElementById('cp-rollBtn');
  const betMinus=document.getElementById('cp-betMinus'), betPlus=document.getElementById('cp-betPlus');
  const diceEl=document.getElementById('cp-dice'), die1El=document.getElementById('cp-die1'), die2El=document.getElementById('cp-die2');
  const pointEl=document.getElementById('cp-point');
  if(!rollBtn) return;

  const PIP_LAYOUTS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  function dieFaceHtml(v){
    const active=PIP_LAYOUTS[v]||[];
    let s='';
    for(let i=0;i<9;i++) s+='<span class="pip'+(active.includes(i)?' on':'')+'"></span>';
    return s;
  }
  function setDie(el,v){ el.innerHTML=dieFaceHtml(v); }

  function render(){
    betEl.textContent=bet;
    rollBtn.disabled=rolling||(phase==='comeout'&&C.state.balance<bet);
    betMinus.disabled=betPlus.disabled=(phase!=='comeout');
  }
  betMinus.addEventListener('click',()=>{ if(phase==='comeout'){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(phase==='comeout'){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',render);

  function finish(win,message){
    msg.textContent=message;
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('craps', roundBet, win);
    if(win>0) C.flashWin(msg); else C.flashLoss(diceEl);
    phase='comeout'; point=null; pointEl.textContent='–';
    rollBtn.textContent='LANCER'; rolling=false; render();
  }
  function resolveRoll(sum){
    if(phase==='comeout'){
      if(sum===7||sum===11){ finish(roundBet*2, 'Naturel '+sum+' ! +'+(roundBet*2)+' jetons'); }
      else if(sum===2||sum===3||sum===12){ finish(0, 'Craps ('+sum+') — perdu dès le premier lancer.'); }
      else {
        point=sum; phase='point'; pointEl.textContent=point;
        msg.textContent='Point établi : '+point+'. Refais ce total avant un 7 !';
        rollBtn.textContent='RELANCER'; rolling=false; render();
      }
    } else {
      if(sum===point){ finish(roundBet*2, 'Point '+point+' refait ! +'+(roundBet*2)+' jetons'); }
      else if(sum===7){ finish(0, 'Seven out — perdu.'); }
      else { msg.textContent='('+sum+') — pas encore. Refais '+point+' avant un 7.'; rolling=false; render(); }
    }
  }
  function roll(){
    if(rolling) return;
    if(phase==='comeout'){
      if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
      roundBet=bet;
      C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    }
    rolling=true; render();
    C.sound&&C.sound('spin');
    msg.textContent='Les dés roulent...';
    const T=1150, animate=document.documentElement.getAttribute('data-motion')!=='reduce'&&die1El.animate;
    if(animate) tumble(T); else diceEl.classList.add('rolling');
    setTimeout(()=>{
      const d1=1+Math.floor(Math.random()*6), d2=1+Math.floor(Math.random()*6);
      clearInterval(faceTimer);
      setDie(die1El,d1); setDie(die2El,d2);
      diceEl.classList.remove('rolling');
      C.sound&&C.sound('card');
      resolveRoll(d1+d2);
    }, T);
  }
  // Les dés sont LANCÉS depuis le bord de la table : ils roulent en tournant, rebondissent deux fois
  // en perdant de la hauteur et s'immobilisent, pendant que leur face change à chaque tour (animation
  // seule : les valeurs finales sont tirées juste après, comme avant). Rotation finale = multiple de
  // 360° et motifs symétriques à 180° : la face affichée à l'arrêt est toujours lisible à l'endroit.
  let faceTimer=null;
  function tumble(T){
    [die1El,die2El].forEach((die,i)=>{
      const s=i?1:-1;
      die.animate([
        {transform:'translate('+(s*-110)+'px,-70px) rotate('+(s*-240)+'deg) scale(.7)',opacity:0,offset:0},
        {opacity:1,offset:.12},
        {transform:'translate('+(s*-55)+'px,6px) rotate('+(s*120)+'deg) scale(1.05)',offset:.34},
        {transform:'translate('+(s*-22)+'px,-30px) rotate('+(s*300)+'deg) scale(1.02)',offset:.5},
        {transform:'translate('+(s*-6)+'px,3px) rotate('+(s*470)+'deg) scale(1)',offset:.7},
        {transform:'translate('+(s*-1)+'px,-9px) rotate('+(s*600)+'deg) scale(1)',offset:.84},
        {transform:'translate(0,0) rotate('+(s*720)+'deg) scale(1)',opacity:1,offset:1}
      ],{duration:T,delay:i*90,easing:'cubic-bezier(.3,.6,.4,1)',fill:'backwards'});
    });
    setTimeout(()=>{ C.sound&&C.sound('clack'); },T*.34);
    setTimeout(()=>{ C.sound&&C.sound('clack'); },T*.7);
    clearInterval(faceTimer);
    faceTimer=setInterval(()=>{ setDie(die1El,1+Math.floor(Math.random()*6)); setDie(die2El,1+Math.floor(Math.random()*6)); },95);
  }
  rollBtn.addEventListener('click', roll);
  setDie(die1El,1); setDie(die2El,1);
  render();
})();
