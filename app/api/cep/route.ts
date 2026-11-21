import { NextResponse } from "next/server";

// Preenche rua e bairro a partir do CEP (ViaCEP, gratuito).
export async function GET(req: Request) {
  const cep = (new URL(req.url).searchParams.get("cep") ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return NextResponse.json(null);
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { next: { revalidate: 86400 } });
    const j = await r.json();
    if (j.erro) return NextResponse.json(null);
    return NextResponse.json({ rua: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" });
  } catch {
    return NextResponse.json(null);
  }
}
