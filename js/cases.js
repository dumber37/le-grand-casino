/* ============================================================
   OUVERTURE DE CAISSES — façon "case opening" : bandeau d'objets
   qui défile puis ralentit sur un objet déterminé à l'avance
   (résultat calculé avant l'animation, comme les rouleaux des
   machines à sous). La rareté de l'objet fixe le multiplicateur
   de gain appliqué au prix de la caisse. Objets et caisses sont
   100% fictifs (aucune marque, aucun skin réel).
   ============================================================ */
(function(){
  const C=window.Casino;

  const RARITIES=[
    {key:'consumer',   label:'Qualité Courante', color:'#b0c3d9', weight:6500, mult:[0.10,0.35]},
    {key:'milspec',    label:'Qualité Militaire', color:'#4b69ff', weight:2500, mult:[0.40,0.90]},
    {key:'restricted', label:'Restreinte',        color:'#8847ff', weight:750,  mult:[1.00,1.80]},
    {key:'classified', label:'Classée',           color:'#d32ce6', weight:200,  mult:[2.50,4.50]},
    {key:'covert',     label:'Secrète',           color:'#eb4b4b', weight:45,   mult:[6.00,12.00]},
    {key:'rare',       label:'Exceptionnelle ★',  color:'#ffd700', weight:5,    mult:[40.00,100.00]}
  ];
  const CASES=[
    {key:'bronze', name:'Caisse Bronze', icon:'📦', price:50, items:[
      {rarity:'consumer',   icon:'🔫', name:'Pistolet Rouillé | Fracture'},
      {rarity:'milspec',    icon:'🔫', name:'Fusil Urbain | Fracture'},
      {rarity:'restricted', icon:'🔫', name:'Mitraillette Violette | Fracture'},
      {rarity:'classified', icon:'🔫', name:'Fusil à Pompe Rose | Fracture'},
      {rarity:'covert',     icon:'🗡️', name:'Lame Écarlate | Fracture'},
      {rarity:'rare',       icon:'🔪', name:'★ Couteau Doré | Fracture'}
    ]},
    {key:'argent', name:'Caisse Argent', icon:'🎁', price:150, items:[
      {rarity:'consumer',   icon:'🔫', name:'Pistolet Terne | Néon'},
      {rarity:'milspec',    icon:'🔫', name:'Carabine Azur | Néon'},
      {rarity:'restricted', icon:'🔫', name:'Fusil Électrique | Néon'},
      {rarity:'classified', icon:'🔫', name:'Sniper Fluo | Néon'},
      {rarity:'covert',     icon:'🗡️', name:'Dague Cramoisie | Néon'},
      {rarity:'rare',       icon:'🧤', name:'★ Gants Dorés | Néon'}
    ]},
    {key:'or', name:'Caisse Or', icon:'💰', price:400, items:[
      {rarity:'consumer',   icon:'🔫', name:'Revolver Patiné | Prestige'},
      {rarity:'milspec',    icon:'🔫', name:'Fusil Saphir | Prestige'},
      {rarity:'restricted', icon:'🔫', name:'AR Améthyste | Prestige'},
      {rarity:'classified', icon:'🔫', name:'Sniper Magenta | Prestige'},
      {rarity:'covert',     icon:'🗡️', name:'Katana Rubis | Prestige'},
      {rarity:'rare',       icon:'🔪', name:'★ Couteau Papillon Doré | Prestige'}
    ]}
  ];

  const caseGridEl=document.getElementById('cs-caseGrid'), trackEl=document.getElementById('cs-track'), reelWrapEl=document.getElementById('cs-reelWrap');
  const resultEl=document.getElementById('cs-result'), resultIcon=document.getElementById('cs-resultIcon'), resultName=document.getElementById('cs-resultName'), resultRarity=document.getElementById('cs-resultRarity'), resultWin=document.getElementById('cs-resultWin');
  const msg=document.getElementById('cs-message'), openBtn=document.getElementById('cs-openBtn'), priceLabel=document.getElementById('cs-priceLabel');
  let selectedIdx=0, spinning=false;

  function weightedRarity(){
    const total=RARITIES.reduce((s,r)=>s+r.weight,0); let r=Math.random()*total;
    for(const rar of RARITIES){ if(r<rar.weight) return rar; r-=rar.weight; }
    return RARITIES[0];
  }
  function renderCaseGrid(){
    caseGridEl.innerHTML=CASES.map((c,i)=>
      '<div class="cs-case'+(i===selectedIdx?' sel':'')+'" data-idx="'+i+'" role="button" tabindex="0" aria-pressed="'+(i===selectedIdx?'true':'false')+'" aria-label="'+c.name+', '+c.price+' jetons">'
      +'<div class="cs-case-icon">'+c.icon+'</div><div class="cs-case-name">'+c.name+'</div><div class="cs-case-price">'+c.price+' 🪙</div>'
      +'</div>'
    ).join('');
  }
  function selectCase(el){
    if(spinning||!el) return;
    selectedIdx=parseInt(el.dataset.idx,10); renderCaseGrid(); render();
  }
  caseGridEl.addEventListener('click',(e)=>selectCase(e.target.closest('.cs-case')));
  // Accessible au clavier : rôle bouton + focus déjà posés au rendu, Entrée/Espace sélectionnent
  // la caisse comme un clic (même délégation d'événement que le clic).
  caseGridEl.addEventListener('keydown',(e)=>{
    if(e.key!=='Enter'&&e.key!==' ') return;
    const el=e.target.closest('.cs-case'); if(!el) return;
    e.preventDefault(); selectCase(el);
  });
  function renderItemCell(item){
    return '<div class="cs-cell cs-r-'+item.rarity+'"><div class="cs-cell-icon">'+item.icon+'</div><div class="cs-cell-name">'+item.name+'</div></div>';
  }
  function spawnSparkles(){
    for(let i=0;i<14;i++){
      const s=document.createElement('span'); s.className='cs-sparkle'; s.textContent='✨';
      s.style.left=(10+Math.random()*80)+'%'; s.style.animationDelay=(Math.random()*300)+'ms';
      resultEl.appendChild(s);
      setTimeout(()=>s.remove(),1300);
    }
  }
  function render(){
    const c=CASES[selectedIdx];
    priceLabel.textContent=c.price;
    openBtn.disabled=spinning||C.state.balance<c.price;
  }
  function openCase(){
    if(spinning) return;
    const c=CASES[selectedIdx];
    if(C.state.balance<c.price){ msg.textContent='Solde insuffisant.'; return; }
    spinning=true; render();
    resultEl.classList.remove('show','cs-r-consumer','cs-r-milspec','cs-r-restricted','cs-r-classified','cs-r-covert','cs-r-rare');
    C.state.balance-=c.price; C.trackWager(c.price); C.saveBalance(); C.renderBalance();
    C.sound&&C.sound('spin');
    msg.textContent='Ouverture en cours...';

    const picked=weightedRarity();
    const item=c.items.find(it=>it.rarity===picked.key);
    const mult=picked.mult[0]+Math.random()*(picked.mult[1]-picked.mult[0]);
    const win=Math.round(c.price*mult);

    const CELL=104, TARGET=54, LEN=64;
    const strip=[];
    for(let i=0;i<LEN;i++){ strip.push(i===TARGET?item:c.items[Math.floor(Math.random()*c.items.length)]); }
    trackEl.style.transition='none';
    trackEl.style.transform='translateX(0px)';
    trackEl.innerHTML=strip.map(renderItemCell).join('');
    // void offsetWidth force le navigateur à "figer" l'état de départ (transform:0, sans
    // transition) avant qu'on change à nouveau transform juste en dessous — c'est ce qui
    // garantit une vraie transition animée plutôt qu'un saut direct. Contrairement à
    // requestAnimationFrame (utilisé avant ici), ce reflow est synchrone : il ne dépend pas
    // d'une frame de rendu, donc il ne peut jamais rester bloqué si l'onglet est en arrière-plan.
    void trackEl.offsetWidth;
    const visible=reelWrapEl.clientWidth;
    const jitter=(Math.random()*36-18);
    const finalX=-(TARGET*CELL - visible/2 + CELL/2) + jitter;
    trackEl.style.transition='transform 4.2s cubic-bezier(.1,.7,.15,1)';
    trackEl.style.transform='translateX('+finalX+'px)';
    // Filet de sécurité : si transitionend ne se déclenche jamais pour une raison quelconque
    // (onglet resté caché pendant toute l'animation, moteur de rendu inhabituel...), la caisse
    // ne doit jamais rester bloquée en "spinning" pour toujours — on force la résolution après
    // un délai confortablement plus long que les 4,2s de l'animation.
    let settled=false;
    const settle=()=>{ if(settled) return; settled=true; clearTimeout(safety); finishOpen(item, win, picked, c); };
    const safety=setTimeout(settle,5500);
    trackEl.addEventListener('transitionend', settle, {once:true});
  }
  function finishOpen(item, win, rarity, c){
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    resultIcon.textContent=item.icon; resultName.textContent=item.name;
    resultRarity.textContent=rarity.label; resultRarity.style.color=rarity.color;
    resultWin.textContent='+'+win+' jetons';
    resultEl.className='cs-result show cs-r-'+rarity.key;
    msg.textContent=win>=c.price?'Belle pioche !':'Objet obtenu.';
    if(rarity.key==='rare'){ C.sound&&C.sound('jackpot'); spawnSparkles(); }
    else { C.sound&&C.sound('reveal'); }
    C.recordGame('cases', c.price, win);
    if(win>=c.price) C.flashWin(msg); else C.flashLoss(resultEl);
    spinning=false; render();
  }
  openBtn.addEventListener('click',openCase);
  document.addEventListener('balance-changed',render);
  renderCaseGrid(); render();
})();
