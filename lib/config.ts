import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { PRODUTOS, type Produto } from "./catalogo";

// Configurações que a loja muda pelo painel: cardápio (preços, esgotado, oculto) e regras da taxa de entrega.
// Ficam no Supabase (tabela "config"); sem Supabase, em data/config.json.

export type ConfigTaxa = {
  base: number;
  porKm: number;
  minimo: number;
  ajusteDia: Record<string, number>; // % a mais (ou a menos) em cada dia de entrega, ex.: { "2026-12-24": 20 }
};
export type Config = { produtos: Produto[]; taxa: ConfigTaxa };

export const TAXA_PADRAO: ConfigTaxa = {
  base: Number(process.env.TAXA_BASE ?? 8),
  porKm: Number(process.env.TAXA_POR_KM ?? 0.95),
  minimo: Number(process.env.TAXA_MINIMO ?? 12),
  ajusteDia: {},
};

const padrao = (): Config => ({ produtos: structuredClone(PRODUTOS), taxa: { ...TAXA_PADRAO } });

const ARQ = path.join(process.cwd(), "data", "config.json");
const supa = () => {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
};

// Junta o que foi salvo com o cardápio do código: produto novo no código aparece; produto salvo mantém as edições.
function mesclar(salvo: Partial<Config> | null): Config {
  const base = padrao();
  if (!salvo) return base;
  const editados = new Map((salvo.produtos ?? []).map((p) => [p.id, p]));
  const produtos = base.produtos.map((p) => ({ ...p, ...(editados.get(p.id) ?? {}) }));
  return { produtos, taxa: { ...base.taxa, ...(salvo.taxa ?? {}), ajusteDia: { ...(salvo.taxa?.ajusteDia ?? {}) } } };
}

export async function lerConfig(): Promise<Config> {
  const sb = supa();
  if (sb) {
    const { data, error } = await sb.from("config").select("dados").eq("id", "loja").maybeSingle();
    if (error) { console.error("[config]", error.message); return padrao(); }
    return mesclar((data?.dados as Partial<Config>) ?? null);
  }
  try { return mesclar(JSON.parse(await fs.readFile(ARQ, "utf8"))); } catch { return padrao(); }
}

export async function salvarConfig(c: Config) {
  const sb = supa();
  if (sb) {
    const { error } = await sb.from("config").upsert({ id: "loja", dados: c, atualizado_em: new Date().toISOString() });
    if (error) throw error;
    return;
  }
  await fs.mkdir(path.dirname(ARQ), { recursive: true });
  await fs.writeFile(ARQ, JSON.stringify(c, null, 2));
}
