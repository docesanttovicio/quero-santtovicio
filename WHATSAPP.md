# WhatsApp automático (API oficial da Meta)

Com isso ligado, cada pedido novo e cada etapa que você avança no painel manda a mensagem sozinha para o cliente.
Enquanto não estiver ligado, o painel continua com o botão **Enviar no WhatsApp** (envio manual).

## 1. Preparar a conta (uma vez)

1. Separe um **número só para isso** (um chip novo). Ele não pode estar em uso no app do WhatsApp.
2. Entre em **business.facebook.com** e crie a conta empresarial da Santto Vício (se ainda não tiver).
3. Entre em **developers.facebook.com → Meus apps → Criar app**, escolha o tipo **Empresa** e ligue à conta empresarial.
4. No app, adicione o produto **WhatsApp** e, em **Configuração da API**, adicione o número do chip (a Meta manda um código por SMS ou ligação).
5. Anote o **ID do número de telefone** (Phone number ID). Ele vai em `WHATSAPP_PHONE_ID`.
6. Na conta empresarial: **Configurações → Usuários do sistema → Adicionar** (função Administrador). Clique em **Gerar token**, escolha o app, marque `whatsapp_business_messaging` e `whatsapp_business_management`, validade **Nunca**. Esse token vai em `WHATSAPP_TOKEN`.
7. Para enviar para qualquer cliente, cadastre uma **forma de pagamento** no WhatsApp Manager (a Meta cobra centavos por mensagem).

## 2. Criar os modelos de mensagem

No **WhatsApp Manager → Modelos de mensagem → Criar modelo**, crie os 10 abaixo com:

- **Categoria:** Utilidade
- **Nome:** exatamente como está aqui (minúsculas, com `_`)
- **Idioma:** Português (BR)
- **Corpo:** copie o texto exatamente, com as quebras de linha. Para cada `{{n}}`, a Meta pede um exemplo: use os da lista.

### `sv_pedido_recebido`

```text
Oi, {{1}}! Aqui é a Santto Vício. Recebemos sua encomenda {{2}} para {{3}}.

Para confirmar, falta o sinal de {{4}}.
{{5}}
Depois de pagar, mande o comprovante aqui nesta conversa.

Acompanhe: {{6}}

Obrigado pela preferência!
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001 · {{3}} = Quinta, 24/12, 13h às 16h · {{4}} = R$ 90,00 · {{5}} = Segue a nossa chave Pix logo abaixo. · {{6}} = https://quero.santtovicio.com.br/pedido/SV-0001

### `sv_sinal_recebido`

```text
Sinal recebido, {{1}}! Sua encomenda {{2}} está confirmada para {{3}}. Obrigado!
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001 · {{3}} = Quinta, 24/12, 13h às 16h

### `sv_retirada_confirmada`

```text
Sinal recebido, {{1}}! Sua encomenda {{2}} está confirmada para {{3}}. Perto da data, te passamos por aqui o local e as orientações da retirada.
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001 · {{3}} = Quinta, 24/12, 13h às 16h (retirada)

### `sv_em_producao`

```text
Oi, {{1}}! Sua encomenda {{2}} entrou em produção. O cheirinho já chegou aqui na cozinha!
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001

### `sv_pronta_pagamento`

```text
Oi, {{1}}! Sua encomenda {{2}} está pronta. Como combinado, o pagamento da entrega é feito agora, antes de o motorista sair:

Restante dos produtos: {{3}}
Entrega: {{4}}
Total: {{5}}
{{6}}

Depois de pagar, mande o comprovante aqui nesta conversa. Assim que conferirmos, despachamos.
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001 · {{3}} = R$ 90,00 · {{4}} = R$ 52,00 · {{5}} = R$ 142,00 · {{6}} = Segue a nossa chave Pix logo abaixo.

### `sv_pronta_retirada`

```text
Oi, {{1}}! Sua encomenda {{2}} está pronta. Responda esta mensagem para combinarmos o local e o horário da retirada. Restante a pagar na retirada: {{3}}. Até já!
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001 · {{3}} = R$ 90,00

### `sv_saiu_entrega`

```text
Pagamento recebido, {{1}}! Sua encomenda {{2}} saiu para entrega e chega em breve.
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001

### `sv_chave_pix`

```text
Chave Pix da Santto Vício:

{{1}}

Toque e segure na chave para copiar. Depois de pagar, mande o comprovante aqui.
```

Exemplos: {{1}} = doce.santtovicio@gmail.com

### `sv_cancelado`

```text
Oi, {{1}}. Sua encomenda {{2}} foi cancelada. Motivo: {{3}}.

Se você já pagou algum valor, vamos combinar a devolução por aqui. Qualquer dúvida, é só responder esta mensagem.
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001 · {{3}} = Cliente desistiu

### `sv_concluido`

```text
Obrigado por escolher a Santto Vício, {{1}}! Esperamos que sua encomenda {{2}} faça sucesso na ceia. Feliz Natal!
```

Exemplos: {{1}} = Mariana · {{2}} = SV-0001
> **Sobre a chave Pix:** quando o pagamento é por Pix, o sistema manda a mensagem principal e, logo em seguida, o modelo `sv_chave_pix`.
> A Meta não aceita um modelo só com a chave, por isso ele tem uma linha antes e outra depois. Como a chave é um e-mail, o WhatsApp vira link e o cliente toca e segura nela para copiar só a chave.
> No envio manual (botão do painel), a chave vai totalmente sozinha.

## 3. Ligar no site

Na Vercel → **Settings → Environment Variables**, cadastre como **Secret**:

| Nome | Valor |
|---|---|
| `WHATSAPP_TOKEN` | o token permanente do passo 1.6 |
| `WHATSAPP_PHONE_ID` | o ID do número do passo 1.5 |

Depois, **Deployments → ⋯ → Redeploy**. No painel, cada pedido passa a mostrar “✓ Última mensagem enviada automaticamente no WhatsApp”.
Se um envio falhar (modelo ainda não aprovado, número errado), o painel mostra o motivo e oferece o botão manual.
