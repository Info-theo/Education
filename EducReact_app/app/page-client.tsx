"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ColorPalette, Resource, StyleCatalog } from "../types/resources";

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const neutralPalette: Required<ColorPalette> = {
  base: "#f1f5f9",
  selected: "#4b6bff",
  border: "#cbd5e1",
  text: "#334155",
  card: "#ffffff",
  accent: "#4b6bff",
};

interface Cycle {
  id: string;
  label: string;
  icon: string;
  hint: string;
  levels: string[];
}

const CYCLES: Cycle[] = [
  { id: "primaire", label: "Primaire", icon: "🎒", hint: "Du CP au CM2", levels: ["CP", "CE1", "CE2", "CM1", "CM2"] },
  { id: "college", label: "Collège", icon: "🏫", hint: "De la 6ème à la 3ème", levels: ["6ème", "5ème", "4ème", "3ème"] },
  { id: "lycee", label: "Lycée", icon: "🎓", hint: "De la Seconde à la Terminale", levels: ["Seconde", "Première", "Terminale"] },
  { id: "superieur", label: "Supérieur", icon: "🔬", hint: "Licence et master", levels: ["L1", "L2", "L3", "M1", "M2"] },
];

const ALL_SUBJECTS = "__toutes__";
const STORAGE_KEY = "education:dernier-niveau";

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) return u.searchParams.get("v");
  } catch {
    /* URL invalide */
  }
  return null;
}

function isYoutube(url: string): boolean {
  const host = hostOf(url);
  return host.endsWith("youtube.com") || host === "youtu.be";
}

function typeInfo(r: Resource) {
  if (r.type === "video" || isYoutube(r.url)) return { icon: "🎬", label: "Vidéo", action: "Regarder" };
  if (r.type === "iframe") return { icon: "🖼️", label: "Intégré", action: "Ouvrir en grand" };
  return { icon: "🌐", label: "Site web", action: "Ouvrir le site" };
}

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */

