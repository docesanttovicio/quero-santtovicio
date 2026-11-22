import { NextResponse } from "next/server";
import { logado } from "@/lib/painel-auth";
import { lerConfig } from "@/lib/config";
import { precoPorKm } from "@/lib/taxa";
import { db } from "@/lib/banco";

// Recalcula a taxa dos pedidos de entrega de um dia que ainda não foram cobrados (antes de "Pronta").
// GET mostra a prévia; POST aplica.
async function calcular(dia: string) {
  const { taxa } = await lerConfig();
  const alvo = (await db().listar()).filter((p) => p.modo === "entrega" && p.dia === dia && p.etapa < 3 && p.km != null);
  return alvo.map((p) => ({ p, nova: precoPorKm(p.km!, taxa, dia) })).filter((x) => x.nova !== x.p.taxa);
}

export async function GET(req: Request) {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  const dia = new URL(req.url).searchParams.get("dia") ?? "";
  const l = await calcular(dia);
  return NextResponse.json({ mudancas: l.map(({ p, nova }) => ({ codigo: p.codigo, nome: p.nome, antes: p.taxa, depois: nova })) });
}

export async function POST(req: Request) {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  const { dia } = await req.json().catch(() => ({}));
  const l = await calcular(String(dia ?? ""));
  for (const { p, nova } of l) { p.taxa = nova; await db().salvar(p); }
  return NextResponse.json({ atualizados: l.length });
}
