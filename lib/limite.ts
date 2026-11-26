import "server-only";
import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Limite de tentativas por aparelho/rede (contra robôs e senha chutada).
// Guarda só um resumo (hash) do IP, nunca o IP em si. Tabela "tentativas" no Supabase
// (ver supabase/schema.sql); sem Supabase, conta na memória do servidor.

let sb: SupabaseClient | null | undefined;
function cliente() {
  if (sb !== undefined) return sb;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  sb = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return sb;
}
const memoria = new Map<string, number[]>();

// Quem está fazendo o pedido, sem guardar o IP: hash com o segredo do painel.
export function quem(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const sal = process.env.PAINEL_SEGREDO || process.env.PAINEL_SENHA || "sv";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 32);
}

// Quantas vezes essa chave apareceu na janela (em minutos).
async function contar(chave: string, minutos: number): Promise<number> {
  const desde = Date.now() - minutos * 60_000;
  const s = cliente();
  if (!s) return (memoria.get(chave) ?? []).filter((t) => t >= desde).length;
  const { count, error } = await s.from("tentativas").select("id", { count: "exact", head: true })
    .eq("chave", chave).gte("em", new Date(desde).toISOString());
  if (error) { console.error("[limite]", error.message); return 0; } // na dúvida, não trava o cliente
  return count ?? 0;
}

export async function anotar(chave: string) {
  const s = cliente();
  if (!s) { memoria.set(chave, [...(memoria.get(chave) ?? []).filter((t) => t > Date.now() - 864e5), Date.now()]); return; }
  const { error } = await s.from("tentativas").insert({ chave });
  if (error) console.error("[limite]", error.message);
  // De vez em quando, apaga o que tem mais de 1 dia.
  if (Math.random() < 0.02) await s.from("tentativas").delete().lt("em", new Date(Date.now() - 864e5).toISOString());
}

export async function limpar(chave: string) {
  const s = cliente();
  if (!s) { memoria.delete(chave); return; }
  await s.from("tentativas").delete().eq("chave", chave);
}

// Passou do limite? (máximo de vezes dentro da janela, em minutos)
export async function estourou(chave: string, maximo: number, minutos: number) {
  return (await contar(chave, minutos)) >= maximo;
}

// Conta esta vez e diz se ainda pode (para pedidos e cálculo de taxa).
export async function permitir(chave: string, maximo: number, minutos: number) {
  if (await estourou(chave, maximo, minutos)) return false;
  await anotar(chave);
  return true;
}
