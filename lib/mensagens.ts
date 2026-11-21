import { BRL, nomeDia, nomeFaixa, restante, sinal, type Pedido } from "./regras";

// Texto do WhatsApp enviado ao cliente quando o pedido chega em cada etapa.
export function mensagem(p: Pedido): string {
  const n = p.nome.split(" ")[0];
  const quando = `${nomeDia(p.dia)}, ${nomeFaixa(p.faixa)}`;
  const chave = process.env.PIX_CHAVE ? `Chave Pix: ${process.env.PIX_CHAVE}` : "Chave Pix: (configure PIX_CHAVE)";
  const pagar = p.pagamento === "pix" ? chave : "Segue o link de pagamento: (cole o link aqui)";
  const link = process.env.SITE_URL ? `\nAcompanhe: ${process.env.SITE_URL}/pedido/${p.codigo}?t=${p.token}` : "";

  if (p.modo === "retirada") {
    return [
      `Oi, ${n}! Aqui é a Santto Vício. Recebemos sua encomenda ${p.codigo} para ${quando} (retirada).\nPara confirmar, falta o sinal de ${BRL(sinal(p))}.\n${pagar}${link}`,
      `Sinal recebido, ${n}! Sua encomenda ${p.codigo} está confirmada. Perto da data, te passamos por aqui o local e as orientações da retirada.`,
      `${n}, sua encomenda entrou em produção.`,
      `${n}, sua encomenda está pronta! Responda esta mensagem para combinarmos o local e o horário exatos da retirada. Restante a pagar na retirada: ${BRL(restante(p))}.`,
      `Obrigado por escolher a Santto Vício, ${n}. Feliz Natal!`,
    ][p.etapa];
  }
  return [
    `Oi, ${n}! Aqui é a Santto Vício. Recebemos sua encomenda ${p.codigo} para ${quando}.\nPara confirmar, falta o sinal de ${BRL(sinal(p))}.\n${pagar}${link}`,
    `Sinal recebido, ${n}! Sua encomenda ${p.codigo} está confirmada para ${quando}.`,
    `${n}, sua encomenda entrou em produção. O cheirinho já chegou aqui na cozinha.`,
    `${n}, sua encomenda está pronta! Como combinado, o pagamento da entrega é feito agora, antes de o motorista sair:\nRestante dos produtos: ${BRL(p.subtotal - sinal(p))}\nEntrega: ${BRL(p.taxa)}\nTotal: ${BRL(restante(p))}\n${pagar}\nAssim que cair, despachamos.`,
    `Pagamento recebido, ${n}! Sua encomenda saiu para entrega.`,
    `Entregue! Obrigado por escolher a Santto Vício, ${n}. Feliz Natal!`,
  ][p.etapa];
}

// Link que abre o WhatsApp da loja com a mensagem pronta para o número do cliente.
export function linkWhatsApp(p: Pedido, texto: string) {
  let num = p.whatsapp.replace(/\D/g, "");
  if (num.length <= 11) num = "55" + num;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
