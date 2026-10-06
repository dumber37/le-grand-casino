/* ============================================================
   PASS SAISONNIER — 10 paliers débloqués selon les jetons misés CE
   MOIS-CI (recalculé depuis l'historique déjà sauvegardé, même
   méthode que weekly.js/stats-chart.js — aucun nouveau compteur tenu
   à chaque partie). Chaque palier atteint se réclame manuellement
   (geste volontaire, pas un ajout automatique) ; les paliers non
   réclamés à la fin du mois sont perdus quand la saison change —
   convention classique de "battle pass".
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  const KEY='grand-casino-season-pass';
  const TIERS=[
    {wager:200,   reward:50},
    {wager:500,   reward:100},
    {wager:1000,  reward:150},
    {wager:1800,  reward:200},
    {wager:2800,  reward:300},
    {wager:4000,  reward:400},
    {wager:5500,  reward:500},
    {wager:7500,  reward:700},
    {wager:10000, reward:1000},
    {wager:15000, reward:2000}
  ];

  function seasonStr(){ const d=new Date(); return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0'); }
  function seasonStartTs(){ const d=new Date(); return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1); }
  function readState(){ try{ const raw=localStorage.getItem(KEY); return raw?C.cleanSaved(KEY,JSON.parse(raw)):null; }catch(e){ return null; } }
  function saveState(s){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }

  const curSeason=seasonStr();
  let state=readState();
  if(!state||state.season!==curSeason){ state={season:curSeason, claimed:[]}; saveState(state); }

  function wageredThisSeason(){
    return C.getHistory().filter(h=>h.time>=seasonStartTs()).reduce((s,h)=>s+h.bet,0);
  }
  function claimTier(i){
    const t=TIERS[i];
    if(!t||state.claimed.includes(i)||wageredThisSeason()<t.wager) return false;
    state.claimed.push(i); saveState(state);
    C.state.balance+=t.reward; C.saveBalance(); C.renderBalance();
    C.showToast&&C.showToast('🎟️ Palier '+(i+1)+' réclamé : +'+t.reward+' jetons !');
    return true;
  }

  function tierItemHtml(t,i,wagered){
    const reached=wagered>=t.wager, claimed=state.claimed.includes(i);
    let action;
    if(claimed) action='<button class="shop-equipped" disabled>Réclamé</button>';
    else if(reached) action='<button data-claim-tier="'+i+'">Réclamer — '+t.reward+' 🪙</button>';
    else action='<button disabled>'+wagered+' / '+t.wager+'</button>';
    return '<div class="shop-item"><div class="shop-item-body"><div class="shop-item-name">Palier '+(i+1)+(claimed?' ✅':'')+'</div>'
      +'<div class="shop-item-price">'+t.wager+' jetons misés ce mois-ci</div></div>'+action+'</div>';
  }
  function render(){
    const listEl=document.getElementById('season-tiers'), wageredEl=document.getElementById('season-wagered'), countdownEl=document.getElementById('season-countdown');
    if(!listEl) return;
    const wagered=wageredThisSeason();
    listEl.innerHTML=TIERS.map((t,i)=>tierItemHtml(t,i,wagered)).join('');
    if(wageredEl) wageredEl.textContent=wagered;
    if(countdownEl){
      const d=new Date(); const nextMonth=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);
      countdownEl.textContent=Math.max(1,Math.ceil((nextMonth-Date.now())/86400000))+'j';
    }
  }
  document.addEventListener('click',(e)=>{
    const b=e.target.closest('[data-claim-tier]');
    if(b){ if(claimTier(parseInt(b.dataset.claimTier,10))) render(); }
  });
  C.renderSeason = render;
})();
