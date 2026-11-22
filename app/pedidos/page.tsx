"use client";

import Link from "next/link";
import { useMeusPedidos } from "@/lib/meus-pedidos";

// Lista das encomendas feitas neste aparelho, mais recentes primeiro.
export default function MeusPedidos() {
  const lista = useMeusPedidos();
  const ordem = [...(lista ?? [])].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
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
          {ordem.map((p) => (
            <Link key={p.codigo} className="pcard" href={`/pedido/${p.codigo}?t=${encodeURIComponent(p.token)}`}>
              <b>{p.codigo}</b>
              <span className="seta" aria-hidden="true">›</span>
              <small>{p.quando}</small>
              <small style={{ color: p.finalizado ? "var(--ok)" : "var(--wine)", fontWeight: 600 }}>{p.titulo}</small>
              {p.novidade && <i className="dot-novo" aria-label="Novidade" />}
            </Link>
          ))}
          <p className="small muted" style={{ textAlign: "center" }}>Os pedidos ficam guardados neste celular. Se trocar de aparelho, use o link que enviamos no WhatsApp.</p>
        </div>
      </section>
    </div>
  );
}
