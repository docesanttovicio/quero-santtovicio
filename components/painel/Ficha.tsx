"use client";

import { useEffect, useState } from "react";
import { BRL, etapasDe, finalizado, nomeDia, nomeFaixa, restante, sinal, type Pedido } from "@/lib/regras";
import { situacao, type Acao } from "./Dashboard";
import Cancelar from "./Cancelar";

const RAPIDAS = [
  "Oi! Recebemos seu Pix, obrigado! 💛",
  "Oi! Pode confirmar o endereço e um ponto de referência?",
  "Sua encomenda está a caminho! O motorista chega em breve.",
  "Oi! Ainda não identificamos o pagamento. Pode mandar o comprovante por aqui?",
];

export default function Ficha({ p, acao, avisar, whatsapp, fechar }: { p: Pedido; acao: Acao; avisar: (m: string) => void; whatsapp: boolean; fechar: () => void }) {
  const S = etapasDe(p), s = situacao(p), prox = S[p.etapa]?.acao;
  const [zap, setZap] = useState<{ msg?: string; pix?: string }>({});
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { setZap({}); setTexto(""); }, [p.codigo]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && fechar(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [fechar]);

  async function rodar(body: Record<string, unknown>) { setOcupado(true); try { return await acao(p, body); } finally { setOcupado(false); } }
  async function avancar() {
    const j = await rodar({ acao: "avancar", de: p.etapa }); if (!j) return;
    if (j.envio === "enviado") avisar("Etapa atualizada e WhatsApp enviado ✓");
    else { setZap({ msg: j.whatsapp, pix: j.whatsappPix ?? undefined }); avisar(j.envio === "erro" ? "O WhatsApp automático falhou. Envie pelos botões." : "Etapa atualizada. Agora envie o WhatsApp."); }
  }
  async function mandar(manual: boolean) {
    const t = texto.trim(); if (!t) return;
    const j = await rodar({ acao: "mensagem", texto: t, manual }); if (!j) return;
    setTexto("");
    if (j.envio === "enviado") avisar("Mensagem enviada no WhatsApp ✓");
    else { window.open(j.whatsapp, "_blank"); if (j.envio === "erro") avisar(j.erro ?? "Não foi pelo automático. Abri no WhatsApp."); }
  }
  const copiar = (v: string) => navigator.clipboard?.writeText(v).then(() => avisar("Copiado")).catch(() => {});
  const e = p.endereco;
  const mapa = e ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.rua}, ${e.numero}, ${e.bairro}, Rio de Janeiro, ${e.cep}`)}` : "";

  return (
    <>
      <div className="drawer-bg" onClick={fechar} />
      <aside className="drawer" role="dialog" aria-label={`Pedido ${p.codigo}`}>
        <header>
          <div>
            <h2>{p.codigo}</h2>
            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span className={"pill " + s.cor}>{s.t}</span>
              <span className="small muted">feito em {new Date(p.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="mini-steps" aria-hidden="true">{S.map((_, i) => <i key={i} className={i < p.etapa ? "done" : i === p.etapa ? "now" : ""} />)}</div>
          </div>
          <button className="x" onClick={fechar} aria-label="Fechar">✕</button>
        </header>
        <div className="body">
          <section>
            <div className="row-acts">
              {p.novo && <button className="btn outline sm" disabled={ocupado} onClick={() => rodar({ acao: "visto" })}>Marcar como visto</button>}
              {!p.cancelado && !finalizado(p) && prox && <button className={"btn sm" + (p.etapa === 3 ? " ok" : "")} disabled={ocupado} onClick={avancar}>{prox}</button>}
              {finalizado(p) && <span className="done-badge">✓ Concluído</span>}
              {zap.msg && <a className="btn ok sm" href={zap.msg} target="_blank" rel="noreferrer" onClick={() => setZap((z) => ({ ...z, msg: undefined }))}>Enviar no WhatsApp</a>}
              {!zap.msg && zap.pix && <a className="btn ok sm" href={zap.pix} target="_blank" rel="noreferrer" onClick={() => setZap({})}>Enviar chave Pix</a>}
            </div>
            {!finalizado(p) && <Cancelar p={p} acao={acao} avisar={avisar} />}
            {!p.cancelado && (p.etapa === 0 || (p.modo === "entrega" && p.etapa === 3)) && <p className="aviso-comp">🧾 Antes de confirmar, confira se o comprovante de {BRL(p.etapa === 0 ? sinal(p) : restante(p))} chegou no WhatsApp da loja.</p>}
            {!finalizado(p) && !p.cancelado && <p className="small muted" style={{ margin: "8px 0 0" }}>Próxima etapa: {S[p.etapa + 1]?.t}. {whatsapp ? "O cliente recebe o aviso no WhatsApp automaticamente." : "Depois, envie o aviso pelo botão verde."}</p>}
          </section>

          <section>
            <h3>Cliente</h3>
            <dl className="kv">
              <dt>Nome</dt><dd>{p.nome}</dd>
              <dt>WhatsApp</dt><dd>{p.whatsapp} <button className="link small" onClick={() => copiar(p.whatsapp)}>copiar</button></dd>
              <dt>Quando</dt><dd>{nomeDia(p.dia)}, {nomeFaixa(p.faixa)}</dd>
              <dt>{p.modo === "entrega" ? "Entrega" : "Retirada"}</dt>
              <dd>{e ? <>{e.rua}, {e.numero}{e.complemento ? ` · ${e.complemento}` : ""}<br />{e.bairro} · {e.cep} <a className="link small" href={mapa} target="_blank" rel="noreferrer">ver no mapa ↗</a> <button className="link small" onClick={() => copiar(`${e.rua}, ${e.numero}${e.complemento ? " " + e.complemento : ""} - ${e.bairro}, Rio de Janeiro - ${e.cep}`)}>copiar</button></> : "Combinar local pelo WhatsApp"}</dd>
              <dt>Pagamento</dt><dd>{p.pagamento === "pix" ? "Pix" : "Link de cartão"}</dd>
            </dl>
          </section>

          <section>
            <h3>Itens</h3>
            <div className="totals">
              {p.itens.map((i, k) => <div key={k}><span>{i.qtd}× {i.nome} <span className="muted">({i.variante})</span>{i.obs && <><br /><small style={{ color: "#8a5a00" }}>✎ {i.obs}</small></>}</span><span className="price">{BRL(i.preco * i.qtd)}</span></div>)}
            </div>
          </section>

          <section>
            <h3>Valores</h3>
            <div className="totals">
              <div><span>Produtos</span><span className="price">{BRL(p.subtotal)}</span></div>
              {p.modo === "entrega" && <div><label htmlFor={"tx" + p.codigo}>Entrega {p.km ? <span className="muted">({p.km} km{p.taxaEstimada != null && p.taxaEstimada !== p.taxa ? `, estimada ${BRL(p.taxaEstimada)}` : ""})</span> : null}</label>
                {p.etapa < 3 ? <input id={"tx" + p.codigo} key={p.taxa} type="number" step="0.5" min="0" defaultValue={p.taxa.toFixed(2)} style={{ width: 100, border: "1px solid var(--line)", borderRadius: 8, padding: "5px 8px", textAlign: "right" }}
                  onBlur={async (ev) => { const v = parseFloat(ev.target.value); if (v !== p.taxa && (await rodar({ acao: "taxa", valor: v }))) avisar("Taxa ajustada"); }} /> : <span className="price">{BRL(p.taxa)}</span>}</div>}
              <div className="sep"><span>Sinal (50%)</span><span><span className={"pill " + (p.etapa >= 1 ? "ok" : "")}>{p.etapa >= 1 ? "Recebido" : "Pendente"}</span> <span className="price">{BRL(sinal(p))}</span></span></div>
              <div><span>{p.modo === "entrega" ? "Restante + entrega" : "Restante na retirada"}</span><span><span className={"pill " + (p.etapa >= 4 ? "ok" : "gray")}>{p.etapa >= 4 ? "Pago" : p.etapa === 3 ? "Cobrando" : "Depois"}</span> <span className="price">{BRL(restante(p))}</span></span></div>
            </div>
          </section>

          <section>
            <h3>Conversa no WhatsApp</h3>
            <div className="hist">
              {p.historico.map((h, i) => (
                <div key={i}>
                  <div className={"bub" + (h.livre ? " livre" : "")}>{h.mensagem}</div>
                  <div className="meta"><span>{h.cancel ? "Cancelamento" : h.livre ? "Mensagem sua" : h.pix ? "Chave Pix" : etapasDe(p)[h.etapa]?.t}</span>
                    <span style={{ color: h.envio === "enviado" ? "var(--ok)" : h.envio === "erro" ? "#a3172b" : undefined }}>
                      {h.envio === "enviado" ? "✓ enviada" : h.envio === "erro" ? `falhou: ${h.erro ?? ""}` : "manual"} · {new Date(h.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                </div>
              ))}
            </div>
          </section>

          <section className="composer">
            <h3>Mandar mensagem</h3>
            <div className="chips">{RAPIDAS.map((r) => <button key={r} type="button" onClick={() => setTexto(r)}>{r.length > 34 ? r.slice(0, 32) + "…" : r}</button>)}</div>
            <textarea value={texto} onChange={(ev) => setTexto(ev.target.value)} maxLength={1000} placeholder={`Escreva para ${p.nome.split(" ")[0]}…`} aria-label="Mensagem para o cliente" />
            <div className="row-acts" style={{ marginTop: 8 }}>
              {whatsapp && <button className="btn sm" disabled={!texto.trim() || ocupado} onClick={() => mandar(false)}>Enviar pelo WhatsApp</button>}
              <button className={"btn sm" + (whatsapp ? " outline" : "")} disabled={!texto.trim() || ocupado} onClick={() => mandar(true)}>Abrir no WhatsApp</button>
            </div>
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              {whatsapp ? "Pelo envio automático, a Meta só entrega texto livre se o cliente tiver falado com a loja nas últimas 24h. Fora disso, use “Abrir no WhatsApp”." : "Abre o WhatsApp com a mensagem pronta. Ela também fica registrada aqui e na página do cliente."}
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}
