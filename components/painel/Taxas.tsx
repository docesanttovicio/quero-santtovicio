"use client";

import { useEffect, useMemo, useState } from "react";
import { BRL, DIAS } from "@/lib/regras";

type T = { base: number; porKm: number; minimo: number; ajusteDia: Record<string, number> };
type Mud = { codigo: string; nome: string; antes: number; depois: number };
const calc = (km: number, t: T, dia: string) => Math.ceil(Math.max(t.minimo, t.base + t.porKm * km) * (1 + (t.ajusteDia[dia] ?? 0) / 100) * 2) / 2;

// Regras da taxa de entrega e correção geral por dia de entrega.
export default function Taxas({ avisar, recarregar }: { avisar: (m: string) => void; recarregar: () => void }) {
  const [t, setT] = useState<T | null>(null);
  const [orig, setOrig] = useState("");
  const [bairros, setBairros] = useState<Record<string, number>>({});
  const [prev, setPrev] = useState<Record<string, Mud[]>>({});
  const [salvando, setSalvando] = useState(false);

  const carregarPrev = () => Promise.all(DIAS.map((d) => fetch(`/api/painel/taxas?dia=${d.id}`, { cache: "no-store" }).then((r) => r.json()).then((j) => [d.id, j.mudancas] as const)))
    .then((l) => setPrev(Object.fromEntries(l)));
  useEffect(() => {
    fetch("/api/painel/config", { cache: "no-store" }).then((r) => r.json()).then((j) => { setT(j.config.taxa); setOrig(JSON.stringify(j.config.taxa)); setBairros(j.bairros); });
    carregarPrev();
  }, []);
  const exemplos = useMemo(() => Object.entries(bairros).sort((a, b) => a[1] - b[1]), [bairros]);
  if (!t) return <div className="empty">Carregando…</div>;
  const mudou = JSON.stringify(t) !== orig;
  const set = (k: keyof T, v: number) => setT({ ...t, [k]: v });

  async function salvar() {
    setSalvando(true);
    const r = await fetch("/api/painel/config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ taxa: t }) });
    const j = await r.json(); setSalvando(false);
    if (!r.ok) return avisar(j.erro || "Não deu para salvar.");
    setT(j.config.taxa); setOrig(JSON.stringify(j.config.taxa)); avisar("Taxas salvas. Novos pedidos já usam os valores novos ✓"); carregarPrev();
  }
  async function aplicar(dia: string) {
    const r = await fetch("/api/painel/taxas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dia }) });
    const j = await r.json();
    avisar(`${j.atualizados} pedido${j.atualizados === 1 ? "" : "s"} atualizado${j.atualizados === 1 ? "" : "s"} ✓`); carregarPrev(); recarregar();
  }

  return (
    <>
      <div className="dash-head"><div><h1>Taxas de entrega</h1><p>Taxa = base + valor por km, com mínimo. Depois aplica o ajuste do dia (ex.: +20% se o Uber estiver mais caro no dia 24).</p></div></div>
      <div className="cards2">
        <div className="box">
          <h3>Fórmula</h3>
          <div className="grid3">
            <label className="field2">Base (R$)<input type="number" step="0.5" min="0" value={t.base} onChange={(e) => set("base", Number(e.target.value))} /></label>
            <label className="field2">Por km (R$)<input type="number" step="0.05" min="0" value={t.porKm} onChange={(e) => set("porKm", Number(e.target.value))} /></label>
            <label className="field2">Mínimo (R$)<input type="number" step="0.5" min="0" value={t.minimo} onChange={(e) => set("minimo", Number(e.target.value))} /></label>
          </div>
          <h3 style={{ marginTop: 16 }}>Ajuste por dia</h3>
          <div className="grid3">
            {DIAS.map((d) => <label key={d.id} className="field2">{d.nome} (%)<input type="number" step="5" min="-50" max="200" value={t.ajusteDia[d.id] ?? 0} onChange={(e) => setT({ ...t, ajusteDia: { ...t.ajusteDia, [d.id]: Number(e.target.value) } })} /></label>)}
          </div>
          <div className="row-acts" style={{ marginTop: 14 }}>
            <button className="btn sm" disabled={!mudou || salvando} onClick={salvar}>{salvando ? "Salvando…" : mudou ? "Salvar taxas" : "Tudo salvo"}</button>
            {mudou && <button className="btn outline sm" onClick={() => setT(JSON.parse(orig))}>Desfazer</button>}
          </div>
        </div>
        <div className="box">
          <h3>Pedidos já feitos</h3>
          <p className="small muted" style={{ marginTop: 0 }}>Recalcula a taxa dos pedidos de entrega que ainda não foram cobrados (antes de “Pronta”), com as regras salvas.</p>
          {DIAS.map((d) => {
            const l = prev[d.id] ?? [];
            return (
              <div key={d.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 10 }}>
                <div className="row-acts" style={{ justifyContent: "space-between" }}>
                  <b>{d.nome}</b>
                  <button className="btn sm" disabled={!l.length || mudou} onClick={() => aplicar(d.id)}>{l.length ? `Aplicar em ${l.length} pedido${l.length === 1 ? "" : "s"}` : "Nada para mudar"}</button>
                </div>
                {l.length > 0 && <div className="totals small" style={{ marginTop: 8 }}>{l.slice(0, 6).map((m) => <div key={m.codigo}><span>{m.codigo} · {m.nome}</span><span>{BRL(m.antes)} → <b>{BRL(m.depois)}</b></span></div>)}{l.length > 6 && <div><span className="muted">e mais {l.length - 6}…</span></div>}</div>}
              </div>
            );
          })}
          {mudou && <p className="small" style={{ color: "#8a5a00" }}>Salve as taxas antes de aplicar.</p>}
        </div>
      </div>
      <div className="tbl-wrap" style={{ marginTop: 16 }}>
        <table className="tbl">
          <thead><tr><th>Bairro (estimativa)</th><th className="num">Distância</th>{DIAS.map((d) => <th key={d.id} className="num">{d.nome}</th>)}</tr></thead>
          <tbody>{exemplos.map(([b, km]) => <tr key={b} style={{ cursor: "default" }}><td>{b}</td><td className="num">{km} km</td>{DIAS.map((d) => <td key={d.id} className="num">{BRL(calc(km, t, d.id))}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
