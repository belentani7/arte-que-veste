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

## Ejecutar y probar la tienda estática

La tienda demostrativa completa vive en `frontend/`, separada del portal del repositorio. Para levantarla sin depender de un servicio de terceros:

```sh
cd frontend
npm start
# En otra terminal, dentro de frontend:
npm test
npm run check
```

El servidor Node solo sirve archivos públicos con extensiones permitidas desde `frontend/`. Rechaza métodos distintos de GET/HEAD, rutas ocultas, intentos de recorrer directorios y enlaces simbólicos que salgan de la carpeta. Las pruebas HTTP están conectadas con GitHub Actions. La tienda, el catálogo y el checkout de demostración no se convierten por ello en una plataforma de pagos real: publicar cobros requiere un proveedor autorizado, confirmación de pedidos y gestión segura de datos personales.
## Licencia

MIT — ver `LICENSE`.
