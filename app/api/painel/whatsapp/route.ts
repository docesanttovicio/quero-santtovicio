import { NextResponse } from "next/server";
import { logado } from "@/lib/painel-auth";
import { EXEMPLOS, MODELOS, type NomeModelo } from "@/lib/mensagens";
import { YCLOUD, enviarWhatsApp, numeroLoja, provedor, whatsappLigado } from "@/lib/whatsapp";

// Situação do WhatsApp automático: conexão e os 10 modelos de mensagem.
// Com a YCloud, o painel também cria sozinho os modelos que faltam (não precisa digitar no WhatsApp Manager).

const NOMES = Object.keys(MODELOS) as NomeModelo[];
const IDIOMA = process.env.WHATSAPP_IDIOMA || "pt_BR";
type Modelo = { nome: NomeModelo; status: string; motivo?: string };

async function yc(caminho: string, init?: RequestInit) {
  const r = await fetch(`${YCLOUD}${caminho}`, {
    ...init, cache: "no-store",
    headers: { "x-api-key": process.env.WHATSAPP_TOKEN!, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error("A chave de API da YCloud (WHATSAPP_TOKEN) está errada ou foi apagada.");
  if (!r.ok) throw new Error(j?.error?.whatsappApiError?.message || j?.error?.message || `YCloud respondeu ${r.status}`);
  return j;
}

// A conta do WhatsApp (WABA) do número da loja. Dá para fixar com WHATSAPP_WABA_ID.
async function wabaId(): Promise<string> {
  if (process.env.WHATSAPP_WABA_ID) return process.env.WHATSAPP_WABA_ID;
  const j = await yc("/whatsapp/phoneNumbers?limit=100");
  const loja = numeroLoja();
  const n = (j.items ?? []).find((x: { phoneNumber?: string; displayPhoneNumber?: string }) =>
    (x.phoneNumber ?? x.displayPhoneNumber ?? "").replace(/\D/g, "") === loja);
  if (!n?.wabaId) throw new Error("O número da loja ainda não aparece na YCloud. Termine a conexão do WhatsApp lá.");
  return n.wabaId;
}

async function situacao() {
  const base = { ligado: whatsappLigado(), provedor: provedor(), numero: numeroLoja() || null };
  if (!base.ligado) return { ...base, modelos: null, erro: null };
  if (provedor() !== "ycloud") return { ...base, modelos: null, erro: "Com a Meta direta, os modelos são criados à mão no WhatsApp Manager." };
  try {
    const waba = await wabaId();
    const j = await yc(`/whatsapp/templates?filter.wabaId=${encodeURIComponent(waba)}&limit=100`);
    const lista = (j.items ?? []) as { name: string; language: string; status: string; reason?: string }[];
    const modelos: Modelo[] = NOMES.map((nome) => {
      const t = lista.find((x) => x.name === nome && x.language === IDIOMA);
      return t ? { nome, status: t.status, motivo: t.reason || undefined } : { nome, status: "FALTA" };
    });
    return { ...base, modelos, erro: null };
  } catch (e) {
    return { ...base, modelos: null, erro: (e as Error).message };
  }
}

export async function GET() {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  return NextResponse.json(await situacao(), { headers: { "cache-control": "no-store" } });
}

// acao "criar": cria os modelos que faltam. acao "teste": manda uma mensagem de teste para um número.
export async function POST(req: Request) {
  if (!(await logado())) return NextResponse.json({ erro: "Entre com a senha do painel." }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  if (b.acao === "teste") {
    const para = String(b.numero ?? "").replace(/\D/g, "");
    if (para.length < 10) return NextResponse.json({ erro: "Digite um WhatsApp com DDD." }, { status: 400 });
    const params = ["Teste", "SV-0000"];
    const r = await enviarWhatsApp(para, { modelo: "sv_concluido", params, texto: "" });
    return NextResponse.json(r);
  }

  if (b.acao === "criar") {
    if (!whatsappLigado() || provedor() !== "ycloud") return NextResponse.json({ erro: "Ligue o WhatsApp pela YCloud primeiro." }, { status: 400 });
    const s = await situacao();
    if (!s.modelos) return NextResponse.json({ erro: s.erro || "Não deu para ler os modelos." }, { status: 502 });
    const waba = await wabaId();
    const erros: string[] = [];
    let criados = 0;
    for (const m of s.modelos.filter((x) => x.status === "FALTA")) {
      try {
        await yc("/whatsapp/templates", {
          method: "POST",
          body: JSON.stringify({
            wabaId: waba, name: m.nome, language: IDIOMA, category: "UTILITY",
            components: [{ type: "BODY", text: MODELOS[m.nome], example: { body_text: [EXEMPLOS[m.nome]] } }],
          }),
        });
        criados++;
      } catch (e) { erros.push(`${m.nome}: ${(e as Error).message}`); }
    }
    return NextResponse.json({ criados, erros, ...(await situacao()) });
  }

  return NextResponse.json({ erro: "Ação desconhecida." }, { status: 400 });
}
