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
  function readList(key){ try{ const p=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(p)?p:[]; }catch(e){ return []; } }
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
      +(preview&&it.id!=='classic'?'<button class="fr-copy" data-preview-'+attr+'="'+it.id+'" style="margin:0 6px 0 0">Aperçu</button>':'')+action+'</div>';
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
  // Seule la Boutique affichée a besoin de se redessiner quand le solde change (boutons « Acheter »
  // grisés) : sans cette garde, chaque mise dans n'importe quel jeu reconstruisait ses 4 listes.
  document.addEventListener('balance-changed', ()=>{ const v=document.getElementById('view-shop'); if(v&&v.classList.contains('active')) render(); });

  C.renderShop = render;
})();
