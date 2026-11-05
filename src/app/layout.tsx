import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMEGA AI – DIAJOLOGIJA",
  description:
    "OMEGA AI powered by DIAJOLOGIJA – a continuous-improvement conversational layer built for Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans"><aside className="border-b border-amber-700 bg-amber-950 p-3 text-center text-sm text-amber-100">
        SPAJA · OMEGA demonstracija. Bez AI ključa odgovori su probni. Razgovori pripadaju ovoj sesiji pregledača, traju najviše jedan sat i nestaju pri restartu. Ne unosite poverljive podatke.
      </aside>{children}</body>
    </html>
  );
}
