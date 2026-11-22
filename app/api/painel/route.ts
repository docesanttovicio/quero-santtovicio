import { NextResponse } from "next/server";
import { db, modoBanco } from "@/lib/banco";
import { entrar, logado, sair, senhaConfere } from "@/lib/painel-auth";
import { whatsappLigado } from "@/lib/whatsapp";

// GET: lista de pedidos do painel. POST: login com a senha.
export async function GET() {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  return NextResponse.json({ pedidos: await db().listar(), banco: modoBanco(), whatsapp: whatsappLigado() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!process.env.PAINEL_SENHA) return NextResponse.json({ erro: "Defina PAINEL_SENHA no arquivo .env.local." }, { status: 500 });
  if (!senhaConfere(String(b.senha ?? ""))) return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  await entrar();
  return NextResponse.json({ ok: true });
}

// DELETE: sair do painel neste aparelho.
export async function DELETE() {
  await sair();
  return NextResponse.json({ ok: true });
}
