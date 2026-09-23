# Bream

Prototype Expo SDK 57 / React Native 0.86 d'un jeu de marche et de construction d'île. L'île est rendue uniquement en 2D isométrique avec Skia ; le renderer 3D et son commutateur ont été retirés.

L'état du joueur et les objets placés sont enregistrés localement (sauvegarde versionnée). Sur Android, Health Connect peut fournir les pas du jour ; le premier relevé réel sert de référence sans crédit rétroactif. iOS utilise encore les données de démonstration : HealthKit, comptes, backend et achats ne sont pas intégrés.

## Démarrage

```sh
npm ci
npm run typecheck
npm test
```

Les modules natifs Skia et Health Connect exigent une **development build** : Expo Go n'est pas un environnement de test suffisant pour cette application.

Pour installer la build Android sur un téléphone connecté en USB (débogage USB activé) :

```sh
npx expo run:android --device
```

La suppression de GL/Three de ce projet nécessite une nouvelle development build pour refléter la liste actuelle des modules natifs. Après cette installation, les changements JavaScript seuls ne demandent pas de rebuild natif. Arrêter l'ancien serveur Metro, puis lancer :

```sh
npx expo start --clear --host lan
```

Le Mac et le téléphone doivent être sur le même réseau. En USB, `adb reverse tcp:8081 tcp:8081` et `npx expo start --clear --localhost --port 8081` évitent de dépendre du Wi-Fi. Ouvrir ensuite l'application Bream installée, et non Expo Go. Une modification de dépendance native, de permission ou de config plugin nécessite une nouvelle build.

Sur iOS, utiliser `npx expo run:ios` après installation d'une version de Xcode et de CocoaPods compatibles avec SDK 57. La production des bundles JavaScript ne valide pas à elle seule la compilation native ni les gestes sur appareil.

## Vérifications

```sh
npm run typecheck
npm test
npx expo-doctor
npx expo install --check
npx expo export --platform android
npx expo export --platform ios
```

Les dossiers natifs `android/` et `ios/` sont actuellement présents. Si le projet est construit directement depuis eux, les changements de `app.json` ne s'y propagent pas automatiquement : utiliser un workflow de prebuild contrôlé ou mettre à jour les fichiers natifs correspondants avant de reconstruire.

Voir [les notes Health Connect](docs/health-connect-android.md) et [le monde isométrique](docs/isometric-prototype.md) pour les tests ciblés.
