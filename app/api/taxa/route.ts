import { NextResponse } from "next/server";
import { estimarTaxa } from "@/lib/taxa";

// Estimativa da taxa enquanto o cliente preenche o endereço. Não revela o endereço da doceria.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
  const est = await estimarTaxa({ cep: s(b.cep), rua: s(b.rua), numero: s(b.numero), bairro: s(b.bairro) });
  return NextResponse.json(est ? { km: est.km, valor: est.valor } : null);
}
