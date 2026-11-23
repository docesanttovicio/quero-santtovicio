import { NextResponse } from "next/server";
import { logado } from "@/lib/painel-auth";
import { acessosDesde } from "@/lib/acessos";
import { db } from "@/lib/banco";
import { lerConfig } from "@/lib/config";

// Resumo dos acessos da loja para a aba "Acessos" do painel. Horário de Brasília.

const TZ = "America/Sao_Paulo";
const diaDe = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const horaDe = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(d));
const meiaNoite = (dia: string) => new Date(`${dia}T00:00:00-03:00`);
const somaDias = (dia: string, n: number) => diaDe(new Date(meiaNoite(dia).getTime() + n * 86_400_000 + 3_600_000));

export type Periodo = "hoje" | "7d" | "30d" | "tudo";

export async function GET(req: Request) {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  const periodo = (new URL(req.url).searchParams.get("p") ?? "7d") as Periodo;
  const hoje = diaDe(new Date());
  const inicio = periodo === "hoje" ? hoje : periodo === "7d" ? somaDias(hoje, -6) : periodo === "30d" ? somaDias(hoje, -29) : null;
  const desde = inicio ? meiaNoite(inicio) : null;

  const [acessos, pedidosTodos, config] = await Promise.all([acessosDesde(desde), db().listar(), lerConfig()]);
  const pedidos = pedidosTodos.filter((p) => !desde || p.criadoEm >= desde.toISOString());

  const unicos = (f: (a: (typeof acessos)[number]) => boolean) => new Set(acessos.filter(f).map((a) => a.visitante)).size;
  const cincoMin = new Date(Date.now() - 5 * 60_000).toISOString();
  const visitantes = unicos((a) => a.tipo === "visita");

  // Série: por hora (hoje) ou por dia.
  const porHora = periodo === "hoje";
  const primeiroDia = inicio ?? [...acessos.map((a) => diaDe(new Date(a.em))), ...pedidos.map((p) => diaDe(new Date(p.criadoEm)))].sort()[0] ?? hoje;
  const chaves: string[] = [];
  if (porHora) for (let h = 0; h <= horaDe(new Date()); h++) chaves.push(String(h));
  else for (let d = primeiroDia; d <= hoje && chaves.length < 400; d = somaDias(d, 1)) chaves.push(d);
  const chaveDe = (iso: string) => (porHora ? String(horaDe(new Date(iso))) : diaDe(new Date(iso)));
  const vis = new Map<string, Set<string>>(), ped = new Map<string, number>();
  for (const a of acessos) if (a.tipo === "visita") { const k = chaveDe(a.em); (vis.get(k) ?? vis.set(k, new Set()).get(k)!).add(a.visitante); }
  for (const p of pedidos) { const k = chaveDe(p.criadoEm); ped.set(k, (ped.get(k) ?? 0) + 1); }
  const serie = chaves.map((k) => ({ k, visitantes: vis.get(k)?.size ?? 0, pedidos: ped.get(k) ?? 0 }));

  // Origem e aparelho: a primeira visita de cada pessoa no período.
  const primeira = new Map<string, (typeof acessos)[number]>();
  for (const a of acessos) if (a.tipo === "visita" && !primeira.has(a.visitante)) primeira.set(a.visitante, a);
  const contar = (campo: "origem" | "dispositivo") => {
    const m = new Map<string, number>();
    for (const a of primeira.values()) { const n = a[campo] || "Não identificado"; m.set(n, (m.get(n) ?? 0) + 1); }
    return [...m].map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n);
  };

  const nomes = new Map(config.produtos.map((p) => [p.id, p.nome]));
  const prod = new Map<string, { abriram: Set<string>; sacola: Set<string> }>();
  for (const a of acessos) {
    if (!a.produto || (a.tipo !== "produto" && a.tipo !== "sacola")) continue;
    const x = prod.get(a.produto) ?? prod.set(a.produto, { abriram: new Set(), sacola: new Set() }).get(a.produto)!;
    (a.tipo === "produto" ? x.abriram : x.sacola).add(a.visitante);
  }
  const produtos = [...prod].map(([id, x]) => ({ id, nome: nomes.get(id) ?? id, abriram: x.abriram.size, sacola: x.sacola.size }))
    .sort((a, b) => b.abriram - a.abriram || b.sacola - a.sacola);

  return NextResponse.json({
    periodo, porHora,
    agora: new Set(acessos.filter((a) => a.em >= cincoMin).map((a) => a.visitante)).size,
    visitantes,
    pedidos: pedidos.length,
    funil: [
      { t: "Entraram na loja", n: visitantes },
      { t: "Abriram um produto", n: unicos((a) => a.tipo === "produto") },
      { t: "Puseram algo na sacola", n: unicos((a) => a.tipo === "sacola") },
      { t: "Foram preencher os dados", n: unicos((a) => a.tipo === "dados") },
      { t: "Enviaram a encomenda", n: pedidos.length },
    ],
    serie, origens: contar("origem"), dispositivos: contar("dispositivo"), produtos,
  }, { headers: { "cache-control": "no-store" } });
}
