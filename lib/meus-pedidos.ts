"use client";

import { useEffect, useState } from "react";
import { etapasDe, nomeDia, nomeFaixa, type PedidoPublico } from "./regras";

// Pedidos feitos neste aparelho (como a aba "Pedidos" do iFood). Fica só no navegador do cliente.
type Salvo = { codigo: string; token: string; visto: number };
const CHAVE = "sv_meus_pedidos";

export function lerSalvos(): Salvo[] {
  try { const l = JSON.parse(localStorage.getItem(CHAVE) || "[]"); return Array.isArray(l) ? l : []; } catch { return []; }
}
function gravar(l: Salvo[]) { try { localStorage.setItem(CHAVE, JSON.stringify(l.slice(0, 20))); } catch {} }

export function lembrarPedido(codigo: string, token: string) {
  // Mesmo código com outro token = pedido antigo (de antes de zerar a base); troca pelo novo.
  const l = lerSalvos();
  if (!l.some((x) => x.codigo === codigo && x.token === token)) gravar([{ codigo, token, visto: 0 }, ...l.filter((x) => x.codigo !== codigo)]);
}
// "visto" = quantas mensagens o cliente já viu; tudo que passar disso é novidade.
export function marcarVisto(codigo: string, n: number) {
  gravar(lerSalvos().map((x) => (x.codigo === codigo ? { ...x, visto: Math.max(x.visto, n) } : x)));
}

export type PedidoCliente = PedidoPublico & { pix?: string | null; zapLoja?: string | null };
export type Resumo = { codigo: string; token: string; titulo: string; quando: string; finalizado: boolean; novidade: boolean; criadoEm: string; p: PedidoCliente };

// Busca a situação de cada pedido salvo; repete a cada minuto e quando a tela volta a ficar visível.
export function useMeusPedidos() {
  const [lista, setLista] = useState<Resumo[] | null>(null);
  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      const salvos = lerSalvos();
      const r = await Promise.all(salvos.map(async (s) => {
        try {
          const res = await fetch(`/api/pedidos/${s.codigo}?t=${encodeURIComponent(s.token)}`, { cache: "no-store" });
          if (!res.ok) return null;
          const p = (await res.json()) as PedidoCliente;
          const S = etapasDe(p);
          return { codigo: p.codigo, token: s.token, titulo: p.cancelado ? "Cancelada" : S[p.etapa].t, quando: `${nomeDia(p.dia)}, ${nomeFaixa(p.faixa)}`,
            finalizado: !!p.cancelado || p.etapa >= S.length - 1, novidade: p.historico.length > s.visto, criadoEm: p.criadoEm, p } as Resumo;
        } catch { return null; }
      }));
      if (vivo) setLista(r.filter((x): x is Resumo => !!x));
    };
    buscar();
    const i = setInterval(buscar, 60000);
    const vis = () => document.visibilityState === "visible" && buscar();
    document.addEventListener("visibilitychange", vis);
    return () => { vivo = false; clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return lista;
}
