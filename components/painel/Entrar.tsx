"use client";

import { useState } from "react";

// Tela de senha do painel. Fundo com a foto da mesa de Natal e um cartão centralizado (celular e computador).
export default function Entrar({ onEntrou }: { onEntrou: () => void }) {
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!senha) return setErro("Digite a senha.");
    setErro(""); setEnviando(true);
    try {
      const r = await fetch("/api/painel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ senha }) });
      if (r.ok) return onEntrou();
      setErro((await r.json().catch(() => ({}))).erro || "Não deu para entrar.");
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="entrar">
      <form className="entrar-card" onSubmit={entrar} noValidate>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="entrar-icone" src="/icon.svg" alt="" width={64} height={64} />
        <span className="eyebrow entrar-eyebrow">Santto Vício</span>
        <h1>Painel da loja</h1>
        <p className="entrar-sub">Entre para ver e cuidar das encomendas.</p>
        <label className="entrar-label" htmlFor="senha">Senha</label>
        <div className="entrar-campo">
          <input id="senha" type={ver ? "text" : "password"} autoComplete="current-password" autoFocus value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(""); }} aria-invalid={!!erro} aria-describedby={erro ? "senha-erro" : undefined} />
          <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Esconder senha" : "Mostrar senha"}>{ver ? "Esconder" : "Mostrar"}</button>
        </div>
        {erro && <p className="entrar-erro" id="senha-erro" role="alert">{erro}</p>}
        <button className="btn wide entrar-btn" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
        <p className="entrar-rodape">Acesso só para a equipe da loja.</p>
      </form>
    </div>
  );
}
