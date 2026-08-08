# Arte Que Veste — Guia do Proprietário

## Bem-vindo!

Esta é a sua loja online **Arte Que Veste**, uma marca de moda autoral nordestina baseada em Aracaju/SE. Este guia explica tudo o que você precisa para administrar a loja.

---

## 1. Criar sua conta na Nuvemshop (GRÁTIS)

1. Acesse **https://www.nuvemshop.com.br**
2. Clique em **"Comece grátis"**
3. Preencha seus dados:
   - **Nome da loja**: Arte Que Veste
   - **E-mail**: (seu e-mail)
   - **Senha**: (crie uma senha segura)
4. Confirme o e-mail e pronto! Sua loja está criada

---

## 2. Configurar a marca

### Identidade Visual
Acesse **Configurações > Personalização** e configure:

| Item | Valor |
|------|-------|
| **Nome da loja** | Arte Que Veste |
| **Slogan** | "Xilogravura no tecido, cordel no corpo" |
| **Cor principal** | #40E0D0 (turquesa) |
| **Cor secundária** | #1a1a1a (preto) |
| **Fonte dos títulos** | Playfair Display |
| **Fonte do corpo** | Inter |

### Logo e Imagens
- **Logo**: Use o arquivo `assets/logo.png` (turquesa sobre fundo transparente)
- **Favicon**: Use `assets/favicon.png`
- **Imagem de compartilhamento (OG)**: Use `assets/og-image.jpg`

---

## 3. Cadastrar produtos

### Opção A: Importar via CSV (mais rápido)
1. Acesse **Produtos > Importar**
2. Use o arquivo `produtos-arte-que-veste.csv` que está nesta pasta
3. Mapeie as colunas conforme solicitado
4. Confirme a importação

### Opção B: Cadastrar manualmente
1. Acesse **Produtos > Adicionar produto**
2. Preencha para cada produto:
   - **Nome**: (nome do produto)
   - **Descrição**: (descrição detalhada)
   - **Preço**: (em R$)
   - **Estoque**: (quantidade disponível)
   - **Peso**: (em kg)
   - **Dimensões**: largura x altura x comprimento (cm)
   - **SKU**: (código único, ex: VFJ-001)
   - **Imagem**: (foto do produto)

### SKUs dos produtos incluídos:
| SKU | Produto | Preço | Categoria |
|-----|---------|-------|-----------|
| VFJ-001 | Vestido Festa Junina | R$ 299,00 | Feminino |
| CBM-001 | Camiseta Bumba Meu Boi | R$ 129,00 | Masculino |
| BTB-001 | Bolsa Tote Bag | R$ 89,00 | Acessórios |
| BXI-001 | Brincos Xilogravura | R$ 45,00 | Bijuteria |
| SAN-001 | Sandália Nordestina | R$ 159,00 | Calçados |
| CAN-001 | Caneca Artesanal | R$ 49,00 | Souvenirs |
| CIB-001 | Camiseta Infantil Boi Bumbá | R$ 79,00 | Infantil |
| VIF-001 | Vestido Infantil Florido | R$ 89,00 | Infantil |

---

## 4. Configurar pagamentos

### PIX (RECOMENDADO — mais barato)
1. Acesse **Configurações > Pagamentos**
2. Ative **Nuvem Pago** (pagamento próprio da Nuvemshop)
3. PIX está integrado automaticamente
4. **Taxa**: 0% para a loja (Nuvemshop não cobra por PIX)

### Cartão de crédito
1. No mesmo menu, ative **Nuvem Pago**
2. Configure parcelamento (ex: até 12x sem juros)
3. **Taxa**: ~3,99% por transação

### Boleto
1. Ative **Boleto bancário** nas configurações de pagamento
2. **Taxa**: ~3,49% por transação

### WhatsApp (venda manual)
1. Configure o número de WhatsApp: `+55 (79) 99999-9999`
2. Quando o cliente clicar em "Comprar", abre o WhatsApp com a mensagem pronta
3. Você negocia e envia o PIX manualmente

---

## 5. Configurar envios

