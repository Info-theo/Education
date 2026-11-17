#!/usr/bin/env node
// Récupère les notes et les suggestions envoyées depuis les applications.
//
// Les applications ouvrent les formulaires d'issue GitHub du dépôt
// (.github/ISSUE_TEMPLATE/note.yml et suggestion.yml). Ce script lit ces issues
// avec l'API GitHub, calcule la note moyenne de chaque ressource et liste les
// suggestions, avec le bloc JSON prêt à coller dans Resources/<Niveau>/<Matière>/cours.json.
//
// Usage (depuis la racine du dépôt) :
//   node tools/feedback.mjs                       résumé dans le terminal
//   node tools/feedback.mjs --report retours.md   écrit aussi un rapport Markdown
//   node tools/feedback.mjs --json retours.json   écrit aussi les données brutes
//   node tools/feedback.mjs --all                 inclut les suggestions déjà fermées
//   node tools/feedback.mjs --repo autre/depot    autre dépôt (défaut : Info-theo/Education)
//
// Dépôt public : aucun jeton n'est nécessaire (60 requêtes/heure). Pour aller au-delà,
// définir GITHUB_TOKEN (ou GH_TOKEN) dans l'environnement ; il n'est jamais affiché.
// Les identifiants GitHub des auteurs ne sont ni affichés ni enregistrés.
import fs from "node:fs";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};
const repo = opt("--repo") || process.env.FEEDBACK_REPO || "Info-theo/Education";
const reportFile = opt("--report");
const jsonFile = opt("--json");
const includeClosed = args.includes("--all");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

/* ---------- Lecture des issues ---------- */

async function fetchIssues() {
  const issues = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "education-feedback-script",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const hint =
        res.status === 403 || res.status === 429
          ? " (limite de l'API atteinte : réessaie plus tard ou définis GITHUB_TOKEN)"
          : res.status === 404
            ? " (dépôt introuvable ou privé : définis GITHUB_TOKEN)"
            : "";
      throw new Error(`GitHub a répondu ${res.status}${hint}`);
    }
    const batch = await res.json();
    issues.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) return issues;
  }
}

