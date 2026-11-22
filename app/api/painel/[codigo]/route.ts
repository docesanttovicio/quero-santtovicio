import { NextResponse } from "next/server";
import { db } from "@/lib/banco";
import { logado } from "@/lib/painel-auth";
import { etapasDe, finalizado, round2 } from "@/lib/regras";
import { linkWhatsApp, mensagem } from "@/lib/mensagens";
import { enviarWhatsApp } from "@/lib/whatsapp";

// Ações da loja sobre um pedido: visto, taxa, avançar etapa (envia o WhatsApp sozinho) e reenviar mensagem.
export async function POST(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  const { codigo } = await params;
  const p = await db().buscar(codigo);
  if (!p) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  const b = await req.json().catch(() => ({}));

  if (b.acao === "visto") {
    p.novo = false;
  } else if (b.acao === "taxa") {
    const v = Number(b.valor);
    if (p.modo !== "entrega" || p.etapa >= 3) return NextResponse.json({ erro: "A taxa só pode mudar antes de cobrar o restante." }, { status: 400 });
    if (!(v >= 0 && v < 1000)) return NextResponse.json({ erro: "Valor de taxa inválido." }, { status: 400 });
    p.taxa = round2(v);
  } else if (b.acao === "avancar") {
    if (finalizado(p)) return NextResponse.json({ erro: "Esse pedido já foi concluído." }, { status: 400 });
    if (Number(b.de) !== p.etapa) return NextResponse.json({ erro: "Outra pessoa já atualizou esse pedido. Recarregue." }, { status: 409 });
    if (p.modo === "entrega" && p.etapa === 2 && !(p.taxa > 0)) return NextResponse.json({ erro: "Defina a taxa de entrega antes de cobrar o restante." }, { status: 400 });
    p.novo = false;
    p.etapa = Math.min(etapasDe(p).length - 1, p.etapa + 1);
    const m = mensagem(p);
    p.historico.push({ etapa: p.etapa, em: new Date().toISOString(), mensagem: m.texto, ...(await enviarWhatsApp(p.whatsapp, m)) });
  } else if (b.acao === "reenviar") {
    // tenta de novo pela API a mensagem da etapa atual; sem API, só devolve o link manual
    const ult = p.historico[p.historico.length - 1];
    if (ult && ult.etapa === p.etapa) {
      const r = await enviarWhatsApp(p.whatsapp, mensagem(p));
      if (r.envio !== "manual") { ult.envio = r.envio; ult.erro = r.erro; }
    }
  } else {
    return NextResponse.json({ erro: "Ação desconhecida." }, { status: 400 });
  }
  await db().salvar(p);
  const ultima = p.historico[p.historico.length - 1];
  return NextResponse.json({ pedido: p, whatsapp: linkWhatsApp(p, ultima?.mensagem ?? mensagem(p).texto), envio: ultima?.envio ?? "manual" });
}
