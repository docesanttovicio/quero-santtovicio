import { NextResponse } from "next/server";
import { estimarTaxa } from "@/lib/taxa";
import { lerConfig } from "@/lib/config";
import { permitir, quem } from "@/lib/limite";

// Estimativa da taxa enquanto o cliente preenche o endereço (já com o ajuste do dia escolhido).
// Não revela o endereço da doceria.
export async function POST(req: Request) {
  // Cada cálculo consulta o Google Maps (que é cobrado): até 60 por hora do mesmo aparelho/rede.
  // Passou disso, a taxa aparece como "a confirmar" e a loja combina pelo WhatsApp.
  if (!(await permitir(`taxa:${quem(req)}`, 60, 60))) return NextResponse.json(null);
  const b = await req.json().catch(() => ({}));
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
  const { taxa } = await lerConfig();
  const est = await estimarTaxa({ cep: s(b.cep), rua: s(b.rua), numero: s(b.numero), bairro: s(b.bairro) }, taxa, s(b.dia) || undefined);
  return NextResponse.json(est ? { km: est.km, valor: est.valor } : null);
}
