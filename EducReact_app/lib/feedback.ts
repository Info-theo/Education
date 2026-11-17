// Notes et suggestions : liens vers les formulaires d'issue GitHub du dépôt
// (.github/ISSUE_TEMPLATE/note.yml et suggestion.yml), pré-remplis depuis le site.
// Aucun serveur ni secret : les réponses arrivent dans l'onglet Issues du dépôt,
// et `node tools/feedback.mjs` les récupère et calcule les moyennes.
import type { Resource } from "../types/resources";

export const FEEDBACK_REPO = process.env.NEXT_PUBLIC_FEEDBACK_REPO || "Info-theo/Education";

/** Libellés des notes : doivent correspondre aux options du formulaire note.yml. */
export const NOTE_LABELS: Record<number, string> = {
  5: "5 - Excellent",
  4: "4 - Bien",
  3: "3 - Moyen",
  2: "2 - Décevant",
  1: "1 - Inutile ou hors programme",
};

function issueUrl(template: string, fields: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ template });
  for (const [key, value] of Object.entries(fields)) if (value) params.set(key, value);
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${params.toString()}`;
}

export function rateUrl(r: Resource, note?: number): string {
  return issueUrl("note.yml", {
    title: `[Note] ${r.titre} (${r.niveau} · ${r.matiere})`,
    url: r.url,
    ressource: r.titre,
    contexte: `${r.niveau} · ${r.matiere}`,
    note: note ? NOTE_LABELS[note] : undefined,
  });
}

export function suggestUrl(niveau?: string | null, matiere?: string | null): string {
  return issueUrl("suggestion.yml", {
    title: `[Suggestion] ${[niveau, matiere].filter(Boolean).join(" · ")}`.trim(),
    niveau: niveau ?? undefined,
    matiere: matiere ?? undefined,
  });
}

/* ---------- Notes déjà données (mémorisées dans ce navigateur uniquement) ---------- */

const RATINGS_KEY = "education:notes";

export function readRatings(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(RATINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveRating(url: string, note: number) {
  try {
    window.localStorage.setItem(RATINGS_KEY, JSON.stringify({ ...readRatings(), [url]: note }));
  } catch {
    /* stockage indisponible : on ignore */
  }
}
