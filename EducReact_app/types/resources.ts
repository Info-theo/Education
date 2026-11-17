export interface ColorPalette {
  base?: string;
  selected?: string;
  border?: string;
  text?: string;
  card?: string;
  accent?: string;
}

export interface StyleCatalog {
  ordreNiveaux?: string[];
  niveaux?: Record<string, ColorPalette>;
  matieres?: Record<string, ColorPalette>;
  icons?: {
    niveaux?: Record<string, string>;
    matieres?: Record<string, string>;
  };
}

export interface SubResource {
  titre: string;
  url: string;
  type?: string;
}

/** cours : cours complet du niveau · exercices : entraînement · ressource : outil ou site général. */
export type ResourceNature = "cours" | "exercices" | "ressource";

export interface Resource {
  niveau: string;
  matiere: string;
  chapitre: string;
  titre: string;
  type: "link" | "iframe" | "video";
  nature?: ResourceNature;
  sousRessources?: SubResource[];
  source: string;
  url: string;
  sourceFile?: string;
  courseLabel?: string;
}