/** Les formulaires produisent « ### Libellé\n\nvaleur » ; « _No response_ » = vide. */
function parseForm(body = "") {
  const fields = {};
  const parts = body.replace(/\r\n/g, "\n").split(/^### /m).slice(1);
  for (const part of parts) {
    const [label, ...rest] = part.split("\n");
    const value = rest.join("\n").trim();
    fields[label.trim()] = value === "_No response_" ? "" : value;
  }
  return fields;
}

const kindOf = (issue) => {
  const labels = issue.labels.map((l) => (typeof l === "string" ? l : l.name));
  if (labels.includes("note") || issue.title.startsWith("[Note]")) return "note";
  if (labels.includes("suggestion") || issue.title.startsWith("[Suggestion]")) return "suggestion";
  return null;
};

const NATURES = { "Cours complet": "cours", Exercices: "exercices", Ressource: "ressource", Vidéo: "ressource" };

/* ---------- Traitement ---------- */

let issues;
try {
  issues = await fetchIssues();
} catch (e) {
  console.error(`Impossible de lire les issues de ${repo} : ${e.message}`);
  process.exit(1);
}

const notes = new Map();
const suggestions = [];

for (const issue of issues) {
  const kind = kindOf(issue);
  if (!kind) continue;
  const f = parseForm(issue.body ?? "");

  if (kind === "note") {
    const url = f["Adresse de la ressource"];
    const note = parseInt(f["Note"], 10);
    if (!url || !(note >= 1 && note <= 5)) continue;
    const entry = notes.get(url) ?? { url, titre: f["Ressource"] || url, contexte: f["Niveau et matière"] || "", notes: [], commentaires: [], issues: [] };
    entry.notes.push(note);
    if (f["Commentaire (facultatif)"]) entry.commentaires.push(f["Commentaire (facultatif)"]);
    entry.issues.push(issue.html_url);
    notes.set(url, entry);
  } else {
    if (issue.state !== "open" && !includeClosed) continue;
    const natureLabel = f["Catégorie"] || "";
    const isVideo = natureLabel.startsWith("Vidéo");
    suggestions.push({
      etat: issue.state === "open" ? "ouverte" : "fermée",
      issue: issue.html_url,
      date: issue.created_at.slice(0, 10),
      niveau: f["Niveau"] || "",
      matiere: f["Matière"] || "",
      commentaire: f["Pourquoi cette ressource ? (facultatif)"] || "",
      ressource: {
        titre: f["Titre"] || "",
        type: isVideo ? "video" : "link",
        nature: NATURES[Object.keys(NATURES).find((k) => natureLabel.startsWith(k))] ?? "ressource",
        source: (() => {
          try {
            return new URL(f["Adresse de la ressource"]).hostname.replace(/^www\./, "");
          } catch {
            return "";
          }
        })(),
        url: f["Adresse de la ressource"] || "",
      },
    });
  }
}

const notesList = [...notes.values()]
  .map((n) => ({ ...n, moyenne: Math.round((n.notes.reduce((a, b) => a + b, 0) / n.notes.length) * 10) / 10, nombre: n.notes.length }))
  .sort((a, b) => a.moyenne - b.moyenne || b.nombre - a.nombre);

/* ---------- Affichage ---------- */

const stars = (m) => "★".repeat(Math.round(m)) + "☆".repeat(5 - Math.round(m));

console.log(`\nRetours du dépôt ${repo}\n`);
console.log(`⭐ ${notesList.length} ressource(s) notée(s) (${notesList.reduce((s, n) => s + n.nombre, 0)} note(s)), les moins bien notées d'abord :`);
for (const n of notesList) {
  console.log(`  ${stars(n.moyenne)} ${n.moyenne.toFixed(1)}/5 (${n.nombre}) ${n.titre}${n.contexte ? ` — ${n.contexte}` : ""}`);
  console.log(`      ${n.url}`);
  for (const c of n.commentaires) console.log(`      « ${c.replace(/\s+/g, " ").slice(0, 160)} »`);
}

console.log(`\n💡 ${suggestions.length} suggestion(s)${includeClosed ? "" : " ouverte(s)"} :`);
for (const s of suggestions) {
  console.log(`  - [${s.niveau} / ${s.matiere}] ${s.ressource.titre} (${s.ressource.nature}) ${s.ressource.url}`);
  console.log(`      ${s.issue}`);
}
if (suggestions.length) {
  console.log("\nPour ajouter une suggestion : colle son bloc JSON (rapport --report) dans Resources/<Niveau>/<Matière>/cours.json,");
  console.log("lance node tools/check-links.mjs puis ferme l'issue.");
}

if (reportFile) {
  const md = [
    `# Retours des utilisateurs`,
    ``,
    `Dépôt : ${repo} · généré le ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `## Notes (${notesList.length} ressource(s))`,
    ``,
    `| Moyenne | Notes | Ressource | Niveau · matière | Commentaires |`,
    `|---|---|---|---|---|`,
    ...notesList.map(
      (n) =>
        `| ${stars(n.moyenne)} ${n.moyenne.toFixed(1)} | ${n.nombre} | [${n.titre.replace(/\|/g, "/")}](${n.url}) | ${n.contexte} | ${n.commentaires.map((c) => c.replace(/\s+/g, " ").replace(/\|/g, "/")).join(" · ")} |`
    ),
    ``,
    `## Suggestions (${suggestions.length})`,
    ``,
    ...suggestions.flatMap((s) => [
      `### ${s.ressource.titre || s.ressource.url} — ${s.niveau} / ${s.matiere}`,
      ``,
      `${s.etat} · ${s.date} · [issue](${s.issue})${s.commentaire ? `  \n> ${s.commentaire.replace(/\n/g, "\n> ")}` : ""}`,
      ``,
      `À ajouter dans \`Resources/${s.niveau}/${s.matiere}/cours.json\` :`,
      ``,
      "```json",
      JSON.stringify(s.ressource, null, 2),
      "```",
      ``,
    ]),
  ].join("\n");
  fs.writeFileSync(reportFile, md + "\n");
  console.log(`\n→ ${reportFile}`);
}

if (jsonFile) {
  fs.writeFileSync(jsonFile, JSON.stringify({ repo, generatedAt: new Date().toISOString(), notes: notesList, suggestions }, null, 2) + "\n");
  console.log(`→ ${jsonFile}`);
}
