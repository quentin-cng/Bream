# Bream

Prototype technique 3D cross-platform d'une application de motivation par la marche.

La Home affiche une véritable île 3D sous l'interface native existante. Les onglets ouvrent des panneaux locaux alimentés uniquement par des données fictives. Un prototype local permet d'ajouter plusieurs maisons, puis de toucher une maison pour la prévisualiser, l'orienter ou la déplacer sur huit slots prédéfinis, sans persistance, coût ou inventaire. Aucun HealthKit, Health Connect, compte, stockage, achat ou système de progression n'est intégré.

## Préparer le projet

Prérequis : Node.js/npm et Expo Go compatible avec le SDK 57 sur le téléphone. Dans le dossier du projet :

```bash
npm ci
npm start -- --lan
```

Laisser Metro ouvert pendant le test. Le Mac et le téléphone doivent être sur le même réseau Wi-Fi. Un seul serveur Metro peut accueillir simultanément un iPhone et un Android ; chaque développeur peut aussi lancer ces commandes sur sa propre copie du projet.

Expo Go suffit pour le prototype actuel : Expo GL et les autres modules natifs utilisés sont inclus. Un development build ne deviendra nécessaire que si une future dépendance native absente d'Expo Go est ajoutée.

## Tester sur un iPhone physique

1. Installer ou mettre à jour Expo Go depuis l'App Store. Ne pas modifier la version du SDK du projet si Expo Go indique une incompatibilité ; utiliser une version d'Expo Go compatible ou, à ce moment-là seulement, un development build.
2. Lancer `npm start -- --lan` depuis le dossier du projet.
3. Scanner le QR code avec Appareil photo, puis choisir d'ouvrir le lien dans Expo Go. Autoriser l'accès au réseau local si iOS le demande.
4. Attendre l'affichage de la Home et de l'île 3D. Sur une zone dégagée de l'île, glisser un doigt pour orbiter et pincer à deux doigts pour zoomer.
5. Mettre l'app en arrière-plan, la rouvrir et vérifier que la scène reprend correctement.

## Tester sur un Android physique (Samsung)

1. Installer ou mettre à jour Expo Go depuis le Play Store. Le mode développeur, le débogage USB et Android Studio ne sont pas requis pour ce test par Wi-Fi.
2. Lancer `npm start -- --lan` depuis le dossier du projet.
3. Dans Expo Go, utiliser **Scan QR code** et scanner le QR affiché par Metro. Autoriser la caméra et l'accès réseau si Android les demande.
4. Attendre l'affichage de la Home et de l'île 3D. Sur une zone dégagée de l'île, glisser un doigt pour orbiter et pincer à deux doigts pour zoomer.
5. Mettre l'app en arrière-plan, la rouvrir et vérifier que la scène reprend correctement.

Sur certains Samsung, l'optimisation de batterie peut fermer Expo Go après une longue mise en arrière-plan ; cela ne signale pas un problème du renderer. Pour un test court, aucun réglage système particulier n'est nécessaire.

## Contrôle tactile attendu

- Orbite horizontale continue sur 360°, sans butée.
- Élévation bornée à 30–48° (départ à 33°).
- Distance bornée à 0,55–1,30 fois le cadrage initial.
- Aucun saut lors du passage d'un à deux doigts.
- Les panneaux natifs ne déplacent pas la caméra ; la zone 3D restée visible reçoit les gestes.
- Pas de pan indépendant ni de rotation à 360° à cette étape.

Pour chaque appareil, vérifier aussi l'absence d'écran d'erreur rouge, le bon positionnement sous la barre d'état, la présence de toute l'interface native et la fluidité pendant deux à trois minutes.

## Résoudre une connexion Expo Go

Vérifier d'abord le Wi-Fi, l'autorisation Réseau local d'iOS, le pare-feu du Mac et les VPN. Le téléphone doit pouvoir atteindre l'adresse LAN du Mac, pas `127.0.0.1`.

Si le réseau local filtre les connexions entre appareils, utiliser temporairement le tunnel :

```bash
npm start -- --tunnel
```

Le tunnel nécessite Internet, peut demander l'installation de l'outil de tunnel par Expo et sera plus lent que le LAN. Aucun backend Bream n'est nécessaire.

## Rendu et limites

- Three.js 0.180.0, React Three Fiber 9.7.0 (`@react-three/fiber/native`), Expo GL 57.0.2.
- Expo Asset 57.0.18 et File System 57.0.7 satisfont les adaptateurs natifs de R3F ; aucun modèle ou texture externe n'est chargé.
- Modèle GLB local composé de trois meshes et de couleurs de sommets, sans texture externe ni animation.
- Lumière hémisphérique + directionnelle ; ni ombres 3D, physique, shaders personnalisés ni post-traitement.
- Rendu à la demande pendant le mouvement et son amortissement ; pause en arrière-plan.
- Le Canvas natif de R3F rend à la densité de pixels de l'appareil. Le réglage `dpr` du Canvas web n'est pas disponible ici.
- `metro.config.js` fait partager une seule instance de Three à R3F (CommonJS) et à la scène (imports ES), pour éviter deux copies du moteur.
- Expo GL repose sur OpenGL ES sur iOS et Android. Cette scène légère doit encore être contrôlée sur les deux téléphones physiques pour mesurer la fluidité, la chauffe et la batterie réelles.

## Vérifications de développement

```bash
npm run typecheck
npx expo install --check
npx expo export --platform ios
npx expo export --platform android
```

Les exports vérifient que Metro produit chaque bundle ; ils ne remplacent pas le test tactile sur les appareils physiques.

## Hypothèses de plateforme connues

- `SafeAreaView` de React Native protège le contenu sur iOS. Un padding égal à la hauteur de la barre d'état est ajouté sur Android, où ce composant ne fournit pas la même protection.
- Les propriétés `shadow*` sont principalement iOS ; `elevation` fournit l'équivalent minimal sur Android.
- La barre d'état est translucide sur les deux plateformes. Android récent peut ignorer certaines options historiques de couleur de fond, sans affecter le rendu 3D.
- Les gestes utilisent uniquement les responders React Native et ne contiennent aucune branche iOS/Android.
- Le projet ne déclare aucune permission santé, authentification, achat ou stockage.

## Structure

- `App.tsx` : composition de la Home et styles de l'interface native.
- `src/island/IslandScene.tsx` : scène, lumières, caméra et gestes bornés.
- `src/island/createIslandGeometry.ts` : ancien générateur procédural, conservé temporairement mais non utilisé.
- `assets/models/island.glb` : modèle 3D actuellement affiché.
- `assets/island-home.png` : référence artistique uniquement, non utilisée pour le rendu.
- `reference.png` : référence artistique d'origine.