export default function PageClient({
  resources,
  levelOrder = [],
  styleData = {},
}: {
  resources: Resource[];
  levelOrder?: string[];
  styleData?: StyleCatalog;
}) {
  const [openCycle, setOpenCycle] = useState<string | null>(null);
  const [niveau, setNiveau] = useState<string | null>(null);
  const [matiere, setMatiere] = useState<string | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  const [lastNiveau, setLastNiveau] = useState<string | null>(null);

  const step = !niveau ? 1 : !matiere ? 2 : 3;

  useEffect(() => {
    setLastNiveau(readStorage());
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /* ---------- Données dérivées ---------- */

  const palette = (name: string | null, kind: "niveau" | "matiere"): Required<ColorPalette> => {
    const found = name ? (kind === "niveau" ? styleData.niveaux?.[name] : styleData.matieres?.[name]) : undefined;
    return { ...neutralPalette, ...found };
  };

  const niveauxDisponibles = useMemo(() => {
    const unique = [...new Set(resources.map((r) => r.niveau))];
    const order = levelOrder.length > 0 ? levelOrder : (styleData.ordreNiveaux ?? []);
    const ordered = order.filter((n) => unique.includes(n));
    const rest = unique.filter((n) => !order.includes(n)).sort((a, b) => a.localeCompare(b, "fr"));
    return [...ordered, ...rest];
  }, [resources, levelOrder, styleData]);

  const countByNiveau = useMemo(() => {
    const map = new Map<string, number>();
    resources.forEach((r) => map.set(r.niveau, (map.get(r.niveau) ?? 0) + 1));
    return map;
  }, [resources]);

  const cycles = useMemo(() => {
    const known = new Set(CYCLES.flatMap((c) => c.levels));
    const list = CYCLES.map((c) => ({ ...c, levels: niveauxDisponibles.filter((n) => c.levels.includes(n)) }));
    const others = niveauxDisponibles.filter((n) => !known.has(n));
    if (others.length) list.push({ id: "autres", label: "Autres", icon: "📦", hint: "Autres niveaux", levels: others });
    return list.filter((c) => c.levels.length > 0);
  }, [niveauxDisponibles]);

  const ressourcesNiveau = useMemo(() => resources.filter((r) => r.niveau === niveau), [resources, niveau]);

  const matieres = useMemo(() => {
    const map = new Map<string, number>();
    ressourcesNiveau.forEach((r) => map.set(r.matiere, (map.get(r.matiere) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [ressourcesNiveau]);

  const ressourcesMatiere = useMemo(
    () => (matiere === ALL_SUBJECTS ? ressourcesNiveau : ressourcesNiveau.filter((r) => r.matiere === matiere)),
    [ressourcesNiveau, matiere]
  );

  const courses = useMemo(() => {
    if (matiere === ALL_SUBJECTS) return [];
    const map = new Map<string, string>();
    ressourcesMatiere.forEach((r) => r.sourceFile && map.set(r.sourceFile, r.courseLabel || r.sourceFile));
    return [...map.entries()].map(([file, label]) => ({ file, label }));
  }, [ressourcesMatiere, matiere]);

  const resultats = useMemo(
    () => (course ? ressourcesMatiere.filter((r) => r.sourceFile === course) : ressourcesMatiere),
    [ressourcesMatiere, course]
  );

  // Regroupement : par matière en vue « toutes », sinon par chapitre.
  const groupes = useMemo(() => {
    const map = new Map<string, Resource[]>();
    resultats.forEach((r) => {
      const key = matiere === ALL_SUBJECTS ? r.matiere : r.chapitre || "Ressources générales";
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return [...map.entries()];
  }, [resultats, matiere]);

  /* ---------- Actions ---------- */

  const goHome = () => {
    setNiveau(null);
    setMatiere(null);
    setCourse(null);
  };

  const chooseNiveau = (value: string) => {
    setNiveau(value);
    setMatiere(null);
    setCourse(null);
    setLastNiveau(value);
    writeStorage(value);
  };

  const chooseMatiere = (value: string) => {
    setMatiere(value);
    setCourse(null);
  };

  /* ---------- Thème d'ambiance selon le niveau ---------- */

  const niveauPalette = palette(niveau, "niveau");
  const shellStyle = niveau
    ? ({ "--accent": niveauPalette.selected, "--accent-soft": niveauPalette.base } as CSSProperties)
    : undefined;

  const matiereLabel = matiere === ALL_SUBJECTS ? "Toutes les matières" : matiere;

  /* ---------- Rendu ---------- */

  return (
    <main className="page-shell" style={shellStyle}>
      <header className="hero card-surface">
        <div>
          <div className="hero-top">
            <p className="eyebrow">Ressources pédagogiques</p>
            <Link href="/avance" className="switch-link">
              Recherche avancée →
            </Link>
          </div>
          <h1>
            {step === 1 && "Trouve des cours et des vidéos pour réviser, du CP à la fac."}
            {step === 2 && `En ${niveau}, qu'est-ce que tu veux réviser ?`}
            {step === 3 && `${matiereLabel} · ${niveau}`}
          </h1>
        </div>
        <ol className="steps" aria-label="Étapes">
          {["Ta classe", "Ta matière", "Les ressources"].map((label, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "current" : "";
            return (
              <li key={label} className={`step ${state}`} aria-current={n === step ? "step" : undefined}>
                <span className="step-num">{n < step ? "✓" : n}</span>
                {label}
              </li>
            );
          })}
        </ol>
      </header>

      {step > 1 ? (
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <ol>
            <li>
              <button type="button" className="crumb" onClick={goHome}>
                🏠 Accueil
              </button>
            </li>
            <li>
              <button
                type="button"
                className="crumb"
                aria-current={step === 2 ? "page" : undefined}
                onClick={() => {
                  setMatiere(null);
                  setCourse(null);
                }}
              >
                {styleData.icons?.niveaux?.[niveau!] ?? "📘"} {niveau}
              </button>
            </li>
            {step === 3 ? (
              <li>
                <button type="button" className="crumb" aria-current="page">
                  {matiere === ALL_SUBJECTS ? "✨" : (styleData.icons?.matieres?.[matiere!] ?? "📘")} {matiereLabel}
                </button>
              </li>
            ) : null}
          </ol>
        </nav>
      ) : null}

      {/* ---------------- Étape 1 : la classe ---------------- */}
      {step === 1 ? (
        <>
          {lastNiveau && niveauxDisponibles.includes(lastNiveau) ? (
            <div className="resume">
              <span>👋 Content de te revoir ! Tu étais en {lastNiveau}.</span>
              <button type="button" className="resume-btn" onClick={() => chooseNiveau(lastNiveau)}>
                Reprendre en {lastNiveau} →
              </button>
            </div>
          ) : null}

          <section className="section-head">
            <div>
              <p className="eyebrow">Étape 1</p>
              <h2>Tu es en quelle classe ?</h2>
            </div>
          </section>

          <div className="tile-grid">
            {cycles.map((c, i) => {
              const total = c.levels.reduce((sum, n) => sum + (countByNiveau.get(n) ?? 0), 0);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`tile ${openCycle === c.id ? "selected" : ""}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                  aria-expanded={openCycle === c.id}
                  onClick={() => setOpenCycle((prev) => (prev === c.id ? null : c.id))}
                >
                  <span className="tile-icon">{c.icon}</span>
                  <span className="tile-title">{c.label}</span>
                  <span className="tile-hint">{c.hint}</span>
                  <span className="tile-count">{plural(total, "ressource")}</span>
                </button>
              );
            })}
          </div>

          {cycles
            .filter((c) => c.id === openCycle)
            .map((c) => (
              <section key={c.id} className="levels-panel card-surface">
                <h3>
                  {c.icon} {c.label} : choisis ta classe
                </h3>
                <div className="tile-grid small">
                  {c.levels.map((n, i) => {
                    const p = palette(n, "niveau");
                    return (
                      <button
                        key={n}
                        type="button"
                        className="tile small-tile"
                        style={
                          {
                            "--tile-bg": p.base,
                            "--tile-border": p.border,
                            "--tile-text": p.text,
                            "--tile-strong": p.selected,
                            animationDelay: `${i * 40}ms`,
                          } as CSSProperties
                        }
                        onClick={() => chooseNiveau(n)}
                      >
                        <span className="tile-icon">{styleData.icons?.niveaux?.[n] ?? "📘"}</span>
                        <span className="tile-title">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
        </>
      ) : null}

      {/* ---------------- Étape 2 : la matière ---------------- */}
      {step === 2 ? (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Étape 2</p>
              <h2>Choisis ta matière</h2>
            </div>
            <p className="section-note">{plural(ressourcesNiveau.length, "ressource")} en {niveau}</p>
          </section>

          {matieres.length === 0 ? (
            <EmptyState onBack={goHome} />
          ) : (
            <div className="tile-grid">
              {matieres.map(([m, count], i) => {
                const p = palette(m, "matiere");
                return (
                  <button
                    key={m}
                    type="button"
                    className="tile"
                    style={
                      {
                        "--tile-bg": p.base,
                        "--tile-border": p.border,
                        "--tile-text": p.text,
                        "--tile-strong": p.selected,
                        animationDelay: `${i * 40}ms`,
                      } as CSSProperties
                    }
                    onClick={() => chooseMatiere(m)}
                  >
                    <span className="tile-icon">{styleData.icons?.matieres?.[m] ?? "📘"}</span>
                    <span className="tile-title">{m}</span>
                    <span className="tile-count">{plural(count, "ressource")}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className="tile"
                style={{ animationDelay: `${matieres.length * 40}ms` }}
                onClick={() => chooseMatiere(ALL_SUBJECTS)}
              >
                <span className="tile-icon">✨</span>
                <span className="tile-title">Tout voir</span>
                <span className="tile-hint">Toutes les matières de {niveau}</span>
                <span className="tile-count">{plural(ressourcesNiveau.length, "ressource")}</span>
              </button>
            </div>
          )}
        </>
      ) : null}

      {/* ---------------- Étape 3 : les ressources ---------------- */}
      {step === 3 ? (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Étape 3</p>
              <h2>{plural(resultats.length, "ressource")} pour toi</h2>
            </div>
            {courses.length > 1 ? (
              <div className="tabs" role="group" aria-label="Choix du cours">
                <button type="button" className="tab" aria-pressed={course === null} onClick={() => setCourse(null)}>
                  Tous
                </button>
                {courses.map((c) => (
                  <button
                    key={c.file}
                    type="button"
                    className="tab"
                    aria-pressed={course === c.file}
                    onClick={() => setCourse(c.file)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {groupes.length === 0 ? <EmptyState onBack={() => setMatiere(null)} /> : null}

          {groupes.map(([titre, items]) => (
            <section key={titre} className="group">
              <h3 className="group-title">
                {matiere === ALL_SUBJECTS ? (styleData.icons?.matieres?.[titre] ?? "📘") : "📌"} {titre}
                <span className="group-count">{items.length}</span>
              </h3>
              <div className="results-grid">
                {items.map((r, i) => (
                  <ResourceCard
                    key={`${r.sourceFile}-${r.titre}-${r.url}`}
                    resource={r}
                    palette={palette(r.matiere, "matiere")}
                    delay={i * 40}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : null}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Carte de ressource                                                  */
/* ------------------------------------------------------------------ */

function ResourceCard({
  resource: r,
  palette: p,
  delay,
}: {
  resource: Resource;
  palette: Required<ColorPalette>;
  delay: number;
}) {
  const [faviconOk, setFaviconOk] = useState(true);
  const info = typeInfo(r);
  const host = hostOf(r.url);
  const ytId = youtubeId(r.url);

  const style = {
    "--resource-bg": p.card,
    "--resource-border": p.border,
    "--resource-link": p.selected,
    "--resource-badge-bg": p.base,
    "--resource-badge-text": p.text,
    animationDelay: `${delay}ms`,
  } as CSSProperties;

  return (
    <article className="resource-card" style={style}>
      {ytId ? (
        <a className="resource-thumb" href={r.url} target="_blank" rel="noreferrer" aria-label={`Regarder : ${r.titre}`}>
          <img src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="play" aria-hidden="true">
            ▶
          </span>
        </a>
      ) : null}

      <div className="resource-body">
        <div className="resource-tags">
          <span className="tag">
            {info.icon} {info.label}
          </span>
          {r.chapitre ? <span className="tag neutral">{r.chapitre}</span> : null}
        </div>

        <h3>{r.titre}</h3>

        {r.source || host ? (
          <p className="resource-source">
            {host && faviconOk ? (
              <img src={`https://${host}/favicon.ico`} alt="" loading="lazy" onError={() => setFaviconOk(false)} />
            ) : null}
            <span>{r.source || host}</span>
          </p>
        ) : null}

        {r.type === "iframe" ? <iframe className="resource-frame" src={r.url} title={r.titre} loading="lazy" /> : null}

        {r.sousRessources?.length ? (
          <details className="parts">
            <summary>{plural(r.sousRessources.length, "partie")}</summary>
            <ul>
              {r.sousRessources.map((sub) => (
                <li key={sub.url}>
                  <a href={sub.url} target="_blank" rel="noreferrer">
                    {sub.titre} ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <a className="open-btn" href={r.url} target="_blank" rel="noreferrer">
          {info.action} ↗
        </a>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* État vide                                                           */
/* ------------------------------------------------------------------ */

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="empty card-surface">
      <div className="empty-icon">🔍</div>
      <h3>Rien par ici pour le moment</h3>
      <p>Aucune ressource n'est encore disponible pour ce choix.</p>
      <p style={{ marginTop: 14 }}>
        <button type="button" className="resume-btn" onClick={onBack}>
          ← Revenir en arrière
        </button>
      </p>
    </div>
  );
}
