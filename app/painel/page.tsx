"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BRL, etapasDe, finalizado, nomeDia, nomeFaixa, restante, sinal, type Pedido } from "@/lib/regras";

type Filtro = "ativos" | "todos" | "23" | "24";

export default function Painel() {
  const [estado, setEstado] = useState<"carregando" | "login" | "ok">("carregando");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [banco, setBanco] = useState("");
  const [senha, setSenha] = useState(""), [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [som, setSom] = useState(false);
  const [toast, setToast] = useState("");
  const [zap, setZap] = useState<Record<string, string>>({});
  const audio = useRef<AudioContext | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/painel", { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401) return setEstado("login");
    const j = await r.json(); setPedidos(j.pedidos); setBanco(j.banco); setEstado("ok");
  }, []);
  useEffect(() => { carregar(); const i = setInterval(carregar, 8000); return () => clearInterval(i); }, [carregar]);

  // alarme: toca enquanto houver pedido novo não visto
  const novos = pedidos.filter((p) => p.novo).length;
  useEffect(() => {
    if (!novos || !som) return;
    const beep = () => {
      try {
        const ctx = (audio.current ??= new AudioContext()), t = ctx.currentTime;
        [0, 0.18].forEach((d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15); o.connect(g).connect(ctx.destination); o.start(t + d); o.stop(t + d + 0.16); });
      } catch {}
    };
    beep(); const i = setInterval(beep, 2500); return () => clearInterval(i);
  }, [novos, som]);
  useEffect(() => { document.title = novos ? `(${novos}) Novo pedido · Painel` : "Painel · Santto Vício"; }, [novos]);
  useEffect(() => { let w: { release(): void } | null = null; (navigator as Navigator & { wakeLock?: { request(t: string): Promise<{ release(): void }> } }).wakeLock?.request("screen").then((x) => (w = x)).catch(() => {}); return () => w?.release(); }, []);

  const avisar = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  async function acao(p: Pedido, body: Record<string, unknown>) {
    const r = await fetch(`/api/painel/${p.codigo}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { avisar(j.erro || "Não deu certo."); carregar(); return null; }
    setPedidos((l) => l.map((x) => (x.codigo === p.codigo ? j.pedido : x)));
    return j as { pedido: Pedido; whatsapp: string; envio: "enviado" | "manual" | "erro" };
  }
  async function avancar(p: Pedido) {
    const j = await acao(p, { acao: "avancar", de: p.etapa });
    if (!j) return;
    if (j.envio === "enviado") avisar("Etapa atualizada e WhatsApp enviado ao cliente ✓");
    else { setZap((z) => ({ ...z, [p.codigo]: j.whatsapp })); avisar(j.envio === "erro" ? "O WhatsApp automático falhou. Envie pelo botão." : "Etapa atualizada. Agora envie o WhatsApp."); }
  }

  if (estado === "carregando") return <div className="app panel"><div className="center muted">Carregando…</div></div>;
  if (estado === "login") return (
    <div className="app panel"><form className="login pad" onSubmit={async (e) => {
      e.preventDefault(); setErro("");
      const r = await fetch("/api/painel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ senha }) });
      if (r.ok) { setSom(true); carregar(); } else setErro((await r.json()).erro);
    }}>
      <h2 style={{ fontSize: 28 }}>Painel da loja</h2>
      <label className="small muted" htmlFor="senha">Senha</label>
      <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      <button className="btn" style={{ justifyContent: "center" }}>Entrar</button>
      {erro && <p className="err">{erro}</p>}
    </form></div>
  );

  const lista = pedidos.filter((p) => filtro === "todos" ? true : filtro === "ativos" ? !finalizado(p) : p.dia.endsWith(filtro));
  return (
    <div className="app panel">
      <div className="top pad" style={{ background: "#f6ece6" }}><span /><h2>Painel da loja</h2><span /></div>
      <div className="pad" style={{ paddingBlock: "16px 40px" }}>
        {!som && <div className="note" style={{ marginBottom: 12 }}>O alarme sonoro precisa de um toque para ser liberado pelo navegador. <button className="link" onClick={() => setSom(true)}>Ativar som</button></div>}
        {novos > 0 && <div className="alarm" style={{ marginBottom: 12 }}><div style={{ fontSize: 26 }}>🔔</div>
          <div style={{ flex: 1 }}><b>{novos > 1 ? `${novos} novas encomendas` : "Nova encomenda!"}</b><span style={{ fontSize: 13, opacity: 0.9 }}>Toque em “Visto” no pedido para parar o alarme.</span></div></div>}
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
              <header><b>{p.codigo}</b><span className={"pill" + (p.etapa > 0 && !s.pill ? " ok" : "")}>{s.pill || s.t}</span></header>
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
              <div className="acts">
                {p.novo && <button className="btn ghost" onClick={() => acao(p, { acao: "visto" })}>Visto</button>}
                {!finalizado(p) ? <button className={"btn" + (p.etapa === 3 ? " ok" : "")} onClick={() => avancar(p)}>{s.acao}</button> : <span className="done-badge">✓ Concluído</span>}
                {zap[p.codigo] ? <a className="btn ok" href={zap[p.codigo]} target="_blank" rel="noreferrer" onClick={() => setZap((z) => Object.fromEntries(Object.entries(z).filter(([k]) => k !== p.codigo)))}>Enviar no WhatsApp</a>
                  : <button className="link small" onClick={async () => {
                      const j = await acao(p, { acao: "reenviar" }); if (!j) return;
                      if (j.envio === "enviado") avisar("Mensagem reenviada no WhatsApp ✓"); else window.open(j.whatsapp, "_blank");
                    }}>Reenviar última mensagem</button>}
              </div>
              {(() => { const u = p.historico[p.historico.length - 1]; if (!u) return null;
                return <p className="small" style={{ margin: "8px 0 0", color: u.envio === "erro" ? "#a3172b" : u.envio === "enviado" ? "var(--ok)" : "var(--muted)" }}>
                  {u.envio === "enviado" ? "✓ Última mensagem enviada automaticamente no WhatsApp" : u.envio === "erro" ? `WhatsApp automático falhou: ${u.erro ?? "erro desconhecido"}` : "WhatsApp automático desligado: envie pelo botão"}</p>; })()}
            </article>
          );
        })}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
