import { NextResponse } from "next/server";
import { logado } from "@/lib/painel-auth";
import { lerConfig, salvarConfig, type Config } from "@/lib/config";
import { KM_BAIRRO } from "@/lib/taxa";
import { DIAS } from "@/lib/regras";

// Cardápio e regras de taxa: o painel lê e salva aqui.
export async function GET() {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  return NextResponse.json({ config: await lerConfig(), bairros: KM_BAIRRO, dias: DIAS }, { headers: { "cache-control": "no-store" } });
}

const num = (v: unknown, min: number, max: number) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null; };
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function PUT(req: Request) {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<Config>;
  const atual = await lerConfig();

  if (b.taxa) {
    const t = b.taxa, base = num(t.base, 0, 200), porKm = num(t.porKm, 0, 20), minimo = num(t.minimo, 0, 200);
    if (base === null || porKm === null || minimo === null) return NextResponse.json({ erro: "Confira os valores da taxa." }, { status: 400 });
    const ajusteDia: Record<string, number> = {};
    for (const d of DIAS) { const a = num(t.ajusteDia?.[d.id] ?? 0, -50, 200); if (a === null) return NextResponse.json({ erro: "O ajuste do dia deve ficar entre -50% e 200%." }, { status: 400 }); if (a) ajusteDia[d.id] = a; }
    atual.taxa = { base, porKm, minimo, ajusteDia };
  }
  if (Array.isArray(b.produtos)) {
    const recebidos = new Map(b.produtos.map((p) => [p.id, p]));
    for (const p of atual.produtos) {
      const n = recebidos.get(p.id); if (!n) continue;
      p.nome = txt(n.nome, 60) || p.nome;
      p.desc = txt(n.desc, 400) || p.desc;
      p.tags = txt(n.tags, 120);
      p.dest = txt(n.dest, 30) || undefined;
      p.esgotado = Boolean(n.esgotado);
      p.oculto = Boolean(n.oculto);
      p.grande = Boolean(n.grande);
      if (Array.isArray(n.v) && n.v.length === p.v.length) {
        p.v = p.v.map((v, i) => ({ n: txt(n.v[i]?.n, 40) || v.n, p: num(n.v[i]?.p, 0, 5000) ?? v.p }));
      }
    }
  }
  await salvarConfig(atual);
  return NextResponse.json({ config: atual });
}
