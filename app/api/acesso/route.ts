import { NextResponse } from "next/server";
import { TIPOS, dispositivoDe, ehRobo, origemDe, registrarAcesso, type Tipo } from "@/lib/acessos";

// Recebe os passos dos visitantes da loja (enviados pelo navegador, sem dados pessoais).
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (ehRobo(ua)) return new NextResponse(null, { status: 204 });
  const b = await req.json().catch(() => null);
  const visitante = String(b?.v ?? "");
  const tipo = String(b?.t ?? "") as Tipo;
  if (!/^[a-z0-9]{8,40}$/i.test(visitante) || !TIPOS.includes(tipo)) return new NextResponse(null, { status: 400 });
  const produto = /^[a-z0-9_-]{1,40}$/i.test(String(b?.p ?? "")) ? String(b.p) : null;
  const host = req.headers.get("host") ?? "";
  try {
    await registrarAcesso({
      visitante, tipo, produto,
      origem: tipo === "visita" ? origemDe(String(b?.u ?? "").slice(0, 60), String(b?.r ?? "").slice(0, 300), host) : null,
      dispositivo: tipo === "visita" ? dispositivoDe(ua) : null,
    });
  } catch (e) { console.error("[acessos]", e); }
  return new NextResponse(null, { status: 204 });
}
