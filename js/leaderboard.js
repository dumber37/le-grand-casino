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

  // Les chiffres d'un ami viennent d'un fichier qu'on ne maîtrise pas : tout est ramené à un nombre fini / un court
  // texte sans HTML, à l'import comme à la relecture du stockage (jamais de valeur brute affichée).
  const lnum=C.num;
  const lname=s=>C.str(s,20)||'Joueur';
  function cleanSummary(s){
    s=s&&typeof s==='object'?s:{};
    return {name:lname(s.name), balance:Math.max(0,lnum(s.balance)), totalWon:lnum(s.totalWon), totalWagered:Math.max(0,lnum(s.totalWagered)),
      biggestWin:lnum(s.biggestWin), crashBestMult:lnum(s.crashBestMult), gamesPlayed:lnum(s.gamesPlayed), vipIdx:Math.max(0,Math.min(5,Math.round(lnum(s.vipIdx))))};
  }
  let friends=[]; // [{id, summary}]
  try{
    const raw=localStorage.getItem(LB_KEY);
    const arr=raw?JSON.parse(raw):[];
    friends=(Array.isArray(arr)?arr:[]).filter(f=>f&&typeof f==='object').slice(0,50)
      .map(f=>({id:String(f.id||'').replace(/[^\w-]/g,'').slice(0,40)||('f'+Date.now()+Math.floor(Math.random()*1000)), summary:cleanSummary(f.summary)}));
  }catch(e){}
  function saveFriends(){ try{ localStorage.setItem(LB_KEY, JSON.stringify(friends)); }catch(e){} }

  // ---- Résumé comparable : UNE seule fonction pour "moi" (données en direct) et pour un ami
  // (sauvegarde importée) — jamais deux jeux de règles qui pourraient diverger. ----
  function summaryFromRaw(pseudo,balanceStr,wageredStr,statsStr){
    let stats={}; try{ stats=JSON.parse(statsStr||'{}'); }catch(e){}
    if(!stats||typeof stats!=='object') stats={};
    const totalWagered=Math.max(0,parseInt(wageredStr,10)||0);
    return cleanSummary({
      name: pseudo||'Joueur',
      balance: parseInt(balanceStr,10)||0,
      totalWon: stats.totalWon,
      totalWagered,
      biggestWin: stats.biggestWin,
      crashBestMult: stats.crashBestMult,
      gamesPlayed: stats.gamesPlayed,
      vipIdx: C.vipTierIndex ? C.vipTierIndex(totalWagered) : 0
    });
  }
  function mySummary(){
    return summaryFromRaw(
      C.avatars?C.avatars.pseudo():(localStorage.getItem('grand-casino-pseudo')||'Toi'),
      String(C.state.balance), String(C.state.totalWagered), localStorage.getItem('grand-casino-stats')
    );
  }
  function summaryFromPayload(payload){
    const d=payload.data||{}, nv=k=>C.normalizeSaveValue?C.normalizeSaveValue(k,d[k]):d[k]; // mêmes règles que l'import de sauvegarde
    return summaryFromRaw(nv('grand-casino-pseudo'), nv('grand-casino-balance'), nv('grand-casino-wagered'), nv('grand-casino-stats'));
  }

  const fmt=n=>(n||0).toLocaleString('fr-FR');
  function metricValue(s,metric){ return s[metric]||0; }
  function metricDisplay(s,metric){
    if(metric==='crashBestMult') return s.crashBestMult>0 ? 'x'+s.crashBestMult.toFixed(2) : '—';
    return fmt(metricValue(s,metric));
  }
  const escapeHtml=C.escapeHtml;

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
