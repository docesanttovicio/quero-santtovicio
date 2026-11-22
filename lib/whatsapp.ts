import "server-only";
import { mensagem, mensagemPix, numeroWhatsApp, type Mensagem } from "./mensagens";
import type { Pedido } from "./regras";

// Envio automático pelo WhatsApp oficial. Funciona de dois jeitos:
//  - "ycloud" (padrão): o MESMO número do app WhatsApp Business também envia pela API (coexistência).
//    Precisa de WHATSAPP_TOKEN (chave de API da YCloud) e WHATSAPP_LOJA (número da loja).
//  - "meta": direto na Meta, com um número só da API. Precisa de WHATSAPP_TOKEN e WHATSAPP_PHONE_ID.
// Sem isso, o painel continua oferecendo o botão "Enviar no WhatsApp" (envio manual).

export type ResultadoEnvio = { envio: "enviado" | "manual" | "erro"; erro?: string };
type Corpo = { type: "template"; template: unknown } | { type: "text"; text: { body: string } };

const VERSAO = process.env.WHATSAPP_API_VERSION || "v21.0";
export const YCLOUD = "https://api.ycloud.com/v2";

export const provedor = (): "ycloud" | "meta" =>
  (process.env.WHATSAPP_PROVEDOR || (process.env.WHATSAPP_PHONE_ID ? "meta" : "ycloud")).toLowerCase() === "meta" ? "meta" : "ycloud";
export const numeroLoja = () => { const n = (process.env.WHATSAPP_LOJA ?? "").replace(/\D/g, ""); return n ? numeroWhatsApp(n) : ""; };
export const whatsappLigado = () =>
  Boolean(process.env.WHATSAPP_TOKEN && (provedor() === "meta" ? process.env.WHATSAPP_PHONE_ID : numeroLoja()));

// Erros que significam "fora da janela de 24h" (texto livre só vale se o cliente falou com a loja há pouco).
const FORA_DA_JANELA = [131047, 131026];

async function postar(para: string, corpo: Corpo): Promise<{ ok: boolean; codigo?: number; erro?: string }> {
  const ycloud = provedor() === "ycloud";
  const url = ycloud ? `${YCLOUD}/whatsapp/messages/sendDirectly` : `https://graph.facebook.com/${VERSAO}/${process.env.WHATSAPP_PHONE_ID}/messages`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (ycloud) headers["x-api-key"] = process.env.WHATSAPP_TOKEN!;
  else headers.authorization = `Bearer ${process.env.WHATSAPP_TOKEN}`;
  const body = ycloud
    ? { from: "+" + numeroLoja(), to: "+" + numeroWhatsApp(para), ...corpo }
    : { messaging_product: "whatsapp", to: numeroWhatsApp(para), ...corpo };

  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  // YCloud pode responder 200 com a mensagem marcada como "failed".
  const falhou = !r.ok || j?.status === "failed";
  if (!falhou) return { ok: true };
  if (r.status === 401) return { ok: false, erro: "Chave do WhatsApp automático inválida. Confira o WHATSAPP_TOKEN na Vercel." };
  const wa = j?.whatsappApiError ?? j?.error?.whatsappApiError ?? j?.error;
  const codigo = Number(wa?.code) || undefined;
  const erro = wa?.error_data?.details || wa?.message || j?.errorMessage || j?.error?.message || `HTTP ${r.status}`;
  return { ok: false, codigo, erro: String(erro).slice(0, 200) };
}

export async function enviarWhatsApp(para: string, m: Mensagem): Promise<ResultadoEnvio> {
  if (!whatsappLigado()) return { envio: "manual" };
  try {
    const r = await postar(para, {
      type: "template",
      template: {
        name: m.modelo,
        language: { code: process.env.WHATSAPP_IDIOMA || "pt_BR" },
        components: [{ type: "body", parameters: m.params.map((text) => ({ type: "text", text })) }],
      },
    });
    if (r.ok) return { envio: "enviado" };
    console.error("[whatsapp] falha ao enviar", m.modelo, r.erro);
    return { envio: "erro", erro: r.erro };
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

// Mensagem livre digitada no painel. A Meta só entrega texto livre se o cliente tiver mandado mensagem
// para a loja nas últimas 24 horas; fora disso, a API devolve erro e o painel oferece abrir no WhatsApp.
export async function enviarTexto(para: string, texto: string): Promise<ResultadoEnvio> {
  if (!whatsappLigado()) return { envio: "manual" };
  try {
    const r = await postar(para, { type: "text", text: { body: texto } });
    if (r.ok) return { envio: "enviado" };
    const erro = r.codigo && FORA_DA_JANELA.includes(r.codigo)
      ? "O cliente não fala com a loja há mais de 24h. Use “Abrir no WhatsApp”."
      : r.erro;
    return { envio: "erro", erro };
  } catch {
    return { envio: "erro", erro: "Sem conexão com o WhatsApp." };
  }
}
