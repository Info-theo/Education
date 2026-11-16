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
- `titrePage` (facultatif, aussi sur les sous-liens) : titre attendu de la page, pour détecter un contenu remplacé
  (voir « Vérifier les liens »).
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

### Archiver une ressource au lieu de la supprimer

Ajoute `"statut": "archive"` (et idéalement un `"motif"`) à la ressource : elle reste dans le JSON,
mais n'apparaît plus dans les applications et ses erreurs ne bloquent plus la génération.

```json
{
  "statut": "archive",
  "motif": "lien cassé depuis mars 2026",
  "titre": "Les fractions",
  "url": "https://exemple.fr/fractions"
}
```

- Pour archiver **tout un cours**, mets `"statut": "archive"` à côté de `"nom"` et `"resources"`.
- Pour la republier, retire le statut (ou mets `"actif"`).
- `node tools/build-catalog.mjs --check --archives` liste toutes les ressources archivées.

### Vérifier les liens

```bash
node tools/check-links.mjs                    # liens des ressources publiées
node tools/check-links.mjs --archives         # + archivées : un lien cassé remarche-t-il ?
node tools/check-links.mjs --report liens.md  # rapport Markdown en plus
node tools/check-links.mjs --save-titles      # enregistre le titre actuel des pages dans « titrePage »
node tools/check-links.mjs --update-titles    # idem, et remplace les titres qui ont changé
```

Résultat : **cassés** (404, domaine introuvable, délai dépassé…), **à vérifier** (401/403/429 : souvent un site
qui bloque les robots), **redirigés** vers un autre domaine, et **titre changé** : la page répond mais son titre
ne correspond plus à `titrePage` (page remplacée, cours déplacé…). Le titre lu est la balise `<title>` (ou `og:title`) ;
pour YouTube, le titre officiel de la vidéo ou de la playlist, ce qui détecte aussi les vidéos supprimées ou privées.

Pour surveiller le contenu : lance une fois `--save-titles` (les fichiers modifiés sont réindentés), relis le diff,
commite. Quand un titre change, ouvre la page : si elle convient toujours, `--update-titles` ; sinon, remplace
ou archive la ressource. Le workflow `check-links.yml` lance la vérification
chaque lundi, à la demande, et sur chaque pull request qui modifie `Resources/` ; le rapport s'affiche
dans le résumé de l'exécution (onglet **Actions**).

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

## Publication sur GitHub Pages

Le workflow `.github/workflows/pages.yml` construit les deux applications et publie le site
à chaque push sur `main` (ou à la demande depuis l'onglet **Actions**) :

| Adresse | Contenu |
|---|---|
| `https://<compte>.github.io/<dépôt>/` | version React guidée |
| `…/avance/` | version React, recherche avancée |
| `…/flutter/` | version Flutter (web) |
| `…/catalog.json` | catalogue complet des ressources |

À faire une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
Le déploiement échoue si `Resources/` contient des erreurs (`node tools/build-catalog.mjs --check`).
