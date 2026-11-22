"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { marcarVisto, useMeusPedidos, type Resumo } from "@/lib/meus-pedidos";
import { BRL, etapasDe, restante, sinal } from "@/lib/regras";

// Encomendas feitas neste aparelho, em sanfona: abrir uma fecha a outra.
export default function MeusPedidos() {
  const lista = useMeusPedidos();
  const [aberto, setAberto] = useState<string | null>(null);
  const [vistos, setVistos] = useState<Record<string, boolean>>({});
  const ordem = [...(lista ?? [])].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  // Abre sozinho o pedido mais recente que tiver novidade (ou o único).
  useEffect(() => {
    if (!lista || aberto !== null) return;
    const alvo = ordem.find((p) => p.novidade) ?? (ordem.length === 1 ? ordem[0] : null);
    if (alvo) abrir(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  function abrir(r: Resumo) {
    if (aberto === r.codigo) return setAberto(null);
    setAberto(r.codigo);
    marcarVisto(r.codigo, r.p.historico.length);
    setVistos((v) => ({ ...v, [r.codigo]: true }));
  }

  return (
    <div className="app">
      <section className="enter-up">
        <div className="track-hero pad">
          <div className="track-top"><Link href="/" className="chip light">‹ Voltar à loja</Link></div>
          <span className="eyebrow" style={{ opacity: 0.8 }}>Santto Vício</span>
          <h2>Meus pedidos</h2>
        </div>
        <div className="scallop" style={{ backgroundColor: "var(--wine)" }} />
        <div className="pad lista-pedidos">
          {lista === null && <p className="muted center">Carregando…</p>}
          {lista && !ordem.length && (
            <div className="center"><p className="muted">Você ainda não fez nenhuma encomenda neste aparelho.</p><Link className="btn" href="/">Ver o cardápio</Link></div>
          )}
          {ordem.map((r) => <Item key={r.codigo} r={r} aberto={aberto === r.codigo} novidade={r.novidade && !vistos[r.codigo]} onToggle={() => abrir(r)} />)}
          {!!ordem.length && <p className="small muted" style={{ textAlign: "center" }}>Os pedidos ficam guardados neste celular. Se trocar de aparelho, use o link que enviamos no WhatsApp.</p>}
        </div>
      </section>
    </div>
  );
}

function Item({ r, aberto, novidade, onToggle }: { r: Resumo; aberto: boolean; novidade: boolean; onToggle: () => void }) {
  const p = r.p, S = etapasDe(p), ent = p.modo === "entrega";
  const devido = p.cancelado ? null : p.etapa === 0 ? { t: "Falta pagar o sinal", v: sinal(p) } : p.etapa === 3 && ent ? { t: "Falta pagar para sair", v: restante(p) } : null;
  const [copiado, setCopiado] = useState(false);
  return (
    <div className={"acc" + (aberto ? " aberto" : "")}>
      <button className="acc-cab" onClick={onToggle} aria-expanded={aberto} aria-controls={"acc-" + r.codigo}>
        <span className="acc-tit"><b>{r.codigo}</b><small>{r.quando}</small></span>
        <span className="acc-dir">
          <span className={"pill " + (p.cancelado ? "red" : r.finalizado ? "ok" : devido ? "" : "blue")}>{r.titulo}</span>
          <span className="acc-seta" aria-hidden="true">›</span>
        </span>
        {novidade && <i className="dot-novo" aria-label="Novidade" />}
      </button>
      {aberto && (
        <div className="acc-corpo" id={"acc-" + r.codigo}>
          {!p.cancelado && <div className="mini-steps" aria-hidden="true">{S.map((_, i) => <i key={i} className={i < p.etapa ? "done" : i === p.etapa ? "now" : ""} />)}</div>}
          {p.cancelado
            ? <p className="acc-msg canc">Cancelada. Motivo: {p.cancelado.motivo}</p>
            : <p className="acc-msg">{S[p.etapa].d}</p>}
          {devido && (
            <div className="acc-pagar">
              <span>{devido.t}</span><b className="price">{BRL(devido.v)}</b>
              {p.pix && <button className="btn sm" onClick={async () => { try { await navigator.clipboard.writeText(p.pix!); } catch {} setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>{copiado ? "Chave copiada ✓" : "Copiar chave Pix"}</button>}
            </div>
          )}
          <div className="totals small">
            {p.itens.map((i, k) => <div key={k}><span>{i.qtd}× {i.nome} <span className="muted">({i.variante})</span></span><span>{BRL(i.preco * i.qtd)}</span></div>)}
            {ent && <div><span>Entrega</span><span>{p.taxa ? BRL(p.taxa) : "a confirmar"}</span></div>}
          </div>
          <Link className="btn outline wide" style={{ justifyContent: "center" }} href={`/pedido/${r.codigo}?t=${encodeURIComponent(r.token)}`}>Ver acompanhamento completo</Link>
        </div>
      )}
    </div>
  );
}
