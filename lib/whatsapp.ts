import "server-only";
import { mensagem, mensagemPix, numeroWhatsApp, type Mensagem } from "./mensagens";
import type { Pedido } from "./regras";

// Envio pela API oficial do WhatsApp (Meta Cloud API).
// Precisa de WHATSAPP_TOKEN (token permanente de usuário do sistema) e WHATSAPP_PHONE_ID (ID do número).
// Sem eles, o painel continua oferecendo o botão "Enviar no WhatsApp" (envio manual).

export type ResultadoEnvio = { envio: "enviado" | "manual" | "erro"; erro?: string };

const VERSAO = process.env.WHATSAPP_API_VERSION || "v21.0";

export const whatsappLigado = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

export async function enviarWhatsApp(para: string, m: Mensagem): Promise<ResultadoEnvio> {
  if (!whatsappLigado()) return { envio: "manual" };
  try {
    const r = await fetch(`https://graph.facebook.com/${VERSAO}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numeroWhatsApp(para),
        type: "template",
        template: {
          name: m.modelo,
          language: { code: process.env.WHATSAPP_IDIOMA || "pt_BR" },
          components: [{ type: "body", parameters: m.params.map((text) => ({ type: "text", text })) }],
        },
      }),
      cache: "no-store",
    });
    if (r.ok) return { envio: "enviado" };
    const j = await r.json().catch(() => ({}));
    const erro = j?.error?.error_data?.details || j?.error?.message || `HTTP ${r.status}`;
    console.error("[whatsapp] falha ao enviar", m.modelo, erro);
    return { envio: "erro", erro: String(erro).slice(0, 200) };
  } catch (e) {
    console.error("[whatsapp] erro de rede", e);
    return { envio: "erro", erro: "Sem conexão com o WhatsApp." };
  }
}

// Manda a mensagem da etapa atual e, quando é hora de pagar por Pix, uma segunda só com a chave.
// Registra tudo no histórico do pedido (é o que o cliente vê na página de acompanhamento).
export async function notificarEtapa(p: Pedido, em = new Date().toISOString()) {
  const m = mensagem(p);
  p.historico.push({ etapa: p.etapa, em, mensagem: m.texto, ...(await enviarWhatsApp(p.whatsapp, m)) });
  const pix = mensagemPix(p);
  if (pix) p.historico.push({ etapa: p.etapa, em, mensagem: pix.texto, pix: true, ...(await enviarWhatsApp(p.whatsapp, pix)) });
}
