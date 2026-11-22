"use client";

import { useMemo, useState } from "react";
import { BRL, DIAS, finalizado, nomeDia, nomeFaixa, restante, sinal, type Pedido } from "@/lib/regras";
import Producao from "./Producao";
import Cardapio from "./Cardapio";
import Taxas from "./Taxas";
import Ficha from "./Ficha";

export type Acao = (p: Pedido, body: Record<string, unknown>) => Promise<{ pedido: Pedido; whatsapp: string; whatsappPix: string | null; envio: "enviado" | "manual" | "erro"; erro?: string } | null>;
type Props = {
  pedidos: Pedido[]; carregar: () => void; acao: Acao; avisar: (m: string) => void; toast: string;
  banco: string; whatsapp: boolean; novos: number; som: boolean; setSom: (v: boolean) => void;
};
type Vista = "pedidos" | "producao" | "cardapio" | "taxas";

// Situação do pedido em grupos fáceis de filtrar
export function situacao(p: Pedido): { k: string; t: string; cor: string } {
  if (finalizado(p)) return { k: "concluido", t: p.modo === "retirada" ? "Retirado" : "Entregue", cor: "ok" };
  return [
    { k: "sinal", t: "Aguardando sinal", cor: "" },
    { k: "confirmado", t: "Confirmado", cor: "blue" },
    { k: "producao", t: "Em produção", cor: "blue" },
    { k: "pronta", t: p.modo === "retirada" ? "Pronta p/ retirada" : "Aguardando pagamento", cor: p.modo === "retirada" ? "blue" : "" },
    { k: "saiu", t: "Saiu para entrega", cor: "blue" },
  ][p.etapa];
}
const pago = (p: Pedido) => p.etapa >= 4; // restante + entrega já pagos
export const resumoItens = (p: Pedido) => p.itens.map((i) => `${i.qtd}× ${i.nome}${i.variante ? ` (${i.variante})` : ""}`).join(", ");

export default function Dashboard(props: Props) {
  const { pedidos } = props;
  const [vista, setVista] = useState<Vista>("pedidos");
  const [sel, setSel] = useState<string | null>(null);
  const atual = pedidos.find((p) => p.codigo === sel) ?? null;
  const ativos = pedidos.filter((p) => !finalizado(p)).length;

  const nav: [Vista, string, React.ReactNode?][] = [
    ["pedidos", "Pedidos", props.novos ? <span className="n alert">{props.novos} novo{props.novos > 1 ? "s" : ""}</span> : <span className="n">{ativos}</span>],
    ["producao", "Produção"],
    ["cardapio", "Cardápio"],
    ["taxas", "Taxas de entrega"],
  ];
  return (
    <div className="dash">
      <aside className="dash-side">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="dash-brand"><img src="/img/logo.png" alt="" /><div><small>Painel da loja</small><b>Santto Vício</b></div></div>
        {nav.map(([k, n, extra]) => <button key={k} className={"dash-nav" + (vista === k ? " on" : "")} onClick={() => setVista(k)}><span>{n}</span>{extra}</button>)}
        <div className="foot">
          <button onClick={() => props.setSom(!props.som)}>{props.som ? "🔔 Alarme sonoro ligado" : "🔕 Ligar alarme sonoro"}</button>
          <span>WhatsApp automático: {props.whatsapp ? "ligado" : "desligado (envio manual)"}</span>
          {props.banco === "arquivo" && <span>Modo teste (sem banco)</span>}
          <a href="/" target="_blank" rel="noreferrer">Abrir a loja ↗</a>
          <button onClick={async () => { await fetch("/api/painel", { method: "DELETE" }); location.reload(); }}>Sair do painel</button>
        </div>
      </aside>
      <main className="dash-main">
        {vista === "pedidos" && <Pedidos {...props} sel={sel} setSel={setSel} />}
        {vista === "producao" && <Producao pedidos={pedidos} />}
        {vista === "cardapio" && <Cardapio avisar={props.avisar} />}
        {vista === "taxas" && <Taxas avisar={props.avisar} recarregar={props.carregar} />}
      </main>
      {atual && <Ficha p={atual} acao={props.acao} avisar={props.avisar} whatsapp={props.whatsapp} fechar={() => setSel(null)} />}
      {props.toast && <div className="toast" role="status">{props.toast}</div>}
    </div>
  );
}

