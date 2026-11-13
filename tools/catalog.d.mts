export const CATALOG_VERSION: number;

export interface CatalogIssue {
  level: "error" | "warning";
  file: string;
  message: string;
}

export interface CatalogSubResource {
  titre: string;
  url: string;
}

export interface CatalogResource {
  niveau: string;
  matiere: string;
  chapitre: string;
  titre: string;
  type: "link" | "video" | "iframe";
  source: string;
  url: string;
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

export function loadCatalog(resourcesDir: string): { catalog: Catalog; issues: CatalogIssue[] };

export function printIssues(
  issues: CatalogIssue[],
  options?: { warnings?: boolean; out?: Pick<Console, "error" | "warn"> }
): number;
