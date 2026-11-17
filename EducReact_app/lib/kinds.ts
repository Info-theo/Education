// Catégories de ressources proposées dans les filtres (pages guidée et avancée).
//
// La « nature » vient du JSON (cours / exercices / ressource) ; « vidéo » vient du type
// d'affichage. Une même ressource peut donc être à la fois un cours et une vidéo
// (playlist de cours sur YouTube, par exemple).
import type { Resource, ResourceNature } from "../types/resources";

export type Kind = ResourceNature | "video";

export interface KindInfo {
  id: Kind;
  icon: string;
  label: string;
  /** Libellé court, au singulier, affiché sur les cartes. */
  tag: string;
  hint: string;
}

export const KINDS: KindInfo[] = [
  {
    id: "cours",
    icon: "📚",
    label: "Cours complets",
    tag: "Cours complet",
    hint: "Un cours structuré, propre au niveau et qui suit le programme.",
  },
  {
    id: "exercices",
    icon: "✏️",
    label: "Exercices",
    tag: "Exercices",
    hint: "Pour s'entraîner : exercices, quiz, calcul mental…",
  },
  {
    id: "ressource",
    icon: "🧰",
    label: "Ressources",
    tag: "Ressource",
    hint: "Outils, sites de référence, révisions : utiles, mais pas un cours complet.",
  },
  {
    id: "video",
    icon: "🎬",
    label: "Vidéos",
    tag: "Vidéo",
    hint: "Vidéos et playlists.",
  },
];

export const NATURE_ORDER: ResourceNature[] = ["cours", "exercices", "ressource"];

export function isVideo(r: Resource): boolean {
  if (r.type === "video") return true;
  try {
    const host = new URL(r.url).hostname.replace(/^www\./, "");
    return host.endsWith("youtube.com") || host === "youtu.be";
  } catch {
    return false;
  }
}

export function natureOf(r: Resource): ResourceNature {
  return r.nature ?? "ressource";
}

export function matchesKind(r: Resource, kind: Kind): boolean {
  return kind === "video" ? isVideo(r) : natureOf(r) === kind;
}

export function kindInfo(kind: Kind): KindInfo {
  return KINDS.find((k) => k.id === kind)!;
}

/** Trie les cours complets en premier, puis les exercices, puis le reste (tri stable). */
export function byNature(a: Resource, b: Resource): number {
  return NATURE_ORDER.indexOf(natureOf(a)) - NATURE_ORDER.indexOf(natureOf(b));
}
