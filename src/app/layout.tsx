import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const display = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "prasang0 — Prasang Das",
  description:
    "Prasang Das — physics, computation and intelligence. Quantum computing, scientific computing and AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${mono.variable} ${display.variable} antialiased`}>
      <body className="min-h-dvh font-mono">{children}</body>
    </html>
  );
}
