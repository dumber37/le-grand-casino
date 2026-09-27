/* ============================================================
   AMBIANCE — particules dorées flottantes en arrière-plan.
   Purement décoratif : génère quelques éléments dans #ambientLayer
   (défini dans index.html) avec des trajectoires/durées aléatoires
   via CSS. N'écoute ni ne modifie aucun état de jeu.
   ============================================================ */
(function(){
  const layer=document.getElementById('ambientLayer');
  if(!layer) return;
  const COUNT=16;
  for(let i=0;i<COUNT;i++){
    const p=document.createElement('span');
    p.className='ambient-particle';
    const size=(2+Math.random()*3).toFixed(1);
    p.style.left=(Math.random()*100)+'%';
    p.style.width=size+'px';
    p.style.height=size+'px';
    p.style.animationDuration=(14+Math.random()*14)+'s';
    p.style.animationDelay='-'+(Math.random()*26)+'s';
    p.style.setProperty('--drift', ((Math.random()*80)-40).toFixed(0)+'px');
    p.style.opacity=(0.15+Math.random()*0.25).toFixed(2);
    layer.appendChild(p);
  }
})();
