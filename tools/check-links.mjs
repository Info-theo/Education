#!/usr/bin/env node
// Vérifie que les liens des ressources répondent encore, et que les pages n'ont pas changé.
//
// Usage (depuis la racine du dépôt) :
//   node tools/check-links.mjs                       liens des ressources publiées
//   node tools/check-links.mjs --archives            vérifie aussi les ressources archivées
//                                                    (pour savoir si un lien remarche)
//   node tools/check-links.mjs --save-titles         enregistre le titre actuel des pages dans
//                                                    « titrePage » quand il est absent
//   node tools/check-links.mjs --update-titles       idem, et remplace aussi les titres qui ont changé
//                                                    (après avoir vérifié que les pages sont toujours bonnes)
//   node tools/check-links.mjs --report liens.md     écrit aussi un rapport Markdown
//   node tools/check-links.mjs --strict              code de sortie 1 s'il y a des liens cassés
//                                                    ou des titres changés
//
// Résultats :
//   ✖ cassé        : 404, 410, 5xx, domaine introuvable, délai dépassé, vidéo YouTube supprimée…
//   ✎ titre changé : la page répond, mais son titre ne correspond plus à « titrePage »
//   ⚠ à vérifier   : 401, 403, 429 (souvent un site qui bloque les robots), titre introuvable
//   ↪ redirigé     : le lien fonctionne mais pointe vers un autre domaine (à mettre à jour ?)
//
// Titre d'une page : balise <title> (ou og:title) ; pour YouTube, le titre officiel de la vidéo
// ou de la playlist (API oEmbed, qui signale aussi les vidéos supprimées ou privées).
//
// Dans GitHub Actions, le rapport est aussi ajouté au résumé de l'exécution.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./catalog.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const includeArchived = args.includes("--archives");
const strict = args.includes("--strict");
const updateTitles = args.includes("--update-titles");
const saveTitles = updateTitles || args.includes("--save-titles");
const reportFile = argValue("--report");
const TIMEOUT_MS = Number(argValue("--timeout") ?? 15000);
const CONCURRENCY = Number(argValue("--concurrency") ?? 8);
const MAX_HTML_BYTES = 1_500_000;
const USER_AGENT = "Mozilla/5.0 (compatible; EducLinkChecker/1.0; +verification de liens pedagogiques)";

const resourcesDir = process.env.RESOURCES_DIR
  ? path.resolve(process.env.RESOURCES_DIR)
  : path.join(repoRoot, "Resources");

/* ---------- Liens à vérifier (dédupliqués, avec leurs emplacements) ---------- */

const { catalog, archived } = loadCatalog(resourcesDir);
/** url → [{ where, titre, archived, titrePage }] */
const links = new Map();
const add = (url, where, titre, titrePage, isArchived = false) => {
  if (!/^https?:\/\//.test(url)) return;
  if (!links.has(url)) links.set(url, []);
  links.get(url).push({ where, titre, titrePage, archived: isArchived });
};

for (const r of catalog.resources) {
  add(r.url, r.sourceFile, r.titre, r.titrePage);
  r.sousRessources?.forEach((s) => add(s.url, r.sourceFile, `${r.titre} › ${s.titre}`, s.titrePage));
}
if (includeArchived) {
  for (const a of archived) {
    add(a.url, a.sourceFile, a.titre, a.titrePage, true);
    a.sousRessources.forEach((s) => add(s.url, a.sourceFile, `${a.titre} › ${s.titre}`, s.titrePage, true));
  }
}

/* ---------- Titres de page ---------- */

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â", ccedil: "ç",
  icirc: "î", iuml: "ï", ocirc: "ô", ugrave: "ù", ucirc: "û", uuml: "ü", oelig: "œ",
  Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç", rsquo: "’", lsquo: "‘", ldquo: "“",
  rdquo: "”", ndash: "–", mdash: "—", hellip: "…", middot: "·",
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const cleanTitle = (t) => decodeEntities(t).normalize("NFC").replace(/\s+/g, " ").trim();

/** Forme de comparaison : insensible à la casse, aux espaces et aux variantes d'apostrophes/guillemets. */
const comparable = (t) =>
  cleanTitle(t)
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/\s*"\s*/g, '"');

/** Titres candidats d'une page HTML : <title> puis og:title. */
function titlesFromHtml(html) {
  const head = html.split(/<\/head>/i)[0];
  const titles = [];
  const t = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) titles.push(cleanTitle(t[1]));
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(property|name)\s*=\s*["']og:title["']/i.test(tag)) continue;
    const c = tag.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i);
    if (c) titles.push(cleanTitle(c[1] ?? c[2]));
  }
  return [...new Set(titles.filter(Boolean))];
}

