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
  try{ const raw=localStorage.getItem(OWNED_THEMES_KEY); ownedThemes=raw?JSON.parse(raw):[]; }catch(e){}
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
  try{ const raw=localStorage.getItem(OWNED_CARDBACKS_KEY); ownedCardbacks=raw?JSON.parse(raw):[]; }catch(e){}
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

  function swatchHtml(colors){ return '<span class="shop-swatch">'+colors.map(c=>'<i style="background:'+c+'"></i>').join('')+'</span>'; }

  function themeItemHtml(t){
    const owned=themeOwned(t), equipped=currentTheme()===t.id;
    let action;
    if(equipped) action='<button class="shop-equipped" disabled>Équipé</button>';
    else if(owned) action='<button data-equip-theme="'+t.id+'">Équiper</button>';
    else action='<button data-buy-theme="'+t.id+'"'+(C.state.balance<t.cost?' disabled':'')+'>Acheter — '+t.cost+' 🪙</button>';
    return '<div class="shop-item">'+swatchHtml(t.swatch)+'<div class="shop-item-body"><div class="shop-item-name">'+t.name+'</div>'
      +(t.cost>0?'<div class="shop-item-price">'+t.cost+' jetons</div>':'<div class="shop-item-price">Gratuit</div>')+'</div>'+action+'</div>';
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
      +(f.cost!=null?'<div class="shop-item-price">'+f.cost+' jetons</div>':'<div class="shop-item-price">Achievement</div>')+'</div>'+action+'</div>';
  }
  function cardbackItemHtml(c){
    const owned=cardbackOwned(c), equipped=currentCardback()===c.id;
    let action;
    if(equipped) action='<button class="shop-equipped" disabled>Équipé</button>';
    else if(owned) action='<button data-equip-cardback="'+c.id+'">Équiper</button>';
    else action='<button data-buy-cardback="'+c.id+'"'+(C.state.balance<c.cost?' disabled':'')+'>Acheter — '+c.cost+' 🪙</button>';
    return '<div class="shop-item">'+swatchHtml(c.swatch)+'<div class="shop-item-body"><div class="shop-item-name">'+c.name+'</div>'
      +(c.cost>0?'<div class="shop-item-price">'+c.cost+' jetons</div>':'<div class="shop-item-price">Gratuit</div>')+'</div>'+action+'</div>';
  }
  function chipSkinItemHtml(m){
    const owned=C.chips.skinOwned(m.id), equipped=C.chips.getEquippedSkin()===m.id;
    let action;
    if(equipped) action='<button class="shop-equipped" disabled>Équipé</button>';
    else if(owned) action='<button data-equip-chipskin="'+m.id+'">Équiper</button>';
    else action='<button data-buy-chipskin="'+m.id+'"'+(C.state.balance<m.cost?' disabled':'')+'>Acheter — '+m.cost+' 🪙</button>';
    return '<div class="shop-item">'+swatchHtml(chipSkinSwatch(m.id))+'<div class="shop-item-body"><div class="shop-item-name">'+m.name+'</div>'
      +(m.cost>0?'<div class="shop-item-price">'+m.cost+' jetons</div>':'<div class="shop-item-price">Gratuit</div>')+'</div>'+action+'</div>';
  }

  function render(){
    const themesEl=document.getElementById('shop-themes'), framesEl=document.getElementById('shop-frames');
    const cardbacksEl=document.getElementById('shop-cardbacks'), chipskinsEl=document.getElementById('shop-chipskins');
    if(!themesEl||!framesEl) return;
    themesEl.innerHTML=THEMES.map(themeItemHtml).join('');
    framesEl.innerHTML=C.avatars.FRAMES.map(frameItemHtml).join('');
    if(cardbacksEl) cardbacksEl.innerHTML=CARDBACKS.map(cardbackItemHtml).join('');
    if(chipskinsEl) chipskinsEl.innerHTML=CHIPSKIN_META.map(chipSkinItemHtml).join('');
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
  });
  document.addEventListener('balance-changed', render);

  C.renderShop = render;
})();
