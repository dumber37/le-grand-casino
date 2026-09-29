/* ============================================================
   CLASSEMENT — compare ta progression à celle d'amis, en important
   leur sauvegarde exportée (Paramètres → Exporter ma sauvegarde,
   exactement le même fichier .json, la même validation C.validateSaveData
   que l'import déjà existant — aucun format parallèle). Ce projet n'a
   pas de serveur central : rien n'est jamais envoyé nulle part, tout
   reste sur ton appareil. "Toi" est toujours calculé en direct à partir
   du solde/stats actuels ; chaque ami ajouté est un instantané figé au
   moment de l'import (mets à jour son fichier et réimporte-le pour une
   comparaison plus récente).
   ============================================================ */
window.Casino=window.Casino||{};
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('view-leaderboard')) return;

  const LB_KEY='grand-casino-leaderboard-friends';
  const listEl=$('lb-list'), emptyEl=$('lb-empty'), sortEl=$('lb-sort'), addBtn=$('lb-addBtn'), fileInput=$('lb-fileInput');

  let friends=[]; // [{id, summary}]
  try{ const raw=localStorage.getItem(LB_KEY); if(raw) friends=JSON.parse(raw); }catch(e){}
  function saveFriends(){ try{ localStorage.setItem(LB_KEY, JSON.stringify(friends)); }catch(e){} }

  // ---- Résumé comparable : UNE seule fonction pour "moi" (données en direct) et pour un ami
  // (sauvegarde importée) — jamais deux jeux de règles qui pourraient diverger. ----
  function summaryFromRaw(pseudo,balanceStr,wageredStr,statsStr){
    let stats={}; try{ stats=JSON.parse(statsStr||'{}'); }catch(e){}
    const totalWagered=parseInt(wageredStr,10)||0;
    return {
      name: pseudo||'Joueur',
      balance: parseInt(balanceStr,10)||0,
      totalWon: stats.totalWon||0,
      totalWagered,
      biggestWin: stats.biggestWin||0,
      crashBestMult: stats.crashBestMult||0,
      gamesPlayed: stats.gamesPlayed||0,
      vipIdx: C.vipTierIndex ? C.vipTierIndex(totalWagered) : 0
    };
  }
  function mySummary(){
    return summaryFromRaw(
      C.avatars?C.avatars.pseudo():(localStorage.getItem('grand-casino-pseudo')||'Toi'),
      String(C.state.balance), String(C.state.totalWagered), localStorage.getItem('grand-casino-stats')
    );
  }
  function summaryFromPayload(payload){
    const d=payload.data||{};
    return summaryFromRaw(d['grand-casino-pseudo'], d['grand-casino-balance'], d['grand-casino-wagered'], d['grand-casino-stats']);
  }

  const fmt=n=>(n||0).toLocaleString('fr-FR');
  function metricValue(s,metric){ return s[metric]||0; }
  function metricDisplay(s,metric){
    if(metric==='crashBestMult') return s.crashBestMult>0 ? 'x'+s.crashBestMult.toFixed(2) : '—';
    return fmt(metricValue(s,metric));
  }
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function render(){
    const metric=sortEl.value;
    const rows=[{me:true,summary:mySummary()}].concat(friends.map(f=>({me:false,id:f.id,summary:f.summary})));
    rows.sort((a,b)=>metricValue(b.summary,metric)-metricValue(a.summary,metric));
    listEl.innerHTML=rows.map((r,i)=>{
      const s=r.summary, tier=(C.VIP_TIERS&&C.VIP_TIERS[s.vipIdx])||{icon:'',name:'',color:'var(--muted)'};
      const avatarHtml=C.avatars?C.avatars.html(r.me?'Toi':s.name,26):'';
      return '<div class="lb-row'+(r.me?' lb-me':'')+'">'
        +'<span class="lb-rank">'+(i+1)+'</span>'
        +'<span class="lb-name">'+avatarHtml+escapeHtml(r.me?'Toi':s.name)+'</span>'
        +'<span class="lb-vip" style="color:'+tier.color+'">'+tier.icon+' '+tier.name+'</span>'
        +'<span class="lb-metric">'+metricDisplay(s,metric)+'</span>'
        +(r.me?'':'<button class="lb-remove" data-id="'+r.id+'" aria-label="Retirer">✕</button>')
        +'</div>';
    }).join('');
    emptyEl.style.display=friends.length?'none':'block';
  }
  // Exposé pour core.js : appelé à chaque ouverture de la vue (switchView), comme les autres
  // rendus différés (renderStats, renderChallenges, renderAccount...).
  C.renderLeaderboard=render;

  sortEl.addEventListener('change',render);
  addBtn.addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files&&fileInput.files[0]; fileInput.value='';
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      let payload; try{ payload=JSON.parse(reader.result); }catch(e){ C.showToast('❌ Fichier illisible (JSON invalide)'); return; }
      if(!C.validateSaveData||!C.validateSaveData(payload)){ C.showToast('❌ Ce fichier ne ressemble pas à une sauvegarde du Grand Casino'); return; }
      const summary=summaryFromPayload(payload);
      friends.push({id:'f'+Date.now()+Math.floor(Math.random()*1000), summary});
      saveFriends(); render();
      C.showToast('✅ '+summary.name+' ajouté au classement');
    };
    reader.onerror=()=>C.showToast('❌ Impossible de lire le fichier');
    reader.readAsText(file);
  });
  listEl.addEventListener('click',(e)=>{
    const b=e.target.closest('.lb-remove'); if(!b) return;
    friends=friends.filter(f=>f.id!==b.dataset.id); saveFriends(); render();
  });

  render();
})();
