// Chargement et validation du catalogue de ressources (dossier Resources/).
//
// Source unique de vérité pour les deux applications :
// - EducReact_app l'importe directement (lib/data.ts) ;
// - Flutter_app embarque le fichier généré par tools/build-catalog.mjs.
//
// Aucune dépendance : Node.js >= 18 suffit.
import fs from "node:fs";
import path from "node:path";

export const CATALOG_VERSION = 1;

const COURSE_FILE = /^cours.*\.json$/i;
const RESOURCE_TYPES = new Set(["link", "video", "iframe"]);
/**
 * Statut d'une ressource (ou d'un fichier de cours entier) :
 * - "actif" (par défaut) : publiée dans les applications ;
 * - "archive" : conservée dans le JSON mais non publiée (lien cassé, contenu obsolète…).
 */
export const STATUTS = ["actif", "archive"];
/** Domaines d'exemple qui ne doivent pas apparaître dans les données publiées. */
const PLACEHOLDER_HOSTS = new Set(["monsite.fr", "monsite2.fr", "example.com", "example.org"]);

const nfc = (value) => (typeof value === "string" ? value.trim().normalize("NFC") : "");

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** { titrePage } si la ressource en déclare un (titre attendu de la page, vérifié par check-links.mjs). */
const optionalTitrePage = (obj) => (nfc(obj?.titrePage) ? { titrePage: nfc(obj.titrePage) } : {});

function listCourseFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listCourseFiles(full);
      return entry.isFile() && COURSE_FILE.test(entry.name) ? [full] : [];
    });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
}

/**
 * Lit tout le dossier Resources et renvoie le catalogue normalisé
 * ainsi que la liste des problèmes détectés.
 *
 * @param {string} resourcesDir
 * @returns {{ catalog: object, issues: { level: "error" | "warning", file: string, message: string }[], archived: object[] }}
 */
