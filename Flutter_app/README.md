# Flutter_app

Version Flutter du parcours guidé (classe → matière → ressources), équivalente à la page `/` de `EducReact_app`.

```bash
dart run tool/sync_resources.dart   # génère assets/catalog.json depuis ../Resources
flutter run                         # ou : flutter run -d chrome
flutter test
```

- `lib/src/models.dart` : ressources, palettes, cycles.
- `lib/src/catalog.dart` : chargement et requêtes sur le catalogue.
- `lib/src/screens.dart` : les 3 étapes du parcours.
- `lib/src/widgets.dart` : en-tête, tuiles, cartes de ressources.
