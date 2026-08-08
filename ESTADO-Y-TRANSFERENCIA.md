# Arte Que Veste — estado verificable

Fecha: 8 de agosto de 2026.

## Resultado

La fuente queda cerrada como demostrador y estructura transferible. No es una tienda comercial activa.

Funciona:

- catálogo estático de ocho referencias;
- ficha, carrito local, páginas de estado y políticas;
- servidor local limitado a la carpeta pública;
- CSV y guía de transferencia a Nuvemshop;
- entrada estable mediante `index.html`.

Pendiente del propietario:

1. Email y titular legal de la cuenta.
2. Fotos, variantes, precios y stock reales.
3. Documento fiscal, domicilio y CEP de origen.
4. Cuenta bancaria o Mercado Pago/Nuvem Pago.
5. Condiciones reales de envío, cambio, privacidad y atención.

Los datos existentes son demostrativos. Publicarlos como inventario real sería incorrecto.

## Ruta recomendada

Usar Nuvemshop Plan Começo para validar sin mensualidad. La cuenta debe crearla el propietario y las tarifas del procesador se confirman al activar el medio de pago. Mercado Pago se instala como aplicación y requiere cuenta de vendedor; no necesita backend propio para esta transferencia.

## Ejecución local

```powershell
cd frontend
npm run check
npm start
```

Abrir `http://127.0.0.1:5500/`.

## Decisión sobre v2

`ArteQueVeste-v2` no es base de producción. Su documentación declara infraestructura, métricas y cobertura que no están demostradas por sus archivos ni por sus tests. Se conserva como referencia, sin fusionarla.
