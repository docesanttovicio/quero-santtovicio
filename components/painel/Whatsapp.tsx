"use client";

import { useEffect, useState } from "react";

type Modelo = { nome: string; status: string; motivo?: string };
type Situacao = { ligado: boolean; provedor: "ycloud" | "meta"; numero: string | null; modelos: Modelo[] | null; erro: string | null };

const STATUS: Record<string, [string, string]> = {
  APPROVED: ["Aprovado", "ok"],
  PENDING: ["Em análise", "blue"],
  IN_APPEAL: ["Em recurso", "blue"],
  REJECTED: ["Recusado", "red"],
  PAUSED: ["Pausado", "red"],
  DISABLED: ["Desativado", "red"],
  FALTA: ["Não criado", "gray"],
};
const PARA_QUE: Record<string, string> = {
  sv_pedido_recebido: "Pedido recebido + valor do sinal",
  sv_sinal_recebido: "Sinal pago (entrega)",
  sv_retirada_confirmada: "Sinal pago (retirada)",
  sv_em_producao: "Entrou em produção",
  sv_pronta_pagamento: "Pronta: cobrar restante + entrega",
  sv_pronta_retirada: "Pronta para retirada",
  sv_saiu_entrega: "Saiu para entrega",
  sv_chave_pix: "Chave Pix (mensagem separada)",
  sv_cancelado: "Pedido cancelado",
  sv_concluido: "Agradecimento final",
};
const fmt = (n: string) => n.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

// Conexão do WhatsApp automático e os modelos de mensagem que a Meta precisa aprovar.
export default function Whatsapp({ avisar }: { avisar: (m: string) => void }) {
  const [s, setS] = useState<Situacao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [teste, setTeste] = useState("");

  const carregar = () => fetch("/api/painel/whatsapp", { cache: "no-store" }).then((r) => r.json()).then(setS).catch(() => avisar("Não deu para ler o WhatsApp."));
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(body: Record<string, unknown>) {
    setOcupado(true);
    try {
      const r = await fetch("/api/painel/whatsapp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      return { ok: r.ok, j: await r.json() };
    } finally { setOcupado(false); }
  }
  async function criar() {
    const { ok, j } = await post({ acao: "criar" });
    if (!ok) return avisar(j.erro || "Não deu para criar os modelos.");
    setS(j);
    avisar(j.erros?.length ? `${j.criados} criado(s). ${j.erros.length} com erro: veja abaixo.` : `${j.criados} modelo(s) enviados para a Meta aprovar ✓`);
    if (j.erros?.length) console.warn(j.erros);
  }
  async function testar() {
    const { j } = await post({ acao: "teste", numero: teste });
    avisar(j.envio === "enviado" ? "Mensagem de teste enviada ✓" : j.erro || "Não foi enviada.");
  }

  if (!s) return <div className="empty">Carregando…</div>;
  const faltam = s.modelos?.filter((m) => m.status === "FALTA").length ?? 0;
  const aprovados = s.modelos?.filter((m) => m.status === "APPROVED").length ?? 0;

  return (
    <>
      <div className="dash-head"><div><h1>WhatsApp</h1><p>As mensagens de cada etapa saem sozinhas do número da loja. Você continua conversando com os clientes no app WhatsApp Business, no mesmo número.</p></div></div>
      <div className="cards2">
        <div className="box">
          <h3>Conexão</h3>
          <p className="zap-linha"><span className={"pill " + (s.ligado ? "ok" : "gray")}>{s.ligado ? "Ligado" : "Desligado"}</span>
            <span>{s.numero ? `Número da loja: ${fmt(s.numero)}` : "Número da loja ainda não cadastrado"}</span></p>
          {!s.ligado && <p className="muted small">Enquanto estiver desligado, use o botão “Enviar no WhatsApp” em cada pedido. O passo a passo para ligar está no arquivo WHATSAPP.md.</p>}
          {s.erro && <p className="aviso-comp">{s.erro}</p>}
          {s.ligado && (
            <div className="zap-teste">
              <label className="field2">Mandar mensagem de teste para<input inputMode="tel" placeholder="(21) 9xxxx-xxxx" value={teste} onChange={(e) => setTeste(e.target.value)} /></label>
              <button className="btn sm" disabled={ocupado || teste.replace(/\D/g, "").length < 10 || aprovados === 0} onClick={testar}>Enviar teste</button>
            </div>
          )}
          {s.ligado && aprovados === 0 && s.modelos && <p className="muted small">O teste usa o modelo “Agradecimento final”, então só funciona depois que a Meta aprovar.</p>}
        </div>

        {s.modelos && (
          <div className="box">
            <h3>Modelos de mensagem <small className="muted">{aprovados} de {s.modelos.length} aprovados</small></h3>
            <ul className="zap-modelos">
              {s.modelos.map((m) => { const [t, cor] = STATUS[m.status] ?? [m.status, "gray"]; return (
                <li key={m.nome}><div><b>{PARA_QUE[m.nome] ?? m.nome}</b><small className="muted">{m.nome}{m.motivo ? ` · ${m.motivo}` : ""}</small></div><span className={"pill " + cor}>{t}</span></li>
              ); })}
            </ul>
            <div className="row-acts" style={{ marginTop: 12 }}>
              {faltam > 0 && <button className="btn sm" disabled={ocupado} onClick={criar}>{ocupado ? "Enviando…" : `Criar ${faltam} modelo${faltam > 1 ? "s" : ""} que falta${faltam > 1 ? "m" : ""}`}</button>}
              <button className="btn outline sm" disabled={ocupado} onClick={carregar}>Atualizar</button>
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>A Meta costuma aprovar em minutos, às vezes em algumas horas. Pedidos feitos antes disso usam o envio manual.</p>
          </div>
        )}
      </div>
    </>
  );
}
