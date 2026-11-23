"use client";

import type { Som } from "@/lib/som";

// Botão do alarme sonoro: liga e desliga, e avisa quando o navegador ainda não liberou o som.
export default function BotaoSom({ som }: { som: Som }) {
  const travado = som.ligado && !som.liberado;
  const [titulo, sub] = !som.ligado
    ? ["Som desligado", "Encomendas chegam sem aviso"]
    : travado
      ? ["Som ligado", "Clique para liberar o som"]
      : ["Som ligado", "Toca a cada encomenda"];
  return (
    <button
      type="button" role="switch" aria-checked={som.ligado}
      className={"som-btn" + (som.ligado ? " on" : "") + (travado ? " travado" : "")}
      onClick={() => (travado ? som.liberar() : som.mudar(!som.ligado))}
    >
      <span className="som-ic" aria-hidden>{som.ligado ? "🔔" : "🔕"}</span>
      <span className="som-txt"><b>{titulo}</b><small>{sub}</small></span>
      <span className="som-sw" aria-hidden />
    </button>
  );
}
