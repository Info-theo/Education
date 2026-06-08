export interface ColorPalette {
  base?: string;
  selected?: string;
  border?: string;
  text?: string;
  card?: string;
  accent?: string;
}

export interface StyleCatalog {
  niveaux?: Record<string, ColorPalette>;
  matieres?: Record<string, ColorPalette>;
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