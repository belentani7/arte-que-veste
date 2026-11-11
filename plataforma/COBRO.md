# Flujo de cobro — arte-que-veste

## Regla
Nunca se oculta el precio para pedir el email. Los precios están publicados en `plataforma/precios.json`.

## Métodos de pago aceptados
- Transferencia bancaria (SEPA)
- Tarjeta de crédito/débito (vía plataforma de pago externa, checkout real en producción)
- Factura para consultoría de tienda online

## Flujo de contratación
1. El cliente navega el catálogo y elige una prenda o pieza digital
2. Se emite factura con el precio de productos.json o precios.json
3. Para compra de prenda: checkout con procesamiento de pago (demo o real según entorno)
4. Para pieza digital: entrega inmediata tras pago (shader, SFX, lore, plugin)
5. Para consultoría: se acordan horas y se factura al finalizar el trabajo

## Reembolsos
- Catálogo de consulta: no aplica (acceso gratuito)
- Compra de prenda: según política de devoluciones en políticas del sitio
- Piezas digitales: no reembolsables tras entrega del archivo
- Consultoría: factura por horas trabajadas
