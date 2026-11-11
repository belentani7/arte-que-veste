# Tienda comercial Arte Que Veste

## Intención

Convertir la tienda existente en una experiencia de compra coherente y utilizable: la portada debe llevar al catálogo y el checkout debe permitir enviar una solicitud de compra real al contacto ya publicado por el comercio.

## Objetivos

- Abrir el catálogo de la tienda al entrar en el servidor local.
- Permitir preparar y enviar una solicitud de compra por correo con los productos, las variantes y los datos de entrega.
- No anunciar cupones, descuentos ni cuotas mientras no exista un servicio de validación de ofertas.
- Identificar explícitamente el pedido como solicitud pendiente, sin simular pago, disponibilidad, cálculo de envío o confirmación.
- Alinear las preguntas frecuentes y las políticas con las capacidades que el repositorio demuestra.

## No objetivos

- Activar una pasarela, abrir cuentas, enviar mensajes automáticamente o publicar el sitio.
- Presentar como reales los precios, existencias, condiciones de envío o datos del titular que el repositorio marca como pendientes de verificación.
- Sustituir el flujo existente de pago de una futura plataforma comercial.

## Restricciones

- Mantener HTML, CSS y JavaScript sin dependencias nuevas.
- Conservar los cambios locales ya existentes en el árbol de trabajo.
- No incluir claves ni datos personales nuevos.
- Toda comunicación de checkout indica que la solicitud no confirma pedido ni pago.

## Enfoques considerados

1. **Tienda estática con solicitud por correo (elegido).** Reutiliza el catálogo, carrito y formulario actuales; funciona sin cuenta ni credenciales, y un agente de la tienda confirma manualmente disponibilidad, envío y pago. El cliente necesita un programa de correo configurado.
2. **Conectar una pasarela directamente.** Daría un cobro automatizado, pero faltan titular, cuenta de comercio, credenciales, persistencia de pedidos y configuración fiscal; no se puede completar ni probar desde este repositorio.
3. **Migrar ahora a Nuvemshop.** El repositorio ya documenta esa ruta, pero la apertura y activación requieren la cuenta del titular y datos comerciales pendientes.

## Diseño

La ruta local `/` abrirá `loja.html`. El checkout generará un borrador `mailto:` dirigido al correo de tienda que ya aparece en el sitio y prellenará asunto y cuerpo con el pedido y los datos indicados por el cliente. El navegador no almacena ni envía el correo por cuenta propia; el usuario lo revisa y lo envía desde su cliente. Las políticas y FAQ describirán esta solicitud manual y dejarán precios, existencias, tarifas y plazos sujetos a confirmación.

## Pendiente de la titularidad del comercio

Antes de anunciar ventas como activas, el titular debe validar el catálogo y el destinatario del correo, definir el envío y las políticas definitivas, y configurar un medio de pago. Este cambio no activa cobros ni publica el sitio.
