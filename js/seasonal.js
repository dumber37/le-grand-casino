/* ============================================================
   THÈME SAISONNIER AUTOMATIQUE — décor purement cosmétique qui
   s'active seul à certaines dates (Halloween, Noël), en PLUS du
   thème choisi dans la Boutique (data-theme, voir shop.js) : pose un
   attribut data-season séparé sur <html>, ne touche jamais data-theme
   ni les variables --gold / --felt* / --card-bg (objets physiques,
   identité visuelle conservée). Désactivable dans Paramètres.
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  const PREF_KEY='grand-casino-seasonal';

  function computeSeason(){
    const d=new Date(), m=d.getMonth()+1, day=d.getDate(); // mois 1-12
    if(m===10 && day>=25) return 'halloween';
    if(m===11 && day===1) return 'halloween';
    if(m===12 && day>=15 && day<=26) return 'christmas';
    return null;
  }

  function prefEnabled(){
    try{ const v=localStorage.getItem(PREF_KEY); return v===null?true:v==='on'; }catch(e){ return true; }
  }
  function setPref(v){ try{ localStorage.setItem(PREF_KEY, v?'on':'off'); }catch(e){} }

  const SEASON_ICON={halloween:'🎃', christmas:'🎄'};
  const SEASON_LABEL={halloween:'Décor d’Halloween automatique', christmas:'Décor de Noël automatique'};
  function apply(){
    const season=computeSeason(), active=season && prefEnabled();
    if(active) document.documentElement.setAttribute('data-season', season);
    else document.documentElement.removeAttribute('data-season');
    const badge=document.getElementById('hdrSeason');
    if(badge){
      badge.style.display = active ? '' : 'none';
      if(active){ badge.textContent=SEASON_ICON[season]; badge.title=SEASON_LABEL[season]; }
    }
  }
  C.currentSeason = computeSeason;
  apply();

  const toggle=document.getElementById('seasonalToggle');
  if(toggle){
    const sync=()=>{ const on=prefEnabled(); toggle.textContent=on?'Activé':'Désactivé'; toggle.classList.toggle('on',on); toggle.setAttribute('aria-pressed',String(on)); };
    sync();
    toggle.addEventListener('click',()=>{ setPref(!prefEnabled()); sync(); apply(); });
  }
})();
