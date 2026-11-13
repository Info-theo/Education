import { loadCatalog } from "../../lib/data";
import AdvancedPageClient from "./page-client";

export const metadata = {
  title: "Recherche avancée · Ressources pédagogiques",
};

export default function AdvancedPage() {
  const { resources, levelOrder, styleData } = loadCatalog();

  return <AdvancedPageClient resources={resources} levelOrder={levelOrder} styleData={styleData} />;
}
