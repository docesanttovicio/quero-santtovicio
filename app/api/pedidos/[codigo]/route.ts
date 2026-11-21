import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/banco";
import type { PedidoPublico } from "@/lib/regras";

// Acompanhamento do cliente: só com o token secreto que veio no link do pedido.
export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const p = await db().buscar(codigo);
  const ok = p && t.length === p.token.length && timingSafeEqual(Buffer.from(t), Buffer.from(p.token));
  if (!p || !ok) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token: _t, novo: _n, ...pub } = p;
  return NextResponse.json(pub satisfies PedidoPublico, { headers: { "cache-control": "no-store" } });
}
