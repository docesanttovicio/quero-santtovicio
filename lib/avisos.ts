import "server-only";
import { BRL, nomeDia, nomeFaixa, type Pedido } from "./regras";

// Aviso de pedido novo no Telegram da loja (opcional). Precisa de TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.
export async function avisarLoja(p: Pedido) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const texto = [
    `🔔 Nova encomenda ${p.codigo}`,
    `${p.nome} · ${p.whatsapp}`,
    `${nomeDia(p.dia)}, ${nomeFaixa(p.faixa)} · ${p.modo === "entrega" ? "Entrega" : "Retirada"}`,
    ...p.itens.map((i) => `${i.qtd}× ${i.nome} (${i.variante})${i.obs ? ` — ${i.obs}` : ""}`),
    `Total dos produtos: ${BRL(p.subtotal)}`,
    process.env.SITE_URL ? `${process.env.SITE_URL}/painel` : "",
  ].filter(Boolean).join("\n");
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: texto }),
    });
  } catch {
    /* o painel continua tocando o alarme mesmo se o Telegram falhar */
  }
}
