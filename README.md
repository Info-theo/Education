# Ressources pédagogiques

Catalogue de cours et de vidéos du CP à la fac, classés par niveau et par matière.

## Organisation du dépôt

```
Resources/        JSON des cours, partagés par les deux applications
EducReact_app/    application web Next.js (version guidée + recherche avancée)
Flutter_app/      application Flutter (mobile, web, Windows) — version guidée
```

### Resources

- `Niveau/Matière/cours*.json` : un fichier = un cours. Le niveau et la matière sont déduits du chemin.
  Le fichier est soit une liste de ressources, soit un objet `{ "nom": "…", "resources": [ … ] }`.
- Une ressource : `titre`, `type` (`link`, `video` ou `iframe`), `source`, `url`, et `chapitre`
  (texte, ou liste de sous-liens `{ titre, url }` pour les cours en plusieurs parties).
- `generic_data.json` : ordre des niveaux, couleurs et icônes des niveaux et des matières.

### EducReact_app

```bash
cd EducReact_app
npm install
npm run dev
```

- `/` : parcours guidé (classe → matière → ressources).
- `/avance` : recherche avancée (plusieurs niveaux, matières et cours à la fois).

Les données sont lues dans `../Resources` (ou dans le dossier indiqué par la variable `RESOURCES_DIR`).

### Flutter_app

```bash
cd Flutter_app
dart run tool/sync_resources.dart   # à relancer après chaque modification de Resources/
flutter run
```

Le script `tool/sync_resources.dart` regroupe `../Resources` dans `assets/catalog.json`,
embarqué dans l'application.
