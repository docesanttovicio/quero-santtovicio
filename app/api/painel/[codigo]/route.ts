import { NextResponse } from "next/server";
import { db } from "@/lib/banco";
import { logado } from "@/lib/painel-auth";
import { etapasDe, finalizado, round2, type Pedido } from "@/lib/regras";
import { linkWhatsApp, mensagem, mensagemCancelamento, mensagemPix } from "@/lib/mensagens";
import { enviarTexto, enviarWhatsApp, notificarEtapa } from "@/lib/whatsapp";

// Mensagens da etapa atual (a principal e, se houver, a da chave Pix), mais recentes no fim do histórico.
const daEtapa = (p: Pedido) => p.historico.filter((h) => h.etapa === p.etapa && !h.livre && !h.cancel);

// Ações da loja sobre um pedido: visto, taxa, avançar etapa (envia o WhatsApp sozinho) e reenviar.
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
  } else if (b.acao === "cancelar") {
    if (p.cancelado) return NextResponse.json({ erro: "Esse pedido já está cancelado." }, { status: 400 });
    const motivo = typeof b.motivo === "string" ? b.motivo.trim().slice(0, 140) : "";
    p.cancelado = { em: new Date().toISOString(), motivo: motivo || "cancelado pela loja" };
    p.novo = false;
    const m = mensagemCancelamento(p);
    p.historico.push({ etapa: p.etapa, em: p.cancelado.em, mensagem: m.texto, cancel: true, ...(await enviarWhatsApp(p.whatsapp, m)) });
  } else if (b.acao === "reativar") {
    if (!p.cancelado) return NextResponse.json({ erro: "Esse pedido não está cancelado." }, { status: 400 });
    p.cancelado = null;
  } else if (b.acao === "avancar") {
    if (p.cancelado) return NextResponse.json({ erro: "Pedido cancelado. Reative antes de avançar." }, { status: 400 });
    if (finalizado(p)) return NextResponse.json({ erro: "Esse pedido já foi concluído." }, { status: 400 });
    if (Number(b.de) !== p.etapa) return NextResponse.json({ erro: "Outra pessoa já atualizou esse pedido. Recarregue." }, { status: 409 });
    if (p.modo === "entrega" && p.etapa === 2 && !(p.taxa > 0)) return NextResponse.json({ erro: "Defina a taxa de entrega antes de cobrar o restante." }, { status: 400 });
    p.novo = false;
    p.etapa = Math.min(etapasDe(p).length - 1, p.etapa + 1);
    await notificarEtapa(p);
  } else if (b.acao === "reenviar") {
    // tenta de novo pela API as mensagens da etapa atual; sem API, o painel usa os links manuais
    for (const h of daEtapa(p)) {
      const m = h.pix ? mensagemPix(p) : mensagem(p);
      if (!m) continue;
      const r = await enviarWhatsApp(p.whatsapp, m);
      if (r.envio !== "manual") { h.envio = r.envio; h.erro = r.erro; }
    }
  } else if (b.acao === "mensagem") {
    // mensagem livre escrita no painel; fica no histórico (o cliente vê no acompanhamento)
    const texto = typeof b.texto === "string" ? b.texto.trim().slice(0, 1000) : "";
    if (!texto) return NextResponse.json({ erro: "Escreva a mensagem." }, { status: 400 });
    const r = b.manual ? { envio: "manual" as const } : await enviarTexto(p.whatsapp, texto);
    p.historico.push({ etapa: p.etapa, em: new Date().toISOString(), mensagem: texto, livre: true, ...r });
    await db().salvar(p);
    return NextResponse.json({ pedido: p, whatsapp: linkWhatsApp(p, texto), envio: r.envio, erro: "erro" in r ? r.erro : undefined });
  } else {
    return NextResponse.json({ erro: "Ação desconhecida." }, { status: 400 });
  }
  await db().salvar(p);

  if (b.acao === "cancelar") {
    const u = p.historico[p.historico.length - 1];
    return NextResponse.json({ pedido: p, whatsapp: linkWhatsApp(p, u.mensagem), whatsappPix: null, envio: u.envio ?? "manual", erro: u.erro });
  }
  const msgs = daEtapa(p), principal = msgs.find((h) => !h.pix), pix = msgs.find((h) => h.pix);
  const envio = msgs.some((h) => h.envio === "erro") ? "erro" : msgs.length && msgs.every((h) => h.envio === "enviado") ? "enviado" : "manual";
  return NextResponse.json({
    pedido: p,
    whatsapp: linkWhatsApp(p, principal?.mensagem ?? mensagem(p).texto),
    // no manual, a chave vai totalmente sozinha, fácil de copiar
    whatsappPix: pix && process.env.PIX_CHAVE ? linkWhatsApp(p, process.env.PIX_CHAVE) : null,
    envio,
  });
}
