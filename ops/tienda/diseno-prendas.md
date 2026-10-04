# Prendas en la tienda (diseño, 2026-10-04)

Además de patrones en PDF, la tienda vende prendas físicas: modelos con tallas y colores, con stock por variante.
Acordado con el dueño en la conversación del 2026-10-04.

## Catálogo

- Una sola tienda: `/tienda/` (todo), categorías raíz **Patrones** (`/tienda/patrones/`) y **Prendas**
  (`/tienda/prendas/`). Las subcategorías actuales (Blusas, Jerséis, Infantil, Otros) quedan bajo Patrones; Prendas
  empieza sin subcategorías (se crean desde el panel si hacen falta).
- Producto: `/tienda/<categoría>/<sub>/<nombre>/` (WooCommerce `product_base = /tienda/%product_cat%`).
- Menú (al abrir): "Tienda" con Patrones y Prendas debajo.

## Tipos de producto

| | Patrón | Prenda |
|---|---|---|
| Tipo WooCommerce | simple, virtual + descargable | variable (talla × color) |
| Stock | no | sí, por variante |
| Cantidad en el carrito | 1 (sin selector) | libre |
| Atributos | Dificultad, Talla, Formato | Talla, Color (para variantes) |
| Pestaña propia en el editor | "Patrón" | "Prenda": composición, cuidados, tabla de medidas |
| Envío | no | peso del paquete (reglas de coste de Correos) |

Panel: "Productos → Añadir patrón" y "Añadir prenda" abren el editor ya preparado para cada tipo; desaparece
"Añadir nuevo producto". El importador CSV sigue siendo solo para patrones.

## Checkout y envíos

- Solo patrones: email, nombre y país (todo el mundo), como antes.
- Con alguna prenda: dirección completa + teléfono. Envío solo a **España península** (zona por código postal:
  excluye 07 Baleares, 35/38 Canarias, 51/52 Ceuta y Melilla).
- Métodos para prendas: **Correos** con su plugin oficial de WooCommerce (decidido 2026-10-04, en vez de Packlink) y
  **recogida gratis en la tienda** (Carrer del Rosselló 64). El plugin de Correos (manual v1.0.2) **no cotiza en tiempo
  real**: cada método (Paq Premium / Paq Estándar, a domicilio, Oficina o CityPaq) tiene cuota fija + reglas de coste
  por peso que se cargan desde la tabla de tarifas del contrato. Aporta: elegir Oficina/CityPaq en el checkout,
  etiquetas desde el pedido, email de seguimiento y etiqueta de devolución (Paq Retorno). Requiere contrato con
  Correos (número de contrato, de cliente, código etiquetador) y usuario/clave del plugin que da el gestor comercial;
  se descarga desde correos.es (no está en wordpress.org). Mientras no esté, producción solo ofrece recogida; staging
  usa una tarifa fija de prueba.
- La casilla de renuncia al desistimiento (contenido digital) solo aparece si el carrito tiene patrones. Las prendas
  tienen 14 días de desistimiento: va en las condiciones de venta (pendiente: quién paga la devolución).
- Pedido con prendas: queda en "Procesando" hasta que se envía o está listo para recoger; entonces "Completado". El PDF
  de un pedido mixto se descarga al pagar.
- Email "pedido completado": texto según el contenido (patrones / enviado / listo para recoger).
- Sin cambios: SumUp, IVA 21 % (las prendas solo se venden en España), emails por Brevo.

## Pendiente del dueño

1. Contrato Correos (formulario "Quiero ser cliente" / gestor comercial): contrato, cliente, etiquetador, usuario y
   clave del plugin, tabla de tarifas, y el plugin descargado de correos.es.
2. Quién paga el envío de las devoluciones (condiciones de venta).
3. Lista definitiva de colores (se arranca con una básica editable).
