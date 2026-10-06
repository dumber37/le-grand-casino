/* ============================================================
   BOUTIQUE — cosmétiques achetables avec des jetons : thèmes
   d'arrière-plan (bascule la même variable data-theme que le
   réglage clair/sombre existant, voir core.js) et cadres d'avatar
   achetables (étend le système de cadres débloqués par achievement,
   voir avatars.js — deux pistes de déblocage séparées, jamais
   dupliquées : avatars.js reste l'unique source de vérité pour les
   cadres, ce fichier ne fait qu'acheter/équiper).
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  const THEME_KEY='grand-casino-theme';
  const OWNED_THEMES_KEY='grand-casino-owned-themes';
  const THEMES=[
    {id:'dark',    name:'Classique (sombre)', cost:0,   swatch:['#05070a','#0c3d2e','#d4af37']},
    {id:'light',   name:'Clair',              cost:0,   swatch:['#f3ecdb','#0c3d2e','#93650d']},
    {id:'neon',    name:'Néon Vegas',         cost:300, swatch:['#120a1f','#ff2fb3','#38d2ff']},
    {id:'emerald', name:'Émeraude Royale',    cost:500, swatch:['#03140d','#2ad490','#d4af37']},
    {id:'ruby',    name:'Rubis Impérial',     cost:800, swatch:['#170406','#7a0f1a','#f2b705']}
  ];
  let ownedThemes=[];
  try{ const raw=localStorage.getItem(OWNED_THEMES_KEY); ownedThemes=raw?C.cleanSaved(OWNED_THEMES_KEY,JSON.parse(raw)):[]; }catch(e){}
  function saveOwnedThemes(){ try{ localStorage.setItem(OWNED_THEMES_KEY, JSON.stringify(ownedThemes)); }catch(e){} }
  function themeOwned(t){ return t.cost===0 || ownedThemes.includes(t.id); }
  function currentTheme(){ return document.documentElement.getAttribute('data-theme')||'dark'; }
  function equipTheme(id){
    if(id==='dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', id);
    try{ localStorage.setItem(THEME_KEY, id); }catch(e){}
    // Garde le bouton clair/sombre des Paramètres cohérent avec le thème réellement actif.
    const toggle=document.getElementById('themeToggle');
    if(toggle){
      const isLight=id==='light';
      toggle.textContent=isLight?'Désactivé':'Activé';
      toggle.classList.toggle('on',!isLight);
      toggle.setAttribute('aria-pressed',String(!isLight));
    }
  }
  function buyTheme(id){
    const t=THEMES.find(x=>x.id===id);
    if(!t||themeOwned(t)||C.state.balance<t.cost) return false;
    C.state.balance-=t.cost; C.saveBalance(); C.renderBalance();
    ownedThemes.push(id); saveOwnedThemes();
    return true;
  }

  // ---- Dos de carte (voir .card-back dans base.css, piloté par data-cardback sur <html>) ----
  const CARDBACK_KEY='grand-casino-cardback';
  const OWNED_CARDBACKS_KEY='grand-casino-owned-cardbacks';
  const CARDBACKS=[
    {id:'classic', name:'Classique',    cost:0,   swatch:['#0c3d2e','#d4af37','#062a1f']},
    {id:'royal',   name:'Royal Violet', cost:250, swatch:['#2d0a4e','#a855f7','#150425']},
    {id:'dragon',  name:'Dragon Rouge', cost:450, swatch:['#7a0f1a','#d4af37','#2a0407']}
  ];
  let ownedCardbacks=[];
  try{ const raw=localStorage.getItem(OWNED_CARDBACKS_KEY); ownedCardbacks=raw?C.cleanSaved(OWNED_CARDBACKS_KEY,JSON.parse(raw)):[]; }catch(e){}
  function saveOwnedCardbacks(){ try{ localStorage.setItem(OWNED_CARDBACKS_KEY, JSON.stringify(ownedCardbacks)); }catch(e){} }
  function cardbackOwned(c){ return c.cost===0 || ownedCardbacks.includes(c.id); }
  function currentCardback(){ return document.documentElement.getAttribute('data-cardback')||'classic'; }
  function equipCardback(id){
    if(id==='classic') document.documentElement.removeAttribute('data-cardback');
    else document.documentElement.setAttribute('data-cardback', id);
    try{ localStorage.setItem(CARDBACK_KEY, id); }catch(e){}
  }
  function buyCardback(id){
    const c=CARDBACKS.find(x=>x.id===id);
    if(!c||cardbackOwned(c)||C.state.balance<c.cost) return false;
    C.state.balance-=c.cost; C.saveBalance(); C.renderBalance();
    ownedCardbacks.push(id); saveOwnedCardbacks();
    return true;
  }

  // ---- Peaux de jetons (logique/déblocage dans chips.js, ce fichier n'achète/n'équipe qu'au
  // travers de son API — même séparation que pour les cadres d'avatar) ----
  const CHIPSKIN_META=[
    {id:'classic', name:'Classique', cost:0},
    {id:'neon',    name:'Néon',      cost:250},
    {id:'royal',   name:'Royal',     cost:450}
  ];
  function chipSkinSwatch(id){
    const d=C.chips.CHIP_SKINS[id];
    return [d[0].c, d[3].c, d[6].c];
  }

  // ---- Effets de victoire (joués par win-effects.js via C.flashWin) et fonds de table (attribut
  // data-felt sur <html>, voir extras.css) : même schéma acheté/équipé que les dos de cartes. ----
  const WINFX_KEY='grand-casino-wineffect', OWNED_WINFX_KEY='grand-casino-owned-wineffects';
  const WINFX=[
    {id:'classic',  name:'Classique',        cost:0,   icon:'✨'},
    {id:'confetti', name:'Confettis',        cost:200, icon:'🎉'},
    {id:'coins',    name:'Pluie de pièces',  cost:350, icon:'🪙'},
    {id:'fireworks',name:'Feux d’artifice',  cost:600, icon:'🎆'}
  ];
  const FELT_KEY='grand-casino-felt', OWNED_FELTS_KEY='grand-casino-owned-felts';
  const FELTS=[
    {id:'classic',  name:'Vert casino', cost:0,   swatch:['#147049','#0c3d2e','#062a1f']},
    {id:'ocean',    name:'Bleu nuit',   cost:150, swatch:['#1d5d9b','#123a63','#081d33']},
    {id:'bordeaux', name:'Bordeaux',    cost:250, swatch:['#9b2335','#661523','#33090f']},
    {id:'royal',    name:'Violet royal',cost:300, swatch:['#6a3aa8','#432570','#201037']},
    {id:'onyx',     name:'Onyx',        cost:400, swatch:['#4a4f57','#2b2f35','#121417']}
  ];
  function readList(key){ try{ const p=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(p)?C.cleanSaved(key,p):[]; }catch(e){ return []; } }
  function writeList(key,l){ try{ localStorage.setItem(key,JSON.stringify(l)); }catch(e){} }
  let ownedWinfx=readList(OWNED_WINFX_KEY), ownedFelts=readList(OWNED_FELTS_KEY);
  const getEq=(key,def)=>{ try{ return localStorage.getItem(key)||def; }catch(e){ return def; } };
  function applyFelt(id){ if(id&&id!=='classic') document.documentElement.setAttribute('data-felt',id); else document.documentElement.removeAttribute('data-felt'); }
  applyFelt(getEq(FELT_KEY,'classic'));
  function buySimple(list,owned,id,ownedKey){
    const it=list.find(x=>x.id===id);
    if(!it||it.cost===0||owned.includes(id)||C.state.balance<it.cost) return false;
    C.state.balance-=it.cost; C.saveBalance(); C.renderBalance(); owned.push(id); writeList(ownedKey,owned); return true;
  }
  function simpleItemHtml(attr,it,owned,equipped,visual,preview){
    let action;
    if(equipped) action='<button class="shop-equipped" disabled>Équipé</button>';
    else if(owned) action='<button data-equip-'+attr+'="'+it.id+'">Équiper</button>';
    else action='<button data-buy-'+attr+'="'+it.id+'"'+(C.state.balance<it.cost?' disabled':'')+'>Acheter — '+it.cost+' 🪙</button>';
    return '<div class="shop-item">'+visual+'<div class="shop-item-body"><div class="shop-item-name">'+it.name+'</div><div class="shop-item-price">'+(it.cost>0?it.cost+' jetons':'Gratuit')+'</div></div>'
      +(preview&&it.id!=='classic'?'<button class="fr-copy" data-preview-'+attr+'="'+it.id+'" style="margin:0 6px 0 0">Aperçu</button>':'')
      +(attr==='felt'&&it.id!=='classic'?pvBtn('felt',it.id):'')+action+'</div>';
  }

  // Bouton « Aperçu » (ouvre la fenêtre d'aperçu, voir plus bas) : toujours placé AVANT le bouton d'action, qui reste le dernier enfant de la ligne.
  const pvBtn=(type,id)=>'<button type="button" class="sp-btn" data-pv="'+type+':'+id+'" aria-label="Aperçu">👁 Aperçu</button>';
  function swatchHtml(colors){ return '<span class="shop-swatch">'+colors.map(c=>'<i style="background:'+c+'"></i>').join('')+'</span>'; }

  function themeItemHtml(t){
    const owned=themeOwned(t), equipped=currentTheme()===t.id;
    let action;
    if(equipped) action='<button class="shop-equipped" disabled>Équipé</button>';
    else if(owned) action='<button data-equip-theme="'+t.id+'">Équiper</button>';
    else action='<button data-buy-theme="'+t.id+'"'+(C.state.balance<t.cost?' disabled':'')+'>Acheter — '+t.cost+' 🪙</button>';
    return '<div class="shop-item">'+swatchHtml(t.swatch)+'<div class="shop-item-body"><div class="shop-item-name">'+t.name+'</div>'
      +(t.cost>0?'<div class="shop-item-price">'+t.cost+' jetons</div>':'<div class="shop-item-price">Gratuit</div>')+'</div>'+(t.id!=='dark'&&!equipped?pvBtn('theme',t.id):'')+action+'</div>';
  }
  function frameItemHtml(f){
    if(f.id==='none') return '';
    const A=C.avatars;
    const unlocked=A.frameUnlocked(f), equipped=A.getEquippedFrame()===f.id;
    let action;
    if(f.achId){
      action = unlocked
        ? (equipped?'<button class="shop-equipped" disabled>Équipé</button>':'<button data-equip-frame="'+f.id+'">Équiper</button>')
        : '<button disabled title="Se débloque via un achievement">🔒 Achievement</button>';
    } else {
      action = equipped ? '<button class="shop-equipped" disabled>Équipé</button>'
        : unlocked ? '<button data-equip-frame="'+f.id+'">Équiper</button>'
        : '<button data-buy-frame="'+f.id+'"'+(C.state.balance<f.cost?' disabled':'')+'>Acheter — '+f.cost+' 🪙</button>';
    }
    return '<div class="shop-item"><span class="shop-swatch shop-frame-preview"><span class="av-frame frame-'+f.id+'" style="width:34px;height:34px"><span class="shop-frame-dot">'+f.icon+'</span></span></span>'
      +'<div class="shop-item-body"><div class="shop-item-name">'+f.name+'</div>'
      +(f.cost!=null?'<div class="shop-item-price">'+f.cost+' jetons</div>':'<div class="shop-item-price">Achievement</div>')+'</div>'+pvBtn('frame',f.id)+action+'</div>';
  }
  function cardbackItemHtml(c){
    const owned=cardbackOwned(c), equipped=currentCardback()===c.id;
    let action;
    if(equipped) action='<button class="shop-equipped" disabled>Équipé</button>';
    else if(owned) action='<button data-equip-cardback="'+c.id+'">Équiper</button>';
    else action='<button data-buy-cardback="'+c.id+'"'+(C.state.balance<c.cost?' disabled':'')+'>Acheter — '+c.cost+' 🪙</button>';
    return '<div class="shop-item">'+swatchHtml(c.swatch)+'<div class="shop-item-body"><div class="shop-item-name">'+c.name+'</div>'
      +(c.cost>0?'<div class="shop-item-price">'+c.cost+' jetons</div>':'<div class="shop-item-price">Gratuit</div>')+'</div>'+(c.id!=='classic'?pvBtn('cardback',c.id):'')+action+'</div>';
  }
  function chipSkinItemHtml(m){
    const owned=C.chips.skinOwned(m.id), equipped=C.chips.getEquippedSkin()===m.id;
    let action;
    if(equipped) action='<button class="shop-equipped" disabled>Équipé</button>';
    else if(owned) action='<button data-equip-chipskin="'+m.id+'">Équiper</button>';
    else action='<button data-buy-chipskin="'+m.id+'"'+(C.state.balance<m.cost?' disabled':'')+'>Acheter — '+m.cost+' 🪙</button>';
    return '<div class="shop-item">'+swatchHtml(chipSkinSwatch(m.id))+'<div class="shop-item-body"><div class="shop-item-name">'+m.name+'</div>'
      +(m.cost>0?'<div class="shop-item-price">'+m.cost+' jetons</div>':'<div class="shop-item-price">Gratuit</div>')+'</div>'+pvBtn('chipskin',m.id)+action+'</div>';
  }

  function render(){
    const themesEl=document.getElementById('shop-themes'), framesEl=document.getElementById('shop-frames');
    const cardbacksEl=document.getElementById('shop-cardbacks'), chipskinsEl=document.getElementById('shop-chipskins');
    if(!themesEl||!framesEl) return;
    themesEl.innerHTML=THEMES.map(themeItemHtml).join('');
    framesEl.innerHTML=C.avatars.FRAMES.map(frameItemHtml).join('');
    if(cardbacksEl) cardbacksEl.innerHTML=CARDBACKS.map(cardbackItemHtml).join('');
    if(chipskinsEl) chipskinsEl.innerHTML=CHIPSKIN_META.map(chipSkinItemHtml).join('');
    const fxEl=document.getElementById('shop-wineffects'), feltEl=document.getElementById('shop-felts');
    if(fxEl){ const eq=getEq(WINFX_KEY,'classic'); fxEl.innerHTML=WINFX.map(f=>simpleItemHtml('wineffect',f,f.cost===0||ownedWinfx.includes(f.id),eq===f.id,'<span class="shop-swatch" style="font-size:1.4rem;align-items:center;justify-content:center">'+f.icon+'</span>',true)).join(''); }
    if(feltEl){ const eq=getEq(FELT_KEY,'classic'); feltEl.innerHTML=FELTS.map(f=>simpleItemHtml('felt',f,f.cost===0||ownedFelts.includes(f.id),eq===f.id,swatchHtml(f.swatch),false)).join(''); }
  }

  document.addEventListener('click',(e)=>{
    const buyT=e.target.closest('[data-buy-theme]');
    if(buyT){ if(buyTheme(buyT.dataset.buyTheme)){ C.showToast&&C.showToast('🎨 Thème débloqué !'); render(); } return; }
    const eqT=e.target.closest('[data-equip-theme]');
    if(eqT){ equipTheme(eqT.dataset.equipTheme); render(); return; }
    const buyF=e.target.closest('[data-buy-frame]');
    if(buyF){ if(C.avatars.buyFrame(buyF.dataset.buyFrame)){ C.showToast&&C.showToast('🖼️ Cadre débloqué !'); C.avatars.setFrame(buyF.dataset.buyFrame); document.dispatchEvent(new Event('avatar-changed')); render(); } return; }
    const eqF=e.target.closest('[data-equip-frame]');
    if(eqF){ C.avatars.setFrame(eqF.dataset.equipFrame); document.dispatchEvent(new Event('avatar-changed')); render(); return; }
    const buyC=e.target.closest('[data-buy-cardback]');
    if(buyC){ if(buyCardback(buyC.dataset.buyCardback)){ C.showToast&&C.showToast('🂠 Dos de carte débloqué !'); equipCardback(buyC.dataset.buyCardback); render(); } return; }
    const eqC=e.target.closest('[data-equip-cardback]');
    if(eqC){ equipCardback(eqC.dataset.equipCardback); render(); return; }
    const buyS=e.target.closest('[data-buy-chipskin]');
    if(buyS){ if(C.chips.buyChipSkin(buyS.dataset.buyChipskin, (CHIPSKIN_META.find(m=>m.id===buyS.dataset.buyChipskin)||{}).cost)){ C.showToast&&C.showToast('🪙 Peau de jeton débloquée !'); C.chips.setChipSkin(buyS.dataset.buyChipskin); render(); } return; }
    const eqS=e.target.closest('[data-equip-chipskin]');
    if(eqS){ C.chips.setChipSkin(eqS.dataset.equipChipskin); render(); return; }
    const buyW=e.target.closest('[data-buy-wineffect]');
    if(buyW){ const id=buyW.dataset.buyWineffect; if(buySimple(WINFX,ownedWinfx,id,OWNED_WINFX_KEY)){ C.showToast&&C.showToast('🎆 Effet débloqué !'); try{ localStorage.setItem(WINFX_KEY,id); }catch(x){} render(); C.winEffect&&C.winEffect(id); } return; }
    const eqW=e.target.closest('[data-equip-wineffect]');
    if(eqW){ try{ localStorage.setItem(WINFX_KEY,eqW.dataset.equipWineffect); }catch(x){} render(); return; }
    const preW=e.target.closest('[data-preview-wineffect]');
    if(preW){ C.winEffect&&C.winEffect(preW.dataset.previewWineffect); return; }
    const buyF2=e.target.closest('[data-buy-felt]');
    if(buyF2){ const id=buyF2.dataset.buyFelt; if(buySimple(FELTS,ownedFelts,id,OWNED_FELTS_KEY)){ C.showToast&&C.showToast('🟩 Tapis débloqué !'); try{ localStorage.setItem(FELT_KEY,id); }catch(x){} applyFelt(id); render(); } return; }
    const eqF2=e.target.closest('[data-equip-felt]');
    if(eqF2){ try{ localStorage.setItem(FELT_KEY,eqF2.dataset.equipFelt); }catch(x){} applyFelt(eqF2.dataset.equipFelt); render(); return; }
  });
  // ---------- Fenêtre d'aperçu ----------
  // Chaque article (thème, cadre, dos de carte, peau de jetons, tapis) s'essaie avant l'achat. Le bouton d'action de la
  // fenêtre est la copie de celui de la ligne (Acheter / Équiper / Équipé) : mêmes attributs, donc le même code d'achat.
  // Les cartes d'aperçu portent data-no-deal (deal-anim.js ne les « distribue » pas). Un thème peut en plus s'essayer sur toute
  // la page pendant 15 s, sans rien enregistrer : fermer / terminer rétablit le thème précédent.
  let modal=null, tryEnd=null;
  const esc=C.escapeHtml;
  function ensureModal(){
    if(modal) return modal;
    modal=document.createElement('div'); modal.className='shop-modal'; modal.hidden=true;
    modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','spTitle');
    modal.innerHTML='<div class="sp-card"><h3 id="spTitle"></h3><div class="sp-stage" id="spStage" data-no-deal></div><p class="sp-note" id="spNote"></p><div class="sp-actions" id="spActions"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{
      if(e.target===modal||e.target.closest('[data-sp-close]')){ closePreview(); return; }
      const tt=e.target.closest('[data-sp-try]'); if(tt){ tryTheme(tt.dataset.spTry); return; }
      const card=e.target.closest('#spStage .card-3d'); if(card&&card.dataset.flip){ const fl=card.querySelector('.card-flip'); if(fl){ fl.classList.toggle('is-back'); C.sound&&C.sound('card'); } return; }
      if(e.target.closest('#spActions [data-buy-theme],#spActions [data-equip-theme],#spActions [data-buy-frame],#spActions [data-equip-frame],#spActions [data-buy-cardback],#spActions [data-equip-cardback],#spActions [data-buy-chipskin],#spActions [data-equip-chipskin],#spActions [data-buy-felt],#spActions [data-equip-felt]')) closePreview();
    });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal&&!modal.hidden) closePreview(); });
    return modal;
  }
  function closePreview(){ if(modal) modal.hidden=true; }
  function pvCard(card,back){ const c=C.renderCard(card,back,true); c.dataset.flip='1'; c.style.cursor='pointer'; return c; }
  function stageCards(extra){
    const row=document.createElement('div'); row.className='sp-cards';
    [pvCard({r:'A',s:'♠'},false),pvCard({r:'K',s:'♥'},true),pvCard({r:'7',s:'♦'},true)].forEach(c=>{ if(extra) extra(c); row.appendChild(c); });
    return row;
  }
  function openPreview(spec){
    const type=spec.split(':')[0], id=spec.slice(type.length+1);
    const btn=document.querySelector('#view-shop [data-pv="'+spec.replace(/"/g,'')+'"]'); if(!btn) return;
    const item=btn.closest('.shop-item'), action=item&&item.lastElementChild;
    const name=item&&item.querySelector('.shop-item-name')?item.querySelector('.shop-item-name').textContent:id;
    const m=ensureModal(), stage=m.querySelector('#spStage'), note=m.querySelector('#spNote'), acts=m.querySelector('#spActions');
    m.querySelector('#spTitle').textContent='Aperçu — '+name; stage.innerHTML=''; note.textContent=''; acts.innerHTML='';
    if(type==='cardback'){
      const row=stageCards(c=>c.querySelectorAll('.card-back').forEach(b=>b.classList.add('cb-'+id)));
      stage.appendChild(row); note.textContent='Visible sur toutes les tables de cartes. Clique une carte pour la retourner.';
    } else if(type==='felt'){
      const f=FELTS.find(x=>x.id===id)||FELTS[0];
      const felt=document.createElement('div'); felt.className='sp-felt';
      felt.style.background='radial-gradient(ellipse at 50% 30%,'+f.swatch[0]+' 0%,'+f.swatch[1]+' 58%,'+f.swatch[2]+' 100%)';
      felt.appendChild(stageCards()); const ch=document.createElement('div'); ch.className='sp-chips'; ch.innerHTML=C.chips?C.chips.html(125,{scale:1}):''; felt.appendChild(ch);
      stage.appendChild(felt); note.textContent='Le tapis habille les tables de cartes (blackjack, baccarat, poker…).';
    } else if(type==='chipskin'){
      const wrap=document.createElement('div'); wrap.className='sp-chiprow';
      wrap.innerHTML=[1,5,10,25,50,100,500,1000].map(v=>'<span class="sp-chip1">'+C.chips.html(v,{skin:id,label:false,scale:1.15})+'<small>'+v+'</small></span>').join('');
      const pile=document.createElement('div'); pile.className='sp-pile'; pile.innerHTML=C.chips.html(1375,{skin:id,maxCols:5,scale:1.2});
      stage.appendChild(wrap); stage.appendChild(pile); note.textContent='Les jetons de tes mises prennent ces couleurs.';
    } else if(type==='frame'){
      const A=C.avatars, f=A.FRAMES.find(x=>x.id===id); if(!f) return;
      const av=document.createElement('div'); av.className='sp-avatar';
      av.innerHTML='<span class="av-frame frame-'+esc(f.id)+'" style="width:110px;height:110px">'+(A.htmlTraits(A.myTraits(),110)||'')+'</span>';
      stage.appendChild(av); note.textContent='Le cadre entoure ton avatar dans le profil et aux tables.';
    } else if(type==='theme'){
      const t=THEMES.find(x=>x.id===id); if(!t) return;
      const mock=document.createElement('div'); mock.className='sp-theme'; mock.style.background=t.swatch[0];
      mock.innerHTML='<div class="spt-bar" style="background:'+t.swatch[2]+'"></div><div class="spt-table" style="background:'+t.swatch[1]+'"><span>🃏</span><span>🎰</span><span>🎡</span></div><div class="spt-line" style="background:'+t.swatch[2]+'"></div><div class="spt-line short" style="background:'+t.swatch[2]+'"></div>';
      stage.appendChild(mock); note.textContent='Aperçu simplifié — « Essayer sur la page » applique vraiment le thème pendant 15 secondes, sans l’enregistrer.';
      const tr=document.createElement('button'); tr.type='button'; tr.className='sp-try'; tr.dataset.spTry=id; tr.textContent='🎨 Essayer sur la page (15 s)'; acts.appendChild(tr);
    } else return;
    if(action&&action.tagName==='BUTTON'){ const copy=document.createElement('span'); copy.innerHTML=action.outerHTML; acts.appendChild(copy.firstChild); }
    const close=document.createElement('button'); close.type='button'; close.className='sp-close'; close.dataset.spClose='1'; close.textContent='Fermer'; acts.appendChild(close);
    m.hidden=false; close.focus();
  }
  function tryTheme(id){
    const t=THEMES.find(x=>x.id===id); if(!t) return;
    closePreview(); if(tryEnd) tryEnd(true);
    const root=document.documentElement, before=root.getAttribute('data-theme');
    const put=v=>{ if(v&&v!=='dark') root.setAttribute('data-theme',v); else root.removeAttribute('data-theme'); };
    put(id);
    const bar=document.createElement('div'); bar.className='sp-trybar';
    bar.innerHTML='<span>🎨 Aperçu : <b>'+esc(t.name)+'</b> — rien n’est enregistré</span><button type="button">Terminer l’aperçu</button>';
    document.body.appendChild(bar);
    let timer=setTimeout(()=>tryEnd(true),15000);
    const onClick=e=>{ if(e.target.closest('[data-buy-theme],[data-equip-theme]')) tryEnd(false); else if(e.target.closest('[data-view]')) tryEnd(true); };
    document.addEventListener('click',onClick,true);
    bar.querySelector('button').addEventListener('click',()=>tryEnd(true));
    tryEnd=function(restore){ clearTimeout(timer); document.removeEventListener('click',onClick,true); bar.remove(); if(restore) put(before); tryEnd=null; };
  }
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-pv]'); if(b&&b.closest('#view-shop')) openPreview(b.dataset.pv); });
  // Seule la Boutique affichée a besoin de se redessiner quand le solde change (boutons « Acheter »
  // grisés) : sans cette garde, chaque mise dans n'importe quel jeu reconstruisait ses 4 listes.
  document.addEventListener('balance-changed', ()=>{ const v=document.getElementById('view-shop'); if(v&&v.classList.contains('active')) render(); });

  C.renderShop = render;
})();
