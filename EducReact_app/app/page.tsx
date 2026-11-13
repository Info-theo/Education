import { loadCatalog } from "../lib/data";
import PageClient from "./page-client";

export default function Home() {
  const { resources, levelOrder, styleData } = loadCatalog();

  return <PageClient resources={resources} levelOrder={levelOrder} styleData={styleData} />;
}
