# Arte Que Veste — Identidade Visual para Nuvemshop

## Paleta de Cores

### Cores Principais
| Nome | Código HEX | Uso |
|------|-----------|-----|
| Turquesa | #40E0D0 | Cor da marca, botões, links, destaques |
| Preto | #1a1a1a | Texto principal, fundo escuro |
| Off-white | #faf9f6 | Fundo da página |

### Cores de Apoio
| Nome | Código HEX | Uso |
|------|-----------|-----|
| Rosa | #FF1493 | Categoria feminino, destaques |
| Laranja | #FF6347 | Categoria infantil, alertas |

## Tipografia

### No Nuvemshop
Acesse **Configurações > Personalização > Tipografia**:

- **Títulos (H1, H2, H3)**: Playfair Display (Google Fonts)
- **Corpo de texto**: Inter (Google Fonts)

### Para adicionar fontes Google no Nuvemshop
1. Acesse **Configurações > Avançado > Scripts personalizados**
2. Adicione no `<head>`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-normal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.css">
```

## Botões

### Estilo dos botões
```css
/* Botão primário */
.btn-primary {
    background: #40E0D0;
    color: #1a1a1a;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border: 2px solid #40E0D0;
    cursor: pointer;
}

.btn-primary:hover {
    background: transparent;
    color: #40E0D0;
}

/* Botão secundário */
.btn-secondary {
    background: transparent;
    color: #1a1a1a;
    border: 2px solid #1a1a1a;
}
```

## Cards de Produto

### Estilo
```css
.product-card {
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
```

### Badge de categoria
| Categoria | Cor de fundo | Cor do texto |
|-----------|-------------|--------------|
| Masculino | #40E0D0 | #1a1a1a |
| Feminino | #FF1493 | #ffffff |
| Infantil | #FF6347 | #ffffff |
| Unissex | #1a1a1a | #ffffff |
| Acessório | #FF6347 | #ffffff |
| Bijuteria | #1a1a1a | #ffffff |
| Calçado | #FF1493 | #ffffff |
| Souvenir | #40E0D0 | #1a1a1a |

## Navbar

### Configuração
- **Fundo**: Branco (#ffffff)
- **Sombra**: 0 2px 10px rgba(0,0,0,0.1)
- **Altura**: 80px
- **Logo à esquerda**
- **Menu ao centro** (desktop): Início | História | Xilogravura | Loja | Artista | Contato
- **WhatsApp à direita** (desktop)

## Footer

### Configuração
- **Fundo**: Preto (#1a1a1a)
- **Texto**: Branco (#ffffff) e Cinza (#9ca3af)
- **Conteúdo**:
  - © 2026 Arte Que Veste. Todos os direitos reservados.
  - "Xilogravura no tecido, cordel no corpo."
  - Pedro Belentani · @Belentani_

## Imagens de Produto

### Especificações
- **Formato**: JPG ou PNG
- **Resolução mínima**: 800x1000 px
- **Proporção**: 3:4 (retrato)
- **Fundo**: Branco ou neutro
- **Iluminação**: Natural, sem sombras duras

### Para cada produto, ter:
1. Foto principal (frente)
2. Foto detalhe (textura/estampa)
3. Foto de uso (modelo usando, se possível)

## Schema de Cores para SEO

Adicione no `<head>` da loja:
```html
<meta name="theme-color" content="#40E0D0">
<meta property="og:image" content="https://artequeveste.com.br/assets/og-image.jpg">
```

---

*Guia de identidade visual — Arte Que Veste © 2026*
