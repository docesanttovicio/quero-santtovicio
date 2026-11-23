"use client";

import { useCallback, useEffect, useState } from "react";
import { BRL, etapasDe, finalizado, nomeDia, nomeFaixa, restante, sinal, type Pedido } from "@/lib/regras";
import Dashboard from "@/components/painel/Dashboard";
import Entrar from "@/components/painel/Entrar";
import Cancelar from "@/components/painel/Cancelar";
import Acessos from "@/components/painel/Acessos";
import { marcarEquipe } from "@/lib/rastro";
import { useSom } from "@/lib/som";
import BotaoSom from "@/components/painel/BotaoSom";

type Filtro = "ativos" | "todos" | "23" | "24";

export default function Painel() {
  const [estado, setEstado] = useState<"carregando" | "login" | "ok">("carregando");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [banco, setBanco] = useState("");
  const [zapLigado, setZapLigado] = useState(false);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => { const m = matchMedia("(min-width: 1024px)"); const f = () => setDesktop(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [verAcessos, setVerAcessos] = useState(false);
  const som = useSom();
  const [toast, setToast] = useState("");
  const [zap, setZap] = useState<Record<string, { msg?: string; pix?: string }>>({});
  const tirar = (cod: string, k: "msg" | "pix") => setZap((z) => ({ ...z, [cod]: { ...z[cod], [k]: undefined } }));

  const carregar = useCallback(async () => {
    const r = await fetch("/api/painel", { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401) return setEstado("login");
    const j = await r.json(); setPedidos(j.pedidos); setBanco(j.banco); setZapLigado(!!j.whatsapp); setEstado("ok"); marcarEquipe();
  }, []);
  useEffect(() => { carregar(); const i = setInterval(carregar, 8000); return () => clearInterval(i); }, [carregar]);

  // alarme: toca enquanto houver pedido novo não visto
  const novos = pedidos.filter((p) => p.novo).length;
  useEffect(() => {
    if (!novos || !som.ligado || !som.liberado) return;
    som.bipe(); const i = setInterval(som.bipe, 2500); return () => clearInterval(i);
  }, [novos, som.ligado, som.liberado, som.bipe]);
  useEffect(() => { document.title = novos ? `(${novos}) Novo pedido · Painel` : "Painel · Santto Vício"; }, [novos]);
  useEffect(() => { let w: { release(): void } | null = null; (navigator as Navigator & { wakeLock?: { request(t: string): Promise<{ release(): void }> } }).wakeLock?.request("screen").then((x) => (w = x)).catch(() => {}); return () => w?.release(); }, []);

  const avisar = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  async function acao(p: Pedido, body: Record<string, unknown>) {
    // Nunca deixa o botão travado: sem resposta do servidor, avisa e libera.
    let r: Response, j: { erro?: string; pedido?: Pedido };
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
      r = await fetch(`/api/painel/${p.codigo}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
      clearTimeout(t);
      j = await r.json();
    } catch {
      avisar("Sem resposta do servidor. Confira a internet e recarregue a página."); return null;
    }
    if (r.status === 401) { avisar("Sua sessão expirou. Entre de novo."); setEstado("login"); return null; }
    if (!r.ok) { avisar(j.erro || "Não deu certo."); carregar(); return null; }
    setPedidos((l) => l.map((x) => (x.codigo === p.codigo ? (j.pedido as Pedido) : x)));
    return j as unknown as { pedido: Pedido; whatsapp: string; whatsappPix: string | null; envio: "enviado" | "manual" | "erro"; erro?: string };
  }
  async function avancar(p: Pedido) {
    const j = await acao(p, { acao: "avancar", de: p.etapa });
    if (!j) return;
    if (j.envio === "enviado") avisar("Etapa atualizada e WhatsApp enviado ao cliente ✓");
    else { setZap((z) => ({ ...z, [p.codigo]: { msg: j.whatsapp, pix: j.whatsappPix ?? undefined } })); avisar(j.envio === "erro" ? "O WhatsApp automático falhou. Envie pelos botões." : "Etapa atualizada. Agora envie o WhatsApp."); }
  }

  if (estado === "carregando") return <div className="carregando">Carregando…</div>;
  if (estado === "login") return <Entrar onEntrou={carregar} />;

  if (desktop) return <Dashboard pedidos={pedidos} carregar={carregar} acao={acao} avisar={avisar} toast={toast} banco={banco} whatsapp={zapLigado} novos={novos} som={som} />;

  const lista = pedidos.filter((p) => filtro === "todos" ? true : filtro === "ativos" ? !finalizado(p) && !p.cancelado : p.dia.endsWith(filtro));
  return (
    <div className="app panel">
      <div className="top pad" style={{ background: "#f6ece6" }}><button className="link small" onClick={() => setVerAcessos((v) => !v)}>{verAcessos ? "← Pedidos" : "Acessos"}</button><h2>Painel da loja</h2><button className="link small" onClick={async () => { await fetch("/api/painel", { method: "DELETE" }); location.reload(); }}>Sair</button></div>
      <div className="pad" style={{ paddingBlock: "16px 40px" }}>
        <div style={{ marginBottom: 12 }}><BotaoSom som={som} /></div>
        {novos > 0 && <div className="alarm" style={{ marginBottom: 12 }}><div style={{ fontSize: 26 }}>🔔</div>
          <div style={{ flex: 1 }}><b>{novos > 1 ? `${novos} novas encomendas` : "Nova encomenda!"}</b><span style={{ fontSize: 13, opacity: 0.9 }}>Toque em “Visto” no pedido para parar o alarme.</span></div></div>}
        {verAcessos ? <div className="ac-mobile"><Acessos /></div> : <>
        <div className="panel-tools">
          <div className="filters">{([["ativos", "Em andamento"], ["23", "Dia 23"], ["24", "Dia 24"], ["todos", "Todos"]] as [Filtro, string][]).map(([k, n]) =>
            <button key={k} className={filtro === k ? "on" : ""} onClick={() => setFiltro(k)}>{n}</button>)}</div>
          <span className="small muted">{lista.length} pedido{lista.length === 1 ? "" : "s"}{banco === "arquivo" ? " · modo teste" : ""}</span>
        </div>
        {!lista.length && <div className="ocard"><b style={{ fontFamily: "var(--f-display)", fontWeight: 400, fontSize: 20 }}>Nenhuma encomenda aqui</b><p className="muted" style={{ margin: "6px 0 0" }}>Quando um cliente enviar um pedido, ele aparece aqui na hora, com alarme.</p></div>}
        {lista.map((p) => {
          const s = etapasDe(p)[p.etapa], editTaxa = p.modo === "entrega" && p.etapa < 3;
          return (
            <article className="ocard" key={p.codigo}>
              <header><b>{p.codigo}</b>{p.cancelado ? <span className="pill red">Cancelado</span> : <span className={"pill" + (p.etapa > 0 && !s.pill ? " ok" : "")}>{s.pill || s.t}</span>}</header>
              <ul>{p.itens.map((l, i) => <li key={i}>{l.qtd}× {l.nome} <span className="muted">({l.variante})</span>{l.obs && <><br /><small className="muted">Obs.: {l.obs}</small></>}</li>)}</ul>
              <div className="meta">
                <span><b style={{ color: "var(--ink)" }}>{p.nome}</b> · {p.whatsapp}</span>
                <span>{nomeDia(p.dia)}, {nomeFaixa(p.faixa)}</span>
                <span>{p.modo === "retirada" ? <span className="pill">Retirada: orientar o cliente pelo WhatsApp</span> : p.endereco && `${p.endereco.rua}, ${p.endereco.numero}${p.endereco.complemento ? " · " + p.endereco.complemento : ""} · ${p.endereco.bairro} · ${p.endereco.cep}`}</span>
              </div>
              <div className="money">
                <div><span>Produtos</span><span className="price">{BRL(p.subtotal)}</span></div>
                <div><span>Sinal {p.pagamento === "pix" ? "Pix" : "cartão"}</span><span className={"pill" + (p.etapa >= 1 ? " ok" : "")}>{p.etapa >= 1 ? "Recebido" : "Pendente"} · {BRL(sinal(p))}</span></div>
                {p.modo === "entrega" && <div>
                  <label htmlFor={"taxa-" + p.codigo}>Taxa de entrega <span className="muted">{p.km ? `(estimada ${p.km} km)` : "(sem estimativa)"}</span></label>
                  {editTaxa ? <input id={"taxa-" + p.codigo} type="number" step="0.5" min="0" inputMode="decimal" defaultValue={p.taxa.toFixed(2)} key={p.taxa}
                    onBlur={async (e) => { const v = parseFloat(e.target.value); if (v !== p.taxa && (await acao(p, { acao: "taxa", valor: v }))) avisar("Taxa de entrega ajustada"); }} />
                    : <span className="price">{BRL(p.taxa)}</span>}
                </div>}
                <div><span>{p.modo === "entrega" ? "Restante + entrega" : "Restante na retirada"}</span><span className="price">{BRL(restante(p))}</span></div>
              </div>
              {!p.cancelado && (p.etapa === 0 || (p.modo === "entrega" && p.etapa === 3)) && <p className="aviso-comp">🧾 Antes de confirmar, confira se o comprovante de {BRL(p.etapa === 0 ? sinal(p) : restante(p))} chegou no WhatsApp da loja.</p>}
              <div className="acts">
                {p.novo && <button className="btn ghost" onClick={() => acao(p, { acao: "visto" })}>Visto</button>}
                {p.cancelado ? null : !finalizado(p) ? <button className={"btn" + (p.etapa === 3 ? " ok" : "")} onClick={() => avancar(p)}>{s.acao}</button> : <span className="done-badge">✓ Concluído</span>}
                {zap[p.codigo]?.msg && <a className="btn ok" href={zap[p.codigo].msg} target="_blank" rel="noreferrer" onClick={() => tirar(p.codigo, "msg")}>Enviar no WhatsApp</a>}
                {!zap[p.codigo]?.msg && zap[p.codigo]?.pix && <a className="btn ok" href={zap[p.codigo].pix} target="_blank" rel="noreferrer" onClick={() => tirar(p.codigo, "pix")}>Enviar chave Pix</a>}
                {!zap[p.codigo]?.msg && !zap[p.codigo]?.pix && <button className="link small" onClick={async () => {
                      const j = await acao(p, { acao: "reenviar" }); if (!j) return;
                      if (j.envio === "enviado") avisar("Mensagens reenviadas no WhatsApp ✓");
                      else setZap((z) => ({ ...z, [p.codigo]: { msg: j.whatsapp, pix: j.whatsappPix ?? undefined } }));
                    }}>Reenviar última mensagem</button>}
              </div>
              {!finalizado(p) && <Cancelar p={p} acao={acao} avisar={avisar} />}
              {(() => { const u = p.historico[p.historico.length - 1]; if (!u) return null;
                return <p className="small" style={{ margin: "8px 0 0", color: u.envio === "erro" ? "#a3172b" : u.envio === "enviado" ? "var(--ok)" : "var(--muted)" }}>
                  {u.envio === "enviado" ? "✓ Última mensagem enviada automaticamente no WhatsApp" : u.envio === "erro" ? `WhatsApp automático falhou: ${u.erro ?? "erro desconhecido"}` : "WhatsApp automático desligado: envie pelos botões"}</p>; })()}
            </article>
          );
        })}
        </>}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
