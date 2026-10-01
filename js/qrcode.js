/* ============================================================
   GÉNÉRATEUR DE QR CODE — petite couche au-dessus de qrcode-lib.js
   (bibliothèque vendée localement, voir ce fichier pour la licence
   MIT/provenance). Cette bibliothèque exige un "typeNumber" (version
   QR 1 à 40) choisi à l'avance plutôt que de le déduire elle-même :
   on sonde ici la plus petite version qui accepte la donnée, plutôt
   que de toujours utiliser la plus grande (un code inutilement dense
   est plus dur à scanner sur un écran de taille fixe).
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  function makeQrSvg(text, cellSize, margin){
    if(typeof qrcode !== 'function') return null;
    for(let type=1; type<=40; type++){
      try{
        const qr=qrcode(type,'L');
        qr.addData(text);
        qr.make();
        return qr.createSvgTag({cellSize:cellSize||4, margin:margin!=null?margin:8});
      }catch(e){ /* trop grand pour cette version — essaie la suivante */ }
    }
    return null; // trop long même en version 40 (~2900 octets en mode octet, ECC L)
  }
  C.makeQrSvg = makeQrSvg;
})();
