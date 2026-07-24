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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
