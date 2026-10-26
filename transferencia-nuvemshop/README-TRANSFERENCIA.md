# Arte Que Veste — Paquete de Transferencia a Nuvemshop

## Contenido de esta carpeta

| Archivo | Para qué sirve |
|---------|---------------|
| `GUIA-DO-DONO.md` | Guía paso a paso para que el dueño administre la tienda |
| `IDENTIDADE-VISUAL.md` | Colores, tipografía, estilos para configurar en Nuvemshop |
| `produtos-arte-que-veste.csv` | CSV listo para importar los 8 productos |
| `CHECKLIST-LANZAMIENTO.md` | Lista de verificación antes de activar la tienda |

## Cómo transferir la tienda

### Paso 1: Crear la tienda (5 minutos)
1. Ir a https://www.nuvemshop.com.br
2. Click "Comece grátis"
3. Nombre: **Arte Que Veste**
4. Completar registro con email del dueño

### Paso 2: Configurar marca (15 minutos)
1. Seguir `IDENTIDADE-VISUAL.md`
2. Subir logo y favicon desde `assets/` del frontend
3. Configurar colores y tipografía

### Paso 3: Importar productos (5 minutos)
1. Ir a **Produtos > Importar**
2. Subir `produtos-arte-que-veste.csv`
3. Mapear columnas y confirmar

### Paso 4: Configurar pagos (10 minutos)
1. Activar **Nuvem Pago** (PIX automático)
2. Activar cartão de crédito con parcelamento
3. Configurar boleto si es necesario

### Paso 5: Configurar envíos (10 minutos)
1. Agregar Correios como transportadora
2. CEP origen: 49000-000 (Aracaju/SE)
3. Servicios: PAC y SEDEX

### Paso 6: Configurar WhatsApp (5 minutos)
1. Conectar WhatsApp Business
2. Número de contacto: configurable por el dueño
3. Mensajes automáticos de bienvenida

### Paso 7: Activar la tienda (1 minuto)
1. Revisar todo en **Configurações > Loja**
2. Click "Ativar loja"
3. ¡La tienda está online!

## Costos verificados el 08/08/2026

| Concepto | Costo |
|----------|-------|
| Nuvemshop plano Começo | **Sin mensualidad** |
| Tarifa Nuvemshop con Nuvem Pago | **Exenta; el procesador mantiene sus propias tarifas** |
| Mercado Pago | **Consultar tarifa y plazo en la cuenta del vendedor** |
| Envío (Correios) | Variable por destino |
| Dominio (opcional) | ~R$ 40/ano |
| **Total fijo de plataforma en Começo** | **R$ 0,00; operación, dominio y procesamiento no incluidos** |

Fuente oficial: https://www.nuvemshop.com.br/planos-e-precos

Mercado Pago requiere cuenta de vendedor e instalación del plugin desde el panel Nuvemshop. La vinculación debe hacerla el titular: https://atendimento.nuvemshop.com.br/pt_BR/12332-mercado-pago/como-configurar-o-mercado-pago-na-nuvemshop

## Soporte del desarrollador

Si el dueño tiene dudas técnicas, puede contactar:
- **Pedro Belentani** — @Belentani_
- Desarrollador del proyecto original

---

*Arte Que Veste — Transferencia Nuvemshop — Julio/2026*

## Alternativa técnica: importador por API (solo con autorización del titular)

La opción habitual de traspaso sigue siendo **importar el CSV desde el panel**. Si la persona responsable decide usar el script `upload-products.py`, primero debe revisar el catálogo y ejecutar una simulación local:

```bash
python transferencia-nuvemshop/upload-products.py --dry-run
```

La simulación lee el CSV sin solicitar credenciales ni conectar con Nuvemshop. Para la importación real, proporcionar el token de acceso mediante la variable de entorno `NUVEMSHOP_ACCESS_TOKEN` y el identificador numérico de la tienda mediante `--store-id` (o `NUVEMSHOP_STORE_ID`). No poner tokens reales en argumentos, archivos versionados o capturas de pantalla.

```bash
# Solo ejemplo: el token debe estar configurado en el entorno de ejecución.
python transferencia-nuvemshop/upload-products.py --store-id 123456
```

**Riesgos que requieren revisión del titular:** la ejecución real crea categorías que falten y productos **publicados** en la tienda. Antes de crear cada artículo consulta `GET /products/sku/{sku}` y **omite** los SKU que ya existan; no actualiza productos. Los 8 productos del CSV se validan antes de hacer peticiones (campos, SKU únicos, precios, dimensiones y stock). Esta prevención de duplicados no sustituye la revisión del titular ni garantiza atomicidad si dos procesos escriben simultáneamente. La búsqueda de categorías existente no pagina; en tiendas grandes debe comprobarse que todas aparecen antes de importar. Se necesitan permisos OAuth para consultar y escribir productos. Las rutas API están restringidas, los IDs se validan y las redirecciones HTTP no se siguen con credenciales. No se ha autorizado ni realizado ninguna transferencia comercial mediante esta documentación.
