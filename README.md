# Arte Que Veste

Moda autoral y arte vestible: catálogo y tienda creativa.

## Qué es

Una pieza de **arte vestible**. No es una tienda de ropa al uso: cada prenda es obra, y el
catálogo se presenta como una galería. El sitio vive en Vercel.

En línea: <https://arte-que-veste.vercel.app>

## Estructura

```
backend/     servicio de catálogo
index.html   catálogo y presentación
ecosistema.html
```

## Detalle sensible

El repositorio incluye `PAQUETE-SEGURO-2026-08-08.md` y `ESTADO-Y-TRANSFERENCIA.md`. Son
documentos de traspaso: conviene revisarlos antes de publicar cualquier cosa nueva aquí.

## Licencia

MIT — ver `LICENSE`.
## Verificación local

La base estática usa Node.js 20 y no necesita instalar dependencias para sus chequeos:

```sh
cd frontend
npm run check
npm test
```

Las pruebas del servidor están en `tests/`, fuera del directorio publicado por GitHub Pages.

## Recuperación segura de la tienda — 22 octubre 2026

- Los precios, cantidades y datos de carrito se validan antes de mostrarlos; texto del producto nunca se interpreta como HTML.
- Checkout no ejecuta pagos reales si faltan API y host confiable explícitamente configurados. No se recoge dinero de forma ficticia.
- Servidor Node confina archivos mediante `realpath`, rechaza rutas traversal codificadas, utiliza tipo MIME correcto y no permite métodos de escritura.
- `npm test` ejecuta las pruebas de carrito **y** de servidor. No usa `|| true` ni una orden de build ficticia.
- Se preserva el diseño de catálogo y toda la estructura existente. Producción y pasarela de pago no se han modificado.

**Pendiente:** ejecutar CI Node 22, probar carrito/checkout visualmente en móvil y escritorio, revisar derechos de catálogo y confirmar integración autorizada con una plataforma de pagos real antes de habilitar órdenes cobrables.
