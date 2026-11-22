"use client";

import { useEffect, useState } from "react";
import { CATEGORIAS, type Produto } from "@/lib/catalogo";

// Edição do cardápio: nomes, preços, descrição, selo, esgotado e ocultar. Vale na hora para os próximos pedidos.
export default function Cardapio({ avisar }: { avisar: (m: string) => void }) {
  const [lista, setLista] = useState<Produto[] | null>(null);
  const [original, setOriginal] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/painel/config", { cache: "no-store" }).then((r) => r.json()).then((j) => { setLista(j.config.produtos); setOriginal(JSON.stringify(j.config.produtos)); });
  }, []);
  if (!lista) return <div className="empty">Carregando cardápio…</div>;
  const mudou = JSON.stringify(lista) !== original;
  const muda = (id: string, f: (p: Produto) => Produto) => setLista((l) => l!.map((p) => (p.id === id ? f({ ...p }) : p)));

  async function salvar() {
    setSalvando(true);
    const r = await fetch("/api/painel/config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ produtos: lista }) });
    const j = await r.json(); setSalvando(false);
    if (!r.ok) return avisar(j.erro || "Não deu para salvar.");
    setLista(j.config.produtos); setOriginal(JSON.stringify(j.config.produtos)); avisar("Cardápio salvo. Já vale na loja ✓");
  }

  return (
    <>
      <div className="dash-head">
        <div><h1>Cardápio</h1><p>Mude preços, marque o que esgotou ou esconda um item. Vale na hora para os próximos pedidos; os pedidos já feitos não mudam.</p></div>
      </div>
      {CATEGORIAS.map((c) => (
        <div key={c.id} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>{c.nome}</h3>
          <div className="tbl-wrap">
            {lista.filter((p) => p.cat === c.id).map((p) => (
              <div key={p.id} className={"prod-row" + (p.oculto ? " oculto" : "")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/${p.img}.jpg`} alt="" />
                <div style={{ display: "grid", gap: 6 }}>
                  <label className="field2">Nome<input value={p.nome} onChange={(e) => muda(p.id, (x) => ({ ...x, nome: e.target.value }))} /></label>
                  <button className="link small" style={{ justifySelf: "start" }} onClick={() => setAberto(aberto === p.id ? null : p.id)}>{aberto === p.id ? "Fechar detalhes" : "Editar descrição e selo"}</button>
                </div>
                <div className="vars">
                  {p.v.map((v, i) => (
                    <div key={i}>
                      <label className="field2">{i === 0 ? "Opção" : <span className="sr" />}<input value={v.n} onChange={(e) => muda(p.id, (x) => ({ ...x, v: x.v.map((y, k) => (k === i ? { ...y, n: e.target.value } : y)) }))} aria-label="Nome da opção" /></label>
                      <label className="field2">{i === 0 ? "Preço (R$)" : <span className="sr" />}<input type="number" min="0" step="0.5" value={v.p} onChange={(e) => muda(p.id, (x) => ({ ...x, v: x.v.map((y, k) => (k === i ? { ...y, p: Number(e.target.value) } : y)) }))} aria-label="Preço" /></label>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 10, paddingTop: 18 }}>
                  <label className="switch"><input type="checkbox" checked={!!p.esgotado} onChange={(e) => muda(p.id, (x) => ({ ...x, esgotado: e.target.checked }))} />Esgotado</label>
                  <label className="switch"><input type="checkbox" checked={!!p.oculto} onChange={(e) => muda(p.id, (x) => ({ ...x, oculto: e.target.checked }))} />Esconder da loja</label>
                </div>
                {aberto === p.id && (
                  <div style={{ gridColumn: "2 / -1", display: "grid", gap: 8 }}>
                    <label className="field2">Descrição<textarea rows={3} value={p.desc} onChange={(e) => muda(p.id, (x) => ({ ...x, desc: e.target.value }))} /></label>
                    <div className="grid3">
                      <label className="field2">Chamada<input value={p.tags} onChange={(e) => muda(p.id, (x) => ({ ...x, tags: e.target.value }))} /></label>
                      <label className="field2">Selo nos destaques (vazio = fora)<input value={p.dest ?? ""} onChange={(e) => muda(p.id, (x) => ({ ...x, dest: e.target.value }))} /></label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="savebar">
        {mudou && <button className="btn outline" onClick={() => setLista(JSON.parse(original))}>Desfazer</button>}
        <button className="btn" disabled={!mudou || salvando} onClick={salvar}>{salvando ? "Salvando…" : mudou ? "Salvar cardápio" : "Tudo salvo"}</button>
      </div>
    </>
  );
}
