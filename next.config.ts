import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as páginas:
// - ninguém pode abrir o site dentro de outro site (golpe de "clique escondido" no painel);
// - o navegador não "adivinha" tipo de arquivo; links para fora não levam o endereço completo da página;
// - câmera, microfone e localização ficam bloqueados (o site não usa).
const seguranca = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: seguranca }];
  },
};

export default nextConfig;
