# Flutter_app

Version Flutter du parcours guidé (classe → matière → ressources), équivalente à la page `/` de `EducReact_app`.

```bash
node ../tools/build-catalog.mjs     # génère assets/catalog.json depuis ../Resources
flutter run                         # ou : flutter run -d chrome
flutter test
```

## Données : `assets/catalog.json`

L'app ne lit pas `../Resources` directement : elle embarque `assets/catalog.json`, généré par
`tools/build-catalog.mjs` avec la même logique que l'app React (`tools/catalog.mjs`).

- **Après chaque modification de `Resources/`**, relance `node ../tools/build-catalog.mjs` avant `flutter run`
  (sinon l'app affiche l'ancien contenu). Le workflow GitHub Pages le fait tout seul.
- Ne modifie pas `catalog.json` à la main : il est écrasé à chaque génération.
- Le champ `generatedAt` change à chaque génération, donc le fichier apparaît toujours modifié dans git.

## Code

- `lib/src/models.dart` : ressources, palettes, cycles.
- `lib/src/catalog.dart` : chargement et requêtes sur le catalogue.
- `lib/src/screens.dart` : les 3 étapes du parcours.
- `lib/src/widgets.dart` : en-tête, tuiles, cartes de ressources.
