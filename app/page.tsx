import fs from "fs";
import path from "path";
import type { Resource, StyleCatalog } from "../types/resources";
import PageClient from "./page-client";

function readLevelOrder(dir: string): string[] {
  const orderFile = path.join(dir, "ordre-niveaux.json");

  if (!fs.existsSync(orderFile)) {
    return [];
  }

  const raw = JSON.parse(fs.readFileSync(orderFile, "utf8")) as { niveaux?: string[] };

  return Array.isArray(raw.niveaux) ? raw.niveaux.filter((item): item is string => typeof item === "string") : [];
}

function readGenericStyles(dir: string): StyleCatalog {
  const styleFile = path.join(dir, "generic_data.json");

  if (!fs.existsSync(styleFile)) {
    return {};
  }

  const raw = JSON.parse(fs.readFileSync(styleFile, "utf8")) as {
    niveaux?: string[];
    styles?: StyleCatalog;
  };

  return {
    ...(raw.styles ?? {}),
    niveaux: Array.isArray(raw.niveaux) ? raw.niveaux : [],
  };
}

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
  const dataDir = path.join(process.cwd(), "data");
  const resources = readResources(dataDir);
  const levelOrder = readLevelOrder(dataDir);
  const styleData = readGenericStyles(dataDir);

  return <PageClient resources={resources} levelOrder={levelOrder} styleData={styleData} />;
}