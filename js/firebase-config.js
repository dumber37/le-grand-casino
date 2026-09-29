/* ============================================================
   CONFIGURATION FIREBASE — déjà remplie avec les valeurs de ton
   projet "casino-b129a" récupérées dans la console Firebase.
   Tant que CASINO_FIREBASE_CONFIG reste rempli comme ci-dessous, la
   synchronisation cloud est active. Si tu veux la désactiver, remets
   `null` à la place de l'objet.

   Rappel : cette "apiKey" n'est PAS un secret à protéger comme un mot
   de passe — elle identifie juste ton projet Firebase publiquement,
   c'est normal qu'elle soit visible dans le code d'un site web. Ce qui
   protège réellement les données de chaque joueur, ce sont les RÈGLES
   DE SÉCURITÉ Firestore (déjà publiées si tu as suivi l'étape 2 du
   guide : match /saves/{uid} { allow read, write: if request.auth.uid
   == uid; }).
   ============================================================ */
window.CASINO_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAwnY44vxkSVTXrmBXUczsdGZykHuHilW8",
  authDomain: "casino-b129a.firebaseapp.com",
  projectId: "casino-b129a",
  storageBucket: "casino-b129a.firebasestorage.app",
  messagingSenderId: "98901263287",
  appId: "1:98901263287:web:fca9a262f63d76f3249e32"
};
