/* ============================================================
   DÉFI DU JOUR À SEED PARTAGÉE — les 10 numéros "tirés" aujourd'hui
   sont EXACTEMENT les mêmes pour tout le monde (calculés uniquement à
   partir de la date du jour, jamais de Math.random ici) : sans serveur
   central, c'est ce qui permet de comparer équitablement ses numéros
   trouvés avec un ami qui joue le même jour — chacun choisit ses
   propres numéros, mais affronte le même tirage.
   Un seul essai par jour civil (UTC, même convention que la roue
   quotidienne/le streak). Récompense fixe selon le nombre de bons
   numéros — c'est un cadeau quotidien, pas un pari (pas de mise).
   ============================================================ */
(function(){
  const C=window.Casino;
  const N=40, MAXPICK=10;
  const STATE_KEY='grand-casino-daily-challenge';
  const REWARD_BY_MATCHES={0:10,1:10,2:10,3:25,4:60,5:150,6:350,7:700,8:1500,9:3000,10:8000};

  const gridEl=document.getElementById('dc-grid'), msg=document.getElementById('dc-message');
  const validateBtn=document.getElementById('dc-validateBtn'), resultEl=document.getElementById('dc-result');
  if(!gridEl||!validateBtn) return;

  function todayStr(){ return new Date().toISOString().slice(0,10); }

  // ---- PRNG déterministe (mulberry32) — jamais utilisé pour autre chose que ce tirage du jour,
  // jamais substitué à Math.random ailleurs dans l'app : les autres jeux restent inchangés. ----
  function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function mulberry32(seed){
    return function(){
      seed|=0; seed=(seed+0x6D2B79F5)|0;
      let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function todaysDrawnNumbers(){
    const rng=mulberry32(hashStr(todayStr()));
    const pool=[]; for(let i=1;i<=N;i++) pool.push(i);
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    return pool.slice(0,10);
  }

  function readState(){ try{ const raw=localStorage.getItem(STATE_KEY); return raw?JSON.parse(raw):null; }catch(e){ return null; } }
  function saveState(s){ try{ localStorage.setItem(STATE_KEY, JSON.stringify(s)); }catch(e){} }

  let picks=[];
  const state=readState();
  const playedToday = !!(state && state.date===todayStr());

  function buildGrid(){
    gridEl.innerHTML='';
    for(let i=1;i<=N;i++){
      const b=document.createElement('button'); b.type='button'; b.className='kn-num'; b.textContent=i; b.dataset.n=i;
      if(!playedToday){
        b.addEventListener('click',()=>{
          const idx=picks.indexOf(i);
          if(idx>=0){ picks.splice(idx,1); b.classList.remove('sel'); }
          else { if(picks.length>=MAXPICK) return; picks.push(i); b.classList.add('sel'); }
          validateBtn.disabled=picks.length===0;
        });
      }
      gridEl.appendChild(b);
    }
  }

  function showResult(s){
    const drawn=s.drawn;
    Array.from(gridEl.children).forEach(b=>{
      const n=parseInt(b.dataset.n,10);
      b.classList.toggle('sel', s.picks.includes(n));
      b.classList.toggle('hit', drawn.includes(n)&&s.picks.includes(n));
      b.classList.toggle('miss', drawn.includes(n)&&!s.picks.includes(n));
    });
    msg.textContent='Défi du jour terminé — reviens demain pour un nouveau tirage partagé.';
    resultEl.innerHTML='<div><span>Tes numéros</span><span>'+s.picks.join(', ')+'</span></div>'
      +'<div><span>Tirage du jour</span><span>'+drawn.slice().sort((a,b)=>a-b).join(', ')+'</span></div>'
      +'<div><span>Bons numéros</span><span>'+s.matches+' / '+s.picks.length+'</span></div>'
      +'<div><span>Récompense</span><span>+'+s.reward+' jetons</span></div>';
    validateBtn.disabled=true; validateBtn.textContent='DÉJÀ JOUÉ AUJOURD’HUI';
  }

  function validate(){
    if(playedToday||picks.length===0) return;
    const drawn=todaysDrawnNumbers();
    const matches=picks.filter(p=>drawn.includes(p)).length;
    const reward=REWARD_BY_MATCHES[matches]||0;
    C.state.balance+=reward; C.saveBalance(); C.renderBalance();
    C.recordGame('daily', 0, reward);
    const s={date:todayStr(), picks:picks.slice(), drawn, matches, reward};
    saveState(s);
    showResult(s);
    C.flashWin(msg);
  }

  buildGrid();
  if(playedToday){
    showResult(state);
  } else {
    resultEl.innerHTML='';
    msg.textContent='Choisis jusqu’à 10 numéros, puis valide — le tirage du jour est le même pour tout le monde.';
    validateBtn.disabled=true;
    validateBtn.addEventListener('click', validate);
  }
})();
