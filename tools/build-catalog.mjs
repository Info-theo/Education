#!/usr/bin/env node
// Valide Resources/ et génère le catalogue unique catalog.json.
//
// Usage (depuis la racine du dépôt) :
//   node tools/build-catalog.mjs            valide puis écrit Flutter_app/assets/catalog.json
//   node tools/build-catalog.mjs --check    valide seulement (aucun fichier écrit)
//   node tools/build-catalog.mjs --out a.json --out b.json   destinations personnalisées
//   node tools/build-catalog.mjs --quiet    masque les avertissements
//   node tools/build-catalog.mjs --force    écrit quand même, sans les ressources invalides
//
// Code de sortie : 1 s'il y a au moins une erreur (rien n'est écrit, sauf avec --force).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, printIssues } from "./catalog.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

const checkOnly = args.includes("--check");
const quiet = args.includes("--quiet");
const force = args.includes("--force");
const outs = args.flatMap((a, i) => (a === "--out" && args[i + 1] ? [path.resolve(args[i + 1])] : []));
const resourcesDir = process.env.RESOURCES_DIR
  ? path.resolve(process.env.RESOURCES_DIR)
  : path.join(repoRoot, "Resources");
const destinations = outs.length ? outs : [path.join(repoRoot, "Flutter_app", "assets", "catalog.json")];

const { catalog, issues } = loadCatalog(resourcesDir);
const errorCount = printIssues(issues, { warnings: !quiet });

const files = new Set(catalog.resources.map((r) => r.sourceFile)).size;
console.log(`\n${catalog.resources.length} ressources dans ${files} fichiers de cours.`);

if (errorCount > 0 && !force) {
  console.error("Catalogue NON généré : corrige les erreurs ci-dessus (ou relance avec --force).");
  process.exit(1);
}
if (errorCount > 0) {
  console.warn("--force : catalogue généré sans les ressources invalides.");
  process.exitCode = 1;
}

if (!checkOnly) {
  const json = JSON.stringify(catalog, null, 2) + "\n";
  for (const dest of destinations) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, json);
    console.log(`→ ${path.relative(repoRoot, dest)}`);
  }
}
