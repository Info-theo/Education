import fs from "fs";
import path from "path";
import type { Resource } from "../types/resources";
import PageClient from "./page-client";

function readResources(dir: string): Resource[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return readResources(fullPath);
    }

    if (!entry.isFile() || !entry.name.endsWith(".json") || !/^cours.*\.json$/i.test(entry.name)) {
      return [];
    }

    const raw = JSON.parse(fs.readFileSync(fullPath, "utf8")) as
      | Resource[]
      | { nom?: string; name?: string; label?: string; resources?: Resource[] };

    const metadata = Array.isArray(raw) ? {} : raw;
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.resources)
        ? raw.resources
        : [];
    const courseLabel =
      (typeof metadata.nom === "string" && metadata.nom.trim()) ||
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      (typeof metadata.label === "string" && metadata.label.trim()) ||
      undefined;

    const parts = fullPath.split(path.sep);
    const dataIndex = parts.indexOf("data");
    const niveauFromPath = dataIndex >= 0 ? parts[dataIndex + 1] ?? "" : "";
    const matiereFromPath = dataIndex >= 0 ? parts[dataIndex + 2] ?? "" : "";
    const chapitreFromPath = path.basename(fullPath, ".json");

    return items.map((item) => ({
      ...item,
      niveau: item.niveau || niveauFromPath,
      matiere: item.matiere || matiereFromPath,
      chapitre: item.chapitre || (chapitreFromPath !== "resources" ? chapitreFromPath : ""),
      sourceFile: path.basename(fullPath),
      courseLabel: item.courseLabel || courseLabel || path.basename(fullPath),
    }));
  });
}

export default function Home() {
  const resources = readResources(path.join(process.cwd(), "data"));

  return <PageClient resources={resources} />;
}