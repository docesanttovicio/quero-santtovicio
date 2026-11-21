import "server-only";
import type { Endereco } from "./regras";

// Taxa = base + R$/km, com mínimo. Ajuste pelo .env.local depois de simular corridas reais no Uber/99.
const BASE = Number(process.env.TAXA_BASE ?? 8);
const POR_KM = Number(process.env.TAXA_POR_KM ?? 0.95);
const MINIMO = Number(process.env.TAXA_MINIMO ?? 12);

// Distância aproximada (km, de carro) a partir de Senador Camará. Usada quando não há chave do Google Maps
// ou quando o Google não encontra o endereço.
export const KM_BAIRRO: Record<string, number> = {
  "Senador Camará": 2, Bangu: 4, "Padre Miguel": 4, "Santíssimo": 6, Realengo: 7, "Jardim Sulacap": 11, Deodoro: 12,
  "Campo Grande": 14, "Marechal Hermes": 14, "Vila Valqueire": 17, Madureira: 19, Taquara: 19, "Nova Iguaçu": 22,
  "Jacarepaguá": 22, "Santa Cruz": 24, Guaratiba: 24, Freguesia: 25, "Méier": 27, "Recreio dos Bandeirantes": 30,
  "Barra da Tijuca": 32, "Duque de Caxias": 33, Tijuca: 34, Centro: 38, Flamengo: 41, Botafogo: 43, Copacabana: 46,
  Ipanema: 48, Leblon: 49, "Niterói": 52,
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function precoPorKm(km: number) {
  return Math.max(MINIMO, Math.ceil((BASE + POR_KM * km) * 2) / 2);
}

export type Estimativa = { km: number; valor: number; fonte: "google" | "bairro" } | null;

export async function estimarTaxa(e: Partial<Endereco>): Promise<Estimativa> {
  const key = process.env.GOOGLE_MAPS_KEY, origem = process.env.ORIGEM_ENDERECO;
  if (key && origem && e.rua && e.numero) {
    try {
      const destino = `${e.rua}, ${e.numero} - ${e.bairro ?? ""}, Rio de Janeiro - RJ, ${e.cep ?? ""}, Brasil`;
      const u = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      u.search = new URLSearchParams({ origins: origem, destinations: destino, mode: "driving", units: "metric", language: "pt-BR", key }).toString();
      const r = await fetch(u, { cache: "no-store" });
      const j = await r.json();
      const el = j?.rows?.[0]?.elements?.[0];
      if (el?.status === "OK") {
        const km = Math.round((el.distance.value / 1000) * 10) / 10;
        return { km, valor: precoPorKm(km), fonte: "google" };
      }
    } catch {
      /* cai para a tabela de bairros */
    }
  }
  const k = Object.keys(KM_BAIRRO).find((b) => norm(b) === norm(e.bairro ?? ""));
  if (!k) return null;
  const km = KM_BAIRRO[k];
  return { km, valor: precoPorKm(km), fonte: "bairro" };
}
