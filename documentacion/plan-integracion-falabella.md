# Plan de Trabajo — Integración Falabella Seller Center

> **Estado:** ✅ Implementado (Fases 1–3). Pendiente: credenciales reales para probar el sync en vivo.
>
> **Decisiones tomadas:** received *estimado* (`total − envío`, la comisión queda en 0 hasta integrar la API de finanzas en fase 2); alcance *completo* (sync + UI + etiquetas + email); credenciales se cargan luego en `.env`.
> **Objetivo:** Integrar Falabella Seller Center como tercera plataforma de e-commerce, replicando el mismo patrón de WooCommerce y MercadoLibre, con foco en reproducir el formato del **dashboard de Rentabilidad** y la **tabla de Órdenes** de MercadoLibre.

---

## 1. Contexto y alcance

El sistema hoy centraliza **WooCommerce** y **MercadoLibre**. Toda la arquitectura ya está preparada para múltiples plataformas gracias a la columna `orders.platform`. Agregar Falabella significa:

1. Un **servicio cliente** de la API (`FalabellaService`) equivalente a `MercadoLibreService`.
2. Un **comando de sincronización** (`sync:falabella`) equivalente a `sync:mercadolibre`.
3. Sumar el **tab `falabella`** en las páginas de Órdenes, Rentabilidad, Inventario y Dashboard.
4. Descarga de **etiquetas/documentos** de envío (equivalente a los PDF de ML).

**No** se rompe nada existente: Falabella es aditivo. `platform` pasa de 2 a 3 valores posibles.

---

## 2. La API de Falabella Seller Center

Falabella usa la **Seller Center API** (heredada de la plataforma Seller Center / Linio). Es una API basada en query-string con firma HMAC-SHA256.

### 2.1 Endpoint base
- **Chile:** `https://sellercenter-api.falabella.com/`
  > ⚠️ **A confirmar con Carlos:** la doc pública lista también `https://sellercenter-api.linio.cl/`. El endpoint exacto se valida con la primera llamada real. Se dejará configurable en `.env`.

### 2.2 Autenticación (parámetros comunes en toda petición)
Cada request lleva estos parámetros en el query string:

| Parámetro | Valor |
|-----------|-------|
| `UserID` | Email del usuario Seller Center |
| `Action` | Operación (ej. `GetOrders`) |
| `Version` | `1.0` |
| `Timestamp` | ISO 8601 (ej. `2026-07-02T11:11:11+00:00`) |
| `Format` | `JSON` |
| `Signature` | HMAC-SHA256 de los parámetros (ver abajo) |

Además, header `User-Agent` con formato: `Linio_SellerId/PHP/1.0`.

### 2.3 Cálculo de la firma (HMAC-SHA256)
```php
// 1. Quitar Signature si existe. Ordenar parámetros alfabéticamente por nombre.
ksort($parameters);

// 2. Concatenar como name=value unidos por &, con URL-encode RFC 3986.
$concatenated = http_build_query($parameters, '', '&', PHP_QUERY_RFC3986);

// 3. HMAC-SHA256 usando el api_key como secreto (hex, lowercase).
$parameters['Signature'] = hash_hmac('sha256', $concatenated, $api_key, false);
```
> `api_key` se trata como **string**, no como hexadecimal. El resultado es hex de 64 chars.

### 2.4 Acciones relevantes
| Action | Uso en el sistema |
|--------|-------------------|
| `GetOrders` | Lista órdenes por rango de fecha (`CreatedAfter`, `CreatedBefore`), con paginación (`Limit`, `Offset`) |
| `GetOrder` | Detalle de una orden por `OrderId` |
| `GetOrderItems` | Ítems de una orden (`OrderId`) — trae precio, SKU, comisiones, estado por ítem |
| `GetProducts` | Catálogo de productos del seller |
| `SetStatusToCanceled` / `SetStatusToPackedByMarketplace` / etc. | Cambios de estado (fase 2, opcional) |
| `GetDocument` | PDF de factura o etiqueta de envío (`Type=shippingLabel`, base64) |

### 2.5 Diferencias clave vs MercadoLibre
| Concepto | MercadoLibre | Falabella |
|----------|--------------|-----------|
| Estructura de compra | Split: N órdenes con mismo `pack_id` | Una orden ya contiene todos sus ítems (no hay packs) |
| Ítems | Vienen en la misma respuesta de orden | Requieren llamada aparte: `GetOrderItems` |
| Comisión | `sale_fee` por unidad en la orden | Comisión por ítem en `GetOrderItems` (campo `ItemPrice`/`ShippingAmount`/fees) |
| Envío | `/shipments/{id}/costs` | Fees de envío vienen en `GetOrderItems` |
| Neto recibido | `total - fees - envío` calculado | Se calcula igual, pero el **payout real** vive en un API de liquidaciones (fuera de alcance fase 1 → se estima) |
| Etiqueta | `/shipment_labels` | `GetDocument` con `Type=shippingLabel` |

