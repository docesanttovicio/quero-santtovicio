# Santto Vício · Encomendas

Sistema de encomendas de Natal: loja para o cliente, acompanhamento do pedido e painel da loja.

| Endereço | Para quem | O que faz |
|---|---|---|
| `/` | Cliente | Cardápio, sacola, entrega e envio do pedido |
| `/pedido/SV-0001?t=…` | Cliente | Acompanhamento ao vivo (o link vai no WhatsApp) |
| `/painel` | Loja | Pedidos com alarme, taxa, etapas e botão de WhatsApp |

## Rodar no computador (modo teste)

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem Supabase configurado, os pedidos ficam em `data/pedidos.json`.
A senha do painel está em `.env.local` (`PAINEL_SENHA`).

## Colocar no ar

1. **Banco (Supabase, grátis):** crie um projeto em supabase.com. Em *SQL Editor*, rode `supabase/schema.sql`.
   Em *Project Settings → API*, copie a *Project URL* e a chave *service_role*.
2. **Site (Vercel, grátis):** suba esta pasta para um repositório no GitHub e importe na vercel.com.
   Em *Settings → Environment Variables*, cadastre as variáveis do `.env.example`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAINEL_SENHA`, `PAINEL_SEGREDO`, `SITE_URL`, `PIX_CHAVE`, `ORIGEM_ENDERECO`…).
3. **Distância exata (opcional):** crie uma chave da *Distance Matrix API* no Google Cloud e coloque em `GOOGLE_MAPS_KEY`.
   Sem ela, a taxa usa a tabela de bairros de `lib/taxa.ts`.
4. **Aviso no celular (opcional):** crie um bot com o @BotFather no Telegram, mande uma mensagem para ele
   e preencha `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.

## Onde mudar as coisas

- Produtos e preços: `lib/catalogo.ts`
- Datas, horários, sinal e etapas: `lib/regras.ts`
- Fórmula da taxa e distâncias por bairro: `lib/taxa.ts` e `.env.local`
- Textos do WhatsApp: `lib/mensagens.ts`

## Segurança

- Os preços são recalculados no servidor; o cliente não consegue alterar valores.
- O endereço da doceria só existe no servidor (`ORIGEM_ENDERECO`) e nunca aparece para o cliente.
- Cada pedido tem um link secreto de acompanhamento.
- O banco só é acessado pelo servidor (RLS ligado, sem acesso público).
