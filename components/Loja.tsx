"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, PRODUTOS, SUGESTOES, menorPreco, porId, type Produto } from "@/lib/catalogo";
import { BRL, DIAS, FAIXAS, PEDIDOS_ATE, SINAL } from "@/lib/regras";

type Linha = { produtoId: string; vi: number; qtd: number; obs: string };
type Vista = "loja" | "sacola" | "dados";
const ORDEM: Vista[] = ["loja", "sacola", "dados"];
const img = (n: string) => `/img/${n}.jpg`;
const reduz = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const CHAVE = "sv_sacola";

function pop(el: Element | null) {
  if (!el) return;
  el.classList.remove("bump");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("bump");
}

export default function Loja() {
  const router = useRouter();
  const [sacola, setSacola] = useState<Linha[]>([]);
  const [vista, setVista] = useState<Vista>("loja");
  const [dir, setDir] = useState("");
  const [item, setItem] = useState<Produto | null>(null);
  const [revisar, setRevisar] = useState(false);
  const [toast, setToast] = useState("");
  const [aba, setAba] = useState("destaques");
  const barBtn = useRef<HTMLButtonElement>(null);
  const travaAba = useRef(0);

  // sacola guardada no aparelho
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(CHAVE) || "[]"); if (Array.isArray(s)) setSacola(s.filter((l) => porId(l.produtoId)?.v[l.vi])); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(sacola)); } catch {} }, [sacola]);

  const linhas = useMemo(() => sacola.map((l) => { const p = porId(l.produtoId)!; return { ...l, p, v: p.v[l.vi] }; }), [sacola]);
  const subtotal = linhas.reduce((a, l) => a + l.v.p * l.qtd, 0);
  const qtdTotal = linhas.reduce((a, l) => a + l.qtd, 0);
  const qtdDe = (id: string) => sacola.filter((l) => l.produtoId === id).reduce((a, l) => a + l.qtd, 0);

  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisar = useCallback((m: string) => { setToast(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), 2400); }, []);

  const ir = useCallback((v: Vista) => {
    setVista((atual) => {
      setDir(v === atual ? "" : ORDEM.indexOf(v) > ORDEM.indexOf(atual) ? "enter-fwd" : "enter-back");
      return v;
    });
    scrollTo(0, 0);
  }, []);
  useEffect(() => { if (vista !== "loja" && !sacola.length) ir("loja"); }, [sacola.length, vista, ir]);

  function adicionar(produtoId: string, vi: number, qtd: number, obs = "", de?: HTMLImageElement | null) {
    setSacola((s) => {
      const i = s.findIndex((l) => l.produtoId === produtoId && l.vi === vi && l.obs === obs);
      if (i >= 0) return s.map((l, k) => (k === i ? { ...l, qtd: l.qtd + qtd } : l));
      return [...s, { produtoId, vi, qtd, obs }];
    });
    voar(de);
  }

  function voar(de?: HTMLImageElement | null) {
    if (!de || reduz()) return;
    requestAnimationFrame(() => {
      const alvo = barBtn.current?.getBoundingClientRect() ?? { left: innerWidth / 2 - 20, top: innerHeight - 60, width: 40, height: 40 };
      const a = de.getBoundingClientRect(), t = Math.min(a.width, a.height, 220);
      const c = document.createElement("img");
      c.src = de.currentSrc || de.src; c.className = "fly";
      Object.assign(c.style, { left: `${a.left + a.width / 2 - t / 2}px`, top: `${a.top + a.height / 2 - t / 2}px`, width: `${t}px`, height: `${t}px` });
      document.body.appendChild(c);
      const dx = alvo.left + alvo.width / 2 - (a.left + a.width / 2), dy = alvo.top + alvo.height / 2 - (a.top + a.height / 2);
      c.animate([
        { transform: "translate(0,0) scale(1)" },
        { transform: `translate(${dx * 0.45}px,${dy * 0.2 - 90}px) scale(.55)`, offset: 0.45 },
        { transform: `translate(${dx}px,${dy}px) scale(.12)`, opacity: 0.6 },
      ], { duration: 680, easing: "cubic-bezier(.5,0,.4,1)" }).finished.then(() => { c.remove(); pop(barBtn.current); });
    });
  }

  // abas que acompanham a rolagem
  useEffect(() => {
    if (vista !== "loja") return;
    const f = () => {
      if (Date.now() < travaAba.current) return;
      let cur = "destaques";
      document.querySelectorAll<HTMLElement>("#menu .section").forEach((s) => { if (s.getBoundingClientRect().top < 120) cur = s.id.slice(2); });
      setAba(cur);
    };
    addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, [vista]);
  useEffect(() => { document.querySelector(`.tab[data-tab="${aba}"]`)?.scrollIntoView({ inline: "center", block: "nearest" }); }, [aba]);
  function irAba(id: string) {
    setAba(id); travaAba.current = Date.now() + 700;
    const s = document.getElementById("s-" + id);
    if (s) scrollTo({ top: s.getBoundingClientRect().top + scrollY - 56, behavior: reduz() ? "auto" : "smooth" });
  }

  const barra = vista === "loja" ? (sacola.length ? "loja" : null) : vista;

  return (
    <div className="app">
      {vista === "loja" && (
        <section className={dir} key="loja">
          <div className="hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/capa.jpg" alt="Mesa de Natal com Matilda, torta alemã, brownies, cookies e muffins" />
            <div className="hero-shade" />
            <div className="hero-top pad"><span className="chip light">Rio de Janeiro</span></div>
          </div>
          <div className="store pad">
            <div className="store-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="logo"><img src="/img/logo.png" alt="Santto Vício Doceria" /></div>
              <div>
                <span className="eyebrow" style={{ opacity: 0.8 }}>Cardápio de Natal</span>
                <h1>Santto Vício Doceria</h1>
                <div className="sub">Doces e salgados para a ceia, em quantidades limitadas</div>
              </div>
            </div>
            <Prazos />
          </div>
          <div className="scallop" style={{ backgroundColor: "var(--wine)" }} />
          <nav className="tabs"><div className="tabs-inner pad">
            {[{ id: "destaques", nome: "Destaques" }, ...CATEGORIAS].map((c) => (
              <button key={c.id} type="button" data-tab={c.id} className={"tab" + (aba === c.id ? " on" : "")} onClick={() => irAba(c.id)}>{c.nome}</button>
            ))}
          </div></nav>
          <div className="pad" id="menu">
            <div className="section" id="s-destaques"><h2>Destaques</h2>
              <div className="dest">{PRODUTOS.filter((p) => p.dest).map((p) => (
                <button key={p.id} className="dcard" type="button" onClick={() => setItem(p)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="ph"><img src={img(p.img)} alt="" /><span className="badge">{p.dest}</span></div>
                  <div className="from muted">{p.v.length > 1 ? "a partir de" : " "}</div>
                  <div className="price">{BRL(menorPreco(p))}</div><div className="nm">{p.nome}</div>
                </button>))}
              </div>
            </div>
            {CATEGORIAS.map((c) => (
              <div className="section" id={"s-" + c.id} key={c.id}><h2>{c.nome}</h2><p className="lead muted">{c.lead}</p>
                {PRODUTOS.filter((p) => p.cat === c.id).map((p) => (
                  <button key={p.id} className="item" type="button" onClick={() => setItem(p)}>
                    <div className="t"><span className="eyebrow ey">{p.ey}</span><h3>{p.nome}</h3><p>{p.desc}</p>
                      <div className="pr">{p.v.length > 1 && <small>a partir de</small>}<span className="price">{BRL(menorPreco(p))}</span>{p.lim && <span className="tag">Limitado</span>}</div></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div className="thumb"><img src={img(p.img)} alt="" loading="lazy" />{qtdDe(p.id) > 0 && <span className="incart" key={qtdDe(p.id)}>{qtdDe(p.id)}</span>}</div>
                  </button>))}
              </div>
            ))}
          </div>
          <div className="pad">
            <div className="rules">
              <h3>Como funciona a encomenda</h3>
              <dl>
                <div><dt>Prazo</dt><dd>Aceitamos encomendas até 15/12, conforme a agenda de produção.</dd></div>
                <div><dt>Entrega</dt><dd>Dias 23/12 e 24/12, das 10h às 19h, por motorista de aplicativo. A taxa é calculada pelo seu endereço antes de você enviar o pedido.</dd></div>
                <div><dt>Pagamento</dt><dd>50% no ato do pedido e 50% na entrega, por Pix ou link de cartão. Como o motorista de aplicativo não recebe pagamentos, no dia da entrega a gente te manda o restante com a taxa e a encomenda sai assim que o pagamento cair.</dd></div>
              </dl>
            </div>
          </div>
        </section>
      )}

      {vista === "sacola" && (
        <section className={dir} key="sacola">
          <div className="top pad"><button className="back" type="button" aria-label="Voltar" onClick={() => ir("loja")}>‹</button><h2>Sacola</h2>
            <button className="link" type="button" onClick={() => { setSacola([]); ir("loja"); }}>Limpar</button></div>
          <div className="pad">
            <div className="block"><h3>Itens da encomenda</h3>
              {linhas.map((l, i) => (
                <div className="line" key={l.produtoId + l.vi + l.obs}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(l.p.img)} alt="" />
                  <div><div className="n">{l.p.nome}</div><div className="v">{l.v.n}{l.obs ? ` · “${l.obs}”` : ""}</div><div className="price" style={{ marginTop: 4 }}>{BRL(l.v.p * l.qtd)}</div></div>
                  <div className="ctrl"><div className="mini">
                    <button type="button" aria-label={l.qtd > 1 ? "Diminuir" : "Remover"} onClick={() => setSacola((s) => s.flatMap((x, k) => (k === i ? (x.qtd > 1 ? [{ ...x, qtd: x.qtd - 1 }] : []) : [x])))}>{l.qtd > 1 ? "−" : "×"}</button>
                    <span>{l.qtd}</span>
                    <button type="button" aria-label="Aumentar" onClick={() => { setSacola((s) => s.map((x, k) => (k === i ? { ...x, qtd: x.qtd + 1 } : x))); pop(barBtn.current); }}>+</button>
                  </div></div>
                </div>
              ))}
              <button className="btn ghost wide" type="button" style={{ marginTop: 14, justifyContent: "center" }} onClick={() => ir("loja")}>Adicionar mais itens</button>
            </div>
            <Sugestoes ids={SUGESTOES.filter((id) => !sacola.some((l) => l.produtoId === id)).slice(0, 4)} onAdd={(id, el) => { adicionar(id, 0, 1, "", el); avisar(`${porId(id)!.nome} na sacola`); }} />
            <div className="block"><h3>Resumo</h3><div className="totals">
              <div><span>Subtotal dos produtos</span><span className="price">{BRL(subtotal)}</span></div>
              <div><span>Entrega</span><span className="muted">calculada no próximo passo</span></div>
              <div className="grand sep"><span>Sinal para confirmar (50%)</span><span className="price">{BRL(subtotal * SINAL)}</span></div>
            </div></div>
          </div>
        </section>
      )}

      {vista === "dados" && <Dados key="dados" className={dir} subtotal={subtotal} onVoltar={() => ir("sacola")} onRevisar={() => setRevisar(true)} avisar={avisar} />}

      {barra && (
        <div className="bar show"><div className="bar-in pad">
          <div className="sum">{barra === "dados" ? "Sinal para confirmar" : "Total dos produtos"}<b>{BRL(barra === "dados" ? subtotal * SINAL : subtotal)}</b></div>
          {barra === "loja" && <button ref={barBtn} className="btn" type="button" onClick={() => ir("sacola")}><span>Ver sacola</span><span className="count">{qtdTotal}</span></button>}
          {barra === "sacola" && <button ref={barBtn} className="btn" type="button" onClick={() => ir("dados")}>Continuar</button>}
          {barra === "dados" && <button className="btn" type="button" onClick={() => document.dispatchEvent(new Event("sv:revisar"))}>Revisar pedido</button>}
        </div></div>
      )}

      {item && <FolhaItem p={item} onFechar={() => setItem(null)} onAdd={(vi, q, obs, el) => { adicionar(item.id, vi, q, obs, el); }} />}
      {revisar && <Revisao linhas={linhas} subtotal={subtotal} onFechar={() => setRevisar(false)} onEnviado={(codigo, token) => { setSacola([]); try { localStorage.removeItem(CHAVE); } catch {} router.push(`/pedido/${codigo}?t=${token}&novo=1`); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

/* ---------- Cartão de prazos ---------- */
function Prazos() {
  const [dias, setDias] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null), cols = useRef<HTMLDivElement>(null);
  useEffect(() => { setDias(Math.ceil((PEDIDOS_ATE.getTime() - Date.now()) / 864e5)); }, []);
  const posicionar = useCallback(() => {
    const tr = track.current, cs = cols.current; if (!tr || !cs || !tr.offsetWidth) return;
    const o = tr.getBoundingClientRect().left, c = [...cs.children].map((e) => e.getBoundingClientRect());
    const x = [c[0].left - o, c[1].left + c[1].width / 2 - o - 6, c[2].right - o - 12];
    tr.querySelectorAll<HTMLElement>(".m").forEach((e, k) => (e.style.left = x[k] + "px"));
    const seg = (el: HTMLElement | null, a: number, b: number) => { if (el) { el.style.left = a + 16 + "px"; el.style.width = Math.max(0, b - a - 20) + "px"; } };
    seg(tr.querySelector(".dl-run"), x[0], x[1]); seg(tr.querySelector(".dl-dash"), x[1], x[2]);
  }, []);
  useLayoutEffect(() => {
    posicionar(); addEventListener("resize", posicionar); document.fonts?.ready.then(posicionar);
    return () => removeEventListener("resize", posicionar);
  }, [posicionar, dias]);
  const aberto = dias === null || dias >= 0, n = Math.max(0, Math.min(dias ?? 0, 30));
  return (
    <section className="dl" aria-label="Prazos da encomenda">
      <div className="dl-head"><h2>Prazos da encomenda</h2><span className={"dl-pill" + (aberto ? "" : " off")}><i />{aberto ? "Abertas" : "Encerradas"}</span></div>
      <div className="dl-track" ref={track} aria-hidden="true">
        <div className="dl-run">{Array.from({ length: n }, (_, i) => <span key={i} style={{ animationDelay: `${i * 18}ms` }} />)}</div>
        <div className="dl-dash" /><i className="m now" /><i className="m mid" /><i className="m end" />
      </div>
      <div className="dl-cols" ref={cols}>
        <div className="dl-col now">
          {dias === null ? <><span className="dl-k">Faltam</span><b>&nbsp;</b><span className="dl-s">para pedir</span></>
            : dias < 0 ? <><span className="dl-k">Pedidos</span><b>Encerrados</b><span className="dl-s">até o próximo Natal</span></>
            : dias === 0 ? <><span className="dl-k">Corre</span><b>Hoje</b><span className="dl-s">é o último dia</span></>
            : <><span className="dl-k">{dias === 1 ? "Falta" : "Faltam"}</span><b>{dias} {dias === 1 ? "dia" : "dias"}</b><span className="dl-s">para pedir</span></>}
        </div>
        <div className="dl-col mid"><span className="dl-k">Último dia</span><b>15 dez</b><span className="dl-s">dos pedidos</span></div>
        <div className="dl-col end"><span className="dl-k">Entrega</span><b>23 ou 24 dez</b><span className="dl-s">das 10h às 19h</span></div>
      </div>
    </section>
  );
}

/* ---------- Sugestões ---------- */
function Sugestoes({ ids, onAdd }: { ids: string[]; onAdd: (id: string, el: HTMLImageElement | null) => void }) {
  if (!ids.length) return null;
  return (
    <div className="block"><h3>Peça também</h3><div className="up">
      {ids.map((id) => { const p = porId(id)!; return (
        <button key={id} className="upc" type="button" onClick={(e) => onAdd(id, e.currentTarget.querySelector("img"))}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="ph"><img src={img(p.img)} alt="" /><span className="plus">+</span></div>
          <div className="price">{BRL(p.v[0].p)}</div><div className="nm">{p.nome}<br /><span className="muted">{p.v[0].n}</span></div>
        </button>); })}
    </div></div>
  );
}

/* ---------- Folha inferior (com animação de saída) ---------- */
function useFechar(onFechar: () => void) {
  const sheet = useRef<HTMLDivElement>(null), ov = useRef<HTMLDivElement>(null);
  const fechar = useCallback(() => {
    if (!sheet.current || reduz()) return onFechar();
    sheet.current.animate([{ transform: "none" }, { transform: "translateY(100%)" }], { duration: 220, easing: "ease-in", fill: "forwards" });
    ov.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }).finished.then(onFechar);
  }, [onFechar]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && fechar(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [fechar]);
  return { sheet, ov, fechar };
}

function FolhaItem({ p, onFechar, onAdd }: { p: Produto; onFechar: () => void; onAdd: (vi: number, q: number, obs: string, el: HTMLImageElement | null) => void }) {
  const varias = p.v.length > 1;
  const [vi, setVi] = useState(varias ? -1 : 0), [q, setQ] = useState(1), [obs, setObs] = useState("");
  const foto = useRef<HTMLImageElement>(null), req = useRef<HTMLSpanElement>(null);
  const { sheet, ov, fechar } = useFechar(onFechar);
  return (
    <div className="overlay" ref={ov} onClick={(e) => e.target === ov.current && fechar()}>
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-label={p.nome}>
        <div className="sheet-body">
          <div className="sheet-head pad"><button className="x" type="button" aria-label="Fechar" onClick={fechar}>✕</button>
            <span className="eyebrow">{p.ey}</span><h2>{p.nome}</h2><div className="tags">{p.tags}</div></div>
          <div className="scallop on-cream" style={{ backgroundColor: "var(--wine)" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="photo"><img ref={foto} src={img(p.img)} alt={p.nome} /></div>
          <p className="desc pad muted"><span>{p.desc}</span></p>
          <div className="group">
            <div className="group-h pad"><div><b>{varias ? "Como você quer?" : "Tamanho"}</b><small>{varias ? "Escolha 1 opção" : "Opção única"}</small></div>
              <span ref={req} className={"req" + (vi >= 0 ? " done" : "")}>{vi >= 0 ? "✓" : "OBRIGATÓRIO"}</span></div>
            <div className="pad">{p.v.map((v, i) => (
              <label className="opt" key={i} htmlFor={`o${i}`}><span><b style={{ fontWeight: 500 }}>{v.n}</b></span>
                <span style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="price">{BRL(v.p)}</span>
                  <input type="radio" name="var" id={`o${i}`} checked={vi === i} onChange={() => { setVi(i); pop(req.current); }} /></span></label>))}
            </div>
          </div>
          <div className="group">
            <div className="group-h pad"><div><b>Alguma observação?</b><small>Ex.: é para presente, escrever um nome no cartão</small></div><small className="muted">{obs.length}/140</small></div>
            <div className="pad" style={{ paddingBlock: "12px 20px" }}><textarea maxLength={140} aria-label="Observação" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
        </div>
        <div className="sheet-foot pad">
          <div className="stepper"><button type="button" aria-label="Diminuir" disabled={q <= 1} onClick={() => setQ(q - 1)}>−</button><span>{q}</span><button type="button" aria-label="Aumentar" onClick={() => setQ(q + 1)}>+</button></div>
          <button className="btn" type="button" style={{ flex: 1 }} disabled={vi < 0} onClick={() => { onAdd(vi, q, obs.trim(), foto.current); fechar(); }}>
            <span>Adicionar</span><span>{BRL((vi >= 0 ? p.v[vi].p : menorPreco(p)) * q)}</span></button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Dados de entrega ---------- */
export type Form = { dia: string; faixa: string; modo: "entrega" | "retirada"; nome: string; whatsapp: string; cep: string; numero: string; rua: string; bairro: string; complemento: string; pagamento: "pix" | "cartao" };
const FORM_VAZIO: Form = { dia: "", faixa: "", modo: "entrega", nome: "", whatsapp: "", cep: "", numero: "", rua: "", bairro: "", complemento: "", pagamento: "pix" };
let formAtual: Form = FORM_VAZIO;
let taxaAtual: { km: number; valor: number } | null = null;

function Dados({ className, subtotal, onVoltar, onRevisar, avisar }: { className: string; subtotal: number; onVoltar: () => void; onRevisar: () => void; avisar: (m: string) => void }) {
  const [f, setF] = useState<Form>(formAtual);
  const [taxa, setTaxa] = useState<{ km: number; valor: number } | null | "carregando">(taxaAtual);
  const [erro, setErro] = useState("");
  const set = (k: keyof Form, v: string) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => { formAtual = f; try { localStorage.setItem("sv_dados", JSON.stringify({ nome: f.nome, whatsapp: f.whatsapp })); } catch {} }, [f]);
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem("sv_dados") || "{}"); if (!formAtual.nome && d.nome) setF((x) => ({ ...x, nome: d.nome, whatsapp: d.whatsapp || "" })); } catch {} }, []);

  // CEP → rua e bairro
  useEffect(() => {
    const c = f.cep.replace(/\D/g, ""); if (c.length !== 8) return;
    let vivo = true;
    fetch(`/api/cep?cep=${c}`).then((r) => r.json()).then((j) => { if (vivo && j) setF((x) => ({ ...x, rua: x.rua || j.rua, bairro: j.bairro || x.bairro })); }).catch(() => {});
    return () => { vivo = false; };
  }, [f.cep]);

  // taxa estimada pelo endereço
  useEffect(() => {
    if (f.modo !== "entrega" || !f.bairro.trim()) { setTaxa(null); taxaAtual = null; return; }
    setTaxa("carregando");
    const t = setTimeout(() => {
      fetch("/api/taxa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cep: f.cep, rua: f.rua, numero: f.numero, bairro: f.bairro }) })
        .then((r) => r.json()).then((j) => { setTaxa(j); taxaAtual = j; }).catch(() => setTaxa(null));
    }, 500);
    return () => clearTimeout(t);
  }, [f.modo, f.cep, f.rua, f.numero, f.bairro]);

  useEffect(() => {
    const h = () => {
      const faltam: string[] = [];
      if (!f.dia) faltam.push("o dia"); if (!f.faixa) faltam.push("o horário");
      if (!f.nome.trim()) faltam.push("seu nome"); if (f.whatsapp.replace(/\D/g, "").length < 10) faltam.push("seu WhatsApp com DDD");
      if (f.modo === "entrega" && (!f.rua.trim() || !f.numero.trim() || !f.bairro.trim())) faltam.push("o endereço");
      if (faltam.length) { const m = "Falta preencher " + faltam.join(", ").replace(/, ([^,]*)$/, " e $1") + "."; setErro(m); avisar(m); return; }
      setErro(""); onRevisar();
    };
    document.addEventListener("sv:revisar", h); return () => document.removeEventListener("sv:revisar", h);
  }, [f, onRevisar, avisar]);

  const ent = f.modo === "entrega", tx = taxa && taxa !== "carregando" ? taxa : null, s = subtotal * SINAL;
  const radio = (nome: keyof Form, valor: string, titulo: string, sub: string) => (
    <label key={valor}><input type="radio" name={nome} checked={f[nome] === valor} onChange={() => set(nome, valor)} /><b>{titulo}</b><small>{sub}</small></label>
  );
  return (
    <section className={className}>
      <div className="top pad"><button className="back" type="button" aria-label="Voltar" onClick={onVoltar}>‹</button><h2>Entrega</h2><span /></div>
      <form className="pad" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="block"><h3>Quando você quer receber?</h3>
          <div className="seg">{DIAS.map((d) => radio("dia", d.id, d.nome, d.sub))}</div>
          <div className="seg" style={{ marginTop: 10, gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>{FAIXAS.map((x) => radio("faixa", x.id, x.nome, x.sub))}</div>
        </div>
        <div className="block"><h3>Como vai chegar?</h3>
          <div className="seg">{radio("modo", "entrega", "Entrega", "Motorista de app")}{radio("modo", "retirada", "Retirada", "Local combinado pelo WhatsApp")}</div>
        </div>
        <div className="block"><h3>Seus dados</h3>
          <div className="field"><label htmlFor="nome">Nome</label><input id="nome" autoComplete="name" value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
          <div className="field"><label htmlFor="zap">WhatsApp</label><input id="zap" inputMode="tel" autoComplete="tel" placeholder="(21) 99999-9999" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          {ent ? (<>
            <div className="row2">
              <div className="field"><label htmlFor="cep">CEP</label><input id="cep" inputMode="numeric" autoComplete="postal-code" value={f.cep} onChange={(e) => set("cep", e.target.value)} /></div>
              <div className="field"><label htmlFor="num">Número</label><input id="num" value={f.numero} onChange={(e) => set("numero", e.target.value)} /></div>
            </div>
            <div className="field"><label htmlFor="rua">Rua</label><input id="rua" autoComplete="address-line1" value={f.rua} onChange={(e) => set("rua", e.target.value)} /></div>
            <div className="row2">
              <div className="field"><label htmlFor="bairro">Bairro</label><input id="bairro" value={f.bairro} onChange={(e) => set("bairro", e.target.value)} /></div>
              <div className="field"><label htmlFor="comp">Complemento</label><input id="comp" value={f.complemento} onChange={(e) => set("complemento", e.target.value)} /></div>
            </div>
            <div className="fee">
              <div><b style={{ fontWeight: 600 }}>Taxa de entrega</b><div className="km">{taxa === "carregando" ? "Calculando…" : tx ? `cerca de ${tx.km} km da doceria` : "Preencha o endereço para calcular. Se não conseguirmos, passamos o valor no WhatsApp."}</div></div>
              {tx && <span className="price">{BRL(tx.valor)}</span>}
            </div>
          </>) : (
            <div className="note"><b>Retirada só com orientação.</b> Por segurança, o local e o horário da retirada são combinados com você pelo WhatsApp. Depois de enviar o pedido, a gente te chama com as instruções. Não venha sem falar com a gente antes.</div>
          )}
        </div>
        <div className="block"><h3>Como vai pagar?</h3>
          <div className="seg">{radio("pagamento", "pix", "Pix", "Enviamos a chave no WhatsApp")}{radio("pagamento", "cartao", "Link de cartão", "Enviamos o link no WhatsApp")}</div>
          <div className="totals" style={{ marginTop: 16 }}>
            <div><span>Produtos</span><span className="price">{BRL(subtotal)}</span></div>
            {ent && <div><span>Entrega</span><span className="price">{tx ? BRL(tx.valor) : <span className="muted" style={{ fontFamily: "var(--f-body)" }}>a confirmar</span>}</span></div>}
            <div className="grand sep"><span>Agora: sinal de 50%</span><span className="price">{BRL(s)}</span></div>
            <div><span>{ent ? "No dia da entrega, antes de sair" : "Na retirada"}</span><span className="price">{BRL(subtotal - s + (ent && tx ? tx.valor : 0))}{ent && !tx ? " + entrega" : ""}</span></div>
          </div>
          <div className="note">{ent
            ? <>O sinal garante sua data. O motorista de aplicativo não recebe pagamentos, então no dia da entrega mandamos no WhatsApp o restante com a taxa. <b>A encomenda sai assim que o pagamento cair.</b></>
            : <>O sinal garante sua data. O restante você paga na retirada.</>}</div>
          <p className="err" role="alert">{erro}</p>
        </div>
      </form>
    </section>
  );
}

/* ---------- Revisão e envio ---------- */
function Revisao({ linhas, subtotal, onFechar, onEnviado }: { linhas: { p: Produto; v: { n: string; p: number }; qtd: number; obs: string; produtoId: string; vi: number }[]; subtotal: number; onFechar: () => void; onEnviado: (codigo: string, token: string) => void }) {
  const f = formAtual, ent = f.modo === "entrega", tx = ent ? taxaAtual : null;
  const [aceite, setAceite] = useState(false), [enviando, setEnviando] = useState(false), [erro, setErro] = useState("");
  const { sheet, ov, fechar } = useFechar(onFechar);
  const qtd = linhas.reduce((a, l) => a + l.qtd, 0), s = subtotal * SINAL;
  async function enviar() {
    setEnviando(true); setErro("");
    try {
      const r = await fetch("/api/pedidos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        itens: linhas.map((l) => ({ produtoId: l.produtoId, vi: l.vi, qtd: l.qtd, obs: l.obs })),
        nome: f.nome, whatsapp: f.whatsapp, modo: f.modo, dia: f.dia, faixa: f.faixa, pagamento: f.pagamento, aceite,
        endereco: ent ? { cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento, bairro: f.bairro } : null,
      }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "Não deu para enviar. Tente de novo.");
      onEnviado(j.codigo, j.token);
    } catch (e) { setErro((e as Error).message); setEnviando(false); }
  }
  return (
    <div className="overlay" ref={ov} onClick={(e) => e.target === ov.current && fechar()}>
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-label="Revise sua encomenda">
        <div className="sheet-body pad" style={{ paddingBlock: "22px 8px" }}>
          <h2 style={{ fontSize: 28, textAlign: "center", marginBottom: 10 }}>Revise sua encomenda</h2>
          <div className="rv"><span className="ic">◷</span><div><b>{DIAS.find((d) => d.id === f.dia)?.nome}, {FAIXAS.find((x) => x.id === f.faixa)?.nome}</b><small>{ent ? "Entrega por motorista de app" : "Retirada: local e horário combinados pelo WhatsApp"}</small></div></div>
          {ent && <div className="rv"><span className="ic">⌂</span><div><b>{f.rua}, {f.numero}</b><small>{[f.complemento, f.bairro].filter(Boolean).join(" · ")} · entrega {tx ? BRL(tx.valor) : "a confirmar"}</small></div></div>}
          <div className="rv"><span className="ic">✎</span><div><b>{qtd} {qtd > 1 ? "itens" : "item"} · {BRL(subtotal)}</b><small>{linhas.map((l) => `${l.qtd}× ${l.p.nome} (${l.v.n})`).join(", ")}</small></div></div>
          <div className="rv"><span className="ic">$</span><div><b>Agora: sinal de {BRL(s)} por {f.pagamento === "pix" ? "Pix" : "link de cartão"}</b><small>{ent ? `Depois, antes de sair: ${BRL(subtotal - s + (tx?.valor ?? 0))}${tx ? "" : " + entrega"}` : `Na retirada: ${BRL(subtotal - s)}`}</small></div></div>
          <label className="opt" htmlFor="aceite" style={{ border: 0, alignItems: "flex-start", justifyContent: "flex-start" }}>
            <input type="checkbox" id="aceite" checked={aceite} onChange={(e) => setAceite(e.target.checked)} style={{ borderRadius: 6, marginTop: 2 }} />
            <span style={{ fontSize: 13 }}>{ent ? "Entendi que pago o sinal agora e, no dia da entrega, o restante com a taxa antes de a encomenda sair. Sem esse pagamento, ela não sai." : "Entendi que pago o sinal agora, o restante na retirada, e que o local da retirada é combinado pelo WhatsApp."}</span>
          </label>
          {erro && <p className="err" role="alert">{erro}</p>}
        </div>
        <div className="sheet-foot pad" style={{ flexDirection: "column" }}>
          <button className="btn wide" type="button" style={{ justifyContent: "center" }} disabled={!aceite || enviando} onClick={enviar}>{enviando ? "Enviando…" : "Enviar encomenda"}</button>
          <button className="link" type="button" style={{ padding: 8 }} onClick={fechar}>Alterar</button>
        </div>
      </div>
    </div>
  );
}
