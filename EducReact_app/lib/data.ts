import path from "path";
import { loadCatalog as loadSharedCatalog, printIssues } from "../../tools/catalog.mjs";
import type { Resource, StyleCatalog } from "../types/resources";

/**
 * Dossier des ressources (JSON des cours), partagé avec l'app Flutter.
 * Par défaut : ../Resources par rapport à EducReact_app. Surchargeable via RESOURCES_DIR.
 */
export const resourcesDir = process.env.RESOURCES_DIR
  ? path.resolve(process.env.RESOURCES_DIR)
  : path.join(process.cwd(), "..", "Resources");

/**
 * Charge le catalogue via le module partagé tools/catalog.mjs (même logique que l'app Flutter).
 * Les ressources invalides sont écartées ; les erreurs sont affichées dans la console du serveur.
 */
export function loadCatalog(): { resources: Resource[]; levelOrder: string[]; styleData: StyleCatalog } {
  const { catalog, issues } = loadSharedCatalog(resourcesDir);
  printIssues(issues, { warnings: false });

  return {
    resources: catalog.resources,
    levelOrder: catalog.ordreNiveaux,
    styleData: { ...catalog.styles, ordreNiveaux: catalog.ordreNiveaux },
  };
}
