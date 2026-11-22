import "server-only";
import type { Endereco } from "./regras";
import type { ConfigTaxa } from "./config";

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
const meio = (v: number) => Math.ceil(v * 2) / 2;

// Taxa = (base + R$/km, com mínimo) ajustada pelo % do dia de entrega. Arredonda para cima em R$ 0,50.
export function precoPorKm(km: number, t: ConfigTaxa, dia?: string) {
  const bruto = Math.max(t.minimo, t.base + t.porKm * km);
  const ajuste = dia ? t.ajusteDia[dia] ?? 0 : 0;
  return meio(bruto * (1 + ajuste / 100));
}

export type Distancia = { km: number; fonte: "google" | "bairro" } | null;

export async function distancia(e: Partial<Endereco>): Promise<Distancia> {
  const key = process.env.GOOGLE_MAPS_KEY, origem = process.env.ORIGEM_ENDERECO;
  if (key && origem && e.rua && e.numero) {
    try {
      const destino = `${e.rua}, ${e.numero} - ${e.bairro ?? ""}, Rio de Janeiro - RJ, ${e.cep ?? ""}, Brasil`;
      const u = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      u.search = new URLSearchParams({ origins: origem, destinations: destino, mode: "driving", units: "metric", language: "pt-BR", key }).toString();
      const r = await fetch(u, { cache: "no-store" });
      const j = await r.json();
      const el = j?.rows?.[0]?.elements?.[0];
      if (el?.status === "OK") return { km: Math.round((el.distance.value / 1000) * 10) / 10, fonte: "google" };
    } catch {
      /* cai para a tabela de bairros */
    }
  }
  const k = Object.keys(KM_BAIRRO).find((b) => norm(b) === norm(e.bairro ?? ""));
  return k ? { km: KM_BAIRRO[k], fonte: "bairro" } : null;
}

export async function estimarTaxa(e: Partial<Endereco>, t: ConfigTaxa, dia?: string) {
  const d = await distancia(e);
  return d ? { km: d.km, valor: precoPorKm(d.km, t, dia), fonte: d.fonte } : null;
}
