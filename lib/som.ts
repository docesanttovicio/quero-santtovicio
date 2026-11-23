"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Alarme sonoro do painel.
// - A escolha (ligado/desligado) fica salva neste aparelho e vale ao reabrir a página. Começa ligado.
// - O navegador só deixa tocar som depois de um clique ou toque na página. Por isso o som é
//   "liberado" no primeiro clique em qualquer lugar; até lá, `liberado` fica false e o botão avisa.

const CHAVE = "sv_som";

export type Som = { ligado: boolean; liberado: boolean; mudar: (v: boolean) => void; liberar: () => void; bipe: () => void };

export function useSom(): Som {
  const [ligado, setLigado] = useState(true);
  const [liberado, setLiberado] = useState(false);
  const ctx = useRef<AudioContext | null>(null);

  const contexto = useCallback(() => {
    if (!ctx.current) {
      try {
        const c = new AudioContext();
        c.onstatechange = () => setLiberado(c.state === "running");
        ctx.current = c;
        setLiberado(c.state === "running");
      } catch { return null; }
    }
    return ctx.current;
  }, []);

  const bipe = useCallback(() => {
    const c = ctx.current;
    if (!c || c.state !== "running") return;
    const t = c.currentTime;
    [0, 0.18].forEach((d) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15);
      o.connect(g).connect(c.destination);
      o.start(t + d); o.stop(t + d + 0.16);
    });
  }, []);

  // Libera o som (precisa vir de um clique). Toca um bipe curto para confirmar que está funcionando.
  const liberar = useCallback(() => {
    const c = contexto();
    c?.resume().then(bipe).catch(() => {});
  }, [contexto, bipe]);

  useEffect(() => {
    try { setLigado(localStorage.getItem(CHAVE) !== "0"); } catch {}
    contexto()?.resume().catch(() => {}); // alguns navegadores já deixam, sem clique
    const destravar = () => { const c = contexto(); if (c && c.state !== "running") c.resume().catch(() => {}); };
    const eventos = ["pointerdown", "keydown", "touchend"];
    eventos.forEach((e) => document.addEventListener(e, destravar, true));
    document.addEventListener("visibilitychange", destravar);
    return () => {
      eventos.forEach((e) => document.removeEventListener(e, destravar, true));
      document.removeEventListener("visibilitychange", destravar);
    };
  }, [contexto]);

  const mudar = useCallback((v: boolean) => {
    setLigado(v);
    try { localStorage.setItem(CHAVE, v ? "1" : "0"); } catch {}
    if (v) liberar();
  }, [liberar]);

  return { ligado, liberado, mudar, liberar, bipe };
}
