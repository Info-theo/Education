import "./globals.css";

export const metadata = {
  title: "Ressources pédagogiques",
  description: "Des cours et des vidéos pour réviser, du CP à la fac, classés par niveau et par matière.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
