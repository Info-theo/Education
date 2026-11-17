export const CATALOG_VERSION: number;

export interface CatalogIssue {
  level: "error" | "warning";
  file: string;
  message: string;
}

export interface CatalogSubResource {
  titre: string;
  url: string;
  /** Titre attendu de la page, vérifié par tools/check-links.mjs. */
  titrePage?: string;
}

export interface CatalogResource {
  niveau: string;
  matiere: string;
  chapitre: string;
  titre: string;
  type: "link" | "video" | "iframe";
  /** cours : cours complet du niveau · exercices : entraînement · ressource : outil ou site général. */
  nature: CatalogNature;
  source: string;
  url: string;
  /** Titre attendu de la page, vérifié par tools/check-links.mjs. */
  titrePage?: string;
  sousRessources?: CatalogSubResource[];
  sourceFile: string;
  courseLabel: string;
}

export interface CatalogPalette {
  base?: string;
  selected?: string;
  border?: string;
  text?: string;
  card?: string;
  accent?: string;
}

export interface Catalog {
  version: number;
  generatedAt: string;
  ordreNiveaux: string[];
  styles: {
    niveaux?: Record<string, CatalogPalette>;
    matieres?: Record<string, CatalogPalette>;
    icons?: { niveaux?: Record<string, string>; matieres?: Record<string, string> };
  };
  resources: CatalogResource[];
}

export type CatalogNature = "cours" | "exercices" | "ressource";
export const NATURES: readonly CatalogNature[];

export const STATUTS: readonly ("actif" | "archive")[];

/** Ressource conservée dans les JSON avec "statut": "archive", absente du catalogue publié. */
export interface ArchivedResource {
  sourceFile: string;
  titre: string;
  url: string;
  titrePage?: string;
  sousRessources: CatalogSubResource[];
  motif: string;
}

export function loadCatalog(resourcesDir: string): {
  catalog: Catalog;
  issues: CatalogIssue[];
  archived: ArchivedResource[];
};

export function printIssues(
  issues: CatalogIssue[],
  options?: { warnings?: boolean; out?: Pick<Console, "error" | "warn"> }
): number;