export function loadCatalog(resourcesDir) {
  const issues = [];
  const report = (level, file, message) => issues.push({ level, file, message });

  /* ---------- generic_data.json : ordre, palettes, icônes ---------- */

  let ordreNiveaux = [];
  let styles = {};
  const genericFile = path.join(resourcesDir, "generic_data.json");
  if (fs.existsSync(genericFile)) {
    try {
      const generic = readJson(genericFile);
      ordreNiveaux = Array.isArray(generic.niveaux) ? generic.niveaux.map(nfc).filter(Boolean) : [];
      styles = generic.styles && typeof generic.styles === "object" ? generic.styles : {};
    } catch (e) {
      report("error", "generic_data.json", `JSON invalide : ${e.message}`);
    }
  } else {
    report("warning", "generic_data.json", "fichier absent : ni ordre des niveaux, ni couleurs, ni icônes");
  }

  /* ---------- Fichiers de cours ---------- */

  const resources = [];
  /** Ressources archivées : gardées dans les JSON, absentes du catalogue publié. */
  const archived = [];

  const checkTitrePage = (obj, where) => {
    if (obj.titrePage !== undefined && typeof obj.titrePage !== "string") {
      report("error", where, "« titrePage » doit être un texte");
    }
  };

  const readStatut = (obj, where) => {
    if (obj.statut === undefined) return "actif";
    const statut = nfc(obj.statut);
    if (STATUTS.includes(statut)) return statut;
    report("error", where, `statut inconnu « ${obj.statut} » (attendu : ${STATUTS.join(", ")})`);
    return "actif";
  };

  for (const file of listCourseFiles(resourcesDir)) {
    const sourceFile = path.relative(resourcesDir, file).split(path.sep).join("/").normalize("NFC");
    const [niveauFromPath = "", matiereFromPath = ""] = sourceFile.split("/");
    const where = (i) => `${sourceFile} › ressource n°${i + 1}`;

    if (sourceFile.split("/").length !== 3) {
      report("warning", sourceFile, "emplacement attendu : Niveau/Matière/cours*.json");
    }

    let raw;
    try {
      raw = readJson(file);
    } catch (e) {
      report("error", sourceFile, `JSON invalide : ${e.message}`);
      continue;
    }

    let items;
    let courseLabel;
    let fileStatut = "actif";
    let fileMotif = "";
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && typeof raw === "object" && Array.isArray(raw.resources)) {
      items = raw.resources;
      courseLabel = nfc(raw.nom) || nfc(raw.name) || nfc(raw.label) || undefined;
      fileStatut = readStatut(raw, sourceFile);
      fileMotif = nfc(raw.motif);
    } else {
      report("error", sourceFile, 'format attendu : une liste de ressources ou { "nom": "…", "resources": [ … ] }');
      continue;
    }

    if (items.length === 0) report("warning", sourceFile, "aucune ressource");

    const seenUrls = new Set();
    let activeCount = 0;

    items.forEach((item, i) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        report("error", where(i), "une ressource doit être un objet");
        return;
      }

      // Ressource archivée (elle-même ou tout son fichier) : conservée, non publiée, non bloquante.
      const statut = fileStatut === "archive" ? "archive" : readStatut(item, where(i));
      if (statut === "archive") {
        archived.push({
          sourceFile,
          titre: nfc(item.titre) || nfc(item.url) || `ressource n°${i + 1}`,
          url: nfc(item.url),
          ...optionalTitrePage(item),
          sousRessources: Array.isArray(item.chapitre)
            ? item.chapitre
                .map((s) => ({ titre: nfc(s?.titre), url: nfc(s?.url), ...optionalTitrePage(s) }))
                .filter((s) => s.url)
            : [],
          motif: nfc(item.motif) || fileMotif,
        });
        return;
      }
      activeCount++;

      const titre = nfc(item.titre);
      const url = nfc(item.url);
      const type = nfc(item.type) || "link";

      if (!titre) report("error", where(i), "« titre » manquant");
      if (!url) {
        report("error", where(i), "« url » manquante");
        return;
      }

      const host = hostOf(url);
      if (!host || !/^https?:$/.test(new URL(url).protocol)) {
        report("error", where(i), `URL invalide : ${url}`);
        return;
      }
      if (PLACEHOLDER_HOSTS.has(host)) report("warning", where(i), `lien d'exemple à remplacer : ${url}`);
      if (url.startsWith("http://")) report("warning", where(i), `lien non sécurisé (http) : ${url}`);
      if (seenUrls.has(url)) report("warning", where(i), `URL en double dans le fichier : ${url}`);
      seenUrls.add(url);

      checkTitrePage(item, where(i));

      if (!RESOURCE_TYPES.has(type)) {
        report("error", where(i), `type inconnu « ${type} » (attendu : ${[...RESOURCE_TYPES].join(", ")})`);
      }

      // « chapitre » peut être un texte ou une liste de sous-liens (parties du cours).
      let chapitre = "";
      let sousRessources;
      if (typeof item.chapitre === "string") {
        chapitre = nfc(item.chapitre);
      } else if (Array.isArray(item.chapitre)) {
        sousRessources = [];
        item.chapitre.forEach((sub, j) => {
          const subUrl = nfc(sub?.url);
          if (!subUrl || !hostOf(subUrl)) {
            report("error", `${where(i)} › partie n°${j + 1}`, "« url » manquante ou invalide");
            return;
          }
          checkTitrePage(sub, `${where(i)} › partie n°${j + 1}`);
          sousRessources.push({ titre: nfc(sub.titre) || subUrl, url: subUrl, ...optionalTitrePage(sub) });
        });
      } else if (item.chapitre !== undefined) {
        report("error", where(i), "« chapitre » doit être un texte ou une liste de { titre, url }");
      }

      resources.push({
        niveau: nfc(item.niveau) || niveauFromPath.normalize("NFC"),
        matiere: nfc(item.matiere) || matiereFromPath.normalize("NFC"),
        chapitre,
        titre: titre || url,
        type: RESOURCE_TYPES.has(type) ? type : "link",
        source: nfc(item.source),
        url,
        ...optionalTitrePage(item),
        ...(sousRessources?.length ? { sousRessources } : {}),
        sourceFile,
        courseLabel: nfc(item.courseLabel) || courseLabel || path.basename(file),
      });
    });

    if (items.length > 0 && activeCount === 0 && fileStatut !== "archive") {
      report("warning", sourceFile, "toutes les ressources sont archivées : le cours n'apparaît plus");
    }
  }

  /* ---------- Cohérence avec generic_data.json ---------- */

  const niveaux = new Set(resources.map((r) => r.niveau));
  const matieres = new Set(resources.map((r) => r.matiere));

  for (const n of niveaux) {
    if (ordreNiveaux.length && !ordreNiveaux.includes(n)) {
      report("warning", "generic_data.json", `niveau « ${n} » absent de la liste « niveaux » (ordre d'affichage)`);
    }
    if (!styles.niveaux?.[n]) report("warning", "generic_data.json", `niveau « ${n} » sans couleurs`);
  }
  for (const m of matieres) {
    if (!styles.matieres?.[m]) report("warning", "generic_data.json", `matière « ${m} » sans couleurs`);
    if (!styles.icons?.matieres?.[m]) report("warning", "generic_data.json", `matière « ${m} » sans icône`);
  }

  return {
    catalog: {
      version: CATALOG_VERSION,
      generatedAt: new Date().toISOString(),
      ordreNiveaux,
      styles,
      resources,
    },
    issues,
    archived,
  };
}

/** Affiche les problèmes regroupés par niveau de gravité. Renvoie le nombre d'erreurs. */
export function printIssues(issues, { warnings = true, out = console } = {}) {
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warning");

  if (errors.length) {
    out.error(`\n✖ ${errors.length} erreur(s) :`);
    errors.forEach((i) => out.error(`  - ${i.file} : ${i.message}`));
  }
  if (warnings && warns.length) {
    out.warn(`\n⚠ ${warns.length} avertissement(s) :`);
    warns.forEach((i) => out.warn(`  - ${i.file} : ${i.message}`));
  }
  return errors.length;
}
