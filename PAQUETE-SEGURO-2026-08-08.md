# Arte Que Veste — paquete seguro

Estado: estructura reutilizable; no tienda publicada.

## Límites actuales

- Checkout local convertido en demostración sin captura de tarjeta, CVV ni contraseña.
- Alta externa bloqueada por defecto. Requiere `AQV_ALLOW_EXTERNAL_SETUP=YES` y credenciales aportadas mediante variables de entorno.
- Pago, catálogo real, dominio, políticas, envíos e identidad del propietario siguen pendientes.
- La credencial provisional que apareció en un commit anterior debe considerarse comprometida y no reutilizarse.

## Contenido del ZIP

Código y documentación actuales, excluyendo `.git`, `.env`, bases de datos, cachés y dependencias instaladas. El ZIP sirve para continuar desarrollo o transferir la estructura; no acredita una tienda operativa.

## Verificación mínima

```powershell
python -m py_compile .\transferencia-nuvemshop\setup-nuvemshop.py
node --check .\server.js
```
