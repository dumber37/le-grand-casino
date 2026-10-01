/* ============================================================
   GRAPHIQUE D'ÉVOLUTION DU SOLDE — petite courbe SVG dans Statistiques,
   construite à partir de l'historique déjà sauvegardé (grand-casino-history,
   voir core.js) : aucun nouveau suivi, juste un solde reconstitué en
   remontant net par net depuis le solde actuel. Se déclenche via le
   crochet optionnel que switchView appelle déjà pour 'stats' (même
   patron que C.renderChallenges/C.renderAccount/C.renderLeaderboard).
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  const MAX_POINTS = 30;

  // history[0] = partie la plus récente. On reconstitue le solde APRÈS chaque
  // partie affichée en remontant depuis le solde actuel (balance - net de la
  // partie la plus récente = solde juste avant elle = solde juste après la
  // suivante, etc.), puis on remet tout en ordre chronologique pour le tracé.
  function buildPoints(){
    const hist = C.getHistory().slice(0, MAX_POINTS);
    if(!hist.length) return [];
    let bal = C.state.balance;
    const afterNewestFirst = [];
    for(let i=0;i<hist.length;i++){ afterNewestFirst.push({balance:bal, entry:hist[i]}); bal -= hist[i].net; }
    const startPoint = {balance:bal, entry:null};
    const chronological = afterNewestFirst.slice().reverse();
    return [startPoint].concat(chronological);
  }

  function fmtTime(ts){
    const d = new Date(ts);
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  function renderChart(){
    const host = document.getElementById('st-chart');
    if(!host) return;
    const points = buildPoints();
    if(points.length < 2){
      host.innerHTML = '<p class="empty-state" style="padding:14px 10px">Joue quelques parties pour voir apparaître ta courbe de solde ici.</p>';
      return;
    }
    const W = 600, H = 160, padX = 8, padY = 14;
    const balances = points.map(p=>p.balance);
    let min = Math.min.apply(null, balances), max = Math.max.apply(null, balances);
    if(min === max){ min -= 10; max += 10; } // évite une division par zéro si le solde n'a jamais bougé
    const x = i => padX + (W - padX*2) * (i/(points.length-1));
    const y = v => H - padY - (H - padY*2) * ((v - min)/(max - min));
    const startY = y(points[0].balance);

    const linePath = points.map((p,i)=>(i===0?'M':'L')+x(i).toFixed(1)+','+y(p.balance).toFixed(1)).join(' ');
    const areaPath = linePath+' L'+x(points.length-1).toFixed(1)+','+(H-padY)+' L'+x(0).toFixed(1)+','+(H-padY)+' Z';

    host.innerHTML =
      '<div class="stchart-wrap">'+
      '<svg viewBox="0 0 '+W+' '+H+'" class="stchart-svg" id="stchart-svg" preserveAspectRatio="none">'+
        '<line x1="'+padX+'" y1="'+startY.toFixed(1)+'" x2="'+(W-padX)+'" y2="'+startY.toFixed(1)+'" class="stchart-baseline"/>'+
        '<path d="'+areaPath+'" class="stchart-area"/>'+
        '<path d="'+linePath+'" class="stchart-line"/>'+
        '<line class="stchart-cursor" id="stchart-cursor" x1="0" y1="0" x2="0" y2="'+H+'" style="display:none"/>'+
        '<circle class="stchart-dot" id="stchart-dot" r="4" style="display:none"/>'+
      '</svg>'+
      '<div class="stchart-tooltip" id="stchart-tooltip" style="display:none"></div>'+
      '</div>';

    const svg = document.getElementById('stchart-svg');
    const cursor = document.getElementById('stchart-cursor');
    const dot = document.getElementById('stchart-dot');
    const tooltip = document.getElementById('stchart-tooltip');

    function pointerToIndex(clientX){
      const rect = svg.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(frac * (points.length-1));
    }
    function showAt(i){
      const p = points[i];
      const px = x(i), py = y(p.balance);
      cursor.setAttribute('x1', px); cursor.setAttribute('x2', px); cursor.style.display='';
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.style.display='';
      const label = p.entry
        ? C.gameName(p.entry.game)+' · '+(p.entry.net>0?'+':'')+p.entry.net+' · '+fmtTime(p.entry.time)
        : 'Départ';
      tooltip.textContent = p.balance+' jetons — '+label;
      tooltip.style.display='';
      const wrapRect = svg.parentElement.getBoundingClientRect();
      const leftPct = (px/W)*100;
      tooltip.style.left = 'min(calc('+leftPct+'% ), calc(100% - 6px))';
      tooltip.style.transform = leftPct>70 ? 'translateX(-100%)' : (leftPct<8 ? 'translateX(0)' : 'translateX(-50%)');
    }
    function hide(){ cursor.style.display='none'; dot.style.display='none'; tooltip.style.display='none'; }
    svg.addEventListener('mousemove', e=>showAt(pointerToIndex(e.clientX)));
    svg.addEventListener('mouseleave', hide);
    svg.addEventListener('touchstart', e=>{ if(e.touches[0]) showAt(pointerToIndex(e.touches[0].clientX)); }, {passive:true});
    svg.addEventListener('touchmove', e=>{ if(e.touches[0]) showAt(pointerToIndex(e.touches[0].clientX)); }, {passive:true});
  }

  C.renderBalanceChart = renderChart;
})();
