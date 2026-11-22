import { BRL, nomeDia, nomeFaixa, restante, sinal, type Pedido } from "./regras";

// Modelos de mensagem do WhatsApp (API oficial da Meta). Cada um precisa ser criado e aprovado no
// WhatsApp Manager com EXATAMENTE este nome e este texto, categoria "Utilidade", idioma "Português (BR)".
// Os {{n}} são preenchidos pelo sistema. O mesmo texto aparece na página de acompanhamento do cliente.
export const MODELOS = {
  sv_pedido_recebido:
    "Oi, {{1}}! Aqui é a Santto Vício. Recebemos sua encomenda {{2}} para {{3}}.\n\nPara confirmar, falta o sinal de {{4}}.\nComo pagar: {{5}}\n\nAcompanhe sua encomenda: {{6}}\n\nObrigado pela preferência!",
  sv_sinal_recebido:
    "Sinal recebido, {{1}}! Sua encomenda {{2}} está confirmada para {{3}}. Obrigado!",
  sv_retirada_confirmada:
    "Sinal recebido, {{1}}! Sua encomenda {{2}} está confirmada para {{3}}. Perto da data, te passamos por aqui o local e as orientações da retirada.",
  sv_em_producao:
    "Oi, {{1}}! Sua encomenda {{2}} entrou em produção. O cheirinho já chegou aqui na cozinha!",
  sv_pronta_pagamento:
    "Oi, {{1}}! Sua encomenda {{2}} está pronta. Como combinado, o pagamento da entrega é feito agora, antes de o motorista sair:\n\nRestante dos produtos: {{3}}\nEntrega: {{4}}\nTotal: {{5}}\nComo pagar: {{6}}\n\nAssim que o pagamento cair, despachamos.",
  sv_pronta_retirada:
    "Oi, {{1}}! Sua encomenda {{2}} está pronta. Responda esta mensagem para combinarmos o local e o horário da retirada. Restante a pagar na retirada: {{3}}. Até já!",
  sv_saiu_entrega:
    "Pagamento recebido, {{1}}! Sua encomenda {{2}} saiu para entrega e chega em breve.",
  sv_concluido:
    "Obrigado por escolher a Santto Vício, {{1}}! Esperamos que sua encomenda {{2}} faça sucesso na ceia. Feliz Natal!",
} as const;

export type NomeModelo = keyof typeof MODELOS;
export type Mensagem = { modelo: NomeModelo; params: string[]; texto: string };

const ENTREGA: NomeModelo[] = ["sv_pedido_recebido", "sv_sinal_recebido", "sv_em_producao", "sv_pronta_pagamento", "sv_saiu_entrega", "sv_concluido"];
const RETIRADA: NomeModelo[] = ["sv_pedido_recebido", "sv_retirada_confirmada", "sv_em_producao", "sv_pronta_retirada", "sv_concluido"];

const preencher = (modelo: NomeModelo, params: string[]) =>
  MODELOS[modelo].replace(/\{\{(\d+)\}\}/g, (_, i) => params[Number(i) - 1] ?? "");

// A Meta não aceita quebra de linha nem espaços repetidos dentro de um campo.
const limpo = (s: string) => s.replace(/\s+/g, " ").trim();

// Mensagem do WhatsApp enviada ao cliente quando o pedido chega na etapa atual.
export function mensagem(p: Pedido): Mensagem {
  const n = p.nome.split(" ")[0];
  const quando = `${nomeDia(p.dia)}, ${nomeFaixa(p.faixa)}${p.modo === "retirada" ? " (retirada)" : ""}`;
  const pagar = p.pagamento === "pix"
    ? `Pix ${process.env.PIX_CHAVE || "(chave a configurar)"}`
    : "link de cartão, que enviamos em seguida por aqui";
  const link = process.env.SITE_URL ? `${process.env.SITE_URL}/pedido/${p.codigo}?t=${p.token}` : "pelo link do site";
  const modelo = (p.modo === "retirada" ? RETIRADA : ENTREGA)[p.etapa];

  const params: Record<NomeModelo, string[]> = {
    sv_pedido_recebido: [n, p.codigo, quando, BRL(sinal(p)), pagar, link],
    sv_sinal_recebido: [n, p.codigo, quando],
    sv_retirada_confirmada: [n, p.codigo, quando],
    sv_em_producao: [n, p.codigo],
    sv_pronta_pagamento: [n, p.codigo, BRL(p.subtotal - sinal(p)), BRL(p.taxa), BRL(restante(p)), pagar],
    sv_pronta_retirada: [n, p.codigo, BRL(restante(p))],
    sv_saiu_entrega: [n, p.codigo],
    sv_concluido: [n, p.codigo],
  };
  const ps = params[modelo].map(limpo);
  return { modelo, params: ps, texto: preencher(modelo, ps) };
}

// Número no formato internacional (55 + DDD + número).
export function numeroWhatsApp(w: string) {
  let num = w.replace(/\D/g, "");
  if (num.length <= 11) num = "55" + num;
  return num;
}

// Link que abre o WhatsApp da loja com a mensagem pronta (plano B quando o envio automático não está ligado).
export function linkWhatsApp(p: Pedido, texto: string) {
  return `https://wa.me/${numeroWhatsApp(p.whatsapp)}?text=${encodeURIComponent(texto)}`;
}
