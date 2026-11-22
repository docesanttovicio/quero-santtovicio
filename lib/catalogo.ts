// Cardápio de Natal 2026. Preços conferidos no servidor a cada pedido: o que vale é o que está aqui.

export type Variante = { n: string; p: number };
export type Produto = {
  id: string;
  cat: string;
  ey: string; // chamada ("O Extraordinário")
  nome: string;
  tags: string;
  desc: string;
  img: string;
  v: Variante[];
  lim?: boolean; // quantidade limitada
  dest?: string; // selo nos destaques
  esgotado?: boolean; // aparece, mas não dá para pedir
  oculto?: boolean; // some do cardápio
};

export const CATEGORIAS = [
  { id: "brownies", nome: "Brownies e cookies", lead: "Os famosos da casa. Saem em fornadas contadas." },
  { id: "bolos", nome: "Bolos e tortas doces", lead: "Para levar inteiro para a ceia ou pedir em fatias." },
  { id: "presentes", nome: "Para presentear", lead: "Prontos para entregar a quem você ama." },
  { id: "ceia", nome: "Salgados da ceia", lead: "Inteiros, para servir a família toda." },
];

export const PRODUTOS: Produto[] = [
  { id: "brownie", cat: "brownies", ey: "O Extraordinário", nome: "Brownie", tags: "Fofinho · Chocolatudo · Delicioso", desc: "O mais famoso do RJ. Pode ser encomendado em pedaços ou fornada inteira. Quantidades são limitadas!", img: "brownie", v: [{ n: "Pedaço", p: 18 }, { n: "Fornada inteira", p: 120 }], lim: true, dest: "Mais pedido" },
  { id: "mini", cat: "brownies", ey: "Os Extraordinários", nome: "Mini Brownies com Nutella", tags: "Fofinho · Nutella · Viciante", desc: "O brownie mais famoso do RJ em bits banhados em Nutella. Você encomenda pra dividir e, na primeira mordida, já começa a rever os planos.", img: "minibrownies", v: [{ n: "Caixa com 10 unidades", p: 70 }], lim: true },
  { id: "cookie", cat: "brownies", ey: "O Magnífico", nome: "Cookie", tags: "Crocante por fora · Macio por dentro", desc: "Uma combinação sagrada entre a intensidade do chocolate que derrete e a crocância rústica das nozes.", img: "cookie", v: [{ n: "Unidade", p: 18 }] },
  { id: "cookien", cat: "brownies", ey: "O Magnífico", nome: "Cookie recheado com Nutella", tags: "Crocante por fora · Transbordando recheio", desc: "Uma combinação irresistível entre a crocância do cookie e a cremosidade da Nutella que se revela na primeira mordida.", img: "cookie-nutella", v: [{ n: "Unidade", p: 25 }] },
  { id: "bigbits", cat: "brownies", ey: "O Tentador", nome: "Big Bits", tags: "Viciante · Crocante · Delicioso", desc: "Você pega um pra provar e um punhado pra garantir. Nossos bits de chocolate e nozes não nasceram pra ser comidos de um em um.", img: "bigbits", v: [{ n: "Uma dúzia", p: 15 }] },
  { id: "matilda", cat: "bolos", ey: "O Irresistível", nome: "Matilda", tags: "Chocolatudo · Chocolatudo · Chocolatudo", desc: "O famoso bolo Matilda, do nosso jeito: massa levinha e recheio cremoso em uma combinação chocolatuda que conquista na primeira garfada.", img: "matilda", v: [{ n: "Fatia", p: 20 }, { n: "Bolo inteiro", p: 180 }], lim: true, dest: "Estrela do Natal" },
  { id: "alema", cat: "bolos", ey: "A Fascinante", nome: "Torta Alemã", tags: "Cremosidade · Crocância · Abraço", desc: "Creme, biscoitos e chocolate em uma combinação irresistível. A primeira mordida conquista. A última deixa saudade.", img: "alema", v: [{ n: "Fatia", p: 18 }, { n: "Torta inteira", p: 120 }] },
  { id: "muffin", cat: "bolos", ey: "O Sublime", nome: "Muffin de Maçã Verde", tags: "Crocante · Macio · Charmoso", desc: "Tudo o que a gente ama na torta de maçã verde, agora em um muffin: topo crocante, interior macio e um único defeito, acaba antes da vontade.", img: "muffin", v: [{ n: "Unidade", p: 18 }, { n: "Inteiro", p: 120 }] },
  { id: "lata", cat: "presentes", ey: "O Magnífico", nome: "Lata de Cookie com Nutella", tags: "320 g · Chocolate 70% · Nozes", desc: "320 g do nosso magnífico cookie para presentear quem você ama. Chocolate 70%, nozes e um belo recheio de Nutella. Quantidades limitadas!", img: "lata-nutella", v: [{ n: "Lata 320 g", p: 85 }], lim: true, dest: "Presente" },
  { id: "bacalhau", cat: "ceia", ey: "A deliciosa torta de", nome: "Bacalhau", tags: "Cremosa · Muito recheada · Sem igual", desc: "Nossa torta de bacalhau aproxima até parente distante. Receita portuguesa e recheio generoso: já ganhou a família e chega à sua ceia como quem é de casa.", img: "bacalhau", v: [{ n: "Inteira", p: 300 }] },
  { id: "empadao", cat: "ceia", ey: "O verdadeiro coringa", nome: "Empadão de Frango", tags: "Muito frango · Cremossão · Delicioso", desc: "Nosso empadão de frango tem um jeito muito próprio de pedir silêncio: é só chegar à mesa que a conversa dá lugar à primeira garfada.", img: "empadao", v: [{ n: "Inteiro", p: 110 }] },
];

export const SUGESTOES = ["bigbits", "cookien", "cookie", "mini", "lata"];

export const porId = (id: string) => PRODUTOS.find((p) => p.id === id);
export const menorPreco = (p: Produto) => Math.min(...p.v.map((x) => x.p));
