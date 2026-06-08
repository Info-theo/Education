export interface ColorPalette {
  base?: string;
  selected?: string;
  border?: string;
  text?: string;
  card?: string;
  accent?: string;
}

export interface StyleCatalog {
  niveaux?: string[];
  matieres?: Record<string, ColorPalette>;
  icons?: {
    niveaux?: Record<string, string>;
    matieres?: Record<string, string>;
  };
}

export interface Resource {
  niveau: string;
  matiere: string;
  chapitre: string;
  titre: string;
  type: "link" | "iframe";
  source: string;
  url: string;
  sourceFile?: string;
  courseLabel?: string;
}