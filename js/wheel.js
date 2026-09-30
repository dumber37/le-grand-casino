/* ============================================================
   ROUE DE LA CHANCE QUOTIDIENNE — un tour gratuit par jour civil
   (UTC, même convention que le streak/les missions dans core.js),
   récompense tirée au sort parmi TIERS (pondérée, même technique
   que weighted() du moteur de machines à sous, voir slot-engine.js).
   Ne mise rien : ni trackWager ni impact sur le statut VIP (basé sur
   le total misé) — c'est un cadeau, pas un pari.
   ============================================================ */
(function(){
  const C=window.Casino;
  const LAST_KEY='grand-casino-wheel-last';
  const TIERS=[
    {value:20, weight:26},
    {value:30, weight:22},
    {value:50, weight:18},
    {value:75, weight:14},
    {value:50, weight:18},
    {value:100, weight:9},
    {value:30, weight:22},
    {value:250, weight:3}
  ];
  const COLORS=['#8a6a1f','#a3812a','#d4af37','#c9302c','#1f6b3a','#2a9560','#a3812a','#f2d675'];
  let spinning=false, wheelRotation=0;
  const wheelEl=document.getElementById('wh-wheel'), stageEl=document.querySelector('#view-wheel .wh-stage');
  const msg=document.getElementById('wh-message'), spinBtn=document.getElementById('wh-spinBtn');
  const homeSub=document.getElementById('wheel-home-sub');
  if(!wheelEl||!spinBtn) return;

  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function alreadySpunToday(){ try{ return localStorage.getItem(LAST_KEY)===todayStr(); }catch(e){ return false; } }

  function buildWheel(){
    const seg=360/TIERS.length;
    wheelEl.style.background='conic-gradient('+TIERS.map((t,i)=>COLORS[i]+' '+(i*seg)+'deg '+((i+1)*seg)+'deg').join(',')+')';
    wheelEl.innerHTML=TIERS.map((t,i)=>{
      const angle=i*seg+seg/2;
      return '<span class="wh-label" style="transform:translate(-50%,-50%) rotate('+angle+'deg) translateY(-84px) rotate('+(-angle)+'deg)">'+t.value+'</span>';
    }).join('');
  }
  function weightedIndex(){
    const total=TIERS.reduce((s,t)=>s+t.weight,0); let r=Math.random()*total;
    for(let i=0;i<TIERS.length;i++){ if(r<TIERS[i].weight) return i; r-=TIERS[i].weight; }
    return 0;
  }
  function updateStatus(){
    const done=alreadySpunToday();
    spinBtn.disabled=done||spinning;
    if(msg&&!spinning) msg.textContent=done?'Tu as déjà tourné la roue aujourd’hui — reviens demain !':'Un spin gratuit t’attend aujourd’hui !';
    if(homeSub) homeSub.textContent=done?'Reviens demain pour un nouveau tour.':'Un spin gratuit t’attend !';
  }
  function spin(){
    if(spinning||alreadySpunToday()) return;
    spinning=true; updateStatus();
    if(stageEl) stageEl.classList.add('spinning');
    msg.textContent='La roue tourne...';
    C.sound&&C.sound('spin');
    const idx=weightedIndex();
    const seg=360/TIERS.length;
    const segCenter=idx*seg+seg/2;
    // Même technique que la roulette (roulette.js) : angle cible ramené dans [0,360),
    // delta depuis la position actuelle, plusieurs tours complets ajoutés par-dessus.
    const target=((-segCenter)%360+360)%360;
    const currentMod=((wheelRotation%360)+360)%360;
    const delta=((target-currentMod)+360)%360;
    wheelRotation+=6*360+delta;
    wheelEl.style.transform='rotate('+wheelRotation+'deg)';
    setTimeout(()=>{
      if(stageEl) stageEl.classList.remove('spinning');
      const reward=TIERS[idx].value;
      C.state.balance+=reward; C.saveBalance(); C.renderBalance();
      C.recordGame('wheel', 0, reward);
      try{ localStorage.setItem(LAST_KEY, todayStr()); }catch(e){}
      msg.textContent='Tu gagnes '+reward+' jetons !';
      C.flashWin(msg);
      spinning=false; updateStatus();
    }, 4300);
  }
  spinBtn.addEventListener('click', spin);
  buildWheel(); updateStatus();
})();
