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

export interface Resource {
  niveau: string;
  matiere: string;
  chapitre: string;
  titre: string;
  type: "link" | "iframe" | "video";
  sousRessources?: SubResource[];
  source: string;
  url: string;
  sourceFile?: string;
  courseLabel?: string;
}