/* ============================================================
   SERVEUR RELAIS TURN (Metered, offre gratuite) — utilisé par le Salon
   entre amis quand la connexion directe entre deux appareils est
   impossible (wifi qui isole les appareils, 4G/5G, pare-feu...). Les
   données restent chiffrées de bout en bout (DTLS) : le relais ne fait
   que les transmettre. Ces identifiants sont visibles dans le code du
   site (inévitable côté navigateur) ; le quota gratuit est plafonné.
   Pour les révoquer ou en changer : dashboard.metered.ca → TURN Server
   → Credentials. Mettre `null` désactive le relais (STUN seul).
   ============================================================ */
window.CASINO_TURN_SERVERS = (function(){
  const username = 'db486fc9d824e088dbb91328';
  const credential = '/halN+sfA4DwQMZ4';
  return [
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'turn:global.relay.metered.ca:80', username, credential },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username, credential },
    { urls: 'turn:global.relay.metered.ca:443', username, credential },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username, credential }
  ];
})();
