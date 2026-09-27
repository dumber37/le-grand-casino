/* ============================================================
   JETONS — piles de jetons dessinées en CSS pur, façon jetons de
   poker en plastique (1 blanc, 5 rouge, 10 vert, 25 bleu nuit, 50
   noir, puis 100 violet, 500 orange, 1000 or), avec les petites
   marques ♠ ♥ ♦ ♣ sur la tranche. Une somme est décomposée en jetons
   (plus grosses valeurs d'abord) : plus la mise est élevée, plus les
   piles sont hautes / nombreuses. Purement visuel : C.chips.html(montant).
   ============================================================ */
window.Casino=window.Casino||{};
(function(){
  const C=window.Casino;
  const DENOMS=[
    {v:1000,c:'#d4af37',t:'#3a2a05'},
    {v:500, c:'#c96a1f',t:'#fff'},
    {v:100, c:'#5b2a86',t:'#fff'},
    {v:50,  c:'#1b1b1b',t:'#fff'},
    {v:25,  c:'#1c2f52',t:'#fff'},
    {v:10,  c:'#1f6b3a',t:'#fff'},
    {v:5,   c:'#9a1f1f',t:'#fff'},
    {v:1,   c:'#ece6d3',t:'#1f3a8a'}
  ];
  const MAX_STACK=10, MAX_COLS=4, THICK=3.6, TOP_H=16;

  // Décompose un montant en piles {denom, n}. On choisit à chaque étape la plus grosse valeur qui
  // tient AU MOINS DEUX FOIS dans le reste : la mise se lit alors en vraies piles (jetons empilés),
  // et plus elle est grosse, plus les piles sont hautes — plutôt qu'un jeton de chaque valeur.
  function split(amount){
    let left=Math.max(0,Math.floor(amount)), out=[];
    while(left>0){
      const d=DENOMS.find(x=>left>=2*x.v)||DENOMS[DENOMS.length-1];
      const n=Math.floor(left/d.v); out.push({d,n}); left-=n*d.v;
    }
    return out;
  }
  function html(amount,opts){
    opts=opts||{};
    if(!(amount>0)) return '';
    const cols=split(amount).slice(0,opts.maxCols||MAX_COLS);
    let s='<span class="chips" style="--cs:'+(opts.scale||1)+'">';
    cols.forEach(col=>{
      const n=Math.min(col.n,MAX_STACK), h=Math.round(TOP_H+(n-1)*THICK+3);
      s+='<span class="cstack" style="height:'+h+'px">';
      for(let i=0;i<n;i++){
        const top=i===n-1;
        s+='<i class="pc'+(top?' pc-top':'')+'" style="--c:'+col.d.c+';--tx:'+col.d.t+';bottom:'+(i*THICK)+'px">'+(top?'<b>'+col.d.v+'</b>':'')+'</i>';
      }
      if(col.n>MAX_STACK) s+='<em class="cmore">×'+col.n+'</em>';
      s+='</span>';
    });
    if(opts.label!==false) s+='<span class="camt">'+amount+'</span>';
    return s+'</span>';
  }
  C.chips={html,split};
})();
