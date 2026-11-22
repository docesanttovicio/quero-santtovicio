import { BRL, nomeDia, nomeFaixa, restante, sinal, type Pedido } from "./regras";
import { SITE } from "./site";

// Modelos de mensagem do WhatsApp (API oficial da Meta). Cada um precisa ser criado e aprovado no
// WhatsApp Manager com EXATAMENTE este nome e este texto, categoria "Utilidade", idioma "Português (BR)".
// Os {{n}} são preenchidos pelo sistema. O mesmo texto aparece na página de acompanhamento do cliente.
export const MODELOS = {
  sv_pedido_recebido:
    "Oi, {{1}}! Aqui é a Santto Vício. Recebemos sua encomenda {{2}} para {{3}}.\n\nPara confirmar, falta o sinal de {{4}}.\n{{5}}\nDepois de pagar, mande o comprovante aqui nesta conversa.\n\nAcompanhe: {{6}}\n\nObrigado pela preferência!",
  sv_sinal_recebido:
    "Sinal recebido, {{1}}! Sua encomenda {{2}} está confirmada para {{3}}. Obrigado!",
  sv_retirada_confirmada:
    "Sinal recebido, {{1}}! Sua encomenda {{2}} está confirmada para {{3}}. Perto da data, te passamos por aqui o local e as orientações da retirada.",
  sv_em_producao:
    "Oi, {{1}}! Sua encomenda {{2}} entrou em produção. O cheirinho já chegou aqui na cozinha!",
  sv_pronta_pagamento:
    "Oi, {{1}}! Sua encomenda {{2}} está pronta. Como combinado, o pagamento da entrega é feito agora, antes de o motorista sair:\n\nRestante dos produtos: {{3}}\nEntrega: {{4}}\nTotal: {{5}}\n{{6}}\n\nDepois de pagar, mande o comprovante aqui nesta conversa. Assim que conferirmos, despachamos.",
  sv_pronta_retirada:
    "Oi, {{1}}! Sua encomenda {{2}} está pronta. Responda esta mensagem para combinarmos o local e o horário da retirada. Restante a pagar na retirada: {{3}}. Até já!",
  sv_saiu_entrega:
    "Pagamento recebido, {{1}}! Sua encomenda {{2}} saiu para entrega e chega em breve.",
  sv_chave_pix:
    "Chave Pix da Santto Vício:\n\n{{1}}\n\nToque e segure na chave para copiar. Depois de pagar, mande o comprovante aqui.",
  sv_cancelado:
    "Oi, {{1}}. Sua encomenda {{2}} foi cancelada. Motivo: {{3}}.\n\nSe você já pagou algum valor, vamos combinar a devolução por aqui. Qualquer dúvida, é só responder esta mensagem.",
  sv_concluido:
    "Obrigado por escolher a Santto Vício, {{1}}! Esperamos que sua encomenda {{2}} faça sucesso na ceia. Feliz Natal!",
} as const;

export type NomeModelo = keyof typeof MODELOS;

// Exemplos que a Meta pede para aprovar cada modelo (um por {{n}}, na ordem).
const ACOMP = "https://quero.santtovicio.com.br/pedido/SV-0001";
export const EXEMPLOS: Record<NomeModelo, string[]> = {
  sv_pedido_recebido: ["Mariana", "SV-0001", "Quinta, 24/12, 13h às 16h", "R$ 90,00", "Segue a nossa chave Pix logo abaixo.", ACOMP],
  sv_sinal_recebido: ["Mariana", "SV-0001", "Quinta, 24/12, 13h às 16h"],
  sv_retirada_confirmada: ["Mariana", "SV-0001", "Quinta, 24/12, 13h às 16h (retirada)"],
  sv_em_producao: ["Mariana", "SV-0001"],
  sv_pronta_pagamento: ["Mariana", "SV-0001", "R$ 90,00", "R$ 52,00", "R$ 142,00", "Segue a nossa chave Pix logo abaixo."],
  sv_pronta_retirada: ["Mariana", "SV-0001", "R$ 90,00"],
  sv_saiu_entrega: ["Mariana", "SV-0001"],
  sv_chave_pix: ["doce.santtovicio@gmail.com"],
  sv_cancelado: ["Mariana", "SV-0001", "Cliente desistiu"],
  sv_concluido: ["Mariana", "SV-0001"],
};
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
  const pagar = p.pagamento === "pix" && process.env.PIX_CHAVE
    ? "Segue a nossa chave Pix logo abaixo."
    : p.pagamento === "pix" ? "Em seguida enviamos a nossa chave Pix por aqui." : "Em seguida enviamos o link de pagamento do cartão por aqui.";
  const link = `${SITE}/pedido/${p.codigo}?t=${p.token}`;
  const modelo = (p.modo === "retirada" ? RETIRADA : ENTREGA)[p.etapa];

  const params: Record<NomeModelo, string[]> = {
    sv_pedido_recebido: [n, p.codigo, quando, BRL(sinal(p)), pagar, link],
    sv_sinal_recebido: [n, p.codigo, quando],
    sv_retirada_confirmada: [n, p.codigo, quando],
    sv_em_producao: [n, p.codigo],
    sv_pronta_pagamento: [n, p.codigo, BRL(p.subtotal - sinal(p)), BRL(p.taxa), BRL(restante(p)), pagar],
    sv_pronta_retirada: [n, p.codigo, BRL(restante(p))],
    sv_saiu_entrega: [n, p.codigo],
    sv_chave_pix: [process.env.PIX_CHAVE ?? ""],
    sv_cancelado: [n, p.codigo, p.cancelado?.motivo || "cancelado pela loja"],
    sv_concluido: [n, p.codigo],
  };
  const ps = params[modelo].map(limpo);
  return { modelo, params: ps, texto: preencher(modelo, ps) };
}

// Aviso de cancelamento (usa o motivo salvo em p.cancelado).
export function mensagemCancelamento(p: Pedido): Mensagem {
  const params = [p.nome.split(" ")[0], p.codigo, (p.cancelado?.motivo || "cancelado pela loja").replace(/\s+/g, " ").replace(/[.\s]+$/, "")];
  return { modelo: "sv_cancelado", params, texto: preencher("sv_cancelado", params) };
}

// Segunda mensagem, só com a chave Pix, logo depois das mensagens que pedem pagamento.
export function mensagemPix(p: Pedido): Mensagem | null {
  const chave = process.env.PIX_CHAVE;
  const cobra = p.etapa === 0 || (p.modo === "entrega" && p.etapa === 3);
  if (p.pagamento !== "pix" || !chave || !cobra) return null;
  return { modelo: "sv_chave_pix", params: [chave], texto: preencher("sv_chave_pix", [chave]) };
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
