"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BRL, etapasDe, nomeDia, nomeFaixa, restante, sinal, type PedidoPublico } from "@/lib/regras";

export default function Acompanhar({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const sp = useSearchParams();
  const t = sp.get("t") ?? "";
  const [p, setP] = useState<(PedidoPublico & { pix?: string | null; zapLoja?: string | null }) | null>(null);
  const [copiado, setCopiado] = useState(false);
  const campoPix = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const vistos = useRef(0);

  useEffect(() => {
    let vivo = true;
    const buscar = () => fetch(`/api/pedidos/${codigo}?t=${encodeURIComponent(t)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!vivo) return; if (!r.ok) setErro(j.erro || "Pedido não encontrado."); else setP(j); })
      .catch(() => {});
    buscar();
    const i = setInterval(buscar, 20000);
    const vis = () => document.visibilityState === "visible" && buscar();
    document.addEventListener("visibilitychange", vis);
    return () => { vivo = false; clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, [codigo, t]);

  if (erro) return <div className="app"><div className="center"><h2>Não encontramos esse pedido</h2><p className="muted">Confira o link que enviamos no WhatsApp.</p><Link className="btn" href="/">Ver o cardápio</Link></div></div>;
  if (!p) return <div className="app"><div className="center muted">Carregando sua encomenda…</div></div>;

  const S = etapasDe(p), ent = p.modo === "entrega";
  const devido = p.etapa === 0 ? { t: "Pague o sinal para confirmar", v: sinal(p) } : p.etapa === 3 && ent ? { t: "Pague para sua encomenda sair", v: restante(p) } : null;
  const pagoSinal = p.etapa >= 1, pagoResto = p.etapa >= 4;
  const hm = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const novos = vistos.current; vistos.current = p.historico.length;

  return (
    <div className="app">
      <section className="enter-up">
        <div className="track-hero pad">
          <span className="eyebrow" style={{ opacity: 0.8 }}>Sua encomenda</span>
          <h2>{S[p.etapa].t}</h2>
          <div className="code">{p.codigo} · {nomeDia(p.dia)}, {nomeFaixa(p.faixa)}</div>
        </div>
        <div className="scallop" style={{ backgroundColor: "var(--wine)" }} />
        <div className="pad">
          {devido && <div className="block"><div className="paybox">
            <span className="eyebrow muted">Pagamento pendente</span><h3>{devido.t}</h3>
            <div className="price" style={{ fontSize: 30, margin: "4px 0" }}>{BRL(devido.v)}</div>
            <small className="muted">{p.pagamento === "pix" ? "A chave Pix está mais abaixo, com botão de copiar, e também no seu WhatsApp." : "O link de pagamento chega no seu WhatsApp."}</small>
            <div className="comprovante">
              <b>Depois de pagar, mande o comprovante</b>
              <span>É assim que confirmamos o seu pagamento{p.etapa === 3 ? " e liberamos a entrega" : ""}.</span>
              {p.zapLoja
                ? <a className="btn ok wide" href={`https://wa.me/${p.zapLoja}?text=${encodeURIComponent(`Oi! Segue o comprovante do ${p.etapa === 0 ? "sinal" : "restante"} da encomenda ${p.codigo} (${BRL(devido.v)}).`)}`} target="_blank" rel="noreferrer">Enviar comprovante no WhatsApp</a>
                : <span>Responda à nossa mensagem no WhatsApp com a foto ou o PDF do comprovante.</span>}
            </div>
          </div></div>}
          <div className="block"><ol className="steps">
            {S.map((s, i) => <li key={i} className={i < p.etapa ? "done" : i === p.etapa ? "now" : ""}><span className="dot">{i < p.etapa ? "✓" : ""}</span><div><b>{s.t}</b><small>{i <= p.etapa ? s.d : ""}</small></div></li>)}
          </ol></div>
          <div className="block"><h3>No seu WhatsApp</h3><div className="wa">
            <span className="muted">Mensagens da Santto Vício sobre esta encomenda:</span>
            {p.historico.map((h, i) => <div key={i} className={"bub" + (i >= novos ? " new" : "")}>{h.mensagem}<time>{hm(h.em)}</time></div>)}
          </div></div>
          {p.pix && <div className="block"><div className="pixbox">
            <label htmlFor="pix" className="eyebrow muted">Chave Pix da Santto Vício</label>
            <div className="pixrow">
              <input id="pix" ref={campoPix} readOnly value={p.pix} onFocus={(e) => e.target.select()} />
              <button className={"btn" + (copiado ? " ok" : "")} type="button" onClick={async () => {
                try { await navigator.clipboard.writeText(p.pix!); } catch { campoPix.current?.select(); document.execCommand?.("copy"); }
                setCopiado(true); setTimeout(() => setCopiado(false), 2000);
              }}>{copiado ? "Copiado ✓" : "Copiar"}</button>
            </div>
            {devido && <small className="muted">Valor a pagar agora: <b className="price" style={{ color: "var(--ink)" }}>{BRL(devido.v)}</b></small>}
          </div></div>}
          <div className="block"><h3>Pagamentos</h3><div className="totals">
            {p.itens.map((l, i) => <div key={i}><span>{l.qtd}× {l.nome} <span className="muted">({l.variante})</span></span><span className="price">{BRL(l.preco * l.qtd)}</span></div>)}
            {ent && <div><span>Entrega {p.km ? <span className="muted">({p.km} km)</span> : null}</span><span className="price">{p.taxa ? BRL(p.taxa) : <span className="muted">a confirmar</span>}</span></div>}
            <div className="grand sep"><span>Sinal (50%)</span><span className={"pill" + (pagoSinal ? " ok" : "")}>{pagoSinal ? "Pago" : "Pendente"}</span></div>
            <div><span /><span className="price">{BRL(sinal(p))}</span></div>
            <div className="grand"><span>{ent ? "Restante + entrega" : "Restante na retirada"}</span><span className={"pill" + (pagoResto ? " ok" : "")}>{pagoResto ? "Pago" : p.etapa === 3 ? "Pendente" : "Depois"}</span></div>
            <div><span /><span className="price">{BRL(restante(p))}</span></div>
          </div></div>
          <p className="muted small" style={{ textAlign: "center", paddingBlock: 24 }}>Guarde este link para acompanhar sua encomenda. Ele atualiza sozinho.</p>
        </div>
      </section>
    </div>
  );
}
