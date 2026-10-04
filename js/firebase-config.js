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
   DE SÉCURITÉ Firestore (Firestore Database → onglet « Règles »). Colle
   ces deux blocs (le premier protège les sauvegardes cloud, le second
   sert aux codes de salon à 6 caractères du Salon entre amis — éphémères
   et sans donnée sensible, donc volontairement ouverts) :

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /saves/{uid} {
         allow read, write: if request.auth.uid == uid;
       }
       match /rooms/{code} {
         allow read, write: if true;
       }
     }
   }

   VERSION RENFORCÉE recommandée pour le bloc /rooms (même fonctionnement
   pour les joueurs, mais personne ne peut lister tous les salons, écraser
   l'offre d'un autre, ni remplacer une réponse déjà donnée) :

       match /rooms/{code} {
         allow get: if true;
         allow list: if false;
         allow create: if request.resource.data.keys().hasOnly(['offer','answer','createdAt'])
                       && request.resource.data.answer == null;
         allow update: if resource.data.answer == null
                       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['answer']);
         allow delete: if true;
       }

   Sans le second bloc, le bouton « Générer un code rapide » du Salon
   entre amis échoue avec une erreur "permission-denied" — le Salon
   entre amis reste utilisable via son mode avancé (code/lien/QR
   manuels) même sans cette règle.
   ============================================================ */
window.CASINO_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAwnY44vxkSVTXrmBXUczsdGZykHuHilW8",
  authDomain: "casino-b129a.firebaseapp.com",
  projectId: "casino-b129a",
  storageBucket: "casino-b129a.firebasestorage.app",
  messagingSenderId: "98901263287",
  appId: "1:98901263287:web:fca9a262f63d76f3249e32"
};
