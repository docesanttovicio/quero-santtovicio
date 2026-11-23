"use client";

import { useCallback, useEffect, useState } from "react";

type Periodo = "hoje" | "7d" | "30d" | "tudo";
type Item = { nome: string; n: number };
type Dados = {
  periodo: Periodo; porHora: boolean; agora: number; visitantes: number; pedidos: number;
  funil: { t: string; n: number }[];
  serie: { k: string; visitantes: number; pedidos: number }[];
  origens: Item[]; dispositivos: Item[];
  produtos: { id: string; nome: string; abriram: number; sacola: number }[];
};

const PERIODOS: [Periodo, string][] = [["hoje", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["tudo", "Desde o início"]];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const rotulo = (k: string, porHora: boolean, curto = false) => {
  if (porHora) return `${k}h`;
  const [, m, d] = k.split("-"), dt = new Date(`${k}T12:00:00-03:00`);
  return curto ? `${d}/${m}` : `${SEMANA[dt.getUTCDay()]}, ${d}/${m}`;
};

// Aba "Acessos": quantas pessoas entraram na loja, até onde foram e de onde vieram.
export default function Acessos() {
  const [p, setP] = useState<Periodo>("7d");
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    fetch(`/api/painel/acessos?p=${p}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.erro); setD(j); setErro(""); })
      .catch((e) => setErro((e as Error).message || "Não deu para ler os acessos."));
  }, [p]);
  useEffect(() => { carregar(); const i = setInterval(carregar, 60_000); return () => clearInterval(i); }, [carregar]);

  return (
    <>
      <div className="dash-head">
        <div><h1>Acessos</h1><p>Quantas pessoas entraram na loja e até onde chegaram. Atualiza sozinho a cada minuto.</p></div>
        <div className="seg2">{PERIODOS.map(([k, n]) => <button key={k} className={p === k ? "on" : ""} onClick={() => { setP(k); setD(null); }}>{n}</button>)}</div>
      </div>
      {erro && <p className="aviso-comp">{erro}</p>}
      {!d ? <div className="empty">Carregando…</div> : (
        <>
          <div className="kpis ac-kpis">
            <div className="kpi"><span>Agora na loja</span><b>{d.agora}</b><small>nos últimos 5 minutos</small></div>
            <div className="kpi"><span>Visitantes</span><b>{d.visitantes}</b><small>pessoas diferentes</small></div>
            <div className="kpi"><span>Encomendas</span><b>{d.pedidos}</b><small>enviadas no período</small></div>
            <div className="kpi"><span>Conversão</span><b>{pct(d.pedidos, d.visitantes)}</b><small>visitantes que encomendaram</small></div>
          </div>

          <div className="box ac-serie">
            <h3>Visitantes {d.porHora ? "por hora" : "por dia"}</h3>
            <Colunas serie={d.serie} porHora={d.porHora} />
          </div>

          <div className="cards2" style={{ marginTop: 14 }}>
            <div className="box">
              <h3>Até onde foram</h3>
              <Barras itens={d.funil.map((f) => ({ nome: f.t, n: f.n }))} base={d.funil[0].n} />
            </div>
            <div className="box">
              <h3>De onde vieram</h3>
              {d.origens.length ? <Barras itens={d.origens} base={d.visitantes} /> : <p className="muted small">Ainda sem visitas no período.</p>}
              <p className="muted small" style={{ marginTop: 10 }}>Para saber o que veio do Instagram, use o link com <b>?utm_source=instagram</b> na bio e nos stories.</p>
            </div>
            <div className="box">
              <h3>Aparelhos</h3>
              {d.dispositivos.length ? <Barras itens={d.dispositivos} base={d.visitantes} /> : <p className="muted small">Ainda sem visitas no período.</p>}
            </div>
          </div>

          <div className="box" style={{ marginTop: 14 }}>
            <h3>Produtos mais vistos</h3>
            {d.produtos.length ? (
              <div className="tbl-wrap" style={{ border: 0 }}>
                <table className="tbl ac-tbl">
                  <thead><tr><th>Produto</th><th className="num">Abriram</th><th className="num">Puseram na sacola</th><th className="num">De quem abriu</th></tr></thead>
                  <tbody>{d.produtos.map((x) => (
                    <tr key={x.id}><td>{x.nome}</td><td className="num">{x.abriram}</td><td className="num">{x.sacola}</td><td className="num">{pct(Math.min(x.sacola, x.abriram), x.abriram)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="muted small">Ninguém abriu um produto no período.</p>}
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>Os aparelhos que já entraram neste painel não são contados, para os seus testes não inflarem os números. Ninguém é identificado: cada aparelho vira um código aleatório.</p>
        </>
      )}
    </>
  );
}

// Colunas de visitantes (uma série só). Passe o mouse ou toque para ver o número e as encomendas.
function Colunas({ serie, porHora }: { serie: Dados["serie"]; porHora: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...serie.map((s) => s.visitantes));
  const passo = Math.max(1, Math.ceil(serie.length / (porHora ? 12 : 10)));
  const x = sel !== null ? serie[sel] : null;
  return (
    <div className="ac-chart" onMouseLeave={() => setSel(null)}>
      <div className="ac-topo"><span className="muted small">{x ? <><b>{rotulo(x.k, porHora)}</b> · {x.visitantes} visitante{x.visitantes === 1 ? "" : "s"} · {x.pedidos} encomenda{x.pedidos === 1 ? "" : "s"}</> : `Máximo: ${max} visitante${max === 1 ? "" : "s"}`}</span></div>
      <div className="ac-cols" role="img" aria-label={`Visitantes ${porHora ? "por hora" : "por dia"}`}>
        {serie.map((s, i) => (
          <div key={s.k} role="button" tabIndex={0} className={"ac-col" + (sel === i ? " on" : "")} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onClick={() => setSel(i)}
            aria-label={`${rotulo(s.k, porHora)}: ${s.visitantes} visitantes, ${s.pedidos} encomendas`}>
            <span className="ac-bar" style={{ height: Math.round((s.visitantes / max) * 170) }} />
            {s.pedidos > 0 && <span className="ped" title={`${s.pedidos} encomenda(s)`} />}
          </div>
        ))}
      </div>
      <div className="ac-eixo">{serie.map((s, i) => <span key={s.k}>{i % passo === 0 ? rotulo(s.k, porHora, true) : ""}</span>)}</div>
      <p className="muted small" style={{ marginTop: 6 }}><span className="ac-ponto" /> dia/hora com encomenda</p>
    </div>
  );
}

function Barras({ itens, base }: { itens: Item[]; base: number }) {
  const max = Math.max(1, ...itens.map((i) => i.n));
  return (
    <ul className="ac-barras">
      {itens.map((i) => (
        <li key={i.nome}>
          <div className="ac-lin"><span>{i.nome}</span><b>{i.n}<small className="muted"> {pct(i.n, base)}</small></b></div>
          <div className="ac-trilho"><span style={{ width: `${(i.n / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