/** Lit au plus MAX_HTML_BYTES du corps et le décode avec le bon jeu de caractères. */
async function readHtml(res) {
  const type = res.headers.get("content-type") ?? "";
  if (type && !/html|xml/i.test(type)) {
    res.body?.cancel().catch(() => {});
    return "";
  }
  const chunks = [];
  let size = 0;
  const reader = res.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    if (size >= MAX_HTML_BYTES) {
      reader.cancel().catch(() => {});
      break;
    }
  }
  const bytes = Buffer.concat(chunks);
  const charset =
    type.match(/charset=["']?([\w-]+)/i)?.[1] ??
    bytes.subarray(0, 4096).toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/* ---------- Requêtes ---------- */

async function request(url, method, { withHtml = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
      },
    });
    const html = withHtml && res.ok ? await readHtml(res) : (res.body?.cancel().catch(() => {}), "");
    return { status: res.status, finalUrl: res.url, html };
  } finally {
    clearTimeout(timer);
  }
}

function describeError(e) {
  if (e.name === "AbortError") return `pas de réponse en ${TIMEOUT_MS / 1000} s`;
  const code = e.cause?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "domaine introuvable";
  if (code === "ECONNREFUSED") return "connexion refusée";
  if (code === "CERT_HAS_EXPIRED" || code?.startsWith?.("ERR_TLS") || code?.includes?.("CERT"))
    return `certificat invalide (${code})`;
  return code ? `erreur réseau (${code})` : e.message;
}

const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Vidéo ou playlist YouTube (vérifiée via oEmbed). Les chaînes (/@nom, /c/, /channel/, /user/)
 * ne sont pas connues d'oEmbed : elles sont vérifiées comme une page classique
 * (YouTube répond bien 404 pour une chaîne inexistante).
 */
const isYoutube = (url) => {
  const host = hostOf(url);
  if (host === "youtu.be") return true;
  if (!/(^|\.)youtube\.com$/.test(host)) return false;
  try {
    const { pathname, searchParams } = new URL(url);
    return searchParams.has("v") || /^\/(playlist|shorts|embed|live)\b/.test(pathname);
  } catch {
    return false;
  }
};

/**
 * YouTube répond 200 même pour une vidéo supprimée : son API oEmbed est plus fiable
 * et donne le titre officiel. 401 = intégration désactivée (la vidéo existe).
 */
async function youtubeInfo(url) {
  try {
    const api = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(api, { signal: controller.signal, headers: { "User-Agent": USER_AGENT } });
    clearTimeout(timer);
    if (res.ok) return { exists: true, title: cleanTitle((await res.json()).title ?? "") };
    res.body?.cancel().catch(() => {});
    if (res.status === 400 || res.status === 404) return { exists: false, status: res.status };
  } catch {
    // réseau : on se contente de la vérification classique
  }
  return { exists: true, title: "" };
}

const needsTitle = (url) => saveTitles || links.get(url).some((u) => u.titrePage);

