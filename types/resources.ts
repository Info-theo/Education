export interface Resource {
  niveau: string;
  matiere: string;
  chapitre: string;
  titre: string;
  type: "link" | "iframe";
  source: string;
  url: string;
}