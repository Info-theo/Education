"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ColorPalette, Resource, StyleCatalog } from "../types/resources";

const fallbackPalette: Required<ColorPalette> = {
  base: "#fff5f5",
  selected: "#dc2626",
  border: "#fecaca",
  text: "#991b1b",
  card: "#fff7f7",
  accent: "#ef4444",
};

export default function PageClient({
  resources,
  levelOrder = [],
  styleData = {},
}: {
  resources: Resource[];
  levelOrder?: string[];
  styleData?: StyleCatalog;
}) {
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([]);
  const [selectedCourseFiles, setSelectedCourseFiles] = useState<string[]>([]);

  const niveaux = useMemo(() => {
    const unique = [...new Set(resources.map((r) => r.niveau))];
    const preferredOrder = levelOrder.length > 0 ? levelOrder : (styleData.ordreNiveaux ?? []);

    if (preferredOrder.length > 0) {
      const ordered = preferredOrder.filter((item) => unique.includes(item));
      const rest = unique.filter((item) => !preferredOrder.includes(item)).sort((a, b) => a.localeCompare(b));
      return [...ordered, ...rest];
    }

    return unique.sort((a, b) => a.localeCompare(b));
  }, [resources, levelOrder, styleData]);

  const levelGroups = useMemo(
    () => [
      { label: "Primaire", values: niveaux.filter((item) => ["CP", "CE1", "CE2", "CM1", "CM2"].includes(item)) },
      { label: "Collège", values: niveaux.filter((item) => ["6ème", "5ème", "4ème", "3ème"].includes(item)) },
      { label: "Lycée", values: niveaux.filter((item) => ["Seconde", "Première", "Terminale"].includes(item)) },
      { label: "Supérieur", values: niveaux.filter((item) => ["L1", "L2", "L3", "M1", "M2"].includes(item)) },
    ],
    [niveaux]
  );

  const matieres = useMemo(
    () =>
      [...new Set(
        resources
          .filter((r) => selectedNiveaux.length === 0 || selectedNiveaux.includes(r.niveau))
          .map((r) => r.matiere)
      )].sort(),
    [resources, selectedNiveaux]
  );

  const availableCourseFiles = useMemo(() => {
    const filtered = resources.filter(
      (r) =>
        (selectedNiveaux.length === 0 || selectedNiveaux.includes(r.niveau)) &&
        (selectedMatieres.length === 0 || selectedMatieres.includes(r.matiere)) &&
        typeof r.sourceFile === "string" &&
        /(^|\/)cours[^/]*\.json$/i.test(r.sourceFile)
    );

    return [...new Map(
      filtered.map((r) => [
        r.sourceFile as string,
        {
          file: r.sourceFile as string,
          label: r.courseLabel || r.sourceFile,
          matiere: r.matiere,
        },
      ])
    ).values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [resources, selectedNiveaux, selectedMatieres]);

  useEffect(() => {
    setSelectedMatieres((prev) => prev.filter((m) => matieres.includes(m)));
  }, [matieres]);

  useEffect(() => {
    setSelectedCourseFiles((prev) => prev.filter((file) => availableCourseFiles.some((entry) => entry.file === file)));
  }, [availableCourseFiles]);

  const getPalette = (name: string, kind: "niveau" | "matiere") => {
    const palette = kind === "niveau" ? styleData.niveaux?.[name] : styleData.matieres?.[name];

    return {
      ...fallbackPalette,
      ...palette,
    } as Required<ColorPalette>;
  };

  const getChipStyle = (name: string, kind: "niveau" | "matiere") => {
    const palette = getPalette(name, kind);

    return {
      "--chip-bg": palette.base,
      "--chip-border": palette.border,
      "--chip-hover-bg": palette.card,
      "--chip-active-bg": palette.selected,
      "--chip-active-border": palette.selected,
      "--chip-text": palette.text,
      "--chip-active-text": "#fff",
    } as CSSProperties;
  };

  const getResultStyle = (resource: Resource) => {
    const palette = getPalette(resource.matiere, "matiere");

    return {
      "--resource-bg": palette.card,
      "--resource-border": palette.border,
      "--resource-accent": palette.base,
      "--resource-link": palette.selected,
      "--resource-badge-bg": palette.base,
      "--resource-badge-text": palette.text,
    } as CSSProperties;
  };

  const canShowCourseFilters = selectedNiveaux.length === 1 && selectedMatieres.length === 1;

  const resultats = useMemo(
    () =>
      resources.filter((r) => {
        const matchNiveau = selectedNiveaux.length === 0 || selectedNiveaux.includes(r.niveau);
        const matchMatiere = selectedMatieres.length === 0 || selectedMatieres.includes(r.matiere);
        const matchCourse = selectedCourseFiles.length === 0 || selectedCourseFiles.includes(r.sourceFile ?? "");
        return matchNiveau && matchMatiere && matchCourse;
      }),
    [resources, selectedNiveaux, selectedMatieres, selectedCourseFiles]
  );

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Ressources pédagogiques</p>
          <h1>Choisissez votre niveau et la matière que vous souhaitez explorer pour trouver les resources disponibles.</h1>
          <p className="lede">
            Le nom du cours est issu de la propriété "nom" du fichier JSON. Sélectionnez le niveau, la matière, puis basculez vers l’autre version si plusieurs cours existent.
          </p>
        </div>
        <div className="hero-pills">
          <span>📘 Niveau</span>
          <span>🧠 Matière</span>
          <span>📚 Cours</span>
        </div>
      </section>

      <section className="panel">
        <div className="field filter-card classes-field">
          <label>Classes</label>
          <div className="chip-grid compact-grid">
            <button
              type="button"
              className={selectedNiveaux.length === 0 ? "chip active" : "chip"}
              onClick={() => setSelectedNiveaux([])}
            >
              Toutes
            </button>
          </div>
          {levelGroups.map((group) => (
            <div key={group.label} className="level-group">
              <p className="level-group-title">{group.label}</p>
              <div className="chip-grid">
                {group.values.map((niveauValue) => (
                  <button
                    key={niveauValue}
                    type="button"
                    className={selectedNiveaux.includes(niveauValue) ? "chip active" : "chip"}
                    style={getChipStyle(niveauValue, "niveau")}
                    onClick={() =>
                      setSelectedNiveaux((prev) =>
                        prev.includes(niveauValue) ? prev.filter((item) => item !== niveauValue) : [...prev, niveauValue]
                      )
                    }
                  >
                    <span className="chip-icon">{styleData.icons?.niveaux?.[niveauValue] ?? "📘"}</span>
                    <span>{niveauValue}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="field filter-card">
          <label>Matières</label>
          <div className="chip-grid">
            <button
              type="button"
              className={selectedMatieres.length === 0 ? "chip active" : "chip"}
              onClick={() => setSelectedMatieres([])}
            >
              <span className="chip-icon">✨</span>
              <span>Toutes</span>
            </button>
            {matieres.map((matiereValue) => (
              <button
                key={matiereValue}
                type="button"
                className={selectedMatieres.includes(matiereValue) ? "chip active" : "chip"}
                style={getChipStyle(matiereValue, "matiere")}
                onClick={() =>
                  setSelectedMatieres((prev) =>
                    prev.includes(matiereValue)
                      ? prev.filter((item) => item !== matiereValue)
                      : [...prev, matiereValue]
                  )
                }
              >
                <span className="chip-icon">{styleData.icons?.matieres?.[matiereValue] ?? "📘"}</span>
                <span>{matiereValue}</span>
              </button>
            ))}
          </div>
        </div>

        {canShowCourseFilters ? (
          <div className="field filter-card">
            <label>Cours</label>
            <p className="helper-text">Sélectionnez un cours uniquement quand un niveau et une matière sont déjà choisis.</p>
            <div className="chip-grid">
              <button
                type="button"
                className={selectedCourseFiles.length === 0 ? "chip active" : "chip"}
                onClick={() => setSelectedCourseFiles([])}
              >
                <span className="chip-icon">📚</span>
                <span>Tous</span>
              </button>
              {availableCourseFiles.map((entry) => (
                <button
                  key={entry.file}
                  type="button"
                  className={selectedCourseFiles.includes(entry.file) ? "chip active" : "chip"}
                  style={getChipStyle(entry.matiere ?? "Mathématiques", "matiere")}
                  onClick={() =>
                    setSelectedCourseFiles((prev) =>
                      prev.includes(entry.file) ? prev.filter((item) => item !== entry.file) : [...prev, entry.file]
                    )
                  }
                >
                  <span className="chip-icon">📄</span>
                  <span>{entry.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="results-header">
        <div>
          <p className="eyebrow">Résultats</p>
          <h2>{resultats.length} ressource{resultats.length > 1 ? "s" : ""} affichée{resultats.length > 1 ? "s" : ""}</h2>
        </div>
        <p className="mini-note">Filtres actifs : {selectedNiveaux.length ? selectedNiveaux.join(", ") : "Tous les niveaux"} • {selectedMatieres.length ? selectedMatieres.join(", ") : "Toutes les matières"}</p>
      </section>

      <section className="results-grid">
        {resultats.length === 0 ? (
          <article className="empty-card">
            <h3>Aucune ressource pour ce choix</h3>
            <p>Essayez un autre niveau ou une autre matière pour afficher d’autres contenus.</p>
          </article>
        ) : null}

        {resultats.map((r) => (
          <article
            key={`${r.niveau}-${r.matiere}-${r.sourceFile ?? "unknown"}-${r.titre}-${r.url}-${r.chapitre}`}
            className="resource-card"
            style={getResultStyle(r)}
          >
            <div className="resource-head">
              <p className="resource-meta">{r.niveau} • {r.matiere}</p>
              {r.chapitre ? <span className="badge">Chapitre : {r.chapitre}</span> : null}
            </div>
            <h2>{r.titre}</h2>
            {r.source ? <p className="resource-source">Source : {r.source}</p> : null}

            {r.type === "iframe" ? (
              <iframe className="resource-frame" src={r.url} title={r.titre} loading="lazy" />
            ) : (
              <a className="resource-link" href={r.url} target="_blank" rel="noreferrer">
                {r.type === "video" ? "Voir la vidéo" : "Ouvrir le site de la ressource"}
              </a>
            )}

            {r.sousRessources?.length ? (
              <ul className="sub-resources">
                {r.sousRessources.map((sub) => (
                  <li key={sub.url}>
                    <a href={sub.url} target="_blank" rel="noreferrer">
                      {sub.titre}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      <style jsx>{`
        :global(html) {
          background:
            radial-gradient(circle at top, #ffffff 0%, #eef5ff 28%, #eef7ff 55%, #edf2fb 100%);
        }

        :global(body) {
          margin: 0;
          font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          background:
            radial-gradient(circle at top, #ffffff 0%, #eef5ff 28%, #eef7ff 55%, #edf2fb 100%);
          color: #17324d;
        }

        * { box-sizing: border-box; }

        .page-shell {
          min-height: 100vh;
          padding: 32px 18px 48px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.25), rgba(245,249,255,0.2)),
            radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(237,244,255,0.9) 35%, rgba(231,239,252,0.92) 100%);
        }

        .hero-card,
        .panel,
        .resource-card,
        .empty-card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #dbe6f7;
          border-radius: 24px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(8px);
        }

        .hero-card {
          max-width: 1180px;
          margin: 0 auto 18px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.96), rgba(241,247,255,0.96));
        }

        .hero-copy { max-width: 820px; }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.78rem;
          color: #4b6bff;
          font-weight: 800;
        }

        h1 {
          margin: 6px 0 8px;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          line-height: 1.1;
        }

        .lede {
          color: #4c6383;
          max-width: 780px;
          font-size: 1.02rem;
        }

        .hero-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .hero-pills span {
          padding: 8px 10px;
          border-radius: 999px;
          background: #edf3ff;
          color: #3b5bd8;
          font-weight: 700;
          font-size: 0.92rem;
        }

        .panel {
          max-width: 1180px;
          margin: 0 auto 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-card {
          padding: 14px;
          border: 1px solid #e5edf8;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,251,255,0.98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }

        .classes-field {
          gap: 10px;
        }

        .level-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px;
          border: 1px solid #e5edf8;
          border-radius: 16px;
          background: rgba(255,255,255,0.92);
        }

        .level-group-title {
          margin: 0;
          color: #4b6bff;
          font-size: 0.88rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .compact-grid {
          margin-bottom: 2px;
        }

        .helper-text {
          margin: 0;
          color: #56708f;
          font-size: 0.92rem;
        }

        label {
          font-weight: 700;
          color: #24405c;
        }

        .chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--chip-border, #cdd9ef);
          border-radius: 999px;
          padding: 10px 13px;
          background: var(--chip-bg, #fff);
          color: var(--chip-text, #17324d);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
        }

        .chip:hover {
          transform: translateY(-1px);
          border-color: var(--chip-active-border, #5b7cff);
          background: var(--chip-hover-bg, #f4f7ff);
          box-shadow: 0 12px 24px rgba(79, 70, 229, 0.12);
        }

        .chip.active {
          background: var(--chip-active-bg, #dc2626);
          border-color: var(--chip-active-border, #dc2626);
          color: var(--chip-active-text, #fff);
          box-shadow: 0 12px 24px rgba(220, 38, 38, 0.22);
        }

        .chip-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.1rem;
          font-size: 1rem;
        }

        .results-header {
          max-width: 1180px;
          margin: 0 auto 12px;
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 14px;
          flex-wrap: wrap;
        }

        .results-header h2 {
          margin: 4px 0 0;
          font-size: 1.15rem;
        }

        .mini-note {
          color: #56708f;
          font-size: 0.95rem;
          margin: 0;
        }

        .results-grid {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }

        .resource-card,
        .empty-card {
          padding: 16px;
          background: var(--resource-bg, rgba(255, 255, 255, 0.92));
          border-color: var(--resource-border, #dbe6f7);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .resource-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(31, 41, 55, 0.14);
        }

        .resource-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .resource-meta,
        .resource-source {
          color: #56708f;
          font-size: 0.95rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 10px;
          background: var(--resource-badge-bg, #edf3ff);
          color: var(--resource-badge-text, #3b5bd8);
          font-size: 0.85rem;
          font-weight: 700;
        }

        h2 {
          margin: 0 0 8px;
          font-size: 1.15rem;
          line-height: 1.3;
        }

        .resource-link {
          display: inline-block;
          margin-top: 10px;
          color: var(--resource-link, #2858d4);
          font-weight: 700;
          text-decoration: none;
        }

        .sub-resources {
          margin: 12px 0 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sub-resources a {
          color: var(--resource-link, #2858d4);
          font-weight: 600;
          text-decoration: none;
        }

        .sub-resources a:hover {
          text-decoration: underline;
        }

        .resource-frame {
          width: 100%;
          min-height: 320px;
          border: 1px solid #d7e2f2;
          border-radius: 16px;
          margin-top: 10px;
          background: #fff;
        }
      `}</style>
    </main>
  );
}