async function check(url) {
  const withHtml = needsTitle(url) && !isYoutube(url);
  let result;
  try {
    // Sans titre à lire : HEAD d'abord (léger) ; certains sites le refusent, on retente alors en GET.
    result = withHtml ? await request(url, "GET", { withHtml }) : await request(url, "HEAD");
    if (result.status >= 400) result = await request(url, "GET", { withHtml });
  } catch {
    try {
      result = await request(url, "GET", { withHtml });
    } catch (e) {
      return { url, state: "broken", detail: describeError(e), titles: [] };
    }
  }

  const { status, finalUrl, html } = result;
  if (status === 401 || status === 403 || status === 429) {
    return { url, state: "unsure", detail: `HTTP ${status} (accès refusé aux robots ?)`, titles: [] };
  }
  if (status >= 400) return { url, state: "broken", detail: `HTTP ${status}`, titles: [] };

  let titles = html ? titlesFromHtml(html) : [];
  if (isYoutube(url)) {
    const yt = await youtubeInfo(url);
    if (!yt.exists) {
      return { url, state: "broken", detail: `vidéo YouTube supprimée ou privée (oEmbed HTTP ${yt.status})`, titles: [] };
    }
    titles = yt.title ? [yt.title] : [];
  }

  if (finalUrl && hostOf(finalUrl) !== hostOf(url)) {
    return { url, state: "redirected", detail: `redirigé vers ${finalUrl}`, titles };
  }
  return { url, state: "ok", detail: `HTTP ${status}`, titles };
}

async function runPool(items, worker, size) {
  const results = [];
  let next = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      results.push(await worker(item));
      done++;
      if (process.stdout.isTTY) process.stdout.write(`\r  ${done}/${items.length} liens vérifiés…`);
    }
  });
  await Promise.all(runners);
  if (process.stdout.isTTY) process.stdout.write("\r" + " ".repeat(40) + "\r");
  return results;
}

/* ---------- Exécution ---------- */

console.log(`Vérification de ${links.size} liens${includeArchived ? " (archives comprises)" : ""}…`);
const results = await runPool([...links.keys()], check, CONCURRENCY);

/* ---------- Comparaison des titres ---------- */

/** Une entrée par emplacement dont le titre attendu ne correspond plus. */
const titleChanges = [];
/** Pages qui répondent mais dont on n'a pas pu lire le titre, alors qu'un titrePage est attendu. */
const titleMissing = [];
/** sourceFile → Map(url → titre à écrire) */
const toWrite = new Map();
let withoutTitrePage = 0;

const queueWrite = (where, url, title) => {
  if (!toWrite.has(where)) toWrite.set(where, new Map());
  toWrite.get(where).set(url, title);
};

for (const r of results) {
  const live = r.state === "ok" || r.state === "redirected";
  for (const use of links.get(r.url)) {
    if (!use.titrePage) {
      withoutTitrePage++;
      if (saveTitles && live && r.titles[0]) queueWrite(use.where, r.url, r.titles[0]);
      continue;
    }
    if (!live) continue;
    if (!r.titles.length) {
      titleMissing.push({ ...r, use });
      continue;
    }
    if (!r.titles.some((t) => comparable(t) === comparable(use.titrePage))) {
      titleChanges.push({ ...r, use, found: r.titles[0] });
      if (updateTitles) queueWrite(use.where, r.url, r.titles[0]);
    }
  }
}

// Une URL n'est « ok » que si tous ses titres attendus correspondent.
const changedUrls = new Set(titleChanges.map((c) => c.url));
const missingUrls = new Set(titleMissing.map((c) => c.url));
for (const r of results) {
  if (changedUrls.has(r.url)) {
    r.state = "changed";
    r.detail = titleChanges
      .filter((c) => c.url === r.url)
      .map((c) => `titre attendu : « ${c.use.titrePage} » · trouvé : « ${c.found} »`)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" ; ");
  } else if (missingUrls.has(r.url) && r.state === "ok") {
    r.state = "unsure";
    r.detail = "titre de la page introuvable (page générée en JavaScript ou protégée ?)";
  }
}

/* ---------- Enregistrement des titres dans les JSON ---------- */

/** Ajoute ou remplace une clé en la plaçant juste après « url » (lisibilité des JSON). */
function withKey(obj, key, value) {
  if (key in obj) return { ...obj, [key]: value };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v;
    if (k === "url") out[key] = value;
  }
  if (!(key in out)) out[key] = value;
  return out;
}

