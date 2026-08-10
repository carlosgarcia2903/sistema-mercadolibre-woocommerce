# Plan de Trabajo — Integración Paris Marketplace

> **Estado:** ✅ Implementado y **validado con sync real** (orden #313011216, Karina Carvajal, $17.990 — sincronizada, etiqueta PDF descargada, email enviado).
>
> **Objetivo:** Integrar Paris Marketplace (Cencosud) como cuarta plataforma de e-commerce, replicando el mismo patrón de WooCommerce, MercadoLibre y Falabella.
>
> ⚠️ **Corrección importante respecto al plan original:** la investigación inicial (basada en documentación pública) asumía que Paris corría sobre **Mirakl**. Al conseguir las credenciales reales y sondear la API en vivo, se confirmó que es **falso** — Paris/Cencosud tiene una **API REST propia** (NestJS), completamente distinta. Todo el código de la Fase 1 (`ParisService`, `SyncParis`) fue **reescrito** una vez confirmada la estructura real. Ver sección 2 actualizada abajo.

---

## 1. Contexto y alcance

El sistema hoy centraliza **WooCommerce**, **MercadoLibre** y **Falabella**. La arquitectura ya está preparada para N plataformas gracias a la columna `orders.platform`. Agregar Paris significa:

1. Un **servicio cliente** de la API (`ParisService`) equivalente a `FalabellaService`/`MercadoLibreService`.
2. Un **comando de sincronización** (`sync:paris`) equivalente a `sync:falabella`.
3. Sumar el **tab `paris`** en Órdenes, Rentabilidad, Inventario y Dashboard.
4. Descarga de **documentos de envío** (reutilizando `ml_pdfs` con `platform='paris'`, igual que se hizo para Falabella).
5. Email de orden nueva.
6. Sync programado (cron), igual que las otras 3 plataformas.

**No** se rompe nada existente: es aditivo. `platform` pasa de 3 a 4 valores posibles.

---

## 2. La API de Paris Marketplace (real, confirmada con sync en vivo)

### 2.1 Plataforma base: API REST propia de Cencosud (NO Mirakl)

El plan original asumía Mirakl por ser el patrón más común en la industria y por cómo se describía la documentación pública. **Es incorrecto.** Al obtener las credenciales reales, se sondeó la API en vivo (probando rutas y headers hasta dar con la combinación correcta) y se confirmó:

```
Base URL: https://api-developers.ecomm.cencosud.com
Órdenes:  GET /v1/orders
```

Es una API construida sobre **NestJS** (se identifica por el formato de error `{"message":"Forbidden resource","statusCode":403,...}`, típico de ese framework). No hay rastro de Mirakl.

### 2.2 Cómo se encontró la URL

El panel de Paris (**Mi Cuenta → Integraciones**) **no expone la URL de la API** junto al API Key — solo muestra el API Key con un toggle "¿Quieres operar usando un integrador?". La URL base (`https://api-developers.ecomm.cencosud.com`) la aportó Carlos desde el **Centro de Ayuda** del panel.

### 2.3 Autenticación
Un solo header, pero con **Bearer**, no el key "pelado" como se asumió inicialmente:

```
Authorization: Bearer {API_KEY}
Accept: application/json
```

Se descubrió por prueba y error: el key "pelado" y otras variantes (`x-api-key`, `apikey`, `api-key`) devuelven `403 Forbidden resource`; solo `Bearer {key}` devuelve `200`.

No hay timestamp, no hay firma, no hay UserID separado. Solo el API Key en el header.

### 2.3 Endpoint real

| Endpoint | Método | Uso en el sistema |
|----------|--------|-------------------|
| `/v1/orders` | GET | Lista **todas** las órdenes. Devuelve `{ data: Order[], count: N }` |

Solo hay **un endpoint** en uso. No existe (o no se encontró) endpoint separado de detalle de orden, aceptación, ni de documentos — todo viene embebido en la respuesta de `/v1/orders`:

- **Ítems**: dentro de `subOrders[].items[]` — no requiere llamada aparte.
- **Etiqueta de envío**: dentro de `subOrders[].label[]`, como una lista `[{format: 'zpl', url}, {format: 'pdf', url}]` con **URLs directas y públicas** (no requieren el header `Authorization` de la API principal). Se descarga con un GET plano a esa URL.

### 2.4 Paginación y filtros de fecha — NO funcionan

Se probaron exhaustivamente los nombres de parámetro más comunes (`dateFrom`, `startDate`, `fromDate`, `createdAfter`, `from`, `since`, `page`, `limit`, `perPage`, `pageSize`, `offset`) contra la API real: **todos son ignorados silenciosamente por el servidor** — siempre devuelve el mismo `count` sin importar los parámetros enviados.

**Decisión:** `getOrders()` trae **todas** las órdenes de la cuenta en cada sync, y el filtrado por fecha (`--after`) se hace **del lado del cliente** en `SyncParis`, comparando `originOrderDate` localmente. Esto es seguro y correcto mientras el volumen de órdenes sea manejable; si la cuenta crece mucho, revisar si Cencosud documenta paginación real en algún momento (no se encontró documentación pública técnica en absoluto — todo se descubrió por sondeo).

### 2.5 Identificador de orden — cuidado con el campo `id`

El campo `id` de nivel orden en la respuesta **cambia entre llamadas** (no es estable — parece un identificador efímero, no una PK real). El campo estable y correcto para usar como `platform_order_id` es **`originOrderNumber`** (ej. `"313011216"`), que coincide con el número de orden visible en el panel de Paris.

### 2.6 Estados de orden observados
Al menos `shipped` (visto en la orden real sincronizada). El sistema excluye de rentabilidad: `cancelled`, `canceled`, `returned`, `refunded` (nombres estimados por convención — se ajustarán si aparecen variantes reales).

### 2.7 Comparación con las integraciones existentes

| Concepto | MercadoLibre | Falabella | **Paris (real)** |
|----------|--------------|-----------|---------------------|
| Auth | OAuth2 + refresh token | Firma HMAC-SHA256 | **`Authorization: Bearer {key}`** |
| Estructura de compra | Packs (N órdenes = 1 compra) | 1 orden = 1 compra | 1 orden = 1+ `subOrders` (envíos) |
| Ítems | En la misma orden | Llamada aparte `GetOrderItems` | **En la misma orden** (`subOrders[].items[]`) |
| Comisión | `sale_fee` por unidad | No expuesta (fase 2) | **`commission` por ítem, expuesta directamente y confiable** |
| Envío | `/shipments/{id}/costs` | Fees en `GetOrderItems` | `item.shippingCost` o `subOrder.cost` |
| Neto recibido | Calculado | Estimado | **Calculado real:** `total - commission - shippingCost` |
| Etiqueta | `/shipment_labels` (llamada aparte) | `GetDocument` (llamada aparte) | **URL directa embebida**, sin llamada aparte |
| Filtro por fecha en API | Sí (`order.date_created.from`) | Sí (`CreatedAfter`) | **No funciona** — se filtra en el cliente |
| Formato respuesta | JSON estable | Inconsistente (requirió parser robusto) | **JSON limpio y consistente** una vez descubierto el endpoint correcto |

> **Lección de todo el proceso:** la documentación pública de una API (o su ausencia) no predice cómo se comporta en la práctica. Con Falabella la doc era correcta pero el JSON real venía en formatos inconsistentes. Con Paris, la doc pública apuntaba a la plataforma equivocada por completo (Mirakl) — la única forma de saberlo fue conseguir credenciales reales y sondear. **Nunca se puede dar por buena una integración sin probarla en vivo.**

---

## 3. Mapeo de datos → modelos existentes

Reutilizamos las mismas tablas (`orders`, `sales`, `products`, `product_variants`, `ml_pdfs`). Sin migraciones nuevas — igual que Falabella.

### `orders`
| Columna | Origen Paris (real) |
|---------|------------------------|
| `platform` | `'paris'` |
| `platform_order_id` | `originOrderNumber` (⚠️ no `id`, que es inestable) |
| `pack_id` | `null` |
| `status` | `subOrders[0].status.name` (minúsculas) |
| `total` | Suma de `item.priceAfterDiscounts` (fallback `grossPrice`/`basePrice`) de todos los ítems |
| `sale_fees` | Suma de `item.commission` — **directo y confiable** |
| `shipping_cost` | Suma de `item.shippingCost`, o `subOrder.cost` si el anterior es 0 |
| `received_amount` | `total - sale_fees - shipping_cost` |
| `currency` | `'CLP'` (no viene en el payload, se asume por mercado) |
| `ordered_at` | `originOrderDate` (fallback `createdAt`) |
| `customer_name` | `customer.name` |
| `customer_email` | `customer.email` |
| `raw_json` | Orden completa (incluye `subOrders` con `items` y `label`) |

### `sales`
Un `Sale` por cada `sellerSku` único agrupando todos los `items` de todos los `subOrders` de la orden. El campo `size` ya viene como texto plano legible (ej. `"0 A 3 Meses"`) — no requiere parseo como en Falabella.

### `products` / `product_variants`
`source = 'paris'`, `source_id = sellerSku`.

---

## 4. Archivos a crear / modificar

### 🆕 Crear

| Archivo | Descripción |
|---------|-------------|
| `app/Services/ParisService.php` | Cliente API: auth simple por header, `getOrders()`, `getOrder()`, `getOrderDocuments()`, `downloadDocument()` |
| `app/Console/Commands/SyncParis.php` | Comando `sync:paris {--after=} {--limit=} {--offset=}` |
| `app/Mail/NuevaOrdenParis.php` + vista blade | Email de orden nueva, espejo de `NuevaOrdenFalabella` |
| `documentacion/plan-integracion-paris.md` | Este documento |

### ✏️ Modificar

| Archivo | Cambio |
|---------|--------|
| `config/services.php` | Bloque `paris` (url, api_key) |
| `.env` / `.env.example` | Variables `PARIS_*` |
| `app/Http/Controllers/OrdersController.php` | Incluir `paris` en la lista de plataformas válidas; tratar como marketplace (fees + recibido + etiqueta) igual que Falabella |
| `app/Http/Controllers/RentabilidadController.php` | `paris` usa neto recibido igual que ML/Falabella |
| `app/Http/Controllers/ReportsController.php` | Incluir `paris` en inventario/reportes/export |
| `resources/js/Pages/Orders/Index.jsx` | Cuarto tab "Paris" + botón Sync |
| `resources/js/Pages/Rentabilidad/Index.jsx` | Cuarto tab "🅿️ Paris" |
| `resources/js/Pages/Reports/Inventory.jsx` | Cuarto tab "Paris" |
| `routes/console.php` | `Schedule::command('sync:paris')` en el mismo cron horario |
| `CLAUDE.md` | Documentar la nueva integración |

---

## 5. Decisiones a confirmar antes de ejecutar

Las mismas 3 preguntas que se resolvieron para Falabella, aplicadas a Paris:

1. **¿Tienes las credenciales?** (API Key desde Mi Cuenta → Integraciones en el panel de Paris Marketplace). Si no, se programa igual y se prueba cuando estén disponibles.
2. **Total recibido:** ¿estimado (`total - fees - envío` con los datos que trae la orden) o esperar a integrar liquidaciones reales? — Mirakl expone `commission` directamente en cada línea, así que el estimado debería ser **más preciso que en Falabella** desde el día uno.
3. **Alcance de esta entrega:** ¿todo (sync + UI + etiquetas + email + cron) o algo acotado primero?

---

## 6. Fases de ejecución

### Fase 1 — Núcleo
1. Config + `.env` (`PARIS_URL`, `PARIS_API_KEY`)
2. `ParisService`: auth por header, `getOrders()`, `getOrder()`
3. `SyncParis` command: trae órdenes (con líneas incluidas), persiste `Order`/`Sale`/`Product`
4. Prueba real con credenciales: `php artisan sync:paris --after=2026-06-01T00:00:00Z`
5. Verificar en BD que fees/shipping/received sean coherentes con el panel de Paris

### Fase 2 — UI
6. Tab "Paris" en Órdenes, Rentabilidad, Inventario
7. Paris en Dashboard principal

### Fase 3 — Envíos, correos y automatización
8. `OR72` + descarga de documentos → etiquetas en `ml_pdfs` con `platform='paris'`
9. Email automático de orden nueva
10. Sync programado (cron) en `routes/console.php`

---

## 7. Verificación

- [ ] `php artisan sync:paris --after=...` trae órdenes sin error de autenticación
- [ ] `orders` tiene filas con `platform='paris'` y montos coherentes
- [ ] `/orders?tab=paris` muestra la tabla con fees y total recibido
- [ ] `/rentabilidad?tab=paris` muestra el dashboard con gráficos
- [ ] `/inventario?tab=paris` permite editar costos
- [ ] Dashboard principal suma Paris
- [ ] Sin regresiones en WooCommerce, MercadoLibre ni Falabella

---

## 8. Credenciales necesarias (de Carlos)

Panel Paris Marketplace → **Mi Cuenta → Integraciones** → habilitar "Sí, quiero" para generar el API Key:

```env
PARIS_URL=https://[dominio-mirakl-de-paris]/api
PARIS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> El dominio exacto de la API se confirma en ese mismo panel o contactando `sellersmarketplace@paris.cl`.

---

## 9. Lo que quedó implementado

| Archivo | Estado |
|---------|--------|
| `app/Services/ParisService.php` | ✅ Auth por header + `getOrders`, `getOrder`, `getOrderDocuments`, `downloadDocument` |
| `app/Console/Commands/SyncParis.php` | ✅ `php artisan sync:paris` |
| `app/Mail/NuevaOrdenParis.php` + `resources/views/emails/nueva-orden-paris.blade.php` | ✅ Email de orden nueva con etiqueta adjunta |
| `config/services.php` + `.env` / `.env.example` | ✅ Bloque `paris` (URL y API key quedaron vacíos, Carlos los completa directamente) |
| `OrdersController` (index + sync) | ✅ Tab y sync Paris, tratado como marketplace (fees + recibido + etiqueta) |
| `RentabilidadController` | ✅ Paris usa neto recibido igual que ML/Falabella |
| `ReportsController` (inventory/orders/summary/export) | ✅ Source/platform Paris |
| `Orders/Index.jsx`, `Rentabilidad/Index.jsx`, `Reports/Inventory.jsx` | ✅ Tab "🔴 Paris" |
| `routes/console.php` | ✅ `sync:paris` programado en el mismo cron horario que las otras 3 plataformas |

### ✅ Sync real validado (2026-07-28)

```bash
php artisan sync:paris --after=2026-07-01T00:00:00Z
```

Resultado: **1 orden sincronizada correctamente**.

| Campo | Valor |
|-------|-------|
| `platform_order_id` | `313011216` |
| Cliente | Karina Carvajal |
| Producto | Pack 3 Ajuares para bebe — talla "0 A 3 Meses" |
| `total` | $17.990 |
| `sale_fees` | $0 (comisión real reportada por la API para esta orden) |
| `shipping_cost` | $0 |
| `received_amount` | $17.990 |
| `status` | `shipped` |
| Etiqueta | ✅ Descargada — PDF válido de 1 página (57 KB) en `storage/app/private/paris/labels/313011216.pdf` |
| Email | ✅ Enviado a carlosgarcia.2903@gmail.com |

Todo el flujo (API → BD → etiqueta → email) quedó verificado extremo a extremo con datos reales, no simulados.

---

## Fuentes

**Documentación pública consultada (parcialmente incorrecta — ver sección 2):**
- [Centro de ayuda Paris Marketplace — API key](https://ayuda.marketplace.paris.cl/tag/api-key/)
- [Integración con Paris — Contabilium](https://ayuda.contabilium.cl/hc/es/articles/27604011858323-Integraci%C3%B3n-con-Paris)
- [Mirakl Developer Portal — Seller API](https://developer.mirakl.com/content/product/mmp/rest/seller/openapi3) *(no aplica — Paris no usa Mirakl)*

**API real, descubierta por sondeo directo con credenciales:**
- Base URL: `https://api-developers.ecomm.cencosud.com` (aportada por Carlos desde el Centro de Ayuda del panel de Paris; no está documentada públicamente)
- Endpoint y autenticación confirmados empíricamente probando combinaciones de rutas (`/orders`, `/api/orders`, `/v1/orders`, etc.) y headers (`Authorization` raw, `Bearer`, `x-api-key`, `apikey`, `api-key`) hasta obtener `200 OK` con datos reales.
