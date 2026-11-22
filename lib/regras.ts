// Regras do Natal 2026. Datas e horários num lugar só.

export const PEDIDOS_ATE = new Date("2026-12-15T23:59:00-03:00");

export const DIAS = [
  { id: "2026-12-23", nome: "Quarta, 23/12", sub: "Véspera da véspera" },
  { id: "2026-12-24", nome: "Quinta, 24/12", sub: "Dia da ceia" },
];
export const FAIXAS = [
  { id: "10-13", nome: "10h às 13h", sub: "Manhã" },
  { id: "13-16", nome: "13h às 16h", sub: "Início da tarde" },
  { id: "16-19", nome: "16h às 19h", sub: "Fim da tarde" },
];

export const SINAL = 0.5;

export type Modo = "entrega" | "retirada";
export type Pagamento = "pix" | "cartao";

export type ItemPedido = { produtoId: string; vi: number; nome: string; variante: string; preco: number; qtd: number; obs: string };
export type Endereco = { cep: string; rua: string; numero: string; complemento: string; bairro: string };
export type Evento = { etapa: number; em: string; mensagem: string; envio?: "enviado" | "manual" | "erro"; erro?: string; pix?: boolean; livre?: boolean; cancel?: boolean };

export type Pedido = {
  codigo: string;
  token: string;
  criadoEm: string;
  nome: string;
  whatsapp: string;
  modo: Modo;
  dia: string;
  faixa: string;
  endereco: Endereco | null;
  itens: ItemPedido[];
  subtotal: number;
  taxa: number; // taxa de entrega em vigor (a loja pode ajustar até cobrar)
  taxaEstimada: number | null;
  km: number | null;
  pagamento: Pagamento;
  etapa: number;
  novo: boolean;
  historico: Evento[];
  cancelado?: { em: string; motivo: string } | null;
};

// Visão do cliente: sem token
export type PedidoPublico = Omit<Pedido, "token" | "novo">;

type Etapa = { t: string; d: string; acao?: string; pill?: string };

export const ETAPAS_ENTREGA: Etapa[] = [
  { t: "Encomenda enviada", d: "Recebemos seu pedido. Falta o sinal para confirmar.", acao: "Confirmar sinal recebido", pill: "Aguardando sinal" },
  { t: "Encomenda confirmada", d: "Sinal recebido. Sua data está garantida.", acao: "Iniciar produção" },
  { t: "Em produção", d: "Seus doces estão saindo do forno.", acao: "Pronta: cobrar restante + entrega" },
  { t: "Pronta, aguardando pagamento", d: "Pague o restante com a entrega para ela sair.", acao: "Pagamento recebido: despachar", pill: "Aguardando pagamento" },
  { t: "Saiu para entrega", d: "O motorista está a caminho.", acao: "Marcar entregue" },
  { t: "Entregue", d: "Feliz Natal! Esperamos que vicie." },
];
export const ETAPAS_RETIRADA: Etapa[] = [
  ETAPAS_ENTREGA[0],
  ETAPAS_ENTREGA[1],
  { ...ETAPAS_ENTREGA[2], acao: "Avisar que está pronta" },
  { t: "Pronta para retirada", d: "Siga as orientações que enviamos no WhatsApp. O restante é pago na retirada.", acao: "Marcar retirada (restante pago)" },
  { t: "Retirada", d: "Feliz Natal! Esperamos que vicie." },
];

export const etapasDe = (p: Pick<Pedido, "modo">) => (p.modo === "retirada" ? ETAPAS_RETIRADA : ETAPAS_ENTREGA);
export const finalizado = (p: Pick<Pedido, "modo" | "etapa">) => p.etapa >= etapasDe(p).length - 1;
export const sinal = (p: Pick<Pedido, "subtotal">) => round2(p.subtotal * SINAL);
export const restante = (p: Pick<Pedido, "subtotal" | "modo" | "taxa">) =>
  round2(p.subtotal - sinal(p) + (p.modo === "entrega" ? p.taxa : 0));

export const round2 = (v: number) => Math.round(v * 100) / 100;
export const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const nomeDia = (id: string) => DIAS.find((d) => d.id === id)?.nome ?? id;
export const nomeFaixa = (id: string) => FAIXAS.find((f) => f.id === id)?.nome ?? id;
export const pedidosAbertos = (agora = new Date()) => agora <= PEDIDOS_ATE;