---

## 3. Mapeo de datos → modelos existentes

Reutilizamos **exactamente** las mismas tablas (`orders`, `sales`, `products`, `product_variants`). No se crean tablas nuevas para órdenes/ventas.

### `orders`
| Columna | Origen Falabella |
|---------|------------------|
| `platform` | `'falabella'` |
| `platform_order_id` | `OrderId` |
| `pack_id` | `null` (Falabella no tiene packs) |
| `status` | `Statuses` de la orden (ej. `pending`, `ready_to_ship`, `delivered`, `canceled`) |
| `total` | `Price` de la orden |
| `sale_fees` | Suma de comisiones de `GetOrderItems` |
| `shipping_cost` | Suma de `ShippingAmount`/fees de envío del vendedor |
| `received_amount` | `total - sale_fees - shipping_cost` (estimado) |
| `currency` | `CLP` |
| `ordered_at` | `CreatedAt` |
| `customer_name` | `CustomerFirstName + CustomerLastName` |
| `raw_json` | Respuesta completa (orden + items) |

### `sales`
Un `Sale` por cada ítem de `GetOrderItems` (`OrderItemId`, `Sku`, `Name`, `ItemPrice`, cantidad = 1 por línea en Falabella; se agrupan por SKU si aplica).

### `products` / `product_variants`
`source = 'falabella'`, `source_id = SellerSku` o `ShopSku`. Variantes por talla si el SKU las expone (Falabella maneja tallas vía SKU distinto por talla, no variaciones anidadas como ML → probablemente **una variante por producto**, `size = null`, salvo que el nombre incluya talla).

---

## 4. Archivos a crear / modificar

### 🆕 Crear

| Archivo | Descripción |
|---------|-------------|
| `app/Services/FalabellaService.php` | Cliente API: firma HMAC, `searchOrders()`, `getOrderItems()`, `getProducts()`, `getDocument()` |
| `app/Console/Commands/SyncFalabella.php` | Comando `sync:falabella {--after=} {--limit=} {--offset=}` |
| `app/Mail/NuevaOrdenFalabella.php` | (Opcional) email de orden nueva, espejo de `NuevasOrdenesMl` |
| `documentacion/plan-integracion-falabella.md` | Este documento |

### ✏️ Modificar

| Archivo | Cambio |
|---------|--------|
| `config/services.php` | Bloque `falabella` (url, user_id, api_key) |
| `.env` / `.env.example` | Variables `FALABELLA_*` |
| `app/Http/Controllers/OrdersController.php` | Aceptar `tab=falabella`; para Falabella no hay packs → paginación estándar como WC pero con columnas de fees/received como ML |
| `app/Http/Controllers/RentabilidadController.php` | `platform = 'falabella'`; misma lógica de received proporcional |
| `app/Http/Controllers/ReportsController.php` | Inventario/reportes: incluir source `falabella` |
| `resources/js/Pages/Orders/Index.jsx` | Tercer tab "Falabella" |
| `resources/js/Pages/Rentabilidad/Index.jsx` | Tercer tab "Falabella" (reutiliza todo el dashboard tal cual) |
| `resources/js/Pages/Reports/Inventory.jsx` | Tercer tab "Falabella" |
| `resources/js/Pages/Dashboard.jsx` | Sumar Falabella a stats y desglose por plataforma |
| `resources/js/.../Layout` (nav) | Ningún cambio: las páginas ya usan tabs internos |
| `routes/web.php` | `POST /orders/sync` ya es genérico (recibe `platform`); solo se agrega el caso `falabella` en `OrdersController::sync()` |
| `CLAUDE.md` | Documentar la nueva integración |

