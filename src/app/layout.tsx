import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Friedrich Salomon",
  description: "Galerie",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen font-serif antialiased">{children}</body>
    </html>
  );
}
