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
frontend/                 tienda + servidor Node mínimo
  index.html              portada
  loja.html               catálogo
  produto.html            ficha de producto
  carrinho.html           carrito
  checkout.html           checkout (demo, sin procesamiento de pagos)
  pedido-sucesso.html     confirmación
  pedido-pendente.html    pago pendiente
  pedido-falha.html       pago fallido
  politica-envio.html · politica-trocas.html · politica-privacidade.html
  termos-de-uso.html · sobre.html · contato.html · faq.html
  products.json           catálogo de productos
  server.js               servidor estático (node server.js)
  scripts/verify.mjs      validador de HTML y enlaces locales
  scripts/export.mjs      export de datos del catálogo (npm run export)
  test/basic.test.mjs     tests (node --test): servidor, carrito y datos
  assets/img/produtos/    imágenes de producto
backend/seed.json         datos seed del catálogo — sin servicio activo: la tienda sirve frontend/products.json
magic/                    piezas experimentales (shader, sfx, lore, plugin)
transferencia-nuvemshop/  guía de migración a Nuvemshop, identidad visual y CSV de productos
ecosistema.html           índice del ecosistema
```

## Ejecutar en local

```bash
cd frontend
npm ci            # instala según package-lock.json
npm start         # node server.js  (http://127.0.0.1:5500)
npm run check     # node --check de todos los JS
npm test          # validador de HTML + tests (node --test)
npm run export    # imprime el catálogo consolidado en JSON
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