/* ---------- Pedidos ---------- */
function Pedidos({ pedidos, sel, setSel, novos }: Props & { sel: string | null; setSel: (c: string) => void }) {
  const [busca, setBusca] = useState("");
  const [st, setSt] = useState("ativos");
  const [dia, setDia] = useState("todos");
  const [modo, setModo] = useState("todos");

  const lista = useMemo(() => {
    const q = busca.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    return pedidos.filter((p) => {
      const s = situacao(p).k;
      if (st === "ativos" ? s === "concluido" : st === "novos" ? !p.novo : st !== "todos" && s !== st) return false;
      if (dia !== "todos" && p.dia !== dia) return false;
      if (modo !== "todos" && p.modo !== modo) return false;
      if (!q) return true;
      const alvo = `${p.codigo} ${p.nome} ${p.whatsapp} ${p.endereco?.bairro ?? ""} ${p.endereco?.rua ?? ""} ${resumoItens(p)}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      return alvo.includes(q);
    });
  }, [pedidos, busca, st, dia, modo]);

  const k = useMemo(() => {
    const ab = pedidos.filter((p) => p.etapa >= 1);
    return {
      total: pedidos.length, ativos: pedidos.filter((p) => !finalizado(p)).length,
      vendas: ab.reduce((a, p) => a + p.subtotal, 0),
      sinaisPend: pedidos.filter((p) => p.etapa === 0),
      aReceber: ab.filter((p) => !pago(p)).reduce((a, p) => a + restante(p), 0),
      porDia: DIAS.map((d) => ({ d, n: pedidos.filter((p) => p.dia === d.id && p.etapa >= 1).length })),
    };
  }, [pedidos]);

  function exportar() {
    const cab = ["Código", "Criado em", "Cliente", "WhatsApp", "Dia", "Horário", "Modo", "Endereço", "Itens", "Produtos", "Entrega", "Sinal", "Restante", "Situação"];
    const linhas = pedidos.map((p) => [p.codigo, new Date(p.criadoEm).toLocaleString("pt-BR"), p.nome, p.whatsapp, nomeDia(p.dia), nomeFaixa(p.faixa), p.modo,
      p.endereco ? `${p.endereco.rua}, ${p.endereco.numero} ${p.endereco.complemento} - ${p.endereco.bairro} ${p.endereco.cep}` : "Retirada",
      resumoItens(p), p.subtotal, p.taxa, sinal(p), restante(p), situacao(p).t]);
    const csv = [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `pedidos-santto-vicio-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <>
      <div className="dash-head">
        <div><h1>Pedidos</h1><p>{k.total} no total · {k.ativos} em andamento{novos ? ` · ${novos} novo${novos > 1 ? "s" : ""} esperando você` : ""}</p></div>
        <button className="btn line sm no-print" onClick={exportar}>Exportar planilha</button>
      </div>
      <div className="kpis">
        <div className="kpi"><span>Vendas confirmadas</span><b>{BRL(k.vendas)}</b><small>pedidos com sinal pago</small></div>
        <div className={"kpi" + (k.sinaisPend.length ? " warn" : "")}><span>Sinais a receber</span><b>{BRL(k.sinaisPend.reduce((a, p) => a + sinal(p), 0))}</b><small>{k.sinaisPend.length} pedido{k.sinaisPend.length === 1 ? "" : "s"} esperando</small></div>
        <div className="kpi"><span>A receber na entrega</span><b>{BRL(k.aReceber)}</b><small>restante + taxas</small></div>
        {k.porDia.map(({ d, n }) => <div className="kpi" key={d.id}><span>{d.nome}</span><b>{n}</b><small>pedido{n === 1 ? "" : "s"} confirmado{n === 1 ? "" : "s"}</small></div>)}
      </div>
      <div className="toolbar">
        <input type="search" placeholder="Buscar por nome, código, bairro, produto…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pedidos" />
        <div className="seg2">{[["ativos", "Em andamento"], ["novos", "Novos"], ["sinal", "Aguardando sinal"], ["producao", "Em produção"], ["pronta", "Prontos"], ["concluido", "Concluídos"], ["todos", "Todos"]].map(([v, n]) =>
          <button key={v} className={st === v ? "on" : ""} onClick={() => setSt(v)}>{n}</button>)}</div>
        <div className="seg2">{[["todos", "Os dois dias"], ...DIAS.map((d) => [d.id, d.nome.split(", ")[1]])].map(([v, n]) =>
          <button key={v} className={dia === v ? "on" : ""} onClick={() => setDia(v)}>{n}</button>)}</div>
        <div className="seg2">{[["todos", "Tudo"], ["entrega", "Entrega"], ["retirada", "Retirada"]].map(([v, n]) =>
          <button key={v} className={modo === v ? "on" : ""} onClick={() => setModo(v)}>{n}</button>)}</div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Quando</th><th>Itens</th><th className="num">Produtos</th><th className="num">Entrega</th><th>Situação</th><th>WhatsApp</th></tr></thead>
          <tbody>
            {lista.map((p) => {
              const s = situacao(p), u = [...p.historico].reverse().find((h) => !h.livre);
              return (
                <tr key={p.codigo} className={(p.novo ? "novo " : "") + (sel === p.codigo ? "sel" : "")} onClick={() => setSel(p.codigo)}>
                  <td><span className="cod">{p.codigo}</span>{p.novo && <span className="sub" style={{ color: "#b06a00", fontWeight: 600 }}>Novo</span>}</td>
                  <td>{p.nome}<span className="sub">{p.whatsapp}</span></td>
                  <td>{nomeDia(p.dia).split(", ")[1]} · {nomeFaixa(p.faixa)}<span className="sub">{p.modo === "retirada" ? "Retirada" : p.endereco?.bairro}</span></td>
                  <td className="itens">{resumoItens(p)}{p.itens.some((i) => i.obs) && <span className="sub">✎ tem observação</span>}</td>
                  <td className="num">{BRL(p.subtotal)}</td>
                  <td className="num">{p.modo === "entrega" ? BRL(p.taxa) : "—"}</td>
                  <td><span className={"pill " + s.cor}>{s.t}</span></td>
                  <td className="small">{u?.envio === "enviado" ? <><i className="zapdot" style={{ background: "var(--ok)" }} />Enviado</> : u?.envio === "erro" ? <><i className="zapdot" style={{ background: "#c0392b" }} />Falhou</> : <><i className="zapdot" style={{ background: "#c9b3a9" }} />Manual</>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!lista.length && <div className="empty">Nenhum pedido com esses filtros.</div>}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>Clique num pedido para ver tudo, avançar a etapa e falar com o cliente. A lista atualiza sozinha a cada 8 segundos.</p>
    </>
  );
}

