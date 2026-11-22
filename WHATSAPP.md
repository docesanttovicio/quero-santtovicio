# WhatsApp automático (um número só, no app e no sistema)

O chip da Santto Vício fica no **app WhatsApp Business**, onde você conversa com os clientes e recebe os comprovantes.
O **mesmo número** também manda sozinho as mensagens de cada etapa do pedido. Isso se chama **coexistência**, e é feito pela **YCloud**, uma parceira oficial da Meta.
As mensagens automáticas aparecem na mesma conversa do app, então quando o cliente responde, a resposta chega para você ali.

Enquanto nada disso estiver ligado, o painel continua com o botão **Enviar no WhatsApp** (envio manual).

**Custos:**
- **YCloud:** plano grátis.
- **Meta:** cobra centavos por mensagem automática, repassados pela YCloud sem acréscimo.
- **App:** as mensagens que você digita nele continuam grátis.

## 1. Preparar o app (no celular da loja)

1. Instale o **WhatsApp Business**, ative o chip e deixe o app atualizado.
2. Em **Ferramentas comerciais → Perfil comercial**, preencha:
   - **Nome:** Santto Vício Doceria
   - **Foto:** o logo
   - **Descrição e horário**
   - **Site:** https://quero.santtovicio.com.br
3. **Não preencha o endereço.** O local é área de risco e a retirada é combinada pelo WhatsApp.
4. Use o app normalmente: mande e receba algumas mensagens. A Meta pode recusar a conexão de um número recém-ativado e sem uso.

## 2. Conectar o número na YCloud

1. Crie a conta em **ycloud.com** (plano grátis).
2. No painel da YCloud, vá em **WhatsApp → conectar conta** e escolha a opção de **usar o número que já está no WhatsApp Business App** (coexistência).
3. Entre com o Facebook que administra a Santto Vício e escolha (ou crie) a conta empresarial.
4. Informe o número da loja. O **app WhatsApp Business no celular** vai pedir uma confirmação: aceite.
   Ele também oferece compartilhar o histórico de conversas. É opcional.
5. Na YCloud, coloque **saldo ou uma forma de pagamento**. É de onde saem os centavos da Meta.
6. Em **Developers → API Keys**, crie uma chave e copie.

**Para não perder a conexão:**
- Não desinstale o app.
- Abra o app pelo menos uma vez a cada poucos dias.
- As listas de transmissão do app passam a ser só leitura.

## 3. Ligar no site

Na Vercel → **Settings → Environment Variables**:

| Nome | Valor | Tipo |
|---|---|---|
| `WHATSAPP_TOKEN` | a chave de API da YCloud (passo 2.6) | **Secret** |
| `WHATSAPP_LOJA` | o número da loja, ex.: 21 99999-9999 | normal |

Depois, **Deployments → ⋯ → Redeploy**.

## 4. Criar os modelos e testar (no painel)

1. Abra **/painel → WhatsApp**. A conexão deve aparecer como **Ligado**.
2. Clique em **Criar 10 modelos que faltam**. O sistema cadastra todos os textos abaixo na Meta. Você não precisa digitar nada.
3. Espere a Meta aprovar. Costuma levar minutos, às vezes algumas horas. Clique em **Atualizar** para ver o andamento.
4. Com os modelos aprovados, use **Mandar mensagem de teste** para o seu próprio celular.

A partir daí:
- Cada pedido novo e cada etapa que você avança no painel manda a mensagem sozinha.
- O pedido mostra “✓ Última mensagem enviada automaticamente no WhatsApp”.
- Se um envio falhar, o painel mostra o motivo e oferece o botão manual.

## Os 10 modelos de mensagem (referência)

O painel cria estes modelos sozinho (passo 4). Se precisar criar à mão, use:

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

## Alternativa: direto na Meta, com um número só da API

Se um dia preferir não usar a YCloud, dá para ligar direto na Meta. Nesse caso o número fica **só** na API e não pode estar no app.
Configure `WHATSAPP_PROVEDOR=meta`, `WHATSAPP_TOKEN` (token permanente de usuário do sistema) e `WHATSAPP_PHONE_ID` (ID do número).
Os modelos abaixo precisam ser criados à mão no WhatsApp Manager.
