/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Autorise l'import du module partagé ../tools/catalog.mjs (hors du dossier de l'app).
    externalDir: true,
  },
};

export default nextConfig;