function writeTitles(sourceFile, titles) {
  const file = path.join(resourcesDir, ...sourceFile.split("/"));
  const raw = fs.readFileSync(file, "utf8");
  const bom = raw.startsWith("﻿") ? "﻿" : "";
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const data = JSON.parse(raw.slice(bom.length));
  let count = 0;

  const visit = (list) =>
    list.map((item) => {
      if (!item || typeof item !== "object") return item;
      let next = item;
      const title = titles.get(typeof item.url === "string" ? item.url.trim().normalize("NFC") : "");
      if (title && (updateTitles || !item.titrePage) && item.titrePage !== title) {
        next = withKey(next, "titrePage", title);
        count++;
      }
      if (Array.isArray(next.chapitre)) next = { ...next, chapitre: visit(next.chapitre) };
      return next;
    });

  const updated = Array.isArray(data) ? visit(data) : { ...data, resources: visit(data.resources ?? []) };
  if (count) {
    const json = JSON.stringify(updated, null, 2).replace(/\n/g, eol);
    fs.writeFileSync(file, bom + json + (/\r?\n$/.test(raw) ? eol : ""));
  }
  return count;
}

let written = 0;
if (saveTitles) {
  for (const [sourceFile, titles] of toWrite) written += writeTitles(sourceFile, titles);
}

/* ---------- Rapport ---------- */

const order = { broken: 0, changed: 1, unsure: 2, redirected: 3, ok: 4 };
results.sort((a, b) => order[a.state] - order[b.state] || a.url.localeCompare(b.url));

const groups = {
  broken: { icon: "✖", label: "Liens cassés" },
  changed: { icon: "✎", label: "Titre de page changé (contenu remplacé ?)" },
  unsure: { icon: "⚠", label: "À vérifier à la main" },
  redirected: { icon: "↪", label: "Redirigés vers un autre domaine" },
};

const mdCell = (s) => s.replace(/\|/g, "\\|");
const lines = [];
const md = [`# Vérification des liens`, "", `${links.size} liens vérifiés le ${new Date().toLocaleString("fr-FR")}.`, ""];

for (const [state, { icon, label }] of Object.entries(groups)) {
  const list = results.filter((r) => r.state === state);
  if (!list.length) continue;
  lines.push(`\n${icon} ${label} (${list.length}) :`);
  md.push(`## ${icon} ${label} (${list.length})`, "", "| Lien | Problème | Utilisé dans |", "|---|---|---|");
  for (const r of list) {
    const uses = links.get(r.url);
    const usedIn = [...new Set(uses.map((u) => `${u.where}${u.archived ? " (archivée)" : ""}`))];
    const shown = usedIn.slice(0, 5);
    if (usedIn.length > 5) shown.push(`… et ${usedIn.length - 5} autre(s)`);
    lines.push(`  - ${r.url}\n      ${r.detail}\n      dans : ${shown.join(", ")}`);
    md.push(`| ${r.url} | ${mdCell(r.detail)} | ${shown.join("<br>")} |`);
  }
  md.push("");
}

const count = (s) => results.filter((r) => r.state === s).length;
const summary =
  `${count("ok")} OK · ${count("broken")} cassé(s) · ${count("changed")} titre(s) changé(s) · ` +
  `${count("unsure")} à vérifier · ${count("redirected")} redirigé(s)`;
lines.push(`\n${summary}`);
md.push(`**Bilan :** ${summary}`, "");

const tips = [];
if (count("broken")) {
  tips.push(
    'Pour retirer un lien cassé des applications sans le supprimer, ajoute "statut": "archive" ' +
      '(et un "motif") à la ressource dans son fichier JSON.'
  );
}
if (count("changed") && !updateTitles) {
  tips.push(
    "Titre changé : ouvre la page. Si le contenu convient toujours, relance avec --update-titles " +
      "pour enregistrer le nouveau titre ; sinon, remplace ou archive la ressource."
  );
}
if (saveTitles) {
  tips.push(`${written} titre(s) de page enregistré(s) dans « titrePage ».`);
} else if (withoutTitrePage) {
  tips.push(
    `${withoutTitrePage} ressource(s) sans « titrePage » : leur contenu n'est pas surveillé ` +
      "(--save-titles pour enregistrer leur titre actuel)."
  );
}
lines.push(...tips);
md.push(...tips.map((t) => `> ${t}\n`));

console.log(lines.join("\n"));

const markdown = md.join("\n");
if (reportFile) {
  fs.writeFileSync(path.resolve(reportFile), markdown);
  console.log(`\nRapport écrit dans ${reportFile}`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
}

if (strict && (count("broken") || count("changed"))) process.exitCode = 1;
