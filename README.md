# Arte Que Veste — moda autoral nordestina

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
  checkout.html           checkout
  pedido-sucesso.html     confirmación
  pedido-pendente.html    pago pendiente
  pedido-falha.html       pago fallido
  politica-envio.html · politica-trocas.html · politica-privacidade.html
  termos-de-uso.html · sobre.html · contato.html · faq.html
  products.json           catálogo de productos
  server.js               servidor estático (node server.js)
  assets/img/produtos/    imágenes de producto
backend/seed.json         datos seed del catálogo — sin servicio activo: la tienda sirve frontend/products.json
magic/                    piezas experimentales (shader, sfx, lore, plugin)
transferencia-nuvemshop/  guía de migración a Nuvemshop, identidad visual y CSV de productos
ecosistema.html           índice del ecosistema
```

## Ejecutar en local

```bash
cd frontend
npm start        # node server.js
npm run check    # node --check server.js
```

## Documentos de traspaso

`PAQUETE-SEGURO-2026-08-08.md` y `ESTADO-Y-TRANSFERENCIA.md` describen el traspaso del
proyecto: contienen decisiones de negocio y de titularidad. Revísalos antes de publicar
cambios.

## Licencia

MIT — ver `LICENSE`.
