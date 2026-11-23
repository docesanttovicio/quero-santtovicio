"use client";

// Conta os acessos da loja de forma anônima: um código aleatório por aparelho, sem nome nem IP.
// Aparelhos que já entraram no painel (equipe) não são contados.

const ID = "sv_vid", EQUIPE = "sv_equipe";

function visitante(): string | null {
  try {
    if (localStorage.getItem(EQUIPE)) return null;
    let v = localStorage.getItem(ID);
    if (!v) { v = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem(ID, v); }
    return v;
  } catch { return null; }
}

// Cada passo conta uma vez por sessão (abrir o mesmo produto 5 vezes = 1).
export function rastrear(tipo: "visita" | "produto" | "sacola" | "dados", produto?: string) {
  const v = visitante();
  if (!v) return;
  const chave = `sv_r_${tipo}_${produto ?? ""}`;
  try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, "1"); } catch {}
  const q = new URLSearchParams(location.search);
  const corpo = JSON.stringify({ v, t: tipo, p: produto, ...(tipo === "visita" ? { u: q.get("utm_source") ?? q.get("ref") ?? "", r: document.referrer } : {}) });
  try {
    if (navigator.sendBeacon?.("/api/acesso", new Blob([corpo], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/acesso", { method: "POST", headers: { "content-type": "application/json" }, body: corpo, keepalive: true }).catch(() => {});
}

// Chamado quando o painel abre: este aparelho é da equipe e para de ser contado.
export function marcarEquipe() {
  try { localStorage.setItem(EQUIPE, "1"); } catch {}
}
