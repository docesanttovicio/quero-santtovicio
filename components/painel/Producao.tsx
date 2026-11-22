"use client";

import { useMemo, useState } from "react";
import { DIAS, FAIXAS, nomeDia, nomeFaixa, type Pedido } from "@/lib/regras";

// Quanto produzir de cada item, por dia e por faixa de horário. Por padrão conta só pedidos com sinal pago.
export default function Producao({ pedidos }: { pedidos: Pedido[] }) {
  const [dia, setDia] = useState(DIAS[0].id);
  const [semSinal, setSemSinal] = useState(false);

  const doDia = useMemo(() => pedidos.filter((p) => (dia === "todos" || p.dia === dia) && (semSinal ? true : p.etapa >= 1)), [pedidos, dia, semSinal]);
  const linhas = useMemo(() => {
    const m = new Map<string, { nome: string; variante: string; total: number; faixa: Record<string, number> }>();
    for (const p of doDia) for (const i of p.itens) {
      const k = i.produtoId + "|" + i.variante;
      const l = m.get(k) ?? { nome: i.nome, variante: i.variante, total: 0, faixa: {} };
      l.total += i.qtd; l.faixa[p.faixa] = (l.faixa[p.faixa] ?? 0) + i.qtd; m.set(k, l);
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome) || a.variante.localeCompare(b.variante));
  }, [doDia]);
  const obs = doDia.flatMap((p) => p.itens.filter((i) => i.obs).map((i) => ({ p, i })));
  const pendentes = pedidos.filter((p) => (dia === "todos" || p.dia === dia) && p.etapa === 0).length;

  return (
    <>
      <div className="dash-head">
        <div><h1>Produção</h1><p>{dia === "todos" ? "Os dois dias" : nomeDia(dia)} · {doDia.length} pedido{doDia.length === 1 ? "" : "s"}{!semSinal && pendentes ? ` · ${pendentes} ainda sem sinal (fora da conta)` : ""}</p></div>
        <div className="row-acts no-print">
          <div className="seg2">{[...DIAS.map((d) => [d.id, d.nome]), ["todos", "Os dois dias"]].map(([v, n]) => <button key={v} className={dia === v ? "on" : ""} onClick={() => setDia(v)}>{n}</button>)}</div>
          <label className="switch"><input type="checkbox" checked={semSinal} onChange={(e) => setSemSinal(e.target.checked)} />Contar pedidos sem sinal</label>
          <button className="btn line sm" onClick={() => print()}>Imprimir</button>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Produto</th><th>Tamanho</th>{FAIXAS.map((f) => <th key={f.id} className="num">{f.nome}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.nome + l.variante} style={{ cursor: "default" }}>
                <td><b style={{ fontWeight: 600 }}>{l.nome}</b></td><td>{l.variante}</td>
                {FAIXAS.map((f) => <td key={f.id} className="num">{l.faixa[f.id] ?? "—"}</td>)}
                <td className="num"><b className="price" style={{ fontSize: 18 }}>{l.total}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!linhas.length && <div className="empty">Nada para produzir {dia === "todos" ? "" : "neste dia "}ainda.</div>}
      </div>
      {obs.length > 0 && (
        <div className="box" style={{ marginTop: 16 }}>
          <h3>Observações dos clientes</h3>
          <div className="totals">{obs.map(({ p, i }, k) => <div key={k}><span><b style={{ fontWeight: 600 }}>{p.codigo}</b> · {p.nome} · {i.qtd}× {i.nome} ({i.variante})<br /><span style={{ color: "#8a5a00" }}>✎ {i.obs}</span></span><span className="small muted">{nomeDia(p.dia).split(", ")[1]} · {nomeFaixa(p.faixa)}</span></div>)}</div>
        </div>
      )}
    </>
  );
}
