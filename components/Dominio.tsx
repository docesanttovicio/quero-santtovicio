"use client";

import { useEffect } from "react";

const OFICIAL = "https://quero.santtovicio.com.br";

// Quem abrir o endereço antigo (.vercel.app) vai para o domínio oficial.
// Só a página muda de endereço; os botões e chamadas internas continuam funcionando em qualquer endereço.
export default function Dominio() {
  useEffect(() => {
    if (location.hostname.endsWith(".vercel.app")) location.replace(OFICIAL + location.pathname + location.search);
  }, []);
  return null;
}
