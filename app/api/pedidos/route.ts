import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { porId } from "@/lib/catalogo";
import { DIAS, FAIXAS, pedidosAbertos, round2, type ItemPedido, type Pedido } from "@/lib/regras";
import { estimarTaxa } from "@/lib/taxa";
import { db } from "@/lib/banco";
import { mensagem } from "@/lib/mensagens";
import { avisarLoja } from "@/lib/avisos";

const txt = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  if (!pedidosAbertos()) return NextResponse.json({ erro: "As encomendas de Natal já foram encerradas." }, { status: 400 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 }); }

  // Itens: preço sempre do catálogo do servidor
  const brutos = Array.isArray(b.itens) ? b.itens.slice(0, 50) : [];
  const itens: ItemPedido[] = [];
  for (const it of brutos as Record<string, unknown>[]) {
    const p = porId(txt(it.produtoId, 40)), vi = Number(it.vi), qtd = Math.floor(Number(it.qtd));
    if (!p || !p.v[vi] || !(qtd >= 1 && qtd <= 50)) return NextResponse.json({ erro: "Um item da sacola não existe mais. Atualize a página." }, { status: 400 });
    itens.push({ produtoId: p.id, vi, nome: p.nome, variante: p.v[vi].n, preco: p.v[vi].p, qtd, obs: txt(it.obs, 140) });
  }
  if (!itens.length) return NextResponse.json({ erro: "Sua sacola está vazia." }, { status: 400 });

  const nome = txt(b.nome, 80), whatsapp = txt(b.whatsapp, 30);
  const modo = b.modo === "retirada" ? "retirada" : "entrega";
  const dia = DIAS.find((d) => d.id === b.dia)?.id, faixa = FAIXAS.find((f) => f.id === b.faixa)?.id;
  const pagamento = b.pagamento === "cartao" ? "cartao" : "pix";
  const faltam: string[] = [];
  if (!dia) faltam.push("o dia");
  if (!faixa) faltam.push("o horário");
  if (!nome) faltam.push("seu nome");
  if (whatsapp.replace(/\D/g, "").length < 10) faltam.push("um WhatsApp com DDD");

  const e = (b.endereco ?? {}) as Record<string, unknown>;
  const endereco = modo === "entrega"
    ? { cep: txt(e.cep, 10), rua: txt(e.rua), numero: txt(e.numero, 20), complemento: txt(e.complemento, 60), bairro: txt(e.bairro, 60) }
    : null;
  if (endereco && (!endereco.rua || !endereco.numero || !endereco.bairro)) faltam.push("o endereço");
  if (b.aceite !== true) faltam.push("o aceite das condições de pagamento");
  if (faltam.length) return NextResponse.json({ erro: "Falta preencher " + faltam.join(", ").replace(/, ([^,]*)$/, " e $1") + "." }, { status: 400 });

  const est = endereco ? await estimarTaxa(endereco) : null;
  const subtotal = round2(itens.reduce((a, i) => a + i.preco * i.qtd, 0));

  const base: Omit<Pedido, "codigo"> = {
    token: randomBytes(12).toString("base64url"),
    criadoEm: new Date().toISOString(),
    nome, whatsapp, modo, dia: dia!, faixa: faixa!, endereco, itens, subtotal,
    taxa: est?.valor ?? 0, taxaEstimada: est?.valor ?? null, km: est?.km ?? null,
    pagamento, etapa: 0, novo: true, historico: [],
  };
  const p = await db().criar(base);
  p.historico.push({ etapa: 0, em: p.criadoEm, mensagem: mensagem(p) });
  await db().salvar(p);
  await avisarLoja(p);
  return NextResponse.json({ codigo: p.codigo, token: p.token });
}
