import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Pedido } from "./regras";

// Dois modos: com SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY grava no Supabase (produção);
// sem eles, grava em data/pedidos.json (para testar no computador).

interface Banco {
  listar(): Promise<Pedido[]>;
  buscar(codigo: string): Promise<Pedido | null>;
  criar(p: Omit<Pedido, "codigo">): Promise<Pedido>;
  salvar(p: Pedido): Promise<void>;
}

const codigoDe = (n: number) => "SV-" + String(n).padStart(4, "0");

/* ---------- Arquivo local ---------- */
const ARQ = path.join(process.cwd(), "data", "pedidos.json");
let fila: Promise<unknown> = Promise.resolve();
const emFila = <T>(fn: () => Promise<T>) => { const r = fila.then(fn, fn); fila = r.catch(() => {}); return r; };
async function ler(): Promise<Pedido[]> {
  try { return JSON.parse(await fs.readFile(ARQ, "utf8")); } catch { return []; }
}
async function gravar(l: Pedido[]) {
  await fs.mkdir(path.dirname(ARQ), { recursive: true });
  await fs.writeFile(ARQ + ".tmp", JSON.stringify(l, null, 2));
  await fs.rename(ARQ + ".tmp", ARQ);
}
const arquivo: Banco = {
  listar: async () => (await ler()).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
  buscar: async (c) => (await ler()).find((p) => p.codigo === c) ?? null,
  criar: (p) => emFila(async () => {
    const l = await ler();
    const n = l.reduce((m, x) => Math.max(m, Number(x.codigo.slice(3)) || 0), 0) + 1;
    const novo = { ...p, codigo: codigoDe(n) } as Pedido;
    l.push(novo); await gravar(l); return novo;
  }),
  salvar: (p) => emFila(async () => {
    const l = await ler(); const i = l.findIndex((x) => x.codigo === p.codigo);
    if (i < 0) throw new Error("Pedido não encontrado"); l[i] = p; await gravar(l);
  }),
};

/* ---------- Supabase ---------- */
// Tabela "pedidos" (ver supabase/schema.sql): numero serial, codigo, dados jsonb.
function supa(sb: SupabaseClient): Banco {
  return {
    listar: async () => {
      const { data, error } = await sb.from("pedidos").select("dados").order("numero", { ascending: false }).limit(500);
      if (error) throw error; return data.map((r) => r.dados as Pedido);
    },
    buscar: async (c) => {
      const { data, error } = await sb.from("pedidos").select("dados").eq("codigo", c).maybeSingle();
      if (error) throw error; return (data?.dados as Pedido) ?? null;
    },
    criar: async (p) => {
      const { data, error } = await sb.from("pedidos").insert({ dados: p }).select("numero").single();
      if (error) throw error;
      const novo = { ...p, codigo: codigoDe(data.numero) } as Pedido;
      const up = await sb.from("pedidos").update({ codigo: novo.codigo, dados: novo }).eq("numero", data.numero);
      if (up.error) throw up.error; return novo;
    },
    salvar: async (p) => {
      const { error } = await sb.from("pedidos").update({ dados: p }).eq("codigo", p.codigo);
      if (error) throw error;
    },
  };
}

let banco: Banco | null = null;
export function db(): Banco {
  if (banco) return banco;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  banco = url && key ? supa(createClient(url, key, { auth: { persistSession: false } })) : arquivo;
  return banco;
}
export const modoBanco = () => (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "arquivo");
