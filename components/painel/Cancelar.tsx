"use client";

import { useState } from "react";
import type { Pedido } from "@/lib/regras";
import type { Acao } from "./Dashboard";

const MOTIVOS = ["Quantidade fora do que conseguimos produzir", "Cliente desistiu", "Sinal não foi pago no prazo", "Endereço fora da área de entrega"];

// Cancelar (com confirmação e motivo) ou reativar um pedido. Avisa o cliente no WhatsApp.
export default function Cancelar({ p, acao, avisar }: { p: Pedido; acao: Acao; avisar: (m: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function rodar(body: Record<string, unknown>) { setOcupado(true); try { return await acao(p, body); } finally { setOcupado(false); } }

  if (p.cancelado) {
    return (
      <div className="cancelado-box">
        <b>Pedido cancelado</b>
        <span>em {new Date(p.cancelado.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · Motivo: {p.cancelado.motivo}</span>
        <button className="link small" disabled={ocupado} onClick={async () => { if (await rodar({ acao: "reativar" })) avisar("Pedido reativado"); }}>Reativar pedido</button>
      </div>
    );
  }
  if (!aberto) return <button className="link small cancelar-link" onClick={() => setAberto(true)}>Cancelar pedido</button>;
  return (
    <div className="cancelar-box">
      <b>Cancelar o pedido {p.codigo}?</b>
      <span>O cliente recebe o aviso com o motivo. Se ele já pagou, combine a devolução pelo WhatsApp.</span>
      <div className="chips">{MOTIVOS.map((m) => <button key={m} type="button" className={motivo === m ? "on" : ""} onClick={() => setMotivo(m)}>{m}</button>)}</div>
      <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={140} placeholder="Motivo (o cliente vai ver)" aria-label="Motivo do cancelamento" />
      <div className="row-acts">
        <button className="btn sm perigo" disabled={ocupado || !motivo.trim()} onClick={async () => {
          const j = await rodar({ acao: "cancelar", motivo }); if (!j) return;
          setAberto(false); setMotivo("");
          if (j.envio === "enviado") avisar("Pedido cancelado e cliente avisado no WhatsApp");
          else { window.open(j.whatsapp, "_blank"); avisar("Pedido cancelado. Envie o aviso no WhatsApp que abriu."); }
        }}>Confirmar cancelamento</button>
        <button className="btn outline sm" onClick={() => setAberto(false)}>Voltar</button>
      </div>
    </div>
  );
}