### Correios (cobertura 100% do Brasil)
1. Acesse **Configurações > Envios**
2. Adicione **Correios** como transportadora
3. Configure:
   - **CEP de origem**: 49000-000 (Aracaju/SE)
   - **Serviços**: PAC e SEDEX
   - **Peso mínimo**: 0,2 kg
   - **Peso máximo**: 2 kg
   - **Dimensões**: 25 x 10 x 35 cm

### Jadlog (alternativa)
1. Adicione **Jadlog** como transportadora
2. Cadastre-se em https://www.jadlog.com.br
3. Configure o mesmo CEP de origem

### Frete grátis (opcional)
- Para pedidos acima de R$ 199,00, ofereça frete grátis dentro de Sergipe
- Configure regra de frete em **Envios > Regras de frete**

---

## 6. Configurar WhatsApp

1. Acesse **Configurações > WhatsApp** (ou instale o app "WhatsApp Marketing" na loja de apps)
2. Conecte seu número de WhatsApp Business
3. Configure mensagens automáticas:
   - **Boas-vindas**: "Olá! Bem-vindo à Arte Que Veste. Como posso ajudar?"
   - **Pedido confirmado**: "Seu pedido #{numero} foi recebido. Obrigado!"
   - **Pagamento aprovado**: "Pagamento confirmado! Seu pedido será enviado em breve."

---

## 7. Configurar nota fiscal (NFe)

### Para MEI (mais simples)
1. Cadastre-se no Portal Nacional da NFS-e: https://nfse.gov.br
2. Configure na Nuvemshop em **Configurações > Nota Fiscal**
3. A nota é emitida automaticamente a cada pedido

### Para ME/EPP
1. Cadastre-se na SEFAZ de Sergipe: https://www.sefaz.se.gov.br
2. Use o certificado digital (e-CPF ou e-CNPJ)
3. Configure a integração com Nuvemshop

---

## 8. Dia a dia da loja

### Receber pedidos
1. Quando um cliente faz pedido, você recebe notificação por e-mail e WhatsApp
2. Acesse **Pedidos** no painel para ver detalhes
3. Confirme o pagamento (PIX aparece automaticamente)
4. Prepare o produto e envie

### Enviar produtos
1. Acesse o pedido em **Pedidos**
2. Clique em "Enviar" e selecione a transportadora
3. Imprima a etiqueta e embale o produto
4. Leve aos Correios ou Jadlog

### Responder clientes
1. WhatsApp: responda rapidamente (meta: < 1 hora)
2. E-mail: verifique diariamente
3. Redes sociais: poste conteúdo regularmente

---

## 9. Marketing sugerido

### Instagram
- Poste fotos dos produtos com fundo turquesa (#40E0D0)
- Use hashtags: #ArteQueVeste #ModaAutoralNordestina #Xilogravura #ModaSergipana
- Marque @ArteQueVeste em todas as postagens

### TikTok
- Vídeos curtos mostrando o processo artesanal
- "Por trás das câmeras" da criação dos produtos
- Depoimentos de clientes

### WhatsApp Business
- Catálogo de produtos no WhatsApp
- Status com fotos de novidades
- Grupos de clientes fiéis

---

## 10. Custos mensais estimados

| Item | Custo |
|------|-------|
| Nuvemshop (plano Começo) | R$ 0,00 |
| Nuvem Pago (pagamentos) | ~3,99% por venda |
| Correios (frete) | Variável por destino |
| Domínio (opcional) | ~R$ 40,00/ano |
| **Total mensal** | **R$ 0,00 fixo** |

---

## 11. Transferência da loja

Quando estiver tudo pronto, o desenvolvedor (Pedro Belentani) fará a transferência:

1. Acesse **Configurações > Loja**
2. Clique em **"Transferir propriedade"**
3. Digite o e-mail do novo proprietário
4. O novo proprietário recebe um convite por e-mail
5. Ao aceitar, ele assume o controle total da loja

---

## Suporte

- **Nuvemshop**: https://suporte.nuvemshop.com.br
- **WhatsApp Nuvemshop**: (11) 3003-1984
- **Desenvolvedor**: Pedro Belentani — @Belentani_

---

*Documento gerado em Julho/2026 — Arte Que Veste © 2026*
