# Tienda comercial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que la tienda existente abra en el catálogo y complete una solicitud de compra manual por correo sin afirmar que hubo cobro o confirmación.

**Architecture:** Se conserva el frontend estático sin dependencias y se conecta el checkout a un borrador `mailto:`. Se corrigen las respuestas comerciales que contradicen el flujo disponible y se eliminan controles que requieren APIs ausentes.

**Tech Stack:** HTML, CSS, JavaScript del navegador, servidor HTTP nativo de Node.js.

**Spec:** `docs/superpowers/specs/2026-11-10-tienda-comercial-design.md`

## Global Constraints

- No añadir dependencias.
- No inventar datos del titular, inventario, pagos, precios, tarifas o plazos.
- No enviar datos fuera del navegador salvo que el cliente envíe su borrador de correo.
- Conservar las modificaciones locales existentes.

## Review Focus

- Carrito vacío y carrito con variantes: la entrada de la tienda debe mantener las rutas de catálogo y compra.
- Datos del comprador con caracteres reservados: el borrador de correo debe codificarlos y seguir siendo legible.
- Correo no configurado: no mostrar una confirmación que simule un pedido recibido.
- Envío y stock desconocidos: no presentar cifras como confirmadas.
- Apertura del borrador: el mensaje debe aclarar que la tienda tiene que aceptar el pedido y confirmar costes y pago.

---

### Task 1: Abrir la tienda en la ruta local

**Files:**
- Modify: `frontend/server.js`
- Modify: `index.html`
- Modify: `frontend/index.html`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: el servidor estático ya resuelve HTML desde `frontend/`.
- Produces: local `/` and `/index.html` serve `loja.html`; Vercel routes storefront pages and assets into `frontend/`.

- [x] Cambiar las rutas locales `/` y `/index.html` a `/loja.html`, sin alterar las reglas actuales de seguridad ni el resto de rutas.
- [x] Configurar redirecciones estáticas de Vercel desde `/` y `/index.html` al catálogo en `frontend/`.
- [x] Ejecutar `npm.cmd test` desde `frontend/`; rutas, catálogo y carrito pasan.

### Task 2: Convertir la descarga en solicitud por correo

**Files:**
- Modify: `frontend/checkout.html`

**Interfaces:**
- Consumes: `Cart.get()`, datos de comprador/dirección y correo ya mostrado en `frontend/contato.html`.
- Produces: el botón prepara un `mailto:` con líneas de artículo, variantes, subtotal indicativo, dirección y aviso de que el pedido no queda confirmado.

- [x] Construir asunto y cuerpo mediante `URLSearchParams` para que nombres y direcciones con caracteres reservados se codifiquen correctamente.
- [x] Sustituir la descarga por instrucciones explícitas de revisión y envío en el cliente de correo.
- [x] Mantener envío, disponibilidad y pago sujetos a confirmación manual.
- [x] Ejecutar `npm.cmd test` y `npm.cmd run check` desde `frontend/`.

### Task 3: Alinear FAQ y políticas al servicio disponible

**Files:**
- Modify: `frontend/faq.html`
- Modify: `frontend/carrinho.html`
- Modify: `frontend/politica-envio.html`
- Modify: `frontend/politica-trocas.html`
- Modify: `frontend/politica-privacidade.html`
- Modify: `frontend/termos-de-uso.html`
- Modify: `frontend/produto.html`
- Modify: `frontend/pedido-sucesso.html`
- Modify: `frontend/pedido-pendente.html`
- Modify: `frontend/pedido-falha.html`

**Interfaces:**
- Consumes: la descripción de checkout y las limitaciones comerciales del spec.
- Produces: información pública que no promete opciones, tarifas, plazos o garantías sin respaldo operativo.

- [x] Reemplazar afirmaciones de cobro, descuento, envío y mensajes automáticos con el flujo de solicitud manual.
- [x] Retirar el validador de cupones y las cuotas anunciadas, que dependen de un endpoint y un medio de pago no configurados.
- [x] Describir el almacenamiento local del carrito, la consulta opcional del CEP, los recursos de terceros y el borrador de correo según el código actual.
- [x] Aclarar que el catálogo es demostrativo y que la tienda debe confirmar la solicitud.
- [x] Mantener la información legal general sin inventar condiciones específicas del comercio.
- [x] Ejecutar `npm.cmd test` y `npm.cmd run check` desde `frontend/`.

### Task 4: Revisión integrada

**Files:**
- Review: cambios de las tareas 1–3.

- [x] Revisar el estado previo y conservar los cambios ajenos al alcance; reemplazar los dos portales genéricos de entrada por rutas a la tienda como parte solicitada.
- [x] Ejecutar `npm.cmd test` (9/9) y `npm.cmd run check` desde `frontend/`.
- [x] Revisar `git diff --check`, JSON de Vercel y `git status --short` con `safe.directory` solo para esa invocación.
