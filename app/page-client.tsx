"use client";

import { useEffect, useMemo, useState } from "react";
import type { Resource } from "../types/resources";

export default function PageClient({ resources }: { resources: Resource[] }) {
  const [niveau, setNiveau] = useState("");
  const [matiere, setMatiere] = useState("");
  const [courseFile, setCourseFile] = useState("cours.json");

  const niveaux = useMemo(() => [...new Set(resources.map((r) => r.niveau))], [resources]);

  const matieres = useMemo(
    () => [...new Set(resources.filter((r) => !niveau || r.niveau === niveau).map((r) => r.matiere))],
    [niveau, resources]
  );

  const availableCourseFiles = useMemo(() => {
    const filtered = resources.filter(
      (r) =>
        (!niveau || r.niveau === niveau) &&
        (!matiere || r.matiere === matiere) &&
        typeof r.sourceFile === "string" &&
        /^cours.*\.json$/i.test(r.sourceFile)
    );

    return [...new Set(filtered.map((r) => r.sourceFile as string))]
      .sort()
      .map((file) => ({
        file,
        label: filtered.find((r) => r.sourceFile === file)?.courseLabel || file,
      }));
  }, [niveau, matiere, resources]);

  useEffect(() => {
    if (!matiere) {
      setCourseFile("cours.json");
      return;
    }

    if (availableCourseFiles.some((entry) => entry.file === "cours.json")) {
      setCourseFile("cours.json");
      return;
    }

    setCourseFile(availableCourseFiles[0]?.file ?? "");
  }, [matiere, availableCourseFiles]);

  const resultats = useMemo(
    () =>
      resources.filter(
        (r) =>
          (!niveau || r.niveau === niveau) &&
          (!matiere || r.matiere === matiere) &&
          (!courseFile || r.sourceFile === courseFile)
      ),
    [niveau, matiere, courseFile, resources]
  );

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Ressources pédagogiques</p>
        <h1>Choisissez le niveau, puis la matière, puis le cours si plusieurs versions existent.</h1>
        <p className="lede">
          L’étiquette du cours vient de la propriété "nom" du fichier JSON. Si plusieurs versions existent pour la matière choisie, vous pouvez basculer vers une autre variante.
        </p>
      </section>

      <section className="panel">
        <div className="field">
          <label htmlFor="niveau">Classe</label>
          <select
            id="niveau"
            value={niveau}
            onChange={(e) => {
              setNiveau(e.target.value);
              setMatiere("");
            }}
          >
            <option value="">Toutes les classes</option>
            {niveaux.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="matiere">Matière</label>
          <select
            id="matiere"
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
          >
            <option value="">Choisissez une matière</option>
            {matieres.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {matiere && availableCourseFiles.length > 1 ? (
          <div className="field">
            <label htmlFor="courseFile">Cours</label>
            <select
              id="courseFile"
              value={courseFile}
              onChange={(e) => setCourseFile(e.target.value)}
            >
              {availableCourseFiles.map((entry) => (
                <option key={entry.file} value={entry.file}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      <section className="results-grid">
        {resultats.map((r) => (
          <article
            key={`${r.niveau}-${r.matiere}-${r.sourceFile ?? "unknown"}-${r.titre}-${r.url}-${r.chapitre}`}
            className="resource-card"
          >
            <div className="resource-head">
              <p className="resource-meta">{r.niveau} • {r.matiere}</p>
              {r.chapitre ? <span className="badge">Chapitre : {r.chapitre}</span> : null}
            </div>
            <h2>{r.titre}</h2>
            <p className="resource-source">Source : {r.source}</p>

            {r.type === "link" ? (
              <a className="resource-link" href={r.url} target="_blank" rel="noreferrer">
                Ouvrir le site de la ressource
              </a>
            ) : (
              <iframe className="resource-frame" src={r.url} title={r.titre} />
            )}
          </article>
        ))}
      </section>

      <style jsx>{`
        :global(body) {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: linear-gradient(135deg, #f4f7ff 0%, #eef6ff 45%, #f9fbff 100%);
          color: #17324d;
        }

        * { box-sizing: border-box; }

        .page-shell {
          min-height: 100vh;
          padding: 32px 18px 48px;
        }

        .hero-card,
        .panel,
        .resource-card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #dbe6f7;
          border-radius: 24px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }

        .hero-card {
          max-width: 1100px;
          margin: 0 auto 18px;
          padding: 24px;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.82rem;
          color: #4b6bff;
          font-weight: 700;
        }

        h1 {
          margin: 6px 0 8px;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          line-height: 1.1;
        }

        .lede {
          color: #4c6383;
          max-width: 780px;
        }

        .panel {
          max-width: 1100px;
          margin: 0 auto 22px;
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-weight: 700;
          color: #24405c;
        }

        select {
          border: 1px solid #cdd9ef;
          border-radius: 14px;
          padding: 12px 14px;
          background: #fff;
          color: #17324d;
          font-size: 1rem;
        }

        .results-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }

        .resource-card {
          padding: 16px;
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
          background: #edf3ff;
          color: #3b5bd8;
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
          color: #2858d4;
          font-weight: 700;
          text-decoration: none;
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
