# Ressources pédagogiques

Catalogue de cours et de vidéos du CP à la fac, classés par niveau et par matière.

## Organisation du dépôt

```
Resources/        JSON des cours, partagés par les deux applications
tools/            lecture, validation et génération du catalogue (Node.js, sans dépendance)
EducReact_app/    application web Next.js (version guidée + recherche avancée)
Flutter_app/      application Flutter (mobile, web, Windows) — version guidée
```

### Resources

- `Niveau/Matière/cours*.json` : un fichier = un cours. Le niveau et la matière sont déduits du chemin.
  Le fichier est soit une liste de ressources, soit un objet `{ "nom": "…", "resources": [ … ] }`.
- Une ressource : `titre`, `url` (obligatoires), `type` (`link`, `video` ou `iframe`), `source`, et `chapitre`
  (texte, ou liste de sous-liens `{ titre, url }` pour les cours en plusieurs parties).
- `generic_data.json` : ordre des niveaux, couleurs et icônes des niveaux et des matières.

Dans VS Code, les fichiers `cours*.json` sont vérifiés pendant la saisie grâce au schéma
`tools/cours.schema.json` (autocomplétion et soulignement des erreurs).

### Valider et générer le catalogue

La logique de lecture est écrite une seule fois, dans `tools/catalog.mjs`, et partagée par les deux apps.

```bash
node tools/build-catalog.mjs --check   # valide Resources/ sans rien écrire
node tools/build-catalog.mjs           # valide puis génère Flutter_app/assets/catalog.json
```

- **Erreurs** (JSON invalide, titre ou URL manquants, type inconnu…) : la génération est refusée
  (`--force` génère quand même, sans les ressources invalides).
- **Avertissements** (liens d'exemple, `http://`, doublons, matière sans couleur ou sans icône…) : signalés seulement.

### EducReact_app

```bash
cd EducReact_app
npm install
npm run dev
```

- `/` : parcours guidé (classe → matière → ressources).
- `/avance` : recherche avancée (plusieurs niveaux, matières et cours à la fois).

Les données sont lues dans `../Resources` (ou dans le dossier indiqué par la variable `RESOURCES_DIR`).

| Modification des JSON | Que faire ? |
|---|---|
| En développement (`npm run dev`) | Rafraîchir la page. |
| En production | `npm run build` (la validation est lancée automatiquement avant), puis redéployer. |

### Flutter_app

```bash
node tools/build-catalog.mjs   # depuis la racine, après chaque modification de Resources/
cd Flutter_app
flutter run
```

Le catalogue est embarqué dans l'application (`assets/catalog.json`) : après une modification,
régénère-le puis appuie sur `R` dans `flutter run`, ou rebuild l'application.
