import Loja from "@/components/Loja";
import { lerConfig } from "@/lib/config";

// Sempre lê o cardápio atual (preços, esgotados e ocultos mudam pelo painel).
export const dynamic = "force-dynamic";

export default async function Home() {
  const { produtos } = await lerConfig();
  return <Loja produtos={produtos.filter((p) => !p.oculto)} />;
}
