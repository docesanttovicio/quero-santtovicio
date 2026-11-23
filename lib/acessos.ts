import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Acessos da loja: cada linha é um passo de um visitante anônimo (visita, abriu produto, pôs na sacola,
// foi preencher os dados). Não guarda IP, nome nem nada que identifique a pessoa.
// Tabela "acessos" no Supabase (ver supabase/schema.sql); sem Supabase, grava em data/acessos.json.

export const TIPOS = ["visita", "produto", "sacola", "dados"] as const;
export type Tipo = (typeof TIPOS)[number];
export type Acesso = { em: string; visitante: string; tipo: Tipo; produto: string | null; origem: string | null; dispositivo: string | null };

let sb: SupabaseClient | null | undefined;
function cliente() {
  if (sb !== undefined) return sb;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  sb = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return sb;
}

const ARQ = path.join(process.cwd(), "data", "acessos.json");
async function lerArquivo(): Promise<Acesso[]> {
  try { return JSON.parse(await fs.readFile(ARQ, "utf8")); } catch { return []; }
}
let fila: Promise<unknown> = Promise.resolve();

export async function registrarAcesso(a: Omit<Acesso, "em">) {
  const s = cliente();
  if (s) {
    const { error } = await s.from("acessos").insert(a);
    if (error) throw error;
    return;
  }
  fila = fila.then(async () => {
    const l = await lerArquivo();
    l.push({ ...a, em: new Date().toISOString() });
    await fs.mkdir(path.dirname(ARQ), { recursive: true });
    await fs.writeFile(ARQ, JSON.stringify(l));
  }).catch(() => {});
  await fila;
}

// Tudo a partir de uma data (de 1000 em 1000, que é o limite por consulta do Supabase).
export async function acessosDesde(desde: Date | null): Promise<Acesso[]> {
  const s = cliente();
  if (!s) return (await lerArquivo()).filter((a) => !desde || a.em >= desde.toISOString());
  const todos: Acesso[] = [];
  for (let de = 0; de < 100_000; de += 1000) {
    let q = s.from("acessos").select("em,visitante,tipo,produto,origem,dispositivo").order("id").range(de, de + 999);
    if (desde) q = q.gte("em", desde.toISOString());
    const { data, error } = await q;
    if (error) throw error;
    todos.push(...(data as Acesso[]));
    if (data.length < 1000) break;
  }
  return todos;
}

// De onde a pessoa veio, a partir do ?utm_source= do link ou da página anterior.
export function origemDe(utm: string, ref: string, host: string): string {
  const u = utm.toLowerCase();
  let r = "";
  try { r = ref ? new URL(ref).hostname.replace(/^www\./, "").toLowerCase() : ""; } catch {}
  if (r && host && r === host.replace(/^www\./, "").toLowerCase()) r = "";
  const t = `${u} ${r}`;
  if (/instagram|^ig\b|\big\b/.test(t)) return "Instagram";
  if (/whats|wa\.me/.test(t)) return "WhatsApp";
  if (/facebook|fb\b|fb\.com/.test(t)) return "Facebook";
  if (/tiktok/.test(t)) return "TikTok";
  if (/google/.test(t)) return "Google";
  if (/^qr/.test(u)) return "QR code";
  if (u) return u.slice(0, 30);
  if (r) return "Outros sites";
  return "Direto ou link";
}

export function dispositivoDe(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android/i.test(ua)) return "Celular";
  return "Computador";
}

export const ehRobo = (ua: string) => !ua || /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slurp|headless|lighthouse|vercel/i.test(ua);
