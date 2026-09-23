# Monde isométrique Skia

La scène 2D est désormais l'unique renderer de l'île. Le fond `default_sky` et son léger parallax restent configurés dans `src/isometric/backgroundCatalog.ts` et `backgroundParallax.ts`. L'île PNG et la calibration de la grille sont dans `islandArt.ts` ; les tailles et points d'ancrage des objets sont dans `spriteCatalog.ts`. Les coûts, XP, niveaux et empreintes logiques sont dans `src/island/objectCatalog.ts`.

## Samsung : nouvelle development build

Cette migration retire le module natif `expo-gl` et les dépendances Three/React Three Fiber. La development build précédemment installée contient encore GL : reconstruire une fois pour obtenir le binaire correspondant au projet actuel. Activer le débogage USB et connecter le téléphone, puis depuis la racine du projet :

```sh
adb devices
npx expo run:android --device
```

Après l'installation, les changements JavaScript/PNG seuls peuvent être testés sans reconstruire :

```sh
adb reverse tcp:8081 tcp:8081
npx expo start --clear --localhost --port 8081
```

Ouvrir Bream, pas Expo Go. La scène 2D doit apparaître directement sur l'onglet Île, sans bouton TEST 2D. Faire glisser avec un doigt, pincer pour zoomer et contrôler le parallax discret du fond. Dans Collection, sélectionner chaque nouvelle maison puis « Construire » ; sur l'île, déplacer l'aperçu translucide, confirmer ou annuler, puis toucher une maison placée pour la modifier. Vérifier qu'elles gardent leur ordre de profondeur et leur position après fermeture/réouverture de l'app.

Les anciennes sauvegardes V1/V2 gardent leurs anciens `type`, ID, empreinte, position et rotation. Leurs cinq types ne sont plus proposés dans Build, mais leurs objets existants restent visibles et éditables avec un sprite 2D de remplacement. Les trois nouveaux types `house1`, `house2`, `house3` utilisent leurs PNG respectifs. Aucune conversion de coût, d'Énergie ou d'XP n'est appliquée au chargement.

Les PNG actuels ne fournissent qu'une seule orientation. Le bouton de rotation conserve la valeur logique de rotation, mais n'oriente pas encore visuellement l'image ; des sprites directionnels pourront être ajoutés plus tard. Remplacer un PNG par une version améliorée au même chemin ne change ni les ID ni la sauvegarde. Si son cadrage change, ajuster seulement `renderSize` et `anchor` dans `spriteCatalog.ts`.
