import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Acesso ao painel por senha (PAINEL_SENHA). O cookie guarda só uma assinatura com validade.
const COOKIE = "sv_painel";
const DIAS = 30;
const segredo = () => process.env.PAINEL_SEGREDO || process.env.PAINEL_SENHA || "";

const assinar = (exp: number) => createHmac("sha256", segredo()).update(String(exp)).digest("hex");

export function senhaConfere(s: string) {
  const ok = process.env.PAINEL_SENHA;
  if (!ok) return false;
  const a = Buffer.from(s), b = Buffer.from(ok);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function entrar() {
  const exp = Date.now() + DIAS * 864e5;
  (await cookies()).set(COOKIE, `${exp}.${assinar(exp)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DIAS * 86400,
  });
}

export async function sair() {
  (await cookies()).delete(COOKIE);
}

export async function logado() {
  if (!segredo()) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(assinar(Number(exp)));
  return a.length === b.length && timingSafeEqual(a, b);
}
