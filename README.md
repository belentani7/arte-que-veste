# Arte Que Veste — moda autoral nordestina

<p><img src="https://github.com/belentani7/arte-que-veste/actions/workflows/ci.yml/badge.svg" alt="CI" style="vertical-align:middle">
  <img src="https://img.shields.io/badge/dependabot-enabled-025e8c?logo=dependabot&style=flat-square" alt="Dependabot">
  <img src="https://img.shields.io/website?url=https%3A%2F%2Fbelentani7.github.io%2Farte-que-veste%2F&label=demo&style=flat-square&color=2bb673" alt="demo live"></p>

Catálogo y tienda de prendas de autor. Cada pieza se presenta como obra; la tienda tiene
catálogo, ficha de producto, carrito y checkout propios.

- En línea: <https://arte-que-veste.vercel.app> → redirige a `loja.html` (catálogo real,
  verificado: 24 KB y 1.144 palabras de contenido).

## Qué hay en el repositorio

```
frontend/                 tienda + servidor Node mínimo (zero-dependency)
  index.html              portada editorial con shader WebGL de xilogravura
  loja.html               catálogo con búsqueda, filtros y ordenación
  produto.html            ficha de producto con galería y guía de tallas
  carrinho.html           carrito local (localStorage)
  checkout.html           resumo local sin cobro (CEP BrasilAPI v2 + descarga .txt)
  pedido-sucesso.html     confirmación (demostración)
  pedido-pendente.html    pago pendiente (demostración)
  pedido-falha.html       pago fallido (demostración)
  politica-envio.html · politica-trocas.html · politica-privacidade.html
  termos-de-uso.html · sobre.html · contato.html · faq.html
  css/store.css           sistema de diseño nativo (zero-CDN, WCAG AA/AAA)
  js/store-ui.js          navegación móvil accesible y helpers XSS-safe
  js/cart.js              estado del carrito local
  js/xilogravura-shader.js shader WebGL1 propio con pausa y fallback 2D/CSS
  products.json           catálogo de productos
  server.js               servidor estático seguro con gzip y HOST/PORT configurables
  scripts/verify.mjs      validador de HTML, scripts inline, accesibilidad y enlaces (--help)
  scripts/audit.mjs       auditor de presupuesto de peso, CDNs y contraste WCAG (--help)
  scripts/export.mjs      export del catálogo en JSON o CSV (--help)
  scripts/optimize-images.mjs auditor y optimizador de imágenes (--help)
  test/basic.test.mjs     tests unitarios e integración (node --test)
  test/e2e.test.mjs       test end-to-end del flujo completo de compra
  assets/img/produtos/    imágenes optimizadas de producto
backend/seed.json         datos seed del catálogo — sin servicio activo: la tienda sirve frontend/products.json
magic/                    piezas experimentales (shader, sfx, lore, plugin)
transferencia-nuvemshop/  guía de migración a Nuvemshop, identidad visual y CSV de productos
ecosistema.html           índice del ecosistema
```

## Ejecutar en local

```bash
cd frontend
npm ci                  # instala según package-lock.json (0 dependencias externas)
npm start               # node server.js (http://127.0.0.1:5500; soporta HOST=0.0.0.0 PORT=5500)
npm run check           # node --check de todos los JS/MJS
npm test                # validador de HTML + tests unitarios y E2E (node --test)
npm run audit           # auditoría de peso, cero CDNs y contraste WCAG 2.1
npm run optimize:images # verifica tamaños y ausencia de duplicados en imágenes
npm run export          # imprime el catálogo consolidado en JSON (--format csv disponible)
```

Todas las herramientas bajo `frontend/scripts/` aceptan `--help`:

```bash
node frontend/scripts/verify.mjs --help
node frontend/scripts/audit.mjs --help
node frontend/scripts/export.mjs --help
node frontend/scripts/optimize-images.mjs --help
```

## Utilidad

- **Utilidad social:** da vitrina y venta directa al trabajo artesanal nordestino
  (xilogravura en textil y piezas de autor), con catálogo, carrito y fichas de producto
  propios, sin depender de marketplaces intermediarios.
- **Utilidad comercial:** funciona como tienda de demostración del flujo completo de
  compra (sin procesamiento de pagos) y como base lista para migrar a venta real:
  `transferencia-nuvemshop/` incluye el CSV de productos y los scripts de API para
  poblar una tienda Nuvemshop. El código es MIT.

## Documentos de traspaso

`PAQUETE-SEGURO-2026-08-08.md` y `ESTADO-Y-TRANSFERENCIA.md` describen el traspaso del
proyecto: contienen decisiones de negocio y de titularidad. Revísalos antes de publicar
cambios.

## Licencia

MIT — ver `LICENSE`.
---

## Ficha del proyecto

| Campo | Valor |
|---|---|
| Autor | Belentani / NOIACORE |
| Época de desarrollo | 2026 |
| Contacto | [belentani7studio@proton.me](mailto:belentani7studio@proton.me) |
| Código | https://github.com/belentani7/arte-que-veste |
| Demo desplegada | https://belentani7.github.io/arte-que-veste/ |

Quality baseline: CI + Dependabot + CodeQL + reglas de agentes por [premium-factory](https://github.com/belentani7/premium-factory-api).


## Producto
Véase `plataforma/OFERTA.md`, `plataforma/precios.json`, `plataforma/ONEPAGER.md`.

## Verificacion

```bash
python -m pytest -q
```
