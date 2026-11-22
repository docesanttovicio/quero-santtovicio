import type { Metadata, Viewport } from "next";
import { Gloock, Jost } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const gloock = Gloock({ weight: "400", subsets: ["latin"], variable: "--font-gloock", display: "swap" });
const jost = Jost({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Santto Vício · Encomendas de Natal",
  description: "Encomende brownies, cookies, bolos e salgados de Natal da Santto Vício Doceria.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Santto Vício",
    title: "Santto Vício · Encomendas de Natal",
    description: "Brownies, cookies, bolos e salgados de Natal. Encomendas até 15/12, entregas em 23 e 24/12.",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#5c0a16" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${gloock.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