> **Sin migraciones nuevas.** El esquema actual ya soporta Falabella. `ml_pdfs` se reutiliza para documentos de Falabella **o** se generaliza (ver decisión abierta #3).

---

## 5. Decisiones abiertas (a confirmar antes de ejecutar)

1. **Endpoint exacto** (`sellercenter-api.falabella.com` vs `linio.cl`) — se valida con la primera llamada. Configurable en `.env`.
2. **Received real vs estimado.** Fase 1 estima `total - fees - envío`. El payout exacto requiere el API de liquidaciones/finanzas de Falabella (fase 2). ¿Suficiente con estimado por ahora?
3. **Tabla de documentos/etiquetas.** Opciones:
   - (a) Reutilizar `ml_pdfs` (renombrando conceptualmente a "documentos de envío"), agregando `platform`.
   - (b) Crear tabla genérica `shipping_documents`.
   - **Recomendación:** (a) con una columna `platform` para no duplicar lógica. Requiere 1 migración pequeña.
4. **Variantes por talla.** Confirmar cómo Falabella expone tallas (SKU por talla vs atributo). Ajusta `syncFalabellaVariants()`.
5. **Emails de orden nueva.** ¿Se quiere el mismo correo automático que ML? (Sí por defecto.)

---

## 6. Fases de ejecución

### Fase 1 — Núcleo de la integración (MVP)
1. Config + `.env` (`FALABELLA_URL`, `FALABELLA_USER_ID`, `FALABELLA_API_KEY`).
2. `FalabellaService` con firma HMAC y métodos `searchOrders`, `getOrderItems`, `getProducts`.
3. `SyncFalabella` command: trae órdenes + items, persiste `Order`/`Sale`/`Product`.
4. Prueba real: `php artisan sync:falabella --after=2026-06-01T00:00:00Z`.
5. Verificar datos en BD (fees, received correctos).

### Fase 2 — UI
6. Tab "Falabella" en Órdenes (tabla + modal de detalle).
7. Tab "Falabella" en Rentabilidad (dashboard idéntico al de ML).
8. Tab "Falabella" en Inventario (edición de costos).
9. Falabella en Dashboard principal.

### Fase 3 — Envíos y correos (opcional)
10. `GetDocument` → descarga de etiquetas (reutilizar `ml_pdfs` + `platform`).
11. Email automático de orden nueva.
12. Sync programado (cron) igual que ML.

---

## 7. Verificación

- [ ] `php artisan sync:falabella --after=...` trae órdenes sin error de firma
- [ ] `orders` tiene filas con `platform='falabella'` y `received_amount` coherente
- [ ] `/orders?tab=falabella` muestra la tabla con fees y total recibido
- [ ] `/rentabilidad?tab=falabella` muestra el dashboard con gráficos y montos
- [ ] `/inventario?tab=falabella` permite editar costos
- [ ] Dashboard principal suma Falabella
- [ ] Ninguna regresión en WooCommerce ni MercadoLibre

---

## 8. Credenciales necesarias (de Carlos)

Para ejecutar la Fase 1 se requiere del panel Seller Center → **Configuración → Integraciones / API**:

```env
FALABELLA_URL=https://sellercenter-api.falabella.com
FALABELLA_USER_ID=tu-email@sellercenter
FALABELLA_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 9. Lo que quedó implementado

| Archivo | Estado |
|---------|--------|
| `app/Services/FalabellaService.php` | ✅ Firma HMAC + `getOrders`, `getOrderItems`, `getProducts`, `getDocument` |
| `app/Console/Commands/SyncFalabella.php` | ✅ `php artisan sync:falabella` |
| `app/Mail/NuevaOrdenFalabella.php` + `resources/views/emails/nueva-orden-falabella.blade.php` | ✅ Email de orden nueva con etiqueta adjunta |
| `database/migrations/2026_07_02_120000_add_platform_to_ml_pdfs_table.php` | ✅ Columna `platform` en `ml_pdfs` (reutilizada para etiquetas Falabella) |
| `config/services.php` + `.env` / `.env.example` | ✅ Bloque `falabella` |
| `OrdersController` (index + sync) | ✅ Tab y sync Falabella |
| `RentabilidadController` | ✅ Falabella usa neto recibido |
| `ReportsController` (inventory/orders/summary/export) | ✅ Source/platform Falabella |
| `Orders/Index.jsx`, `Rentabilidad/Index.jsx`, `Reports/Inventory.jsx` | ✅ Tab Falabella |

**Para probar en vivo:** cargar `FALABELLA_USER_ID` y `FALABELLA_API_KEY` en `.env` y correr
`php artisan sync:falabella --after=2026-06-01T00:00:00Z`.

**Nota sobre nombres de campos:** los campos exactos de la respuesta de Falabella
(`Price`, `Statuses.Status`, `OrderItem.ShippingServiceCost`, `Variation`, etc.) se
validarán con el primer sync real y se ajustarán si el payload difiere. El servicio ya
normaliza respuestas objeto-vs-lista.

---

## Fuentes de la API

- [Introducción a la API de Seller Center](https://developers.falabella.com/reference/getting-started)
- [Certificando las solicitudes (firma)](https://developers.falabella.com/reference/signing-requests)
- [SDK PHP de Seller Center](https://developers.falabella.com/page/seller-center-php-sdk)
- [Portal de desarrolladores Falabella](https://developers.falabella.com/)
