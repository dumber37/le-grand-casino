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

  function render(){
    const themesEl=document.getElementById('shop-themes'), framesEl=document.getElementById('shop-frames');
    if(!themesEl||!framesEl) return;
    themesEl.innerHTML=THEMES.map(themeItemHtml).join('');
    framesEl.innerHTML=C.avatars.FRAMES.map(frameItemHtml).join('');
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
  });
  document.addEventListener('balance-changed', render);

  C.renderShop = render;
})();
