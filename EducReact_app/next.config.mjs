// Sous-chemin du site, ex. "/Education" pour https://<compte>.github.io/Education/.
// Vide en local ; fourni par le workflow GitHub Pages (NEXT_BASE_PATH).
const basePath = process.env.NEXT_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Génère un site 100 % statique dans out/ (requis pour GitHub Pages).
  output: "export",
  basePath,
  // /avance → /avance/index.html, servi correctement par GitHub Pages.
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    // Autorise l'import du module partagé ../tools/catalog.mjs (hors du dossier de l'app).
    externalDir: true,
  },
};

export default nextConfig;
